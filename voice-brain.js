// Work Agent Voice Brain v1.4
// Parser por entidades + contexto + seguimiento conversacional mas conservador.

const WA_CONTEXT_TTL = 3500;
const WA_DUPLICATE_TTL = 1600;
const WA_FOLLOWUP_TTL = 8000;

const waVoiceContext = { sex:null, age:null, unit:null, updatedAt:0 };
const waConversation = { lastMini:null, followUpUntil:0, awaiting:false };
let waLastCommand = { key:'', at:0 };
let waFollowUpTimer = null;

function waResetContext(){
  waVoiceContext.sex=null;
  waVoiceContext.age=null;
  waVoiceContext.unit=null;
  waVoiceContext.updatedAt=0;
}

function waContextFresh(){
  return waVoiceContext.updatedAt && (Date.now()-waVoiceContext.updatedAt)<=WA_CONTEXT_TTL;
}

function waConversationFresh(){
  return !!waConversation.lastMini && Date.now()<=waConversation.followUpUntil;
}

function waRememberMini(mini){
  waConversation.lastMini={sex:mini.sex,age:mini.age,unit:mini.unit};
  waConversation.followUpUntil=Date.now()+WA_FOLLOWUP_TTL;
}

function waStopFollowUp(){
  waConversation.awaiting=false;
  waConversation.followUpUntil=0;
  if(waFollowUpTimer){
    clearTimeout(waFollowUpTimer);
    waFollowUpTimer=null;
  }
}

function waNormalizeNatural(raw){
  let q=spokenNumbersToDigits(raw);
  q=q
    .replace(/\b(una|un|el|la|los|las)\b/g,' ')
    .replace(/\b(de|para|necesito|decime|dame|quiero|ver|consultar|consulta|buscame|buscar|mostrame|mostrar|cuanto|cuánto|mide|pesa|altura|peso|seria|sería|aproximadamente|referencia)\b/g,' ')
    .replace(/\b(anio|anios)\b/g,'años')
    .replace(/\b(mes)\b/g,'meses')
    .replace(/\b(nena|niña|chica|femenino|femenina)\b/g,'mujer')
    .replace(/\b(nene|niño|chico|masculino|masculina|hombre)\b/g,'varon')
    .replace(/\b(y|ahora|entonces|tambien|también)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return q;
}

function waExtractEntities(raw){
  const q=waNormalizeNatural(raw);
  let sex=null,age=null,unit=null;

  if(/\bmujer\b/.test(q)||/(^|\s)m(?=\s|\d|$)/.test(q)) sex='m';
  if(/\bvaron\b/.test(q)||/(^|\s)v(?=\s|\d|$)/.test(q)) sex='v';
  if(/\bmes(es)?\b/.test(q)) unit='meses';
  if(/\baños?\b/.test(q)) unit='anios';

  const ageMatch=q.match(/\b(\d{1,2})\b/);
  if(ageMatch) age=Number(ageMatch[1]);

  return {sex,age,unit,raw:q};
}

function waMergeWithContext(entities){
  if(!waContextFresh()) waResetContext();

  if(entities.sex) waVoiceContext.sex=entities.sex;
  if(entities.age!==null) waVoiceContext.age=entities.age;
  if(entities.unit) waVoiceContext.unit=entities.unit;
  if(entities.sex||entities.age!==null||entities.unit) waVoiceContext.updatedAt=Date.now();

  return {
    sex:entities.sex||waVoiceContext.sex,
    age:entities.age!==null?entities.age:waVoiceContext.age,
    unit:entities.unit||waVoiceContext.unit||'anios'
  };
}

function waResolveFollowUp(raw,entities){
  if(!waConversationFresh()) return null;

  const prev=waConversation.lastMini;
  const hasEntity=!!entities.sex||entities.age!==null||!!entities.unit;
  if(!hasEntity) return null;

  // Seguimiento conservador: solo cambia lo que realmente se escucho.
  const merged={
    sex:entities.sex||prev.sex,
    age:entities.age!==null?entities.age:prev.age,
    unit:entities.unit||prev.unit
  };

  if(merged.unit==='meses'&&(merged.age<1||merged.age>11)) return null;
  if(merged.unit==='anios'&&(merged.age<1||merged.age>18)) return null;

  return merged;
}

function waCommandKey(raw){
  const q=normalizeVoiceCommand(raw);
  const entities=waExtractEntities(raw);
  const follow=waResolveFollowUp(raw,entities);
  const merged=follow||waMergeWithContext(entities);

  if(merged.sex&&merged.age!==null) return `mini:${merged.sex}:${merged.age}:${merged.unit}`;
  if(q.includes('mora')) return 'mora';
  if(q.includes('scoring')||q.includes('reporte')) return 'scoring';
  if(q.includes('control')&&q.includes('liquid')) return 'control-liquidaciones';
  if(q.includes('mi liquid')||q.includes('comision')) return 'mi-liquidacion';
  return q;
}

function waIsDuplicate(raw){
  const key=waCommandKey(raw);
  const now=Date.now();
  if(key&&waLastCommand.key===key&&(now-waLastCommand.at)<WA_DUPLICATE_TTL) return true;
  waLastCommand={key,at:now};
  return false;
}

extractMiniHubQuery=function(raw){
  const entities=waExtractEntities(raw);
  const follow=waResolveFollowUp(raw,entities);
  const merged=follow||waMergeWithContext(entities);

  if(!merged.sex||merged.age===null) return null;
  if(merged.unit==='meses'&&(merged.age<1||merged.age>11)) return null;
  if(merged.unit==='anios'&&(merged.age<1||merged.age>18)) return null;

  return merged;
};

isCompleteVoiceCommand=function(raw){
  const q=normalizeVoiceCommand(raw);
  const entities=waExtractEntities(raw);
  const follow=waResolveFollowUp(raw,entities);
  const merged=follow||waMergeWithContext(entities);

  if(merged.sex&&merged.age!==null) return true;
  if(q.includes('mora')) return true;
  if(q.includes('scoring')||q.includes('reporte')) return true;
  if(q.includes('control')&&q.includes('liquid')) return true;
  if(q.includes('mi liquid')||q.includes('comision')) return true;
  return false;
};

// Voz mas pausada y natural en toda la capa conversacional.
speak=function(text){
  if(!('speechSynthesis' in window)||!text) return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=preferredVoice?.lang||'es-AR';
  if(preferredVoice) u.voice=preferredVoice;
  u.rate=.94;
  u.pitch=1;
  u.volume=1;
  window.speechSynthesis.speak(u);
};

function waArmFollowUpTimeout(){
  if(waFollowUpTimer) clearTimeout(waFollowUpTimer);
  waFollowUpTimer=setTimeout(()=>{
    waConversation.awaiting=false;
    if(isListening){
      manualStop=true;
      try{recognition.stop()}catch(e){}
    }
    setVoiceState('ready','Voz lista');
  },WA_FOLLOWUP_TTL);
}

function waStartFreshFollowUp(attempt=0){
  if(typeof recognition==='undefined'||!recognition) return;
  if(!waConversationFresh()) return;

  if(isListening){
    if(attempt<8) setTimeout(()=>waStartFreshFollowUp(attempt+1),100);
    return;
  }

  finalTranscript='';
  interimTranscript='';
  manualStop=false;
  beeped=false;
  waConversation.awaiting=true;
  waConversation.followUpUntil=Date.now()+WA_FOLLOWUP_TTL;
  waArmFollowUpTimeout();

  try{
    recognition.start();
    setVoiceState('listening','Seguimos · esperá el pip');
  }catch(e){
    if(attempt<8) setTimeout(()=>waStartFreshFollowUp(attempt+1),140);
  }
}

function waSpeakAndThenListen(text){
  if(!('speechSynthesis' in window)){
    setTimeout(()=>waStartFreshFollowUp(),400);
    return;
  }

  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=preferredVoice?.lang||'es-AR';
  if(preferredVoice) u.voice=preferredVoice;
  u.rate=.92;
  u.pitch=1;
  u.volume=1;

  u.onend=()=>{
    setTimeout(()=>waStartFreshFollowUp(),400);
  };

  window.speechSynthesis.speak(u);
}

const waOriginalRunCommand=runCommand;
runCommand=function(value=null,fromVoice=false){
  const raw=String(value!==null?value:commandInput.value).trim();
  const q=normalizeVoiceCommand(raw);

  if(value!==null) commandInput.value=raw;
  if(!q){
    feedback('Escribí o decí un comando.',true,'No escuché ningún comando.');
    return;
  }

  if(fromVoice&&waIsDuplicate(raw)) return;

  const entities=waExtractEntities(raw);
  const follow=waResolveFollowUp(raw,entities);
  const merged=follow||waMergeWithContext(entities);

  if(merged.sex&&merged.age!==null){
    const mini=extractMiniHubQuery(raw);
    if(mini){
      waResetContext();
      waRememberMini(mini);
      answerMiniHub(mini);
      return;
    }
  }

  const hasMiniEntity=!!entities.sex||entities.age!==null||!!entities.unit;
  if(fromVoice&&hasMiniEntity){
    if(!merged.sex){
      commandFeedback.textContent='Tengo la edad. Decime mujer o varón.';
      commandFeedback.classList.remove('error');
      waVoiceContext.updatedAt=Date.now();
      setTimeout(()=>waStartFreshFollowUp(),220);
      return;
    }
    if(merged.age===null){
      commandFeedback.textContent='Tengo el sexo. Decime la edad.';
      commandFeedback.classList.remove('error');
      waVoiceContext.updatedAt=Date.now();
      setTimeout(()=>waStartFreshFollowUp(),220);
      return;
    }
  }

  waStopFollowUp();
  waResetContext();
  return waOriginalRunCommand(value,fromVoice);
};

answerMiniHub=function(mini){
  const row=(mini.unit==='meses'?MINI_DATA.meses:MINI_DATA.anios)[mini.age];
  if(!row) return feedback('No tengo datos para esa edad.',true,'No tengo datos para esa edad.');

  const [altura,peso]=row[mini.sex];
  const sexo=mini.sex==='m'?'Mujer':'Varón';
  const edadTxt=mini.unit==='meses'?`${mini.age} ${mini.age===1?'mes':'meses'}`:`${mini.age} ${mini.age===1?'año':'años'}`;

  commandFeedback.textContent=`${sexo} · ${edadTxt} → ${altura} cm · ${peso} kg`;
  commandFeedback.classList.remove('error');

  waRememberMini(mini);
  waSpeakAndThenListen(`${altura} centímetros. ${peso} kilos.`);
};

if(typeof recognition!=='undefined'&&recognition){
  recognition.onresult=e=>{
    let newFinal='',newInterim='';

    for(let i=e.resultIndex;i<e.results.length;i++){
      const text=e.results[i][0].transcript.trim();
      if(e.results[i].isFinal) newFinal+=` ${text}`;
      else newInterim+=` ${text}`;
    }

    if(newFinal) finalTranscript=`${finalTranscript} ${newFinal}`.replace(/\s+/g,' ').trim();
    interimTranscript=newInterim.trim();

    const heard=fullTranscript();
    if(heard){
      commandInput.value=heard;
      setVoiceState('listening',`Escuchando: “${heard}”`);

      // Primer comando: rapido. Follow-up: un poco mas paciente para evitar errores.
      const complete=isCompleteVoiceCommand(heard);
      const delay=waConversation.awaiting ? (complete?220:700) : (complete?60:520);
      scheduleFinish(delay);
    }
  };

  recognition.onspeechend=()=>{
    const heard=fullTranscript();
    const complete=isCompleteVoiceCommand(heard);
    const delay=waConversation.awaiting ? (complete?180:620) : (complete?50:450);
    scheduleFinish(delay);
  };
}
