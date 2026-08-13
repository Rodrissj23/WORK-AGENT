// Work Agent - Operational Status + Spoken Briefing v1.3
const WA_STATUS_URL='http://127.0.0.1:8765/status';
let waStatusCache=null;

const WA_FRESH_MINUTES={gmail:20,mora:72*60,scoring:36*60};

async function waFetchStatus(){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),1800);
  try{const r=await fetch(WA_STATUS_URL,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();waStatusCache=d.systems||{};waRenderLiveStatus(waStatusCache);return waStatusCache}catch(e){return null}finally{clearTimeout(t)}
}
function waHumanDate(value){
  if(!value)return'';const raw=String(value);
  const d=new Date(raw);if(!Number.isNaN(d.getTime()))return d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',',' a las');
  return raw;
}
function waAgeMinutes(s){
  const raw=s?.ultima_ejecucion||s?.updated_at||s?.reported_at;
  if(!raw)return null;
  const d=new Date(raw);if(Number.isNaN(d.getTime()))return null;
  return Math.max(0,(Date.now()-d.getTime())/60000);
}
function waIsFresh(name,s){
  if(!s?.connected)return false;
  const age=waAgeMinutes(s),limit=WA_FRESH_MINUTES[name];
  return age===null||!Number.isFinite(limit)||age<=limit;
}
function waGreeting(){const h=new Date().getHours();return h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches'}
function waStatusSentence(name,s){
  if(!s||!s.connected)return null;
  const when=waHumanDate(s.ultima_ejecucion||s.updated_at||s.reported_at);
  if(!waIsFresh(name,s)){
    const label=name==='gmail'?'Gmail':name==='mora'?'Mora':'Scoring';
    return `${label} tiene telemetría desactualizada${when?` desde ${when}`:''}; no la tomo como estado actual.`;
  }
  if(name==='gmail'){
    const pri=Number(s.prioritarios),imp=Number(s.pendientes_importantes??s.pendientes??s.total_importantes),unread=Number(s.no_leidos_recientes);
    const bits=[];
    if(Number.isFinite(pri))bits.push(`${pri} ${pri===1?'correo prioritario':'correos prioritarios'}`);
    if(Number.isFinite(imp))bits.push(`${imp} ${imp===1?'mail marcado importante':'mails marcados importantes'}`);
    if(!bits.length&&Number.isFinite(unread))bits.push(`${unread} ${unread===1?'no leído reciente':'no leídos recientes'}`);
    if(bits.length)return `Gmail está conectado: ${bits.join(' y ')}.`;
    return 'Gmail está conectado y actualizado.';
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
  if(parts.length===1)parts.push('Todavía no tengo motores reportando estado real en este equipo.');
  return parts.join(' ');
}
function waRenderCard(id,title,s){
  const card=document.querySelector(id);if(!card||!s)return;
  const strong=card.querySelector('strong'),p=card.querySelector('p'),tag=card.querySelector('.mini-status');
  const name=title==='Gmail'?'gmail':title==='Mora'?'mora':'scoring';
  if(!s.connected){if(tag){tag.textContent='○ sin telemetría';tag.classList.remove('ok')}return}
  const when=waHumanDate(s.ultima_ejecucion||s.reported_at||s.updated_at);
  const fresh=waIsFresh(name,s);
  if(strong&&when)strong.textContent=when.split(' a las ')[1]||'Actualizado';
  if(!fresh){
    if(p)p.textContent=when?`Último reporte ${when}`:'Último reporte sin fecha';
    if(tag){tag.textContent='○ desactualizado';tag.classList.remove('ok')}
    return;
  }
  if(p){
    const bits=[];
    if(title==='Gmail'){
      if(Number.isFinite(Number(s.prioritarios)))bits.push(`${s.prioritarios} prioritarios`);
      if(Number.isFinite(Number(s.pendientes_importantes)))bits.push(`${s.pendientes_importantes} importantes`);
      if(Number.isFinite(Number(s.no_leidos_recientes)))bits.push(`${s.no_leidos_recientes} no leídos`);
    }else{
      if(Number.isFinite(Number(s.procesados)))bits.push(`${s.procesados} procesados`);
      if(Number.isFinite(Number(s.errores))&&Number(s.errores)>0)bits.push(`${s.errores} errores`);
    }
    p.textContent=bits.join(' · ')||`Último reporte ${when}`;
  }
  if(tag){const err=Number(s.errores||0);tag.textContent=err?`● ${err} errores`:'● actualizado';tag.classList.toggle('ok',!err)}
}
function waRenderLiveStatus(systems){systems=systems||{};waRenderCard('#status-scoring','Scoring',systems.scoring);waRenderCard('#status-mora','Mora',systems.mora);waRenderCard('#status-gmail','Gmail',systems.gmail)}
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
window.WA_STATUS={refresh:waFetchStatus,briefing:waSpeakBriefing,build:waBuildBriefing,isFresh:waIsFresh,ageMinutes:waAgeMinutes};
