// Work Agent - Local Whisper Voice Engine v2.1
// Mic local -> deteccion de voz/silencio -> faster-whisper local.
// Fix: evita escucharse a si mismo y bloquea grabaciones concurrentes.

const WA_LOCAL_VOICE={
  endpoint:'http://127.0.0.1:8765/transcribe',
  health:'http://127.0.0.1:8765/health',
  maxSeconds:10,
  silenceMs:850,
  minSpeechMs:220,
  levelThreshold:0.022,
  wakeWord:(localStorage.getItem('wa_wake_word')||'jarvis').toLowerCase(),
  selectedDeviceId:localStorage.getItem('wa_voice_device_id')||''
};

window.WA_VOICE_PRO_ACTIVE=true;

let waLocalRecorder=null;
let waLocalStream=null;
let waLocalChunks=[];
let waLocalTimer=null;
let waLocalRecording=false;
let waManualMode=false;
let waHandsFree=false;
let waHandsFreeArmedUntil=0;
let waAudioContext=null;
let waAnalyser=null;
let waMonitorRAF=null;
let waSpeechStartedAt=0;
let waLastVoiceAt=0;
let waProcessing=false;
let waBlockedUntil=0;

function waWaitingLabel(){
  return `Manos libres · esperando “${WA_LOCAL_VOICE.wakeWord}”`;
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
  try{return(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput')}
  catch(e){return[]}
}

function waPreferredMic(devices){
  if(!devices.length)return null;
  return devices.find(d=>d.deviceId===WA_LOCAL_VOICE.selectedDeviceId)
    ||devices.find(d=>/family|analog|internal|built.?in|alc256/i.test(d.label||''))
    ||devices.find(d=>!/^predeterminado$|^default$/i.test((d.label||'').trim())&&!/redmi|bluetooth/i.test(d.label||''))
    ||devices[0];
}

async function waLocalPopulateSelector(){
  const select=document.querySelector('#mic-select');
  if(!select)return;
  const devices=await waLocalInputs();
  select.innerHTML='';
  if(!devices.length){select.innerHTML='<option value="">No se detectaron micrófonos</option>';return}
  const preferred=waPreferredMic(devices);
  if(preferred){
    WA_LOCAL_VOICE.selectedDeviceId=preferred.deviceId;
    localStorage.setItem('wa_voice_device_id',preferred.deviceId);
  }
  devices.forEach((d,i)=>{
    const opt=document.createElement('option');
    opt.value=d.deviceId;
    opt.textContent=d.label||`Micrófono ${i+1}`;
    opt.selected=d.deviceId===WA_LOCAL_VOICE.selectedDeviceId;
    select.appendChild(opt);
  });
  select.onchange=()=>{
    WA_LOCAL_VOICE.selectedDeviceId=select.value;
    localStorage.setItem('wa_voice_device_id',select.value);
  };
}

function waLocalMime(){
  return ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']
    .find(t=>MediaRecorder.isTypeSupported(t))||'';
}

async function waLocalHealth(){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),1500);
  try{
    const r=await fetch(WA_LOCAL_VOICE.health,{signal:c.signal});
    return r.ok&&!!(await r.json()).ok;
  }catch(e){return false}
  finally{clearTimeout(t)}
}

async function waOpenSelectedMic(){
  const devices=await waLocalInputs();
  const preferred=waPreferredMic(devices);
  const ordered=[];
  if(preferred)ordered.push(preferred);
  devices.forEach(d=>{if(!ordered.some(x=>x.deviceId===d.deviceId))ordered.push(d)});
  let lastErr=null;
  for(const d of ordered){
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:d.deviceId}}});
      WA_LOCAL_VOICE.selectedDeviceId=d.deviceId;
      localStorage.setItem('wa_voice_device_id',d.deviceId);
      const sel=document.querySelector('#mic-select');
      if(sel)sel.value=d.deviceId;
      return s;
    }catch(e){lastErr=e}
  }
  try{return await navigator.mediaDevices.getUserMedia({audio:true})}
  catch(e){throw lastErr||e}
}

function waStopMonitor(){
  if(waMonitorRAF)cancelAnimationFrame(waMonitorRAF);
  waMonitorRAF=null;
  if(waAudioContext){try{waAudioContext.close()}catch(e){}waAudioContext=null}
  waAnalyser=null;
}

function waCloseStream(){
  waStopMonitor();
  if(waLocalStream){
    waLocalStream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});
    waLocalStream=null;
  }
}

function waRms(){
  if(!waAnalyser)return 0;
  const buf=new Uint8Array(waAnalyser.fftSize);
  waAnalyser.getByteTimeDomainData(buf);
  let sum=0;
  for(const v of buf){const x=(v-128)/128;sum+=x*x}
  return Math.sqrt(sum/buf.length);
}

function waCreateAnalyser(stream){
  waAudioContext=new(window.AudioContext||window.webkitAudioContext)();
  waAnalyser=waAudioContext.createAnalyser();
  waAnalyser.fftSize=512;
  waAudioContext.createMediaStreamSource(stream).connect(waAnalyser);
}

function waAssistantIsSpeaking(){
  try{return !!(window.speechSynthesis&&(window.speechSynthesis.speaking||window.speechSynthesis.pending))}
  catch(e){return false}
}

function waBeginRecording(manual=false){
  if(waLocalRecording||waProcessing||!waLocalStream)return;
  const mime=waLocalMime();
  waLocalChunks=[];
  waManualMode=manual;
  waLocalRecorder=mime?new MediaRecorder(waLocalStream,{mimeType:mime}):new MediaRecorder(waLocalStream);
  waLocalRecorder.ondataavailable=e=>{if(e.data&&e.data.size)waLocalChunks.push(e.data)};
  waLocalRecorder.onstop=()=>waLocalFinish(waManualMode);
  waLocalRecording=true;
  waSpeechStartedAt=Date.now();
  waLastVoiceAt=Date.now();
  waLocalRecorder.start(120);
  if(manual)listeningBeep();
  waLocalTimer=setTimeout(()=>waLocalStop(),WA_LOCAL_VOICE.maxSeconds*1000);
}

function waLocalStop(){
  if(!waLocalRecording)return;
  waLocalRecording=false;
  waProcessing=true;
  if(waLocalTimer){clearTimeout(waLocalTimer);waLocalTimer=null}
  if(waManualMode)setVoiceState('ready','Transcribiendo local…');
  else setVoiceState('ready','Jarvis · procesando…');
  try{if(waLocalRecorder?.state!=='inactive')waLocalRecorder.stop()}
  catch(e){waProcessing=false}
}

function waMonitorLoop(){
  if(!waAnalyser)return;
  const now=Date.now();

  // Mientras Jarvis habla, no se escucha a si mismo. Dejamos un pequeno
  // margen despues de la voz sintetizada para evitar eco residual.
  if(waAssistantIsSpeaking()){
    waBlockedUntil=now+650;
    waLastVoiceAt=now;
    waMonitorRAF=requestAnimationFrame(waMonitorLoop);
    return;
  }

  if(now<waBlockedUntil||waProcessing){
    waMonitorRAF=requestAnimationFrame(waMonitorLoop);
    return;
  }

  const level=waRms();
  const speaking=level>=WA_LOCAL_VOICE.levelThreshold;

  if(speaking){
    waLastVoiceAt=now;
    if(!waLocalRecording&&waHandsFree){
      waBeginRecording(false);
      setVoiceState('listening','Manos libres · escuchando…');
    }
  }

  if(waLocalRecording&&now-waSpeechStartedAt>WA_LOCAL_VOICE.minSpeechMs&&now-waLastVoiceAt>=WA_LOCAL_VOICE.silenceMs){
    waLocalStop();
  }

  waMonitorRAF=requestAnimationFrame(waMonitorLoop);
}

async function waEnsureStream(){
  if(waLocalStream)return true;
  try{
    waLocalStream=await waOpenSelectedMic();
    waCreateAnalyser(waLocalStream);
    waMonitorLoop();
    return true;
  }catch(err){
    feedback(`No pude abrir el micrófono: ${err.name||err.message}`,true,'No pude abrir el micrófono.');
    return false;
  }
}

async function waTranscribeBlob(blob,mime){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),20000);
  try{
    const r=await fetch(WA_LOCAL_VOICE.endpoint,{method:'POST',headers:{'Content-Type':mime},body:blob,signal:c.signal});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);
    return String(d.text||'').trim();
  }finally{clearTimeout(t)}
}

function waStripWake(text){
  const escaped=WA_LOCAL_VOICE.wakeWord.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`(^|\\b)${escaped}\\b[,:;.!?\\s-]*`,'i');
  if(!re.test(text))return null;
  return text.replace(re,'').trim();
}

function waSayShort(text){
  try{if(typeof speak==='function')speak(text)}catch(e){}
}

async function waHandleHandsFreeText(text){
  const command=waStripWake(text);
  const armed=Date.now()<waHandsFreeArmedUntil;

  if(command===null&&!armed){
    setVoiceState('ready',waWaitingLabel());
    return;
  }

  const clean=(command===null?text:command).trim();

  if(!clean){
    waHandsFreeArmedUntil=Date.now()+8000;
    waBlockedUntil=Date.now()+250;
    listeningBeep();
    setVoiceState('listening','Sí, Rodrigo · decime');
    return;
  }

  waHandsFreeArmedUntil=0;
  commandInput.value=clean;
  setVoiceState('ready',`Jarvis: “${clean}”`);
  runCommand(clean,true);
}

function waRearmHandsFreeSoon(){
  if(!waHandsFree)return;
  const check=()=>{
    if(!waHandsFree)return;
    if(waAssistantIsSpeaking()){
      waBlockedUntil=Date.now()+650;
      setTimeout(check,180);
      return;
    }
    waBlockedUntil=Math.max(waBlockedUntil,Date.now()+350);
    setVoiceState('ready',waWaitingLabel());
  };
  setTimeout(check,120);
}

async function waLocalFinish(manual){
  const mime=waLocalRecorder?.mimeType||'audio/webm';
  const blob=new Blob(waLocalChunks,{type:mime});

  try{
    const text=await waTranscribeBlob(blob,mime);
    if(!text)throw new Error('Whisper no devolvió texto.');

    if(manual){
      commandInput.value=text;
      setVoiceState('ready',`Whisper: “${text}”`);
      runCommand(text,true);
    }else{
      await waHandleHandsFreeText(text);
    }
  }catch(err){
    if(manual)feedback(`Whisper local: ${err.message}`,true,'No pude transcribir eso.');
    else console.warn('Hands-free transcription:',err);
  }finally{
    waProcessing=false;
    if(manual&&!waHandsFree)waCloseStream();
    if(waHandsFree)waRearmHandsFreeSoon();
  }
}

async function waLocalStart(){
  if(waLocalRecording){waLocalStop();return}
  if(waProcessing)return;
  waLocalDisableLegacy();
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  setVoiceState('ready','Conectando Whisper local…');
  if(!await waLocalHealth()){
    setVoiceState('ready','Whisper local desconectado');
    feedback('Whisper local no está corriendo.',true,'El motor local de voz no está iniciado.');
    return;
  }
  if(!await waEnsureStream())return;
  commandInput.value='';
  commandFeedback.textContent='';
  setVoiceState('listening','Whisper local · hablá ahora');
  waBeginRecording(true);
}

async function waToggleHandsFree(){
  const btn=document.querySelector('#handsfree-toggle');

  if(waHandsFree){
    waHandsFree=false;
    waHandsFreeArmedUntil=0;
    waProcessing=false;
    if(waLocalRecording)waLocalStop();
    waCloseStream();
    if(btn){btn.textContent='Manos libres: OFF';btn.classList.remove('active')}
    setVoiceState('ready','Whisper local listo');
    return;
  }

  if(!await waLocalHealth()){
    feedback('Iniciá Whisper local antes de activar manos libres.',true,'Whisper local está desconectado.');
    return;
  }
  if(!await waEnsureStream())return;

  waHandsFree=true;
  waProcessing=false;
  waBlockedUntil=Date.now()+700;
  if(btn){btn.textContent='Manos libres: ON';btn.classList.add('active')}
  setVoiceState('ready',`Manos libres · decí “${WA_LOCAL_VOICE.wakeWord}”`);
  waSayShort(`Manos libres activo. Decí ${WA_LOCAL_VOICE.wakeWord} cuando me necesites.`);
}

function waSetWakeWord(value){
  const v=String(value||'jarvis').trim().toLowerCase()||'jarvis';
  WA_LOCAL_VOICE.wakeWord=v;
  localStorage.setItem('wa_wake_word',v);
  const label=document.querySelector('#wake-word');
  if(label)label.value=v;
  if(waHandsFree)setVoiceState('ready',`Manos libres · decí “${v}”`);
}

if(typeof voiceRun!=='undefined'&&voiceRun){
  voiceRun.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();waLocalStart()};
  voiceLabel.textContent='Whisper local listo';
  voiceRun.title='Whisper local';
}

const micRefresh=document.querySelector('#mic-refresh');
if(micRefresh)micRefresh.onclick=waLocalPopulateSelector;
const hf=document.querySelector('#handsfree-toggle');
if(hf)hf.onclick=waToggleHandsFree;
const wake=document.querySelector('#wake-word');
if(wake){wake.value=WA_LOCAL_VOICE.wakeWord;wake.onchange=()=>waSetWakeWord(wake.value)}

waLocalDisableLegacy();
waLocalPopulateSelector();

window.WA_VOICE_PRO={
  enabled:()=>true,
  start:waLocalStart,
  stop:waLocalStop,
  listInputs:waLocalInputs,
  version:'local-whisper-2.1'
};
window.WA_HANDSFREE={
  toggle:waToggleHandsFree,
  setWakeWord:waSetWakeWord,
  active:()=>waHandsFree
};
