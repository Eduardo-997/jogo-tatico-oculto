'use strict';
(() => {
  const R=window.GameRules, A=window.BNSAssets||{};
  const referee=new window.GameReferee();
  const player=referee.createClient('player');
  const ai=referee.createClient('enemy');
  const aiWorker=window.createGameAiWorker();
  const replay=window.GameReplay?new window.GameReplay.Recorder(()=>referee.exportState(),{kind:'classic'}):null;
  let aiReq=0,aiScheduled=false,aiLastResult=null;

  const $=s=>document.querySelector(s);
  const roster=$('#roster'),board=$('#board'),historyEl=$('#history'),intelEl=$('#intel'),statusEl=$('#status'),availableEl=$('#available');
  const Presentation=window.BattlePresentation||{battleEvents:a=>a||[],showEndScreen:()=>{},hideEndScreen:()=>{}};
  const roundEl=$('#round'),countEl=$('#count'),myDeathsEl=$('#myDeaths'),enemyDeathsEl=$('#enemyDeaths'),phaseEl=$('#phase'),turnGuide=$('#turnGuide');
  const startBtn=$('#start'),resetBtn=$('#reset'),moveBtn=$('#move'),stopBtn=$('#stop'),attackBtn=$('#attack'),abilityBtn=$('#ability'),endBtn=$('#end'),cancelBtn=$('#cancel'),replayBtn=$('#replayBtn'),surrenderBtn=$('#surrenderBtn');
  const seerConfirm=$('#seerConfirm'),confirmSeerBtn=$('#confirmSeer'),cancelSeerBtn=$('#cancelSeer');
  const pyroConfirm=$('#pyroConfirm'),confirmPyroBtn=$('#confirmPyro'),cancelPyroBtn=$('#cancelPyro');
  const stackChoice=$('#stackChoice'),stackButtons=$('#stackButtons');
  const combatChoice=$('#combatChoice'),stayCombatBtn=$('#stayCombat'),advanceCombatBtn=$('#advanceCombat');
  const contextZone=$('#contextZone'),boardPopup=$('#boardPopup');const doppelChoiceBox=document.createElement('div');doppelChoiceBox.className='notice hidden';doppelChoiceBox.innerHTML='<b>🎭 Doppelgänger encontrou outra habilidade</b><div id="doppelChoiceText" class="muted small" style="margin:5px 0 9px"></div><div class="row"><button id="keepDoppel">Manter atual</button><button id="copyDoppel" class="primary">Copiar nova</button></div>';boardPopup.prepend(doppelChoiceBox);const doppelChoiceText=doppelChoiceBox.querySelector('#doppelChoiceText'),keepDoppelBtn=doppelChoiceBox.querySelector('#keepDoppel'),copyDoppelBtn=doppelChoiceBox.querySelector('#copyDoppel');const bardChoiceBox=document.createElement('div');bardChoiceBox.className='notice hidden';bardChoiceBox.innerHTML='<b>🎵 Inspiração do Bardo</b><div id="bardChoiceText" class="muted small" style="margin:5px 0 9px"></div><div class="row" id="bardChoiceButtons"></div>';boardPopup.prepend(bardChoiceBox);const bardChoiceText=bardChoiceBox.querySelector('#bardChoiceText'),bardChoiceButtons=bardChoiceBox.querySelector('#bardChoiceButtons');const kamikazeBox=document.createElement('div');kamikazeBox.className='notice hidden';kamikazeBox.innerHTML='<b>💥 Autodestruição do Kamikaze</b><div class="muted small" style="margin:5px 0 9px">As casas marcadas serão atingidas. A explosão também acerta aliados e o próprio Kamikaze morre.</div><div class="row"><button class="primary" id="confirmKamikaze">Confirmar explosão</button><button id="cancelKamikaze">Cancelar</button></div>';boardPopup.prepend(kamikazeBox);const confirmKamikazeBtn=kamikazeBox.querySelector('#confirmKamikaze'),cancelKamikazeBtn=kamikazeBox.querySelector('#cancelKamikaze');const shieldConfirmBox=document.createElement('div');shieldConfirmBox.className='notice hidden';shieldConfirmBox.innerHTML='<b id="shieldConfirmTitle">🛡️ Confirmar vínculo</b><div id="shieldConfirmText" class="muted small" style="margin:5px 0 9px"></div><div class="row"><button class="primary" id="confirmShieldLink">Confirmar</button><button id="cancelShieldLink">Cancelar</button></div>';boardPopup.prepend(shieldConfirmBox);const shieldConfirmTitle=shieldConfirmBox.querySelector('#shieldConfirmTitle'),shieldConfirmText=shieldConfirmBox.querySelector('#shieldConfirmText'),confirmShieldLinkBtn=shieldConfirmBox.querySelector('#confirmShieldLink'),cancelShieldLinkBtn=shieldConfirmBox.querySelector('#cancelShieldLink');const sureShotBox=document.createElement('div');sureShotBox.className='notice hidden';sureShotBox.innerHTML='<b>🏹 Confirmar Tiro Certeiro</b><div class="muted small" style="margin:5px 0 9px">As casas marcadas mostram até onde o ataque poderá alcançar neste turno.</div><div class="row"><button class="primary" id="confirmSureShot">Confirmar habilidade</button><button id="cancelSureShot">Cancelar</button></div>';boardPopup.prepend(sureShotBox);const confirmSureShotBtn=sureShotBox.querySelector('#confirmSureShot'),cancelSureShotBtn=sureShotBox.querySelector('#cancelSureShot');const paranoiaBox=document.createElement('div');paranoiaBox.className='notice hidden';paranoiaBox.innerHTML='<b>🧠 Presença Fantasma</b><div id="paranoiaChoiceText" class="muted small" style="margin:5px 0 9px">Escolha exatamente 2 casas dentro do Alc. Hab.</div><div class="row"><button class="primary" id="confirmParanoia">Confirmar presenças</button><button id="cancelParanoia">Cancelar</button></div>';boardPopup.prepend(paranoiaBox);const paranoiaChoiceText=paranoiaBox.querySelector('#paranoiaChoiceText'),confirmParanoiaBtn=paranoiaBox.querySelector('#confirmParanoia'),cancelParanoiaBtn=paranoiaBox.querySelector('#cancelParanoia');
  const auditBtn=$('#auditBtn'),auditBox=$('#auditBox');
  const setupBasesEl=$('#setupBases'),base1Btn=$('#base1Btn'),base2Btn=$('#base2Btn'),baseSetupStatus=$('#baseSetupStatus');
  const teamSection=$('#teamSection'),teamTitle=$('#teamTitle'),teamToggle=$('#teamToggle'),readyStatus=$('#readyStatus');
  const pieceInfo=$('#pieceInfo'),pieceInfoTitle=$('#pieceInfoTitle'),pieceInfoBody=$('#pieceInfoBody'),closePieceInfoBtn=$('#closePieceInfo'),setupInspector=$('#setupInspector'),setupInspectorTitle=$('#setupInspectorTitle'),setupInspectorBody=$('#setupInspectorBody');
  const basePanel=$('#basePanel'),basePanelTitle=$('#basePanelTitle'),basePanelInfo=$('#basePanelInfo'),baseBonusGrid=$('#baseBonusGrid'),baseTargetArea=$('#baseTargetArea'),baseTargetGrid=$('#baseTargetGrid'),closeBasePanelBtn=$('#closeBasePanel');
  const rosterFilters=$('#rosterFilters'),filterButtons=[...document.querySelectorAll('#rosterFilters [data-filter]')],soundToggle=$('#soundToggle'),volumeControl=$('#volumeControl'),aiDifficultyEl=$('#aiDifficulty'),matchSettingsEl=$('#matchSettings'),playerTeamSizeEl=$('#playerTeamSize'),enemyTeamSizeEl=$('#enemyTeamSize'),playerLossLimitEl=$('#playerLossLimit'),enemyLossLimitEl=$('#enemyLossLimit'),resetMatchSettingsBtn=$('#resetMatchSettings');
  const Audio=window.GameAudio||{play:()=>{},bind:()=>{},resume:()=>{}};Audio.bind(soundToggle,volumeControl);

  let setupSelected=null,setupBaseSelected=null,selected=[],setupPos=new Map(),setupBasePos=new Map(),cells=new Map(),seerPreview=new Set();
  let openedBaseId=null,pendingBaseBonusId=null,pendingShieldTargetId=null;
  let rosterCollapsed=false,inspectedPieceId=null,rosterFilter='all',aiDifficulty='normal';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(n)||a)));
  function currentMatchConfig(){const ps=clamp(playerTeamSizeEl?.value||4,1,8),es=clamp(enemyTeamSizeEl?.value||4,1,8),pl=clamp(playerLossLimitEl?.value||Math.min(3,ps),1,ps),el=clamp(enemyLossLimitEl?.value||Math.min(3,es),1,es);return{teamSize:{player:ps,enemy:es},lossLimit:{player:pl,enemy:el}};}
  function syncMatchSettings(){if(!playerTeamSizeEl)return;const cfg=currentMatchConfig();playerTeamSizeEl.value=cfg.teamSize.player;enemyTeamSizeEl.value=cfg.teamSize.enemy;playerLossLimitEl.max=cfg.teamSize.player;enemyLossLimitEl.max=cfg.teamSize.enemy;playerLossLimitEl.value=cfg.lossLimit.player;enemyLossLimitEl.value=cfg.lossLimit.enemy;while(selected.length>cfg.teamSize.player){const name=selected.pop();for(const[k,val]of setupPos)if(val===name)setupPos.delete(k);}if(view().phase==='setup')render();}
  const difficultyLabel=d=>({easy:'Nível 1',normal:'Nível 2',hard:'Nível 3',extreme:'Nível 4'}[d]||'Nível 2');
  const CLASSIC_DIFFICULTY_KEY='bnsClassicDifficulty';
  const validDifficulty=d=>['easy','normal','hard','extreme'].includes(d);
  function restoreClassicDifficulty(){try{const d=localStorage.getItem(CLASSIC_DIFFICULTY_KEY);if(validDifficulty(d)){aiDifficulty=d;if(aiDifficultyEl)aiDifficultyEl.value=d;}}catch{}}
  function saveClassicDifficulty(d){if(!validDifficulty(d))return;aiDifficulty=d;try{localStorage.setItem(CLASSIC_DIFFICULTY_KEY,d);}catch{}}
  let status='Inspecione os personagens e marque ☐ Selecionar para montar a equipe.';
  const ABILITY_TEXT=window.BNSCharacterInfo.text;
  const TREE_CELLS=new Set(R.treeCells||['B3','G6']);
  const ROCK_CELLS=new Set(R.rockCells||['F2','C7']);
  const WATER_CELLS=new Set(R.waterCells||['D3','E6']);
  const SWAMP_CELLS=new Set(R.swampCells||['C5','F4']);
  const setStatus=t=>{status=t;statusEl.textContent=t;};
  function appendCornerMarker(cell,el,slot='tr'){
    if(!cell||!el)return;const n=cell.querySelectorAll(`.corner-marker.slot-${slot}`).length;el.classList.add('corner-marker',`slot-${slot}`);el.style.setProperty('--marker-stack',String(n));cell.appendChild(el);
  }
  let previousFxView=null,pendingActionFx=[];
  const FX_MS=760;
  function clearFxClass(el,cls,ms=FX_MS){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),ms);}
  function cellFx(c,cls,text=null,textClass=''){
    const el=cells.get(c);if(!el)return;clearFxClass(el,cls);
    if(text){const s=document.createElement('span');s.className=`fx-float ${textClass}`.trim();s.textContent=text;el.appendChild(s);setTimeout(()=>s.remove(),FX_MS+80);}
  }
  function panelFx(el){if(!el)return;clearFxClass(el,'fx-panel',520);}
  function immediateActionFx(v,kind,to=null,targets=[]){
    if(v.phase!=='play')return;const p=activePiece(v);if(!p)return;
    pendingActionFx.push({kind,from:p.coord,to,targets:[...targets]});
  }
  function flushActionFx(v){
    const list=pendingActionFx.splice(0);for(const fx of list){
      if(fx.kind==='move'&&fx.to){cellFx(fx.from,'fx-move-origin');const h=v.history?.[0]||'';if(/Confronto|repelid/i.test(h)){cellFx(fx.to,'fx-clash','⚔ CONFRONTO','clash');Audio.play('clash');}else cellFx(fx.to,'fx-move-land');}
      if(fx.kind==='attack'&&fx.to){cellFx(fx.from,'fx-cast');cellFx(fx.to,'fx-attack','⚔','clash');Audio.play('attack');}
      if(fx.kind==='pyro'){cellFx(fx.from,'fx-cast');for(const c of fx.targets)cellFx(c,'fx-attack','🔥','fire');Audio.play('attack');}
    }
  }
  function snapshotFx(v){try{return structuredClone(v);}catch{return JSON.parse(JSON.stringify(v));}}
  function applyStateFx(prev,v){
    if(!prev||prev.phase!=='play'||v.phase!=='play')return;
    const before=new Map((prev.ownPieces||[]).map(p=>[p.id,p])),after=new Map((v.ownPieces||[]).map(p=>[p.id,p]));
    let heardHit=false,heardDeath=false,heardExplosion=false,heardSummon=false,heardTransform=false,heardSabotage=false,heardReflect=false,heardPerception=false,heardMagic=false;
    for(const [id,p] of after){const b=before.get(id);if(!b){if(p.alive){cellFx(p.coord,'fx-summon',p.summonType==='skeleton'?'☠ ERGUIDO':'DIVISÃO','magic');heardSummon=true;}continue;}
      if(b.alive&&p.alive&&b.coord!==p.coord){cellFx(b.coord,'fx-move-origin');cellFx(p.coord,'fx-move-land');}
      if(p.hp<b.hp){cellFx(p.coord,'fx-hit',`-${b.hp-p.hp}`,'damage');heardHit=true;}
      if(b.alive&&!p.alive){cellFx(b.coord,'fx-hit','☠','damage');heardDeath=true;if(b.name==='Kamikaze'){cellFx(b.coord,'fx-explosion','💥','fire');for(const c of R.neighbors(b.coord,true))cellFx(c,'fx-explosion');heardExplosion=true;}}
      if(b.form!==p.form&&p.form==='lava'){cellFx(p.coord,'fx-transform','🌋','fire');heardTransform=true;}
    }
    const prevBases=new Map((prev.bases||[]).map(b=>[b.id,b]));for(const b of v.bases||[]){const old=prevBases.get(b.id);if(old&&!old.sabotaged&&b.sabotaged){cellFx(b.coord,'fx-sabotage','SABOTADO','fire');heardSabotage=true;}}
    const oldMir=new Set((prev.ownMirrors||[]).map(m=>m.coord)),newMir=new Set((v.ownMirrors||[]).map(m=>m.coord));for(const c of newMir)if(!oldMir.has(c)){cellFx(c,'fx-summon','🪞','magic');heardMagic=true;}
    if((v.history?.[0]||'')!==(prev.history?.[0]||'')){panelFx(historyEl);const h=v.history?.[0]||'';if(h.includes('Espelho')&&h.includes('reflet')){for(const c of oldMir)if(!newMir.has(c))cellFx(c,'fx-reflect','↩','magic');heardReflect=true;}}
    if((v.intel?.[0]||'')!==(prev.intel?.[0]||'')){panelFx(intelEl);const p=activePiece(v)||activePiece(prev);if(p&&/presença|PER/i.test(v.intel?.[0]||'')){cellFx(p.coord,'fx-perception','◉','magic');heardPerception=true;}}
    for(const c of v.impactCells||[v.impactCell].filter(Boolean))if(!(prev.impactCells||[prev.impactCell]).includes(c)){cellFx(c,'fx-attack','💥','damage');heardHit=true;}
    const oldSeer=new Set(prev.seerArea||[]),newSeer=new Set(v.seerArea||[]);if([...newSeer].some(c=>!oldSeer.has(c))){for(const c of newSeer)cellFx(c,'fx-seer');heardMagic=true;}
    if(prev.turn!==v.turn||prev.round!==v.round){clearFxClass(phaseEl,'fx-turn',680);if(v.turn==='player')Audio.play('turn');}
    if(heardExplosion)Audio.play('explosion');else if(heardHit)Audio.play('hit');else if(heardDeath)Audio.play('death');
    if(heardTransform)Audio.play('transform');if(heardSummon)Audio.play('summon');if(heardSabotage)Audio.play('sabotage');if(heardReflect)Audio.play('reflect');else if(heardMagic)Audio.play('magic');if(heardPerception)Audio.play('perception');
  }

  function renderList(el,arr,empty){
    el.innerHTML='';if(!arr.length){el.innerHTML=`<div class="muted empty-feed">${empty}</div>`;return;}
    const kind=el===intelEl?'intel-entry':'history-entry';
    const tone=t=>el===intelEl?'':(/🏰|🏚️/.test(t)?' objective':/👁️|🪞|💀|🌋|🟢|⏳|⌛/.test(t)?' ability':/⚔️|☠️|💥|🎯|↩️|⚠️/.test(t)?' combat':/🔄|🎲|🏆|⚖️/.test(t)?' system':'');
    arr.forEach((t,i)=>{const d=document.createElement('div');d.className=`event-entry ${kind}${tone(t)}${i===0?' latest':''}`;d.textContent=t;el.appendChild(d);});
  }
  function view(){return player.getView();}
  function ownAlive(v){return v.ownPieces.filter(p=>p.alive);}
  function ownAtAll(v,c){return ownAlive(v).filter(p=>p.coord===c);}
  function ownAt(v,c){const ps=ownAtAll(v,c);return ps.find(p=>p.name==='Escudeiro')||ps[0]||null;}
  function corpseAt(v,c){return v.corpses.some(x=>x.coord===c);}
  function ownMirrorAt(v,c){return v.ownMirrors.some(x=>x.coord===c);}
  function baseAt(v,c){return (v.bases||[]).find(b=>b.coord===c)||null;}
  function isCorner(c){const q=R.rc(c);return (q.x===0||q.x===7)&&(q.y===0||q.y===7);}
  function setupCellFree(c,ignorePiece=null,ignoreBase=null){
    if(R.isBlocked(c))return false;
    const piece=setupPos.get(c);if(piece&&piece!==ignorePiece)return false;
    for(const [i,bc] of setupBasePos)if(bc===c&&i!==ignoreBase)return false;
    return true;
  }
  function setupCandidates(kind){
    const piecePreferred=['C1','D1','E1','F1','B1','G1','C2','F2','D2','E2','B3','G3','C4','F4'];
    const basePreferred=['B2','G2','B3','G3','C2','F2','D2','E2','B4','G4','C3','F3'];
    const all=[];for(let y=1;y<=4;y++)for(const col of 'ABCDEFGH')all.push(col+y);
    const list=[...(kind==='base'?basePreferred:piecePreferred),...all];return [...new Set(list)];
  }
  function autoPlacePiece(name){for(const c of setupCandidates('piece'))if(setupCellFree(c,name,null)){setupPos.set(c,name);return c;}return null;}
  function autoPlaceBase(index){for(const c of setupCandidates('base'))if(!isCorner(c)&&setupCellFree(c,null,index)){setupBasePos.set(index,c);return c;}return null;}
  function handleSetupBaseButton(index){
    setupSelected=null;
    if(setupBasePos.has(index)){setupBaseSelected=index;setStatus(`Posto ${index} selecionado. Clique em outra casa para reposicionar.`);render();return;}
    const c=autoPlaceBase(index);setupBaseSelected=null;setStatus(c?`Posto ${index} entrou automaticamente em ${c}. Clique nele no tabuleiro para ajustar.`:'Não há casa livre para posicionar o Posto.');render();
  }
  function activePiece(v){return v.activation?ownAlive(v).find(p=>p.id===v.activation.pieceId):null;}
  function pendingTurnStep(v){
    if(v.pendingCombat)return 'Falta escolher onde o vencedor termina após o Confronto Direto.';
    if(v.doppelChoice)return 'Doppelgänger aguarda sua decisão: manter a habilidade atual ou copiar a nova.';
    const a=v.activation,p=activePiece(v);if(!a||!p)return 'Escolha uma unidade disponível para agir.';
    const name=p.displayName||p.name||'Unidade',mode=a.mode;
    if(mode==='move')return a.committed?`${name}: ainda está se movendo · ${a.moveRemaining||0} M restante${Number(a.moveRemaining||0)===1?'':'s'}. Mova novamente ou use Parar movimento; Encerrar turno fica bloqueado enquanto houver M restante.`:`${name}: movimento preparado. Escolha uma casa para mover ou cancele.`;
    if(mode==='attack')return `${name}: falta escolher a casa do ataque.`;
    if(mode==='sureShotConfirm')return `${name}: falta confirmar ou cancelar o Tiro Certeiro.`;
    if(mode==='pyro'){const n=(a.pyroTargets||[]).length;return `${name}: Rajada Dupla · ${n}/2 casas escolhidas. A confirmação aparece após escolher as 2 casas.`;}
    if(mode==='paranoiaPresence'){const n=(a.paranoiaTargets||[]).length;return `${name}: Presença Fantasma · ${n}/2 casas escolhidas. Complete as 2 casas e confirme.`;}
    if(mode==='seer')return `${name}: falta escolher as 2 casas da visão e confirmar.`;
    if(mode==='kamikaze')return `${name}: Autodestruição preparada. Falta confirmar ou cancelar.`;
    if(mode==='shieldLink'){const t=pendingShieldTargetId&&v.ownPieces.find(x=>x.id===pendingShieldTargetId);return t?`${name}: falta confirmar o vínculo com ${t.displayName}.`:`${name}: falta escolher um aliado para o vínculo.`;}
    if(mode==='shieldUnlink')return `${name}: falta confirmar ou cancelar a desvinculação.`;
    if(mode==='raise')return `${name}: falta escolher um cadáver para a habilidade.`;
    if(mode==='mirror')return `${name}: falta escolher onde colocar o Espelho.`;
    if(mode==='awaken')return `${name}: falta escolher uma Árvore para despertar.`;
    if(mode==='spotTrap')return `${name}: falta escolher onde colocar a armadilha de revelação.`;
    if(mode==='damageTrap')return `${name}: falta escolher onde colocar a armadilha de dano.`;
    if(mode==='bard')return `${name}: falta escolher o aliado e o bônus da Inspiração.`;
    if(mode==='absorbRock')return `${name}: falta escolher a Pedra adjacente para consumir.`;
    if(p.sureShotActive)return `${name}: Tiro Certeiro já está ativo. Falta atacar com o alcance ampliado ou encerrar o turno.`;
    if(a.committed)return `${name}: movimento concluído. Ainda falta atacar, usar habilidade, sabotar um Posto ou encerrar o turno.`;
    return `${name} selecionado. Movimento é opcional; você pode mover, atacar, usar habilidade ou encerrar o turno.`;
  }
  function renderTurnGuide(v){
    if(!turnGuide)return;
    if(v.phase!=='play'||v.gameOver){turnGuide.className='notice turn-guide hidden';turnGuide.innerHTML='';return;}
    const mine=v.turn==='player',used=Number(v.roundActivationsUsed||0),limit=Number(v.roundActivationLimit||0),remaining=Math.max(0,limit-used);
    let title,detail,cls;
    if(!mine){title='⏳ AGUARDE — VEZ DA IA';detail='A partida continua automaticamente quando a IA terminar.';cls='waiting-turn';}
    else if(v.activation){const p=activePiece(v);title=`▶ ${(p?.displayName||p?.name||'UNIDADE').toUpperCase()} — TURNO EM ANDAMENTO`;detail=pendingTurnStep(v);cls='your-turn';}
    else{title='▶ SUA VEZ';detail=used>0&&remaining>0?'Seu turno anterior terminou. Escolha outra unidade disponível.':'Escolha uma unidade disponível para agir.';cls=used>0&&remaining>0?'turn-again':'your-turn';}
    turnGuide.className=`notice turn-guide ${cls}`;turnGuide.innerHTML=`<div><div class="turn-guide-title">${title}</div><div class="turn-guide-detail">${detail}</div></div><div class="turn-guide-count">Seus turnos na rodada: ${used}/${limit} · restam ${remaining}</div>`;
  }
  function visibleAt(v,c){return (v.visibleOpponents||[]).filter(p=>p.coord===c);}
  function pieceBonusTags(p){
    const tags=[];
    if(p.bonusM)tags.push(`👟 +${p.bonusM} M`);
    if(p.bonusV)tags.push(`❤️ +${p.bonusV} V`);
    if(p.bonusA)tags.push(`⚔️ +${p.bonusA} ATQ`);
    if(p.bonusRange)tags.push(`🎯 +${p.bonusRange} ALC`);if(p.bonusAH)tags.push(`✨ +${p.bonusAH} Alc. Hab.`);if(p.golemArmor)tags.push('🛡️ Armadura 1');
    if(p.radarAdvanced)tags.push('📡 Radar Avançado');
    if(p.radarExpanded)tags.push('📶 Radar Ampliado');
    return tags;
  }
  function showDefinitionInfo(d){
    if(!d)return;inspectedPieceId=null;
    const alc=d.range===99?'∞':d.range;
    const flying=(d.flying&&A.effects?.voador)?`<div class="info-pill flying-trait"><img class="trait-icon" src="${A.effects.voador}" alt="Voador"> <b>Voador</b></div>`:'';const html=`<div class="setup-definition"><div class="piece-info-grid"><div class="info-pill">❤️ Vida: <b>${d.v}</b></div><div class="info-pill">👣 Movimento: <b>${d.m}</b></div><div class="info-pill">⚔️ Ataque: <b>${d.a}</b></div><div class="info-pill">🎯 Alcance: <b>${alc}</b></div><div class="info-pill">👁️ Percepção: <b>PER ${d.per}</b></div><div class="info-pill">✨ Alc. Hab.: <b>${d.ah||0}</b></div><div class="info-pill">Arquétipo: <b>${d.typeIcon} ${R.archetypeName(d.type)}</b></div>${flying}</div><div class="ability-box"><b>Habilidade / característica</b><br>${ABILITY_TEXT[d.name]||'Sem descrição adicional.'}</div></div>`;
    if(setupInspector){setupInspectorTitle.textContent=`${d.icon} ${d.name}`;setupInspectorBody.innerHTML=html;setupInspector.classList.remove('hidden');}
  }
  function cooldownText(p){
    if(!p)return '';
    const name=p.copied||p.displayName||p.name,parts=[];
    if(name==='Arqueiro'&&(p.sureShotCooldown||0)>0)parts.push(`🏹 Tiro Certeiro: ${p.sureShotCooldown} turno${p.sureShotCooldown===1?'':'s'}`);
    if(name==='Piromante'&&(p.pyroCooldown||0)>0)parts.push(`🔥 Rajada Dupla: ${p.pyroCooldown} turno${p.pyroCooldown===1?'':'s'}`);
    if(name==='Ninja'&&(p.ninjaSmokeCooldown||0)>0)parts.push(`🌫️ Bomba de Fumaça: ${p.ninjaSmokeCooldown} turno${p.ninjaSmokeCooldown===1?'':'s'}`);
    return parts.length?`<div class="cooldown-note"><b>⏳ Recarga:</b> ${parts.join(' · ')}</div>`:'';
  }
  function pieceAbilityText(p){return window.BNSCharacterInfo.abilityText(p);}
  function showPieceInfo(v,p,enemy=false){
    if(!p)return;
    inspectedPieceId=p.id;
    pieceInfoTitle.textContent=`${p.icon} ${p.displayName}${enemy?' — inimigo revelado':''}`;
    const tags=pieceBonusTags(p);
    const kind=p.summonType==='skeleton'?'Invocação: Esqueleto':p.summonType==='miniSlime'?'Divisão: Mini-Slime':p.summonType==='livingBranch'?'Invocação: Galho-Vivo':p.form==='lava'?'Forma: Golem de Lava':p.possessing?'👻 Corpo possuído':p.possessedAway?'👻 Possuído — localização perdida':p.original?'Personagem original':'Unidade';
    const copied=p.copied?`<div class="info-pill">🎭 Habilidade copiada: <b>${p.copied}</b></div>`:'';
    const cd=p.name==='Mago do Espelho'?'<div class="info-pill">🪞 Espelho: <b>disponível a cada turno · máximo 1 ativo</b></div>':'';
    const lineage=p.summonType==='miniSlime'?'<div class="info-pill slime-lineage">🟢 Linhagem: <b>a eliminação só conta quando todos os Mini-Slimes forem destruídos</b></div>':'';
    const flying=(p.flying&&A.effects?.voador)?`<div class="info-pill flying-trait"><img class="trait-icon" src="${A.effects.voador}" alt="Voador"> <b>Voador</b></div>`:'';
    const temporary=(p.effects||[]).length?`<div class="temporary-effects">${p.effects.map(e=>`<span class="temp-effect-tag ${e.kind||'neutral'}" title="${e.name} · reduz por ${e.tick==='turn'?'turno':e.tick==='activation'?'turno':'rodada'}">${e.icon||'⏳'} ${e.name} <b>${e.remaining}</b></span>`).join('')}</div>`:'';
    pieceInfoBody.innerHTML=`
      <div class="piece-info-grid">
        <div class="info-pill">Vida: <b>${p.hp}/${p.maxHp}</b></div>
        <div class="info-pill">Movimento: <b>${p.m}</b></div>
        <div class="info-pill">Ataque: <b>${p.a}</b></div>
        <div class="info-pill">Alcance: <b>${p.range}</b></div>
        <div class="info-pill">Percepção: <b>PER ${p.per}</b></div><div class="info-pill">Alc. Hab.: <b>${p.ah||0}</b></div>
        <div class="info-pill">Arquétipo: <b>${p.typeIcon||''} ${R.archetypeName(p.type)}</b></div>
        <div class="info-pill">${kind}</div>
        ${copied}${cd}${lineage}${flying}
      </div>
      <div class="ability-box"><b>${p.copied?'Habilidade atual — '+p.copied:'Habilidade / característica'}</b><br>${pieceAbilityText(p)}</div>${cooldownText(p)}
      <div class="small muted" style="margin-top:9px">Bônus desta unidade:</div>
      <div class="bonus-tags">${tags.length?tags.map(t=>`<span class="bonus-tag">${t}</span>`).join(''):'<span class="small muted">Nenhum bônus nesta unidade.</span>'}</div>
      ${temporary}
    `;
  }
  function refreshPieceInfo(v){
    if(!inspectedPieceId)return;
    const own=v.ownPieces.find(p=>p.id===inspectedPieceId);
    if(own){showPieceInfo(v,own,false);return;}
    const enemy=(v.visibleOpponents||[]).find(p=>p.id===inspectedPieceId);
    if(enemy){showPieceInfo(v,enemy,true);return;}
    inspectedPieceId=null;pieceInfoTitle.textContent='Ficha da unidade';pieceInfoBody.innerHTML='<div class="muted empty-inspector">Clique em uma peça para ver vida, movimento, ataque, alcance, percepção e bônus.</div>';
  }
  function canShareUi(v,p,c){if(((v.rocks||[]).includes(c)&&!p.flying)||baseAt(v,c))return false;const tree=(v.trees||[]).find(t=>t.coord===c&&t.state==='live');if(tree&&!p.flying&&p.name!=='Druida')return false;const ps=ownAtAll(v,c).filter(x=>x.id!==p.id),isLinker=x=>x?.name==='Escudeiro'||(x?.name==='Doppelgänger'&&x?.copied==='Escudeiro');const follower=ownAtAll(v,p.coord).find(x=>x.alive&&x.linkedToId===p.id);if(follower&&ps.length)return false;if(!ps.length)return true;if(ps.length>=2)return false;return isLinker(p)||ps.some(isLinker);}
  function hideStackChoice(){stackChoice.classList.add('hidden');stackButtons.innerHTML='';}
  function showStackChoice(v,pieces){
    stackButtons.innerHTML='';
    pieces.forEach(piece=>{const b=document.createElement('button');b.type='button';b.textContent=`${piece.icon} ${piece.displayName}${piece.activated?' — já agiu':''}`;b.disabled=piece.activated;b.addEventListener('click',()=>{showPieceInfo(view(),piece,false);const r=player.selectPiece(piece.id);setStatus(r.status);hideStackChoice();hideBardChoice();pendingShieldTargetId=null;render();});stackButtons.appendChild(b);});
    stackChoice.classList.remove('hidden');
  }

  function closeBasePanel(){openedBaseId=null;pendingBaseBonusId=null;pendingShieldTargetId=null;basePanel.classList.add('hidden');baseTargetArea.classList.add('hidden');baseBonusGrid.innerHTML='';baseTargetGrid.innerHTML='';}
  function canSabotageBase(v,base){const p=activePiece(v),a=v.activation;return !!(p&&a&&!a.mode&&base.owner==='enemy'&&!base.sabotaged&&R.neighbors(base.coord,true).includes(p.coord));}
  function chooseBaseBonus(v,base,bonus){
    if(!canSabotageBase(v,base)){setStatus('Selecione uma peça e fique em uma das 8 casas ao redor do Posto para sabotar.');return;}
    if(v.chosenBaseBonuses.includes(bonus.id)){setStatus('Esse benefício já foi escolhido nesta partida.');return;}
    if(['radarAdvanced','radarExpanded','move','life','attack','range','abilityRange'].includes(bonus.id)){
      pendingBaseBonusId=bonus.id;baseTargetGrid.innerHTML='';
      for(const btn of baseBonusGrid.querySelectorAll('.bonus-btn'))btn.classList.toggle('pending',btn.dataset.bonus===bonus.id);
      const label=baseTargetArea.querySelector('.small.muted');if(label)label.textContent=`Escolha quem recebe ${bonus.icon} ${bonus.name}:`;
      let targets=v.ownPieces.filter(p=>p.alive);
      if(bonus.id==='range')targets=targets.filter(p=>p.a>0);if(bonus.id==='abilityRange')targets=targets.filter(p=>(p.ah||0)>0);
      for(const t of targets){const b=document.createElement('button');b.type='button';b.className='target-btn';b.innerHTML=`<b>${t.icon} ${t.displayName}${t.original?'':' <span class="muted">(invocação)</span>'}</b><span>V${t.hp}/${t.maxHp} · M${t.m} · ATQ${t.a} · ALC${t.range} · PER${t.per} · Alc. Hab. ${t.ah||0}</span>`;b.addEventListener('click',()=>{const r=player.sabotageBase(base.id,bonus.id,t.id);setStatus(r.status);closeBasePanel();afterMutation();});baseTargetGrid.appendChild(b);}
      baseTargetArea.classList.remove('hidden');setStatus(`Escolha qual personagem recebe ${bonus.icon} ${bonus.name}.`);return;
    }
    const r=player.sabotageBase(base.id,bonus.id,null);setStatus(r.status);closeBasePanel();afterMutation();
  }
  function openBasePanel(v,base){
    openedBaseId=base.id;pendingBaseBonusId=null;basePanel.classList.remove('hidden');baseTargetArea.classList.add('hidden');
    const own=base.owner==='player',ready=canSabotageBase(v,base);basePanel.classList.toggle('base-ready',ready);basePanel.classList.toggle('base-owned',own);basePanel.classList.toggle('base-sabotaged',base.sabotaged);
    const state=base.sabotaged?' — SABOTADO':ready?' — AO ALCANCE':'';
    basePanelTitle.textContent=`${'🏰'} ${own?'Seu Posto de Operação':'Posto de Operação inimigo'}${state}`;
    if(base.sabotaged)basePanelInfo.textContent='Este Posto já foi sabotado.';
    else if(own)basePanelInfo.textContent='Seu Posto é público. O inimigo pode sabotá-lo de qualquer uma das 8 casas ao redor, inclusive diagonal.';
    else basePanelInfo.textContent=canSabotageBase(v,base)?'Você está em posição de sabotagem. Escolha um benefício abaixo; a sabotagem gasta a ação e encerra a turno.':'Pode ser sabotado de qualquer uma das 8 casas ao redor, inclusive diagonal. Selecione uma peça e aproxime-se para usar um dos benefícios abaixo.';
    baseBonusGrid.innerHTML='';
    for(const bonus of v.baseBonusCatalog||[]){const used=v.chosenBaseBonuses.includes(bonus.id);const b=document.createElement('button');b.type='button';b.dataset.bonus=bonus.id;b.className='bonus-btn'+(used?' used':'');b.disabled=used||own||base.sabotaged||!ready;b.innerHTML=`<b><span class="bonus-icon">${bonus.icon}</span> ${bonus.name}</b><div class="small muted" style="margin-top:3px">${bonus.description}</div>${used?'<div class="small used-label">✓ Já escolhido</div>':''}`;b.addEventListener('click',()=>chooseBaseBonus(view(),base,bonus));baseBonusGrid.appendChild(b);}
  
  }

  function makePieceToken(p,enemy=false){
    const m=document.createElement('span');
    const state=!enemy?(p.activated?' spent-token':' ready-token'):'';
    m.className=`piece-token art-token type-${p.type||'C'}${enemy?' enemy-token':''}${state?' '+state:''}`;
    const src=A.character?.(p.displayName||p.name);if(src){const im=A.img(src,'piece-art',p.displayName||p.name);m.appendChild(im);}else m.textContent=p.icon||'';
    return m;
  }
  function addDurationBadges(cell,p,enemy=false){
    const effects=(p?.effects||[]).filter(e=>Number(e.remaining)>0);if(!effects.length)return;
    const wrap=document.createElement('span');wrap.className=`duration-badges${enemy?' enemy-duration':''}`;
    for(const e of effects.slice(0,2)){const b=document.createElement('span');b.className=`duration-badge ${e.kind||'neutral'}`;b.textContent=`${e.icon||'⏳'}${e.remaining}`;b.title=`${e.name} — ${e.remaining} ${(e.tick==='turn'||e.tick==='activation')?'turno(s)':'rodada(s)'}`;wrap.appendChild(b);}
    if(effects.length>2){const b=document.createElement('span');b.className='duration-badge more';b.textContent=`+${effects.length-2}`;wrap.appendChild(b);}
    cell.appendChild(wrap);
  }
  function addHpBadge(cell,p,enemy=false){
    if(!p||typeof p.hp!=='number')return;
    const h=document.createElement('span');h.className=`hp-badge${enemy?' enemy-hp':''}`;h.textContent=`♥${p.hp}`;cell.appendChild(h);
  }
  function addBiomeHpBadge(cell,hp){
    if(typeof hp!=='number')return;const h=document.createElement('span');h.className='hp-badge terrain-hp';h.textContent=`♥${hp}`;cell.appendChild(h);
  }
  function addScenery(cell,c,v){
    const t=(v?.trees||[]).find(x=>x.coord===c)||(v?.phase==='setup'&&TREE_CELLS.has(c)?{state:'live'}:null);
    const rock=(v?.rocks||[]).includes(c)||(v?.phase==='setup'&&ROCK_CELLS.has(c));
    const water=(v?.water||[]).includes(c)||(v?.phase==='setup'&&WATER_CELLS.has(c));
    const swamp=(v?.swamps||[]).includes(c)||(v?.phase==='setup'&&SWAMP_CELLS.has(c));
    if(t){cell.classList.add('terrain-tree');if(t.state==='live')cell.classList.add('terrain-blocked');const src=t.state==='dead'?A.terrain?.deadTree:A.terrain?.tree;if(src){const r=A.img(src,'scenery-art',t.state==='dead'?'Árvore destruída':'Árvore');r.title=t.state==='dead'?'Árvore destruída — passagem aberta; não pode ser despertada':`Árvore viva — ${t.hp??3}/3 Vida · bloqueia todos exceto o Druida`;cell.appendChild(r);}if(t.state==='live')addBiomeHpBadge(cell,Number(t.hp??3));return;}
    if(rock){cell.classList.add('terrain-blocked','terrain-rock');if(A.terrain?.rock){const r=A.img(A.terrain.rock,'scenery-art','Pedra');r.title=`Pedra — ${(v?.rockHp||{})[c]??3}/3 Vida · bloqueia passagem e posicionamento.`;cell.appendChild(r);}addBiomeHpBadge(cell,Number((v?.rockHp||{})[c]??3));return;}
    if(water){cell.classList.add('terrain-water');if(A.terrain?.water){const r=A.img(A.terrain.water,'scenery-art','Lago');r.title='Lago — terreno passável sem custo extra.';cell.appendChild(r);}return;}
    if(swamp){cell.classList.add('terrain-swamp');if(A.terrain?.swamp){const r=A.img(A.terrain.swamp,'scenery-art','Pântano');r.title='Pântano — entrar custa 2 de movimento.';cell.appendChild(r);}}
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

  function renderSelectedStrip(v){
    let strip=document.getElementById('selectedStrip');if(!strip){strip=document.createElement('div');strip.id='selectedStrip';strip.className='selected-strip';roster.parentNode.insertBefore(strip,roster);}
    if(v.phase!=='setup'){strip.classList.add('hidden');strip.innerHTML='';return;}strip.classList.remove('hidden');strip.innerHTML='<span class="selected-strip-label">Escolhidos:</span>';
    if(!selected.length){const e=document.createElement('span');e.className='small muted';e.textContent='nenhum';strip.appendChild(e);return;}
    for(const name of selected){const d=R.byName[name],b=document.createElement('button');b.type='button';b.className='selected-chip';b.title=`Remover ${name} da equipe`;b.innerHTML=`${A.html?.(A.character?.(name),'',name)||d?.icon||''}<span>${name}</span><span class="remove-x">×</span>`;b.onclick=()=>d&&toggleSetupCharacter(d);strip.appendChild(b);}
  }
  function renderRoster(v){
    renderSelectedStrip(v);
    roster.innerHTML='';
    const defs=R.defs.filter(d=>rosterFilter==='all'||(rosterFilter==='flying'?!!d.flying:d.type===rosterFilter));
    defs.forEach(d=>{
      const chosen=v.phase==='setup'?selected.includes(d.name):v.ownPieces.some(p=>p.original&&p.name===d.name);
      const p=v.phase==='play'?v.ownPieces.find(q=>q.original&&q.name===d.name):null;
      const active=p&&v.activation?.pieceId===p.id;
      const card=document.createElement('div');const turnState=p?unitTurnState(v,p):{cls:''};card.className='char roster-card type-'+d.type+(chosen?' chosen':'')+(active?' active turn-active-char':'')+(p?.activated?' spent-char':'')+(turnState.cls==='ready'?' ready-char':'');card.tabIndex=0;card.setAttribute('role','button');
      let state='';
      if(v.phase==='play'&&chosen)state=p?unitTurnState(v,p).label:'☠ Eliminada';
      card.innerHTML=`<div class="roster-main"><span class="roster-icon">${A.html?.(A.character?.(d.name),'roster-art',d.name)||d.icon}</span><span class="roster-name">${d.name}</span><span class="roster-type">${A.html?.(A.archetypes?.[d.type],'archetype-art',R.archetypeName(d.type))||d.typeIcon}</span></div>${state?`<div class="roster-state">${state}</div>`:''}`;
      if(v.phase==='setup'){
        const pick=document.createElement('button');pick.type='button';pick.className='roster-pick'+(chosen?' selected':'');pick.textContent=chosen?'☑ Selecionado':'☐ Selecionar';
        pick.addEventListener('click',e=>{e.stopPropagation();toggleSetupCharacter(d);});card.appendChild(pick);
        card.addEventListener('click',()=>showDefinitionInfo(d));
      }else card.addEventListener('click',()=>selectDefinition(d));
      card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();v.phase==='setup'?showDefinitionInfo(d):selectDefinition(d);}});
      roster.appendChild(card);
    });
  }

  function unitTurnState(v,p){
    if(!p)return{label:'',cls:''};
    if(!p.alive)return{label:'☠ Eliminada',cls:'dead'};
    const a=v.activation,active=!!a&&a.pieceId===p.id;
    if(active){
      const mode=a.mode||'';
      if(mode==='move')return{label:a.committed?'▶ Movendo · turno em andamento':'▶ Prévia de movimento',cls:'active'};
      if(mode==='attack')return{label:'▶ Escolhendo ataque',cls:'active'};
      if(mode)return{label:'▶ Habilidade em andamento',cls:'active'};
      if(a.committed)return{label:'▶ Movimento feito · falta concluir',cls:'active'};
      return{label:'▶ Em turno',cls:'active'};
    }
    if(p.activated)return{label:'✓ Já foi',cls:'spent'};
    if((v.availablePieceIds||[]).includes(p.id))return{label:'● Disponível',cls:'ready'};
    return{label:'○ Aguarda',cls:'waiting'};
  }
  function renderAvailable(v){
    if(v.phase!=='play'){availableEl.textContent='—';return;}
    const used=Number(v.roundActivationsUsed||0),limit=Number(v.roundActivationLimit||0),remaining=Math.max(0,limit-used);
    const units=(v.ownPieces||[]).filter(p=>p.original||p.alive);
    const rows=units.map(p=>{const st=unitTurnState(v,p);return `<span class="turn-unit-chip ${st.cls}"><b>${p.icon} ${p.displayName}</b><small>${st.label}</small></span>`;}).join('');
    availableEl.innerHTML=`<div class="turn-usage">Turnos usados: <b>${used}/${limit}</b> · ainda disponíveis: <b>${remaining}</b></div><div class="turn-unit-list">${rows||'<span class="muted">Nenhuma unidade.</span>'}</div>`;
  }

  const ACTIVE_ABILITY_NAMES=new Set(['Arqueiro','Piromante','Paranoia','Ninja','Kamikaze','Golem','Golem de Lava','Escudeiro','Vidente','Necromante','Mago do Espelho','Druida','Sentinela','Caçador','Bardo']);
  function actionAbilityName(p){return p?.copied||p?.displayName||p?.name||'';}
  function canUseAbilityNow(v,p){
    if(!p)return false;const n=actionAbilityName(p);if(!ACTIVE_ABILITY_NAMES.has(n))return false;
    if(n==='Arqueiro'&&(p.sureShotCooldown||0)>0)return false;
    if(n==='Piromante'&&(p.pyroCooldown||0)>0)return false;
    if(n==='Ninja'&&(p.ninjaSmokeCooldown||0)>0)return false;
    if((n==='Golem'||n==='Golem de Lava'))return (v.rocks||[]).some(c=>R.neighbors(p.coord,false).includes(c));
    if(n==='Necromante'&&(v.ownPieces||[]).some(x=>x.alive&&x.summonType==='skeleton'&&x.summonerId===p.id))return false;
    if(n==='Druida'&&(v.ownPieces||[]).some(x=>x.alive&&x.summonType==='livingBranch'&&x.druidId===p.id))return false;
    return true;
  }
  function setActionVisual(btn,enabled,current=false){if(!btn)return;btn.disabled=!enabled;btn.classList.toggle('action-ready',enabled&&!current);btn.classList.toggle('action-current',enabled&&current);}
  function renderActionButtons(v){
    const all=[moveBtn,stopBtn,attackBtn,abilityBtn,endBtn,cancelBtn];for(const b of all){if(!b)continue;b.classList.remove('action-ready','action-current');b.disabled=true;}if(endBtn)endBtn.title='';
    if(v.phase!=='play'||v.gameOver||v.turn!=='player'||v.pendingCombat||v.doppelChoice)return;
    const a=v.activation,p=activePiece(v);if(!a||!p)return;
    const mode=a.mode||'',flying=!!p.flying,solid=(v.rocks||[]).includes(p.coord)||!!(v.trees||[]).find(t=>t.coord===p.coord&&t.state==='live'),canEnd=!(flying&&solid),partialMove=mode==='move'&&!!a.committed&&Number(a.moveRemaining||0)>0;
    if(endBtn)endBtn.title=partialMove?'Use Parar movimento antes de encerrar o turno.':'';
    if(mode==='move'){setActionVisual(moveBtn,true,true);setActionVisual(stopBtn,canEnd,true);setActionVisual(endBtn,canEnd&&!partialMove,false);setActionVisual(cancelBtn,!a.committed,false);return;}
    if(mode==='attack'){setActionVisual(attackBtn,true,true);setActionVisual(endBtn,canEnd,false);setActionVisual(cancelBtn,true,false);return;}
    if(mode){setActionVisual(abilityBtn,true,true);setActionVisual(endBtn,canEnd,false);setActionVisual(cancelBtn,true,false);return;}
    const canMove=!a.movementUsed&&Number(p.m||0)>0&&!p.linkedToId;
    const canAttack=Number(p.a||0)>0||(p.name==='Fantasma'&&!p.possessing);
    setActionVisual(moveBtn,canMove,false);setActionVisual(stopBtn,false,false);setActionVisual(attackBtn,canAttack,false);setActionVisual(abilityBtn,canUseAbilityNow(v,p),false);setActionVisual(endBtn,canEnd,false);setActionVisual(cancelBtn,!a.committed,false);
  }

  function safeMirrorCells(v,p){
    const ownCoords=new Set(ownAlive(v).map(x=>x.coord)),ownMirrors=new Set(v.ownMirrors.map(x=>x.coord)),solid=new Set([...(v.trees||[]).map(x=>x.coord),...(v.rocks||[])]);return R.abilityCells(p).filter(c=>!solid.has(c)&&!ownCoords.has(c)&&!ownMirrors.has(c)&&!baseAt(v,c));
  }

  function paint(v){
    const seer=new Set(v.seerArea),siege=new Set(v.siegeCells||[]),visibleGroups=new Map(),ownGroups=new Map();
    for(const e of v.visibleOpponents){if(!visibleGroups.has(e.coord))visibleGroups.set(e.coord,[]);visibleGroups.get(e.coord).push(e);}
    for(const p of ownAlive(v)){if(!ownGroups.has(p.coord))ownGroups.set(p.coord,[]);ownGroups.get(p.coord).push(p);}
    const pyroTargets=new Set(v.activation?.pyroTargets||[]),paranoiaTargets=new Set(v.activation?.paranoiaTargets||[]);
    for(const[c,b]of cells){
      b.innerHTML='';b.className='cell';addScenery(b,c,v);
      if(v.phase==='setup'&&Number(c.slice(1))<=4)b.classList.add('setup');
      if(seer.has(c))b.classList.add('revealed');if(siege.has(c))b.classList.add('revealed','siege-revealed');if(seerPreview.has(c))b.classList.add('preview');
      if(pyroTargets.has(c))b.classList.add('pyro-selected');if(paranoiaTargets.has(c))b.classList.add('preview');
      const openedBase=(v.bases||[]).find(x=>x.id===openedBaseId);if(openedBase&&R.neighbors(openedBase.coord,true).includes(c))b.classList.add('sabotage-zone');
      if(v.phase==='setup'){
        const n=setupPos.get(c);if(n){const d=R.byName[n];if(d)b.appendChild(makePieceToken(d,false));if(setupSelected===n)b.classList.add('active-cell');}
        const baseEntry=[...setupBasePos.entries()].find(([,bc])=>bc===c);if(baseEntry){const m=A.img?.(A.structures?.baseAlly,'base-art','Posto de Operação')||document.createElement('span');if(!m.src){m.className='base-icon';m.textContent='🏰';}b.appendChild(m);const lab=document.createElement('span');lab.className='base-label';lab.textContent=`P${baseEntry[0]}`;b.appendChild(lab);if(setupBaseSelected===baseEntry[0])b.classList.add('active-cell');}
      }else{
        if(seer.has(c)){const m=A.img?.(A.effects?.revelada,'marker-art reveal-marker','Casa revelada')||document.createElement('span');if(!m.src){m.className='marker reveal-marker';m.textContent='👁️';}m.title='Casa revelada';appendCornerMarker(b,m,'tl');}
        if(seerPreview.has(c)){const m=document.createElement('span');m.className='marker previewmark';m.textContent='◉';b.appendChild(m);}
        if(corpseAt(v,c)){const m=A.img?.(A.effects?.lapide,'marker-art','Lápide')||document.createElement('span');if(!m.src){m.className='marker corpse';m.textContent='☠️';}m.title='Lápide';appendCornerMarker(b,m,'bl');}
        if(ownMirrorAt(v,c)){const m=A.img?.(A.effects?.espelho,'marker-art','Espelho')||document.createElement('span');if(!m.src){m.className='marker mirror';m.textContent='🪞';}appendCornerMarker(b,m,'tl');}for(const t of v.ownTraps||[])if(t.coord===c){const src=t.kind==='spot'?A.structures?.trapSentry:A.structures?.trapHunter;const m=A.img?.(src,'marker-art',t.kind==='spot'?'Armadilha da Sentinela':'Armadilha do Caçador')||document.createElement('span');if(!m.src){m.className='marker';m.textContent=t.kind==='spot'?'🦉':'🕳️';}m.title=t.kind==='spot'?'Sua armadilha de revelação':'Sua armadilha de dano';appendCornerMarker(b,m,'tr');}for(const f of v.ownFalsePresences||[])if(f.coord===c){const m=A.img?.(A.effects?.phantomPresence,'marker-art false-presence-marker','Presença Fantasma')||document.createElement('span');if(!m.src){m.className='marker false-presence-marker';m.textContent='🧠';}m.title='Sua Presença Fantasma (invisível ao adversário)';appendCornerMarker(b,m,'tr');}
        const base=baseAt(v,c);if(base){const ownBase=base.owner==='player',src=base.sabotaged?(ownBase?A.structures?.baseSabotagedAlly:A.structures?.baseSabotagedEnemy):(ownBase?A.structures?.baseAlly:A.structures?.baseEnemy);const m=A.img?.(src,'base-art',base.sabotaged?'Posto Sabotado':'Posto de Operação')||document.createElement('span');if(!m.src){m.className='base-icon'+(base.sabotaged?' base-dead':'');m.textContent='🏰';}b.appendChild(m);const lab=document.createElement('span');lab.className='base-label';lab.textContent=base.owner==='player'?'SEU':'IA';b.appendChild(lab);}
        const group=ownGroups.get(c)||[];
        if(group.length){
          const ordered=[...group].sort((a,b)=>(b.name==='Escudeiro')-(a.name==='Escudeiro'));
          const m=makePieceToken(ordered[0],false);if(ordered[1])m.classList.add('shared-primary');b.appendChild(m);addHpBadge(b,ordered[0],false);addDurationBadges(b,ordered[0],false);if(v.activation?.pieceId===ordered[0].id||ordered.some(x=>v.activation?.pieceId===x.id))b.classList.add('active-cell');
          if(ordered[1]){const s2=document.createElement('span');s2.className=`stack-second art-stack shared-stack${ordered[1].activated?' spent-stack':''}`;const src=A.character?.(ordered[1].displayName||ordered[1].name);if(src)s2.appendChild(A.img(src,'piece-art',ordered[1].displayName||ordered[1].name));else s2.textContent=ordered[1].icon;s2.title=ordered[1].displayName||ordered[1].name;b.appendChild(s2);}
        }
        const eg=visibleGroups.get(c)||[];if(eg.length){const m=makePieceToken(eg[0],true);m.classList.add('marker','enemy-reveal');b.appendChild(m);addHpBadge(b,eg[0],true);if(eg[1]){const m2=document.createElement('span');m2.className='stack-second';m2.textContent=eg[1].icon;b.appendChild(m2);}}if(eg.length&&!seer.has(c)){const rm=A.img?.(A.effects?.revelada,'marker-art reveal-marker','Unidade revelada')||document.createElement('span');if(!rm.src){rm.className='marker reveal-marker';rm.textContent='👁️';}rm.title='Unidade revelada';appendCornerMarker(b,rm,'tl');}
        if((v.impactCells||[v.impactCell]).includes(c)){const m=A.img?.(A.effects?.dano,'marker-art','Dano')||document.createElement('span');if(!m.src){m.className='marker impact';m.textContent='💥';}appendCornerMarker(b,m,'bl');}if((v.combatCells||[]).includes(c)){const m=A.img?.(A.effects?.confronto,'marker-art','Confronto')||document.createElement('span');if(!m.src){m.className='marker combat-mark';m.textContent='⚔️';}m.title='Confronto Direto ocorreu aqui';appendCornerMarker(b,m,'br');}
        for(const h of v.perceptionHints||[])if(h.coord===c){const m=document.createElement('span');m.className=`presence-hint ${h.kind||'orth'}`;m.textContent=h.kind==='exact'?'📍':h.kind==='diag'?'◇':'❗';m.title=h.knownFalse?'Detecção falsa conhecida — Eco da Presença Fantasma':h.kind==='exact'?'Presença detectada nesta casa':h.kind==='diag'?'Possível presença diagonal':'Possível presença ortogonal';if(h.knownFalse)m.classList.add('known-false');appendCornerMarker(b,m,'tr');}
      }
      const p=activePiece(v),a=v.activation;
      if(p&&v.turn==='player'&&!v.pendingCombat){
        if(a.mode==='move'&&a.moveRemaining>=(p.flying?1:(SWAMP_CELLS.has(c)?2:1))&&R.neighbors(p.coord,p.diag).includes(c)&&canShareUi(v,p,c)){const solid=(v.rocks||[]).includes(c)||!!(v.trees||[]).find(t=>t.coord===c&&t.state==='live');if(!(p.flying&&solid&&a.moveRemaining<=1))b.classList.add('highlight');}
        if(a.mode==='attack'&&R.attackCells(p).includes(c)&&!baseAt(v,c))b.classList.add('attack-highlight');
        if(a.mode==='pyro'&&R.abilityCells(p).includes(c)&&!baseAt(v,c))b.classList.add('attack-highlight');
        if(a.mode==='sureShotConfirm'&&R.attackCells({...p,range:(p.range||0)*2}).includes(c)&&!baseAt(v,c))b.classList.add('attack-highlight');
        if(a.mode==='paranoiaPresence'&&R.abilityCells(p,true).includes(c))b.classList.add('highlight');
        // Ao entrar em qualquer habilidade, a casa da própria unidade também aparece como origem.
        const abilityModes=['pyro','sureShotConfirm','paranoiaPresence','raise','mirror','awaken','spotTrap','damageTrap','bard','absorbRock','seer','kamikaze','shieldLink','shieldUnlink'];
        if(abilityModes.includes(a.mode)&&c===p.coord)b.classList.add('ability-origin');
        if(['raise','mirror','awaken','bard'].includes(a.mode)&&R.abilityCells(p).includes(c))b.classList.add('highlight');
        if(['spotTrap','damageTrap'].includes(a.mode)&&R.abilityCells(p,true).includes(c))b.classList.add('highlight');
        if(a.mode==='absorbRock'&&(v.rocks||[]).includes(c)&&R.neighbors(p.coord,false).includes(c))b.classList.add('highlight');
        if(a.mode==='seer'){const legal=new Set(a.seerCells?.length?a.seerCells:R.abilityCells(p,true));if(!seerPreview.size&&legal.has(c))b.classList.add('highlight','seer-range');else{const main=[...seerPreview][0];if(c===main)b.classList.add('highlight','seer-main');else if(legal.has(c)&&R.neighbors(main,false).includes(c))b.classList.add('highlight','seer-next');}}if(a.mode==='kamikaze'&&(a.kamikazeCells||[]).includes(c))b.classList.add('attack-highlight','kamikaze-highlight');if(a.mode==='shieldLink'){const ah=p.ah||0;if(ownAtAll(v,c).some(x=>x.id!==p.id&&x.alive&&R.man(p.coord,x.coord)<=ah))b.classList.add('highlight');}
      }
    }
  }

  function render(){
    const v=view();
    const cfg=v.matchConfig||currentMatchConfig();countEl.textContent=`${v.phase==='setup'?selected.length:v.ownPieces.filter(p=>p.original).length}/${cfg.teamSize.player}`;
    myDeathsEl.textContent=`${v.ownOriginalDeaths}/${cfg.lossLimit.player}`;enemyDeathsEl.textContent=`${v.enemyOriginalDeaths}/${cfg.lossLimit.enemy}`;roundEl.textContent=v.phase==='play'?v.round:'—';
    phaseEl.textContent=v.phase==='setup'?'Posicionamento':v.gameOver?'Encerrada':v.turn==='enemy'?'Vez da IA':v.activation?`Seu turno · ${activePiece(v)?.displayName||activePiece(v)?.name||'unidade'}`:'Sua vez';
    renderRoster(v);renderAvailable(v);renderList(historyEl,Presentation.battleEvents(v.history),'Nenhum evento importante recente.');
    setupBasesEl.classList.toggle('hidden',v.phase!=='setup');if(setupInspector)setupInspector.classList.toggle('hidden',v.phase!=='setup'||!setupInspectorBody.innerHTML);baseSetupStatus.textContent=`${setupBasePos.size}/2 posicionados`;base1Btn.classList.toggle('selected',setupBaseSelected===1);base2Btn.classList.toggle('selected',setupBaseSelected===2);
    startBtn.classList.toggle('hidden',v.phase!=='setup');if(aiDifficultyEl){aiDifficultyEl.disabled=v.phase!=='setup';aiDifficultyEl.closest('.ai-difficulty')?.classList.toggle('hidden',v.phase!=='setup');}if(matchSettingsEl)matchSettingsEl.classList.toggle('hidden',v.phase!=='setup');
    readyStatus.classList.toggle('hidden',v.phase!=='setup');
    teamToggle.classList.toggle('hidden',v.phase!=='play');
    teamTitle.textContent=v.phase==='setup'?'Seleção de personagens':'Sua equipe';
    roster.classList.toggle('hidden',v.phase==='play'&&rosterCollapsed);
    rosterFilters.classList.toggle('hidden',v.phase==='play'&&rosterCollapsed);
    teamToggle.textContent=rosterCollapsed?'Ver equipe':'Ocultar equipe';
    refreshPieceInfo(v);paint(v);renderTurnGuide(v);renderActionButtons(v);
    flushActionFx(v);applyStateFx(previousFxView,v);previousFxView=snapshotFx(v);
    combatChoice.classList.toggle('hidden',!v.pendingCombat);
    doppelChoiceBox.classList.toggle('hidden',!v.doppelChoice);if(v.doppelChoice){copyDoppelBtn.disabled=v.doppelChoice.canCopyNew===false;doppelChoiceText.textContent=`Atual: ${v.doppelChoice.current} · Novo: ${v.doppelChoice.newAbility}${v.doppelChoice.reason?' · '+v.doppelChoice.reason:''}`;}
    advanceCombatBtn.disabled=v.pendingCombat?.canAdvance===false;
    advanceCombatBtn.textContent=v.pendingCombat?.canAdvance===false?'Posição ocupada':'Posição da derrotada';
    pyroConfirm.classList.toggle('hidden',v.activation?.mode!=='pyro'||(v.activation?.pyroTargets||[]).length!==2);kamikazeBox.classList.toggle('hidden',v.activation?.mode!=='kamikaze');sureShotBox.classList.toggle('hidden',v.activation?.mode!=='sureShotConfirm');paranoiaBox.classList.toggle('hidden',v.activation?.mode!=='paranoiaPresence');if(v.activation?.mode==='paranoiaPresence')paranoiaChoiceText.textContent=`${(v.activation.paranoiaTargets||[]).length}/2 casas escolhidas. Máximo 2 presenças ativas por Paranoia.`;const sa=v.activation;let shieldTarget=null;if(sa?.mode==='shieldLink'&&pendingShieldTargetId)shieldTarget=v.ownPieces.find(x=>x.id===pendingShieldTargetId);if(sa?.mode==='shieldUnlink'){shieldConfirmTitle.textContent='🛡️ Confirmar desvinculação';shieldConfirmText.textContent='Desvincular gastará o turno do Escudeiro.';shieldConfirmBox.classList.remove('hidden');}else if(sa?.mode==='shieldLink'&&shieldTarget){shieldConfirmTitle.textContent='🛡️ Confirmar vínculo';shieldConfirmText.textContent=`Vincular a ${shieldTarget.displayName}. O Escudeiro irá até a casa do aliado e passará a acompanhá-lo.`;shieldConfirmBox.classList.remove('hidden');}else shieldConfirmBox.classList.add('hidden');
    if(v.gameOver){setStatus(v.result==='player'?'Você venceu.':v.result==='enemy'?'Você perdeu.':'Empate.');const win=v.result==='player',draw=v.result==='draw',cfg=v.matchConfig||currentMatchConfig();Presentation.showEndScreen({key:`classic:${v.result}:${v.round}`,mode:'classic',result:v.result,icon:draw?'⚖️':win?'🏆':'☠️',title:draw?'EMPATE':win?'VITÓRIA':'DERROTA',tone:draw?'draw':win?'victory':'defeat',reason:v.surrenderedBy?(v.surrenderedBy==='player'?'Você desistiu da partida.':'O adversário desistiu da partida.'):draw?'As duas equipes chegaram ao próprio limite de perdas na mesma resolução.':win?`O adversário atingiu ${cfg.lossLimit.enemy} perdas originais.`:`Você atingiu ${cfg.lossLimit.player} perdas originais.`,round:v.round,summary:[{label:'Suas perdas',value:`${v.ownOriginalDeaths}/${cfg.lossLimit.player}`},{label:'Perdas inimigas',value:`${v.enemyOriginalDeaths}/${cfg.lossLimit.enemy}`},{label:'Rodadas disputadas',value:v.round}],onReplay:replay&&replay.length>1?()=>window.GameReplay.open(replay.frames(),{title:'Replay do Clássico'}):null});}
    else {Presentation.hideEndScreen();if(v.turn==='enemy'&&!v.pendingCombat)statusEl.textContent='🤖 Vez da IA...'; else statusEl.textContent=status;}
    if(replayBtn)replayBtn.classList.toggle('hidden',!(v.gameOver&&replay&&replay.length>1));if(surrenderBtn)surrenderBtn.classList.toggle('hidden',v.phase!=='play'||v.gameOver);
    return v;
  }

  function toggleSetupCharacter(d){
    const v=view();if(v.phase!=='setup'||v.gameOver||v.turn==='enemy')return;
    showDefinitionInfo(d);
    if(selected.includes(d.name)){
      selected=selected.filter(n=>n!==d.name);
      for(const[k,val]of setupPos)if(val===d.name)setupPos.delete(k);
      if(setupSelected===d.name)setupSelected=null;
      setupBaseSelected=null;setStatus(`${d.name} removido da equipe.`);render();return;
    }
    const cap=currentMatchConfig().teamSize.player;if(selected.length>=cap){setStatus(`Você já escolheu ${cap} ${cap===1?'personagem':'personagens'}. Desmarque um antes de escolher outro.`);render();return;}
    selected.push(d.name);setupSelected=null;setupBaseSelected=null;const c=autoPlacePiece(d.name);
    setStatus(c?`${d.name} selecionado e posicionado automaticamente em ${c}. Clique na peça no tabuleiro para ajustar.`:`${d.name} foi adicionado à equipe, mas não encontrei uma casa livre.`);render();
  }

  function selectDefinition(d){
    const v=view();if(v.gameOver||v.turn==='enemy')return;
    if(v.phase==='setup'){showDefinitionInfo(d);return;}
    const p=v.ownPieces.find(q=>q.original&&q.name===d.name);if(!p){setStatus('Essa peça não está disponível.');return;}
    showPieceInfo(v,p,false);
    if(!p.alive){setStatus(`${p.displayName} foi eliminado.`);render();return;}
    const r=player.selectPiece(p.id);setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');hideStackChoice();render();
  }

  function cellClick(c){
    let v=view();if(v.gameOver||v.turn==='enemy'||v.pendingCombat)return;
    if(v.phase==='setup'){
      if(Number(c.slice(1))>4){setStatus('Posicionamento inicial apenas nas linhas 1–4.');return;}
      if(R.isBlocked(c)){setStatus('🪨 Terreno bloqueado: árvore ou rocha.');return;}
      if(!setupSelected&&!setupBaseSelected){
        const baseEntry=[...setupBasePos.entries()].find(([,bc])=>bc===c);if(baseEntry){setupBaseSelected=baseEntry[0];setStatus(`Posto ${setupBaseSelected} selecionado no tabuleiro. Escolha outra casa para reposicionar.`);render();return;}
        if(setupPos.has(c)){setupSelected=setupPos.get(c);showDefinitionInfo(R.byName[setupSelected]);setStatus(`${setupSelected} selecionado no tabuleiro. Escolha outra casa para reposicionar.`);render();return;}
      }
      if(setupBaseSelected){
        if(isCorner(c)){setStatus('Postos não podem ficar nos quatro cantos.');return;}
        if(setupPos.has(c)){setStatus('O Posto não pode ficar na mesma casa de um personagem.');return;}
        for(const[k,val]of setupBasePos)if(val===c&&k!==setupBaseSelected){setStatus('Já existe outro Posto nessa casa.');return;}
        const movedBase=setupBaseSelected;setupBasePos.set(movedBase,c);setupBaseSelected=null;setStatus(`Posto ${movedBase} reposicionado em ${c}.`);render();return;
      }
      if(!setupSelected){setStatus('Selecione um personagem ou um Posto primeiro.');return;}
      if([...setupBasePos.values()].includes(c)){setStatus('Essa casa está ocupada por um Posto.');return;}
      const occ=setupPos.get(c);if(occ&&occ!==setupSelected){setStatus('Essa casa já está ocupada.');return;}
      for(const[k,val]of setupPos)if(val===setupSelected)setupPos.delete(k);setupPos.set(c,setupSelected);const justPlaced=setupSelected;setupSelected=null;setStatus(`${justPlaced} posicionado. Clique numa peça do tabuleiro para reposicioná-la.`);render();return;
    }
    const a=v.activation,p=activePiece(v),clickedBase=baseAt(v,c);
    if(!a){
      if(clickedBase){openBasePanel(v,clickedBase);return;}
      const group=ownAtAll(v,c);
      if(group.length>1){showStackChoice(v,group);return;}
      if(group[0]){showPieceInfo(v,group[0],false);const r=player.selectPiece(group[0].id);setStatus(r.status);hideStackChoice();render();return;}
      const vis=visibleAt(v,c);if(vis.length){showPieceInfo(v,vis[0],true);setStatus('Informações reveladas sobre a peça inimiga.');render();}
      return;
    }
    let r=null;
    if(a.mode==='move'){immediateActionFx(v,'move',c);r=player.moveStep(c);}
    else if(a.mode==='attack'){immediateActionFx(v,'attack',c);r=player.attack(c);}
    else if(a.mode==='pyro'){r=player.selectPyroTarget(c);}
    else if(a.mode==='paranoiaPresence'){r=player.selectParanoiaTarget(c);}
    else if(a.mode==='seer'){previewSeer(c);return;}
    else if(a.mode==='raise')r=player.raiseAt(c);
    else if(a.mode==='mirror')r=player.placeMirror(c);
    else if(a.mode==='awaken')r=player.awakenTree(c);
    else if(a.mode==='spotTrap'||a.mode==='damageTrap')r=player.placeTrap(c);
    else if(a.mode==='bard'){const targets=ownAtAll(v,c).filter(x=>x.id!==p.id&&x.alive&&R.man(p.coord,x.coord)<=p.ah);if(!targets.length){setStatus('Escolha um aliado dentro do Alc. Hab. do Bardo.');return;}showBardChoice(targets);return;}
    else if(a.mode==='absorbRock'){if(!(v.rocks||[]).includes(c)||!R.neighbors(p.coord,false).includes(c)){setStatus('Escolha uma pedra adjacente ao Golem.');return;}const r=player.absorbRock(c);setStatus(r.status);afterMutation();return;}
    else if(a.mode==='shieldLink'){const ah=p.ah||0,target=ownAtAll(v,c).find(x=>x.id!==p.id&&x.alive&&R.man(p.coord,x.coord)<=ah);if(!target){setStatus(`Escolha um aliado dentro do Alc. Hab. ${ah}.`);return;}pendingShieldTargetId=target.id;setStatus(`Vincular a ${target.displayName}? Confirme antes de gastar o turno.`);render();return;}
    else {
      if(clickedBase){openBasePanel(v,clickedBase);return;}
      const allOwn=ownAtAll(v,c);
      if(allOwn.length){showPieceInfo(v,allOwn.find(x=>x.id===p.id)||allOwn[0],false);}
      const group=allOwn.filter(x=>!x.activated);
      if(group.length>1&&!a.committed){showStackChoice(v,group);return;}
      const own=group[0];if(own&&own.id!==p.id)r=player.selectPiece(own.id);
      else if(!allOwn.length){const vis=visibleAt(v,c);if(vis.length){showPieceInfo(v,vis[0],true);setStatus('Informações reveladas sobre a peça inimiga.');render();return;}}
    }
    if(r){setStatus(r.status);if(['pyro','paranoiaPresence'].includes(a.mode))render();else afterMutation();}
  }

  function previewSeer(c){
    if(!seerPreview.size){const v=view(),p=activePiece(v),legal=new Set(v.activation?.seerCells?.length?v.activation.seerCells:R.abilityCells(p,true));if(!p||!legal.has(c)){setStatus(`Casa principal fora do Alc. Hab. ${p?.ah||0}.`);return;}seerPreview=new Set([c]);seerConfirm.classList.add('hidden');setStatus('Casa principal escolhida. Agora escolha 1 casa ligada por lado e ainda dentro do alcance.');render();return;}
    const main=[...seerPreview][0];
    if(c===main){seerPreview.clear();seerConfirm.classList.add('hidden');setStatus('Escolha novamente a casa principal.');render();return;}
    {const v=view(),p=activePiece(v),legal=new Set(v.activation?.seerCells?.length?v.activation.seerCells:R.abilityCells(p,true));if(!legal.has(c)){setStatus(`A segunda casa também precisa estar dentro do Alc. Hab. ${p?.ah||0}.`);return;}}
    if(!R.neighbors(main,false).includes(c)){setStatus('A segunda casa precisa estar ligada por lado à principal.');return;}
    seerPreview=new Set([main,c]);seerConfirm.classList.remove('hidden');setStatus('2/2 casas selecionadas. Confirme a visão.');render();
  }

  function showBardChoice(input){const targets=Array.isArray(input)?input:[input];bardChoiceButtons.innerHTML='';if(targets.length>1){bardChoiceText.textContent='Há duas unidades nesta casa. Quem receberá a Inspiração?';for(const target of targets){const b=document.createElement('button');b.type='button';b.textContent=`${target.icon} ${target.displayName}`;b.addEventListener('click',()=>showBardChoice(target));bardChoiceButtons.appendChild(b);}bardChoiceBox.classList.remove('hidden');return;}const target=targets[0];bardChoiceText.textContent=`${target.icon} ${target.displayName} — escolha o bônus até o fim do próximo turno do Bardo.`;for(const [stat,label] of [['attack','⚔️ +1 ATQ'],['range','🎯 +1 ALC'],['abilityRange','✨ +1 Alc. Hab.'],['move','👣 +1 M'],['life','❤️ +1 Vida']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{bardChoiceBox.classList.add('hidden');const r=player.bardBuff(target.id,stat);setStatus(r.status);afterMutation();});bardChoiceButtons.appendChild(b);}bardChoiceBox.classList.remove('hidden');}
  function hideBardChoice(){bardChoiceBox.classList.add('hidden');bardChoiceButtons.innerHTML='';}

  function afterMutation(){
    hideBardChoice();const v=render(),av=ai.getView();if(replay)replay.capture(v.history?.[0]||'Ação do jogador');
    if(!v.gameOver&&(av.pendingCombat||av.doppelChoice||v.turn==='enemy'))scheduleAi(850);
  }

  function scheduleAi(delay=180){
    if(aiScheduled)return;aiScheduled=true;setTimeout(()=>{aiScheduled=false;runAiStep();},delay);
  }
  function runAiStep(){
    const pv=view(),av=ai.getView();if(pv.gameOver||av.gameOver)return;
    if(!av.pendingCombat&&!av.doppelChoice&&av.turn!=='enemy')return;
    const id=++aiReq;aiWorker.postMessage({id,view:av,lastResult:aiLastResult,difficulty:aiDifficulty});
  }
  aiWorker.onmessage=e=>{
    const {action}=e.data||{};if(!action)return;
    const av=ai.getView();if(av.gameOver)return;if(!av.pendingCombat&&av.turn!=='enemy')return;
    let r;
    switch(action.type){
      case 'select': r=ai.selectPiece(action.pieceId);break;
      case 'startMove':r=ai.startMove();break;
      case 'moveStep':r=ai.moveStep(action.to);break;
      case 'stopMove':r=ai.stopMove();break;
      case 'startAttack':r=ai.startAttack();break;
      case 'attack':r=ai.attack(action.to);break;
      case 'pyroSelect':r=ai.selectPyroTarget(action.to);break;
      case 'pyroConfirm':r=ai.confirmPyroAttack();break;case 'sureShotConfirm':r=ai.confirmSureShot();break;case 'paranoiaSelect':r=ai.selectParanoiaTarget(action.to);break;case 'paranoiaConfirm':r=ai.confirmParanoia();break;case 'kamikazeConfirm':r=ai.confirmKamikaze();break;
      case 'startAbility':r=ai.startAbility();break;
      case 'seer':r=ai.useSeer(action.cells);break;
      case 'raise':r=ai.raiseAt(action.to);break;
      case 'mirror':r=ai.placeMirror(action.to);break;case 'awaken':r=ai.awakenTree(action.to);break;case 'trap':r=ai.placeTrap(action.to);break;case 'bard':r=ai.bardBuff(action.targetPieceId,action.stat);break;case 'absorbRock':r=ai.absorbRock(action.coord);break;case 'shieldLink':r=ai.shieldLink(action.targetPieceId||null);break;
      case 'sabotage':r=ai.sabotageBase(action.baseId,action.bonusId,action.targetPieceId||null);break;
      case 'combatChoice':r=ai.chooseCombatPosition(!!action.advance);break;
      case 'doppelChoice':r=ai.chooseDoppelCopy(!!action.copyNew);break;
      case 'end':r=ai.endActivation();break;
      default:r={ok:true,status:'IA aguardando.'};
    }
    aiLastResult={action:{...action},ok:r?.ok!==false,status:r?.status||''};
    const pv=render();if(replay){const postAi=ai.getView();replay.capture(postAi.history?.[0]||'Ação da IA');}
    if(pv.pendingCombat||pv.gameOver)return;
    if(pv.turn==='enemy')scheduleAi(300);
    else if(pv.turn==='player')setStatus(`Rodada ${pv.round}. Selecione sua próxima peça disponível.`),render();
  };

  startBtn.addEventListener('click',()=>{
    const v=view();if(v.phase!=='setup'){setStatus('A partida já começou.');return;}
    const cfg=currentMatchConfig(),needed=cfg.teamSize.player;if(selected.length!==needed||setupPos.size!==needed||setupBasePos.size!==2){setStatus(`Escolha e posicione exatamente ${needed} ${needed===1?'personagem':'personagens'} e 2 Postos.`);return;}
    const setup=selected.map(name=>({name,coord:[...setupPos].find(([,n])=>n===name)?.[0]}));const bases=[setupBasePos.get(1),setupBasePos.get(2)];
    setStatus('Você: pronto · IA: pronta. Iniciando partida...');
    aiDifficulty=aiDifficultyEl?.value||'normal';saveClassicDifficulty(aiDifficulty);const r=referee.startGame(setup,bases,aiDifficulty,cfg);if(replay){replay.clear();replay.capture('Início da partida');}rosterCollapsed=true;setStatus(`${r.status} IA: ${difficultyLabel(aiDifficulty)}.`);render();if(view().turn==='enemy')scheduleAi(450);
  });
  keepDoppelBtn.addEventListener('click',()=>{const r=player.chooseDoppelCopy(false);setStatus(r.status);render();});
  copyDoppelBtn.addEventListener('click',()=>{const r=player.chooseDoppelCopy(true);setStatus(r.status);render();});

  resetBtn.addEventListener('click',()=>{const keepSelected=[...selected],keepPos=new Map(setupPos),keepBases=new Map(setupBasePos),keepDifficulty=aiDifficultyEl?.value||aiDifficulty||'normal';if(replay)replay.clear();previousFxView=null;pendingActionFx=[];aiLastResult=null;aiDifficulty=keepDifficulty;if(aiDifficultyEl)aiDifficultyEl.value=keepDifficulty;referee.reset();selected=keepSelected;setupSelected=null;setupBaseSelected=null;setupPos=keepPos;setupBasePos=keepBases;openedBaseId=null;pendingBaseBonusId=null;pendingShieldTargetId=null;closeBasePanel();seerPreview.clear();seerConfirm.classList.add('hidden');pyroConfirm.classList.add('hidden');hideStackChoice();hideBardChoice();combatChoice.classList.add('hidden');rosterCollapsed=false;rosterFilter='all';filterButtons.forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));inspectedPieceId=null;pieceInfoTitle.textContent='Ficha da unidade';pieceInfoBody.innerHTML='<div class="muted empty-inspector">Clique em uma peça para ver vida, movimento, ataque, alcance, percepção e bônus.</div>';if(setupInspector){setupInspector.classList.add('hidden');setupInspectorBody.innerHTML='';}setStatus('Formação anterior restaurada. Ajuste se quiser e clique em ✓ Pronto para jogar novamente.');render();});
  if(surrenderBtn)surrenderBtn.addEventListener('click',()=>{const v=view();if(v.phase!=='play'||v.gameOver)return;if(!confirm('Desistir da partida? A partida será encerrada e o Replay ficará disponível.'))return;const r=player.surrender();setStatus(r.status);if(r.ok&&replay)replay.capture('🏳️ Desistência');render();});
  moveBtn.addEventListener('click',()=>{const r=player.startMove();setStatus(r.status);render();});
  stopBtn.addEventListener('click',()=>{const r=player.stopMove();setStatus(r.status);afterMutation();});
  attackBtn.addEventListener('click',()=>{const r=player.startAttack();setStatus(r.status);render();});
  abilityBtn.addEventListener('click',()=>{pendingShieldTargetId=null;const r=player.startAbility();setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');hideStackChoice();hideBardChoice();render();});
  endBtn.addEventListener('click',()=>{const r=player.endActivation();setStatus(r.status);afterMutation();});
  cancelBtn.addEventListener('click',()=>{const v=view();const r=v.activation?.mode==='move'?player.stopMove():v.activation?.mode?player.cancelMode():player.cancelSelection();setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');hideStackChoice();hideBardChoice();render();});
  confirmSeerBtn.addEventListener('click',()=>{if(seerPreview.size!==2)return setStatus('Selecione exatamente 2 casas ligadas.');const r=player.useSeer([...seerPreview]);setStatus(r.status);seerPreview.clear();seerConfirm.classList.add('hidden');afterMutation();});
  cancelSeerBtn.addEventListener('click',()=>{const r=player.cancelMode();seerPreview.clear();seerConfirm.classList.add('hidden');setStatus(r.status);render();});
  confirmPyroBtn.addEventListener('click',()=>{const v=view(),a=v.activation;immediateActionFx(v,'pyro',null,[...(a?.pyroTargets||[])]);const r=player.confirmPyroAttack();setStatus(r.status);afterMutation();});
  cancelPyroBtn.addEventListener('click',()=>{const r=player.cancelMode();setStatus(r.status);render();});
  confirmSureShotBtn.addEventListener('click',()=>{const r=player.confirmSureShot();setStatus(r.status);render();});cancelSureShotBtn.addEventListener('click',()=>{const r=player.cancelMode();setStatus(r.status);render();});confirmParanoiaBtn.addEventListener('click',()=>{const r=player.confirmParanoia();setStatus(r.status);afterMutation();});cancelParanoiaBtn.addEventListener('click',()=>{const r=player.cancelMode();setStatus(r.status);render();});
  confirmKamikazeBtn.addEventListener('click',()=>{const r=player.confirmKamikaze();setStatus(r.status);afterMutation();});confirmShieldLinkBtn.addEventListener('click',()=>{const v=view(),a=v.activation;let r;if(a?.mode==='shieldUnlink')r=player.shieldLink(null);else if(a?.mode==='shieldLink'&&pendingShieldTargetId)r=player.shieldLink(pendingShieldTargetId);else return;pendingShieldTargetId=null;setStatus(r.status);afterMutation();});cancelShieldLinkBtn.addEventListener('click',()=>{pendingShieldTargetId=null;const r=player.cancelMode();setStatus(r.status);render();});
  cancelKamikazeBtn.addEventListener('click',()=>{const r=player.cancelMode();setStatus(r.status);render();});
  stayCombatBtn.addEventListener('click',()=>{const r=player.chooseCombatPosition(false);setStatus(r.status);afterMutation();});
  advanceCombatBtn.addEventListener('click',()=>{const r=player.chooseCombatPosition(true);setStatus(r.status);afterMutation();});
  base1Btn.addEventListener('click',()=>handleSetupBaseButton(1));
  base2Btn.addEventListener('click',()=>handleSetupBaseButton(2));
  closeBasePanelBtn.addEventListener('click',()=>{closeBasePanel();render();});
  teamToggle.addEventListener('click',()=>{rosterCollapsed=!rosterCollapsed;render();});
  closePieceInfoBtn.addEventListener('click',()=>{inspectedPieceId=null;pieceInfoTitle.textContent='Ficha da unidade';pieceInfoBody.innerHTML='<div class="muted empty-inspector">Clique em uma peça para ver vida, movimento, ataque, alcance, percepção e bônus.</div>';});
  auditBtn.addEventListener('click',()=>auditBox.classList.toggle('hidden'));
  if(replayBtn)replayBtn.addEventListener('click',()=>{if(replay&&replay.length)window.GameReplay.open(replay.frames(),{title:'Replay do Clássico'});});
  filterButtons.forEach(b=>b.addEventListener('click',()=>{rosterFilter=b.dataset.filter||'all';filterButtons.forEach(x=>x.classList.toggle('active',x===b));render();}));

  if(aiDifficultyEl)aiDifficultyEl.addEventListener('change',()=>saveClassicDifficulty(aiDifficultyEl.value));
  for(const el of [playerTeamSizeEl,enemyTeamSizeEl,playerLossLimitEl,enemyLossLimitEl])if(el)el.addEventListener('change',syncMatchSettings);
  if(resetMatchSettingsBtn)resetMatchSettingsBtn.addEventListener('click',()=>{playerTeamSizeEl.value=4;enemyTeamSizeEl.value=4;playerLossLimitEl.value=3;enemyLossLimitEl.value=3;syncMatchSettings();setStatus('Configurações padrão restauradas: 4 × 4 e 3 perdas para derrota.');});

  restoreClassicDifficulty();
  buildBoard();render();
})();
