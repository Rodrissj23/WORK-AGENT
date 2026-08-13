// ZERO Gmail UI + Conversation v2.0
(function(){
  'use strict';

  const API='http://127.0.0.1:8765/gmail/messages';
  const ctx={items:[],selected:null,lastQuery:null};

  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const say=text=>{try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(text)}catch(e){}};

  function ageMinutes(value){const d=new Date(value||'');return Number.isNaN(d.getTime())?null:Math.max(0,(Date.now()-d.getTime())/60000)}

  function paint(connected,fresh=true){
    const first=document.querySelector('#attention-list .attention-item');
    if(first){
      const title=first.querySelector('strong');
      const detail=first.querySelector('.attention-copy span');
      const tag=first.querySelector('.attention-tag');
      if(connected&&fresh){
        if(title)title.textContent='Gmail laboral conectado';
        if(detail)detail.textContent='OAuth local activo y telemetría disponible para ZERO.';
        if(tag)tag.textContent='OK';
        first.classList.remove('medium');first.classList.add('ok');
      }else if(connected){
        if(title)title.textContent='Gmail laboral desactualizado';
        if(detail)detail.textContent='La integración está activa, pero hace falta refrescar la lectura local.';
        if(tag)tag.textContent='ACTUALIZAR';
        first.classList.remove('ok');first.classList.add('medium');
      }else{
        if(title)title.textContent='Gmail laboral sin telemetría local';
        if(detail)detail.textContent='La integración está configurada; falta levantar el núcleo local en este equipo.';
        if(tag)tag.textContent='LOCAL OFF';
        first.classList.remove('ok');first.classList.add('medium');
      }
    }
    document.querySelectorAll('#future .future-item').forEach(item=>{
      const strong=item.querySelector('strong');
      const desc=item.querySelector('span');
      if(strong&&/gmail/i.test(strong.textContent||'')){
        strong.textContent=connected?'✉ Gmail · integrado':'✉ Gmail · configurado';
        if(desc)desc.textContent=connected?'Lectura local y consultas conversacionales disponibles en ZERO.':'OAuth listo; requiere el núcleo local para consultar correos.';
      }
    });
  }

  async function sync(){
    try{
      const systems=window.WA_STATUS?.refresh?await window.WA_STATUS.refresh():null;
      const g=systems?.gmail;
      const age=ageMinutes(g?.ultima_ejecucion||g?.reported_at);
      paint(!!g?.connected,age===null||age<=20);
    }catch(e){paint(false)}
  }

  async function fetchMessages({priority=false,unread=false,sender='',limit=5,details=false}={}){
    const p=new URLSearchParams();
    if(priority)p.set('priority','1');
    if(unread)p.set('unread','1');
    if(sender)p.set('sender',sender);
    p.set('limit',String(limit));
    if(details)p.set('details','1');
    const c=new AbortController(),t=setTimeout(()=>c.abort(),1800);
    try{
      const r=await fetch(`${API}?${p.toString()}`,{signal:c.signal,cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      return await r.json();
    }finally{clearTimeout(t)}
  }

  function senderName(raw){
    const s=String(raw||'').trim();
    const before=s.split('<')[0].replace(/["']/g,'').trim();
    if(before)return before;
    const email=(s.match(/<([^>]+)>/)||[])[1]||s;
    return email.split('@')[0]||'remitente desconocido';
  }

  function cleanSnippet(value){
    return String(value||'').replace(/\s+/g,' ').trim().slice(0,360);
  }

  async function listPriority(){
    try{
      const d=await fetchMessages({priority:true,limit:6,details:false});
      ctx.items=d?.items||[];ctx.selected=ctx.items[0]||null;ctx.lastQuery='priority';
      if(!ctx.items.length){say('No encontré correos de remitentes prioritarios en el cache reciente.');return}
      const names=[...new Set(ctx.items.map(x=>senderName(x.from)))];
      say(`Tengo ${ctx.items.length} correos prioritarios en la revisión reciente. Aparecen ${names.slice(0,4).join(', ')}${names.length>4?' y otros':''}.`);
    }catch(e){say('No pude consultar el cache de Gmail. Verificá que esté iniciado el ZERO Local Core y actualizado el lector de Gmail.')}
  }

  function listSenders(){
    if(!ctx.items.length){say('Todavía no tengo una lista de correos activa. Pedime primero los mails prioritarios.');return}
    const names=[...new Set(ctx.items.map(x=>senderName(x.from)))];
    say(`En la lista actual aparecen ${names.slice(0,6).join(', ')}.`);
  }

  async function latestFrom(sender){
    const wanted=String(sender||'').trim();
    if(!wanted){say('Decime de quién querés que busque el último correo.');return}
    try{
      const d=await fetchMessages({sender:wanted,limit:5,details:true});
      ctx.items=d?.items||[];ctx.selected=ctx.items[0]||null;ctx.lastQuery=`sender:${wanted}`;
      if(!ctx.selected){say(`No encontré correos recientes que coincidan con ${wanted}.`);return}
      const m=ctx.selected;
      const preview=cleanSnippet(m.snippet);
      say(`El último que encontré de ${senderName(m.from)} tiene como asunto ${m.subject}.${preview?` La vista previa dice: ${preview}`:''}`);
    }catch(e){say('No pude consultar ese correo en el cache local de Gmail.')}
  }

  function readSelected(){
    const m=ctx.selected;
    if(!m){say('No tengo un correo seleccionado todavía. Decime de quién querés el último.');return}
    const preview=cleanSnippet(m.snippet);
    say(`El asunto es ${m.subject}.${preview?` La vista previa dice: ${preview}`:' No tengo vista previa guardada para ese correo.'}`);
  }

  function extractSender(q){
    let m=q.match(/(?:ultimo|ultima|mail|correo|mensaje)\s+(?:mail\s+|correo\s+)?(?:de|del)\s+(.+)$/);
    if(!m)m=q.match(/(?:que dice|leeme|lee|mostrame|mostrar|resumime|resume).*?(?:de|del)\s+(.+)$/);
    if(!m)return'';
    return m[1].replace(/\b(por favor|ultimo|ultima|mail|correo|mensaje)\b/g,' ').replace(/\s+/g,' ').trim();
  }

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=norm(raw);
      if(!q)return previous(value,fromVoice);

      if(/\b(mails prioritarios|correos prioritarios|mostrame los prioritarios|cuales son los prioritarios|tengo mails prioritarios|tengo correos prioritarios)\b/.test(q)){listPriority();return}
      if(ctx.items.length&&/^(de quien|de quienes|quienes|quien)$/i.test(q)){listSenders();return}

      const sender=extractSender(q);
      if(sender&&/\b(ultimo|ultima|mail|correo|mensaje|que dice|leeme|lee|mostrame|resumime|resume)\b/.test(q)){latestFrom(sender);return}

      if(ctx.selected&&/^(que dice|leelo|leeme|lee eso|resumilo|resumime eso|que decia)$/i.test(q)){readSelected();return}

      return previous(value,fromVoice);
    };
  }

  sync();setTimeout(sync,900);setInterval(sync,60000);
  window.ZERO_GMAIL_UI={version:'2.0.0',sync,priority:listPriority,latestFrom,context:()=>({...ctx})};
})();
