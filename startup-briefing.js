// ZERO startup-briefing v1
// Pregunta al iniciar si Rodrigo quiere escuchar el estado operativo.
(function(){
  let asked=false;
  let waitingAnswerUntil=0;
  const ANSWER_MS=8000;

  function normalize(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();}

  function ask(){
    if(asked)return;
    asked=true;
    waitingAnswerUntil=Date.now()+ANSWER_MS;
    const text='Hola, Rodrigo. ¿Querés que te cuente cómo estamos?';
    try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}
    try{speak(text)}catch(e){}
  }

  function waiting(){return Date.now()<waitingAnswerUntil;}

  function isYes(q){return /^(si|sí|dale|bueno|ok|okay|contame|decime|a ver|manda|mandale|quiero|si dale)$/.test(q)||/\b(contame|decime|dale|si)\b/.test(q)}
  function isNo(q){return /^(no|ahora no|despues|después|mas tarde|más tarde|no gracias)$/.test(q)}

  const prevRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(prevRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=normalize(raw);
      if(waiting()&&fromVoice){
        waitingAnswerUntil=0;
        if(isYes(q)){
          if(window.WA_STATUS?.briefing)return window.WA_STATUS.briefing();
          try{speak('Todavía no tengo el briefing conectado.')}catch(e){}
          return;
        }
        if(isNo(q)){
          try{commandFeedback.textContent='Perfecto. Quedo atento.';commandFeedback.classList.remove('error');speak('Perfecto. Quedo atento.')}catch(e){}
          return;
        }
      }
      return prevRun(value,fromVoice);
    };
  }

  // Esperamos a que carguen las voces y la UI.
  window.addEventListener('load',()=>setTimeout(ask,1200),{once:true});

  window.ZERO_STARTUP={version:'1.0',ask,waiting};
})();
