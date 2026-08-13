// ZERO voice-natural v1
// TTS mas natural sobre Web Speech: voz espanola preferida + ritmo y pausas suaves.
(function(){
  const STATE={voice:null,rate:.9,pitch:.98,volume:1};

  function pickVoice(){
    if(!('speechSynthesis' in window))return null;
    const voices=window.speechSynthesis.getVoices();
    const es=voices.filter(v=>/^es([-_]|$)/i.test(v.lang));
    STATE.voice=
      es.find(v=>/argentin|es-ar/i.test(`${v.name} ${v.lang}`))||
      es.find(v=>/natural|neural|google|microsoft/i.test(v.name))||
      es[0]||voices[0]||null;
    return STATE.voice;
  }

  function humanize(text){
    let t=String(text||'').trim();
    if(!t)return'';
    t=t
      .replace(/\s*→\s*/g,'. ')
      .replace(/\s*·\s*/g,'. ')
      .replace(/\bcm\b/gi,'centímetros')
      .replace(/\bkg\b/gi,'kilos')
      .replace(/\s+/g,' ')
      .replace(/([,:;])\s*/g,'$1 ')
      .trim();
    return t;
  }

  function naturalSpeak(text,opts={}){
    if(!('speechSynthesis' in window)||!text)return;
    window.speechSynthesis.cancel();
    if(!STATE.voice)pickVoice();
    const u=new SpeechSynthesisUtterance(humanize(text));
    u.lang=STATE.voice?.lang||'es-AR';
    if(STATE.voice)u.voice=STATE.voice;
    u.rate=Number(opts.rate||STATE.rate);
    u.pitch=Number(opts.pitch||STATE.pitch);
    u.volume=Number(opts.volume||STATE.volume);
    window.speechSynthesis.speak(u);
    return u;
  }

  if('speechSynthesis' in window){
    pickVoice();
    const prev=window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged=()=>{try{prev&&prev()}catch(e){}pickVoice()};
  }

  // Sobrescribe la funcion speak global sin tocar el resto del cerebro.
  window.speak=naturalSpeak;

  window.ZERO_VOICE={
    version:'1.0',
    speak:naturalSpeak,
    pickVoice,
    getVoice:()=>STATE.voice,
    settings:STATE
  };
})();
