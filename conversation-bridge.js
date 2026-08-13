// Work Agent conversation bridge v3
// Ventana conversacional unica + contexto Mini Hub independiente.

(function(){
  const FOLLOW_MS = 6000;
  const MAX_FOLLOWUPS = 4;
  let activeUntil = 0;
  let lastMini = null;
  let followCount = 0;
  let closeTimer = null;

  function clearCloseTimer(){
    if(closeTimer){clearTimeout(closeTimer);closeTimer=null;}
  }

  function sayAttention(){
    try{
      setVoiceState('ready','Quedo atento · decí Zero cuando me necesites');
      if(typeof speak==='function') speak('Quedo atento.');
    }catch(e){}
  }

  function closeConversation(announce=true){
    activeUntil=0;
    followCount=0;
    clearCloseTimer();
    try{if(typeof waHandsFreeArmedUntil!=='undefined')waHandsFreeArmedUntil=0}catch(e){}
    try{
      if(typeof waConversation!=='undefined'&&waConversation){
        waConversation.followUpUntil=0;
        waConversation.awaiting=false;
      }
    }catch(e){}
    if(announce) sayAttention();
  }

  function scheduleClose(){
    clearCloseTimer();
    closeTimer=setTimeout(()=>{
      if(Date.now()>=activeUntil)closeConversation(true);
    },FOLLOW_MS+80);
  }

  function arm(resetCount=false){
    if(resetCount)followCount=0;
    activeUntil=Date.now()+FOLLOW_MS;
    try{if(typeof waHandsFreeArmedUntil!=='undefined')waHandsFreeArmedUntil=activeUntil}catch(e){}
    try{
      if(typeof waConversation!=='undefined'&&waConversation){
        waConversation.followUpUntil=activeUntil;
        waConversation.awaiting=true;
      }
    }catch(e){}
    scheduleClose();
    return activeUntil;
  }

  function active(){return Date.now()<activeUntil;}

  function norm(text){
    return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();
  }

  function spokenNum(text){
    try{if(typeof spokenNumbersToDigits==='function')return spokenNumbersToDigits(text)}catch(e){}
    return text;
  }

  function explicitEntities(text){
    const q=norm(spokenNum(text));
    let sex=null,age=null,unit=null;
    if(/\b(mujer|nena|nina|femenina|femenino)\b/.test(q))sex='m';
    if(/\b(varon|hombre|nene|nino|masculino|masculina)\b/.test(q))sex='v';
    if(/\bmes(es)?\b/.test(q))unit='meses';
    if(/\b(ano|anos)\b/.test(q))unit='anios';
    const m=q.match(/\b(\d{1,2})\b/);if(m)age=Number(m[1]);
    return{sex,age,unit};
  }

  function canonicalFollowUp(text){
    if(!lastMini)return null;
    const e=explicitEntities(text);
    if(!e.sex&&e.age===null&&!e.unit)return null;
    const merged={sex:e.sex||lastMini.sex,age:e.age!==null?e.age:lastMini.age,unit:e.unit||lastMini.unit};
    if(!merged.sex||merged.age===null)return null;
    if(merged.unit==='meses'&&(merged.age<1||merged.age>11))return null;
    if(merged.unit==='anios'&&(merged.age<1||merged.age>18))return null;
    return{text:`${merged.sex==='m'?'mujer':'varon'} ${merged.age} ${merged.unit==='meses'?'meses':'anos'}`,mini:merged};
  }

  window.WA_CONVERSATION={arm,active,close:closeConversation,ms:FOLLOW_MS,maxFollowUps:MAX_FOLLOWUPS,lastMini:()=>lastMini?{...lastMini}:null};

  if(typeof answerMiniHub==='function'){
    const originalAnswerMiniHub=answerMiniHub;
    answerMiniHub=function(mini){
      if(mini&&mini.sex&&mini.age!==null&&mini.unit){lastMini={sex:mini.sex,age:mini.age,unit:mini.unit};arm(false)}
      return originalAnswerMiniHub(mini);
    };
  }

  if(typeof waConversationActive==='function')waConversationActive=function(){return active()};
  if(typeof waArmConversation==='function')waArmConversation=function(){arm(false);try{waFollowUpPending=false}catch(e){}return activeUntil};

  const originalRun=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(originalRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      let finalValue=value;
      const wasActive=active();
      if(fromVoice&&!wasActive)arm(true);

      if(fromVoice&&wasActive&&lastMini){
        if(followCount>=MAX_FOLLOWUPS){closeConversation(true);return;}
        const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
        const resolved=canonicalFollowUp(raw);
        if(resolved){
          followCount++;
          finalValue=resolved.text;
          try{commandInput.value=raw;commandFeedback.textContent=`Continuación ${followCount}/${MAX_FOLLOWUPS}: “${raw}” → ${resolved.text}`;commandFeedback.classList.remove('error')}catch(e){}
        }
      }

      const result=originalRun(finalValue,fromVoice);
      if(fromVoice&&followCount<MAX_FOLLOWUPS){
        arm(false);
        setTimeout(()=>{try{if(window.WA_HANDSFREE?.active?.()&&active())setVoiceState('ready','Seguimos · podés hablar sin decir '+((typeof WA_LOCAL_VOICE!=='undefined'&&WA_LOCAL_VOICE.wakeWord)||'zero'))}catch(e){}},250);
      }
      return result;
    };
  }

  if(typeof waHandleHandsFreeText==='function'){
    const originalHandle=waHandleHandsFreeText;
    waHandleHandsFreeText=async function(text){
      if(active()){
        if(followCount>=MAX_FOLLOWUPS){closeConversation(true);return;}
        const clean=typeof waCorrectStt==='function'?waCorrectStt(text):String(text||'').trim();
        if(clean)return runCommand(clean,true);
      }
      return await originalHandle(text);
    };
  }
})();
