// ZERO Cognitive Core v0.1
// Capa de interpretacion, memoria operativa y metacontrol.
// No reemplaza los motores existentes: observa, clasifica y explica decisiones.
(function(){
  'use strict';

  const VERSION='0.1.0';
  const MEMORY_KEY='zero:cognitive-memory:v1';
  const MAX_TURNS=24;
  const state={
    mode:'ready',
    focus:null,
    lastAnalysis:null,
    lastAction:null,
    turns:[],
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
      if(parsed.focus)state.focus=parsed.focus;
      if(parsed.lastAnalysis)state.lastAnalysis=parsed.lastAnalysis;
      if(parsed.lastAction)state.lastAction=parsed.lastAction;
    }catch(e){}
  }

  function safeSave(){
    try{
      localStorage.setItem(MEMORY_KEY,JSON.stringify({
        turns:state.turns.slice(-MAX_TURNS),
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
    const analysis=classify(raw);
    analysis.raw=String(raw||'');
    analysis.normalized=normalize(raw);
    analysis.at=Date.now();
    analysis.source=meta.source||'command';
    analysis.previousFocus=state.focus;
    analysis.focus=inferFocus(analysis);
    state.focus=analysis.focus;
    state.lastAnalysis=analysis;
    remember({type:'input',text:analysis.raw,intent:analysis.intent,confidence:analysis.confidence,focus:analysis.focus});
    return analysis;
  }

  function recordAction(action,detail={}){
    state.lastAction={action,detail,at:Date.now(),analysis:state.lastAnalysis};
    remember({type:'action',action,detail,intent:state.lastAnalysis?.intent||null});
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
    if(a.ambiguous)text+='. Vi más de una interpretación posible, así que debería pedir confirmación antes de una acción sensible';
    return text+'.';
  }

  function snapshot(){
    return {
      version:VERSION,
      mode:state.mode,
      focus:state.focus,
      lastAnalysis:state.lastAnalysis?{...state.lastAnalysis}:null,
      lastAction:state.lastAction?{...state.lastAction}:null,
      recentTurns:state.turns.slice(-8).map(x=>({...x}))
    };
  }

  function isMetaExplain(raw){
    const q=normalize(raw);
    return /\b(que entendiste|que interpretaste|por que hiciste|por que elegiste|explicame que entendiste|explica tu decision)\b/.test(q);
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
      // v0.1 observa y registra. La ejecucion sigue en los modulos estables existentes.
      const result=previousRun(value,fromVoice);
      recordAction('delegated_to_existing_stack',{intent:analysis.intent,confidence:analysis.confidence});
      return result;
    };
  }

  window.ZERO_BRAIN={
    version:VERSION,
    think,
    classify,
    remember,
    explain,
    snapshot,
    recordAction,
    clearMemory(){
      state.turns=[];state.focus=null;state.lastAnalysis=null;state.lastAction=null;
      try{localStorage.removeItem(MEMORY_KEY)}catch(e){}
    }
  };
})();
