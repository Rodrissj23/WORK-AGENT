// ZERO Diagnostics v1.1
// Diagnostico de demo: verifica configuracion local sin ejecutar acciones sensibles.
(function(){
  'use strict';

  const CORE='http://127.0.0.1:8765';

  function norm(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  }

  async function fetchJson(path,timeout=1300){
    const c=new AbortController();
    const timer=setTimeout(()=>c.abort(),timeout);
    try{
      const r=await fetch(`${CORE}${path}`,{signal:c.signal,cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      return await r.json();
    }catch(e){return null}
    finally{clearTimeout(timer)}
  }

  function accessConfigured(id){
    try{return !!window.ZERO_ACCESS?.registry?.[id]?.url}catch(e){return false}
  }

  function browserVoice(){
    return !!(window.SpeechRecognition||window.webkitSpeechRecognition);
  }

  async function run({speakResult=true}={}){
    const [health,status]=await Promise.all([fetchJson('/health'),fetchJson('/status')]);
    const systems=status?.systems||{};

    const checks={
      core:!!health?.ok,
      whisper:!!health?.ok&&/whisper/i.test(String(health?.engine||'')),
      memory:!!health?.persistent_memory||!!window.ZERO_MEMORY,
      cognition:!!window.ZERO_CONVERSATION_V2,
      gmail:!!systems?.gmail?.connected,
      puente:accessConfigured('puente-digital')||accessConfigured('prevencion'),
      ventas:accessConfigured('ventas-prevencion'),
      ceibo:accessConfigured('ceibo'),
      voiceFallback:browserVoice()||!!window.ZERO_VOICE_FALLBACK
    };

    const labels={
      core:'núcleo local',whisper:'Whisper',memory:'memoria',cognition:'cognición',gmail:'Gmail',
      puente:'Puente Digital',ventas:'Ventas Prevención',ceibo:'Ceibo',voiceFallback:'voz de respaldo'
    };

    const ready=Object.values(checks).filter(Boolean).length;
    const total=Object.keys(checks).length;
    const missing=Object.entries(checks).filter(([,ok])=>!ok).map(([id])=>labels[id]);

    let text=`Diagnóstico de Zero: ${ready} de ${total} componentes listos.`;
    if(checks.core){
      text+=checks.gmail?' Núcleo local y Gmail están conectados.':' Núcleo local conectado; Gmail no está reportando ahora.';
    }else{
      text+=browserVoice()?' El núcleo local está apagado, pero tengo voz de respaldo en Chrome.':' El núcleo local está apagado.';
    }
    if(missing.length&&missing.length<=4)text+=` Falta: ${missing.join(', ')}.`;
    if(!missing.length)text+=' Todo lo necesario para la demo está operativo.';

    try{
      commandFeedback.textContent=text;
      commandFeedback.classList.toggle('error',ready<6);
    }catch(e){}
    if(speakResult){try{if(typeof speak==='function')speak(text)}catch(e){}}

    const bar=document.querySelector('#statusbar');
    if(bar){
      const old=document.querySelector('#zero-diagnostic-badge');
      if(old)old.remove();
      const badge=document.createElement('span');
      badge.id='zero-diagnostic-badge';
      badge.innerHTML=`demo: <b>${ready}/${total}</b>`;
      bar.appendChild(badge);
    }

    try{console.table(Object.entries(checks).map(([id,listo])=>({componente:labels[id],listo})))}catch(e){}
    return {ready,total,checks,missing,health,status,text};
  }

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=norm(raw);
      if(/\b(diagnostico|diagnosticar|estado de zero|zero esta listo|esta todo listo|chequeo de zero|prueba de sistemas)\b/.test(q)){
        run();return;
      }
      return previous(value,fromVoice);
    };
  }

  window.ZERO_DIAGNOSTICS={version:'1.1.0',run};
})();
