// ZERO Cognitive Clarifier v0.3
// Detecta ambiguedad, formula preguntas concretas y mantiene una aclaracion pendiente entre turnos.
// Sigue en modo simulacion: no ejecuta herramientas ni modifica datos.
(function(){
  'use strict';

  const VERSION='0.3.0';
  const SESSION_KEY='zero:clarification-session:v1';
  const SESSION_TTL_MS=120000;
  let pending=null;

  function normalize(value){
    return String(value||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[¿?¡!.,;:]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function clean(value){return String(value||'').replace(/\s+/g,' ').trim();}

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
    const labels={sex:'si es mujer o varon',age:'la edad',unit:'si la edad esta en meses o anos',target:'que acceso queres abrir'};
    const human=missing.map(x=>labels[x]||x).join(', ');
    return `Para el paso ${step.index} me falta ${human}.`;
  }

  function questionForStep(step){
    if(!step)return null;
    if(step.resolvedReference&&step.tool&&step.policy?.reason!=='missing_parameters')return null;

    const cue=referenceCue(step.originalText||step.text);
    if((!step.ok||!step.tool)&&cue){
      return {step:step.index,reason:'unresolved_reference',cue,question:`En el paso ${step.index}, ¿a que te referis con “${cue}”?`};
    }
    if(step.ambiguous||step.policy?.reason==='ambiguous'){
      return {step:step.index,reason:'ambiguous',question:`En el paso ${step.index} veo mas de una interpretacion posible. ¿Que queres que haga exactamente?`};
    }
    const missing=missingParameters(step);
    if(missing.length){
      return {step:step.index,reason:'missing_parameters',missing,question:parameterQuestion(step,missing)};
    }
    if(!step.ok||!step.tool||step.policy?.reason==='no_tool'){
      return {step:step.index,reason:'unresolved_step',question:`No pude resolver el paso ${step.index}: “${step.originalText||step.text}”. ¿Que queres que haga con eso?`};
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
        step:x.index,cue:x.resolvedReference.cue,fromStep:x.resolvedReference.fromStep,target:x.resolvedReference.target,confidence:x.resolvedReference.confidence
      }))
    };
  }

  function inspect(raw){
    if(!window.ZERO_PLANNER?.plan)return {ok:false,error:'planner_unavailable',clarifications:[]};
    const planResult=window.ZERO_PLANNER.plan(raw);
    return {...inspectPlan(planResult),plan:planResult};
  }

  function sessionSave(){
    try{
      if(!pending){localStorage.removeItem(SESSION_KEY);return;}
      localStorage.setItem(SESSION_KEY,JSON.stringify(pending));
    }catch(e){}
  }

  function sessionLoad(){
    try{
      const raw=localStorage.getItem(SESSION_KEY);
      if(!raw)return;
      const parsed=JSON.parse(raw);
      if(!parsed?.expiresAt||parsed.expiresAt<=Date.now()){localStorage.removeItem(SESSION_KEY);return;}
      pending=parsed;
    }catch(e){}
  }

  function sessionActive(){
    if(!pending)return false;
    if(pending.expiresAt<=Date.now()){sessionClear('expired');return false;}
    return true;
  }

  function sessionSnapshot(){return sessionActive()?JSON.parse(JSON.stringify(pending)):null;}

  function sessionClear(reason='cleared'){
    const previous=pending;
    pending=null;sessionSave();
    try{window.ZERO_BRAIN?.remember?.({type:'clarification_session',event:'cleared',reason})}catch(e){}
    return previous;
  }

  function beginSession(raw,inspection=null){
    const source=clean(raw);
    const result=inspection||inspect(source);
    if(!result?.ok)return {ok:false,error:result?.error||'inspection_failed'};
    if(!result.needsClarification||!result.first)return {ok:true,started:false,result};
    pending={source,createdAt:Date.now(),expiresAt:Date.now()+SESSION_TTL_MS,clarification:result.first,plan:result.plan};
    sessionSave();
    try{window.ZERO_BRAIN?.remember?.({type:'clarification_session',event:'started',source,step:result.first.step,reason:result.first.reason})}catch(e){}
    return {ok:true,started:true,question:result.first.question,session:sessionSnapshot()};
  }

  function rebuildSource(answer){
    if(!sessionActive()||!window.ZERO_PLANNER?.splitSteps)return null;
    const chunks=window.ZERO_PLANNER.splitSteps(pending.source);
    const idx=Math.max(0,(pending.clarification?.step||1)-1);
    if(!chunks[idx])return null;
    const response=clean(answer);
    if(!response)return null;
    const cue=pending.clarification?.cue;
    if(cue&&normalize(chunks[idx]).includes(normalize(cue))){
      const lower=chunks[idx].toLowerCase();
      const pos=lower.indexOf(cue.toLowerCase());
      chunks[idx]=pos>=0?chunks[idx].slice(0,pos)+response+chunks[idx].slice(pos+cue.length):`${chunks[idx]} ${response}`;
    }else{
      chunks[idx]=`${chunks[idx]} ${response}`.trim();
    }
    return chunks.join(' y despues ');
  }

  function answerSession(answer){
    if(!sessionActive())return {ok:false,error:'no_active_session'};
    const rebuilt=rebuildSource(answer);
    if(!rebuilt)return {ok:false,error:'rebuild_failed'};
    const result=inspect(rebuilt);
    if(!result.ok)return {ok:false,error:result.error||'reinspection_failed',rebuilt};
    try{window.ZERO_BRAIN?.remember?.({type:'clarification_session',event:'answered',answer:clean(answer),rebuiltSource:rebuilt})}catch(e){}

    if(result.needsClarification&&result.first){
      pending={source:rebuilt,createdAt:Date.now(),expiresAt:Date.now()+SESSION_TTL_MS,clarification:result.first,plan:result.plan};
      sessionSave();
      return {ok:true,completed:false,rebuilt,question:result.first.question,result,session:sessionSnapshot()};
    }

    sessionClear('resolved');
    return {ok:true,completed:true,rebuilt,result,plan:result.plan};
  }

  function explain(raw){
    const result=inspect(raw);
    if(!result.ok)return 'No pude revisar ese plan todavia.';
    if(result.first)return `${result.first.question} No ejecute nada.`;
    if(result.resolvedReferences.length){
      const refs=result.resolvedReferences.map(r=>`paso ${r.step} desde el paso ${r.fromStep}`).join(', ');
      return `El plan no necesita una aclaracion basica. Pude resolver contexto interno en ${refs}. Sigue en modo simulacion y no ejecute nada.`;
    }
    return 'El plan no necesita una aclaracion basica. Sigue en modo simulacion y no ejecute nada.';
  }

  sessionLoad();

  window.ZERO_CLARIFIER={
    version:VERSION,referenceCue,questionForStep,inspectPlan,inspect,explain,
    session:{ttlMs:SESSION_TTL_MS,begin:beginSession,answer:answerSession,active:sessionActive,snapshot:sessionSnapshot,clear:sessionClear,rebuildSource}
  };
})();
