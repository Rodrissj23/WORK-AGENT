// ZERO Memory v0.2
// Persistent Mind: ZERO Local Core (SQLite) con fallback automatico a localStorage.
(function(){
  'use strict';
  const VERSION='0.2.0';
  const BASE='http://127.0.0.1:8765';
  const KEY='zero:persistent-memory:v1';
  const MAX=300;
  let backend='probing';

  function now(){return new Date().toISOString();}
  function id(){return 'mem_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
  function normalize(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}

  function loadLocal(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'{}');
      return {items:Array.isArray(x.items)?x.items:[],version:x.version||1};
    }catch(e){return {items:[],version:1};}
  }
  function saveLocal(db){
    db.items=db.items.slice(-MAX);
    try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}
  }

  function localRemember(input={}){
    if(!input.content)return {ok:false,error:'content_required'};
    const db=loadLocal();const t=now();
    const item={
      id:id(),type:input.type||'episodic',subject:input.subject||null,
      content:String(input.content),source:input.source||'system',
      confidence:Number.isFinite(input.confidence)?Math.max(0,Math.min(1,input.confidence)):.7,
      created_at:t,updated_at:t,last_used_at:null,use_count:0,
      status:input.status||(input.source==='inference'?'candidate':'confirmed'),
      tags:Array.isArray(input.tags)?input.tags:[],evidence:Array.isArray(input.evidence)?input.evidence:[]
    };
    db.items.push(item);saveLocal(db);return {ok:true,item:{...item},backend:'localStorage'};
  }

  function localSearch(query='',options={}){
    const db=loadLocal();const q=normalize(query);const tags=(options.tags||[]).map(normalize);
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
    return items.map(r=>({...r.x,relevance:r.score}));
  }

  async function probe(){
    try{
      const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),900);
      const res=await fetch(`${BASE}/health`,{signal:ctl.signal,cache:'no-store'});clearTimeout(timer);
      const data=await res.json();
      backend=(res.ok&&data?.persistent_memory)?'sqlite':'localStorage';
    }catch(e){backend='localStorage';}
    return backend;
  }

  async function request(path,options={}){
    if(backend==='probing')await probe();
    if(backend!=='sqlite')throw new Error('sqlite_unavailable');
    const res=await fetch(BASE+path,{cache:'no-store',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
    return data;
  }

  async function remember(input={}){
    if(!input.content)return {ok:false,error:'content_required'};
    try{
      const data=await request('/memory',{method:'POST',body:JSON.stringify(input)});
      return {...data,backend:'sqlite'};
    }catch(e){return localRemember(input);}
  }

  async function search(query='',options={}){
    try{
      if(backend==='probing')await probe();
      if(backend!=='sqlite')return localSearch(query,options);
      const p=new URLSearchParams();p.set('q',query||'');p.set('limit',String(options.limit||6));
      if(options.type)p.set('type',options.type);
      if(options.includeCandidates)p.set('include_candidates','1');
      if(options.touch===false)p.set('touch','0');
      const data=await request('/memory/search?'+p.toString());
      return data.items||[];
    }catch(e){return localSearch(query,options);}
  }

  async function correct(memoryId,replacement={}){
    try{
      if(backend==='probing')await probe();
      if(backend==='sqlite'){
        await request(`/memory/${encodeURIComponent(memoryId)}`,{method:'PATCH',body:JSON.stringify({status:'superseded'})});
        return await remember({...replacement,source:replacement.source||'explicit_user',evidence:[...(replacement.evidence||[]),{supersedes:memoryId}]});
      }
    }catch(e){}
    const db=loadLocal();const old=db.items.find(x=>x.id===memoryId);
    if(!old)return {ok:false,error:'not_found'};
    old.status='superseded';old.updated_at=now();saveLocal(db);
    return localRemember({...replacement,type:replacement.type||old.type,subject:replacement.subject||old.subject,source:replacement.source||'explicit_user',evidence:[...(replacement.evidence||[]),{supersedes:memoryId}]});
  }

  async function forget(memoryId){
    try{
      if(backend==='probing')await probe();
      if(backend==='sqlite'){
        await request(`/memory/${encodeURIComponent(memoryId)}`,{method:'DELETE'});return true;
      }
    }catch(e){}
    const db=loadLocal();const x=db.items.find(m=>m.id===memoryId);if(!x)return false;
    x.status='forgotten';x.updated_at=now();saveLocal(db);return true;
  }

  async function snapshot(){
    try{
      if(backend==='probing')await probe();
      if(backend==='sqlite'){
        const data=await request('/memory?limit=300');return {version:VERSION,backend:'sqlite',count:data.count||0,items:data.items||[]};
      }
    }catch(e){}
    const db=loadLocal();return {version:VERSION,backend:'localStorage',count:db.items.length,items:db.items.map(x=>({...x}))};
  }

  window.ZERO_MEMORY={
    version:VERSION,remember,search,correct,forget,snapshot,probe,
    backend:()=>backend,
    local:{remember:localRemember,search:localSearch,snapshot:()=>loadLocal()}
  };

  probe();
})();
