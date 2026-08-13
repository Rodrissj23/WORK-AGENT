// ZERO access-registry v1
// Registro de accesos por voz. URLs faltantes se completan luego desde la oficina.
(function(){
  const ACCESS={
    'puente-digital':{
      label:'Puente Digital',
      url:'',
      aliases:['puente digital','puente','cobranzas','portal puente']
    },
    'ceibo':{
      label:'Ceibo',
      url:'',
      aliases:['ceibo']
    },
    'ventas-prevencion':{
      label:'Planilla de ventas Prevención',
      url:'',
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
      url:'',
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

  function openAccess(raw){
    const hit=matchAccess(raw);
    if(!hit)return false;
    const a=hit.entry;
    if(!a.url){
      commandFeedback.textContent=`${a.label} está configurado, pero todavía falta cargar su enlace.`;
      commandFeedback.classList.remove('error');
      try{speak(`Todavía me falta guardar el enlace de ${a.label}.`)}catch(e){}
      return true;
    }
    window.open(a.url,'_blank','noopener,noreferrer');
    commandFeedback.textContent=`Listo, te abro ${a.label}.`;
    commandFeedback.classList.remove('error');
    try{speak(`Listo, te abro ${a.label}.`)}catch(e){}
    return true;
  }

  const previousRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(previousRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=normalize(raw).replace(/^(zero\s+)?(abri|abrir|abre|abrime|abreme|quiero abrir|vamos a|llevame a)\s+/,'');
      if(openAccess(q))return;
      return previousRun(value,fromVoice);
    };
  }

  window.ZERO_ACCESS={
    version:'1.0',
    registry:ACCESS,
    match:matchAccess,
    open:openAccess,
    setUrl(id,url){if(ACCESS[id])ACCESS[id].url=String(url||'').trim();}
  };
})();
