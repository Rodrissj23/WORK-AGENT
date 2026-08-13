// ZERO Tool Registry v0.1
// Catalogo descriptivo y auditable. No ejecuta acciones.
(function(){
  'use strict';

  const VERSION='0.1.0';
  const RISK={LOW:'low',MEDIUM:'medium',HIGH:'high'};

  const TOOLS={
    briefing:{id:'briefing',label:'Briefing operativo',intents:['briefing'],risk:RISK.LOW,reversible:true,mutatesData:false,requiresConfirmation:false,parameters:[]},
    mini_hub_query:{id:'mini_hub_query',label:'Consulta Mini Hub',intents:['mini_hub'],risk:RISK.LOW,reversible:true,mutatesData:false,requiresConfirmation:false,parameters:['sex','age','unit']},
    open_access:{id:'open_access',label:'Abrir acceso conocido',intents:['open_access'],risk:RISK.LOW,reversible:true,mutatesData:false,requiresConfirmation:false,parameters:['target']},
    open_mora:{id:'open_mora',label:'Abrir Mora',intents:['mora'],risk:RISK.LOW,reversible:true,mutatesData:false,requiresConfirmation:false,parameters:[]},
    open_scoring:{id:'open_scoring',label:'Abrir Scoring',intents:['scoring'],risk:RISK.LOW,reversible:true,mutatesData:false,requiresConfirmation:false,parameters:[]},
    open_my_liquidation:{id:'open_my_liquidation',label:'Abrir Mi liquidación',intents:['mi_liquidacion'],risk:RISK.LOW,reversible:true,mutatesData:false,requiresConfirmation:false,parameters:[]},
    open_liquidation_control:{id:'open_liquidation_control',label:'Abrir Control de liquidaciones',intents:['control_liquidaciones'],risk:RISK.LOW,reversible:true,mutatesData:false,requiresConfirmation:false,parameters:[]},
    run_mora_engine:{id:'run_mora_engine',label:'Ejecutar motor de Mora',intents:['run_mora'],risk:RISK.HIGH,reversible:false,mutatesData:true,requiresConfirmation:true,parameters:[],connected:false},
    run_scoring_engine:{id:'run_scoring_engine',label:'Ejecutar Scoring',intents:['run_scoring'],risk:RISK.HIGH,reversible:false,mutatesData:true,requiresConfirmation:true,parameters:[],connected:false}
  };

  function list(){return Object.values(TOOLS).map(t=>({...t,intents:[...t.intents],parameters:[...(t.parameters||[])]}));}

  function parametersFor(analysis={}){
    if(analysis.intent==='mini_hub')return {...(analysis.entities||{})};
    if(analysis.intent==='open_access')return {target:analysis.target||null};
    return {};
  }

  function validate(tool,params={}){
    const missing=(tool.parameters||[]).filter(name=>params[name]===null||params[name]===undefined||params[name]==='');
    return {ok:missing.length===0,missing};
  }

  function select(analysis={}){
    const params=parametersFor(analysis);
    const matches=Object.values(TOOLS).filter(t=>t.intents.includes(analysis.intent));
    if(!matches.length)return {tool:null,reason:'no_tool_for_intent',params,candidates:[]};
    const ranked=matches.map(tool=>{
      const validation=validate(tool,params);
      const connected=tool.connected!==false;
      let score=0;
      if(connected)score+=3;
      if(validation.ok)score+=2;
      if(tool.risk===RISK.LOW)score+=1;
      return {tool,validation,connected,score};
    }).sort((a,b)=>b.score-a.score);
    const best=ranked[0];
    return {
      tool:best.tool.id,label:best.tool.label,risk:best.tool.risk,
      reversible:!!best.tool.reversible,mutatesData:!!best.tool.mutatesData,
      requiresConfirmation:!!best.tool.requiresConfirmation,connected:best.connected,
      validation:best.validation,params,
      reason:best.connected?(best.validation.ok?'best_match':'missing_parameters'):'not_connected',
      candidates:ranked.map(x=>({id:x.tool.id,score:x.score,connected:x.connected,risk:x.tool.risk,validation:x.validation}))
    };
  }

  function policy(decision,confidence=0,ambiguous=false){
    if(!decision?.tool)return {allow:false,confirm:false,reason:'no_tool'};
    if(!decision.connected)return {allow:false,confirm:false,reason:'not_connected'};
    if(decision.validation&&!decision.validation.ok)return {allow:false,confirm:false,reason:'missing_parameters'};
    if(ambiguous)return {allow:false,confirm:true,reason:'ambiguous'};
    if(decision.risk===RISK.HIGH||decision.mutatesData||decision.requiresConfirmation)return {allow:false,confirm:true,reason:'sensitive_action'};
    if(confidence>=.90)return {allow:true,confirm:false,reason:'high_confidence_low_risk'};
    if(confidence>=.65&&decision.risk===RISK.LOW)return {allow:true,confirm:false,reason:'medium_confidence_low_risk'};
    return {allow:false,confirm:true,reason:'low_confidence'};
  }

  window.ZERO_TOOLS={version:VERSION,RISK,registry:TOOLS,list,select,policy,parametersFor};
})();
