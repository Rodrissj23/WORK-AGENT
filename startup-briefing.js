// ZERO startup-briefing v2
// La pregunta inicial espera a que manos libres esté activo antes de abrir la ventana de respuesta.
(function(){
  let asked=false;
  let pendingAsk=true;
  let waitingAnswerUntil=0;
  const ANSWER_MS=10000;

  function normalize(v){
    return String(v||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[¿?¡!.,;:]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function handsFreeOn(){
    try{return !!window.WA_HANDSFREE?.active?.()}catch(e){return false}
  }

  function greetingOnly(){
    if(asked)return;
    const h=new Date().getHours();
    const saludo=h<12?'Buen día':h<19?'Buenas tardes':'Buenas noches';
    const text=`${saludo}, Rodrigo.`;
    try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}
    try{speak(text)}catch(e){}
  }

  function ask(){
    if(asked||!pendingAsk)return false;
    if(!handsFreeOn())return false;
    asked=true;
    pendingAsk=false;
    waitingAnswerUntil=Date.now()+ANSWER_MS;
    const text='¿Querés que te cuente cómo estamos?';
    try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}
    try{speak(text)}catch(e){}
    try{window.WA_CONVERSATION?.arm?.()}catch(e){}
    return true;
  }

  function waiting(){return Date.now()<waitingAnswerUntil;}

  function isYes(q){
    return /^(si|dale|bueno|ok|okay|contame|decime|a ver|manda|mandale|quiero|si dale)$/.test(q)
      || /\b(contame|decime|dale|si)\b/.test(q);
  }

  function isNo(q){
    return /^(no|ahora no|despues|mas tarde|no gracias)$/.test(q);
  }

  const prevRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(prevRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=normalize(raw);

      if(waiting()&&fromVoice){
        if(isYes(q)){
          waitingAnswerUntil=0;
          if(window.WA_STATUS?.briefing)return window.WA_STATUS.briefing();
          try{speak('Todavía no tengo el briefing conectado.')}catch(e){}
          return;
        }
        if(isNo(q)){
          waitingAnswerUntil=0;
          try{
            commandFeedback.textContent='Perfecto. Quedo atento.';
            commandFeedback.classList.remove('error');
            speak('Perfecto. Quedo atento.');
          }catch(e){}
          return;
        }
        // Si respondió otra cosa, dejamos de tratarla como respuesta binaria
        // y la procesamos como comando normal.
        waitingAnswerUntil=0;
      }

      return prevRun(value,fromVoice);
    };
  }

  // Enganchamos el toggle de manos libres para preguntar justo después de activarlo.
  const hf=document.querySelector('#handsfree-toggle');
  if(hf){
    hf.addEventListener('click',()=>{
      setTimeout(()=>{
        if(pendingAsk&&handsFreeOn())ask();
      },250);
    });
  }

  // Al cargar solo saludamos. La pregunta queda pendiente hasta que haya manos libres.
  window.addEventListener('load',()=>setTimeout(greetingOnly,900),{once:true});

  window.ZERO_STARTUP={
    version:'2.0',
    ask,
    waiting,
    pending:()=>pendingAsk,
    greeting:greetingOnly
  };
})();
