// ZERO Memory Adapter v0.3
// Interfaz unica de memoria. Hoy usa localStorage como fallback y queda lista
// para ZERO Local Core sin acoplar el cerebro al mecanismo de persistencia.
(function(){
  'use strict';

  const VERSION='0.3.0';
  const STORAGE_KEY='zero:persistent-memory:v03';
  const MAX_EVENTS=120;
  const MAX_FACTS=80;
  const MAX_PATTERNS=60;

  const DEFAULT_MEMORY={
    schema_version:'0.3.0',
    semantic_memory:{facts:[],aliases:[],relationships:[],learned_patterns:[]},
    episodic_memory:{sessions:[],important_events:[]},
    operational_memory:{tools:{},systems:{},last_known_status:{},pending_tasks:[]},
    decisions:[],
    audit:{events:[],quality_reviews:[]}
  };

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function now(){return new Date().toISOString();}
  function id(prefix='mem'){
    try{return `${prefix}_${crypto.randomUUID()}`;}catch(e){return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;}
  }
  function normalize(value){
    return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s_-]/g,' ').replace(/\s+/g,' ').trim();
  }
  function mergeDefaults(value){
    const src=value&&typeof value==='object'?value:{};
    return {
      ...clone(DEFAULT_MEMORY),...src,
      semantic_memory:{...clone(DEFAULT_MEMORY.semantic_memory),...(src.semantic_memory||{})},
      episodic_memory:{...clone(DEFAULT_MEMORY.episodic_memory),...(src.episodic_memory||{})},
      operational_memory:{...clone(DEFAULT_MEMORY.operational_memory),...(src.operational_memory||{})},
      audit:{...clone(DEFAULT_MEMORY.audit),...(src.audit||{})}
    };
  }

  class LocalStorageMemoryProvider{
    constructor(){this.name='localStorage';}
    async load(){
      try{return mergeDefaults(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}
      catch(e){return mergeDefaults(null);}
    }
    async save(memory){
      localStorage.setItem(STORAGE_KEY,JSON.stringify(memory));
      return {ok:true,provider:this.name};
    }
    async available(){return true;}
  }

  class LocalCoreMemoryProvider{
    constructor(baseUrl='http://127.0.0.1:8765'){this.name='local-core';this.baseUrl=baseUrl.replace(/\/$/,'');}
    async available(){
      try{const r=await fetch(`${this.baseUrl}/health`,{signal:AbortSignal.timeout(700)});return r.ok;}
      catch(e){return false;}
    }
    async load(){
      const r=await fetch(`${this.baseUrl}/memory/snapshot`);
      if(!r.ok)throw new Error(`memory_load_${r.status}`);
      return mergeDefaults(await r.json());
    }
    async save(memory){
      const r=await fetch(`${this.baseUrl}/memory/events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'snapshot_merge',memory})});
      if(!r.ok)throw new Error(`memory_save_${r.status}`);
      return {ok:true,provider:this.name};
    }
  }

  let provider=new LocalStorageMemoryProvider();
  let memory=mergeDefaults(null);
  let ready=false;

  async function init(){
    const remote=new LocalCoreMemoryProvider();
    if(await remote.available()){
      try{memory=await remote.load();provider=remote;ready=true;return snapshot();}catch(e){}
    }
    provider=new LocalStorageMemoryProvider();
    memory=await provider.load();ready=true;return snapshot();
  }

  async function persist(){
    try{return await provider.save(memory);}
    catch(e){
      provider=new LocalStorageMemoryProvider();
      return provider.save(memory);
    }
  }

  function boundedPush(array,item,max){array.push(item);if(array.length>max)array.splice(0,array.length-max);}

  async function rememberFact(subject,predicate,value,meta={}){
    const key=[normalize(subject),normalize(predicate),normalize(value)].join('|');
    const facts=memory.semantic_memory.facts;
    const existing=facts.find(x=>x.key===key);
    if(existing){existing.last_seen=now();existing.hits=(existing.hits||1)+1;Object.assign(existing.meta||={},meta);}
    else boundedPush(facts,{id:id('fact'),key,subject,predicate,value,created_at:now(),last_seen:now(),hits:1,meta},MAX_FACTS);
    await persist();return {ok:true,key};
  }

  async function learnAlias(alias,target,meta={}){
    const a=normalize(alias),t=normalize(target);
    if(!a||!t)return {ok:false,reason:'invalid_alias'};
    const list=memory.semantic_memory.aliases;
    const existing=list.find(x=>normalize(x.alias)===a);
    if(existing){existing.target=target;existing.updated_at=now();existing.meta={...(existing.meta||{}),...meta};}
    else boundedPush(list,{id:id('alias'),alias,target,created_at:now(),meta},MAX_PATTERNS);
    await persist();return {ok:true};
  }

  async function learnRelationship(from,relation,to,meta={}){
    const key=[normalize(from),normalize(relation),normalize(to)].join('|');
    const list=memory.semantic_memory.relationships;
    if(!list.some(x=>x.key===key))boundedPush(list,{id:id('rel'),key,from,relation,to,created_at:now(),meta},MAX_PATTERNS);
    await persist();return {ok:true};
  }

  async function recordDecision(decision={}){
    boundedPush(memory.decisions,{id:id('decision'),at:now(),...decision},MAX_EVENTS);
    await persist();return {ok:true};
  }

  async function audit(event,detail={}){
    boundedPush(memory.audit.events,{id:id('audit'),at:now(),event,detail},MAX_EVENTS);
    await persist();return {ok:true};
  }

  function scoreText(query,item){
    const q=new Set(normalize(query).split(' ').filter(Boolean));
    if(!q.size)return 0;
    const words=new Set(normalize(JSON.stringify(item)).split(' ').filter(Boolean));
    let hits=0;q.forEach(w=>{if(words.has(w))hits++;});
    return hits/q.size;
  }

  function query(text,{limit=6}={}){
    const pools=[
      ...memory.semantic_memory.facts.map(x=>({type:'fact',...x})),
      ...memory.semantic_memory.aliases.map(x=>({type:'alias',...x})),
      ...memory.semantic_memory.relationships.map(x=>({type:'relationship',...x})),
      ...memory.semantic_memory.learned_patterns.map(x=>({type:'pattern',...x})),
      ...memory.episodic_memory.important_events.map(x=>({type:'episode',...x}))
    ];
    return pools.map(item=>({item,score:scoreText(text,item)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
  }

  function snapshot(){return {version:VERSION,provider:provider.name,ready,memory:clone(memory)};}

  window.ZERO_MEMORY={
    version:VERSION,init,snapshot,query,rememberFact,learnAlias,learnRelationship,recordDecision,audit,
    provider(){return provider.name;},
    async reset(){memory=mergeDefaults(null);await persist();return snapshot();}
  };

  init().catch(()=>{});
})();
