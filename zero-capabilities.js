// ZERO capabilities v1.3
(function(){
  'use strict';
  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const say=text=>{try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(text)}catch(e){}};

  function answer(){
    say('Hoy puedo entender comandos de trabajo en lenguaje natural, mantener contexto entre frases, consultar Mini Hub, abrir Puente Digital, Ceibo y tus herramientas de Prevención, darte un briefing operativo y leer el estado del Gmail laboral cuando el núcleo local está conectado. Mora y Scoring están integrados como sistemas y su ejecución automática se habilita de forma controlada cuando el motor local correspondiente está conectado.');
  }

  function demoMode(){
    try{window.ZERO_CONVERSATION_V2?.clear?.()}catch(e){}
    try{localStorage.removeItem('zero:demo:context')}catch(e){}
    try{if('speechSynthesis'in window)window.speechSynthesis.cancel()}catch(e){}
    say('Modo demo listo. Limpié el contexto de esta sesión y dejé intacta la memoria persistente.');
  }

  if(previous){window.runCommand=runCommand=function(value=null,fromVoice=false){
    const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
    const q=norm(raw);
    if(/\b(que podes hacer|que sabes hacer|para que servis|que puede hacer zero|capacidades|funciones de zero)\b/.test(q)){answer();return}
    if(/^(modo demo|iniciar demo|preparar demo|reiniciar contexto)$/.test(q)){demoMode();return}
    return previous(value,fromVoice)
  }}
  window.ZERO_CAPABILITIES={say:answer,demoMode};
})();
