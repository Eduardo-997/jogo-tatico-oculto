'use strict';
(() => {
  const R=window.GameRules,ref=new window.GameReferee(),A=ref.createClient('player'),B=ref.createClient('enemy');
  const $=s=>document.querySelector(s),board=$('#board'),statusEl=$('#status'),popup=$('#popup'),replayBtn=$('#replayBtn');
  const selected={player:[],enemy:[]},draftPos=new Map(),draftBases={player:['B2','G3'],enemy:['B7','G6']},cells=new Map(),rosterFilter={player:'all',enemy:'all'};
  let setupPick=null,activeSide=null,inspected=null,seer=[],pyro=[],started=false;
  const recorder=new window.GameReplay.Recorder(()=>ref.exportState(),{kind:'training'});
  const sideName=s=>s==='player'?'A':'B', sideClass=s=>s==='player'?'a':'b', client=s=>s==='player'?A:B;
  const setStatus=t=>{if(statusEl)statusEl.textContent=t;};
  const defOfName=n=>R.byName[n];
  const uniqueId=(side,name)=>`${side}-${name}-${Math.random().toString(36).slice(2,7)}`;
  const basePickId=(side,index)=>`base:${side}:${index}`;
  const parseBasePick=id=>{const m=/^base:(player|enemy):(0|1)$/.exec(id||'');return m?{side:m[1],index:Number(m[2])}:null;};
  const allBaseCoords=()=>[...draftBases.player,...draftBases.enemy];

  function setupCandidates(side){
    const rows=side==='player'?[1,2,3,4]:[8,7,6,5],out=[];
    for(const r of rows)for(const c of 'ABCDEFGH'){const q=c+r;if(!R.isBlocked(q))out.push(q);}
    return out;
  }
  function addPiece(side,name){
    if(selected[side].length>=4||selected[side].some(x=>x.name===name))return;
    const id=uniqueId(side,name),used=new Set([...draftPos.values()].map(x=>x.coord).concat(allBaseCoords())),coord=setupCandidates(side).find(c=>!used.has(c));
    selected[side].push({id,name});draftPos.set(id,{side,name,coord});setupPick=id;renderSetup();
  }
  function removePiece(side,id){selected[side]=selected[side].filter(x=>x.id!==id);draftPos.delete(id);if(setupPick===id)setupPick=null;renderSetup();}
  function togglePiece(side,name){const hit=selected[side].find(x=>x.name===name);hit?removePiece(side,hit.id):addPiece(side,name);}

  function renderRosterSide(side){
    const suffix=sideName(side),roster=$(`#roster${suffix}`),list=$(`#list${suffix}`);if(!roster||!list)return;
    roster.innerHTML='';
    const defs=R.defs.filter(d=>rosterFilter[side]==='all'||d.type===rosterFilter[side]);
    for(const d of defs){
      const picked=selected[side].some(x=>x.name===d.name),full=selected[side].length>=4&&!picked;
      const card=document.createElement('div');card.className=`char roster-card type-${d.type} training-card${picked?' chosen is-picked':''}`;
      card.innerHTML=`<div class="roster-main"><span class="roster-icon">${A.html?.(A.character?.(d.name),'roster-art',d.name)||d.icon}</span><span class="roster-name">${d.name}</span><span class="roster-type">${A.html?.(A.archetypes?.[d.type],'archetype-art',R.archetypeName(d.type))||d.typeIcon}</span></div><div class="roster-state">V${d.v} · M${d.m} · ATQ${d.a} · ALC${d.range} · PER${d.per} · Alc. Hab. ${d.ah||0}</div>`;
      const pick=document.createElement('button');pick.type='button';pick.className=`roster-pick${picked?' selected':''}`;pick.disabled=full;pick.textContent=picked?'☑ Selecionado':full?'Equipe completa':'☐ Selecionar';pick.addEventListener('click',e=>{e.stopPropagation();togglePiece(side,d.name);});card.appendChild(pick);
      roster.appendChild(card);
    }
    list.innerHTML='';
    for(const x of selected[side]){
      const d=defOfName(x.name),pos=draftPos.get(x.id)?.coord||'—',b=document.createElement('button');b.type='button';b.className=`training-chip side-${sideClass(side)}${setupPick===x.id?' primary':''}`;b.textContent=`${d.icon} ${x.name} · ${pos}`;b.title='Clique para escolher esta peça e reposicioná-la no mapa';b.addEventListener('click',()=>{setupPick=x.id;renderSetup();});list.appendChild(b);
    }
    const bases=$(`#bases${suffix}`);if(bases){bases.innerHTML='';draftBases[side].forEach((coord,index)=>{const id=basePickId(side,index),b=document.createElement('button');b.type='button';b.className=`training-chip training-base-chip side-${sideClass(side)}${setupPick===id?' primary':''}`;b.textContent=`🏰 Posto ${index+1} · ${coord}`;b.title='Clique para escolher este Posto e reposicioná-lo no seu lado do mapa';b.addEventListener('click',()=>{setupPick=id;renderSetup();});bases.appendChild(b);});}
  }

  function renderSetup(){
    renderRosterSide('player');renderRosterSide('enemy');
    $('#setupStatus').textContent=`${selected.player.length}/4 A + 2/2 Postos · ${selected.enemy.length}/4 B + 2/2 Postos`;
    $('#countA').textContent=`${selected.player.length}/4`;$('#countB').textContent=`${selected.enemy.length}/4`;
    $('#phase').textContent='Montagem do Treino';$('#activeLabel').textContent='—';
    buildBoard(true);
  }

  function buildBoard(setupMode=false){
    board.innerHTML='';cells.clear();board.appendChild(document.createElement('div'));
    for(const c of 'ABCDEFGH'){const a=document.createElement('div');a.className='axis';a.textContent=c;board.appendChild(a);}
    for(let r=1;r<=8;r++){
      const ax=document.createElement('div');ax.className='axis rowaxis';ax.textContent=r;board.appendChild(ax);
      for(const c of 'ABCDEFGH'){
        const coord=c+r,b=document.createElement('button');b.className='cell';b.dataset.coord=coord;b.type='button';b.addEventListener('click',()=>setupMode?setupCell(coord):gameCell(coord));cells.set(coord,b);board.appendChild(b);
      }
    }
    setupMode?paintSetup():paintGame();
  }

  function addTree(cell,state='live',hp=3){cell.classList.add('terrain-tree');if(state==='live')cell.classList.add('terrain-blocked');const src=state==='dead'?A.terrain?.deadTree:A.terrain?.tree;if(src)cell.appendChild(A.img(src,'scenery-art',state==='dead'?'Árvore destruída':'Árvore'));if(state==='live')hpBadge(cell,Number(hp??3),false,true);}
  function addRock(cell,hp=3){cell.classList.add('terrain-blocked','terrain-rock');if(A.terrain?.rock)cell.appendChild(A.img(A.terrain.rock,'scenery-art','Pedra'));hpBadge(cell,Number(hp??3),false,true);}
  function addWater(cell){cell.classList.add('terrain-water');if(A.terrain?.water)cell.appendChild(A.img(A.terrain.water,'scenery-art','Lago'));}
  function addSwamp(cell){cell.classList.add('terrain-swamp');if(A.terrain?.swamp)cell.appendChild(A.img(A.terrain.swamp,'scenery-art','Pântano'));}
  function tokenFor(p,side,setup=false){
    const d=setup?defOfName(p.name):R.defOf(p),m=document.createElement('span');m.className=`piece-token art-token type-${d?.type||p.type||'C'}${side==='enemy'?' enemy-token':''}`;const src=A.character?.(p.displayName||p.name);if(src)m.appendChild(A.img(src,'piece-art',p.displayName||p.name));else m.textContent=d?.icon||p.icon||'●';return m;
  }
  function hpBadge(cell,hp,enemy=false,terrain=false){const b=document.createElement('span');b.className=`hp-badge${enemy?' enemy-hp':''}${terrain?' terrain-hp':''}`;b.textContent=`♥${hp}`;cell.appendChild(b);}
  function durationBadges(cell,p){const effects=(p?.effects||[]).filter(e=>Number(e.remaining)>0);if(!effects.length)return;const w=document.createElement('span');w.className='duration-badges';for(const e of effects.slice(0,2)){const b=document.createElement('span');b.className=`duration-badge ${e.kind||'neutral'}`;b.textContent=`${e.icon||'⏳'}${e.remaining}`;w.appendChild(b);}if(effects.length>2){const b=document.createElement('span');b.className='duration-badge more';b.textContent=`+${effects.length-2}`;w.appendChild(b);}cell.appendChild(w);}

  function addBaseVisual(cell,side,index,sabotaged=false){
    const ally=side==='player',src=sabotaged?(ally?A.structures?.baseSabotagedAlly:A.structures?.baseSabotagedEnemy):(ally?A.structures?.baseAlly:A.structures?.baseEnemy);const icon=A.img?.(src,'base-art',sabotaged?'Posto Sabotado':'Posto de Operação')||document.createElement('span');if(!icon.src){icon.className=`base-icon${sabotaged?' base-dead':''}`;icon.textContent=sabotaged?'🏚️':'🏰';}cell.appendChild(icon);
    const label=document.createElement('span');label.className='base-label';label.textContent=`${sideName(side)}·P${index+1}`;cell.appendChild(label);
    cell.classList.add(side==='player'?'training-board-side-a':'training-board-side-b');
  }
  function paintSetup(){
    for(const [c,b] of cells){
      b.className='cell setup';b.innerHTML='';
      if((R.treeCells||[]).includes(c)){addTree(b,'live');continue;}
      if((R.rockCells||[]).includes(c)){addRock(b);continue;}
      if((R.waterCells||[]).includes(c))addWater(b);
      const baseHit=['player','enemy'].flatMap(side=>draftBases[side].map((coord,index)=>({side,index,coord}))).find(x=>x.coord===c);
      if(baseHit){addBaseVisual(b,baseHit.side,baseHit.index,false);if(setupPick===basePickId(baseHit.side,baseHit.index))b.classList.add('active-cell');continue;}
      const hits=[...draftPos.entries()].filter(([,x])=>x.coord===c);
      if(!hits.length)continue;
      const [id,x]=hits[0],d=defOfName(x.name);b.appendChild(tokenFor(x,x.side,true));hpBadge(b,d.v,x.side==='enemy');b.classList.add(x.side==='player'?'training-board-side-a':'training-board-side-b');if(id===setupPick)b.classList.add('active-cell');
    }
  }
  function setupCell(c){
    if(R.isBlocked(c))return;
    const occupied=[...draftPos.entries()].find(([,x])=>x.coord===c);
    const baseHit=['player','enemy'].flatMap(side=>draftBases[side].map((coord,index)=>({side,index,coord}))).find(x=>x.coord===c);
    if(!setupPick){if(occupied)setupPick=occupied[0];else if(baseHit)setupPick=basePickId(baseHit.side,baseHit.index);renderSetup();return;}
    if(occupied){setupPick=occupied[0];renderSetup();return;}
    if(baseHit){setupPick=basePickId(baseHit.side,baseHit.index);renderSetup();return;}
    const bp=parseBasePick(setupPick);
    if(bp){const row=Number(c.slice(1)),min=bp.side==='player'?1:5,max=bp.side==='player'?4:8;if(row<min||row>max){setStatus(`O Posto do Lado ${sideName(bp.side)} precisa ficar no próprio lado do tabuleiro.`);return;}if(['A1','H1','A8','H8'].includes(c)){setStatus('Postos não podem ficar nos quatro cantos do mapa.');return;}draftBases[bp.side][bp.index]=c;setupPick=null;renderSetup();return;}
    const x=draftPos.get(setupPick);if(!x)return;x.coord=c;setupPick=null;renderSetup();
  }


  function start(){
    if(selected.player.length!==4||selected.enemy.length!==4){$('#setupStatus').textContent='Escolha 4 peças em cada lado.';return;}
    const setup=s=>selected[s].map(x=>({name:x.name,coord:draftPos.get(x.id).coord}));
    const r=ref.startTrainingGame(setup('player'),setup('enemy'),[...draftBases.player],[...draftBases.enemy]);if(!r.ok){$('#setupStatus').textContent=r.status;return;}
    started=true;$('#setup').classList.add('hidden');$('#actionControls').classList.remove('hidden');$('#phase').textContent='Treino ativo';buildBoard(false);recorder.clear();recorder.capture('Início do Treino');replayBtn.classList.remove('hidden');setStatus(r.status);render();
  }

  function views(){return {player:A.getView(),enemy:B.getView()};}
  function allPieces(vs){return [...vs.player.ownPieces.map(p=>({...p,owner:'player'})),...vs.enemy.ownPieces.map(p=>({...p,owner:'enemy'}))];}
  function activeView(vs){return activeSide?vs[activeSide]:null;}
  function activePiece(vs){const v=activeView(vs);return v?.activation?v.ownPieces.find(p=>p.id===v.activation.pieceId):null;}
  function piecesAt(vs,c){return allPieces(vs).filter(p=>p.alive&&p.coord===c);}
  function treeAt(state,c){return (state.trees||[]).find(t=>t.coord===c);}
  function baseAtState(state,c){return (state.bases||[]).find(b=>b.coord===c);}
  function baseAtView(v,c){return (v?.bases||[]).find(b=>b.coord===c);}

  function feedHtml(a,kind='history'){
    if(!a?.length)return '<div class="muted empty-feed">—</div>';
    return a.slice(0,5).map((x,i)=>`<div class="event-entry ${kind==='intel'?'intel-entry':'history-entry'}${i===0?' latest':''}">${x}</div>`).join('');
  }
  function renderFeed(el,a){el.innerHTML=feedHtml(a,'history');}
  function renderInspector(q){
    const el=$('#pieceInfo');if(!q){el.innerHTML='<div class="muted empty-inspector">Clique em uma peça de qualquer lado para inspecionar e controlar.</div>';return;}
    const effects=(q.effects||[]).filter(e=>e.remaining>0).map(e=>`<span class="temp-effect-tag ${e.kind||'neutral'}">${e.icon||'⏳'} ${e.name} · ${e.remaining}</span>`).join('');
    const kind=q.summonType==='skeleton'?'Invocação: Esqueleto':q.summonType==='miniSlime'?'Divisão: Mini-Slime':q.summonType==='livingBranch'?'Invocação: Galho-Vivo':q.form==='lava'?'Forma: Golem de Lava':q.possessing?'👻 Corpo possuído':q.possessedAway?'👻 Possuído — localização perdida':q.original?'Personagem original':'Unidade';
    const bonuses=[];if(q.bonusM)bonuses.push(`👣 +${q.bonusM} M`);if(q.bonusV)bonuses.push(`❤️ +${q.bonusV} V`);if(q.bonusA)bonuses.push(`⚔️ +${q.bonusA} ATQ`);if(q.bonusRange)bonuses.push(`🎯 +${q.bonusRange} ALC`);if(q.bonusAH)bonuses.push(`✨ +${q.bonusAH} Alc. Hab.`);if(q.radarAdvanced)bonuses.push('📡 Radar Avançado');if(q.radarExpanded)bonuses.push('📶 Radar Ampliado');
    const trapNote=q.name==='Caçador'||q.name==='Sentinela'?'<div class="small muted" style="margin-top:7px">Armadilhas podem ser preparadas sob uma peça já presente e só ativam quando um inimigo entrar nessa casa depois.</div>':'';
    el.innerHTML=`<div class="row between"><div><b>${q.icon} ${q.displayName}</b><div class="small muted">Lado ${sideName(q.owner)} · ${q.typeIcon} ${R.archetypeName(q.type)} · ${kind}</div></div><span class="training-side-mark ${sideClass(q.owner)}">Lado ${sideName(q.owner)}</span></div><div class="piece-info-grid"><div class="info-pill">❤️ Vida<br><b>${q.hp}/${q.maxHp}</b></div><div class="info-pill">👣 Movimento<br><b>${q.m}</b></div><div class="info-pill">⚔️ Ataque<br><b>${q.a}</b></div><div class="info-pill">🎯 Alcance<br><b>${q.range}</b></div><div class="info-pill">👁 PER<br><b>${q.per}</b></div><div class="info-pill">✦ Alc. Hab.<br><b>${q.ah||0}</b></div></div>${q.form?`<div class="bonus-tags"><span class="bonus-tag">Forma: ${q.form}</span></div>`:''}${q.copied?`<div class="bonus-tags"><span class="bonus-tag">Copiou: ${q.copied}</span></div>`:''}${bonuses.length?`<div class="bonus-tags">${bonuses.map(x=>`<span class="bonus-tag">${x}</span>`).join('')}</div>`:''}${effects?`<div class="temporary-effects">${effects}</div>`:''}${trapNote}`;
  }

  function render(){
    const vs=views(),p=activePiece(vs);$('#round').textContent=vs.player.round;$('#activeLabel').textContent=p?`${sideName(activeSide)} · ${p.icon} ${p.displayName}`:'—';$('#phase').textContent='Treino ativo';$('#countA').textContent=`${vs.player.ownPieces.filter(x=>x.alive&&x.original).length}/4`;$('#countB').textContent=`${vs.enemy.ownPieces.filter(x=>x.alive&&x.original).length}/4`;
    paintGame(vs);renderFeed($('#historyA'),vs.player.history);renderFeed($('#historyB'),vs.enemy.history);$('#intel').innerHTML=`<div class="training-feed-label">Lado A</div>${feedHtml(vs.player.intel,'intel')}<div class="training-feed-label">Lado B</div>${feedHtml(vs.enemy.intel,'intel')}`;
    if(inspected){const q=allPieces(vs).find(x=>x.id===inspected);renderInspector(q||null);}else renderInspector(null);
    handleChoices(vs);return vs;
  }

  function canMoveInto(state,p,activeSide,c,ps){
    if((state.rocks||[]).includes(c))return false;const t=treeAt(state,c);if(t&&!(p.name==='Druida'&&t.state==='live'))return false;if(baseAtState(state,c))return false;
    const foes=ps.filter(x=>x.owner!==activeSide);if(foes.length)return true;
    const own=ps.filter(x=>x.owner===activeSide&&x.id!==p.id),isLinker=x=>x?.name==='Escudeiro'||(x?.name==='Doppelgänger'&&x?.copied==='Escudeiro');const follower=ps.find(x=>x.owner===activeSide&&x.alive&&x.linkedToId===p.id);if(follower&&own.length)return false;if(!own.length)return true;if(own.length>=2)return false;return isLinker(p)||own.some(isLinker);
  }

  function paintGame(vs=views()){
    const pieces=allPieces(vs),v=activeView(vs),p=activePiece(vs),mode=v?.activation?.mode,siege=new Set([...(vs.player.siegeCells||[]),...(vs.enemy.siegeCells||[])]);
    const state=JSON.parse(ref.exportState(),(k,val)=>val&&val.__set?val.__set:val);
    for(const [c,b] of cells){
      b.className='cell';b.innerHTML='';if(siege.has(c))b.classList.add('revealed','siege-revealed');const t=treeAt(state,c);if(t)addTree(b,t.state,t.hp??3);else if((state.rocks||[]).includes(c))addRock(b,(state.rockHp||{})[c]??3);else if((state.water||[]).includes(c))addWater(b);else if((state.swamps||[]).includes(c))addSwamp(b);const base=baseAtState(state,c);if(base)addBaseVisual(b,base.owner,Number((base.id||'').slice(-1))-1,base.sabotaged);
      const ps=pieces.filter(x=>x.alive&&x.coord===c);
      if(ps.length){
        const first=ps[0];b.appendChild(tokenFor(first,first.owner));hpBadge(b,first.hp,first.owner==='enemy');durationBadges(b,first);b.classList.add(first.owner==='player'?'training-board-side-a':'training-board-side-b');
        if(ps[1]){const s=document.createElement('span');s.className='stack-second';s.textContent=ps[1].icon;s.title=`Lado ${sideName(ps[1].owner)} · ${ps[1].displayName}`;b.appendChild(s);}
      }
      if(p?.coord===c)b.classList.add('active-cell');
      if(p&&!mode&&base&&base.owner!==activeSide&&!base.sabotaged&&R.neighbors(base.coord,true).includes(p.coord))b.classList.add('sabotage-zone');
      if(p&&mode){
        if(mode==='absorbRock'&&(state.rocks||[]).includes(c)&&R.neighbors(p.coord,false).includes(c))b.classList.add('highlight');
        if(mode==='move'&&v.activation.moveRemaining>=((R.swampCells||[]).includes(c)?2:1)&&R.neighbors(p.coord,p.diag).includes(c)&&canMoveInto(state,p,activeSide,c,ps))b.classList.add('highlight');
        if(mode==='attack'&&R.attackCells(p).includes(c))b.classList.add('attack-highlight');
        if(['raise','mirror','awaken','spotTrap','damageTrap','bard'].includes(mode)&&R.abilityCells(p).includes(c))b.classList.add('highlight');
        if(mode==='seer'){if(!seer.length&&R.abilityCells(p).includes(c))b.classList.add('highlight','seer-range');else if(seer.length){if(c===seer[0])b.classList.add('highlight','seer-main');else if(R.neighbors(seer[0],false).includes(c))b.classList.add('highlight','seer-next');}}
        if(mode==='kamikaze'&&(v.activation.kamikazeCells||[]).includes(c))b.classList.add('attack-highlight','kamikaze-highlight');if(mode==='shieldLink'){const ah=p.ah||0;if(v.ownPieces.some(x=>x.id!==p.id&&x.alive&&x.coord===c&&R.man(p.coord,x.coord)<=ah))b.classList.add('highlight');}
        if(mode==='pyro'&&R.abilityCells(p).includes(c))b.classList.add('attack-highlight');
        if(seer.includes(c)||pyro.includes(c))b.classList.add('pyro-selected');
      }
    }
    for(const x of state.corpses||[])cells.get(x.coord)?.insertAdjacentHTML('beforeend','<span class="marker corpse">☠️</span>');
    for(const x of state.mirrors||[])cells.get(x.coord)?.insertAdjacentHTML('beforeend','<span class="marker mirror">🪞</span>');
    for(const s of ['player','enemy'])for(const x of state.traps?.[s]||[])cells.get(x.coord)?.insertAdjacentHTML('beforeend',`<span class="marker eye" title="Armadilha do Lado ${sideName(s)}">${x.kind==='spot'?'🦉':'🕳️'}</span>`);
    for(const c of new Set([vs.player.impactCell,vs.enemy.impactCell].filter(Boolean)))cells.get(c)?.insertAdjacentHTML('beforeend','<span class="marker impact" title="Ataque ocorreu aqui">💥</span>');
    for(const c of new Set([...(vs.player.combatCells||[]),...(vs.enemy.combatCells||[])]))cells.get(c)?.insertAdjacentHTML('beforeend','<span class="marker combat-mark" title="Confronto Direto ocorreu aqui">⚔️</span>');
    const seerCells=new Set([...(vs.player.seerArea||[]),...(vs.enemy.seerArea||[])]);for(const c of seerCells)cells.get(c)?.insertAdjacentHTML('beforeend','<span class="marker eye" title="Casa sob efeito do Vidente">👁️</span>');
    const hints=[...(vs.player.perceptionHints||[]).map(h=>({...h,side:'player'})),...(vs.enemy.perceptionHints||[]).map(h=>({...h,side:'enemy'}))];for(const h of hints){const mark=h.kind==='exact'?'📍':h.kind==='diag'?'◇':'❗';cells.get(h.coord)?.insertAdjacentHTML('beforeend',`<span class="presence-hint ${h.kind||'orth'}" title="PER do Lado ${sideName(h.side)}">${mark}</span>`);}
    for(const viewer of ['player','enemy'])for(const pieceId of Object.keys(state.spotReveals?.[viewer]||{})){const target=['player','enemy'].flatMap(s=>state.pieces?.[s]||[]).find(x=>x.id===pieceId&&x.alive&&x.coord);if(target)cells.get(target.coord)?.insertAdjacentHTML('beforeend',`<span class="presence-hint exact" title="Revelado ao Lado ${sideName(viewer)} pela armadilha da Sentinela">📍</span>`);}
  }

  function chooseStack(ps){
    showPopup(`<b>🛡️ Duas peças nesta casa</b><div class="muted small" style="margin:5px 0 9px">Escolha qual peça quer controlar.</div><div class="row" data-stack-buttons></div>`);const box=popup.querySelector('[data-stack-buttons]');for(const p of ps){const b=document.createElement('button');b.type='button';b.textContent=`${p.icon} ${p.displayName} · Lado ${sideName(p.owner)}`;b.addEventListener('click',()=>{hidePopup();switchSelect(p);});box.appendChild(b);}
  }
  function switchSelect(piece){
    if(activeSide&&activeSide!==piece.owner){const old=client(activeSide),ov=views()[activeSide];if(ov.activation?.committed){setStatus('Termine a ação atual antes de trocar para o outro lado.');return;}if(ov.activation?.mode)old.cancelMode();if(ov.activation)old.cancelSelection();}
    activeSide=piece.owner;seer=[];pyro=[];const r=client(activeSide).selectPiece(piece.id);inspected=piece.id;setStatus(r.status);render();
  }
  function gameCell(c){
    const vs=views(),v=activeView(vs),p=activePiece(vs);if(!p){const hits=piecesAt(vs,c);if(hits.length>1)chooseStack(hits);else if(hits[0])switchSelect(hits[0]);else{const base=(vs.player.bases||[]).find(x=>x.coord===c);if(base)showBase(base,vs.player);}return;}
    const a=v.activation,cl=client(activeSide);let r=null;
    if(a.mode==='move')r=cl.moveStep(c);
    else if(a.mode==='attack')r=cl.attack(c);
    else if(a.mode==='pyro'){r=cl.selectPyroTarget(c);if(r.ok)pyro=a.pyroTargets?.includes(c)?pyro.filter(x=>x!==c):[...new Set([...pyro,c])].slice(0,2);}
    else if(a.mode==='seer'){seerClick(c);return;}
    else if(a.mode==='raise')r=cl.raiseAt(c);
    else if(a.mode==='mirror')r=cl.placeMirror(c);
    else if(a.mode==='awaken')r=cl.awakenTree(c);
    else if(a.mode==='spotTrap'||a.mode==='damageTrap')r=cl.placeTrap(c);
    else if(a.mode==='absorbRock'){if(!(v.rocks||[]).includes(c)||!R.neighbors(p.coord,false).includes(c)){setStatus('Escolha uma pedra adjacente ao Golem.');return;}const pick=window.prompt('Absorver Rocha: Vida, Movimento ou ATQ?','ATQ');const s=String(pick||'').toLowerCase(),stat=s.startsWith('v')?'life':s.startsWith('m')?'move':'attack';r=cl.absorbRock(c,stat);}
    else if(a.mode==='bard'){const target=v.ownPieces.find(x=>x.id!==p.id&&x.alive&&x.coord===c&&R.man(p.coord,x.coord)<=p.ah);if(target){showBard(target);return;}setStatus('Escolha um aliado do mesmo lado dentro do Alc. Hab.');return;}
    else if(a.mode==='shieldLink'){const ah=p.ah||0,target=v.ownPieces.find(x=>x.id!==p.id&&x.alive&&x.coord===c&&R.man(p.coord,x.coord)<=ah);if(!target){setStatus(`Escolha um aliado dentro do Alc. Hab. ${ah}.`);return;}r=cl.shieldLink(target.id);}
    else{const base=baseAtView(v,c);if(base){showBase(base,v);return;}const hits=piecesAt(vs,c);if(hits.length>1)chooseStack(hits);else if(hits[0])switchSelect(hits[0]);return;}
    after(r);
  }
  function seerClick(c){const p=activePiece(views());if(!seer.length){if(!R.abilityCells(p).includes(c))return setStatus('Casa principal fora do Alc. Hab.');seer=[c];setStatus('Agora escolha 1 casa ligada por lado à principal.');render();return;}if(c===seer[0]){seer=[];render();return;}if(!R.neighbors(seer[0],false).includes(c))return setStatus('A segunda casa precisa estar ligada por lado à principal.');seer=[seer[0],c];setStatus('2/2 casas escolhidas. Confirme a visão.');render();}
  function after(r,label=''){if(!r)return;if(r.ok){recorder.capture(label||r.status);replayBtn.classList.remove('hidden');}setStatus(r.status);render();}

  function handleChoices(vs){
    const pc=vs.player.pendingCombat?'player':vs.enemy.pendingCombat?'enemy':null,dc=vs.player.doppelChoice?'player':vs.enemy.doppelChoice?'enemy':null;
    if(pc){const can=vs[pc].pendingCombat.canAdvance;showPopup(`<b>⚔️ Confronto resolvido — Lado ${sideName(pc)}</b><div class="muted small" style="margin:5px 0 9px">Escolha onde o vencedor termina.</div><div class="row"><button data-stay>Posição original</button><button class="primary" data-advance ${can?'':'disabled'}>Posição derrotada</button></div>`);popup.querySelector('[data-stay]').onclick=()=>after(client(pc).chooseCombatPosition(false));const adv=popup.querySelector('[data-advance]');if(can)adv.onclick=()=>after(client(pc).chooseCombatPosition(true));return;}
    if(dc){const d=vs[dc].doppelChoice;showPopup(`<b>🎭 Doppelgänger — Lado ${sideName(dc)}</b><div class="muted small" style="margin:5px 0 9px">Manter ${d.current} ou copiar ${d.newAbility}?</div><div class="row"><button data-keep>Manter</button><button class="primary" data-copy>Copiar nova</button></div>`);popup.querySelector('[data-keep]').onclick=()=>after(client(dc).chooseDoppelCopy(false));popup.querySelector('[data-copy]').onclick=()=>after(client(dc).chooseDoppelCopy(true));return;}
    if(activeSide&&vs[activeSide].activation?.mode==='shieldUnlink'){showPopup(`<b>🛡️ Desvincular Escudeiro?</b><div class="muted small" style="margin:5px 0 9px">Desvincular gastará o turno do Escudeiro.</div><div class="row"><button data-cancel>Cancelar</button><button class="primary" data-unlink>Desvincular</button></div>`);popup.querySelector('[data-cancel]').onclick=()=>after(client(activeSide).cancelMode());popup.querySelector('[data-unlink]').onclick=()=>after(client(activeSide).shieldLink(null));return;}
    if(activeSide&&vs[activeSide].activation?.mode==='pyro'){showPopup(`<b>🔥 Piromante</b><div class="muted small" style="margin:5px 0 9px">${pyro.length}/2 casas escolhidas.</div><div class="row"><button class="primary" data-confirm ${pyro.length?'':'disabled'}>Confirmar ataque</button><button data-cancel>Cancelar</button></div>`);if(pyro.length)popup.querySelector('[data-confirm]').onclick=()=>{const r=client(activeSide).confirmPyroAttack();pyro=[];after(r);};popup.querySelector('[data-cancel]').onclick=()=>{pyro=[];after(client(activeSide).cancelMode());};return;}
    if(activeSide&&vs[activeSide].activation?.mode==='kamikaze'){const a=vs[activeSide].activation,n=(a.kamikazeCells||[]).length;showPopup(`<b>💥 Autodestruição — Lado ${sideName(activeSide)}</b><div class="muted small" style="margin:5px 0 9px">${n} casas marcadas serão atingidas. A explosão acerta aliados e o Kamikaze morre.</div><div class="row"><button class="primary" data-confirm>Confirmar explosão</button><button data-cancel>Cancelar</button></div>`);popup.querySelector('[data-confirm]').onclick=()=>after(client(activeSide).confirmKamikaze());popup.querySelector('[data-cancel]').onclick=()=>after(client(activeSide).cancelMode());return;}
    if(activeSide&&vs[activeSide].activation?.mode==='seer'){showPopup(`<b>👁️ Vidente</b><div class="muted small" style="margin:5px 0 9px">${seer.length}/2 casas escolhidas.</div><div class="row"><button class="primary" data-confirm ${seer.length===2?'':'disabled'}>Confirmar visão</button><button data-cancel>Cancelar</button></div>`);if(seer.length===2)popup.querySelector('[data-confirm]').onclick=()=>{const r=client(activeSide).useSeer(seer);seer=[];after(r);};popup.querySelector('[data-cancel]').onclick=()=>{seer=[];after(client(activeSide).cancelMode());};return;}
    hidePopup();
  }
  function showPopup(html){popup.innerHTML=html;popup.classList.remove('hidden');}
  function hidePopup(){popup.classList.add('hidden');popup.innerHTML='';}
  function showBase(base,v){
    const owner=base.owner===activeSide,ready=!!(activeSide&&v?.activation&&!v.activation.mode&&!base.sabotaged&&!owner&&R.neighbors(base.coord,true).includes(activePiece(views())?.coord));
    if(!activeSide||owner||base.sabotaged||!ready){const text=base.sabotaged?'Este Posto já foi sabotado.':owner?`Posto do seu Lado ${sideName(base.owner)}.`:'Selecione uma peça do lado adversário e fique em uma das 8 casas ao redor para sabotar.';showPopup(`<b>${base.sabotaged?'🏚️':'🏰'} Posto do Lado ${sideName(base.owner)}</b><div class="muted small" style="margin-top:6px">${text}</div>`);return;}
    const used=new Set(v.chosenBaseBonuses||[]),bonuses=(v.baseBonusCatalog||[]).filter(x=>!used.has(x.id));
    showPopup(`<b>🏰 Sabotar Posto do Lado ${sideName(base.owner)}</b><div class="muted small" style="margin:5px 0 9px">Escolha um benefício para o Lado ${sideName(activeSide)}.</div><div class="bonus-grid" data-bonus-grid></div>`);
    const grid=popup.querySelector('[data-bonus-grid]');for(const bonus of bonuses){const b=document.createElement('button');b.type='button';b.className='bonus-btn';b.innerHTML=`<b>${bonus.icon} ${bonus.name}</b><div class="small muted" style="margin-top:3px">${bonus.description}</div>`;b.onclick=()=>chooseTrainingBaseBonus(base,bonus);grid.appendChild(b);}
  }
  function chooseTrainingBaseBonus(base,bonus){
    const v=views()[activeSide],needsTarget=['radarAdvanced','radarExpanded','move','life','attack','range','abilityRange'].includes(bonus.id);if(!needsTarget){after(client(activeSide).sabotageBase(base.id,bonus.id,null));return;}
    let targets=v.ownPieces.filter(p=>p.alive);if(bonus.id==='range')targets=targets.filter(p=>p.a>0);if(bonus.id==='abilityRange')targets=targets.filter(p=>(p.ah||0)>0);
    showPopup(`<b>${bonus.icon} ${bonus.name}</b><div class="muted small" style="margin:5px 0 9px">Escolha a unidade que recebe o benefício.</div><div class="target-grid" data-target-grid></div>`);const grid=popup.querySelector('[data-target-grid]');for(const t of targets){const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${t.icon} ${t.displayName}</b><div class="small muted">V${t.hp}/${t.maxHp} · M${t.m} · ATQ${t.a} · ALC${t.range} · Alc. Hab. ${t.ah||0}</div>`;b.onclick=()=>after(client(activeSide).sabotageBase(base.id,bonus.id,t.id));grid.appendChild(b);}if(!targets.length)grid.innerHTML='<div class="muted small">Nenhuma unidade válida para este benefício.</div>';
  }
  function showBard(target){showPopup(`<b>🎵 Inspirar ${target.displayName}</b><div class="row" style="margin-top:8px"><button data-stat="attack">+1 ATQ</button><button data-stat="range">+1 ALC</button><button data-stat="abilityRange">+1 Alc. Hab.</button><button data-stat="move">+1 M</button><button data-stat="life">+1 Vida</button></div>`);popup.querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>after(client(activeSide).bardBuff(target.id,b.dataset.stat)));}

  document.querySelectorAll('[data-filter-side]').forEach(box=>{const side=box.dataset.filterSide;box.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{rosterFilter[side]=btn.dataset.filter;box.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===btn));renderRosterSide(side);}));});
  $('#start').onclick=start;$('#reset').onclick=()=>{ref.reset();started=false;activeSide=null;setupPick=null;inspected=null;seer=[];pyro=[];recorder.clear();$('#setup').classList.remove('hidden');$('#actionControls').classList.add('hidden');replayBtn.classList.add('hidden');setStatus('Formação anterior restaurada. Ajuste se quiser e inicie o Treino novamente.');renderSetup();};
  $('#move').onclick=()=>activeSide?after(client(activeSide).startMove()):setStatus('Selecione uma peça.');
  $('#stop').onclick=()=>activeSide?after(client(activeSide).stopMove()):setStatus('Nenhum movimento em andamento.');
  $('#attack').onclick=()=>activeSide?after(client(activeSide).startAttack()):setStatus('Selecione uma peça.');
  $('#ability').onclick=()=>activeSide?after(client(activeSide).startAbility()):setStatus('Selecione uma peça.');
  $('#end').onclick=()=>activeSide?after(client(activeSide).endActivation()):setStatus('Selecione uma peça.');
  $('#cancel').onclick=()=>{if(!activeSide)return setStatus('Nada para cancelar.');const v=views()[activeSide],r=v.activation?.mode?client(activeSide).cancelMode():client(activeSide).cancelSelection();seer=[];pyro=[];after(r);};
  $('#nextRound').onclick=()=>{const r=A.advanceTrainingRound();after(r,'Rodada avançada manualmente');};
  replayBtn.onclick=()=>window.GameReplay.open(recorder.frames(),{title:'Replay do Treino'});
  renderSetup();
})();
