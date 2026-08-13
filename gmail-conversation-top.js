// ZERO Gmail Detail Conversation v1.2
// Se carga por encima de la cognicion y prepara guardas de voz para la demo.
(function(){
  'use strict';
  const API='http://127.0.0.1:8765/gmail/messages';
  let selected=null;

  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const say=t=>{try{commandFeedback.textContent=t;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(t)}catch(e){}};
  const nameOf=v=>{const s=String(v||'').trim(),n=s.split('<')[0].trim().replace(/^"|"$/g,'');return n||(s.match(/<([^>]+)>/)||[])[1]||s||'remitente desconocido'};
  const preview=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,360);

  async function query(sender,{details=false,limit=10}={}){
    const p=new URLSearchParams({sender:String(sender||''),limit:String(limit)});
    if(details)p.set('details','1');
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),1800);
    try{
      const r=await fetch(`${API}?${p.toString()}`,{signal:c.signal,cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      return await r.json();
    }finally{clearTimeout(timer)}
  }

  async function countFrom(sender){
    try{
      const d=await query(sender,{limit:20});const items=Array.isArray(d.items)?d.items:[];
      selected=items[0]||null;
      if(!items.length){say(`No encontré correos recientes que coincidan con ${sender}.`);return}
      say(`Encontré ${items.length} ${items.length===1?'correo reciente':'correos recientes'} de ${nameOf(items[0].from)}. El más reciente tiene como asunto ${items[0].subject||'sin asunto'}.`);
    }catch(e){say('No pude consultar esos correos en el cache local de Gmail.')}
  }

  async function latestFrom(sender){
    try{
      const d=await query(sender,{details:true,limit:5});const items=Array.isArray(d.items)?d.items:[];
      selected=items[0]||null;
      if(!selected){say(`No encontré correos recientes que coincidan con ${sender}.`);return}
      const p=preview(selected.snippet);
      say(`El último que encontré de ${nameOf(selected.from)} tiene como asunto ${selected.subject||'sin asunto'}.${p?` La vista previa dice: ${p}`:''}`);
    }catch(e){say('No pude leer ese correo desde el cache local de Gmail.')}
  }

  function readSelected(){
    if(!selected){say('No tengo un correo seleccionado. Decime de quién querés el último.');return}
    const p=preview(selected.snippet);
    say(`El asunto es ${selected.subject||'sin asunto'}.${p?` La vista previa dice: ${p}`:' No tengo vista previa guardada.'}`);
  }

  function subject(){
    if(!selected){say('No tengo un correo seleccionado todavía.');return}
    say(`El asunto es ${selected.subject||'sin asunto'}.`);
  }

  function extractSender(q){
    let m=q.match(/(?:tengo|hay)\s+(?:mail|mails|correo|correos|mensaje|mensajes)\s+(?:de|del)\s+(.+)$/);
    if(!m)m=q.match(/(?:ultimo|ultima).*?(?:de|del)\s+(.+)$/);
    if(!m)m=q.match(/(?:que dice|leeme|lee|mostrame|resumime|resume).*?(?:de|del)\s+(.+)$/);
    return m?m[1].replace(/\b(por favor|ultimo|ultima|mail|mails|correo|correos|mensaje|mensajes)\b/g,' ').replace(/\s+/g,' ').trim():'';
  }

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){window.runCommand=runCommand=function(value=null,fromVoice=false){
    const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim(),q=norm(raw);
    if(!q)return previous(value,fromVoice);
    const sender=extractSender(q);
    if(sender&&/\b(tengo|hay)\b/.test(q)&&/\b(mail|mails|correo|correos|mensaje|mensajes)\b/.test(q)){countFrom(sender);return}
    if(sender&&/\b(ultimo|ultima|que dice|leeme|lee|mostrame|resumime|resume)\b/.test(q)){latestFrom(sender);return}
    if(selected&&/^(que dice|leelo|leeme|lee eso|resumilo|resumime eso|que decia)$/.test(q)){readSelected();return}
    if(selected&&/^(cual es el asunto|que asunto tiene|y el asunto|asunto)$/.test(q)){subject();return}
    return previous(value,fromVoice);
  }}

  async function realVoiceCore(){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),900);
    try{
      const r=await fetch('http://127.0.0.1:8765/health',{signal:c.signal,cache:'no-store'});
      if(!r.ok)return false;
      const d=await r.json();
      return !!d?.ok&&(d?.core==='zero-local-core'||/faster-whisper|whisper/i.test(String(d?.engine||'')));
    }catch(e){return false}
    finally{clearTimeout(timer)}
  }

  const originalVoiceStart=window.WA_VOICE_PRO?.start?.bind(window.WA_VOICE_PRO);
  if(originalVoiceStart){
    window.WA_VOICE_PRO.start=async function(){
      if(await realVoiceCore())return originalVoiceStart();
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){say('El núcleo local de Whisper no está disponible y Chrome no ofrece voz de respaldo.');return}
      const rec=new SR();rec.lang='es-AR';rec.interimResults=false;rec.continuous=false;
      rec.onresult=e=>{const text=String(e.results?.[0]?.[0]?.transcript||'').trim();if(text){try{commandInput.value=text}catch(err){};try{runCommand(text,true)}catch(err){}}};
      rec.onerror=()=>say('No pude entenderte con la voz de respaldo.');
      try{rec.start()}catch(e){}
    };
  }

  const originalHandsfree=window.WA_HANDSFREE?.toggle?.bind(window.WA_HANDSFREE);
  if(originalHandsfree){
    const safeHandsfree=async function(){
      if(await realVoiceCore())return originalHandsfree();
      say('Manos libres necesita el ZERO Local Core con Whisper. Podés usar Hablar con la voz de respaldo de Chrome.');
    };
    window.WA_HANDSFREE.toggle=safeHandsfree;
    const hf=document.querySelector('#handsfree-toggle');
    if(hf)hf.onclick=e=>{e.preventDefault();safeHandsfree()};
  }

  window.ZERO_GMAIL_DETAIL={version:'1.2.0',countFrom,latestFrom,readSelected,subject,realVoiceCore,selected:()=>selected};
})();
