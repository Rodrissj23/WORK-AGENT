// ZERO Cognitive Learning v0.1
// Aprendizaje explicito y conservador sobre ZERO_MEMORY.
(function(){
  'use strict';
  const VERSION='0.1.0';

  function normalize(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();
  }
  function cleanWake(v){
    return String(v||'').replace(/^\s*(zero|cero)\s*[,.:;-]?\s*/i,'').trim();
  }
  function say(text,error=false){
    try{commandFeedback.textContent=text;commandFeedback.classList.toggle('error',!!error)}catch(e){}
    try{if(typeof speak==='function')speak(text)}catch(e){}
  }

  function parseRemember(raw){
    const text=cleanWake(raw);
    const q=normalize(text);
    const prefixes=['recorda que ','recordame que ','acordate que ','quiero que recuerdes que ','guarda que ','aprende que '];
    for(const prefix of prefixes){
      if(q.startsWith(prefix)){
        const idx=q.indexOf(prefix)+prefix.length;
        const normalizedContent=q.slice(idx).trim();
        if(!normalizedContent)return null;
        // Conservamos el texto original removiendo el prefijo de forma tolerante.
        const original=text.replace(/^\s*(record[aá]|recordame|acordate|quiero que recuerdes|guard[aá]|aprend[eé])\s+que\s+/i,'').trim();
        return original||normalizedContent;
      }
    }
    return null;
  }

  function parseRecall(raw){
    const q=normalize(cleanWake(raw));
    const patterns=[
      /^que recordas de (.+)$/,
      /^que sabes de (.+)$/,
      /^que tenes guardado de (.+)$/,
      /^recordame (.+)$/
    ];
    for(const re of patterns){const m=q.match(re);if(m)return m[1].trim();}
    return null;
  }

  async function learn(content){
    if(!window.ZERO_MEMORY?.remember)return false;
    const result=await window.ZERO_MEMORY.remember({
      type:'semantic',subject:null,content,source:'explicit_user',confidence:1,status:'confirmed',tags:['explicit','user']
    });
    if(!result?.ok){say('No pude guardar eso en memoria.',true);return true;}
    say('Listo, lo voy a recordar.');
    try{window.ZERO_BRAIN?.remember?.({type:'memory_write',memoryId:result.item?.id||null,content})}catch(e){}
    return true;
  }

  async function recall(query){
    if(!window.ZERO_MEMORY?.search)return false;
    const items=await window.ZERO_MEMORY.search(query,{limit:4,includeCandidates:false});
    if(!items.length){say(`No tengo nada confirmado guardado sobre ${query}.`);return true;}
    const unique=[];const seen=new Set();
    for(const x of items){const c=String(x.content||'').trim();if(c&&!seen.has(c)){seen.add(c);unique.push(c);}}
    const message=unique.length===1?`Recuerdo que ${unique[0]}.`:`Tengo estas cosas guardadas: ${unique.join('. Además, ')}.`;
    say(message);
    try{window.ZERO_BRAIN?.remember?.({type:'memory_recall',query,count:unique.length})}catch(e){}
    return true;
  }

  const previousRun=window.runCommand || (typeof runCommand!=='undefined'?runCommand:null);
  if(previousRun){
    window.runCommand=runCommand=function(value=null,fromVoice=false){
      const raw=String(value!==null?value:(typeof commandInput!=='undefined'?commandInput.value:'')).trim();
      const content=parseRemember(raw);
      if(content){learn(content);return;}
      const query=parseRecall(raw);
      if(query){recall(query);return;}
      return previousRun(value,fromVoice);
    };
  }

  window.ZERO_LEARNING={version:VERSION,parseRemember,parseRecall,learn,recall};
})();
