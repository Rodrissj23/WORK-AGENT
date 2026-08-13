// ZERO Cognitive Clarifier v0.2
// Detecta ambigüedad y formula preguntas concretas sobre planes simulados.
// Respeta referencias que el planner ya pudo resolver de forma segura.
// No ejecuta herramientas ni modifica datos.
(function(){
  'use strict';

  const VERSION='0.2.0';

  function normalize(value){
    return String(value||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[¿?¡!.,;:]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function referenceCue(text){
    const q=normalize(text);
    const hit=q.match(/\b(eso|esa|ese|esto|esta|este|lo mismo|la misma|el mismo|el otro|la otra|de nuevo|otra vez|nuevamente)\b/);
    return hit?hit[0]:null;
  }

  function missingParameters(step){
    if(!step||step.policy?.reason!=='missing_parameters')return [];
    try{
      const declared=window.ZERO_TOOLS?.registry?.[step.tool]?.parameters||[];
      return declared.filter(name=>step.parameters?.[name]===null||step.parameters?.[name]===undefined||step.parameters?.[name]==='');
    }catch(e){return [];}
  }

  function parameterQuestion(step,missing){
    const labels={
      sex:'si es mujer o varón',
      age:'la edad',
      unit:'si la edad está en meses o años',
      target:'qué acceso querés abrir'
    };
    const human=missing.map(x=>labels[x]||x).join(', ');
    return `Para el paso ${step.index} me falta ${human}.`;
  }

  function questionForStep(step){
    if(!step)return null;

    // Si el planner resolvió explícitamente la referencia usando un acceso conocido
    // anterior, no volvemos a preguntar por ella.
    if(step.resolvedReference && step.tool && step.policy?.reason!=='missing_parameters'){
      return null;
    }

    const cue=referenceCue(step.originalText||step.text);
    if((!step.ok||!step.tool) && cue){
      return {
        step:step.index,
        reason:'unresolved_reference',
        cue,
        question:`En el paso ${step.index}, ¿a qué te referís con “${cue}”?`
      };
    }

    if(step.ambiguous||step.policy?.reason==='ambiguous'){
      return {
        step:step.index,
        reason:'ambiguous',
        question:`En el paso ${step.index} veo más de una interpretación posible. ¿Qué querés que haga exactamente?`
      };
    }

    const missing=missingParameters(step);
    if(missing.length){
      return {
        step:step.index,
        reason:'missing_parameters',
        missing,
        question:parameterQuestion(step,missing)
      };
    }

    if(!step.ok||!step.tool||step.policy?.reason==='no_tool'){
      return {
        step:step.index,
        reason:'unresolved_step',
        question:`No pude resolver el paso ${step.index}: “${step.originalText||step.text}”. ¿Qué querés que haga con eso?`
      };
    }

    return null;
  }

  function inspectPlan(planResult){
    if(!planResult?.ok)return {ok:false,error:'invalid_plan',clarifications:[]};
    const clarifications=(planResult.steps||[]).map(questionForStep).filter(Boolean);
    return {
      ok:true,
      needsClarification:clarifications.length>0,
      first:clarifications[0]||null,
      clarifications,
      resolvedReferences:(planResult.steps||[]).filter(x=>x.resolvedReference).map(x=>({
        step:x.index,
        cue:x.resolvedReference.cue,
        fromStep:x.resolvedReference.fromStep,
        target:x.resolvedReference.target,
        confidence:x.resolvedReference.confidence
      }))
    };
  }

  function inspect(raw){
    if(!window.ZERO_PLANNER?.plan)return {ok:false,error:'planner_unavailable',clarifications:[]};
    const planResult=window.ZERO_PLANNER.plan(raw);
    return {...inspectPlan(planResult),plan:planResult};
  }

  function explain(raw){
    const result=inspect(raw);
    if(!result.ok)return 'No pude revisar ese plan todavía.';
    if(result.first)return `${result.first.question} No ejecuté nada.`;
    if(result.resolvedReferences.length){
      const refs=result.resolvedReferences.map(r=>`paso ${r.step} desde el paso ${r.fromStep}`).join(', ');
      return `El plan no necesita una aclaración básica. Pude resolver contexto interno en ${refs}. Sigue en modo simulación y no ejecuté nada.`;
    }
    return 'El plan no necesita una aclaración básica. Sigue en modo simulación y no ejecuté nada.';
  }

  window.ZERO_CLARIFIER={version:VERSION,referenceCue,questionForStep,inspectPlan,inspect,explain};
})();
