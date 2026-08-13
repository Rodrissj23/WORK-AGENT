// ZERO Cognitive Planner v0.1
// Convierte instrucciones secuenciales en planes auditables. No ejecuta acciones.
(function(){
  'use strict';

  const VERSION='0.1.0';
  const MAX_STEPS=6;

  function normalize(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }

  function splitSteps(raw){
    const text=normalize(raw);
    if(!text)return [];

    // Separadores deliberadamente conservadores para no romper frases naturales.
    const parts=text
      .split(/\s+(?:y\s+despu[eé]s|despu[eé]s|luego|y\s+tambi[eé]n|a\s+continuaci[oó]n)\s+/i)
      .map(x=>x.trim())
      .filter(Boolean);

    if(parts.length>1)return parts.slice(0,MAX_STEPS);

    // Caso natural: "abrí X y abrí Y" / "abrí X y después abrí Y".
    const actionSplit=text
      .split(/\s+y\s+(?=(?:abr[ií]|abrir|abre|abrime|abreme|mostr[aá]|mostrar|busc[aá]|buscar)\b)/i)
      .map(x=>x.trim())
      .filter(Boolean);

    return actionSplit.slice(0,MAX_STEPS);
  }

  function inspectStep(text,index){
    if(!window.ZERO_REASONER?.inspect){
      return {index,text,ok:false,error:'reasoner_unavailable'};
    }
    const decision=window.ZERO_REASONER.inspect(text);
    return {index,text,ok:true,...decision};
  }

  function plan(raw){
    const source=normalize(raw);
    const chunks=splitSteps(source);
    if(!chunks.length)return {ok:false,error:'empty_plan',source,steps:[]};

    const steps=chunks.map((chunk,i)=>inspectStep(chunk,i+1));
    const unresolved=steps.filter(step=>!step.ok||!step.tool||step.policy?.reason==='no_tool'||step.policy?.reason==='missing_parameters');
    const confirmations=steps.filter(step=>step.policy?.confirm);
    const blocked=steps.filter(step=>step.policy && !step.policy.allow && !step.policy.confirm);
    const lowRiskReady=steps.filter(step=>step.policy?.allow && step.risk==='low');

    return {
      ok:true,
      source,
      stepCount:steps.length,
      steps,
      status:unresolved.length?'needs_clarification':(blocked.length?'blocked':(confirmations.length?'needs_confirmation':'ready')),
      counts:{
        ready:lowRiskReady.length,
        confirmation:confirmations.length,
        blocked:blocked.length,
        unresolved:unresolved.length
      },
      executable:false,
      note:'Plan simulado: ZERO todavía no ejecuta secuencias automáticamente.'
    };
  }

  function explain(raw){
    const result=plan(raw);
    if(!result.ok)return 'No pude construir un plan con esa instrucción.';
    if(result.steps.length===1)return `Veo una sola acción: ${result.steps[0].summary||result.steps[0].text}`;
    const lines=result.steps.map(step=>`${step.index}. ${step.toolLabel||step.intent||'acción no resuelta'} (${step.risk||'riesgo sin definir'})`);
    return `Preparé ${result.steps.length} pasos en modo simulación: ${lines.join('; ')}. No los ejecuté.`;
  }

  window.ZERO_PLANNER={version:VERSION,splitSteps,plan,explain};
})();
