// Work Agent Voice Brain v1
// Capa extra sobre app.js: parser por entidades + memoria contextual corta.

const WA_CONTEXT_TTL = 3200;
const waVoiceContext = {
  sex: null,
  age: null,
  unit: null,
  updatedAt: 0
};

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
    .replace(/\b(una|un)\b/g, ' ')
    .replace(/\b(de|para|necesito|decime|dame|quiero|ver|consultar|consulta|altura|peso|cuanto|cuánto|mide|pesa)\b/g, ' ')
    .replace(/\b(anio|anios)\b/g, 'años')
    .replace(/\b(mes)\b/g, 'meses')
    .replace(/\s+/g, ' ')
    .trim();
  return q;
}

function waExtractEntities(raw){
  const q = waNormalizeNatural(raw);
  let sex = null;
  let age = null;
  let unit = null;

  if(/\b(mujer|nena|nina|femenino|femenina|chica)\b/.test(q) || /(^|\s)m(?=\s|\d|$)/.test(q)) sex = 'm';
  if(/\b(varon|hombre|nene|nino|masculino|masculina|chico)\b/.test(q) || /(^|\s)v(?=\s|\d|$)/.test(q)) sex = 'v';

  if(/\bmes(es)?\b/.test(q)) unit = 'meses';
  if(/\baños?\b/.test(q)) unit = 'anios';

  const ageMatch = q.match(/\b(\d{1,2})\b/);
  if(ageMatch) age = Number(ageMatch[1]);

  return {sex, age, unit, raw:q};
}

function waMergeWithContext(entities){
  if(!waContextFresh()) waResetContext();

  if(entities.sex) waVoiceContext.sex = entities.sex;
  if(entities.age !== null) waVoiceContext.age = entities.age;
  if(entities.unit) waVoiceContext.unit = entities.unit;

  if(entities.sex || entities.age !== null || entities.unit){
    waVoiceContext.updatedAt = Date.now();
  }

  const sex = entities.sex || waVoiceContext.sex;
  const age = entities.age !== null ? entities.age : waVoiceContext.age;
  const unit = entities.unit || waVoiceContext.unit || 'anios';

  return {sex, age, unit};
}

extractMiniHubQuery = function(raw){
  const entities = waExtractEntities(raw);
  const merged = waMergeWithContext(entities);

  if(!merged.sex || merged.age === null) return null;
  if(merged.unit === 'meses' && (merged.age < 1 || merged.age > 11)) return null;
  if(merged.unit === 'anios' && (merged.age < 1 || merged.age > 18)) return null;

  return merged;
};

isCompleteVoiceCommand = function(raw){
  const q = normalizeVoiceCommand(raw);
  const entities = waExtractEntities(raw);
  const merged = waMergeWithContext(entities);

  if(merged.sex && merged.age !== null) return true;
  if(q.includes('mora')) return true;
  if(q.includes('scoring') || q.includes('reporte')) return true;
  if(q.includes('control') && q.includes('liquid')) return true;
  if(q.includes('mi liquid') || q.includes('comision')) return true;
  return false;
};

const waOriginalRunCommand = runCommand;
runCommand = function(value=null, fromVoice=false){
  const raw = String(value !== null ? value : commandInput.value).trim();
  const q = normalizeVoiceCommand(raw);

  if(value !== null) commandInput.value = raw;
  if(!q){
    feedback('Escribí o decí un comando.', true, 'No escuché ningún comando.');
    return;
  }

  const entities = waExtractEntities(raw);
  const merged = waMergeWithContext(entities);

  if(merged.sex && merged.age !== null){
    const mini = extractMiniHubQuery(raw);
    if(mini){
      waResetContext();
      answerMiniHub(mini);
      return;
    }
  }

  const hasAnyMiniEntity = !!entities.sex || entities.age !== null || !!entities.unit;
  if(fromVoice && hasAnyMiniEntity){
    if(!merged.sex){
      commandFeedback.textContent = 'Te escuché la edad. Falta el sexo.';
      commandFeedback.classList.remove('error');
      return;
    }
    if(merged.age === null){
      commandFeedback.textContent = 'Te escuché el sexo. Falta la edad.';
      commandFeedback.classList.remove('error');
      return;
    }
  }

  waResetContext();
  return waOriginalRunCommand(value, fromVoice);
};

// Afinamos la escucha: comandos completos salen casi instantáneos;
// frases incompletas esperan un poco más para permitir pausas naturales.
if(typeof recognition !== 'undefined' && recognition){
  recognition.onresult = e => {
    let newFinal = '';
    let newInterim = '';

    for(let i = e.resultIndex; i < e.results.length; i++){
      const text = e.results[i][0].transcript.trim();
      if(e.results[i].isFinal) newFinal += ` ${text}`;
      else newInterim += ` ${text}`;
    }

    if(newFinal){
      finalTranscript = `${finalTranscript} ${newFinal}`.replace(/\s+/g, ' ').trim();
    }

    interimTranscript = newInterim.trim();
    const heard = fullTranscript();

    if(heard){
      commandInput.value = heard;
      setVoiceState('listening', `Escuchando: “${heard}”`);
      scheduleFinish(isCompleteVoiceCommand(heard) ? 65 : 850);
    }
  };

  recognition.onspeechend = () => {
    const heard = fullTranscript();
    scheduleFinish(isCompleteVoiceCommand(heard) ? 55 : 700);
  };
}
