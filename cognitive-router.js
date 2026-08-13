// ZERO Cognitive Router v0.1
// Arbitra contextos conversacionales. No ejecuta planes.
(function(){
  'use strict';
  const VERSION='0.1.0';

  function text(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function speakBack(message){
    try{commandFeedback.textContent=message;commandFeedback.classList.remove('error')}catch(e){}
    try{if(typeof speak==='function')speak(message)}catch(e){}
  }
  function remember(event,detail={}){
    try{window.ZERO_BRAIN?.remember?.({type:'conversation_router',event,...detail})}catch(e){}
  }
  function startupWaiting(fromVoice){
    if(!fromVoice)return false;
    try{return !!window.ZERO_STARTUP?.waiting?.()}catch(e){return false;}
  }
  function clarificationActive(){
    try{return !!window.ZERO_CLARIFIER?.session?.active?.()}catch(e){return false;}
  }
  function answerClarification(raw){
    const result=window.ZERO_CLARIFIER?.session?.answer?.(raw);
    if(!result?.ok)return false;
    if(!result.completed){
      const question=result.question||'Necesito un dato mas para entenderlo bien.';
      speakBack(question);
      remember('clarification_continues',{question});
      return true;
    }
    const count=result.plan?.stepCount||result.plan?.steps?.length||0;
    const message=count>1
      ?`Listo, ahora entendi los ${count} pasos. Los deje preparados, pero no ejecute nada.`
      :'Listo, ahora entendi lo que querias. No ejecute nada.';
    speakBack(message);
    remember('clarification_resolved',{steps:count});
    return true;
  }
  function maybeAsk(raw){
    const inspection=window.ZERO_CLARIFIER?.inspect?.(raw);
    if(!inspection?.ok||!inspection.needsClarification||!inspection.first)return false;
    const stepCount=inspection.plan?.stepCount||inspection.plan?.steps?.length||0;
    if(stepCount<2&&inspection.first.reason!=='missing_parameters')return false;
    const started=window.ZERO_CLARIFIER?.session?.begin?.(raw,inspection);
    if(!started?.started)return false;
    speakBack(started.question);
    remember('clarification_started',{question:started.question,reason:inspection.first.reason});
    return true;
  }

  const previousRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(previousRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=text(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:''));
      if(startupWaiting(fromVoice))return previousRun(value,fromVoice);
      if(clarificationActive()&&answerClarification(raw))return;
      if(maybeAsk(raw))return;
      return previousRun(value,fromVoice);
    };
  }

  window.ZERO_ROUTER={version:VERSION,startupWaiting,clarificationActive};
})();
