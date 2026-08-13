// ZERO Cognitive Policy v0.1
// Une interpretacion + seleccion de herramienta + politica de confianza/riesgo.
// No ejecuta herramientas: solo produce una decision auditable.
(function(){
  'use strict';

  const VERSION='0.1.0';

  function analyze(raw){
    if(!window.ZERO_BRAIN?.classify)return {ok:false,error:'brain_unavailable'};
    if(!window.ZERO_TOOLS?.select)return {ok:false,error:'tool_registry_unavailable'};

    const interpretation=window.ZERO_BRAIN.classify(raw);
    interpretation.raw=String(raw||'');
    const toolDecision=window.ZERO_TOOLS.select(interpretation);
    const policy=window.ZERO_TOOLS.policy(toolDecision,interpretation.confidence,!!interpretation.ambiguous);

    return {
      ok:true,
      interpretation,
      toolDecision,
      policy,
      summary:summarize(interpretation,toolDecision,policy)
    };
  }

  function summarize(interpretation,toolDecision,policy){
    if(!toolDecision?.tool){
      return `Intención ${interpretation.intent}; no hay una herramienta registrada para resolverla todavía.`;
    }
    let text=`Intención ${interpretation.intent}; herramienta ${toolDecision.label}; riesgo ${toolDecision.risk}`;
    if(toolDecision.validation && !toolDecision.validation.ok){
      text+=`; faltan parámetros: ${toolDecision.validation.missing.join(', ')}`;
    }
    if(!toolDecision.connected)text+='; herramienta todavía no conectada';
    if(policy.allow)text+='; acción de bajo riesgo permitida por política';
    else if(policy.confirm)text+='; requiere confirmación antes de actuar';
    else text+=`; no debe ejecutarse: ${policy.reason}`;
    return text+'.';
  }

  function inspect(raw){
    const result=analyze(raw);
    if(!result.ok)return result;
    return {
      intent:result.interpretation.intent,
      confidence:result.interpretation.confidence,
      ambiguous:!!result.interpretation.ambiguous,
      tool:result.toolDecision.tool,
      toolLabel:result.toolDecision.label,
      risk:result.toolDecision.risk,
      parameters:result.toolDecision.params,
      policy:result.policy,
      summary:result.summary
    };
  }

  window.ZERO_REASONER={version:VERSION,analyze,inspect};
})();
