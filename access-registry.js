// ZERO access-registry v1.1
// Registro de accesos por voz. Algunos portales usan URLs temporales de login; se marcan como provisionales.
(function(){
  const ACCESS={
    'puente-digital':{
      label:'Puente Digital',
      url:'https://login.gruposancorseguros.com.ar/u/login/identifier?state=hKFo2SB5MnNXd0NLNUR5emtBVTAxUk9iQTNDNXFCMHdtelpHNaFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIDU5Qjc3TjZzRlBPSWF2T252Z1hBd0o2ZXdybmlweTROo2NpZNkgN3lkNmljWGFZbGZWNjVOR3BrTnNWT1poTkZETllnb1k',
      provisional:true,
      aliases:['puente digital','puente','cobranzas','portal puente']
    },
    'ceibo':{
      label:'Ceibo',
      url:'https://login.gruposancorseguros.com.ar/u/login/identifier?state=hKFo2SBoOGNuMTFsWl9WdDd4azYxZ1FEQkd1STE3UXpKX05MeKFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIFo0T0diU2VVeTJacF85VWFxSF8yT3pjdjFrdEY4a0cyo2NpZNkgRVNPZEsxWlFOSHB0UDlvdTFUaWxjTkFnVUFMYkdSdnc',
      provisional:true,
      aliases:['ceibo']
    },
    'ventas-prevencion':{
      label:'Planilla de ventas Prevención',
      url:'https://docs.google.com/spreadsheets/d/1Hc1aBL-6q3mvFCVD1iSCCE5M_E2JHSgxNse5NTebW0k/edit?gid=1207104348#gid=1207104348&fvid=1468673717',
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
    let message=`Listo, te abro ${a.label}.`;
    if(a.requiresWorkAccount)message+=` Acordate de usar la cuenta laboral.`;
    if(a.provisional)message+=` Este acceso usa una URL temporal de login y puede caducar.`;
    commandFeedback.textContent=message;
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
    version:'1.1',
    registry:ACCESS,
    match:matchAccess,
    open:openAccess,
    setUrl(id,url){if(ACCESS[id])ACCESS[id].url=String(url||'').trim();}
  };
})();
