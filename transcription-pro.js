// Work Agent - Transcription PRO v2.2
// OpenAI STT via backend. Voz PRO es duena exclusiva del microfono.

const WA_TRANSCRIPTION_CFG = {
  endpoint: localStorage.getItem('wa_transcription_endpoint') || 'https://work-agent-voice-api.vercel.app/api/transcribe',
  maxSeconds: 6,
  openMicTimeoutMs: 5000,
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
  if(clean)localStorage.setItem('wa_transcription_endpoint',clean);
  else localStorage.removeItem('wa_transcription_endpoint');
  WA_TRANSCRIPTION_CFG.endpoint=clean||'https://work-agent-voice-api.vercel.app/api/transcribe';
  return WA_TRANSCRIPTION_CFG.endpoint;
}
function waSleep(ms){return new Promise(r=>setTimeout(r,ms));}
function waSetReadyLabel(){
  if(typeof voiceLabel!=='undefined'&&voiceLabel)voiceLabel.textContent='Voz PRO lista';
  if(typeof voiceRun!=='undefined'&&voiceRun){voiceRun.dataset.voiceEngine='pro';voiceRun.title='Voz PRO activa';}
}
function waCleanupProStream(){
  if(waProStream){waProStream.getTracks().forEach(t=>{try{t.stop();}catch(e){}});waProStream=null;}
}
function waDisableLegacySpeechRecognition(){
  if(waLegacySpeechDisabled)return;
  waLegacySpeechDisabled=true;
  try{if(typeof waStopFollowUp==='function')waStopFollowUp();}catch(e){}
  try{if(typeof clearFinishTimer==='function')clearFinishTimer();}catch(e){}
  if(typeof recognition==='undefined'||!recognition)return;
  try{recognition.onresult=null;recognition.onspeechend=null;recognition.onspeechstart=null;recognition.onaudiostart=null;recognition.onerror=null;recognition.onend=null;}catch(e){}
  try{manualStop=true;recognition.abort();}catch(e){try{recognition.stop();}catch(_){}}
}
function waWithTimeout(promise,ms,label){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>{const err=new Error(label||'Tiempo de espera agotado.');err.name='TimeoutError';reject(err);},ms))
  ]);
}
async function waListAudioInputs(){
  try{
    const devices=await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d=>d.kind==='audioinput').map((d,i)=>({index:i,label:d.label||`Micrófono ${i+1}`,deviceId:d.deviceId||''}));
  }catch(e){return[];}
}
async function waRequestMic(constraints){
  return waWithTimeout(navigator.mediaDevices.getUserMedia(constraints),WA_TRANSCRIPTION_CFG.openMicTimeoutMs,'Chrome tardó demasiado en abrir el micrófono.');
}
async function waGetMicStream(){
  const inputs=await waListAudioInputs();
  console.log('WORK AGENT audio inputs:',inputs);
  try{
    return await waRequestMic({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  }catch(firstErr){
    if(firstErr?.name==='NotAllowedError'||firstErr?.name==='SecurityError')throw firstErr;
    await waSleep(120);
    try{return await waRequestMic({audio:true});}
    catch(secondErr){secondErr.firstAttempt=firstErr;secondErr.audioInputs=inputs;throw secondErr;}
  }
}
async function waStartProRecording(){
  if(!waTranscriptionProEnabled())return false;
  if(waProRecording)return true;
  if(typeof MediaRecorder==='undefined'||!navigator.mediaDevices?.getUserMedia)throw new Error('Este navegador no soporta grabación para Voz PRO.');

  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  waCleanupProStream();

  setVoiceState('ready','Liberando micrófono…');
  waDisableLegacySpeechRecognition();
  await waSleep(300);

  setVoiceState('ready','Abriendo micrófono…');
  try{waProStream=await waGetMicStream();}
  catch(err){
    console.error('No se pudo abrir el micrófono:',err,err?.firstAttempt,err?.audioInputs);
    const names=(err?.audioInputs||[]).map(x=>x.label).filter(Boolean);
    const suffix=names.length?` Detectados: ${names.join(' | ')}`:'';
    if(err?.name==='TimeoutError')throw new Error(`Chrome no respondió al intentar abrir el micrófono.${suffix}`);
    if(err?.name==='NotAllowedError'||err?.name==='SecurityError')throw new Error('Chrome no tiene permiso para usar el micrófono. Revisá el candado de la barra de direcciones.');
    if(err?.name==='NotFoundError'||err?.name==='DevicesNotFoundError')throw new Error(`No encontré ningún micrófono disponible.${suffix}`);
    if(err?.name==='NotReadableError'||/could not start audio source/i.test(err?.message||''))throw new Error(`Chrome detecta el micrófono pero no puede abrirlo.${suffix}`);
    throw new Error(`No pude abrir el micrófono: ${err?.name||err?.message||'error desconocido'}.${suffix}`);
  }

  const tracks=waProStream.getAudioTracks();
  if(!tracks.length){waCleanupProStream();throw new Error('El navegador abrió audio pero no entregó ninguna pista de micrófono.');}

  const activeLabel=tracks[0].label||'micrófono activo';
  const mimeType=waPickMimeType();
  waProChunks=[];
  waProRecorder=mimeType?new MediaRecorder(waProStream,{mimeType}):new MediaRecorder(waProStream);
  waProRecorder.ondataavailable=e=>{if(e.data&&e.data.size>0)waProChunks.push(e.data);};
  waProRecorder.onstop=waFinishProRecording;

  waProRecording=true;
  commandInput.value='';
  commandFeedback.textContent='';
  setVoiceState('listening',`Voz PRO · ${activeLabel} · hablá ahora`);
  listeningBeep();
  waProRecorder.start(120);
  waProStopTimer=setTimeout(()=>waStopProRecording(),WA_TRANSCRIPTION_CFG.maxSeconds*1000);
  return true;
}
function waStopProRecording(){
  if(!waProRecording)return;
  if(waProStopTimer){clearTimeout(waProStopTimer);waProStopTimer=null;}
  waProRecording=false;setVoiceState('ready','Transcribiendo…');
  try{if(waProRecorder&&waProRecorder.state!=='inactive')waProRecorder.stop();}catch(e){waCleanupProStream();}
}
async function waFinishProRecording(){
  try{
    const mimeType=waProRecorder?.mimeType||'audio/webm';
    const blob=new Blob(waProChunks,{type:mimeType});
    waCleanupProStream();
    if(blob.size<700){setVoiceState('ready','Voz PRO lista');feedback('No escuché suficiente audio.',true,'No te escuché bien.');return;}
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    const res=await fetch(WA_TRANSCRIPTION_CFG.endpoint,{method:'POST',headers:{'Content-Type':mimeType},body:blob,signal:controller.signal});
    clearTimeout(timeout);
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const detail=String(data.error||`Transcripción HTTP ${res.status}`).trim();const code=data.openaiCode?` (${data.openaiCode})`:'';throw new Error(`${detail}${code}`);}
    const text=String(data.text||data.transcript||'').trim();
    if(!text)throw new Error('La transcripción volvió vacía.');
    commandInput.value=text;setVoiceState('ready',`Voz PRO: “${text}”`);runCommand(text,true);
  }catch(err){
    waCleanupProStream();setVoiceState('ready','Voz PRO lista');console.warn('Voz PRO falló:',err);feedback(`Voz PRO: ${err.message||'error desconocido'}`,true,'No pude transcribir eso.');
  }
}
async function waHandleVoiceProClick(e){
  if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}
  try{if(waProRecording)waStopProRecording();else await waStartProRecording();}
  catch(err){waCleanupProStream();setVoiceState('ready','Voz PRO lista');feedback(err.message||'No pude iniciar Voz PRO.',true,'No pude iniciar el micrófono.');}
}
if(typeof voiceRun!=='undefined'&&voiceRun){voiceRun.onclick=waHandleVoiceProClick;}
waSetReadyLabel();
setTimeout(()=>{waSetReadyLabel();waDisableLegacySpeechRecognition();},0);
window.WA_VOICE_PRO={setEndpoint:waSetProEndpoint,enabled:waTranscriptionProEnabled,start:waStartProRecording,stop:waStopProRecording,legacyDisabled:()=>waLegacySpeechDisabled,listInputs:waListAudioInputs,version:'2.2'};