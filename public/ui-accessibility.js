(()=>{
  // Melhorias de acessibilidade sem interferir em regras ou estados do jogo.
  const labels={
    soundToggle:'Ativar ou desativar sons do jogo',
    reset:'Reiniciar partida',resetBtn:'Reiniciar partida',
    quickRulesBtn:'Abrir regras',rulesBtn:'Abrir regras da Arena',
    replayBtn:'Abrir replay'
  };
  for(const [id,label] of Object.entries(labels)){
    const el=document.getElementById(id); if(el && !el.getAttribute('aria-label')) el.setAttribute('aria-label',label);
  }
  const vol=document.getElementById('volumeControl'); if(vol && !vol.getAttribute('aria-label')) vol.setAttribute('aria-label','Volume dos sons do jogo');
  const room=document.getElementById('roomCode'); if(room && !room.getAttribute('aria-label')) room.setAttribute('aria-label','Código da sala');
  for(const id of ['status','phase','connectionStatus','readyStatus']){
    const el=document.getElementById(id); if(el){el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');}
  }
  // Os cards de escolha de modalidade da Arena também funcionam por teclado.
  for(const id of ['soloMode','onlineMode']){
    const el=document.getElementById(id); if(!el) continue;
    el.setAttribute('role','button'); el.setAttribute('tabindex','0');
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});
  }
  const set=(el,name,value)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
  const style=document.createElement('style');style.textContent='.tri-cell:focus,.tri-cell.keyboard-focus{stroke:#fff2a8!important;stroke-width:4!important;outline:none!important}.board-svg [tabindex]:focus,.board-svg [tabindex]:focus-visible{outline:none!important}.cell:focus-visible{outline:3px solid #fff2a8;outline-offset:2px}';document.head.appendChild(style);
  function visible(el){for(let p=el;p&&p.nodeType===1;p=p.parentElement){if(p.hidden||p.classList.contains('hidden'))return false;const css=getComputedStyle(p);if(css.display==='none'||css.visibility==='hidden')return false;}return true;}
  const focusable=dialog=>[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(visible);
  let dialogs=[],lastDialog=null;
  const origins=new WeakMap();
  function restore(el){if(el?.isConnected){el.focus?.();return;}const piece=el?.getAttribute?.('data-piece'),cell=el?.getAttribute?.('data-id'),coord=el?.getAttribute?.('data-coord');const selector=piece?`[data-piece="${CSS.escape(piece)}"]`:cell?`[data-id="${CSS.escape(cell)}"]`:coord?`[data-coord="${CSS.escape(coord)}"]`:null;if(selector)document.querySelector(selector)?.focus();}
  function sync(){
    // A descrição usa exclusivamente conteúdo que já foi renderizado na visão filtrada.
    for(const cell of document.querySelectorAll('button.cell[data-coord]')){
      const parts=[`Casa ${cell.dataset.coord}`,...[...cell.querySelectorAll('img[alt]')].map(i=>i.alt).filter(Boolean)];
      if(cell.textContent.trim())parts.push(cell.textContent.trim().replace(/\s+/g,' '));
      if(cell.classList.contains('highlight'))parts.push('Destino disponível');
      if(cell.classList.contains('attack-highlight'))parts.push('Alcance de ataque');
      set(cell,'aria-label',parts.join('. ').slice(0,400));
    }
    for(const list of document.querySelectorAll('.qr-tabs')){
      set(list,'role','tablist');const buttons=[...list.querySelectorAll('.qr-tab')];
      for(const [i,tab] of buttons.entries()){const active=tab.classList.contains('active');set(tab,'role','tab');set(tab,'aria-selected',String(active));set(tab,'tabindex',active?'0':'-1');if(!tab.id)tab.id=`${list.closest('[id]')?.id||'rules'}-tab-${i}`;const page=list.parentElement.querySelector(`.qr-page[data-page="${CSS.escape(tab.dataset.tab)}"]`);if(page){if(!page.id)page.id=tab.id+'-panel';set(tab,'aria-controls',page.id);set(page,'role','tabpanel');set(page,'aria-labelledby',tab.id);}}
    }
    for(const replay of document.querySelectorAll('.replay-overlay')){set(replay,'role','dialog');set(replay,'aria-modal','true');set(replay,'aria-label','Replay da partida');const range=replay.querySelector('[data-range]');if(range)set(range,'aria-label','Quadro do replay');}
    const current=[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(visible),top=current.at(-1)||null;
    for(const dialog of current)if(!dialogs.includes(dialog)){origins.set(dialog,document.activeElement);(focusable(dialog)[0]||dialog).focus();}
    if(lastDialog&&!current.includes(lastDialog))restore(origins.get(lastDialog));
    dialogs=current;lastDialog=top;
  }
  document.addEventListener('keydown',e=>{
    const top=dialogs.at(-1);
    if(e.key==='Escape'&&top){const close=top.querySelector('[data-close],#quickRulesClose,#closeRules');if(close){e.preventDefault();close.click();}return;}
    if(e.key==='Tab'&&top){const items=focusable(top);if(!items.length){e.preventDefault();return;}const first=items[0],last=items.at(-1),active=document.activeElement;if(!top.contains(active)||(e.shiftKey&&active===first)||(!e.shiftKey&&active===last)){e.preventDefault();(e.shiftKey?last:first).focus();}return;}
    const tab=e.target.closest?.('.qr-tab');if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){const tabs=[...tab.parentElement.querySelectorAll('.qr-tab')],i=tabs.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;e.preventDefault();tabs[next].click();tabs[next].focus();return;}
    const cell=e.target.closest?.('button.cell[data-coord]');if(cell&&e.key.startsWith('Arrow')){const c=cell.dataset.coord,x=c.charCodeAt(0)+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0),y=Number(c.slice(1))+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0);if(x>=65&&x<=72&&y>=1&&y<=8){e.preventDefault();document.querySelector(`button.cell[data-coord="${String.fromCharCode(x)+y}"]`)?.focus();}}
  });
  new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});sync();
})();
