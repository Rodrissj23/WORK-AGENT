// Work Agent - Transcription PRO
// Usa un backend seguro para transcribir audio con OpenAI.
// Si el endpoint falla, el sistema sigue pudiendo volver al reconocimiento de Chrome.

const WA_TRANSCRIPTION_CFG = {
  endpoint: localStorage.getItem('wa_transcription_endpoint') || 'https://work-agent-voice-api.vercel.app/api/transcribe',
  maxSeconds: 6,
  mimeCandidates: [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus'
  ]
};

let waProRecorder = null;
let waProStream = null;
let waProChunks = [];
let waProStopTimer = null;
let waProRecording = false;

function waTranscriptionProEnabled(){
  return !!WA_TRANSCRIPTION_CFG.endpoint;
}

function waPickMimeType(){
  if(typeof MediaRecorder === 'undefined') return '';
  return WA_TRANSCRIPTION_CFG.mimeCandidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

function waSetProEndpoint(url){
  const clean = String(url || '').trim();
  if(clean){
    localStorage.setItem('wa_transcription_endpoint', clean);
  } else {
    localStorage.removeItem('wa_transcription_endpoint');
  }
  WA_TRANSCRIPTION_CFG.endpoint = clean || 'https://work-agent-voice-api.vercel.app/api/transcribe';
  return WA_TRANSCRIPTION_CFG.endpoint;
}

async function waStartProRecording(){
  if(!waTranscriptionProEnabled()) return false;
  if(waProRecording) return true;

  if(typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia){
    throw new Error('Este navegador no soporta grabación para Voz PRO.');
  }

  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  if(typeof recognition !== 'undefined' && recognition && isListening){
    manualStop = true;
    try{ recognition.stop(); }catch(e){}
  }

  waProStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  const mimeType = waPickMimeType();
  waProChunks = [];
  waProRecorder = mimeType ? new MediaRecorder(waProStream, {mimeType}) : new MediaRecorder(waProStream);

  waProRecorder.ondataavailable = e => {
    if(e.data && e.data.size > 0) waProChunks.push(e.data);
  };

  waProRecorder.onstop = waFinishProRecording;
  waProRecording = true;
  commandInput.value = '';
  commandFeedback.textContent = '';
  setVoiceState('listening', 'Voz PRO · hablá ahora');
  listeningBeep();
  waProRecorder.start();

  waProStopTimer = setTimeout(() => waStopProRecording(), WA_TRANSCRIPTION_CFG.maxSeconds * 1000);
  return true;
}

function waStopProRecording(){
  if(!waProRecording) return;
  if(waProStopTimer){ clearTimeout(waProStopTimer); waProStopTimer = null; }
  waProRecording = false;
  setVoiceState('ready', 'Transcribiendo…');
  try{
    if(waProRecorder && waProRecorder.state !== 'inactive') waProRecorder.stop();
  }catch(e){}
}

function waCleanupProStream(){
  if(waProStream){
    waProStream.getTracks().forEach(t => t.stop());
    waProStream = null;
  }
}

async function waFinishProRecording(){
  try{
    const mimeType = waProRecorder?.mimeType || 'audio/webm';
    const blob = new Blob(waProChunks, {type:mimeType});
    waCleanupProStream();

    if(blob.size < 700){
      setVoiceState('ready', 'Voz lista');
      feedback('No escuché suficiente audio.', true, 'No te escuché bien.');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(WA_TRANSCRIPTION_CFG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType
      },
      body: blob,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if(!res.ok){
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.error || `Transcripción HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = String(data.text || data.transcript || '').trim();
    if(!text) throw new Error('La transcripción volvió vacía.');

    commandInput.value = text;
    setVoiceState('ready', `Voz PRO: “${text}”`);
    runCommand(text, true);
  }catch(err){
    waCleanupProStream();
    setVoiceState('ready', 'Voz lista');
    console.warn('Voz PRO falló:', err);
    feedback(`Voz PRO no respondió: ${err.message || 'error desconocido'}.`, true, 'No pude transcribir eso. Probá otra vez.');
  }
}

// Captura el click antes que el listener de Chrome cuando Voz PRO está configurada.
if(typeof voiceRun !== 'undefined' && voiceRun){
  voiceRun.addEventListener('click', async e => {
    if(!waTranscriptionProEnabled()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try{
      if(waProRecording) waStopProRecording();
      else await waStartProRecording();
    }catch(err){
      setVoiceState('ready', 'Voz lista');
      feedback(err.message || 'No pude iniciar Voz PRO.', true, 'No pude iniciar el micrófono.');
    }
  }, true);
}

window.WA_VOICE_PRO = {
  setEndpoint: waSetProEndpoint,
  enabled: waTranscriptionProEnabled,
  start: waStartProRecording,
  stop: waStopProRecording
};
