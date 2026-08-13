// ZERO Cognitive Planner v0.2
// Convierte instrucciones secuenciales en planes auditables. No ejecuta acciones.
// v0.2 resuelve referencias intra-plan unicamente para accesos conocidos y reversibles.
(function(){
  'use strict';

  const VERSION='0.2.0';
  const MAX_STEPS=6;

  function normalize(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }

  function normalizedLower(value){
    return normalize(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'');
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

    // Caso natural: "abrí X y abrí Y".
    const actionSplit=text
      .split(/\s+y\s+(?=(?:abr[ií]|abrir|abre|abrime|abreme|mostr[aá]|mostrar|busc[aá]|buscar)\b)/i)
      .map(x=>x.trim())
      .filter(Boolean);

    return actionSplit.slice(0,MAX_STEPS);
  }

  function inspectStep(text,index){
    if(!window.ZERO_REASONER?.inspect){
      return {index,text,originalText:text,ok:false,error:'reasoner_unavailable'};
    }
    const decision=window.ZERO_REASONER.inspect(text);
    return {index,text,originalText:text,ok:true,...decision};
  }

  function referenceCue(text){
    const q=normalizedLower(text);
    const hit=q.match(/\b(eso|esa|ese|esto|esta|este|lo mismo|la misma|el mismo|de nuevo|otra vez|nuevamente)\b/);
    return hit?hit[0]:null;
  }

  function asksToOpen(text){
    const q=normalizedLower(text);
    return /\b(abri|abrir|abre|abrime|abreme|volver a abrir|volvelo a abrir|volvela a abrir)\b/.test(q);
  }

  function accessAlias(target){
    try{
      const entry=window.ZERO_ACCESS?.registry?.[target];
      if(!entry)return null;
      return entry.aliases?.[0]||entry.label||null;
    }catch(e){return null;}
  }

  function previousResolvableAccess(resolvedSteps){
    for(let i=resolvedSteps.length-1;i>=0;i--){
      const step=resolvedSteps[i];
      if(step?.tool==='open_access' && step?.parameters?.target){
        return step;
      }
    }
    return null;
  }

  function tryResolveIntraPlan(step,resolvedSteps){
    const cue=referenceCue(step.originalText||step.text);
    if(!cue || !asksToOpen(step.originalText||step.text))return step;

    const prior=previousResolvableAccess(resolvedSteps);
    if(!prior)return step;

    const target=prior.parameters.target;
    const alias=accessAlias(target);
    if(!alias)return step;

    // Solo reescribimos una referencia explícita hacia un acceso conocido.
    // No inferimos URLs ni ejecutamos nada.
    const resolvedText=`abrí ${alias}`;
    const inspected=inspectStep(resolvedText,step.index);
    return {
      ...inspected,
      originalText:step.originalText||step.text,
      resolvedText,
      contextual:true,
      resolvedReference:{
        cue,
        fromStep:prior.index,
        target,
        confidence:.94,
        rule:'previous_known_access'
      }
    };
  }

  function buildSteps(chunks){
    const resolved=[];
    chunks.forEach((chunk,i)=>{
      const base=inspectStep(chunk,i+1);
      const needsResolution=!base.tool || base.policy?.reason==='no_tool' || base.policy?.reason==='missing_parameters';
      const finalStep=needsResolution?tryResolveIntraPlan(base,resolved):base;
      resolved.push(finalStep);
    });
    return resolved;
  }

  function plan(raw){
    const source=normalize(raw);
    const chunks=splitSteps(source);
    if(!chunks.length)return {ok:false,error:'empty_plan',source,steps:[]};

    const steps=buildSteps(chunks);
    const unresolved=steps.filter(step=>!step.ok||!step.tool||step.policy?.reason==='no_tool'||step.policy?.reason==='missing_parameters');
    const confirmations=steps.filter(step=>step.policy?.confirm);
    const blocked=steps.filter(step=>step.policy && !step.policy.allow && !step.policy.confirm);
    const lowRiskReady=steps.filter(step=>step.policy?.allow && step.risk==='low');
    const contextual=steps.filter(step=>step.contextual);

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
        unresolved:unresolved.length,
        contextual:contextual.length
      },
      executable:false,
      note:'Plan simulado: ZERO todavía no ejecuta secuencias automáticamente.'
    };
  }

  function explain(raw){
    const result=plan(raw);
    if(!result.ok)return 'No pude construir un plan con esa instrucción.';
    if(result.steps.length===1)return `Veo una sola acción: ${result.steps[0].summary||result.steps[0].text}`;
    const lines=result.steps.map(step=>{
      let detail=`${step.index}. ${step.toolLabel||step.intent||'acción no resuelta'} (${step.risk||'riesgo sin definir'})`;
      if(step.resolvedReference)detail+=` [referencia resuelta desde el paso ${step.resolvedReference.fromStep}]`;
      return detail;
    });
    return `Preparé ${result.steps.length} pasos en modo simulación: ${lines.join('; ')}. No los ejecuté.`;
  }

  window.ZERO_PLANNER={version:VERSION,splitSteps,plan,explain,referenceCue};
})();
