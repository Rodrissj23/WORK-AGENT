// Work Agent - Transcription PRO v2
// OpenAI STT via backend. Voz PRO es duena exclusiva del microfono.

const WA_TRANSCRIPTION_CFG = {
  endpoint: localStorage.getItem('wa_transcription_endpoint') || 'https://work-agent-voice-api.vercel.app/api/transcribe',
  maxSeconds: 6,
  mimeCandidates: ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']
};

window.WA_VOICE_PRO_ACTIVE = true;

let waProRecorder=null;
let waProStream=null;
let waProChunks=[];
let waProStopTimer=null;
let waProRecording=false;
let waLegacySpeechDisabled=false;

function waTranscriptionProEnabled(){return !!WA_TRANSCRIPTION_CFG.endpoint;}
function waPickMimeType(){
  if(typeof MediaRecorder==='undefined') return '';
  return WA_TRANSCRIPTION_CFG.mimeCandidates.find(t=>MediaRecorder.isTypeSupported(t))||'';
}
function waSetProEndpoint(url){
  const clean=String(url||'').trim();
  if(clean) localStorage.setItem('wa_transcription_endpoint',clean);
  else localStorage.removeItem('wa_transcription_endpoint');
  WA_TRANSCRIPTION_CFG.endpoint=clean||'https://work-agent-voice-api.vercel.app/api/transcribe';
  return WA_TRANSCRIPTION_CFG.endpoint;
}
function waSleep(ms){return new Promise(r=>setTimeout(r,ms));}

function waCleanupProStream(){
  if(waProStream){
    waProStream.getTracks().forEach(t=>{
      try{t.stop();}catch(e){}
    });
    waProStream=null;
  }
}

async function waDisableLegacySpeechRecognition(){
  if(waLegacySpeechDisabled) return;
  waLegacySpeechDisabled=true;

  try{ if(typeof waStopFollowUp==='function') waStopFollowUp(); }catch(e){}
  try{ if(typeof clearFinishTimer==='function') clearFinishTimer(); }catch(e){}

  if(typeof recognition==='undefined' || !recognition) return;

  // Neutralizamos callbacks del motor viejo para que no pueda reiniciarse.
  try{recognition.onresult=null;}catch(e){}
  try{recognition.onspeechend=null;}catch(e){}
  try{recognition.onspeechstart=null;}catch(e){}
  try{recognition.onaudiostart=null;}catch(e){}
  try{recognition.onerror=null;}catch(e){}

  await new Promise(resolve=>{
    let done=false;
    const finish=()=>{
      if(done) return;
      done=true;
      resolve();
    };

    try{recognition.onend=finish;}catch(e){}
    try{
      manualStop=true;
      recognition.abort();
    }catch(e){
      try{recognition.stop();}catch(_){}
    }

    setTimeout(finish,900);
  });

  // Chrome/Linux a veces mantiene el dispositivo unos cientos de ms despues de onend.
  await waSleep(350);
}

async function waGetMicStream(){
  // Primer intento con procesamiento de voz.
  try{
    return await navigator.mediaDevices.getUserMedia({
      audio:{
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true
      }
    });
  }catch(firstErr){
    // Algunos drivers Linux/Chrome fallan con constraints avanzados.
    if(firstErr?.name==='NotAllowedError' || firstErr?.name==='SecurityError') throw firstErr;

    await waSleep(180);

    // Segundo intento: dispositivo default sin constraints especiales.
    try{
      return await navigator.mediaDevices.getUserMedia({audio:true});
    }catch(secondErr){
      secondErr.firstAttempt=firstErr;
      throw secondErr;
    }
  }
}

async function waStartProRecording(){
  if(!waTranscriptionProEnabled()) return false;
  if(waProRecording) return true;

  if(typeof MediaRecorder==='undefined' || !navigator.mediaDevices?.getUserMedia){
    throw new Error('Este navegador no soporta grabacion para Voz PRO.');
  }

  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  waCleanupProStream();
  await waDisableLegacySpeechRecognition();

  try{
    waProStream=await waGetMicStream();
  }catch(err){
    console.error('No se pudo abrir el microfono:',err,err?.firstAttempt);

    if(err?.name==='NotAllowedError' || err?.name==='SecurityError'){
      throw new Error('Chrome no tiene permiso para usar el micrófono. Revisá el candado de la barra de direcciones.');
    }
    if(err?.name==='NotFoundError' || err?.name==='DevicesNotFoundError'){
      throw new Error('No encontré ningún micrófono disponible en el sistema.');
    }
    if(err?.name==='NotReadableError' || /could not start audio source/i.test(err?.message||'')){
      throw new Error('Chrome detecta el micrófono pero no puede abrirlo. Recargá esta pestaña; si sigue igual, revisamos el dispositivo de entrada de Chrome/Linux.');
    }
    throw new Error(`No pude abrir el micrófono: ${err?.name||err?.message||'error desconocido'}`);
  }

  const tracks=waProStream.getAudioTracks();
  if(!tracks.length){
    waCleanupProStream();
    throw new Error('El navegador abrió audio pero no entregó ninguna pista de micrófono.');
  }

  const mimeType=waPickMimeType();
  waProChunks=[];
  waProRecorder=mimeType?new MediaRecorder(waProStream,{mimeType}):new MediaRecorder(waProStream);
  waProRecorder.ondataavailable=e=>{if(e.data&&e.data.size>0)waProChunks.push(e.data);};
  waProRecorder.onstop=waFinishProRecording;

  waProRecording=true;
  commandInput.value='';
  commandFeedback.textContent='';
  setVoiceState('listening','Voz PRO · hablá ahora');
  listeningBeep();
  waProRecorder.start(120);
  waProStopTimer=setTimeout(()=>waStopProRecording(),WA_TRANSCRIPTION_CFG.maxSeconds*1000);
  return true;
}

function waStopProRecording(){
  if(!waProRecording) return;
  if(waProStopTimer){clearTimeout(waProStopTimer);waProStopTimer=null;}
  waProRecording=false;
  setVoiceState('ready','Transcribiendo…');
  try{
    if(waProRecorder&&waProRecorder.state!=='inactive') waProRecorder.stop();
  }catch(e){
    waCleanupProStream();
  }
}

async function waFinishProRecording(){
  try{
    const mimeType=waProRecorder?.mimeType||'audio/webm';
    const blob=new Blob(waProChunks,{type:mimeType});
    waCleanupProStream();

    if(blob.size<700){
      setVoiceState('ready','Voz lista');
      feedback('No escuché suficiente audio.',true,'No te escuché bien.');
      return;
    }

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    const res=await fetch(WA_TRANSCRIPTION_CFG.endpoint,{
      method:'POST',
      headers:{'Content-Type':mimeType},
      body:blob,
      signal:controller.signal
    });
    clearTimeout(timeout);

    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      const detail=String(data.error||`Transcripción HTTP ${res.status}`).trim();
      const code=data.openaiCode?` (${data.openaiCode})`:'';
      throw new Error(`${detail}${code}`);
    }

    const text=String(data.text||data.transcript||'').trim();
    if(!text) throw new Error('La transcripción volvió vacía.');

    commandInput.value=text;
    setVoiceState('ready',`Voz PRO: “${text}”`);
    runCommand(text,true);
  }catch(err){
    waCleanupProStream();
    setVoiceState('ready','Voz lista');
    console.warn('Voz PRO falló:',err);
    feedback(`Voz PRO: ${err.message||'error desconocido'}`,true,'No pude transcribir eso.');
  }
}

if(typeof voiceRun!=='undefined'&&voiceRun){
  voiceRun.addEventListener('click',async e=>{
    if(!waTranscriptionProEnabled()) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    try{
      if(waProRecording) waStopProRecording();
      else await waStartProRecording();
    }catch(err){
      waCleanupProStream();
      setVoiceState('ready','Voz lista');
      feedback(err.message||'No pude iniciar Voz PRO.',true,'No pude iniciar el micrófono.');
    }
  },true);
}

// Desactivar el motor viejo apenas carga Voz PRO, no esperar al primer click.
setTimeout(()=>{waDisableLegacySpeechRecognition().catch(()=>{});},0);

window.WA_VOICE_PRO={
  setEndpoint:waSetProEndpoint,
  enabled:waTranscriptionProEnabled,
  start:waStartProRecording,
  stop:waStopProRecording,
  legacyDisabled:()=>waLegacySpeechDisabled
};