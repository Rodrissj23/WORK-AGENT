// ZERO Cognitive State v0.1
// Estado funcional compartido: fase actual, expectativa del siguiente turno y trazabilidad.
(function(){
  'use strict';
  const VERSION='0.1.0';
  const KEY='zero:cognitive-state:v1';
  const MAX_HISTORY=32;
  const VALID=new Set(['idle','listening','interpreting','clarifying','planning','confirming','delegating','speaking','error']);
  let state={phase:'idle',since:Date.now(),reason:'startup',expects:null,history:[]};

  function save(){
    try{localStorage.setItem(KEY,JSON.stringify({...state,history:state.history.slice(-MAX_HISTORY)}))}catch(e){}
  }
  function load(){
    try{
      const raw=localStorage.getItem(KEY);if(!raw)return;
      const parsed=JSON.parse(raw);
      if(VALID.has(parsed.phase))state.phase=parsed.phase;
      state.since=Number(parsed.since)||Date.now();
      state.reason=parsed.reason||'restored';
      state.expects=parsed.expects||null;
      state.history=Array.isArray(parsed.history)?parsed.history.slice(-MAX_HISTORY):[];
      // estados transitorios no deben sobrevivir a una recarga como si siguieran activos
      if(!['idle','clarifying','confirming'].includes(state.phase)){
        state.history.push({at:Date.now(),from:state.phase,to:'idle',reason:'reload_recovery'});
        state.phase='idle';state.reason='reload_recovery';state.since=Date.now();
      }
    }catch(e){}
  }
  function transition(next,reason='unspecified',detail={}){
    if(!VALID.has(next))return {ok:false,error:'invalid_phase',phase:state.phase};
    const prev=state.phase;
    if(prev!==next){
      state.history.push({at:Date.now(),from:prev,to:next,reason,detail});
      if(state.history.length>MAX_HISTORY)state.history.splice(0,state.history.length-MAX_HISTORY);
    }
    state.phase=next;state.reason=reason;state.since=Date.now();save();
    try{window.ZERO_BRAIN?.remember?.({type:'cognitive_state',from:prev,to:next,reason})}catch(e){}
    return snapshot();
  }
  function expect(kind,detail={}){
    state.expects=kind?{kind,detail,at:Date.now()}:null;save();return snapshot();
  }
  function clearExpectation(reason='resolved'){
    const previous=state.expects;state.expects=null;save();
    try{window.ZERO_BRAIN?.remember?.({type:'cognitive_expectation',event:'cleared',reason,previous:previous?.kind||null})}catch(e){}
    return previous;
  }
  function snapshot(){
    return {version:VERSION,phase:state.phase,since:state.since,reason:state.reason,expects:state.expects?{...state.expects}:null,history:state.history.slice(-10).map(x=>({...x}))};
  }
  function human(){
    const labels={idle:'en espera',listening:'escuchando',interpreting:'interpretando lo que dijiste',clarifying:'esperando una aclaracion',planning:'armando un plan',confirming:'esperando confirmacion',delegating:'derivando una accion',speaking:'respondiendo',error:'recuperandome de un error'};
    let msg=`Ahora estoy ${labels[state.phase]||state.phase}.`;
    if(state.expects?.kind==='clarification')msg+=' Estoy esperando que completes un dato del pedido anterior.';
    if(state.expects?.kind==='confirmation')msg+=' Estoy esperando que confirmes antes de continuar.';
    return msg;
  }

  load();save();
  window.ZERO_STATE={version:VERSION,transition,expect,clearExpectation,snapshot,human,phases:[...VALID]};
})();
