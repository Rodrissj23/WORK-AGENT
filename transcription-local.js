// Work Agent - Local Whisper Voice Engine v2.3
// Mic local -> deteccion de voz/silencio -> faster-whisper local.
// Fix: wake word tolerante + diagnostico visible del texto reconocido.

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
let waLocalRecorder=null,waLocalStream=null,waLocalChunks=[],waLocalTimer=null;
let waLocalRecording=false,waManualMode=false,waHandsFree=false,waHandsFreeArmedUntil=0;
let waAudioContext=null,waAnalyser=null,waMonitorRAF=null,waSpeechStartedAt=0,waLastVoiceAt=0;
let waProcessing=false,waBlockedUntil=0,waTtsActive=false;

function waWaitingLabel(){return `Manos libres · esperando “${WA_LOCAL_VOICE.wakeWord}”`;}
function waNormalizeWakeText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}

function waInstallTtsGuard(){
  if(!window.speechSynthesis||window.__WA_TTS_GUARD_INSTALLED)return;
  window.__WA_TTS_GUARD_INSTALLED=true;
  const nativeSpeak=window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak=function(utterance){
    waTtsActive=true;
    let released=false;
    const release=()=>{
      if(released)return;released=true;
      waTtsActive=false;waBlockedUntil=Date.now()+650;
      if(waHandsFree&&!waProcessing&&!waLocalRecording){setTimeout(()=>{if(waHandsFree&&!waProcessing&&!waLocalRecording&&!waTtsActive)setVoiceState('ready',waWaitingLabel())},680)}
    };
    try{utterance.addEventListener('end',release,{once:true});utterance.addEventListener('error',release,{once:true})}catch(e){}
    // watchdog por si Chrome no emite end/error
    setTimeout(release,12000);
    return nativeSpeak(utterance);
  };
}

function waLocalDisableLegacy(){
  try{if(typeof waStopFollowUp==='function')waStopFollowUp()}catch(e){}
  try{if(typeof clearFinishTimer==='function')clearFinishTimer()}catch(e){}
  try{if(typeof recognition!=='undefined'&&recognition){recognition.onresult=null;recognition.onspeechend=null;recognition.onspeechstart=null;recognition.onaudiostart=null;recognition.onerror=null;recognition.onend=null;manualStop=true;recognition.abort()}}catch(e){}
}
async function waLocalInputs(){try{return(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput')}catch(e){return[]}}
function waPreferredMic(devices){if(!devices.length)return null;return devices.find(d=>d.deviceId===WA_LOCAL_VOICE.selectedDeviceId)||devices.find(d=>/family|analog|internal|built.?in|alc256/i.test(d.label||''))||devices.find(d=>!/^predeterminado$|^default$/i.test((d.label||'').trim())&&!/redmi|bluetooth/i.test(d.label||''))||devices[0]}
async function waLocalPopulateSelector(){
  const select=document.querySelector('#mic-select');if(!select)return;const devices=await waLocalInputs();select.innerHTML='';
  if(!devices.length){select.innerHTML='<option value="">No se detectaron micrófonos</option>';return}
  const preferred=waPreferredMic(devices);if(preferred){WA_LOCAL_VOICE.selectedDeviceId=preferred.deviceId;localStorage.setItem('wa_voice_device_id',preferred.deviceId)}
  devices.forEach((d,i)=>{const opt=document.createElement('option');opt.value=d.deviceId;opt.textContent=d.label||`Micrófono ${i+1}`;opt.selected=d.deviceId===WA_LOCAL_VOICE.selectedDeviceId;select.appendChild(opt)});
  select.onchange=()=>{WA_LOCAL_VOICE.selectedDeviceId=select.value;localStorage.setItem('wa_voice_device_id',select.value)};
}
function waLocalMime(){return['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t))||''}
async function waLocalHealth(){const c=new AbortController(),t=setTimeout(()=>c.abort(),1500);try{const r=await fetch(WA_LOCAL_VOICE.health,{signal:c.signal});return r.ok&&!!(await r.json()).ok}catch(e){return false}finally{clearTimeout(t)}}
async function waOpenSelectedMic(){
  const devices=await waLocalInputs(),preferred=waPreferredMic(devices),ordered=[];if(preferred)ordered.push(preferred);devices.forEach(d=>{if(!ordered.some(x=>x.deviceId===d.deviceId))ordered.push(d)});let lastErr=null;
  for(const d of ordered){try{const s=await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:d.deviceId}}});WA_LOCAL_VOICE.selectedDeviceId=d.deviceId;localStorage.setItem('wa_voice_device_id',d.deviceId);const sel=document.querySelector('#mic-select');if(sel)sel.value=d.deviceId;return s}catch(e){lastErr=e}}
  try{return await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){throw lastErr||e}
}
function waStopMonitor(){if(waMonitorRAF)cancelAnimationFrame(waMonitorRAF);waMonitorRAF=null;if(waAudioContext){try{waAudioContext.close()}catch(e){}waAudioContext=null}waAnalyser=null}
function waCloseStream(){waStopMonitor();if(waLocalStream){waLocalStream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});waLocalStream=null}}
function waRms(){if(!waAnalyser)return 0;const buf=new Uint8Array(waAnalyser.fftSize);waAnalyser.getByteTimeDomainData(buf);let sum=0;for(const v of buf){const x=(v-128)/128;sum+=x*x}return Math.sqrt(sum/buf.length)}
function waCreateAnalyser(stream){waAudioContext=new(window.AudioContext||window.webkitAudioContext)();waAnalyser=waAudioContext.createAnalyser();waAnalyser.fftSize=512;waAudioContext.createMediaStreamSource(stream).connect(waAnalyser)}
function waBeginRecording(manual=false){
  if(waLocalRecording||waProcessing||waTtsActive||!waLocalStream)return;
  const mime=waLocalMime();waLocalChunks=[];waManualMode=manual;waLocalRecorder=mime?new MediaRecorder(waLocalStream,{mimeType:mime}):new MediaRecorder(waLocalStream);
  waLocalRecorder.ondataavailable=e=>{if(e.data&&e.data.size)waLocalChunks.push(e.data)};waLocalRecorder.onstop=()=>waLocalFinish(waManualMode);waLocalRecording=true;waSpeechStartedAt=Date.now();waLastVoiceAt=Date.now();waLocalRecorder.start(120);if(manual)listeningBeep();waLocalTimer=setTimeout(()=>waLocalStop(),WA_LOCAL_VOICE.maxSeconds*1000);
}
function waLocalStop(){if(!waLocalRecording)return;waLocalRecording=false;waProcessing=true;if(waLocalTimer){clearTimeout(waLocalTimer);waLocalTimer=null}setVoiceState('ready',waManualMode?'Transcribiendo local…':'Jarvis · procesando…');try{if(waLocalRecorder?.state!=='inactive')waLocalRecorder.stop()}catch(e){waProcessing=false}}
function waMonitorLoop(){
  if(!waAnalyser)return;const now=Date.now();if(waTtsActive||now<waBlockedUntil||waProcessing){waMonitorRAF=requestAnimationFrame(waMonitorLoop);return}
  const level=waRms(),speaking=level>=WA_LOCAL_VOICE.levelThreshold;
  if(speaking){waLastVoiceAt=now;if(!waLocalRecording&&waHandsFree){waBeginRecording(false);if(waLocalRecording)setVoiceState('listening','Manos libres · escuchando…')}}
  if(waLocalRecording&&now-waSpeechStartedAt>WA_LOCAL_VOICE.minSpeechMs&&now-waLastVoiceAt>=WA_LOCAL_VOICE.silenceMs)waLocalStop();
  waMonitorRAF=requestAnimationFrame(waMonitorLoop);
}
async function waEnsureStream(){if(waLocalStream)return true;try{waLocalStream=await waOpenSelectedMic();waCreateAnalyser(waLocalStream);if(waAudioContext?.state==='suspended'){try{await waAudioContext.resume()}catch(e){}}waMonitorLoop();return true}catch(err){feedback(`No pude abrir el micrófono: ${err.name||err.message}`,true,'No pude abrir el micrófono.');return false}}
async function waTranscribeBlob(blob,mime){const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);try{const r=await fetch(WA_LOCAL_VOICE.endpoint,{method:'POST',headers:{'Content-Type':mime},body:blob,signal:c.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return String(d.text||'').trim()}finally{clearTimeout(t)}}

function waWakeAliases(){
  const base=waNormalizeWakeText(WA_LOCAL_VOICE.wakeWord);
  if(base==='jarvis')return['jarvis','yarvis','jarbis','harvis','jarviz'];
  return[base];
}
function waStripWake(text){
  const normalized=waNormalizeWakeText(text);const aliases=waWakeAliases();
  for(const alias of aliases){
    const escaped=alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(`(^|\\b)${escaped}\\b[,:;.!?\\s-]*`,'i');
    if(re.test(normalized))return normalized.replace(re,'').trim();
  }
  return null;
}
function waLooksLikeExecutableCommand(text){
  try{
    if(typeof extractMiniHubQuery==='function'&&extractMiniHubQuery(text))return true;
  }catch(e){}
  const q=waNormalizeWakeText(text);
  return /\b(mora|scoring|reporte|liquidacion|comision|briefing|como estamos|estado general|pendientes)\b/.test(q);
}
async function waHandleHandsFreeText(text){
  const visible=String(text||'').trim();
  commandInput.value=visible;
  setVoiceState('ready',`Whisper oyó: “${visible}”`);

  const command=waStripWake(visible),armed=Date.now()<waHandsFreeArmedUntil;
  if(command===null&&!armed){
    // Whisper a veces deforma/omite el wake word, pero conserva perfecto el comando.
    // Si la frase es inequívocamente ejecutable, la aceptamos en modo manos libres.
    if(waLooksLikeExecutableCommand(visible)){
      commandFeedback.textContent=`Wake word dudoso, ejecutando: “${visible}”`;
      commandFeedback.classList.remove('error');
      runCommand(visible,true);
      return;
    }
    commandFeedback.textContent=`Ignorado: no detecté “${WA_LOCAL_VOICE.wakeWord}”. Whisper oyó: “${visible}”`;
    commandFeedback.classList.remove('error');
    return;
  }

  const clean=(command===null?visible:command).trim();
  if(!clean){waHandsFreeArmedUntil=Date.now()+8000;waBlockedUntil=Date.now()+250;listeningBeep();setVoiceState('listening','Sí, Rodrigo · decime');return}

  waHandsFreeArmedUntil=0;commandInput.value=clean;commandFeedback.textContent=`Ejecutando: “${clean}”`;commandFeedback.classList.remove('error');setVoiceState('ready',`Jarvis: “${clean}”`);runCommand(clean,true);
}
function waRearmHandsFreeSoon(){if(!waHandsFree)return;setTimeout(()=>{if(!waHandsFree)return;if(waTtsActive||waProcessing||waLocalRecording){waRearmHandsFreeSoon();return}waBlockedUntil=Math.max(waBlockedUntil,Date.now()+350);setVoiceState('ready',waWaitingLabel())},180)}
async function waLocalFinish(manual){
  const mime=waLocalRecorder?.mimeType||'audio/webm',blob=new Blob(waLocalChunks,{type:mime});
  try{const text=await waTranscribeBlob(blob,mime);if(!text)throw new Error('Whisper no devolvió texto.');if(manual){commandInput.value=text;setVoiceState('ready',`Whisper: “${text}”`);runCommand(text,true)}else await waHandleHandsFreeText(text)}catch(err){if(manual)feedback(`Whisper local: ${err.message}`,true,'No pude transcribir eso.');else{commandFeedback.textContent=`Error manos libres: ${err.message}`;commandFeedback.classList.add('error')}}finally{waProcessing=false;if(manual&&!waHandsFree)waCloseStream();if(waHandsFree)waRearmHandsFreeSoon()}
}
async function waLocalStart(){if(waLocalRecording){waLocalStop();return}if(waProcessing)return;waLocalDisableLegacy();if('speechSynthesis'in window)window.speechSynthesis.cancel();setVoiceState('ready','Conectando Whisper local…');if(!await waLocalHealth()){setVoiceState('ready','Whisper local desconectado');feedback('Whisper local no está corriendo.',true,'El motor local de voz no está iniciado.');return}if(!await waEnsureStream())return;commandInput.value='';commandFeedback.textContent='';setVoiceState('listening','Whisper local · hablá ahora');waBeginRecording(true)}
async function waToggleHandsFree(){
  const btn=document.querySelector('#handsfree-toggle');
  if(waHandsFree){waHandsFree=false;waHandsFreeArmedUntil=0;waProcessing=false;if(waLocalRecording)waLocalStop();waCloseStream();if(btn){btn.textContent='Manos libres: OFF';btn.classList.remove('active')}setVoiceState('ready','Whisper local listo');return}
  if(!await waLocalHealth()){feedback('Iniciá Whisper local antes de activar manos libres.',true,'Whisper local está desconectado.');return}
  if(!await waEnsureStream())return;waHandsFree=true;waProcessing=false;waBlockedUntil=Date.now()+350;if(btn){btn.textContent='Manos libres: ON';btn.classList.add('active')}setVoiceState('ready',waWaitingLabel());
}
function waSetWakeWord(value){const v=String(value||'jarvis').trim().toLowerCase()||'jarvis';WA_LOCAL_VOICE.wakeWord=v;localStorage.setItem('wa_wake_word',v);const label=document.querySelector('#wake-word');if(label)label.value=v;if(waHandsFree)setVoiceState('ready',`Manos libres · decí “${v}”`)}

waInstallTtsGuard();
if(typeof voiceRun!=='undefined'&&voiceRun){voiceRun.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();waLocalStart()};voiceLabel.textContent='Whisper local listo';voiceRun.title='Whisper local'}
const micRefresh=document.querySelector('#mic-refresh');if(micRefresh)micRefresh.onclick=waLocalPopulateSelector;
const hf=document.querySelector('#handsfree-toggle');if(hf)hf.onclick=waToggleHandsFree;
const wake=document.querySelector('#wake-word');if(wake){wake.value=WA_LOCAL_VOICE.wakeWord;wake.onchange=()=>waSetWakeWord(wake.value)}
waLocalDisableLegacy();waLocalPopulateSelector();
window.WA_VOICE_PRO={enabled:()=>true,start:waLocalStart,stop:waLocalStop,listInputs:waLocalInputs,version:'local-whisper-2.3'};
window.WA_HANDSFREE={toggle:waToggleHandsFree,setWakeWord:waSetWakeWord,active:()=>waHandsFree};
