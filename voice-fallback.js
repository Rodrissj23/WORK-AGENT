// ZERO Voice Fallback v1.1
// Botón Hablar: Whisper local si está disponible; Web Speech de Chrome si no.
(function(){
  'use strict';
  const btn=document.querySelector('#voice-run');
  const label=document.querySelector('#voice-label');
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  let fallback=null;

  async function localReady(){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),900);
    try{const r=await fetch('http://127.0.0.1:8765/health',{signal:c.signal});if(!r.ok)return false;const d=await r.json();return !!d?.ok}catch(e){return false}finally{clearTimeout(t)}
  }

  function webSpeech(){
    if(!SR){
      if(label)label.textContent='Voz no disponible';
      try{feedback('No encontré Whisper local ni reconocimiento de voz de Chrome.',true,'La voz no está disponible en este equipo.')}catch(e){}
      return;
    }
    try{if(fallback)fallback.abort()}catch(e){}
    fallback=new SR();
    fallback.lang='es-AR';
    fallback.interimResults=false;
    fallback.continuous=false;
    fallback.maxAlternatives=2;
    fallback.onstart=()=>{if(label)label.textContent='Voz de respaldo · hablá ahora'};
    fallback.onresult=e=>{
      const text=String(e.results?.[0]?.[0]?.transcript||'').trim();
      if(!text)return;
      try{commandInput.value=text}catch(e){}
      if(label)label.textContent=`Chrome oyó: “${text}”`;
      try{runCommand(text,true)}catch(e){}
    };
    fallback.onerror=e=>{
      if(label)label.textContent='Voz de respaldo lista';
      try{feedback(`Voz de respaldo: ${e.error||'error'}`,true,'No pude entenderte.')}catch(err){}
    };
    fallback.onend=()=>{if(label&&label.textContent.startsWith('Voz de respaldo ·'))label.textContent='Voz de respaldo lista'};
    try{fallback.start()}catch(e){}
  }

  async function smartStart(){
    if(await localReady()){
      if(label)label.textContent='Whisper local · conectando…';
      try{window.WA_VOICE_PRO?.start?.();return}catch(e){}
    }
    webSpeech();
  }

  if(btn){
    btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();smartStart()},{capture:true});
    btn.title='Whisper local con respaldo de Chrome';
  }

  setTimeout(async()=>{
    const local=await localReady();
    if(label&&!local&&SR)label.textContent='Voz de respaldo disponible';
  },700);

  // Carga la respuesta de capacidades después de asegurar el motor de voz.
  try{
    if(!window.ZERO_CAPABILITIES){
      const script=document.createElement('script');
      script.src='zero-capabilities.js?v=20260813-1838';
      script.async=true;
      document.head.appendChild(script);
    }
  }catch(e){}

  window.ZERO_VOICE_FALLBACK={start:smartStart,localReady};
})();
