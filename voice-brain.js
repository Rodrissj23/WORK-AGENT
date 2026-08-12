// Work Agent Voice Brain v1.1
// Parser por entidades + memoria contextual + deduplicacion de comandos.

const WA_CONTEXT_TTL = 3200;
const WA_DUPLICATE_TTL = 1800;
const waVoiceContext = { sex:null, age:null, unit:null, updatedAt:0 };
let waLastCommand = { key:'', at:0 };

function waResetContext(){
  waVoiceContext.sex = null;
  waVoiceContext.age = null;
  waVoiceContext.unit = null;
  waVoiceContext.updatedAt = 0;
}

function waContextFresh(){
  return waVoiceContext.updatedAt && (Date.now() - waVoiceContext.updatedAt) <= WA_CONTEXT_TTL;
}

function waNormalizeNatural(raw){
  let q = spokenNumbersToDigits(raw);
  q = q
    .replace(/\b(una|un|el|la|los|las)\b/g,' ')
    .replace(/\b(de|para|necesito|decime|dame|quiero|ver|consultar|consulta|buscame|buscar|mostrame|mostrar|cuanto|cuánto|mide|pesa|altura|peso|seria|sería|aproximadamente|referencia)\b/g,' ')
    .replace(/\b(anio|anios)\b/g,'años')
    .replace(/\b(mes)\b/g,'meses')
    .replace(/\b(nena|niña|chica|femenino|femenina)\b/g,'mujer')
    .replace(/\b(nene|niño|chico|masculino|masculina|hombre)\b/g,'varon')
    .replace(/\s+/g,' ')
    .trim();
  return q;
}

function waExtractEntities(raw){
  const q = waNormalizeNatural(raw);
  let sex = null;
  let age = null;
  let unit = null;

  if(/\bmujer\b/.test(q) || /(^|\s)m(?=\s|\d|$)/.test(q)) sex='m';
  if(/\bvaron\b/.test(q) || /(^|\s)v(?=\s|\d|$)/.test(q)) sex='v';

  if(/\bmes(es)?\b/.test(q)) unit='meses';
  if(/\baños?\b/.test(q)) unit='anios';

  const ageMatch = q.match(/\b(\d{1,2})\b/);
  if(ageMatch) age = Number(ageMatch[1]);

  return {sex,age,unit,raw:q};
}

function waMergeWithContext(entities){
  if(!waContextFresh()) waResetContext();
  if(entities.sex) waVoiceContext.sex=entities.sex;
  if(entities.age!==null) waVoiceContext.age=entities.age;
  if(entities.unit) waVoiceContext.unit=entities.unit;
  if(entities.sex || entities.age!==null || entities.unit) waVoiceContext.updatedAt=Date.now();

  return {
    sex: entities.sex || waVoiceContext.sex,
    age: entities.age!==null ? entities.age : waVoiceContext.age,
    unit: entities.unit || waVoiceContext.unit || 'anios'
  };
}

function waCommandKey(raw){
  const q = normalizeVoiceCommand(raw);
  const e = waExtractEntities(raw);
  const m = waMergeWithContext(e);
  if(m.sex && m.age!==null) return `mini:${m.sex}:${m.age}:${m.unit}`;
  if(q.includes('mora')) return 'mora';
  if(q.includes('scoring') || q.includes('reporte')) return 'scoring';
  if(q.includes('control') && q.includes('liquid')) return 'control-liquidaciones';
  if(q.includes('mi liquid') || q.includes('comision')) return 'mi-liquidacion';
  return q;
}

function waIsDuplicate(raw){
  const key = waCommandKey(raw);
  const now = Date.now();
  if(key && waLastCommand.key===key && (now-waLastCommand.at)<WA_DUPLICATE_TTL) return true;
  waLastCommand={key,at:now};
  return false;
}

extractMiniHubQuery = function(raw){
  const merged = waMergeWithContext(waExtractEntities(raw));
  if(!merged.sex || merged.age===null) return null;
  if(merged.unit==='meses' && (merged.age<1 || merged.age>11)) return null;
  if(merged.unit==='anios' && (merged.age<1 || merged.age>18)) return null;
  return merged;
};

isCompleteVoiceCommand = function(raw){
  const q=normalizeVoiceCommand(raw);
  const merged=waMergeWithContext(waExtractEntities(raw));
  if(merged.sex && merged.age!==null) return true;
  if(q.includes('mora')) return true;
  if(q.includes('scoring') || q.includes('reporte')) return true;
  if(q.includes('control') && q.includes('liquid')) return true;
  if(q.includes('mi liquid') || q.includes('comision')) return true;
  return false;
};

const waOriginalRunCommand = runCommand;
runCommand = function(value=null,fromVoice=false){
  const raw=String(value!==null?value:commandInput.value).trim();
  const q=normalizeVoiceCommand(raw);
  if(value!==null) commandInput.value=raw;
  if(!q){ feedback('Escribí o decí un comando.',true,'No escuché ningún comando.'); return; }

  if(fromVoice && waIsDuplicate(raw)) return;

  const entities=waExtractEntities(raw);
  const merged=waMergeWithContext(entities);

  if(merged.sex && merged.age!==null){
    const mini=extractMiniHubQuery(raw);
    if(mini){ waResetContext(); answerMiniHub(mini); return; }
  }

  const hasMiniEntity=!!entities.sex || entities.age!==null || !!entities.unit;
  if(fromVoice && hasMiniEntity){
    if(!merged.sex){
      commandFeedback.textContent='Tengo la edad. Decime mujer o varón.';
      commandFeedback.classList.remove('error');
      return;
    }
    if(merged.age===null){
      commandFeedback.textContent='Tengo el sexo. Decime la edad.';
      commandFeedback.classList.remove('error');
      return;
    }
  }

  waResetContext();
  return waOriginalRunCommand(value,fromVoice);
};

// Respuestas mas cortas para que se sienta inmediato.
const waOriginalAnswerMiniHub = answerMiniHub;
answerMiniHub = function(mini){
  const row=(mini.unit==='meses'?MINI_DATA.meses:MINI_DATA.anios)[mini.age];
  if(!row) return feedback('No tengo datos para esa edad.',true,'No tengo datos para esa edad.');
  const [altura,peso]=row[mini.sex];
  const sexo=mini.sex==='m'?'Mujer':'Varón';
  const edadTxt=mini.unit==='meses'?`${mini.age} ${mini.age===1?'mes':'meses'}`:`${mini.age} ${mini.age===1?'año':'años'}`;
  commandFeedback.textContent=`${sexo} · ${edadTxt} → ${altura} cm · ${peso} kg`;
  commandFeedback.classList.remove('error');
  speak(`${altura} centímetros, ${peso} kilos.`);
};

// Escucha optimizada: completo sale casi instantaneo; incompleto deja margen para continuar.
if(typeof recognition!=='undefined' && recognition){
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
      scheduleFinish(isCompleteVoiceCommand(heard)?45:650);
    }
  };

  recognition.onspeechend=()=>{
    const heard=fullTranscript();
    scheduleFinish(isCompleteVoiceCommand(heard)?40:550);
  };
}
