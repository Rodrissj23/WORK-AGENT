// Work Agent conversation bridge v1
// Unifica la ventana conversacional entre voice-brain y manos libres.

(function(){
  const FOLLOW_MS = 10000;
  let activeUntil = 0;

  function arm(){
    activeUntil = Date.now() + FOLLOW_MS;
    try{
      if(typeof waHandsFreeArmedUntil !== 'undefined') waHandsFreeArmedUntil = activeUntil;
    }catch(e){}
    try{
      if(typeof waConversation !== 'undefined' && waConversation){
        waConversation.followUpUntil = activeUntil;
        waConversation.awaiting = true;
      }
    }catch(e){}
    return activeUntil;
  }

  function active(){
    return Date.now() < activeUntil;
  }

  window.WA_CONVERSATION = { arm, active, ms: FOLLOW_MS };

  // Si existe la función del manos libres, la hacemos usar esta ventana común.
  if(typeof waConversationActive === 'function'){
    waConversationActive = function(){ return active(); };
  }

  if(typeof waArmConversation === 'function'){
    waArmConversation = function(){
      arm();
      try{waFollowUpPending=false}catch(e){}
      return activeUntil;
    };
  }

  // Armamos la conversación cada vez que se ejecuta un comando válido por voz.
  const originalRun = window.runCommand || (typeof runCommand !== 'undefined' ? runCommand : null);
  if(originalRun){
    window.runCommand = runCommand = function(value=null, fromVoice=false){
      const result = originalRun(value, fromVoice);
      if(fromVoice){
        arm();
        setTimeout(()=>{
          try{
            if(window.WA_HANDSFREE?.active?.() && active()){
              setVoiceState('ready','Seguimos · podés hablar sin decir '+((typeof WA_LOCAL_VOICE!=='undefined'&&WA_LOCAL_VOICE.wakeWord)||'zero'));
            }
          }catch(e){}
        },250);
      }
      return result;
    };
  }

  // La función de manos libres se evalúa al llegar cada transcripción.
  if(typeof waHandleHandsFreeText === 'function'){
    const originalHandle = waHandleHandsFreeText;
    waHandleHandsFreeText = async function(text){
      // Sin wake word pero dentro de la ventana => follow-up directo.
      if(active()){
        const clean = typeof waCorrectStt==='function' ? waCorrectStt(text) : String(text||'').trim();
        if(clean){
          try{commandInput.value=clean}catch(e){}
          try{commandFeedback.textContent=`Continuación: “${clean}”`;commandFeedback.classList.remove('error')}catch(e){}
          arm();
          return runCommand(clean,true);
        }
      }
      const result = await originalHandle(text);
      return result;
    };
  }
})();
