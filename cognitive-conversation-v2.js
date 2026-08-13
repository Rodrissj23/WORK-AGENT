// ZERO Conversational Cognition v2.2
// Comprension semantica + memoria de trabajo + razonamiento conversacional.
// Se carga ULTIMO: no reemplaza las herramientas existentes; decide cuando delegar,
// cuando resolver contexto y cuando pedir una aclaracion.
(function(){
  'use strict';

  const VERSION='2.2.0';
  const KEY='zero:conversation:v2';
  const MAX_TURNS=40;
  const MAX_GOALS=12;
  const CONTEXT_TTL=30*60*1000;

  function fresh(){
    return {
      topic:null,
      lastIntent:null,
      lastTarget:null,
      entities:{},
      activeGoal:null,
      pending:null,
      lastPlan:null,
      turns:[],
      goals:[],
      updatedAt:Date.now()
    };
  }

  let state=fresh();

  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!saved||typeof saved!=='object')return;
      const old=Date.now()-Number(saved.updatedAt||0)>CONTEXT_TTL;
      if(old){
        state.goals=Array.isArray(saved.goals)?saved.goals.slice(-MAX_GOALS):[];
        return;
      }
      state={...fresh(),...saved};
      state.turns=Array.isArray(saved.turns)?saved.turns.slice(-MAX_TURNS):[];
      state.goals=Array.isArray(saved.goals)?saved.goals.slice(-MAX_GOALS):[];
    }catch(e){}
  }

  function save(){
    state.updatedAt=Date.now();
    state.turns=(state.turns||[]).slice(-MAX_TURNS);
    state.goals=(state.goals||[]).slice(-MAX_GOALS);
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
  }

  function normalize(raw){
    let s=String(raw||'').trim();
    try{if(window.WA_VOICE_TOLERANCE?.fixCommand)s=window.WA_VOICE_TOLERANCE.fixCommand(s)}catch(e){}
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\bmiliquidacion\b/g,'mi liquidacion')
      .replace(/\bmiliquiacion\b/g,'mi liquidacion')
      .replace(/^\s*zero\b[,:;.!?\s-]*/,'')
      .replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();
  }

  function rememberTurn(role,text,meta={}){
    state.turns.push({at:Date.now(),role,text:String(text||''),...meta});
    save();
  }

  function base(raw){
    try{return window.ZERO_BRAIN?.classify?.(raw)||null}catch(e){return null}
  }

  function editDistance(a,b){
    a=String(a||'');b=String(b||'');
    const prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let left=i,diag=i-1;
      for(let j=1;j<=b.length;j++){
        const up=prev[j],cost=a[i-1]===b[j-1]?0:1;
        const val=Math.min(up+1,left+1,diag+cost);
        diag=up;prev[j]=val;left=val;
      }
    }
    return prev[b.length];
  }

  const CONCEPTS={
    sales:{topic:'sales',terms:{venta:2,ventas:2,rendir:2,rendicion:2,prevencion:.7,preafiliacion:1.5,aprobada:1.2,aprobadas:1.2}},
    mora:{topic:'mora',terms:{mora:2,deuda:1.5,deudas:1.5,impaga:1.4,impagas:1.4,cobranzas:1.4,cuota:.7,cuotas:.7}},
    gmail:{topic:'gmail',terms:{gmail:2,mail:2,mails:2,correo:2,correos:2,email:2,emails:2}},
    scoring:{topic:'scoring',terms:{scoring:2,reporte:1,reportes:1,broker:.6}},
    liquidation:{topic:'liquidaciones',terms:{liquidacion:2,liquidaciones:2,comision:1.8,comisiones:1.8}},
    sheet:{topic:'sheet',terms:{planilla:2,sheet:2,spreadsheet:2,excel:1.5}},
    drive:{topic:'drive',terms:{drive:2,archivo:.7,archivos:.7,carpeta:.7,carpetas:.7}}
  };

  function scoreConcepts(raw){
    const ts=normalize(raw).split(' ').filter(Boolean);
    const out={};
    for(const [id,c] of Object.entries(CONCEPTS)){
      let score=0;
      for(const token of ts){
        for(const [term,weight] of Object.entries(c.terms)){
          if(token===term){score+=weight;break}
          if(token.length>=6&&term.length>=6&&Math.abs(token.length-term.length)<=1&&editDistance(token,term)<=1){
            score+=weight*.65;break;
          }
        }
      }
      if(score>0)out[id]=score;
    }
    return out;
  }

  function bestConcept(scores){
    return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  }

  function continuation(q){
    return /^(y\b|tambien\b|ademas\b|despues\b|luego\b|ahora\b)|\b(y tambien|y despues|despues de eso|lo mismo)\b/.test(q);
  }
  function isYes(q){return /^(si|sii|dale|ok|okay|bueno|de una|hacelo|hace eso|mandale|perfecto|claro)$/.test(q)}
  function isNo(q){return /^(no|nop|mejor no|dejalo|cancelar|cancela|olvidalo)$/.test(q)}
  function actionOf(q){
    if(/\b(abri|abrir|abre|abrime|abreme|mostrame|mostrar|llevame)\b/.test(q))return'open';
    if(/\b(actualiza|actualizar|ejecuta|ejecutar|corre|correr|procesa|procesar)\b/.test(q))return'run';
    if(/\b(revisa|revisar|mira|mirar|chequea|chequear|ver|lee|leer|busca|buscar)\b/.test(q))return'review';
    if(/\b(necesito|tengo que|debo|quiero|hay que|vamos a)\b/.test(q))return'goal';
    return null;
  }
  function temporalOf(q){
    if(/\bmanana\b/.test(q))return'tomorrow';
    if(/\bhoy\b/.test(q))return'today';
    if(/\bdespues\b|\bluego\b/.test(q))return'later';
    return null;
  }

  function interpret(raw){
    const q=normalize(raw);
    const b=base(raw)||{intent:'unknown',confidence:.18,ambiguous:true,candidates:[]};
    const scores=scoreConcepts(raw);
    const concept=bestConcept(scores);
    const action=actionOf(q);
    const temporal=temporalOf(q);
    const cont=continuation(q);
    const result={
      raw:String(raw||''),q,base:b,scores,concept,action,temporal,continuation:cont,
      intent:b.intent||'unknown',confidence:Number(b.confidence||0),ambiguous:!!b.ambiguous,
      target:b.target||null,topic:null,contextual:false,reason:'base'
    };

    const clearBase=b.intent!=='unknown'&&b.confidence>=.90&&!b.ambiguous;
    if(clearBase){
      const topics={mini_hub:'mini_hub',briefing:'operation',mora:'mora',scoring:'scoring',mi_liquidacion:'liquidaciones',control_liquidaciones:'liquidaciones'};
      result.topic=b.intent==='open_access'?(b.target||concept):(topics[b.intent]||concept);
      return result;
    }

    if(scores.sheet){
      if(scores.sales||state.topic==='sales'||state.lastTarget==='ventas-prevencion'){
        result.intent='open_access';result.target='ventas-prevencion';result.topic='sales';
        result.confidence=scores.sales?.91:.86;result.ambiguous=false;result.contextual=!scores.sales;
        result.reason='sheet_from_sales_context';return result;
      }
      result.intent='ambiguous_sheet';result.topic=state.topic;result.confidence=.55;result.ambiguous=true;
      result.reason='sheet_needs_context';return result;
    }

    if(concept==='sales'&&(action==='goal'||action==='review'||/\brendir\b|\brendicion\b/.test(q))){
      result.intent='sales_workflow';result.topic='sales';result.confidence=.91;result.ambiguous=false;result.reason='sales_goal';return result;
    }
    if(concept==='gmail'){
      result.intent='gmail_query';result.topic='gmail';result.confidence=.89;result.ambiguous=false;result.reason='gmail_concept';return result;
    }
    if(concept==='mora'){
      result.intent=action==='run'?'run_mora':'mora';result.topic='mora';result.confidence=.89;result.ambiguous=false;result.reason='mora_concept';return result;
    }
    if(concept==='scoring'){
      result.intent=action==='run'?'run_scoring':'scoring';result.topic='scoring';result.confidence=.87;result.ambiguous=false;result.reason='scoring_concept';return result;
    }
    if(concept==='liquidation'){
      result.intent='mi_liquidacion';result.topic='liquidaciones';result.confidence=.84;result.ambiguous=false;result.reason='liquidation_concept';return result;
    }
    if(cont&&state.topic){
      result.intent='context_continuation';result.topic=state.topic;result.confidence=.67;result.contextual=true;result.reason='active_topic';return result;
    }
    result.topic=concept?CONCEPTS[concept].topic:state.topic;
    return result;
  }

  function accessReady(id){
    try{return !!window.ZERO_ACCESS?.registry?.[id]?.url}catch(e){return false}
  }

  function salesPlan(){
    const steps=[
      {kind:'open_access',target:'prevencion',label:'portal de rendicion',ready:accessReady('prevencion')},
      {kind:'open_access',target:'ventas-prevencion',label:'planilla de ventas',ready:accessReady('ventas-prevencion')}
    ];
    return {goal:'sales_workflow',steps,status:steps.every(s=>s.ready)?'ready':steps.some(s=>s.ready)?'partial':'not_connected',at:Date.now()};
  }

  function explicitGoal(interp){
    const goal={id:'goal_'+Date.now().toString(36),at:Date.now(),topic:interp.topic||interp.concept,intent:interp.intent,temporal:interp.temporal,text:interp.raw,status:'active'};
    state.goals.push(goal);state.activeGoal=goal;save();
    try{
      window.ZERO_MEMORY?.remember?.({type:'task_context',subject:goal.topic||'work',content:goal.text,source:'explicit_user',confidence:.98,status:'confirmed',tags:['work_goal',goal.temporal||'unscheduled',goal.topic||'general']});
    }catch(e){}
    return goal;
  }

  function appendGoal(interp){
    if(!state.activeGoal)return null;
    state.activeGoal.followups=Array.isArray(state.activeGoal.followups)?state.activeGoal.followups:[];
    state.activeGoal.followups.push({at:Date.now(),text:interp.raw,topic:interp.topic,intent:interp.intent});
    save();return state.activeGoal;
  }

  function setPending(value){state.pending={at:Date.now(),...value};save();return state.pending}
  function clearPending(){state.pending=null;save()}

  function response(message){
    try{commandFeedback.textContent=message;commandFeedback.classList.remove('error')}catch(e){}
    try{if(typeof speak==='function')speak(message)}catch(e){}
    rememberTurn('zero',message,{type:'response'});
  }

  function alias(id){
    try{return window.ZERO_ACCESS?.registry?.[id]?.aliases?.[0]||window.ZERO_ACCESS?.registry?.[id]?.label||id}catch(e){return id}
  }

  function delegateAccess(previous,id,fromVoice){
    state.lastTarget=id;save();
    return previous(`abrir ${alias(id)}`,fromVoice);
  }

  function handlePending(raw,previous,fromVoice){
    if(!state.pending)return false;
    const q=normalize(raw);

    if(state.pending.type==='sheet_clarification'){
      if(/\b(ventas|prevencion|la de ventas)\b/.test(q)){
        clearPending();delegateAccess(previous,'ventas-prevencion',fromVoice);return true;
      }
      if(isNo(q)){clearPending();response('Dale. Quedo atento.');return true}
      return false;
    }

    if(isNo(q)){
      clearPending();response('Dale, no lo hago. Quedo atento.');return true;
    }
    if(!isYes(q))return false;

    const p={...state.pending};clearPending();
    if(p.type==='open_access'&&p.target){delegateAccess(previous,p.target,fromVoice);return true}
    if(p.type==='open_accesses'&&Array.isArray(p.targets)){p.targets.forEach(id=>delegateAccess(previous,id,fromVoice));return true}
    return false;
  }

  function decide(interp){
    const q=interp.q;

    if(interp.intent==='ambiguous_sheet'){
      setPending({type:'sheet_clarification'});
      return {mode:'respond',message:'¿Que planilla queres abrir? Si es la de ventas de Prevencion, decime la de ventas.'};
    }

    if(interp.continuation&&state.activeGoal&&interp.temporal==='later'&&/\b(tengo que|debo|necesito|quiero|hay que)\b/.test(q)){
      const previousTopic=state.activeGoal.topic;
      appendGoal(interp);
      const previous={mora:'Mora',sales:'las ventas de Prevención',scoring:'Scoring',liquidaciones:'liquidaciones'}[previousTopic]||'lo anterior';
      const next={gmail:'los mails de Prevención',mora:'Mora',sales:'las ventas de Prevención',scoring:'Scoring',liquidaciones:'liquidaciones'}[interp.topic]||interp.topic||'eso';
      return {mode:'respond',message:`Lo sumo al plan: primero ${previous} y después ${next}.`};
    }

    if(interp.temporal&&/\b(tengo que|debo|necesito|quiero|hay que)\b/.test(q)&&['tomorrow','later'].includes(interp.temporal)){
      const g=explicitGoal(interp);
      const labels={mora:'Mora',gmail:'los mails',sales:'las ventas',scoring:'Scoring',liquidaciones:'liquidaciones'};
      const label=labels[g.topic]||g.topic||'eso';
      return {mode:'respond',message:g.temporal==='tomorrow'?`Dale. Me queda en contexto que mañana querés revisar ${label}.`:`Dale. Me queda en contexto para después: ${label}.`};
    }

    if(interp.intent==='sales_workflow'){
      const plan=salesPlan();state.lastPlan=plan;state.activeGoal={at:Date.now(),topic:'sales',intent:'sales_workflow',text:interp.raw,plan};save();
      const sheet=plan.steps.find(s=>s.target==='ventas-prevencion');
      const portal=plan.steps.find(s=>s.target==='prevencion');
      if(sheet?.ready&&!portal?.ready){
        setPending({type:'open_access',target:'ventas-prevencion'});
        return {mode:'respond',message:'Entendi que queres trabajar con las ventas de Prevencion. El plan es portal de rendicion mas planilla de ventas. Todavia me falta el enlace estable del portal. ¿Queres que abra la planilla mientras tanto?'};
      }
      if(plan.status==='ready'){
        setPending({type:'open_accesses',targets:['prevencion','ventas-prevencion']});
        return {mode:'respond',message:'Entendi el objetivo: rendir ventas de Prevencion. Para hacerlo necesito el portal y la planilla. ¿Queres que abra los dos?'};
      }
      return {mode:'respond',message:'Entendi que queres trabajar con las ventas de Prevencion. Lo dejo como objetivo activo, pero todavia faltan accesos para ejecutar ese flujo.'};
    }

    if(interp.intent==='gmail_query'){
      if(/\b(tengo mails|tengo correos|mails prioritarios|correos prioritarios|mails importantes|correos importantes|estado de gmail|como esta gmail|que mails tengo|que correos tengo)\b/.test(q)){
        return {mode:'delegate'};
      }
      if(state.activeGoal&&interp.continuation)appendGoal(interp);
      if(state.activeGoal?.followups?.length){
        const previous={mora:'Mora',sales:'las ventas de Prevención',scoring:'Scoring',liquidaciones:'liquidaciones'}[state.activeGoal.topic]||'lo anterior';
        return {mode:'respond',message:`Lo sumo al plan: primero ${previous} y después los mails de Prevención. Gmail laboral ya está integrado al núcleo local de Zero.`};
      }
      return {mode:'respond',message:'Entendí que querés trabajar con el Gmail laboral. La integración local ya está configurada; puedo consultar su estado cuando el núcleo local esté encendido.'};
    }

    if(interp.continuation&&state.activeGoal&&interp.intent==='context_continuation'){
      appendGoal(interp);
      return {mode:'respond',message:`Te sigo con ${state.activeGoal.topic||'lo anterior'}, pero no quiero inventar la accion. Decime que queres hacer con eso.`};
    }

    return {mode:'delegate'};
  }

  function explain(){
    const bits=[];
    if(state.topic)bits.push(`tema activo ${state.topic}`);
    if(state.lastIntent)bits.push(`ultima intencion ${state.lastIntent}`);
    if(state.lastTarget)bits.push(`ultimo destino ${state.lastTarget}`);
    if(state.activeGoal)bits.push(`objetivo activo ${state.activeGoal.topic||state.activeGoal.intent}`);
    if(state.pending)bits.push(`hay una aclaracion o confirmacion pendiente`);
    return bits.length?`Ahora tengo en mente: ${bits.join(', ')}.`:'Ahora no tengo un contexto conversacional activo.';
  }

  function snapshot(){return JSON.parse(JSON.stringify({version:VERSION,...state}))}

  load();

  const previousRun=window.runCommand||(typeof runCommand!=='undefined'?runCommand:null);
  if(previousRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      if(!raw)return previousRun(value,fromVoice);
      const q=normalize(raw);

      if(/\b(que tenes en mente|que estas entendiendo|cual es el contexto|que recordas de esto)\b/.test(q)){
        rememberTurn('user',raw,{intent:'meta_context'});response(explain());return;
      }

      if(state.pending&&handlePending(raw,previousRun,fromVoice)){
        rememberTurn('user',raw,{intent:'pending_answer'});return;
      }

      const interp=interpret(raw);
      rememberTurn('user',raw,{intent:interp.intent,topic:interp.topic,confidence:interp.confidence,contextual:interp.contextual});

      try{if(fromVoice&&window.ZERO_STARTUP?.waiting?.())return previousRun(value,fromVoice)}catch(e){}
      try{if(window.ZERO_CLARIFIER?.session?.active?.())return previousRun(value,fromVoice)}catch(e){}
      if(interp.base?.intent==='mini_hub'||interp.base?.intent==='briefing')return previousRun(value,fromVoice);

      if(interp.topic)state.topic=interp.topic;
      state.lastIntent=interp.intent;
      if(interp.target)state.lastTarget=interp.target;
      if(interp.base?.entities)state.entities={...(state.entities||{}),...interp.base.entities};
      save();

      const decision=decide(interp);
      try{window.ZERO_COGNITIVE_STATE?.observe?.('conversation_v2',{interpretation:interp,decision,topic:state.topic})}catch(e){}
      try{window.ZERO_BRAIN?.remember?.({type:'conversation_v2',intent:interp.intent,topic:interp.topic,confidence:interp.confidence,decision:decision.mode})}catch(e){}

      if(decision.mode==='respond'){response(decision.message);return}

      if(interp.intent==='open_access'&&interp.target&&interp.contextual){
        return delegateAccess(previousRun,interp.target,fromVoice);
      }

      return previousRun(value,fromVoice);
    };
  }

  window.ZERO_CONVERSATION_V2={
    version:VERSION,
    interpret,
    decide,
    explain,
    snapshot,
    clear(){state=fresh();try{localStorage.removeItem(KEY)}catch(e){}},
    selfTest(){
      const cases=[
        'necesito hacer lo de las ventas',
        'abrime la planilla',
        'manana tengo que revisar mora',
        'y despues tengo que mirar los mails de Prevencion',
        'abrir miliquidacion'
      ];
      return cases.map(text=>({text,interpretation:interpret(text)}));
    }
  };
})();
