// ZERO demo-readiness v1.3
// Capa segura para la demo: estado real de Gmail, continuidad y lectura local contextual.
(function(){
  'use strict';

  const KEY='zero:demo:context';
  const TTL=30*60*1000;
  const GMAIL_API='http://127.0.0.1:8765/gmail/messages';
  const fresh=()=>({topic:null,pending:null,goal:null,updatedAt:Date.now()});
  let ctx=fresh();
  const gmailCtx={list:[],selected:null,index:-1,query:null};

  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    if(saved&&typeof saved==='object'&&Date.now()-Number(saved.updatedAt||0)<=TTL)ctx={...ctx,...saved};
  }catch(e){}

  const save=()=>{ctx.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(ctx))}catch(e){}};
  const clear=()=>{ctx=fresh();gmailCtx.list=[];gmailCtx.selected=null;gmailCtx.index=-1;gmailCtx.query=null;try{localStorage.removeItem(KEY)}catch(e){}};
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const say=text=>{try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(text)}catch(e){}};
  const yes=q=>/^(si|sii|dale|ok|okay|de una|hacelo|hace eso|perfecto)$/.test(q);
  const no=q=>/^(no|nop|mejor no|dejalo|cancelar|cancela)$/.test(q);
  const ageMinutes=value=>{const d=new Date(value||'');return Number.isNaN(d.getTime())?null:Math.max(0,(Date.now()-d.getTime())/60000)};

  async function gmailFetch(params={}){
    const url=new URL(GMAIL_API);
    Object.entries(params).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value))});
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),2200);
    try{
      const r=await fetch(url.toString(),{signal:c.signal,cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      return data?.ok?data:null;
    }catch(e){return null}
    finally{clearTimeout(timer)}
  }

  function senderLabel(raw){
    const value=String(raw||'').trim();
    const named=value.match(/^\s*"?([^"<]+?)"?\s*</);
    if(named?.[1])return named[1].trim();
    const email=value.match(/<?([^<>\s]+@[^<>\s]+)>?/);
    return email?.[1]||value||'remitente desconocido';
  }

  function senderFilter(q){
    if(/\bjavier\b/.test(q))return'javier';
    if(/\b(nicolas|nico)\b/.test(q))return'nicolas';
    if(/\b(info proveedores|proveedores|proveedor)\b/.test(q))return'proveedor';
    if(/\b(prevencion|afiliaciones)\b/.test(q))return'prevencion';
    return null;
  }

  function selectMail(items,index=0,query=null){
    gmailCtx.list=Array.isArray(items)?items:[];
    gmailCtx.index=gmailCtx.list.length?Math.max(0,Math.min(index,gmailCtx.list.length-1)):-1;
    gmailCtx.selected=gmailCtx.index>=0?gmailCtx.list[gmailCtx.index]:null;
    gmailCtx.query=query;
    ctx.topic='gmail';save();
    return gmailCtx.selected;
  }

  function describeMail(item,details=false){
    if(!item)return'No encontré ese correo en la revisión local.';
    const from=senderLabel(item.from),subject=item.subject||'sin asunto';
    let text=`El correo es de ${from}. Asunto: ${subject}.`;
    if(details&&item.snippet)text+=` Dice: ${item.snippet}`;
    return text;
  }

  async function gmailStatus(){
    try{
      const systems=window.WA_STATUS?.refresh?await window.WA_STATUS.refresh():null;
      const s=systems?.gmail;
      if(!s?.connected){say('El Gmail laboral todavía no está reportando al núcleo local de Zero.');return}
      const age=ageMinutes(s.ultima_ejecucion||s.reported_at);
      if(age!==null&&age>20){say('Gmail está conectado, pero la última lectura está desactualizada. Antes de usar esos datos necesito refrescar la sincronización.');return}
      ctx.topic='gmail';save();
      const imp=Number(s.pendientes_importantes),pri=Number(s.prioritarios),unread=Number(s.no_leidos_recientes);
      const parts=['Gmail laboral conectado y actualizado.'];
      if(Number.isFinite(pri))parts.push(`Detecté ${pri} ${pri===1?'correo prioritario':'correos prioritarios'} en la revisión reciente.`);
      if(Number.isFinite(imp))parts.push(`${imp} ${imp===1?'mail quedó marcado como importante':'mails quedaron marcados como importantes'}.`);
      if(Number.isFinite(unread))parts.push(`Hay ${unread} ${unread===1?'no leído reciente':'no leídos recientes'}.`);
      say(parts.join(' '));
    }catch(e){say('No pude consultar Gmail ahora mismo. El núcleo local no respondió.')}
  }

  async function gmailPrioritySenders(){
    const data=await gmailFetch({priority:1,limit:10});
    if(!data){say('El estado de Gmail funciona, pero este backend todavía no expone el detalle local de correos.');return}
    const items=data.items||[];
    selectMail(items,0,'priority');
    if(!items.length){say('No encontré correos prioritarios en la revisión local reciente.');return}
    const grouped=new Map();
    items.forEach(item=>{const label=senderLabel(item.from);grouped.set(label,(grouped.get(label)||0)+1)});
    const labels=[...grouped.entries()].slice(0,4).map(([name,count])=>count>1?`${name}, ${count} correos`:name);
    say(`Entre los prioritarios recientes aparecen ${labels.join('; ')}.`);
  }

  async function gmailLatest(sender){
    const data=await gmailFetch({sender,limit:5,details:1});
    if(!data){say('No pude consultar el detalle local de Gmail ahora mismo.');return}
    const items=data.items||[];
    if(!items.length){say(`No encontré correos recientes que coincidan con ${sender}.`);return}
    const item=selectMail(items,0,sender);
    say(describeMail(item,true));
  }

  async function gmailHas(sender){
    const data=await gmailFetch({sender,limit:10});
    if(!data){say('No pude consultar el detalle local de Gmail ahora mismo.');return}
    const items=data.items||[];
    if(!items.length){say(`No encontré correos recientes que coincidan con ${sender}.`);return}
    selectMail(items,0,sender);
    say(`Sí. Encontré ${items.length} ${items.length===1?'correo reciente':'correos recientes'} que coinciden con ${senderLabel(items[0].from)}.`);
  }

  async function gmailSelectedDetails(){
    if(!gmailCtx.selected){say('Todavía no tengo un correo seleccionado.');return}
    if(gmailCtx.selected.snippet){say(describeMail(gmailCtx.selected,true));return}
    const params=gmailCtx.query==='priority'?{priority:1,limit:10,details:1}:{sender:gmailCtx.query,limit:10,details:1};
    const data=await gmailFetch(params);
    if(!data?.items?.length){say('No pude cargar el detalle de ese correo.');return}
    const item=selectMail(data.items,Math.max(0,gmailCtx.index),gmailCtx.query);
    say(describeMail(item,true));
  }

  async function gmailNext(){
    if(!gmailCtx.list.length){say('No tengo una lista de correos activa.');return}
    const next=gmailCtx.index+1;
    if(next>=gmailCtx.list.length){say('No tengo otro correo cargado en esta lista.');return}
    gmailCtx.index=next;gmailCtx.selected=gmailCtx.list[next];
    if(!gmailCtx.selected.snippet){await gmailSelectedDetails();return}
    say(describeMail(gmailCtx.selected,true));
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

      if(ctx.topic==='gmail'&&/\b(de quien|de quienes|quienes son)\b/.test(q)){
        gmailPrioritySenders();return;
      }

      const sender=senderFilter(q);
      if(sender&&/\b(tengo|hay|tenemos)\b/.test(q)&&/\b(mail|mails|correo|correos)\b/.test(q)){
        gmailHas(sender);return;
      }
      if(sender&&/\b(ultimo|ultima|leeme|lee|que dice|correo de|mail de)\b/.test(q)){
        gmailLatest(sender);return;
      }
      if(/\b(mostrame|mostrar|cuales son|lista|listar)\b/.test(q)&&/\b(prioritarios|importantes)\b/.test(q)&&/\b(mail|mails|correo|correos)\b/.test(q)){
        gmailPrioritySenders();return;
      }
      if(gmailCtx.selected&&/^(que dice|leelo|leemelo|lee ese|que decia|resumime ese)$/.test(q)){
        gmailSelectedDetails();return;
      }
      if(gmailCtx.selected&&/\b(cual es el asunto|que asunto tiene|asunto)\b/.test(q)){
        say(`El asunto es: ${gmailCtx.selected.subject||'sin asunto'}.`);return;
      }
      if(gmailCtx.selected&&/\b(de quien es|quien lo mando|quien lo envio|remitente)\b/.test(q)){
        say(`Es de ${senderLabel(gmailCtx.selected.from)}.`);return;
      }
      if(gmailCtx.list.length&&/^(siguiente|siguiente mail|siguiente correo|otro|otro mail|otro correo)$/.test(q)){
        gmailNext();return;
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
        const parts=[];if(ctx.topic)parts.push(`tema activo ${ctx.topic}`);if(ctx.goal)parts.push(`objetivo ${ctx.goal}`);if(ctx.pending)parts.push('hay una confirmación pendiente');if(gmailCtx.selected)parts.push(`correo seleccionado ${gmailCtx.selected.subject||'sin asunto'}`);say(parts.length?`Ahora tengo en mente: ${parts.join(', ')}.`:'Ahora no tengo un contexto de trabajo activo.');return;
      }

      return previous(value,fromVoice);
    };
  }

  patchUi();
  setTimeout(patchUi,500);
  window.ZERO_DEMO_READINESS={version:'1.3.0',context:()=>({...ctx}),gmail:gmailStatus,reset:resetDemo,capabilities,gmailFetch,gmailPrioritySenders,gmailLatest};
})();
