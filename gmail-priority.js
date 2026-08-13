// ZERO Gmail Priority v1.1 - compatibilidad.
// demo-readiness.js ya posee el flujo conversacional completo de Gmail.
(function(){
  'use strict';
  if(window.ZERO_DEMO_READINESS){
    window.ZERO_GMAIL_PRIORITY={version:'1.1.0',delegated:true};
    return;
  }

  const API='http://127.0.0.1:8765/gmail/messages';
  let last=[];
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const say=t=>{try{commandFeedback.textContent=t;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(t)}catch(e){}};
  const nameOf=v=>{const s=String(v||'').trim(),n=s.split('<')[0].trim().replace(/^"|"$/g,'');return n||(s.match(/<([^>]+)>/)||[])[1]||s||'remitente desconocido'};

  async function fetchPriority(){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),1800);
    try{const r=await fetch(`${API}?priority=1&limit=8`,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();last=Array.isArray(d.items)?d.items:[];return last}
    finally{clearTimeout(timer)}
  }

  async function report(){
    try{const items=await fetchPriority();if(!items.length){say('No encontré correos de remitentes prioritarios en la revisión reciente.');return}const names=[];items.forEach(x=>{const n=nameOf(x.from);if(n&&!names.includes(n))names.push(n)});say(`Encontré ${items.length} ${items.length===1?'correo prioritario':'correos prioritarios'}. Hay mensajes de ${names.slice(0,5).join(', ')}.`)}
    catch(e){say('No pude consultar los remitentes prioritarios. Verificá que el núcleo local de ZERO esté encendido.')}
  }

  function who(){if(!last.length){report();return}const grouped={};last.forEach(x=>{const n=nameOf(x.from);grouped[n]=(grouped[n]||0)+1});const parts=Object.entries(grouped).slice(0,6).map(([n,c])=>c>1?`${n}, ${c} correos`:n);say(`Tengo correos prioritarios de ${parts.join('; ')}.`)}
  function subjects(){if(!last.length){report();return}const parts=last.slice(0,5).map(x=>`${nameOf(x.from)}: ${x.subject||'sin asunto'}`);say(`Los primeros asuntos son: ${parts.join('; ')}.`)}

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){window.runCommand=runCommand=function(value=null,fromVoice=false){const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim(),q=norm(raw);if(/\b(tengo mails prioritarios|tengo correos prioritarios|mails prioritarios|correos prioritarios|cuales son los prioritarios)\b/.test(q)){report();return}if(/^(de quien|de quienes|y de quien|y de quienes)$/.test(q)){who();return}if(/^(que asuntos|cuales son los asuntos|y los asuntos|que dicen los asuntos)$/.test(q)){subjects();return}return previous(value,fromVoice)}}
  window.ZERO_GMAIL_PRIORITY={version:'1.1.0',report,who,subjects};
})();
