// Work Agent - Operational Status + Spoken Briefing
const WA_STATUS_URL='http://127.0.0.1:8765/status';
let waStatusCache=null;

async function waFetchStatus(){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),1800);
  try{const r=await fetch(WA_STATUS_URL,{signal:c.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();waStatusCache=d.systems||{};waRenderLiveStatus(waStatusCache);return waStatusCache}catch(e){return null}finally{clearTimeout(t)}
}
function waHumanDate(value){
  if(!value)return'';const raw=String(value);
  const d=new Date(raw);if(!Number.isNaN(d.getTime()))return d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',',' a las');
  return raw;
}
function waGreeting(){const h=new Date().getHours();return h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches'}
function waStatusSentence(name,s){
  if(!s||!s.connected)return null;
  const when=waHumanDate(s.ultima_ejecucion||s.updated_at||s.reported_at);
  if(name==='gmail'){
    const n=Number(s.pendientes_importantes??s.pendientes??s.total_importantes);
    if(Number.isFinite(n))return `Tenés ${n} ${n===1?'mail importante pendiente':'mails importantes pendientes'}.`;
    return 'Gmail está conectado.';
  }
  const label=name==='mora'?'Mora':'Scoring';
  const bits=[];
  if(when)bits.push(`${label} se actualizó ${when}`);else bits.push(`${label} reportó estado`);
  if(Number.isFinite(Number(s.errores)))bits.push(Number(s.errores)===0?'sin errores':`con ${s.errores} errores`);
  if(Number.isFinite(Number(s.procesados)))bits.push(`${s.procesados} procesados`);
  return bits.join(', ')+'.';
}
function waBuildBriefing(systems){
  const parts=[`${waGreeting()}, Rodrigo.`];
  const gmail=waStatusSentence('gmail',systems?.gmail);if(gmail)parts.push(gmail);
  const mora=waStatusSentence('mora',systems?.mora);if(mora)parts.push(mora);
  const scoring=waStatusSentence('scoring',systems?.scoring);if(scoring)parts.push(scoring);
  if(parts.length===1)parts.push('Todavía no tengo motores reportando estado real.');
  return parts.join(' ');
}
function waRenderCard(id,title,s){
  const card=document.querySelector(id);if(!card||!s)return;
  const strong=card.querySelector('strong'),p=card.querySelector('p'),tag=card.querySelector('.mini-status');
  if(!s.connected){if(tag){tag.textContent='○ sin telemetría';tag.classList.remove('ok')}return}
  const when=waHumanDate(s.ultima_ejecucion||s.reported_at);
  if(strong&&when)strong.textContent=when.split(' a las ')[1]||'Actualizado';
  if(p){const bits=[];if(Number.isFinite(Number(s.procesados)))bits.push(`${s.procesados} procesados`);if(Number.isFinite(Number(s.pendientes_importantes)))bits.push(`${s.pendientes_importantes} pendientes`);p.textContent=bits.join(' · ')||`Último reporte ${when}`}
  if(tag){const err=Number(s.errores||0);tag.textContent=err?`● ${err} errores`:'● actualizado';tag.classList.toggle('ok',!err)}
}
function waRenderLiveStatus(systems){waRenderCard('#status-scoring','Scoring',systems.scoring);waRenderCard('#status-mora','Mora',systems.mora);waRenderCard('#status-gmail','Gmail',systems.gmail)}
async function waSpeakBriefing(){
  const systems=await waFetchStatus();const text=waBuildBriefing(systems||{});
  commandFeedback.textContent=text;commandFeedback.classList.remove('error');
  try{if(typeof speak==='function')speak(text)}catch(e){}
  return text;
}
function waIsBriefingCommand(raw){const q=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return /\b(briefing|como estamos|como esta todo|estado general|mis pendientes|que tengo pendiente|resumen operativo)\b/.test(q)}

const waRunBeforeStatus=runCommand;
runCommand=function(value=null,fromVoice=false){const raw=String(value!==null?value:commandInput.value).trim();if(waIsBriefingCommand(raw)){waSpeakBriefing();return}return waRunBeforeStatus(value,fromVoice)};

const briefingBtn=document.querySelector('#briefing-run');if(briefingBtn)briefingBtn.onclick=waSpeakBriefing;
waFetchStatus();setInterval(waFetchStatus,60000);
window.WA_STATUS={refresh:waFetchStatus,briefing:waSpeakBriefing,build:waBuildBriefing};
