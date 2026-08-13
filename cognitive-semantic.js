// ZERO Semantic Retrieval v0.1
// Convierte memorias confirmadas en contexto util para interpretar lenguaje habitual.
(function(){
  'use strict';
  const VERSION='0.1.0';
  const REFRESH_MS=20000;
  let items=[];
  let relations=[];
  let refreshedAt=0;

  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();}
  function words(v){return norm(v).split(' ').filter(x=>x.length>2&&!['que','para','con','del','los','las','una','uno'].includes(x));}
  function overlap(a,b){const A=new Set(words(a)),B=new Set(words(b));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.max(1,Math.min(A.size,B.size));}

  function parseRelation(memory){
    if(!memory||memory.status!=='confirmed')return null;
    const raw=String(memory.content||'').trim();
    const q=norm(raw);
    const patterns=[
      /^cuando digo (.+?) me refiero a (.+)$/,
      /^cuando digo (.+?) quiero decir (.+)$/,
      /^(.+?) significa (.+)$/,
      /^para (.+?) uso (.+)$/,
      /^cuando hablo de (.+?) me refiero a (.+)$/
    ];
    for(const re of patterns){
      const m=q.match(re);
      if(m&&m[1]&&m[2])return {memoryId:memory.id,source:m[1].trim(),target:m[2].trim(),confidence:Number(memory.confidence||1),memory};
    }
    return null;
  }

  function rebuild(list){
    items=Array.isArray(list)?list.filter(x=>x&&x.status==='confirmed'):[];
    relations=items.map(parseRelation).filter(Boolean);
    refreshedAt=Date.now();
    return relations;
  }

  async function refresh(){
    try{
      const snap=await window.ZERO_MEMORY?.snapshot?.();
      if(snap?.items)rebuild(snap.items);
    }catch(e){}
    return snapshot();
  }

  function matchRelation(raw){
    const q=norm(raw);let best=null;
    for(const r of relations){
      const exact=q.includes(r.source);
      const score=exact?1:overlap(q,r.source);
      if(score<.55)continue;
      const final=score*Math.max(.5,r.confidence||0);
      if(!best||final>best.score)best={...r,score:final,exact};
    }
    return best;
  }

  function resolveTarget(target,baseClassifier){
    try{
      const access=window.ZERO_ACCESS?.match?.(target);
      if(access)return {intent:'open_access',target:access.id,label:access.entry?.label||access.id,confidence:.94};
    }catch(e){}
    try{
      const a=baseClassifier?.(target);
      if(a&&a.intent!=='unknown'&&a.confidence>=.65)return {...a};
    }catch(e){}
    return null;
  }

  function enrich(raw,baseAnalysis,baseClassifier){
    const base=baseAnalysis?{...baseAnalysis}:{intent:'unknown',confidence:.18,ambiguous:true,candidates:[]};
    // Una orden explicita y clara siempre gana sobre la memoria.
    if(base.confidence>=.90&&!base.ambiguous)return base;
    const rel=matchRelation(raw);
    if(!rel)return base;
    const resolved=resolveTarget(rel.target,baseClassifier);
    if(!resolved)return base;

    const memoryConfidence=Math.min(.92,.68+(rel.score*.22));
    if(base.intent!=='unknown'&&base.confidence>memoryConfidence)return base;
    return {
      ...resolved,
      confidence:Math.max(Number(resolved.confidence||0)*.92,memoryConfidence),
      ambiguous:false,
      contextual:true,
      semanticMemory:{id:rel.memoryId,source:rel.source,target:rel.target,match:rel.score},
      candidates:[resolved,...(base.candidates||[])].slice(0,3)
    };
  }

  function snapshot(){return {version:VERSION,refreshedAt,count:items.length,relations:relations.map(r=>({memoryId:r.memoryId,source:r.source,target:r.target,confidence:r.confidence}))};}

  window.ZERO_SEMANTIC={version:VERSION,refresh,rebuild,enrich,matchRelation,snapshot};
  refresh();
  setInterval(refresh,REFRESH_MS);
})();
