// ZERO Diagnostics v1.0
(function(){
  'use strict';
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const say=text=>{try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}try{if(typeof speak==='function')speak(text)}catch(e){}};
  function access(id){return !!window.ZERO_ACCESS?.registry?.[id]?.url}
  async function run(){
    let systems=null;
    try{systems=window.WA_STATUS?.refresh?await window.WA_STATUS.refresh():null}catch(e){}
    const checks=[
      ['interfaz',true],
      ['voz local',!!window.WA_LOCAL_VOICE||!!window.WA_VOICE_LOCAL||!!window.WA_HANDSFREE],
      ['memoria',!!window.ZERO_MEMORY],
      ['cognición',!!window.ZERO_CONVERSATION_V2||!!window.ZERO_BRAIN],
      ['Puente Digital',access('puente-digital')],
      ['Ceibo',access('ceibo')],
      ['Ventas Prevención',access('ventas-prevencion')],
      ['Gmail laboral',systems?.gmail?.connected===true]
    ];
    const ok=checks.filter(x=>x[1]).length;
    const missing=checks.filter(x=>!x[1]).map(x=>x[0]);
    const text=missing.length?`Diagnóstico: ${ok} de ${checks.length} componentes listos. Falta confirmar ${missing.join(', ')}.`:`Diagnóstico: ${checks.length} de ${checks.length} componentes listos.`;
    say(text);
    try{console.table(checks.map(([componente,listo])=>({componente,listo})))}catch(e){}
    return checks;
  }
  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){window.runCommand=runCommand=function(value=null,fromVoice=false){const raw=String(value!==null?value:commandInput.value).trim(),q=norm(raw);if(/^(diagnostico|diagnostico de zero|estado de zero|chequeo de zero|probar sistema)$/.test(q)){run();return}return previous(value,fromVoice)}}
  window.ZERO_DIAGNOSTICS={version:'1.0.0',run};
})();
