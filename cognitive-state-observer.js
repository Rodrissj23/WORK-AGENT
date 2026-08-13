// ZERO Cognitive State Observer v0.1
// Observa la pila conversacional existente y mantiene estado funcional sin reemplazar sus decisiones.
(function(){
  'use strict';
  const VERSION='0.1.0';

  function normalize(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();}
  function setPhase(phase,reason,detail={}){try{return window.ZERO_STATE?.transition?.(phase,reason,detail)}catch(e){return null}}
  function setExpectation(kind,detail={}){try{return window.ZERO_STATE?.expect?.(kind,detail)}catch(e){return null}}
  function clearExpectation(reason){try{return window.ZERO_STATE?.clearExpectation?.(reason)}catch(e){return null}}
  function clarificationActive(){try{return !!window.ZERO_CLARIFIER?.session?.active?.()}catch(e){return false}}
  function startupWaiting(){try{return !!window.ZERO_STARTUP?.waiting?.()}catch(e){return false}}
  function isStateQuestion(raw){
    const q=normalize(raw);
    return /\b(que estas haciendo|en que estas|que esperas de mi|que estas esperando|en que estado estas|estado mental)\b/.test(q);
  }
  function answerState(){
    const message=window.ZERO_STATE?.human?.()||'Estoy listo para recibir un comando.';
    setPhase('speaking','state_explanation');
    try{commandFeedback.textContent=message;commandFeedback.classList.remove('error')}catch(e){}
    try{if(typeof speak==='function')speak(message)}catch(e){}
    try{window.ZERO_BRAIN?.remember?.({type:'metacontrol',event:'state_explained',message})}catch(e){}
    setTimeout(()=>{
      if(clarificationActive())setPhase('clarifying','resume_pending_clarification');
      else setPhase('idle','state_explanation_finished');
    },100);
  }

  const previousRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(previousRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      setPhase('interpreting','turn_received',{source:fromVoice?'voice':'text'});

      if(isStateQuestion(raw)){answerState();return;}

      if(startupWaiting()&&fromVoice){
        setExpectation('startup_answer');
        setPhase('delegating','startup_context');
        const result=previousRun(value,fromVoice);
        clearExpectation('startup_turn_consumed');
        setPhase('idle','startup_turn_finished');
        return result;
      }

      const hadClarification=clarificationActive();
      if(hadClarification){
        const session=window.ZERO_CLARIFIER?.session?.snapshot?.();
        setExpectation('clarification',{question:session?.clarification?.question||null,step:session?.clarification?.step||null});
        setPhase('clarifying','pending_clarification');
      }else{
        setPhase('planning','router_preflight');
      }

      const result=previousRun(value,fromVoice);

      setTimeout(()=>{
        if(clarificationActive()){
          const session=window.ZERO_CLARIFIER?.session?.snapshot?.();
          setExpectation('clarification',{question:session?.clarification?.question||null,step:session?.clarification?.step||null});
          setPhase('clarifying','waiting_clarification');
        }else{
          clearExpectation(hadClarification?'clarification_resolved_or_superseded':'turn_complete');
          setPhase('idle','turn_complete');
        }
      },0);
      return result;
    };
  }

  // Recupera una aclaracion persistida tras recarga.
  if(clarificationActive()){
    const session=window.ZERO_CLARIFIER?.session?.snapshot?.();
    setExpectation('clarification',{question:session?.clarification?.question||null,step:session?.clarification?.step||null});
    setPhase('clarifying','restored_clarification');
  }else{
    setPhase('idle','observer_ready');
  }

  window.ZERO_STATE_OBSERVER={version:VERSION,isStateQuestion};
})();
