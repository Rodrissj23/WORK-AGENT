// ZERO capabilities v1.0
(function(){
  'use strict';
  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  function answer(){
    const text='Hoy puedo entender comandos de trabajo en lenguaje natural, mantener contexto entre frases, consultar Mini Hub, abrir Puente Digital, Ceibo y tus herramientas de Prevención, darte un briefing operativo y leer el estado del Gmail laboral cuando el núcleo local está conectado. Mora y Scoring están integrados como sistemas y su ejecución automática se habilita de forma controlada cuando el motor local correspondiente está conectado.';
    try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}
    try{if(typeof speak==='function')speak(text)}catch(e){}
  }
  if(previous){window.runCommand=runCommand=function(value=null,fromVoice=false){const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();const q=norm(raw);if(/\b(que podes hacer|que sabes hacer|para que servis|que puede hacer zero|capacidades|funciones de zero)\b/.test(q)){answer();return}return previous(value,fromVoice)}}
  window.ZERO_CAPABILITIES={say:answer};
})();
