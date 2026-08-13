// ZERO demo-readiness v1.2
// Capa segura para la demo: estado real de Gmail y continuidad basica de trabajo.
(function(){
  'use strict';

  const KEY='zero:demo:context';
  const TTL=30*60*1000;
  const fresh=()=>({topic:null,pending:null,goal:null,updatedAt:Date.now()});
  let ctx=fresh();
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    if(saved&&typeof saved==='object'&&Date.now()-Number(saved.updatedAt||0)<=TTL)ctx={...ctx,...saved};
  }catch(e){}
  const save=()=>{ctx.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(ctx))}catch(e){}};
  const clear=()=>{ctx=fresh();try{localStorage.removeItem(KEY)}catch(e){}};
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const say=text=>{try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(text)}catch(e){}};
  const yes=q=>/^(si|sii|dale|ok|okay|de una|hacelo|hace eso|perfecto)$/.test(q);
  const no=q=>/^(no|nop|mejor no|dejalo|cancelar|cancela)$/.test(q);
  const ageMinutes=value=>{const d=new Date(value||'');return Number.isNaN(d.getTime())?null:Math.max(0,(Date.now()-d.getTime())/60000)};

  async function gmailStatus(){
    try{
      const systems=window.WA_STATUS?.refresh?await window.WA_STATUS.refresh():null;
      const s=systems?.gmail;
      if(!s?.connected){say('El Gmail laboral todavía no está reportando al núcleo local de Zero.');return}
      const age=ageMinutes(s.ultima_ejecucion||s.reported_at);
      if(age!==null&&age>20){say('Gmail está conectado, pero la última lectura está desactualizada. Antes de usar esos datos necesito refrescar la sincronización.');return}
      const imp=Number(s.pendientes_importantes),pri=Number(s.prioritarios),unread=Number(s.no_leidos_recientes);
      const parts=['Gmail laboral conectado y actualizado.'];
      if(Number.isFinite(pri))parts.push(`Detecté ${pri} ${pri===1?'correo prioritario':'correos prioritarios'} en la revisión reciente.`);
      if(Number.isFinite(imp))parts.push(`${imp} ${imp===1?'mail quedó marcado como importante':'mails quedaron marcados como importantes'}.`);
      if(Number.isFinite(unread))parts.push(`Hay ${unread} ${unread===1?'no leído reciente':'no leídos recientes'}.`);
      say(parts.join(' '));
    }catch(e){say('No pude consultar Gmail ahora mismo. El núcleo local no respondió.')}
  }

  function capabilities(){
    const access=window.ZERO_ACCESS?.registry||{};
    const ready=['prevencion','ventas-prevencion','ceibo'].filter(id=>!!access[id]?.url).length;
    const cognition=!!window.ZERO_CONVERSATION_V2;
    const voice=!!window.WA_VOICE_PRO;
    const parts=[
      `Tengo ${ready} de 3 accesos principales configurados`,
      'puedo consultar Mini Hub y abrir herramientas de trabajo',
      'puedo dar un briefing operativo y consultar el estado de Gmail'
    ];
    if(cognition)parts.push('mantengo contexto entre instrucciones relacionadas');
    if(voice)parts.push('y tengo la capa de voz local preparada cuando el núcleo está encendido');
    parts.push('Mora y Scoring quedan sujetos al estado de sus motores y no ejecuto acciones sensibles sin confirmación');
    say(parts.join(', ')+'.');
  }

  function resetDemo(){
    clear();
    try{window.ZERO_CONVERSATION_V2?.clear?.()}catch(e){}
    say('Modo demo listo. Limpié el contexto de prueba y conservé la memoria persistente.');
  }

  function patchUi(){
    const first=document.querySelector('#attention-list .attention-item');
    if(first){
      const title=first.querySelector('strong'),detail=first.querySelector('.attention-copy span'),tag=first.querySelector('.attention-tag');
      if(title)title.textContent='Gmail laboral integrado';
      if(detail)detail.textContent='OAuth local configurado; el estado real aparece cuando el núcleo local está activo.';
      if(tag)tag.textContent='INTEGRADO';
    }
  }

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=norm(raw);
      if(!q)return previous(value,fromVoice);

      if(/^(modo demo|iniciar modo demo|arrancar modo demo)$/.test(q)){resetDemo();return}
      if(/\b(que podes hacer|que sabes hacer|cuales son tus capacidades|que funciones tenes)\b/.test(q)){capabilities();return}

      if(/\b(nuevo contexto|limpia contexto|limpiar contexto|reinicia contexto|reiniciar contexto|empecemos de cero|arranquemos de cero)\b/.test(q)){
        clear();try{window.ZERO_CONVERSATION_V2?.clear?.()}catch(e){}say('Listo. Arranco con un contexto de trabajo nuevo.');return;
      }

      if(ctx.pending==='sales_open'){
        if(yes(q)){
          ctx.pending=null;ctx.topic='sales';save();
          try{window.ZERO_ACCESS?.open?.('prevencion');window.ZERO_ACCESS?.open?.('ventas prevencion')}catch(e){}
          return;
        }
        if(no(q)){ctx.pending=null;save();say('Dale. Quedo atento.');return}
      }

      if(/\b(tengo mails|tengo correos|mails prioritarios|correos prioritarios|mails importantes|correos importantes|estado de gmail|como esta gmail|que mails tengo|que correos tengo)\b/.test(q)){
        gmailStatus();return;
      }

      if(/\b(necesito hacer lo de las ventas|tengo que rendir ventas|vamos a rendir|rendir ventas|rendicion de ventas)\b/.test(q)){
        ctx.topic='sales';ctx.pending='sales_open';ctx.goal='rendir ventas de Prevención';save();
        say('Entendí que querés rendir ventas de Prevención. Para eso necesito Puente Digital y la planilla de ventas. ¿Querés que abra los dos?');return;
      }

      if(/\b(abrime|abri|abrir|abre)\s+la planilla\b/.test(q)&&ctx.topic==='sales'){
        try{window.ZERO_ACCESS?.open?.('ventas prevencion');ctx.topic='sales';save();return}catch(e){}
      }

      if(/\bmanana\b.*\b(tengo que|debo|necesito|quiero)\b.*\bmora\b/.test(q)){
        ctx.topic='mora';ctx.goal='revisar Mora mañana';save();say('Dale. Me queda en contexto que mañana querés revisar Mora.');return;
      }

      if(/^(y\b|despues\b|y despues\b)/.test(q)&&ctx.goal&&/\b(mail|mails|correo|correos|gmail)\b/.test(q)){
        ctx.goal=`${ctx.goal}; después revisar mails de Prevención`;ctx.topic='gmail';save();say('Lo sumo al plan: primero Mora y después los mails de Prevención.');return;
      }

      if(/\b(que tenes en mente|cual es el contexto|que estas entendiendo|que recordas)\b/.test(q)){
        const parts=[];if(ctx.topic)parts.push(`tema activo ${ctx.topic}`);if(ctx.goal)parts.push(`objetivo ${ctx.goal}`);if(ctx.pending)parts.push('hay una confirmación pendiente');say(parts.length?`Ahora tengo en mente: ${parts.join(', ')}.`:'Ahora no tengo un contexto de trabajo activo.');return;
      }

      return previous(value,fromVoice);
    };
  }

  patchUi();
  setTimeout(patchUi,500);
  window.ZERO_DEMO_READINESS={version:'1.2.0',context:()=>({...ctx}),gmail:gmailStatus,reset:resetDemo,capabilities};
})();
