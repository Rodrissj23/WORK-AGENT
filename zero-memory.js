// ZERO Memory v0.1
// Contrato de memoria persistente. Primera etapa: localStorage.
(function(){
  'use strict';
  const VERSION='0.1.0';
  const KEY='zero:persistent-memory:v1';
  const MAX=300;

  function now(){return new Date().toISOString();}
  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'{}');
      return {items:Array.isArray(x.items)?x.items:[],version:x.version||1};
    }catch(e){return {items:[],version:1};}
  }
  function save(db){
    db.items=db.items.slice(-MAX);
    localStorage.setItem(KEY,JSON.stringify(db));
  }
  function id(){return 'mem_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
  function normalize(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}

  function remember(input={}){
    if(!input.content)return {ok:false,error:'content_required'};
    const db=load();
    const t=now();
    const item={
      id:id(),type:input.type||'episodic',subject:input.subject||null,
      content:String(input.content),source:input.source||'system',
      confidence:Number.isFinite(input.confidence)?Math.max(0,Math.min(1,input.confidence)):.7,
      created_at:t,updated_at:t,last_used_at:null,use_count:0,
      status:input.status||(input.source==='inference'?'candidate':'confirmed'),
      tags:Array.isArray(input.tags)?input.tags:[],evidence:Array.isArray(input.evidence)?input.evidence:[]
    };
    db.items.push(item);save(db);return {ok:true,item:{...item}};
  }

  function search(query='',options={}){
    const db=load();const q=normalize(query);const tags=(options.tags||[]).map(normalize);
    let items=db.items.filter(x=>x.status!=='forgotten'&&x.status!=='superseded');
    if(options.type)items=items.filter(x=>x.type===options.type);
    if(!options.includeCandidates)items=items.filter(x=>x.status!=='candidate');
    items=items.map(x=>{
      const hay=normalize([x.subject,x.content,(x.tags||[]).join(' ')].join(' '));
      let score=q?(hay.includes(q)?4:q.split(' ').filter(Boolean).reduce((s,w)=>s+(hay.includes(w)?1:0),0)):1;
      for(const tag of tags)if(hay.includes(tag))score+=2;
      score+=Math.min(2,(x.use_count||0)*.1)+(x.confidence||0);
      return {x,score};
    }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,options.limit||6);
    if(options.touch!==false&&items.length){
      const ids=new Set(items.map(r=>r.x.id));const t=now();
      db.items=db.items.map(x=>ids.has(x.id)?{...x,last_used_at:t,use_count:(x.use_count||0)+1}:x);save(db);
    }
    return items.map(r=>({...r.x,relevance:r.score}));
  }

  function correct(memoryId,replacement){
    const db=load();const old=db.items.find(x=>x.id===memoryId);
    if(!old)return {ok:false,error:'not_found'};
    old.status='superseded';old.updated_at=now();save(db);
    return remember({...replacement,type:replacement.type||old.type,subject:replacement.subject||old.subject,source:replacement.source||'explicit_user',evidence:[...(replacement.evidence||[]),{supersedes:memoryId}]});
  }

  function forget(memoryId){
    const db=load();const x=db.items.find(m=>m.id===memoryId);if(!x)return false;
    x.status='forgotten';x.updated_at=now();save(db);return true;
  }

  function snapshot(){const db=load();return {version:VERSION,count:db.items.length,items:db.items.map(x=>({...x}))};}

  window.ZERO_MEMORY={version:VERSION,remember,search,correct,forget,snapshot};
})();
