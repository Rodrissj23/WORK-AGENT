// Work Agent - Local Whisper Voice Engine
// Motor principal gratuito: navegador -> 127.0.0.1:8765 -> faster-whisper.

const WA_LOCAL_VOICE = {
  endpoint: localStorage.getItem('wa_local_voice_endpoint') || 'http://127.0.0.1:8765/transcribe',
  health: 'http://127.0.0.1:8765/health',
  maxSeconds: 6,
  selectedDeviceId: localStorage.getItem('wa_voice_device_id') || ''
};

window.WA_VOICE_PRO_ACTIVE = true;

let waLocalRecorder = null;
let waLocalStream = null;
let waLocalChunks = [];
let waLocalTimer = null;
let waLocalRecording = false;

function waLocalCleanup(){
  if(waLocalStream){
    waLocalStream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});
    waLocalStream=null;
  }
}

function waLocalDisableLegacy(){
  try{if(typeof waStopFollowUp==='function')waStopFollowUp()}catch(e){}
  try{if(typeof clearFinishTimer==='function')clearFinishTimer()}catch(e){}
  try{
    if(typeof recognition!=='undefined'&&recognition){
      recognition.onresult=null;
      recognition.onspeechend=null;
      recognition.onspeechstart=null;
      recognition.onaudiostart=null;
      recognition.onerror=null;
      recognition.onend=null;
      manualStop=true;
      recognition.abort();
    }
  }catch(e){}
}

async function waLocalInputs(){
  try{
    const devices=await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d=>d.kind==='audioinput');
  }catch(e){return[]}
}

async function waLocalPopulateSelector(){
  const select=document.querySelector('#voice-device');
  if(!select)return;
  const devices=await waLocalInputs();
  select.innerHTML='';
  devices.forEach((d,i)=>{
    const opt=document.createElement('option');
    opt.value=d.deviceId;
    opt.textContent=d.label||`Micrófono ${i+1}`;
    if(d.deviceId===WA_LOCAL_VOICE.selectedDeviceId)opt.selected=true;
    select.appendChild(opt);
  });
  if(!WA_LOCAL_VOICE.selectedDeviceId&&select.value){
    WA_LOCAL_VOICE.selectedDeviceId=select.value;
  }
  select.onchange=()=>{
    WA_LOCAL_VOICE.selectedDeviceId=select.value;
    localStorage.setItem('wa_voice_device_id',select.value);
  };
}

function waLocalMime(){
  const types=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
  return types.find(t=>MediaRecorder.isTypeSupported(t))||'';
}

async function waLocalHealth(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),1200);
  try{
    const res=await fetch(WA_LOCAL_VOICE.health,{signal:controller.signal});
    if(!res.ok)return false;
    const data=await res.json();
    return !!data.ok;
  }catch(e){return false}
  finally{clearTimeout(timer)}
}

async function waLocalStart(){
  if(waLocalRecording)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
    feedback('Este navegador no soporta Voz Local.',true,'No puedo usar el micrófono en este navegador.');
    return;
  }

  waLocalDisableLegacy();
  if('speechSynthesis'in window)window.speechSynthesis.cancel();

  setVoiceState('ready','Conectando Whisper local…');
  const online=await waLocalHealth();
  if(!online){
    setVoiceState('ready','Whisper local desconectado');
    feedback('Whisper local no está corriendo. Iniciá local_whisper_server.py.',true,'El motor local de voz no está iniciado.');
    return;
  }

  try{
    setVoiceState('ready','Abriendo micrófono…');
    const audio=WA_LOCAL_VOICE.selectedDeviceId
      ? {deviceId:{exact:WA_LOCAL_VOICE.selectedDeviceId},echoCancellation:true,noiseSuppression:true,autoGainControl:true}
      : {echoCancellation:true,noiseSuppression:true,autoGainControl:true};
    waLocalStream=await navigator.mediaDevices.getUserMedia({audio});
  }catch(err){
    waLocalCleanup();
    setVoiceState('ready','Whisper local listo');
    feedback(`No pude abrir el micrófono: ${err.name||err.message}`,true,'No pude abrir el micrófono.');
    return;
  }

  const mime=waLocalMime();
  waLocalChunks=[];
  waLocalRecorder=mime?new MediaRecorder(waLocalStream,{mimeType:mime}):new MediaRecorder(waLocalStream);
  waLocalRecorder.ondataavailable=e=>{if(e.data&&e.data.size)waLocalChunks.push(e.data)};
  waLocalRecorder.onstop=waLocalFinish;
  waLocalRecording=true;
  commandInput.value='';
  commandFeedback.textContent='';
  setVoiceState('listening','Whisper local · hablá ahora');
  listeningBeep();
  waLocalRecorder.start(120);
  waLocalTimer=setTimeout(waLocalStop,WA_LOCAL_VOICE.maxSeconds*1000);
}

function waLocalStop(){
  if(!waLocalRecording)return;
  waLocalRecording=false;
  if(waLocalTimer){clearTimeout(waLocalTimer);waLocalTimer=null}
  setVoiceState('ready','Transcribiendo local…');
  try{if(waLocalRecorder?.state!=='inactive')waLocalRecorder.stop()}catch(e){waLocalCleanup()}
}

async function waLocalFinish(){
  const mime=waLocalRecorder?.mimeType||'audio/webm';
  const blob=new Blob(waLocalChunks,{type:mime});
  waLocalCleanup();

  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    const res=await fetch(WA_LOCAL_VOICE.endpoint,{method:'POST',headers:{'Content-Type':mime},body:blob,signal:controller.signal});
    clearTimeout(timer);
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
    const text=String(data.text||'').trim();
    if(!text)throw new Error('Whisper no devolvió texto.');
    commandInput.value=text;
    setVoiceState('ready',`Whisper: “${text}”`);
    runCommand(text,true);
  }catch(err){
    setVoiceState('ready','Whisper local listo');
    feedback(`Whisper local: ${err.message}`,true,'No pude transcribir eso.');
  }
}

async function waLocalClick(e){
  if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
  if(waLocalRecording)waLocalStop();
  else await waLocalStart();
}

if(typeof voiceRun!=='undefined'&&voiceRun){
  voiceRun.onclick=waLocalClick;
  voiceLabel.textContent='Whisper local listo';
  voiceRun.title='Whisper local';
}

waLocalDisableLegacy();
waLocalPopulateSelector();

window.WA_VOICE_PRO={
  enabled:()=>true,
  start:waLocalStart,
  stop:waLocalStop,
  listInputs:waLocalInputs,
  version:'local-whisper-1'
};
