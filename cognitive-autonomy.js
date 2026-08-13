// ZERO Cognitive Autonomy v0.1
// Puerta de decision entre razonamiento y ejecucion.
// No ejecuta herramientas sensibles: decide si ejecutar, aclarar, confirmar o bloquear.
(function(){
  'use strict';

  const VERSION='0.1.0';
  const MODE={EXECUTE:'execute',CLARIFY:'clarify',CONFIRM:'confirm',BLOCK:'block'};

  function normalize(v){
    return String(v||'').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[¿?¡!.,;:]/g,' ')
      .replace(/\s+/g,' ').trim();
  }

  function reasonLabel(reason){
    const map={
      no_tool:'todavia no tengo una herramienta para resolverlo',
      not_connected:'la herramienta existe pero todavia no esta conectada',
      missing_parameters:'faltan datos necesarios',
      ambiguous:'hay mas de una interpretacion posible',
      sensitive_action:'la accion puede modificar datos o producir efectos reales',
      low_confidence:'no estoy suficientemente seguro de haber entendido bien',
      high_confidence_low_risk:'la accion es de bajo riesgo y la interpretacion es clara',
      medium_confidence_low_risk:'la accion es de bajo riesgo y la interpretacion es razonablemente clara'
    };
    return map[reason]||reason||'sin razon registrada';
  }

  function clarificationQuestion(result){
    const d=result?.toolDecision;
    const missing=d?.validation?.missing||[];
    if(missing.length){
      const labels={sex:'si es mujer o varon',age:'la edad',unit:'si son meses o anos',target:'que acceso queres abrir'};
      const readable=missing.map(x=>labels[x]||x);
      return `Me falta ${readable.join(' y ')}.`;
    }
    if(result?.interpretation?.ambiguous)return 'Tengo mas de una interpretacion posible. ¿Me lo aclaras?';
    return 'No estoy lo bastante seguro. ¿Me das un poco mas de contexto?';
  }

  function confirmationQuestion(result){
    const label=result?.toolDecision?.label||'esa accion';
    const risk=result?.toolDecision?.risk;
    if(risk==='high'||result?.toolDecision?.mutatesData){
      return `${label} puede modificar datos o generar efectos reales. ¿Queres que lo haga?`;
    }
    return `Entendi que queres ${label.toLowerCase()}. ¿Confirmas?`;
  }

  function decide(raw){
    const result=window.ZERO_REASONER?.analyze?.(raw);
    if(!result?.ok){
      return {ok:false,mode:MODE.BLOCK,reason:result?.error||'reasoner_unavailable'};
    }

    const policy=result.policy||{};
    const decision={
      ok:true,
      raw:String(raw||''),
      normalized:normalize(raw),
      intent:result.interpretation?.intent||'unknown',
      confidence:Number(result.interpretation?.confidence||0),
      ambiguous:!!result.interpretation?.ambiguous,
      tool:result.toolDecision?.tool||null,
      toolLabel:result.toolDecision?.label||null,
      risk:result.toolDecision?.risk||null,
      reason:policy.reason||'unknown',
      mode:MODE.BLOCK,
      question:null,
      explanation:null,
      at:Date.now()
    };

    if(policy.allow){
      decision.mode=MODE.EXECUTE;
    }else if(policy.confirm){
      decision.mode=decision.reason==='ambiguous'||decision.reason==='low_confidence'
        ?MODE.CLARIFY:MODE.CONFIRM;
    }else if(decision.reason==='missing_parameters'){
      decision.mode=MODE.CLARIFY;
    }else{
      decision.mode=MODE.BLOCK;
    }

    if(decision.mode===MODE.CLARIFY)decision.question=clarificationQuestion(result);
    if(decision.mode===MODE.CONFIRM)decision.question=confirmationQuestion(result);

    decision.explanation=`Decision ${decision.mode}. Entendi ${decision.intent} con confianza ${Math.round(decision.confidence*100)}%. ${reasonLabel(decision.reason)}.`;

    try{
      window.ZERO_BRAIN?.remember?.({
        type:'autonomy_decision',mode:decision.mode,intent:decision.intent,
        confidence:decision.confidence,tool:decision.tool,reason:decision.reason
      });
    }catch(e){}
    try{window.ZERO_COGNITIVE_STATE?.observe?.('autonomy_decision',decision)}catch(e){}

    return decision;
  }

  function inspect(raw){return decide(raw);}

  function shouldExecute(raw){
    const d=decide(raw);
    return !!d.ok&&d.mode===MODE.EXECUTE;
  }

  function describe(raw){
    const d=decide(raw);
    if(!d.ok)return 'No pude evaluar esa accion.';
    let text=d.explanation;
    if(d.question)text+=` ${d.question}`;
    return text;
  }

  window.ZERO_AUTONOMY={version:VERSION,MODE,decide,inspect,shouldExecute,describe};
})();
