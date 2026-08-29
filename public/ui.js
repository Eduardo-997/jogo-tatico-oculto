'use strict';
(() => {
  const R=window.GameRules;
  const referee=new window.GameReferee();
  const player=referee.createClient('player');
  const ai=referee.createClient('enemy');
  const aiWorker=window.createGameAiWorker();
  let aiReq=0,aiScheduled=false;

  const $=s=>document.querySelector(s);
  const roster=$('#roster'),board=$('#board'),historyEl=$('#history'),intelEl=$('#intel'),statusEl=$('#status'),availableEl=$('#available');
  const roundEl=$('#round'),countEl=$('#count'),myDeathsEl=$('#myDeaths'),enemyDeathsEl=$('#enemyDeaths'),phaseEl=$('#phase');
  const startBtn=$('#start'),resetBtn=$('#reset'),moveBtn=$('#move'),stopBtn=$('#stop'),attackBtn=$('#attack'),abilityBtn=$('#ability'),endBtn=$('#end'),cancelBtn=$('#cancel');
  const seerConfirm=$('#seerConfirm'),confirmSeerBtn=$('#confirmSeer'),cancelSeerBtn=$('#cancelSeer');
  const pyroConfirm=$('#pyroConfirm'),confirmPyroBtn=$('#confirmPyro'),cancelPyroBtn=$('#cancelPyro');
  const stackChoice=$('#stackChoice'),stackButtons=$('#stackButtons');
  const combatChoice=$('#combatChoice'),stayCombatBtn=$('#stayCombat'),advanceCombatBtn=$('#advanceCombat');
  const auditBtn=$('#auditBtn'),auditBox=$('#auditBox');
  const setupBasesEl=$('#setupBases'),base1Btn=$('#base1Btn'),base2Btn=$('#base2Btn'),baseSetupStatus=$('#baseSetupStatus');
  const teamSection=$('#teamSection'),teamTitle=$('#teamTitle'),teamToggle=$('#teamToggle'),readyStatus=$('#readyStatus');
  const pieceInfo=$('#pieceInfo'),pieceInfoTitle=$('#pieceInfoTitle'),pieceInfoBody=$('#pieceInfoBody'),closePieceInfoBtn=$('#closePieceInfo');
  const basePanel=$('#basePanel'),basePanelTitle=$('#basePanelTitle'),basePanelInfo=$('#basePanelInfo'),baseBonusGrid=$('#baseBonusGrid'),baseTargetArea=$('#baseTargetArea'),baseTargetGrid=$('#baseTargetGrid'),closeBasePanelBtn=$('#closeBasePanel');

  let setupSelected=null,setupBaseSelected=null,selected=[],setupPos=new Map(),setupBasePos=new Map(),cells=new Map(),seerPreview=new Set();
  let openedBaseId=null,pendingBaseBonusId=null;
  let rosterCollapsed=false,inspectedPieceId=null;
  let status='Escolha quatro personagens e posicione dois Postos.';
  const setStatus=t=>{status=t;statusEl.textContent=t;};

  function renderList(el,arr,empty){el.innerHTML='';if(!arr.length){el.innerHTML=`<div class="muted">${empty}</div>`;return;}arr.forEach((t,i)=>{const d=document.createElement('div');d.className=i<arr.length-1?'line':'';d.textContent=t;el.appendChild(d);});}
  function view(){return player.getView();}
  function ownAlive(v){return v.ownPieces.filter(p=>p.alive);}
  function ownAtAll(v,c){return ownAlive(v).filter(p=>p.coord===c);}
  function ownAt(v,c){const ps=ownAtAll(v,c);return ps.find(p=>p.name==='Escudeiro')||ps[0]||null;}
  function corpseAt(v,c){return v.corpses.some(x=>x.coord===c);}
  function ownMirrorAt(v,c){return v.ownMirrors.some(x=>x.coord===c);}
  function baseAt(v,c){return (v.bases||[]).find(b=>b.coord===c)||null;}
  function isCorner(c){const q=R.rc(c);return (q.x===0||q.x===7)&&(q.y===0||q.y===7);}
  function activePiece(v){return v.activation?ownAlive(v).find(p=>p.id===v.activation.pieceId):null;}
  function visibleAt(v,c){return (v.visibleOpponents||[]).filter(p=>p.coord===c);}
  function pieceBonusTags(p){
    const tags=[];
    if(p.bonusM)tags.push(`👟 +${p.bonusM} M`);
    if(p.bonusV)tags.push(`❤️ +${p.bonusV} V`);
    if(p.bonusA)tags.push(`⚔️ +${p.bonusA} ATQ`);
    if(p.bonusRange)tags.push(`🎯 +${p.bonusRange} ALC`);
    return tags;
  }
  function showPieceInfo(v,p,enemy=false){
    if(!p)return;
    inspectedPieceId=p.id;
    pieceInfoTitle.textContent=`${p.icon} ${p.displayName}${enemy?' — inimigo revelado':''}`;
    const tags=pieceBonusTags(p);
    const kind=p.summonType==='skeleton'?'Invocação: Esqueleto':p.summonType==='miniSlime'?'Divisão: Mini-Slime':p.form==='lava'?'Forma: Golem de Lava':p.original?'Personagem original':'Unidade';
    const copied=p.copied?`<div class="info-pill">🎭 Habilidade copiada: <b>${p.copied}</b></div>`:'';
    const cd=p.name==='Mago do Espelho'?`<div class="info-pill">🪞 Espelho: <b>${p.mirrorCooldown===1?'em recarga':'disponível'}</b></div>`:'';
    const teamBonuses=(v.chosenBaseBonuses||[]).filter(x=>x==='radarAdvanced'||x==='radarExpanded').map(id=>id==='radarAdvanced'?'📡 Radar Avançado':'📶 Radar Ampliado');
    pieceInfoBody.innerHTML=`
      <div class="piece-info-grid">
        <div class="info-pill">Vida: <b>${p.hp}/${p.maxHp}</b></div>
        <div class="info-pill">Movimento: <b>${p.m}</b></div>
        <div class="info-pill">Ataque: <b>${p.a}</b></div>
        <div class="info-pill">Alcance: <b>${p.range}</b></div>
        <div class="info-pill">Arquétipo: <b>${p.typeIcon||''} ${p.type}</b></div>
        <div class="info-pill">${kind}</div>
        ${copied}${cd}
      </div>
      <div class="small muted" style="margin-top:9px">Bônus desta unidade:</div>
      <div class="bonus-tags">${tags.length?tags.map(t=>`<span class="bonus-tag">${t}</span>`).join(''):'<span class="small muted">Nenhum bônus de atributo.</span>'}</div>
      ${teamBonuses.length?`<div class="small muted" style="margin-top:9px">Bônus de equipe: ${teamBonuses.join(' · ')}</div>`:''}
    `;
  }
  function refreshPieceInfo(v){
    if(!inspectedPieceId)return;
    const own=v.ownPieces.find(p=>p.id===inspectedPieceId);
    if(own){showPieceInfo(v,own,false);return;}
    const enemy=(v.visibleOpponents||[]).find(p=>p.id===inspectedPieceId);
    if(enemy){showPieceInfo(v,enemy,true);return;}
    inspectedPieceId=null;pieceInfoTitle.textContent='Informações da peça';pieceInfoBody.innerHTML='<div class="muted empty-inspector">Clique em uma peça para ver vida, movimento, ataque, alcance e bônus.</div>';
  }
  function canShareUi(v,p,c){if(baseAt(v,c))return false;const ps=ownAtAll(v,c).filter(x=>x.id!==p.id);if(!ps.length)return true;if(ps.length>=2)return false;return p.name==='Escudeiro'||ps.some(x=>x.name==='Escudeiro');}
  function hideStackChoice(){stackChoice.classList.add('hidden');stackButtons.innerHTML='';}
  function showStackChoice(v,pieces){
    stackButtons.innerHTML='';
    pieces.forEach(piece=>{const b=document.createElement('button');b.type='button';b.textContent=`${piece.icon} ${piece.displayName}${piece.activated?' — já agiu':''}`;b.disabled=piece.activated;b.addEventListener('click',()=>{showPieceInfo(view(),piece,false);const r=player.selectPiece(piece.id);setStatus(r.status);hideStackChoice();render();});stackButtons.appendChild(b);});
    stackChoice.classList.remove('hidden');
  }

  function closeBasePanel(){openedBaseId=null;pendingBaseBonusId=null;basePanel.classList.add('hidden');baseTargetArea.classList.add('hidden');baseBonusGrid.innerHTML='';baseTargetGrid.innerHTML='';}
  function canSabotageBase(v,base){const p=activePiece(v),a=v.activation;return !!(p&&a&&!a.mode&&base.owner==='enemy'&&!base.sabotaged&&R.neighbors(base.coord,true).includes(p.coord));}
  function chooseBaseBonus(v,base,bonus){
    if(!canSabotageBase(v,base)){setStatus('Selecione uma peça e fique em uma das 8 casas ao redor do Posto para sabotar.');return;}
    if(v.chosenBaseBonuses.includes(bonus.id)){setStatus('Esse benefício já foi escolhido nesta partida.');return;}
    if(['move','life','attack','range'].includes(bonus.id)){
      pendingBaseBonusId=bonus.id;baseTargetGrid.innerHTML='';
      let targets=v.ownPieces.filter(p=>p.alive);
      if(bonus.id==='range')targets=targets.filter(p=>p.a>0);
      for(const t of targets){const b=document.createElement('button');b.type='button';b.textContent=`${t.icon} ${t.displayName}${t.original?'':' (invocação)'} — V${t.hp}/${t.maxHp} M${t.m} ATQ${t.a} ALC${t.range}`;b.addEventListener('click',()=>{const r=player.sabotageBase(base.id,bonus.id,t.id);setStatus(r.status);closeBasePanel();afterMutation();});baseTargetGrid.appendChild(b);}
      baseTargetArea.classList.remove('hidden');setStatus(`Escolha qual personagem recebe ${bonus.icon} ${bonus.name}.`);return;
    }
    const r=player.sabotageBase(base.id,bonus.id,null);setStatus(r.status);closeBasePanel();afterMutation();
  }
  function openBasePanel(v,base){
    openedBaseId=base.id;pendingBaseBonusId=null;basePanel.classList.remove('hidden');baseTargetArea.classList.add('hidden');
    const own=base.owner==='player';basePanelTitle.textContent=`${base.sabotaged?'🏚️':'🏢'} ${own?'Seu Posto de Operação':'Posto de Operação inimigo'}`;
    if(base.sabotaged)basePanelInfo.textContent='Este Posto já foi sabotado.';
    else if(own)basePanelInfo.textContent='Seu Posto é público. O inimigo pode sabotá-lo de qualquer uma das 8 casas ao redor, inclusive diagonal.';
    else basePanelInfo.textContent=canSabotageBase(v,base)?'Você está em posição de sabotagem. Escolha um benefício abaixo; a sabotagem gasta a ação e encerra a ativação.':'Pode ser sabotado de qualquer uma das 8 casas ao redor, inclusive diagonal. Selecione uma peça e aproxime-se para usar um dos benefícios abaixo.';
    baseBonusGrid.innerHTML='';
    for(const bonus of v.baseBonusCatalog||[]){const used=v.chosenBaseBonuses.includes(bonus.id);const b=document.createElement('button');b.type='button';b.className='bonus-btn'+(used?' used':'');b.disabled=used||own||base.sabotaged||!canSabotageBase(v,base);b.innerHTML=`<b>${bonus.icon} ${bonus.name}</b><div class="small muted" style="margin-top:3px">${bonus.description}</div>${used?'<div class="small">✓ Já escolhido</div>':''}`;b.addEventListener('click',()=>chooseBaseBonus(view(),base,bonus));baseBonusGrid.appendChild(b);}
    render();
  }

  function buildBoard(){
    board.innerHTML='';cells.clear();
    const corner=document.createElement('div');board.appendChild(corner);
    for(let x=0;x<8;x++){const a=document.createElement('div');a.className='axis';a.textContent=String.fromCharCode(65+x);board.appendChild(a);}
    for(let y=0;y<8;y++){
      const l=document.createElement('div');l.className='axis rowaxis';l.textContent=y+1;board.appendChild(l);
      for(let x=0;x<8;x++){const c=R.coord(x,y),b=document.createElement('button');b.type='button';b.className='cell';b.dataset.coord=c;b.addEventListener('click',()=>cellClick(c));cells.set(c,b);board.appendChild(b);}
    }
  }

  function renderRoster(v){
    roster.innerHTML='';
    R.defs.forEach(d=>{
      const chosen=v.phase==='setup'?selected.includes(d.name):v.ownPieces.some(p=>p.original&&p.name===d.name);
      const p=v.phase==='play'?v.ownPieces.find(q=>q.original&&q.name===d.name):null;
      const active=p&&v.activation?.pieceId===p.id;
      const b=document.createElement('button');b.type='button';b.className='char'+(chosen?' chosen':'')+(active?' active':'');
      let footer='';
      if(v.phase==='play'&&chosen)footer=`<div class="small" style="margin-top:5px">${p?(p.alive?(p.activated?'✓ Já agiu':active?(v.activation.committed?'🔒 Comprometido':'◉ Selecionado'):'● Disponível'):'☠ Eliminado'):'☠ Eliminado'}</div>`;
      const copy=p?.copied?`<div class="small">Copiou: ${p.copied}</div>`:'';
      const cd=p?.name==='Mago do Espelho'&&p.mirrorCooldown===1?'<div class="small">Espelho: recarga</div>':'';
      b.innerHTML=`<div><b>${d.icon} ${d.name}</b></div><div class="small muted">${d.typeIcon} · V${p?.alive?`${p.hp}/${p.maxHp}`:d.v} · M${p?.alive?p.m:d.m} · ATQ${p?.alive?p.a:d.a}${p?.alive&&p.a>0?` · ALC${p.range}`:''}</div>${copy}${cd}${footer}`;
      b.addEventListener('click',()=>selectDefinition(d));roster.appendChild(b);
    });
  }

  function renderAvailable(v){
    if(v.phase!=='play'){availableEl.textContent='—';return;}
    const ids=new Set(v.availablePieceIds),arr=v.ownPieces.filter(p=>p.alive&&ids.has(p.id)).map(p=>`${p.icon} ${p.displayName}`);
    availableEl.textContent=arr.length?arr.join(' · '):'Nenhuma';
  }

  function safeMirrorCells(v,p){
    const out=[],ownCoords=new Set(ownAlive(v).map(x=>x.coord)),ownMirrors=new Set(v.ownMirrors.map(x=>x.coord));
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const c=R.coord(x,y),dist=R.man(p.coord,c);
      if(c!==p.coord&&R.sameLine(p.coord,c)&&dist>=1&&dist<=2&&!ownCoords.has(c)&&!ownMirrors.has(c)&&!baseAt(v,c))out.push(c);
    }
    return out;
  }

  function paint(v){
    const seer=new Set(v.seerArea),visibleGroups=new Map(),ownGroups=new Map();
    for(const e of v.visibleOpponents){if(!visibleGroups.has(e.coord))visibleGroups.set(e.coord,[]);visibleGroups.get(e.coord).push(e);}
    for(const p of ownAlive(v)){if(!ownGroups.has(p.coord))ownGroups.set(p.coord,[]);ownGroups.get(p.coord).push(p);}
    const pyroTargets=new Set(v.activation?.pyroTargets||[]);
    for(const[c,b]of cells){
      b.innerHTML='';b.className='cell';
      if(v.phase==='setup'&&Number(c.slice(1))<=4)b.classList.add('setup');
      if(seer.has(c))b.classList.add('revealed');if(seerPreview.has(c))b.classList.add('preview');
      if(pyroTargets.has(c))b.classList.add('pyro-selected');
      const openedBase=(v.bases||[]).find(x=>x.id===openedBaseId);if(openedBase&&R.neighbors(openedBase.coord,true).includes(c))b.classList.add('sabotage-zone');
      if(v.phase==='setup'){
        const n=setupPos.get(c);if(n)b.textContent=R.byName[n]?.icon||'';
        const baseEntry=[...setupBasePos.entries()].find(([,bc])=>bc===c);if(baseEntry){const m=document.createElement('span');m.className='base-icon';m.textContent='🏢';b.appendChild(m);const lab=document.createElement('span');lab.className='base-label';lab.textContent=`P${baseEntry[0]}`;b.appendChild(lab);}
      }else{
        if(seer.has(c)){const m=document.createElement('span');m.className='marker eye';m.textContent='👁️';b.appendChild(m);}
        if(seerPreview.has(c)){const m=document.createElement('span');m.className='marker previewmark';m.textContent='◉';b.appendChild(m);}
        if(corpseAt(v,c)){const m=document.createElement('span');m.className='marker corpse';m.textContent='☠️';b.appendChild(m);}
        if(ownMirrorAt(v,c)){const m=document.createElement('span');m.className='marker mirror';m.textContent='🪞';b.appendChild(m);}
        const base=baseAt(v,c);if(base){const m=document.createElement('span');m.className='base-icon'+(base.sabotaged?' base-dead':'');m.textContent=base.sabotaged?'🏚️':'🏢';b.appendChild(m);const lab=document.createElement('span');lab.className='base-label';lab.textContent=base.owner==='player'?'SEU':'IA';b.appendChild(lab);}
        const group=ownGroups.get(c)||[];
        if(group.length){
          const ordered=[...group].sort((a,b)=>(b.name==='Escudeiro')-(a.name==='Escudeiro'));
          const m=document.createElement('span');m.textContent=ordered[0].icon;b.appendChild(m);
          if(ordered[1]){const s2=document.createElement('span');s2.className='stack-second';s2.textContent=ordered[1].icon;b.appendChild(s2);}
        }
        const eg=visibleGroups.get(c)||[];if(eg.length){const m=document.createElement('span');m.className='marker enemy-reveal';m.textContent=eg[0].icon;b.appendChild(m);if(eg[1]){const m2=document.createElement('span');m2.className='stack-second';m2.textContent=eg[1].icon;b.appendChild(m2);}}
        if(v.impactCell===c){const m=document.createElement('span');m.className='marker impact';m.textContent='💥';b.appendChild(m);}
      }
      const p=activePiece(v),a=v.activation;
      if(p&&v.turn==='player'&&!v.pendingCombat&&!seerPreview.size){
        if(a.mode==='move'&&a.moveRemaining>0&&R.neighbors(p.coord,p.diag).includes(c)&&canShareUi(v,p,c))b.classList.add('highlight');
        if(a.mode==='attack'&&R.attackCells(p).includes(c)&&!baseAt(v,c))b.classList.add('attack-highlight');
        if(a.mode==='pyro'&&R.neighbors(p.coord,false).includes(c)&&!baseAt(v,c))b.classList.add('attack-highlight');
        if(a.mode==='raise'&&R.neighbors(p.coord,false).includes(c)&&corpseAt(v,c)&&!ownAtAll(v,c).length)b.classList.add('highlight');
        if(a.mode==='seer'){const q=R.rc(c);if(q.x<=6&&q.y<=6)b.classList.add('highlight');}
        if(a.mode==='mirror'&&safeMirrorCells(v,p).includes(c))b.classList.add('highlight');
      }
    }
  }

  function render(){
    const v=view();
    countEl.textContent=`${v.phase==='setup'?selected.length:v.ownPieces.filter(p=>p.original).length}/4`;
    myDeathsEl.textContent=`${v.ownOriginalDeaths}/3`;enemyDeathsEl.textContent=`${v.enemyOriginalDeaths}/3`;roundEl.textContent=v.phase==='play'?v.round:'—';
    phaseEl.textContent=v.phase==='setup'?'Posicionamento':v.gameOver?'Encerrada':v.turn==='enemy'?'Vez da IA':'Sua vez';
    renderRoster(v);renderAvailable(v);renderList(historyEl,v.history,'Nenhum acontecimento.');renderList(intelEl,v.intel,'Nenhuma informação.');
    setupBasesEl.classList.toggle('hidden',v.phase!=='setup');baseSetupStatus.textContent=`${setupBasePos.size}/2 posicionados`;base1Btn.classList.toggle('selected',setupBaseSelected===1);base2Btn.classList.toggle('selected',setupBaseSelected===2);
    startBtn.classList.toggle('hidden',v.phase!=='setup');
    readyStatus.classList.toggle('hidden',v.phase!=='setup');
    teamToggle.classList.toggle('hidden',v.phase!=='play');
    teamTitle.textContent=v.phase==='setup'?'Seleção de personagens':'Sua equipe';
    roster.classList.toggle('hidden',v.phase==='play'&&rosterCollapsed);
    teamToggle.textContent=rosterCollapsed?'Ver equipe':'Ocultar equipe';
    refreshPieceInfo(v);paint(v);
    combatChoice.classList.toggle('hidden',!v.pendingCombat);
    pyroConfirm.classList.toggle('hidden',v.activation?.mode!=='pyro');
    if(v.gameOver){setStatus(v.result==='player'?'Você venceu.':v.result==='enemy'?'Você perdeu.':'Empate.');}
    else if(v.turn==='enemy'&&!v.pendingCombat)statusEl.textContent='🤖 Vez da IA...'; else statusEl.textContent=status;
    return v;
  }

  function selectDefinition(d){
    const v=view();if(v.gameOver||v.turn==='enemy')return;
    if(v.phase==='setup'){
      if(selected.includes(d.name)){
        selected=selected.filter(n=>n!==d.name);
        for(const[k,val]of setupPos)if(val===d.name)setupPos.delete(k);
        if(setupSelected===d.name)setupSelected=null;
        setupBaseSelected=null;setStatus(`${d.name} removido do time.`);render();return;
      }
      if(selected.length>=4){setStatus('Você já escolheu 4 personagens. Remova um antes de escolher outro.');return;}
      selected.push(d.name);setupSelected=d.name;setupBaseSelected=null;setStatus(`${d.name} entrou no time. Posicione nas linhas 1–4.`);render();return;
    }
    const p=v.ownPieces.find(q=>q.original&&q.name===d.name);if(!p){setStatus('Essa peça não está disponível.');return;}
    showPieceInfo(v,p,false);
    if(!p.alive){setStatus(`${p.displayName} foi eliminado.`);render();return;}
    const r=player.selectPiece(p.id);setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');hideStackChoice();render();
  }

  function cellClick(c){
    let v=view();if(v.gameOver||v.turn==='enemy'||v.pendingCombat)return;
    if(v.phase==='setup'){
      if(Number(c.slice(1))>4){setStatus('Posicionamento inicial apenas nas linhas 1–4.');return;}
      if(!setupSelected&&!setupBaseSelected&&setupPos.has(c)){
        setupSelected=setupPos.get(c);setStatus(`${setupSelected} selecionado no tabuleiro. Escolha outra casa para reposicionar.`);render();return;
      }
      if(setupBaseSelected){
        if(isCorner(c)){setStatus('Postos não podem ficar nos quatro cantos.');return;}
        if(setupPos.has(c)){setStatus('O Posto não pode ficar na mesma casa de um personagem.');return;}
        for(const[k,val]of setupBasePos)if(val===c&&k!==setupBaseSelected){setStatus('Já existe outro Posto nessa casa.');return;}
        setupBasePos.set(setupBaseSelected,c);setStatus(`Posto ${setupBaseSelected} posicionado.`);render();return;
      }
      if(!setupSelected){setStatus('Selecione um personagem ou um Posto primeiro.');return;}
      if([...setupBasePos.values()].includes(c)){setStatus('Essa casa está ocupada por um Posto.');return;}
      const occ=setupPos.get(c);if(occ&&occ!==setupSelected){setStatus('Essa casa já está ocupada.');return;}
      for(const[k,val]of setupPos)if(val===setupSelected)setupPos.delete(k);setupPos.set(c,setupSelected);setStatus(`${setupSelected} posicionado.`);render();return;
    }
    const a=v.activation,p=activePiece(v),clickedBase=baseAt(v,c);
    if(!a){
      if(clickedBase){openBasePanel(v,clickedBase);return;}
      const group=ownAtAll(v,c);
      if(group.length>1){showStackChoice(v,group);return;}
      if(group[0]){showPieceInfo(v,group[0],false);const r=player.selectPiece(group[0].id);setStatus(r.status);hideStackChoice();render();return;}
      const vis=visibleAt(v,c);if(vis.length){showPieceInfo(v,vis[0],true);setStatus('Informações da peça inimiga legalmente revelada.');render();}
      return;
    }
    let r=null;
    if(a.mode==='move')r=player.moveStep(c);
    else if(a.mode==='attack')r=player.attack(c);
    else if(a.mode==='pyro'){r=player.selectPyroTarget(c);}
    else if(a.mode==='seer'){previewSeer(c);return;}
    else if(a.mode==='raise')r=player.raiseAt(c);
    else if(a.mode==='mirror')r=player.placeMirror(c);
    else {
      if(clickedBase){openBasePanel(v,clickedBase);return;}
      const allOwn=ownAtAll(v,c);
      if(allOwn.length){showPieceInfo(v,allOwn.find(x=>x.id===p.id)||allOwn[0],false);}
      const group=allOwn.filter(x=>!x.activated);
      if(group.length>1&&!a.committed){showStackChoice(v,group);return;}
      const own=group[0];if(own&&own.id!==p.id)r=player.selectPiece(own.id);
      else if(!allOwn.length){const vis=visibleAt(v,c);if(vis.length){showPieceInfo(v,vis[0],true);setStatus('Informações da peça inimiga legalmente revelada.');render();return;}}
    }
    if(r){setStatus(r.status);if(a.mode==='pyro')render();else afterMutation();}
  }

  function previewSeer(c){
    const q=R.rc(c);if(q.x>6||q.y>6){setStatus('Escolha um ponto que comporte o quadrado 2×2.');return;}
    seerPreview=new Set([R.coord(q.x,q.y),R.coord(q.x+1,q.y),R.coord(q.x,q.y+1),R.coord(q.x+1,q.y+1)]);seerConfirm.classList.remove('hidden');setStatus('Essas são as 4 casas. Pode clicar em outro ponto ou confirmar.');render();
  }

  function afterMutation(){
    const v=render();
    if(v.turn==='enemy'&&!v.pendingCombat&&!v.gameOver)scheduleAi(850);
  }

  function scheduleAi(delay=180){
    if(aiScheduled)return;aiScheduled=true;setTimeout(()=>{aiScheduled=false;runAiStep();},delay);
  }
  function runAiStep(){
    const pv=view();if(pv.gameOver||pv.pendingCombat)return;if(pv.turn!=='enemy')return;
    const id=++aiReq;aiWorker.postMessage({id,view:ai.getView()});
  }
  aiWorker.onmessage=e=>{
    const {action}=e.data||{};if(!action)return;
    const av=ai.getView();if(av.turn!=='enemy'||av.gameOver)return;
    let r;
    switch(action.type){
      case 'select': r=ai.selectPiece(action.pieceId);break;
      case 'startMove':r=ai.startMove();break;
      case 'moveStep':r=ai.moveStep(action.to);break;
      case 'stopMove':r=ai.stopMove();break;
      case 'startAttack':r=ai.startAttack();break;
      case 'attack':r=ai.attack(action.to);break;
      case 'pyroSelect':r=ai.selectPyroTarget(action.to);break;
      case 'pyroConfirm':r=ai.confirmPyroAttack();break;
      case 'sabotage':r=ai.sabotageBase(action.baseId,action.bonusId,action.targetPieceId||null);break;
      case 'combatChoice':r=ai.chooseCombatPosition(!!action.advance);break;
      case 'end':r=ai.endActivation();break;
      default:r={ok:true};
    }
    const pv=render();
    if(pv.pendingCombat||pv.gameOver)return;
    if(pv.turn==='enemy')scheduleAi(140);
    else if(pv.turn==='player')setStatus(`Rodada ${pv.round}. Selecione sua próxima peça disponível.`),render();
  };

  startBtn.addEventListener('click',()=>{
    const v=view();if(v.phase!=='setup'){setStatus('A partida já começou.');return;}
    if(selected.length!==4||setupPos.size!==4||setupBasePos.size!==2){setStatus('Escolha e posicione exatamente 4 personagens e 2 Postos.');return;}
    const setup=selected.map(name=>({name,coord:[...setupPos].find(([,n])=>n===name)?.[0]}));const bases=[setupBasePos.get(1),setupBasePos.get(2)];
    setStatus('Você: pronto · IA: pronta. Iniciando partida...');
    const r=referee.startGame(setup,bases);rosterCollapsed=true;setStatus(r.status);render();
  });
  resetBtn.addEventListener('click',()=>{referee.reset();selected=[];setupSelected=null;setupBaseSelected=null;setupPos.clear();setupBasePos.clear();openedBaseId=null;pendingBaseBonusId=null;closeBasePanel();seerPreview.clear();seerConfirm.classList.add('hidden');pyroConfirm.classList.add('hidden');hideStackChoice();combatChoice.classList.add('hidden');rosterCollapsed=false;inspectedPieceId=null;pieceInfoTitle.textContent='Informações da peça';pieceInfoBody.innerHTML='<div class="muted empty-inspector">Clique em uma peça para ver vida, movimento, ataque, alcance e bônus.</div>';setStatus('Escolha quatro personagens e posicione dois Postos.');render();});
  moveBtn.addEventListener('click',()=>{const r=player.startMove();setStatus(r.status);render();});
  stopBtn.addEventListener('click',()=>{const r=player.stopMove();setStatus(r.status);afterMutation();});
  attackBtn.addEventListener('click',()=>{const r=player.startAttack();setStatus(r.status);render();});
  abilityBtn.addEventListener('click',()=>{const r=player.startAbility();setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');hideStackChoice();render();});
  endBtn.addEventListener('click',()=>{const r=player.endActivation();setStatus(r.status);afterMutation();});
  cancelBtn.addEventListener('click',()=>{const v=view();const r=v.activation?.mode==='move'?player.stopMove():v.activation?.mode?player.cancelMode():player.cancelSelection();setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');hideStackChoice();render();});
  confirmSeerBtn.addEventListener('click',()=>{const r=player.useSeer([...seerPreview]);setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');afterMutation();});
  cancelSeerBtn.addEventListener('click',()=>{const r=player.cancelMode();seerPreview.clear();seerConfirm.classList.add('hidden');setStatus(r.status);render();});
  confirmPyroBtn.addEventListener('click',()=>{const r=player.confirmPyroAttack();setStatus(r.status);afterMutation();});
  cancelPyroBtn.addEventListener('click',()=>{const r=player.cancelMode();setStatus(r.status);render();});
  stayCombatBtn.addEventListener('click',()=>{const r=player.chooseCombatPosition(false);setStatus(r.status);afterMutation();});
  advanceCombatBtn.addEventListener('click',()=>{const r=player.chooseCombatPosition(true);setStatus(r.status);afterMutation();});
  base1Btn.addEventListener('click',()=>{setupBaseSelected=1;setupSelected=null;setStatus('Posicione o Posto 1 nas linhas 1–4. Não pode ficar em um canto.');render();});
  base2Btn.addEventListener('click',()=>{setupBaseSelected=2;setupSelected=null;setStatus('Posicione o Posto 2 nas linhas 1–4. Não pode ficar em um canto.');render();});
  closeBasePanelBtn.addEventListener('click',()=>{closeBasePanel();render();});
  teamToggle.addEventListener('click',()=>{rosterCollapsed=!rosterCollapsed;render();});
  closePieceInfoBtn.addEventListener('click',()=>{inspectedPieceId=null;pieceInfoTitle.textContent='Informações da peça';pieceInfoBody.innerHTML='<div class="muted empty-inspector">Clique em uma peça para ver vida, movimento, ataque, alcance e bônus.</div>';});
  auditBtn.addEventListener('click',()=>auditBox.classList.toggle('hidden'));

  buildBoard();render();
})();
