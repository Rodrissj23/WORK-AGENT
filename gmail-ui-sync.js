// ZERO Gmail UI sync v1.0
(function(){
  'use strict';
  function paint(connected){
    const first=document.querySelector('#attention-list .attention-item');
    if(first){
      const title=first.querySelector('strong');
      const detail=first.querySelector('.attention-copy span');
      const tag=first.querySelector('.attention-tag');
      if(connected){
        if(title)title.textContent='Gmail laboral conectado';
        if(detail)detail.textContent='OAuth local activo y telemetría disponible para ZERO.';
        if(tag)tag.textContent='OK';
        first.classList.remove('medium');first.classList.add('ok');
      }else{
        if(title)title.textContent='Gmail laboral sin telemetría local';
        if(detail)detail.textContent='La integración está configurada; falta levantar el núcleo local en este equipo.';
        if(tag)tag.textContent='LOCAL OFF';
        first.classList.remove('ok');first.classList.add('medium');
      }
    }
    document.querySelectorAll('#future .future-item').forEach(item=>{
      const strong=item.querySelector('strong');
      const desc=item.querySelector('span');
      if(strong&&/gmail/i.test(strong.textContent||'')){
        strong.textContent=connected?'✉ Gmail · integrado':'✉ Gmail · configurado';
        if(desc)desc.textContent=connected?'Lectura local y estado operativo disponibles en ZERO.':'OAuth listo; requiere el núcleo local para consultar estado.';
      }
    });
  }
  async function sync(){
    try{
      const systems=window.WA_STATUS?.refresh?await window.WA_STATUS.refresh():null;
      paint(!!systems?.gmail?.connected);
    }catch(e){paint(false)}
  }
  sync();setTimeout(sync,900);setInterval(sync,60000);
  window.ZERO_GMAIL_UI={sync};
})();
