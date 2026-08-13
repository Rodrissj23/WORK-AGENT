// ZERO Diagnostics v2.0
// Diagnostico real de demo + accesos de respaldo. No ejecuta acciones sensibles.
(function(){
  'use strict';

  const CORE='http://127.0.0.1:8765';
  const VERSION='2.0.0';

  function norm(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  }

  async function fetchJson(path,timeout=1500){
    const c=new AbortController();
    const timer=setTimeout(()=>c.abort(),timeout);
    try{
      const r=await fetch(`${CORE}${path}`,{signal:c.signal,cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      return await r.json();
    }catch(e){return null}
    finally{clearTimeout(timer)}
  }

  function accessConfigured(id){
    try{return !!window.ZERO_ACCESS?.registry?.[id]?.url}catch(e){return false}
  }

  function ageMinutes(value){
    const d=new Date(value||'');
    if(Number.isNaN(d.getTime()))return null;
    return Math.max(0,(Date.now()-d.getTime())/60000);
  }

  function gmailFresh(s){
    if(!s?.connected)return false;
    const age=ageMinutes(s.ultima_ejecucion||s.updated_at||s.reported_at);
    return age===null||age<=20;
  }

  function browserVoice(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)}

  function coreIsReal(health){
    return !!health?.ok&&(health?.core==='zero-local-core'||/whisper/i.test(String(health?.engine||'')));
  }

  async function collect(){
    const [health,status]=await Promise.all([fetchJson('/health'),fetchJson('/status')]);
    const systems=status?.systems||{};
    const realCore=coreIsReal(health);

    const checks=[
      {id:'core',label:'Núcleo local',weight:18,ok:realCore,detail:realCore?`${health.engine||'core'} ${health.model||''}`.trim():(health?.ok?'otro servicio usa el puerto':'sin respuesta')},
      {id:'voice',label:'Voz',weight:12,ok:realCore&&!!window.WA_VOICE_PRO,detail:realCore?'Whisper local listo':(browserVoice()?'respaldo Chrome disponible':'sin motor confirmado')},
      {id:'memory',label:'Memoria',weight:10,ok:realCore&&!!health?.persistent_memory,detail:health?.persistent_memory?'SQLite activa':'no confirmada'},
      {id:'cognition',label:'Cognición',weight:15,ok:!!window.ZERO_CONVERSATION_V2,detail:window.ZERO_CONVERSATION_V2?.version||'no cargada'},
      {id:'puente',label:'Puente Digital',weight:8,ok:accessConfigured('puente-digital')||accessConfigured('prevencion'),detail:'acceso estable'},
      {id:'ventas',label:'Ventas Prevención',weight:7,ok:accessConfigured('ventas-prevencion'),detail:'planilla configurada'},
      {id:'ceibo',label:'Ceibo',weight:5,ok:accessConfigured('ceibo'),detail:'acceso estable'},
      {id:'gmail',label:'Gmail laboral',weight:15,ok:gmailFresh(systems.gmail),detail:systems?.gmail?.connected?(gmailFresh(systems.gmail)?'telemetría reciente':'telemetría vieja'):'sin reporte'},
      {id:'mora',label:'Mora',weight:5,ok:!!systems?.mora?.connected,detail:systems?.mora?.connected?'reportando':'sin reporte local'},
      {id:'scoring',label:'Scoring',weight:5,ok:!!systems?.scoring?.connected,detail:systems?.scoring?.connected?'reportando':'sin reporte local'}
    ];

    const totalWeight=checks.reduce((n,c)=>n+c.weight,0);
    const earned=checks.reduce((n,c)=>n+(c.ok?c.weight:0),0);
    const score=Math.round(earned/totalWeight*100);
    return {score,checks,health,status,systems,realCore};
  }

  function render(result,{speakResult=true}={}){
    const box=document.querySelector('#command-feedback');
    if(box){
      box.classList.remove('error');
      box.innerHTML=`<div class="zero-diag-panel"><div class="zero-diag-title"><strong>ZERO · preparación de demo</strong><b>${result.score}%</b></div>${result.checks.map(c=>`<div class="zero-diag-row"><span>${c.ok?'●':'○'} ${c.label}</span><small>${c.detail}</small></div>`).join('')}</div>`;
    }

    const good=result.checks.filter(c=>c.ok).length;
    const spoken=`Diagnóstico listo. ${good} de ${result.checks.length} componentes disponibles. Preparación estimada ${result.score} por ciento.`;
    if(speakResult){try{if(typeof speak==='function')speak(spoken)}catch(e){}}

    const bar=document.querySelector('#statusbar');
    if(bar){
      const old=document.querySelector('#zero-diagnostic-badge');if(old)old.remove();
      const badge=document.createElement('span');badge.id='zero-diagnostic-badge';badge.innerHTML=`demo: <b>${result.score}%</b>`;bar.appendChild(badge);
    }
    return result;
  }

  async function run(options={}){
    const box=document.querySelector('#command-feedback');
    if(box){box.classList.remove('error');box.textContent='Revisando núcleo, voz, memoria, Gmail y accesos…'}
    return render(await collect(),options);
  }

  function installStyles(){
    if(document.querySelector('#zero-diagnostics-style'))return;
    const style=document.createElement('style');style.id='zero-diagnostics-style';style.textContent=`
      .zero-demo-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .zero-demo-actions button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.045);color:inherit;border-radius:999px;padding:7px 11px;font:inherit;font-size:12px;cursor:pointer}
      .zero-demo-actions button:hover{background:rgba(255,255,255,.09)}
      .zero-diag-panel{display:grid;gap:7px;width:100%;text-align:left}
      .zero-diag-title,.zero-diag-row{display:flex;justify-content:space-between;align-items:center;gap:18px}
      .zero-diag-title{padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.12)}
      .zero-diag-title b{font-family:'IBM Plex Mono',monospace}
      .zero-diag-row small{opacity:.68;text-align:right}
    `;document.head.appendChild(style);
  }

  function installShortcuts(){
    const hints=document.querySelector('.command-hints');
    if(!hints||document.querySelector('.zero-demo-actions'))return;
    const wrap=document.createElement('div');wrap.className='zero-demo-actions';
    [
      ['Diagnóstico','diagnóstico'],
      ['Briefing','cómo estamos'],
      ['Rendir ventas','tengo que rendir ventas'],
      ['Mails prioritarios','tengo mails prioritarios'],
      ['Ceibo','abrir ceibo']
    ].forEach(([label,command])=>{
      const b=document.createElement('button');b.type='button';b.textContent=label;
      b.onclick=()=>{try{runCommand(command,false)}catch(e){}};
      wrap.appendChild(b);
    });
    hints.insertAdjacentElement('afterend',wrap);
  }

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=norm(raw);
      if(/\b(diagnostico|diagnosticar|estado de zero|zero esta listo|esta todo listo|chequeo de zero|prueba de sistemas|chequeo general|preparacion de demo)\b/.test(q)){
        run();return;
      }
      return previous(value,fromVoice);
    };
  }

  installStyles();installShortcuts();setTimeout(installShortcuts,500);
  window.ZERO_DIAGNOSTICS={version:VERSION,run,collect};
})();
