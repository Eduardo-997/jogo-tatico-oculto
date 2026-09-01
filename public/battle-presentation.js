(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function isBattleEvent(t){
    if(!t)return false;
    const s=String(t);
    if(/Confronto|repelid/i.test(s))return true;
    if(/☠️|🏆|⚖️|Derrota|Vit[oó]ria|eliminad|morreu|caiu definitivamente|perda original/i.test(s))return true;
    if(/🏚️/.test(s)&&/Posto/i.test(s))return true;
    if(/armadilha inimiga|Armadilha do Caçador atingiu/i.test(s))return true;
    if(/👻/.test(s)&&/(possu|recuper|expuls|hospedeiro)/i.test(s))return true;
    if(/🌋/.test(s)&&/(Seu Golem|sofreu|Confronto)/i.test(s))return true;
    if(/(?:⚔️|🎯|🟢|🧟)/.test(s)&&/(Seu |sua |ataque distante|foi atingido|sofreu|caiu)/i.test(s))return true;
    if(/⚠️/.test(s)&&/(Seu |sua )/i.test(s))return true;
    return false;
  }

  function battleEvents(history,limit=5){
    return (history||[]).filter(isBattleEvent).slice(0,limit);
  }

  let overlay=null,lastKey='';
  function hideEndScreen(){if(overlay){overlay.remove();overlay=null;}lastKey='';}
  function showEndScreen(opts={}){
    const key=opts.key||`${opts.mode||''}:${opts.result||''}:${opts.round||''}`;
    if(overlay&&lastKey===key)return;
    hideEndScreen();lastKey=key;
    overlay=document.createElement('div');overlay.className='endgame-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','endgameTitle');
    const rows=(opts.summary||[]).map(x=>`<div class="endgame-stat"><span>${esc(x.label)}</span><b>${esc(x.value)}</b></div>`).join('');
    overlay.innerHTML=`<div class="endgame-card ${esc(opts.tone||'')}">
      <div class="endgame-kicker">FIM DA BATALHA</div>
      <h2 id="endgameTitle">${esc(opts.icon||'🏁')} ${esc(opts.title||'Fim da partida')}</h2>
      <div class="endgame-reason">${esc(opts.reason||'A partida terminou.')}</div>
      <div class="endgame-summary">${rows}</div>
      <div class="endgame-actions"></div>
    </div>`;
    const actions=overlay.querySelector('.endgame-actions');
    if(typeof opts.onReplay==='function'){
      const b=document.createElement('button');b.className='primary';b.textContent='🎞️ Ver Replay';b.onclick=()=>opts.onReplay();actions.appendChild(b);
    }
    const again=document.createElement('button');again.textContent='↻ Nova partida';again.onclick=()=>location.reload();actions.appendChild(again);
    if(opts.showClassicLink){const home=document.createElement('button');home.textContent='⌂ Voltar ao Clássico';home.onclick=()=>{location.href='index.html'};actions.appendChild(home);}
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.querySelector('button')?.focus());
  }
  window.BattlePresentation={battleEvents,isBattleEvent,showEndScreen,hideEndScreen};
})();
