// ZERO Cognitive Core v0.2
// Capa de interpretacion, memoria operativa, contexto referencial y metacontrol.
// Los motores existentes siguen siendo la pila de ejecucion estable.
(function(){
  'use strict';

  const VERSION='0.2.0';
  const MEMORY_KEY='zero:cognitive-memory:v1';
  const MAX_TURNS=24;
  const MAX_CONTEXT=8;
  const state={
    mode:'ready',
    focus:null,
    lastAnalysis:null,
    lastAction:null,
    turns:[],
    context:[],
    startedAt:Date.now()
  };

  function normalize(value){
    return String(value||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[¿?¡!.,;:]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function safeLoad(){
    try{
      const raw=localStorage.getItem(MEMORY_KEY);
      if(!raw)return;
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed.turns))state.turns=parsed.turns.slice(-MAX_TURNS);
      if(Array.isArray(parsed.context))state.context=parsed.context.slice(-MAX_CONTEXT);
      if(parsed.focus)state.focus=parsed.focus;
      if(parsed.lastAnalysis)state.lastAnalysis=parsed.lastAnalysis;
      if(parsed.lastAction)state.lastAction=parsed.lastAction;
    }catch(e){}
  }

  function safeSave(){
    try{
      localStorage.setItem(MEMORY_KEY,JSON.stringify({
        turns:state.turns.slice(-MAX_TURNS),
        context:state.context.slice(-MAX_CONTEXT),
        focus:state.focus,
        lastAnalysis:state.lastAnalysis,
        lastAction:state.lastAction
      }));
    }catch(e){}
  }

  function remember(turn){
    const item={at:Date.now(),...turn};
    state.turns.push(item);
    if(state.turns.length>MAX_TURNS)state.turns.splice(0,state.turns.length-MAX_TURNS);
    safeSave();
    return item;
  }

  function pushContext(item){
    if(!item||!item.focus)return;
    const previous=state.context[state.context.length-1];
    if(previous && previous.focus===item.focus && previous.target===item.target){
      state.context[state.context.length-1]={...previous,...item,at:Date.now()};
    }else{
      state.context.push({at:Date.now(),...item});
      if(state.context.length>MAX_CONTEXT)state.context.splice(0,state.context.length-MAX_CONTEXT);
    }
    safeSave();
  }

  function accessIntent(raw){
    try{
      if(window.ZERO_ACCESS?.match){
        const hit=window.ZERO_ACCESS.match(raw);
        if(hit)return {intent:'open_access',confidence:.96,target:hit.id,label:hit.entry?.label||hit.id};
      }
    }catch(e){}
    return null;
  }

  function miniIntent(raw){
    try{
      if(typeof waExtractEntities==='function'){
        const e=waExtractEntities(raw);
        const count=(e.sex?1:0)+(e.age!==null?1:0)+(e.unit?1:0);
        if(count){
          let confidence=.56+count*.12;
          if(e.sex&&e.age!==null)confidence=.93;
          return {intent:'mini_hub',confidence:Math.min(confidence,.96),entities:{sex:e.sex,age:e.age,unit:e.unit}};
        }
      }
    }catch(e){}
    return null;
  }

  function recentDistinctContexts(){
    const out=[];
    const seen=new Set();
    for(let i=state.context.length-1;i>=0;i--){
      const item=state.context[i];
      const key=`${item.focus||''}|${item.target||''}`;
      if(seen.has(key))continue;
      seen.add(key);out.push(item);
    }
    return out;
  }

  function resolveReference(raw){
    const q=normalize(raw);
    const result={
      hasReference:false,
      continuation:false,
      sequence:false,
      repeat:false,
      referent:null,
      confidence:0,
      ambiguous:false,
      cue:null
    };

    if(/^(y\b|ahora\b|despues\b|tambien\b|ademas\b)/.test(q)||/\b(y tambien|despues de eso|ahora eso)\b/.test(q)){
      result.continuation=true;
    }
    if(/\b(despues|luego|y despues|a continuacion)\b/.test(q))result.sequence=true;
    if(/\b(de nuevo|otra vez|nuevamente|volver a abrir|volvelo a abrir|volvela a abrir)\b/.test(q))result.repeat=true;

    const pronoun=/\b(eso|esa|ese|esto|esta|este|lo mismo|la misma|el mismo)\b/.exec(q);
    const other=/\b(el otro|la otra|otro|otra)\b/.exec(q);
    if(pronoun||other||result.repeat){
      result.hasReference=true;
      result.cue=other?other[0]:(pronoun?pronoun[0]:'repeat');
      const recent=recentDistinctContexts();
      if(other){
        if(recent.length>=2){
          result.referent=recent[1];
          result.confidence=.78;
        }else{
          result.ambiguous=true;
          result.confidence=.38;
        }
      }else if(recent.length){
        result.referent=recent[0];
        result.confidence=result.repeat?.94:.88;
      }else if(state.focus){
        result.referent={focus:state.focus,target:null,label:state.focus};
        result.confidence=.66;
      }else{
        result.ambiguous=true;
        result.confidence=.25;
      }
    }
    return result;
  }

  function classify(raw){
    const q=normalize(raw);
    const candidates=[];

    if(/\b(como estamos|briefing|estado general|resumen operativo|que tengo pendiente|mis pendientes)\b/.test(q)){
      candidates.push({intent:'briefing',confidence:.98});
    }

    const access=accessIntent(raw);if(access)candidates.push(access);
    const mini=miniIntent(raw);if(mini)candidates.push(mini);

    if(/\b(mora|deuda|impagas|cobranzas)\b/.test(q))candidates.push({intent:'mora',confidence:q.includes('mora')?.95:.72});
    if(/\b(scoring|reporte por broker|reporte diario)\b/.test(q))candidates.push({intent:'scoring',confidence:q.includes('scoring')?.95:.78});
    if(/\b(mi liquidacion|mis comisiones|comisiones)\b/.test(q))candidates.push({intent:'mi_liquidacion',confidence:.91});
    if(/\b(control de liquidaciones|control liquidacion|cruzar altas)\b/.test(q))candidates.push({intent:'control_liquidaciones',confidence:.93});

    candidates.sort((a,b)=>b.confidence-a.confidence);
    if(!candidates.length)return {intent:'unknown',confidence:.18,ambiguous:true,candidates:[]};

    const best=candidates[0];
    const second=candidates[1];
    const ambiguous=!!second && (best.confidence-second.confidence)<.08;
    return {...best,ambiguous,candidates:candidates.slice(0,3)};
  }

  function inferFocus(analysis){
    if(!analysis||analysis.intent==='unknown')return state.focus;
    const map={
      mini_hub:'mini_hub',briefing:'operation',mora:'mora',scoring:'scoring',
      mi_liquidacion:'liquidaciones',control_liquidaciones:'liquidaciones',open_access:analysis.target||'access'
    };
    return map[analysis.intent]||state.focus;
  }

  function think(raw,meta={}){
    const previousFocus=state.focus;
    const reference=resolveReference(raw);
    const analysis=classify(raw);
    analysis.raw=String(raw||'');
    analysis.normalized=normalize(raw);
    analysis.at=Date.now();
    analysis.source=meta.source||'command';
    analysis.previousFocus=previousFocus;
    analysis.reference=reference;
    analysis.focus=inferFocus(analysis);
    if(analysis.intent==='unknown' && reference.referent){
      analysis.focus=reference.referent.focus||previousFocus;
      analysis.contextual=true;
      analysis.ambiguous=reference.ambiguous;
      analysis.confidence=Math.max(analysis.confidence,reference.confidence);
    }
    state.focus=analysis.focus;
    state.lastAnalysis=analysis;
    remember({
      type:'input',text:analysis.raw,intent:analysis.intent,confidence:analysis.confidence,
      focus:analysis.focus,contextual:!!analysis.contextual,reference:reference.hasReference?reference.cue:null
    });
    return analysis;
  }

  function recordAction(action,detail={}){
    state.lastAction={action,detail,at:Date.now(),analysis:state.lastAnalysis};
    remember({type:'action',action,detail,intent:state.lastAnalysis?.intent||null});
    const a=state.lastAnalysis;
    if(a && a.intent!=='unknown' && a.focus){
      pushContext({focus:a.focus,target:a.target||null,label:a.label||a.focus,intent:a.intent});
    }
    return state.lastAction;
  }

  function confidenceLabel(n){
    if(n>=.9)return 'alta';
    if(n>=.65)return 'media';
    return 'baja';
  }

  function explain(){
    const a=state.lastAnalysis;
    if(!a)return 'Todavía no tengo una decisión reciente para explicarte.';
    const intentLabels={
      briefing:'un resumen operativo',open_access:'abrir un acceso',mini_hub:'una consulta del Mini Hub',
      mora:'una acción de Mora',scoring:'una acción de Scoring',mi_liquidacion:'una consulta de liquidación',
      control_liquidaciones:'un control de liquidaciones',unknown:'una intención que todavía no pude identificar'
    };
    let text=`Entendí ${intentLabels[a.intent]||a.intent}, con confianza ${confidenceLabel(a.confidence)}`;
    if(a.label)text+=`, apuntando a ${a.label}`;
    if(a.entities){
      const bits=[];
      if(a.entities.sex)bits.push(a.entities.sex==='m'?'mujer':'varón');
      if(a.entities.age!==null)bits.push(`edad ${a.entities.age}`);
      if(a.entities.unit)bits.push(a.entities.unit==='meses'?'en meses':'en años');
      if(bits.length)text+=`. Detecté ${bits.join(', ')}`;
    }
    const r=a.reference;
    if(r?.hasReference){
      if(r.referent?.label)text+=`. Tomé “${r.cue}” como referencia a ${r.referent.label}`;
      else text+=`. Detecté una referencia contextual, pero no tengo suficiente contexto para resolverla con seguridad`;
    }else if(r?.continuation){
      text+='. También detecté que la frase continúa el tema anterior';
    }
    if(r?.sequence)text+='. La palabra “después” indica que probablemente haya más de una acción y debería intervenir el planificador';
    if(a.ambiguous||r?.ambiguous)text+='. Hay más de una interpretación posible, así que una acción sensible debería confirmarse';
    return text+'.';
  }

  function snapshot(){
    return {
      version:VERSION,
      mode:state.mode,
      focus:state.focus,
      lastAnalysis:state.lastAnalysis?{...state.lastAnalysis}:null,
      lastAction:state.lastAction?{...state.lastAction}:null,
      recentContext:state.context.slice(-6).map(x=>({...x})),
      recentTurns:state.turns.slice(-8).map(x=>({...x}))
    };
  }

  function isMetaExplain(raw){
    const q=normalize(raw);
    return /\b(que entendiste|que interpretaste|por que hiciste|por que elegiste|explicame que entendiste|explica tu decision)\b/.test(q);
  }

  function canonicalAccessReference(raw,analysis){
    const q=normalize(raw);
    const r=analysis?.reference;
    if(!r?.referent?.target || r.ambiguous)return null;
    const explicitOpen=/\b(abri|abrir|abre|abrime|abreme|volver a abrir|volvelo a abrir|volvela a abrir)\b/.test(q);
    if(!explicitOpen && !r.repeat)return null;
    try{
      const entry=window.ZERO_ACCESS?.registry?.[r.referent.target];
      if(!entry)return null;
      return entry.aliases?.[0]||entry.label||null;
    }catch(e){return null;}
  }

  safeLoad();

  const previousRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(previousRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      if(isMetaExplain(raw)){
        const text=explain();
        try{commandFeedback.textContent=text;commandFeedback.classList.remove('error')}catch(e){}
        try{if(typeof speak==='function')speak(text)}catch(e){}
        recordAction('explain_last_decision',{spoken:fromVoice});
        return;
      }

      const analysis=think(raw,{source:fromVoice?'voice':'text'});
      const contextualAccess=canonicalAccessReference(raw,analysis);
      if(contextualAccess){
        const result=previousRun(contextualAccess,fromVoice);
        recordAction('resolved_context_and_delegated',{
          intent:'open_access',referent:analysis.reference.referent.target,confidence:analysis.reference.confidence
        });
        return result;
      }

      // v0.2 interpreta contexto; la ejecucion general sigue en los modulos estables existentes.
      const result=previousRun(value,fromVoice);
      recordAction('delegated_to_existing_stack',{intent:analysis.intent,confidence:analysis.confidence});
      return result;
    };
  }

  window.ZERO_BRAIN={
    version:VERSION,
    think,
    classify,
    resolveReference,
    remember,
    explain,
    snapshot,
    recordAction,
    clearMemory(){
      state.turns=[];state.context=[];state.focus=null;state.lastAnalysis=null;state.lastAction=null;
      try{localStorage.removeItem(MEMORY_KEY)}catch(e){}
    }
  };
})();
