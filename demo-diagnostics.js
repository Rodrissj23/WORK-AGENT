// ZERO Demo Diagnostics v1.1
// Diagnostico real de disponibilidad + accesos rapidos para una demo robusta.
(function(){
  'use strict';

  const VERSION='1.1.0';
  const CORE='http://127.0.0.1:8765';

  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/^\s*zero\b\s*/,'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function fetchJson(url,timeout=1600){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
    try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json()}finally{clearTimeout(t)}
  }

  function ageMinutes(value){
    const d=new Date(value||'');
    if(Number.isNaN(d.getTime()))return null;
    return Math.max(0,(Date.now()-d.getTime())/60000);
  }

  function accessCheck(){
    const r=window.ZERO_ACCESS?.registry||{};
    const required=['prevencion','ventas-prevencion','ceibo'];
    const ready=required.filter(id=>!!r[id]?.url);
    return {ok:ready.length===required.length,count:ready.length,total:required.length,missing:required.filter(id=>!r[id]?.url)};
  }

  async function collect(){
    let health=null,systems=null;
    try{health=await fetchJson(`${CORE}/health`)}catch(e){}
    try{
      if(window.WA_STATUS?.refresh)systems=await window.WA_STATUS.refresh();
      if(!systems){const raw=await fetchJson(`${CORE}/status`);systems=raw?.systems||raw||null}
    }catch(e){}

    const realCore=!!health?.ok&&(health?.core==='zero-local-core'||health?.engine==='faster-whisper');
    const access=accessCheck();
    const gmail=systems?.gmail||null;
    const gmailAge=ageMinutes(gmail?.ultima_ejecucion||gmail?.reported_at);
    const gmailFresh=!!gmail?.connected&&(gmailAge===null||gmailAge<=20);
    const mora=systems?.mora||null;
    const scoring=systems?.scoring||null;

    const checks=[
      {id:'core',label:'Nucleo local',ok:realCore,weight:18,detail:realCore?`${health.engine||'core'} · ${health.model||''}`.trim():(health?.ok?'hay otro servicio en el puerto':'sin respuesta')},
      {id:'voice',label:'Voz local',ok:!!window.WA_VOICE_PRO&&realCore,weight:12,detail:realCore?'Whisper disponible':(window.SpeechRecognition||window.webkitSpeechRecognition?'respaldo Chrome disponible':'sin motor confirmado')},
      {id:'memory',label:'Memoria',ok:realCore&&!!health?.persistent_memory,weight:10,detail:health?.persistent_memory?'SQLite activa':'no confirmada'},
      {id:'cognition',label:'Cognicion',ok:!!window.ZERO_CONVERSATION_V2,weight:15,detail:window.ZERO_CONVERSATION_V2?.version||'no cargada'},
      {id:'access',label:'Accesos de trabajo',ok:access.ok,weight:20,detail:`${access.count}/${access.total} configurados`},
      {id:'gmail',label:'Gmail laboral',ok:gmailFresh,weight:15,detail:gmail?.connected?(gmailFresh?'telemetria reciente':'telemetria desactualizada'):'sin telemetria'},
      {id:'mora',label:'Mora',ok:!!mora?.connected,weight:5,detail:mora?.connected?'reportando':'motor sin reporte'},
      {id:'scoring',label:'Scoring',ok:!!scoring?.connected,weight:5,detail:scoring?.connected?'reportando':'sin reporte local'}
    ];

    const total=checks.reduce((a,c)=>a+c.weight,0);
    const earned=checks.reduce((a,c)=>a+(c.ok?c.weight:0),0);
    const score=Math.round(earned/total*100);
    return {score,checks,health,systems,access,gmailAge,realCore};
  }

  function render(result){
    const box=document.querySelector('#command-feedback');
    if(!box)return;
    const rows=result.checks.map(c=>`<div class="zero-diag-row"><span>${c.ok?'●':'○'} ${esc(c.label)}</span><small>${esc(c.detail)}</small></div>`).join('');
    box.classList.remove('error');
    box.innerHTML=`<div class="zero-diag"><div class="zero-diag-head"><strong>ZERO · preparación de demo</strong><b>${result.score}%</b></div>${rows}</div>`;
    const good=result.checks.filter(c=>c.ok).length;
    const total=result.checks.length;
    const spoken=`Diagnóstico listo. ${good} de ${total} componentes están disponibles. Preparación estimada ${result.score} por ciento.`;
    try{if(typeof speak==='function')speak(spoken)}catch(e){}
    return result;
  }

  async function run(){
    const box=document.querySelector('#command-feedback');
    if(box){box.classList.remove('error');box.textContent='Revisando núcleo, voz, memoria, Gmail y accesos…'}
    return render(await collect());
  }

  function addStyles(){
    if(document.querySelector('#zero-demo-diagnostics-style'))return;
    const s=document.createElement('style');s.id='zero-demo-diagnostics-style';s.textContent=`
      .zero-demo-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .zero-demo-actions button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.045);color:inherit;border-radius:999px;padding:7px 11px;font:inherit;font-size:12px;cursor:pointer}
      .zero-demo-actions button:hover{background:rgba(255,255,255,.09)}
      .zero-diag{display:grid;gap:7px;text-align:left;width:100%}
      .zero-diag-head,.zero-diag-row{display:flex;align-items:center;justify-content:space-between;gap:16px}
      .zero-diag-head{padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.12)}
      .zero-diag-head b{font-family:'IBM Plex Mono',monospace}
      .zero-diag-row small{opacity:.7;text-align:right}
    `;document.head.appendChild(s);
  }

  function addShortcuts(){
    const hints=document.querySelector('.command-hints');
    if(!hints||document.querySelector('.zero-demo-actions'))return;
    const wrap=document.createElement('div');wrap.className='zero-demo-actions';
    const items=[
      ['Diagnóstico','diagnóstico'],
      ['Briefing','cómo estamos'],
      ['Rendir ventas','tengo que rendir ventas'],
      ['Mails prioritarios','tengo mails prioritarios'],
      ['Abrir Ceibo','abrir ceibo']
    ];
    items.forEach(([label,command])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{try{runCommand(command,false)}catch(e){}};wrap.appendChild(b)});
    hints.insertAdjacentElement('afterend',wrap);
  }

  const previous=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previous){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const q=norm(raw);
      if(/\b(diagnostico|diagnosticar|estado de zero|estado de cero|todo funciona|esta todo funcionando|preparacion de demo|chequeo general)\b/.test(q)){run();return}
      return previous(value,fromVoice);
    };
  }

  addStyles();addShortcuts();
  setTimeout(addShortcuts,500);
  window.ZERO_DIAGNOSTICS={version:VERSION,run,collect};
})();
