// ZERO Status Freshness v1.0
// Evita presentar telemetria vieja como si estuviera actualizada.
(function(){
  'use strict';

  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const ageMinutes=value=>{const d=new Date(value||'');return Number.isNaN(d.getTime())?null:Math.max(0,(Date.now()-d.getTime())/60000)};
  const fresh=(s,max=20)=>{if(!s?.connected)return false;const a=ageMinutes(s.ultima_ejecucion||s.updated_at||s.reported_at);return a===null||a<=max};
  const human=value=>{const d=new Date(value||'');if(Number.isNaN(d.getTime()))return'';return d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',',' a las')};
  const greet=()=>{const h=new Date().getHours();return h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches'};
  const say=text=>{try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(text)}catch(e){}};

  function gmailSentence(s){
    if(!s?.connected)return null;
    const stamp=s.ultima_ejecucion||s.reported_at;
    if(!fresh(s,20))return `Gmail está conectado, pero la última lectura fue ${human(stamp)||'hace un rato'}. Necesito actualizarla.`;
    const pri=Number(s.prioritarios),imp=Number(s.pendientes_importantes),unread=Number(s.no_leidos_recientes);
    const bits=[];
    if(Number.isFinite(pri))bits.push(`${pri} ${pri===1?'correo prioritario':'correos prioritarios'}`);
    if(Number.isFinite(imp))bits.push(`${imp} ${imp===1?'mail importante':'mails importantes'}`);
    if(!bits.length&&Number.isFinite(unread))bits.push(`${unread} ${unread===1?'no leído reciente':'no leídos recientes'}`);
    return bits.length?`Gmail está actualizado: ${bits.join(' y ')}.`:'Gmail está conectado y actualizado.';
  }

  function engineSentence(label,s){
    if(!s?.connected)return null;
    const bits=[];const stamp=s.ultima_ejecucion||s.reported_at;
    if(stamp)bits.push(`${label} reportó ${human(stamp)}`);else bits.push(`${label} está conectado`);
    if(Number.isFinite(Number(s.procesados)))bits.push(`${s.procesados} procesados`);
    if(Number.isFinite(Number(s.errores)))bits.push(Number(s.errores)===0?'sin errores':`${s.errores} errores`);
    return bits.join(', ')+'.';
  }

  async function briefing(){
    const systems=window.WA_STATUS?.refresh?await window.WA_STATUS.refresh():null;
    if(!systems){say(`${greet()}, Rodrigo. El núcleo local de Zero no está respondiendo en este equipo.`);return}
    const parts=[`${greet()}, Rodrigo.`];
    const g=gmailSentence(systems.gmail);if(g)parts.push(g);
    const m=engineSentence('Mora',systems.mora);if(m)parts.push(m);
    const s=engineSentence('Scoring',systems.scoring);if(s)parts.push(s);
    if(parts.length===1)parts.push('El núcleo está activo, pero todavía no hay motores reportando telemetría.');
    say(parts.join(' '));
  }

  function paint(){
    const s=window.WA_STATUS;
    if(!s?.refresh)return;
    s.refresh().then(systems=>{
      const gmail=systems?.gmail;
      const tag=document.querySelector('#status-gmail .mini-status');
      if(tag&&gmail?.connected&&!fresh(gmail,20)){tag.textContent='○ desactualizado';tag.classList.remove('ok')}
      if(!systems){document.querySelectorAll('.daily-card .mini-status').forEach(el=>{el.textContent='○ núcleo local off';el.classList.remove('ok')})}
    }).catch(()=>{});
  }

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=norm(raw);
      if(/\b(briefing|como estamos|como esta todo|estado general|mis pendientes|que tengo pendiente|resumen operativo)\b/.test(q)){briefing();return}
      return previous(value,fromVoice);
    };
  }

  paint();setInterval(paint,60000);
  window.ZERO_STATUS_FRESH={briefing,fresh,ageMinutes};
})();
