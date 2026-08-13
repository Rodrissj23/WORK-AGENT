// ZERO Action Guard v1.2
// Evita promesas o ejecuciones ambiguas para acciones sensibles durante la demo.
(function(){
  'use strict';

  let pending=null;

  function norm(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  }

  function say(text){
    try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}
    try{if(typeof speak==='function')speak(text)}catch(e){}
  }

  const yes=q=>/^(si|sii|dale|ok|okay|de una|abrilo|abri|abrime)$/.test(q);
  const no=q=>/^(no|nop|dejalo|cancelar|cancela|mejor no)$/.test(q);
  const runVerb=q=>/\b(ejecuta|ejecutar|corre|correr|actualiza|actualizar|procesa|procesar|lanza|lanzar)\b/.test(q);
  const mailMutation=q=>/\b(manda|mandar|envia|enviar|responde|responder|borra|borrar|elimina|eliminar|archiva|archivar|marca|marcar)\b/.test(q)&&/\b(mail|mails|correo|correos|gmail)\b/.test(q);

  function buildGuard(next){
    const guard=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=norm(raw);

      if(pending){
        if(no(q)){pending=null;say('Dale. No ejecuto nada.');return}
        if(yes(q)){
          const target=pending;pending=null;
          if(target==='mora'){
            say('Te abro Mora. La ejecución automática queda bloqueada hasta que el motor local esté conectado con confirmación.');
            return next('mora',fromVoice);
          }
          if(target==='scoring'){
            say('Te abro Scoring. La ejecución remota del Apps Script todavía no está habilitada desde ZERO.');
            return next('scoring',fromVoice);
          }
        }
      }

      if(mailMutation(q)){
        say('Gmail está conectado en modo solo lectura. En esta versión puedo consultar estado y prioridades, pero no envío, borro ni modifico correos.');return;
      }

      if(runVerb(q)&&/\bmora\b/.test(q)){
        pending='mora';
        say('La ejecución de Mora modifica la planilla, así que es una acción sensible. En esta demo todavía no la ejecuto desde el navegador. ¿Querés que abra Mora?');return;
      }

      if(runVerb(q)&&/\b(scoring|reporte)\b/.test(q)){
        pending='scoring';
        say('Scoring vive en Apps Script. Puedo consultar o abrir sus reportes, pero la ejecución remota todavía no está habilitada desde ZERO. ¿Querés que abra Scoring?');return;
      }

      return next(value,fromVoice);
    };
    guard.__zeroActionGuard=true;
    guard.__zeroNext=next;
    return guard;
  }

  function install(){
    const current=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
    if(!current||current.__zeroActionGuard)return;
    window.runCommand=runCommand=buildGuard(current);
  }

  window.ZERO_ACTION_GUARD={version:'1.2.0',pending:()=>pending,install};
  install();

  // Algunas capas se cargan después del evento load. Si aparece un wrapper nuevo,
  // agregamos un guard externo con referencia inmutable al wrapper anterior.
  window.addEventListener('load',()=>{
    setTimeout(install,900);
    setTimeout(install,2200);
  },{once:true});
})();
