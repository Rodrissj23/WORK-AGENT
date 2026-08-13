// ZERO access-registry v1.7
// Registro de accesos por voz con URLs estables de trabajo.
(function(){
  const ACCESS={
    'puente-digital':{
      label:'Puente Digital',
      url:'https://puentedigital.prevencionsalud.com.ar/',
      aliases:['puente digital','puente','cobranzas','portal puente']
    },
    'ceibo':{
      label:'Ceibo',
      url:'https://autogestionpas.prevencionsalud.com.ar/',
      aliases:['ceibo','autogestion pas','autogestion prevencion']
    },
    'ventas-prevencion':{
      label:'Planilla de ventas Prevención',
      url:'https://docs.google.com/spreadsheets/d/1Hc1aBL-6q3mvFCVD1iSCCE5M_E2JHSgxNse5NTebW0k/edit?gid=319597991#gid=319597991',
      requiresWorkAccount:true,
      aliases:['planilla de ventas','ventas prevencion','planilla prevencion','ventas de prevencion','planilla de este mes']
    },
    'drive':{
      label:'Drive',
      url:'https://drive.google.com/',
      aliases:['drive','google drive','mis archivos']
    },
    'whatsapp-web':{
      label:'WhatsApp Web',
      url:'https://web.whatsapp.com/',
      aliases:['whatsapp','wpp','wpp web','whatsapp web']
    },
    'gmail':{
      label:'Gmail',
      url:'https://mail.google.com/',
      aliases:['gmail','mail','correo','correo laboral','mail laboral']
    },
    'prevencion':{
      label:'Prevención Salud',
      url:'https://puentedigital.prevencionsalud.com.ar/',
      aliases:['prevencion','prevencion salud','portal prevencion','rendir ventas','rendir','rendicion','tengo que rendir ventas','vamos a rendir']
    }
  };

  function normalize(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();
  }

  function matchAccess(raw){
    const q=normalize(raw);
    let best=null;
    Object.entries(ACCESS).forEach(([id,a])=>{
      a.aliases.forEach(alias=>{
        const n=normalize(alias);
        if(q===n||q.includes(n)){
          const score=n.length;
          if(!best||score>best.score)best={id,entry:a,score};
        }
      });
    });
    return best;
  }

  function exactAccess(raw){
    const q=normalize(raw);
    for(const [id,a] of Object.entries(ACCESS)){
      if(a.aliases.some(alias=>normalize(alias)===q))return{id,entry:a};
    }
    return null;
  }

  function openEntry(hit){
    if(!hit)return false;
    const a=hit.entry;
    if(!a.url){
      commandFeedback.textContent=`${a.label} está configurado, pero todavía falta cargar su enlace.`;
      commandFeedback.classList.remove('error');
      try{speak(`Todavía me falta guardar el enlace de ${a.label}.`)}catch(e){}
      return true;
    }
    window.open(a.url,'_blank','noopener,noreferrer');
    let message=`Listo, te abro ${a.label}.`;
    if(a.requiresWorkAccount)message+=` Acordate de usar la cuenta laboral.`;
    commandFeedback.textContent=message;
    commandFeedback.classList.remove('error');
    try{speak(`Listo, te abro ${a.label}.`)}catch(e){}
    return true;
  }

  function openAccess(raw){return openEntry(matchAccess(raw))}

  const previousRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(previousRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const normalized=normalize(raw);
      const openPattern=/^(zero\s+)?(abri|abrir|abre|abrime|abreme|quiero abrir|llevame a)\s+/;
      const explicitOpen=openPattern.test(normalized);
      const q=normalized.replace(openPattern,'');
      if(explicitOpen&&openAccess(q))return;
      const exact=exactAccess(q);
      if(exact&&openEntry(exact))return;
      return previousRun(value,fromVoice);
    };
  }

  window.ZERO_ACCESS={
    version:'1.7',
    registry:ACCESS,
    match:matchAccess,
    exact:exactAccess,
    open:openAccess,
    setUrl(id,url){if(ACCESS[id])ACCESS[id].url=String(url||'').trim();}
  };

  function loadScript(src,onDone){
    try{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      if(onDone){script.onload=onDone;script.onerror=onDone}
      document.head.appendChild(script);
    }catch(e){if(onDone)onDone()}
  }

  loadScript('gmail-ui-sync.js?v=20260813-1811');

  // Orden estable para demo: cognicion -> fallback de voz -> diagnostico.
  window.addEventListener('load',()=>{
    const loadSafety=()=>{
      loadScript('voice-fallback.js?v=20260813-1831',()=>{
        loadScript('demo-diagnostics.js?v=20260813-1845');
      });
    };
    if(!window.ZERO_CONVERSATION_V2){
      loadScript('cognitive-conversation-v2.js?v=20260813-1828',loadSafety);
    }else{
      loadSafety();
    }
  },{once:true});
})();
