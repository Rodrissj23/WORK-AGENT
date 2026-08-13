// ZERO Voice Core Guard v1.0
// Evita confundir cualquier servicio HTTP en :8765 con el core real de Whisper.
(function(){
  'use strict';

  const HEALTH='http://127.0.0.1:8765/health';
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const originalStart=window.WA_VOICE_PRO?.start?.bind(window.WA_VOICE_PRO);
  const originalHandsfree=window.WA_HANDSFREE?.toggle?.bind(window.WA_HANDSFREE);
  let recognition=null;

  function isRealCore(d){
    return !!d?.ok&&(d?.core==='zero-local-core'||/faster-whisper|whisper/i.test(String(d?.engine||'')));
  }

  async function check(){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),900);
    try{
      const r=await fetch(HEALTH,{signal:c.signal,cache:'no-store'});
      if(!r.ok)return false;
      return isRealCore(await r.json());
    }catch(e){return false}
    finally{clearTimeout(t)}
  }

  function chromeFallback(){
    const label=document.querySelector('#voice-label');
    if(!SR){
      if(label)label.textContent='Voz no disponible';
      try{feedback('El núcleo local no es Whisper y Chrome no ofrece reconocimiento de voz.',true,'La voz no está disponible.')}catch(e){}
      return;
    }
    try{recognition?.abort?.()}catch(e){}
    recognition=new SR();
    recognition.lang='es-AR';recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=2;
    recognition.onstart=()=>{if(label)label.textContent='Voz de respaldo · hablá ahora'};
    recognition.onresult=e=>{
      const text=String(e.results?.[0]?.[0]?.transcript||'').trim();
      if(!text)return;
      try{commandInput.value=text}catch(e){}
      if(label)label.textContent=`Chrome oyó: “${text}”`;
      try{runCommand(text,true)}catch(e){}
    };
    recognition.onerror=e=>{if(label)label.textContent='Voz de respaldo lista';try{feedback(`Voz de respaldo: ${e.error||'error'}`,true,'No pude entenderte.')}catch(err){}};
    recognition.onend=()=>{if(label&&/Voz de respaldo/.test(label.textContent||''))label.textContent='Voz de respaldo disponible'};
    try{recognition.start()}catch(e){}
  }

  async function safeStart(){
    if(await check()){
      if(originalStart)return originalStart();
    }
    chromeFallback();
  }

  async function safeHandsfree(){
    if(await check()){
      if(originalHandsfree)return originalHandsfree();
      return;
    }
    try{feedback('Manos libres necesita el ZERO Local Core con Whisper. Podés usar el botón Hablar con la voz de respaldo de Chrome.',false,'Manos libres necesita el motor local.')}catch(e){}
  }

  if(window.WA_VOICE_PRO&&originalStart){window.WA_VOICE_PRO.start=safeStart}
  if(window.WA_HANDSFREE&&originalHandsfree){window.WA_HANDSFREE.toggle=safeHandsfree}

  const hf=document.querySelector('#handsfree-toggle');
  if(hf&&originalHandsfree){hf.onclick=e=>{e.preventDefault();safeHandsfree()}}

  window.ZERO_VOICE_CORE_GUARD={version:'1.0.0',check,isRealCore,start:safeStart};
})();
