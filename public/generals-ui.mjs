import {GENERAL_SIDES,defaultGeneralControl,makeGeneralBrains,brainSnapshots,generalStep,applyGeneralAction,applyGeneralRecord,finishGeneralObservation} from './generals-core.mjs';
const $=id=>document.getElementById(id),R=window.GameRules,A=window.BNSAssets;
const sides=GENERAL_SIDES,label=s=>s==='player'?'General 1':'General 2',coords=Array.from({length:64},(_,i)=>R.coord(i%8,Math.floor(i/8)));
const storageKey='bnsGeneralsLocal:v1.15.76';
let matchConfig=new window.GameReferee().normalizeMatchConfig(),controlledSides=[...sides],actionLog=[],focusedEvent=null,observationSeq=0,lastObservationId=null;
const seatTokenCache={};
const teamSize=s=>matchConfig.teamSize[s],ownedSides=()=>mode==='local'?sides:controlledSides;
const canUseSide=s=>mode==='local'||!joined||ownedSides().includes(s);
function applyConfig(config){matchConfig=new window.GameReferee().normalizeMatchConfig(config);for(const s of sides){$('generalTeam'+s).value=matchConfig.teamSize[s];$('generalLoss'+s).value=matchConfig.lossLimit[s];$('generalLoss'+s).max=matchConfig.teamSize[s];}}
function changeConfig(){if(state||mode==='online'&&(!joined||!ownedSides().includes('player')))return;const cfg={teamSize:{},lossLimit:{}};for(const s of sides){cfg.teamSize[s]=Number($('generalTeam'+s).value)||4;cfg.lossLimit[s]=Number($('generalLoss'+s).value)||3;}const normalized=new window.GameReferee().normalizeMatchConfig(cfg);const roundLimit=Math.max(0,Math.min(500,Math.floor(Number($('generalRoundLimit').value)||0)));if(mode==='online')send({type:'setMatchConfig',config:normalized,roundLimit});else{control.roundLimit=roundLimit;applyConfig(normalized);ready={player:false,enemy:false};for(const s of sides)drafts[s].setup=drafts[s].setup.slice(0,teamSize(s));render();}}
function observe(event){if(!event||lastObservationId===event.id)return;lastObservationId=event.id;actionLog.unshift(structuredClone(event));actionLog=actionLog.slice(0,40);focusedEvent=null;if($('generalFollow').checked&&event.cells?.[0])inspected=event.cells[0];}
function finishText(){return state?.generalEnded?(state.generalEndReason==='roundLimit'?'Limite de rodadas atingido. Observação encerrada sem vencedor.':'Observação encerrada pelos generais, sem vencedor.'):`Partida encerrada: ${state?.result==='draw'?'empate':label(state?.result)+' venceu'}.`;}
let mode='local',side='player',drafts={player:{setup:[],bases:[]},enemy:{setup:[],bases:[]}},ready={player:false,enemy:false},tool=null,dragTool=null,ref=null,state=null,brains=null,control=defaultGeneralControl(),ws=null,joined=false,room='',roomState=null,timer=null,epoch=0,inspected=null,recorder=null,replayFrames=[],retry=null,heartbeat=null,closedByUser=false;
const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(className)e.className=className;return e;};
function status(text){$('generalStatus').textContent=text;}
function randomRoomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code='';for(let i=0;i<6;i++)code+=alphabet[Math.floor(Math.random()*alphabet.length)];return code;}
function image(src,className,alt){const img=node('img',null,className);img.src=src;img.alt=alt||'';img.draggable=false;return img;}
function stopTimer(){clearTimeout(timer);timer=null;epoch++;}
function saveLocal(){
  if(mode!=='local'||!ref||!state)return;
  const frames=(recorder?.items||[]).slice(-100),payload={actionLog,observationSeq,version:'1.15.76',state:ref.exportState(),control,brains:brainSnapshots(brains),drafts,frames,partial:!!recorder?.partial||(recorder?.items.length||0)>100};
  for(const count of [100,20,0])try{const recent=count?frames.slice(-count):[];sessionStorage.setItem(storageKey,JSON.stringify({...payload,frames:recent,partial:payload.partial||recent.length<frames.length}));return true;}catch{}
  return false;
}
function recoverLocal(){
  let saved;try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{return false;}
  if(saved?.version!=='1.15.76')return false;
  try{
    const candidate=new window.GameReferee(),raw=JSON.parse(saved.state);
    if(raw.mode!=='multiplayer'||raw.phase!=='play'||!sides.includes(raw.turn)||!sides.every(s=>Array.isArray(raw.pieces?.[s])&&raw.pieces[s].length<=128&&raw.pieces[s].every(p=>!p.alive||coords.includes(p.coord))))throw Error('Estado inválido');
    const cfg=candidate.normalizeMatchConfig(raw.matchConfig);for(const s of sides){const d=saved.drafts?.[s];if(!d||!candidate.validateSetup(s,d.setup,d.bases,cfg.teamSize[s]).ok)throw Error('Preparação salva inválida');}
    candidate.importState(saved.state);ref=candidate;state=JSON.parse(ref.exportState());
    control=defaultGeneralControl();control.paused=true;control.delay=[150,600,1200].includes(saved.control?.delay)?saved.control.delay:600;
    for(const s of sides)if(['easy','normal','hard','extreme'].includes(saved.control?.difficulties?.[s]))control.difficulties[s]=saved.control.difficulties[s];
    control.roundLimit=Number.isInteger(saved.control?.roundLimit)&&saved.control.roundLimit>=0&&saved.control.roundLimit<=500?saved.control.roundLimit:0;
    brains=makeGeneralBrains(control,saved.brains);drafts=saved.drafts;ready={player:true,enemy:true};
    applyConfig(cfg);actionLog=Array.isArray(saved.actionLog)?saved.actionLog.filter(e=>e&&sides.includes(e.side)&&Array.isArray(e.cells)&&e.cells.every(c=>coords.includes(c))).slice(0,40):[];
    observationSeq=Number(saved.observationSeq)||Math.max(0,...actionLog.map(e=>Number(e.id)||0));lastObservationId=actionLog[0]?.id??null;
    recorder=new window.GameReplay.Recorder(()=>ref.exportState());recorder.restore(Array.isArray(saved.frames)?saved.frames:[],!!saved.partial);
    status('Partida local recuperada e pausada. Retome quando quiser.');return true;
  }catch{try{sessionStorage.removeItem(storageKey);}catch{}ref=null;state=null;brains=null;return false;}
}
function schedule(){stopTimer();if(mode!=='local'||!state||state.gameOver||control.paused)return;const current=epoch;timer=setTimeout(()=>{if(current!==epoch)return;localStep();},control.delay);}
function capture(title){if(recorder){recorder.capture(title);if(recorder.items.length>120){recorder.restore(recorder.items.slice(-100),true);}}}
function localStep(){
  if(!ref||state?.gameOver)return;
  const before=ref.exportState(),saved=brainSnapshots(brains);
  try{const step=generalStep(ref,brains,control);if(!step.result?.ok)throw Error(step.result?.status||'Ação inválida');state=JSON.parse(ref.exportState());observe(step.observation?{...step.observation,id:++observationSeq}:null);capture(`${label(step.side)} · ${step.result.status||step.action.type}`);status(state.gameOver?finishText():`Rodada ${state.round} · ${label(step.side)}: ${step.result.status||step.action.type}`);}
  catch(err){ref.importState(before);brains=makeGeneralBrains(control,saved);state=JSON.parse(ref.exportState());control.paused=true;control.error='IA pausada: '+err.message;status(control.error);}
  render();saveLocal();schedule();
}
function send(msg){if(ws?.readyState===1&&joined)ws.send(JSON.stringify({...msg,...(['ready','unready','generalDifficulty','action'].includes(msg.type)?{side}:{})}));else status('A conexão ainda não foi restabelecida.');}
function tokenKey(){return 'bnsGeneralsSeat:'+room;}
function rememberRoom(){const url=new URL(location.href);url.searchParams.set('mode','online');url.searchParams.set('room',room);history.replaceState(null,'',url);}
function forgetRoom(){const url=new URL(location.href);url.searchParams.delete('mode');url.searchParams.delete('room');history.replaceState(null,'',url);}
function openOnline(){
  clearTimeout(retry);clearInterval(heartbeat);joined=false;closedByUser=false;const current=++epoch;
  if(!['http:','https:'].includes(location.protocol)){status('Online exige o endereço publicado do jogo ou npm run dev. No arquivo local, use IA × IA local.');return;}
  ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws?generals=1&room=${encodeURIComponent(room)}`);
  const socket=ws;
  socket.onopen=()=>{if(current!==epoch)return;let token=seatTokenCache[room]||'';try{token=localStorage.getItem(tokenKey())||token;}catch{}socket.send(JSON.stringify({type:'join',room,side,both:$('generalBoth').checked===true,seatToken:token}));heartbeat=setInterval(()=>{if(socket.readyState===1)socket.send(JSON.stringify({type:'ping'}));},15000);};
  socket.onmessage=e=>{if(current!==epoch)return;let msg;try{msg=JSON.parse(e.data);}catch{return;}
    if(msg.type==='joined'){joined=true;side=msg.side;seatTokenCache[room]=msg.seatToken;controlledSides=msg.controlledSides||[side];$('generalBoth').checked=controlledSides.length===2;for(const s of controlledSides)if(msg.preparations?.[s])drafts[s]=structuredClone(msg.preparations[s]);$('generalSide').value=side;try{localStorage.setItem(tokenKey(),msg.seatToken);}catch{status('O navegador bloqueou o armazenamento. A reconexão pode não recuperar seu lado.');}if(msg.preparation)drafts[side]=structuredClone(msg.preparation);status(`Você é ${label(side)}. Sua preparação é privada; apenas os lados sob seu comando podem ser preparados.`);}
    if(msg.type==='roomState'){roomState=msg;ready=msg.ready;if(msg.matchConfig){applyConfig(msg.matchConfig);for(const s of ownedSides())drafts[s].setup=drafts[s].setup.slice(0,teamSize(s));}control=msg.generalControl||control;if(msg.started&&!state)status('Ambos confirmaram. Aguardando o mapa completo...');}
    if(msg.type==='generalView'){state=msg.state;control=msg.control;applyConfig(state.matchConfig);observe(control.latest);ref=new window.GameReferee();ref.importState(JSON.stringify(state));if(!recorder)recorder=new window.GameReplay.Recorder(()=>ref.exportState());capture('Observação Online');if(state.gameOver)status(finishText());else status(control.error||`Rodada ${state.round} · vez de ${label(state.turn)} · ${control.paused?'pausado':'IAs jogando'}`);}
    if(msg.type==='classicReplay'){replayFrames=[];try{const replayRef=new window.GameReferee();replayRef.importState(msg.initialState);const rec=new window.GameReplay.Recorder(()=>replayRef.exportState());rec.capture('Início da partida');let valid=true;for(const entry of msg.actions){const result=applyGeneralRecord(replayRef,entry);if(!result?.ok){valid=false;break;}const full=rec.items.length===600;if(rec.capture(`${label(entry.side)} · ${result.status||entry.action.type}`)&&full)rec.partial=true;}if(valid){if(rec.partial)rec.restore(rec.items,true);replayFrames=rec.items;}}catch{status('Replay completo indisponível. O trecho observado continua disponível.');}}
    if(msg.type==='result')status(msg.status||'');if(msg.type==='error')status(msg.message||'Falha na sala.');render();
  };
  socket.onclose=e=>{if(current!==epoch)return;joined=false;clearInterval(heartbeat);render();if(closedByUser)return;if(e.code===1008||e.code===1000){status('Conexão encerrada. Confira a sala/lado e reconecte pelo navegador original.');return;}status('Conexão perdida. Tentando recuperar seu lado...');retry=setTimeout(openOnline,1800);};
  socket.onerror=()=>{if(current===epoch)status('Não foi possível conectar. Este modo Online precisa do servidor do jogo.');};
}
function setupReady(){
  if(mode==='online'){if(ready[side])return send({type:'unready'});send({type:'ready',...drafts[side]});return;}
  if(ready[side]){ready[side]=false;render();return;}
  const testRef=new window.GameReferee(),d=drafts[side],result=testRef.validateSetup(side,d.setup,d.bases,teamSize(side));
  if(!result.ok)return status(result.status);ready[side]=true;tool=null;
  if(sides.every(s=>ready[s])){
    ref=new window.GameReferee();const a=drafts.player,b=drafts.enemy,start=ref.startMultiplayerGame(a.setup,a.bases,b.setup,b.bases,matchConfig);
    if(!start.ok){ready[side]=false;return status(start.status);}
    brains=makeGeneralBrains(control);state=JSON.parse(ref.exportState());recorder=new window.GameReplay.Recorder(()=>ref.exportState());capture('Início da partida');status('Ambos prontos. As IAs assumiram o comando.');saveLocal();render();schedule();
  }else{side=sides.find(s=>!ready[s]);$('generalSide').value=side;status(`Formação confirmada. Prepare agora o ${label(side)}.`);render();}
}
function randomSetup(){
  if(locked())return;const count=teamSize(side),names=[...R.defs].sort(()=>Math.random()-.5).slice(0,count).map(d=>d.name);
  const available=coords.filter(c=>ownHalf(c)&&!R.isBlocked(c)).sort(()=>Math.random()-.5),bases=available.filter(c=>!['A1','H1','A8','H8'].includes(c)).slice(0,2);
  drafts[side]={setup:available.filter(c=>!bases.includes(c)).slice(0,count).map((coord,i)=>({name:names[i],coord})),bases};tool=null;status(`${label(side)} preenchido. Você pode ajustar antes de dar Pronto.`);render();
}
function ownHalfFor(c,forSide){return forSide==='player'?Number(c.slice(1))<=4:Number(c.slice(1))>=5;}
function ownHalf(c){return ownHalfFor(c,side);}
function firstFreeSetupCell(forSide=side){const d=drafts[forSide];return coords.find(c=>ownHalfFor(c,forSide)&&!R.isBlocked(c)&&!d.setup.some(p=>p.coord===c)&&!d.bases.includes(c))||null;}
function locked(){return !!state||!!ready[side]||(mode==='online'&&!joined);}
function switchSide(next){if(!sides.includes(next)||!canUseSide(next))return status('Esse lado pertence ao outro general.');side=next;$('generalSide').value=side;tool=null;inspected=null;render();}
function selectPiece(name){
  if(locked())return;const d=drafts[side],existing=d.setup.find(p=>p.name===name);
  if(existing){tool={kind:'piece',name};inspected=existing.coord;status(`${name} selecionado. Clique noutra casa ou arraste a peça para reposicionar.`);render();return;}
  if(d.setup.length>=teamSize(side))return status('Remova uma peça antes de escolher outra.');
  const coord=firstFreeSetupCell();if(!coord)return status('Não há casa livre para adicionar essa peça.');
  d.setup.push({name,coord});tool=null;inspected=coord;status(`${name} adicionado em ${coord}. Você pode arrastá-lo para outra casa.`);render();
}
function clickCell(c){
  inspected=c;if(state){renderBoard();renderInspector();return;}
  if(locked()){renderInspector();return;}
  if(!tool){const d=drafts[side],piece=d.setup.find(p=>p.coord===c),baseIndex=d.bases.findIndex(x=>x===c);if(piece){tool={kind:'piece',name:piece.name};status(`${piece.name} selecionado. Clique em outra casa para reposicionar ou use Remover.`);render();return;}if(baseIndex>=0){tool={kind:'base',index:baseIndex};status(`Posto ${baseIndex+1} selecionado. Clique em outra casa para reposicionar.`);render();return;}status('Escolha uma peça acima ou clique numa peça já posicionada.');renderInspector();return;}
  if(!ownHalf(c)||R.isBlocked(c))return status('Escolha uma casa livre do seu lado, fora de Árvores/Pedras.');
  const d=drafts[side];if(d.setup.some(p=>p.coord===c&&(tool.kind!=='piece'||p.name!==tool.name))||d.bases.some((x,i)=>x===c&&(tool.kind!=='base'||i!==tool.index)))return status('Essa casa já está ocupada na sua formação.');
  if(tool.kind==='piece')d.setup.find(p=>p.name===tool.name).coord=c;
  else{if(['A1','H1','A8','H8'].includes(c))return status('Postos não podem ocupar os cantos.');d.bases[tool.index]=c;}
  status(`${tool.kind==='piece'?tool.name:'Posto '+(tool.index+1)} posicionado em ${c}.`);tool=null;render();
}
function displayPieces(){if(!state||!ref)return [];return sides.flatMap(s=>ref.createClient(s).getView().ownPieces.map(p=>({...p,owner:s})));}
function renderBoard(){
  const board=$('generalBoard');board.replaceChildren(node('span'));for(const l of 'ABCDEFGH')board.appendChild(node('span',l,'general-axis'));
  const blank=new window.GameReferee(),raw=state||JSON.parse(blank.exportState()),visibleDraftSides=mode==='local'&&$('generalShowBoth').checked?sides:[side],pieces=state?displayPieces().filter(p=>p.alive):visibleDraftSides.flatMap(s=>drafts[s].setup.filter(p=>p.coord).map(p=>({...R.byName[p.name],...p,owner:s,hp:R.byName[p.name].v,alive:true})));
  const bases=state?raw.bases:visibleDraftSides.flatMap(s=>drafts[s].bases.map((coord,i)=>({coord,id:'draft'+s+i,owner:s,draftIndex:i})));
  for(let y=1;y<=8;y++){board.appendChild(node('span',String(y),'general-axis'));for(const x of 'ABCDEFGH'){
    const c=x+y,cell=node('button',null,'general-cell'+(y>=5?' enemy-half':'')+(inspected===c?' inspecting':'')+(!state&&ownHalf(c)?' placing':''));cell.type='button';cell.dataset.coord=c;cell.setAttribute('aria-label',`Casa ${c}`);cell.onclick=()=>clickCell(c);
    const tree=raw.trees?.find(t=>t.coord===c),rock=raw.rocks?.includes(c),terrain=tree?(tree.state==='live'?A.terrain.tree:A.terrain.deadTree):rock?A.terrain.rock:raw.water?.includes(c)?A.terrain.water:raw.swamps?.includes(c)?A.terrain.swamp:null;
    if(terrain)cell.appendChild(image(terrain,'general-terrain',tree?'Árvore':rock?'Pedra':'Bioma'));
    const base=bases.find(b=>b.coord===c);if(base)cell.appendChild(image(base.sabotaged?(base.owner==='player'?A.structures.baseSabotagedAlly:A.structures.baseSabotagedEnemy):(base.owner==='player'?A.structures.baseAlly:A.structures.baseEnemy),'general-terrain',`${label(base.owner)} · Posto`));
    const here=pieces.filter(p=>p.coord===c);here.forEach((p,i)=>{const src=A.character(p.displayName||p.name);if(src)cell.appendChild(image(src,'general-piece'+(here.length>1?' shared-'+i:''),p.displayName||p.name));cell.appendChild(node('span',String(p.hp)+(state?'/'+p.maxHp:''),'general-hp'+(here.length>1?' shared-'+i:'')));cell.classList.toggle('enemy-unit',p.owner==='enemy');});
    if(here.length)cell.appendChild(node('span',here[0].owner==='player'?'G1':'G2','general-owner'));
    if(!state&&!locked()){
      const ownPiece=here.find(p=>p.owner===side),ownBase=base?.owner===side?base:null,movable=ownPiece?{kind:'piece',name:ownPiece.name}:ownBase?{kind:'base',index:ownBase.draftIndex}:null;
      if(movable){cell.draggable=true;cell.setAttribute('aria-label',`${cell.attributes?.['aria-label']||'Casa '+c}. Arrastável para reposicionar.`);cell.ondragstart=e=>{dragTool={...movable};tool=null;cell.classList.add('dragging');if(e?.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',movable.kind);}};cell.ondragend=()=>{dragTool=null;cell.classList.toggle('dragging',false);};}
      cell.ondragover=e=>{if(!dragTool)return;e.preventDefault?.();if(e.dataTransfer)e.dataTransfer.dropEffect='move';cell.classList.add('drag-target');};
      cell.ondragleave=()=>cell.classList.toggle('drag-target',false);
      cell.ondrop=e=>{if(!dragTool)return;e.preventDefault?.();cell.classList.toggle('drag-target',false);const moving=dragTool;dragTool=null;tool=moving;clickCell(c);if(tool){tool=null;render();}};
    }
    if(state){const active=sides.some(s=>here.some(p=>p.id===raw.activation?.[s]?.pieceId));if(active)cell.classList.add('active-unit');
      if(sides.some(s=>(raw.activation?.[s]?.pyroTargets||[]).includes(c)||(raw.activation?.[s]?.paranoiaTargets||[]).includes(c)))cell.classList.add('planned-target');
      if(sides.some(s=>raw.seer?.[s]?.__set?.includes(c)))cell.classList.add('seer-zone');
      if($('generalShowActions').checked!==false){const recent=focusedEvent?actionLog.filter(e=>e.id===focusedEvent):actionLog.slice(0,6),marks=recent.filter(e=>e.cells.includes(c));if(marks.length){cell.classList.add('recent-action');const e=marks[0],badge=node('span',(e.side==='player'?'🔵':'🔴')+({move:'➜',attack:'💥',place:'⚑',ability:'✨',combat:'⚔'}[e.kind]||'•'),'general-action-marker');cell.appendChild(badge);cell.title=e.text+' · '+e.cells.join(', ');}}
      const impacts=sides.flatMap(s=>{const impact=raw.impact?.[s];return Array.isArray(impact)?impact:typeof impact==='string'?[impact]:impact?.cells||[];});if(impacts.includes(c))cell.classList.add('impact');if(sides.some(s=>raw.combatMarks?.[s]?.includes(c)))cell.classList.add('combat');
      const marks=[];if(raw.corpses?.some(p=>p.coord===c))marks.push('🪦');if(raw.mirrors?.some(p=>p.coord===c))marks.push('🪞');for(const s of sides){for(const trap of raw.traps?.[s]||[])if(trap.coord===c)marks.push(trap.kind==='spot'?'👁':'🪤');for(const presence of raw.falsePresences?.[s]||[])if(presence.coord===c)marks.push('👻');for(const hint of raw.perceptionHints?.[s]||[])if(hint.coord===c)marks.push(hint.knownFalse?'◇':hint.kind==='exact'?'📍':'❗');}
      if(marks.length){const badge=node('span',marks.slice(0,4).join('')+(marks.length>4?'+'+(marks.length-4):''),'general-markers');cell.appendChild(badge);}
    }
    cell.title=c+(here.length?' · '+here.map(p=>`${label(p.owner)}: ${p.displayName||p.name} V${p.hp}`).join(' / '):'');board.appendChild(cell);
  }}
}
function renderInspector(){
  const el=$('generalInspector');el.replaceChildren();
  if(!state&&tool?.kind==='piece'){const d=R.byName[tool.name];el.appendChild(node('b',d.name),node('p',`V ${d.v} · M ${d.m} · ATQ ${d.a} · ALC ${d.range} · PER ${d.per} · Alc. Hab. ${d.ah}`),node('p',R.archetypeName(d.type)),node('p',window.BNSCharacterInfo.abilityText(d)));return;}
  if(!inspected){el.textContent='Clique numa casa para inspecionar.';return;}
  el.appendChild(node('b','Casa '+inspected));if(!state){const piece=drafts[side].setup.find(p=>p.coord===inspected),base=drafts[side].bases.findIndex(c=>c===inspected);if(piece){const d=R.byName[piece.name];el.appendChild(node('p',`${label(side)} · ${d.name}`),node('p',`V ${d.v} · M ${d.m} · ATQ ${d.a} · ALC ${d.range} · PER ${d.per} · Alc. Hab. ${d.ah}`),node('p',window.BNSCharacterInfo.abilityText(d)));}else if(base>=0)el.appendChild(node('p',`${label(side)} · Posto ${base+1}`));else el.appendChild(node('p','Casa livre da sua preparação.'));return;}
  const here=displayPieces().filter(p=>p.alive&&p.coord===inspected);for(const p of here){const row=node('div',null,'general-statline');row.appendChild(node('p',`${label(p.owner)} · ${window.BNSCharacterInfo.unitLabel(p)}`));row.appendChild(node('p',`V ${p.hp}/${p.maxHp} · M ${p.m} · ATQ ${p.a} · ALC ${p.range} · PER ${p.per} · Alc. Hab. ${p.ah}`));row.appendChild(node('p',window.BNSCharacterInfo.abilityText(p)));for(const effect of p.effects||[])row.appendChild(node('p',`${effect.icon} ${effect.name} · ${effect.remaining} restante(s)`));const a=state.activation?.[p.owner];if(a?.pieceId===p.id)row.appendChild(node('p',`Ação em andamento: ${a.mode||'selecionado'}${a.mode==='move'?' · '+a.moveRemaining+' M restante':''}`));const cooldowns=[['Tiro Certeiro',p.sureShotCooldown],['Fumaça',p.ninjaSmokeCooldown],['Rajada',p.pyroCooldown]].filter(([,n])=>n>0);for(const[name,n]of cooldowns)row.appendChild(node('p',`${name} · recarga: ${n} turno(s)`));if(p.golemArmor)row.appendChild(node('p','Armadura ativa'));if(p.linkedToId)row.appendChild(node('p','Vinculado à unidade '+p.linkedToId));el.appendChild(row);}
  const objects=[];for(const base of state.bases||[])if(base.coord===inspected)objects.push(`${label(base.owner)} · Posto ${base.sabotaged?'sabotado':'ativo'}`);for(const corpse of state.corpses||[])if(corpse.coord===inspected)objects.push('Cadáver: '+(corpse.name||'unidade'));for(const mirror of state.mirrors||[])if(mirror.coord===inspected)objects.push('Espelho de '+label(mirror.owner));for(const s of sides){for(const trap of state.traps?.[s]||[])if(trap.coord===inspected)objects.push(label(s)+' · armadilha '+trap.kind);for(const f of state.falsePresences?.[s]||[])if(f.coord===inspected)objects.push(label(s)+' · Presença Fantasma');}
  const tree=state.trees?.find(t=>t.coord===inspected);if(tree)objects.push(`Árvore: V${tree.hp} · ${tree.state}`);if(state.rocks?.includes(inspected))objects.push('Pedra: V'+(state.rockHp?.[inspected]??3));for(const item of objects)el.appendChild(node('p',item));if(!here.length&&!objects.length)el.appendChild(node('p','Nenhuma peça ou estrutura nesta casa.'));
}
function render(){
  document.body?.classList.toggle('generals-preparing',!state&&!roomState?.started);
  $('generalModeSetup').hidden=!!state;
  $('generalMode').disabled=joined||!!state;$('generalSide').disabled=mode==='online'&&joined&&ownedSides().length===1;
  $('generalSideCaption').textContent=state?'Lado selecionado para controles e consulta':'Exército que você está editando';
  for(const s of sides){const tab=$('generalTab'+(s==='player'?'Player':'Enemy'));tab.classList.toggle('active',side===s);tab.classList.toggle('ready',!!ready[s]);tab.disabled=!canUseSide(s);tab.setAttribute('aria-pressed',String(side===s));}
  $('generalBoth').disabled=joined||!!state;$('generalBothWrap').hidden=mode!=='online'||joined||!!state;$('generalShowBothWrap').hidden=mode!=='local'||!!state;$('generalOptions').hidden=$('generalBothWrap').hidden&&$('generalShowBothWrap').hidden;
  const configLocked=!!state||!!roomState?.started||(mode==='online'&&(!joined||!ownedSides().includes('player')));for(const s of sides){$('generalTeam'+s).disabled=configLocked;$('generalLoss'+s).disabled=configLocked;}
  $('generalRoundLimit').disabled=configLocked;$('generalRoundLimit').value=control.roundLimit||0;
  $('generalConfig').hidden=!!state||!!roomState?.started;$('generalRosterTitle').textContent=`${label(side)} · escolha ${teamSize(side)} peças`;$('generalRosterCount').textContent=`${drafts[side].setup.length}/${teamSize(side)}`;
  $('generalSurrender').textContent='🏳️ Render '+label(side);$('generalFinish').disabled=!state||!!state.gameOver||(mode==='online'&&!joined);$('generalFinish').textContent=control.finishVotes?.[side]?'Cancelar pedido de encerramento':'⏹ Encerrar observação';
  $('generalFinishState').textContent=state?.generalEnded?'Encerrada sem vencedor':control.finishVotes&&sides.some(s=>control.finishVotes[s])?sides.map(s=>label(s)+': '+(control.finishVotes[s]?'concordou':'aguardando')).join(' · '):'';
  $('generalScore').textContent=state?sides.map(s=>{const v=ref.createClient(s).getView();return `${label(s)}: ${v.ownOriginalDeaths}/${matchConfig.lossLimit[s]} perdas · ${v.ownPieces.filter(p=>p.alive).length} unidades vivas`;}).join(' | '):`${label(side)}: ${drafts[side].setup.length}/${teamSize(side)} peças · ${drafts[side].bases.filter(Boolean).length}/2 Postos`;
  const events=$('generalEvents');events.replaceChildren();for(const e of actionLog){const b=node('button',`${e.side==='player'?'🔵':'🔴'} R${e.round} · ${e.piece} · ${e.text} ${e.from&&e.kind==='move'?e.from+' → ':''}${e.cells.join(', ')}${e.detail?' · '+e.detail:''}`,'general-event');b.type='button';b.onclick=()=>{focusedEvent=e.id;inspected=e.cells[0]||inspected;renderBoard();renderInspector();};events.appendChild(b);}
  $('generalRoomWrap').hidden=mode!=='online';$('generalNewRoom').hidden=mode!=='online';$('generalJoin').hidden=mode!=='online';$('generalRoom').disabled=joined;$('generalNewRoom').disabled=joined;$('generalJoin').disabled=joined;
  $('generalQuickWatch').hidden=mode!=='local';$('generalQuickWatch').disabled=!!state;
  $('generalPreparation').hidden=!!state||!!roomState?.started;$('generalRosterPanel').hidden=!!state||!!roomState?.started;$('generalWatchControls').hidden=!state;$('generalHistoryPanel').hidden=!state;
  $('generalEventControls').hidden=!state;$('generalEventsPanel').hidden=!state;
  $('generalDifficulty').value=control.difficulties[side];$('generalDifficulty').disabled=locked();
  $('generalReady').textContent=ready[side]?'Cancelar confirmação deste lado':'✓ Confirmar '+label(side);$('generalReady').disabled=mode==='online'&&!joined;
  for(const id of ['generalBase1','generalBase2','generalRandom'])$(id).disabled=locked();
  const readyState=$('generalReadyState');readyState.replaceChildren();for(const s of sides){const card=node('div',null,'general-ready-card'+(ready[s]?' ready':'')+(side===s?' active':''));card.append(node('b',(s==='player'?'🔵 ':'🔴 ')+label(s)),node('span',ready[s]?'Formação confirmada':`${drafts[s].setup.length}/${teamSize(s)} peças · ${drafts[s].bases.filter(Boolean).length}/2 Postos`));readyState.appendChild(card);}
  const roster=$('generalRoster');roster.replaceChildren();for(const d of R.defs){const chosenNow=drafts[side].setup.some(p=>p.name===d.name),active=tool?.kind==='piece'&&tool.name===d.name,b=node('button',null,(chosenNow?'chosen ':'')+(active?'active-target':''));b.type='button';b.disabled=locked();b.setAttribute('aria-pressed',String(chosenNow));b.append(image(A.character(d.name),'',d.name),node('span',d.name));b.title=`${d.name} · V${d.v} M${d.m} ATQ${d.a} · ${R.archetypeName(d.type)}`;b.onclick=()=>selectPiece(d.name);roster.appendChild(b);}
  const chosen=$('generalChosen');chosen.replaceChildren();for(const p of drafts[side].setup){const chip=node('div',null,'general-chosen'+(tool?.kind==='piece'&&tool.name===p.name?' selected':'')+(!p.coord?' unplaced':''));const copy=node('span',null,'chosen-copy');copy.append(node('b',p.name),node('small',p.coord?'Casa '+p.coord:'Falta posicionar'));chip.append(image(A.character(p.name),'',p.name),copy);const remove=node('button','Remover');remove.type='button';remove.disabled=locked();remove.setAttribute('aria-label','Remover '+p.name);remove.onclick=e=>{e?.stopPropagation?.();drafts[side].setup=drafts[side].setup.filter(x=>x.name!==p.name);if(tool?.name===p.name)tool=null;if(inspected===p.coord)inspected=null;status(`${p.name} removido do ${label(side)}.`);render();};chip.onclick=()=>{if(!locked()){tool={kind:'piece',name:p.name};inspected=p.coord||null;status(`${p.name} selecionado. Clique numa casa para posicionar.`);render();}};chip.appendChild(remove);chosen.appendChild(chip);}
  $('generalPause').textContent=control.paused?'▶ Retomar':'⏸ Pausar';$('generalPause').disabled=!!state?.gameOver||(mode==='online'&&!joined);$('generalStep').disabled=!!state?.gameOver||(mode==='online'&&!joined);$('generalSpeed').value=String(control.delay);$('generalSpeed').disabled=!!state?.gameOver||(mode==='online'&&!joined);if($('generalSurrenderZone'))$('generalSurrenderZone').hidden=!state||state.phase!=='play';$('generalSurrender').disabled=!state||!!state.gameOver||(mode==='online'&&!joined);$('generalReplay').hidden=!state?.gameOver||!(replayFrames.length||recorder?.items.length);
  const history=$('generalHistory');history.replaceChildren();if(state)for(const s of sides){history.appendChild(node('b',label(s)));for(const line of state.history?.[s]?.slice(0,12)||[])history.appendChild(node('div',line,'general-history-line'));}
  renderBoard();renderInspector();
}
$('generalMode').onchange=()=>{stopTimer();closedByUser=true;clearTimeout(retry);clearInterval(heartbeat);ws?.close();ws=null;joined=false;roomState=null;state=null;ref=null;brains=null;recorder=null;ready={player:false,enemy:false};mode=$('generalMode').value;controlledSides=mode==='local'?[...sides]:[side];actionLog=[];focusedEvent=null;observationSeq=0;lastObservationId=null;applyConfig(new window.GameReferee().normalizeMatchConfig());control=defaultGeneralControl();$('generalModeHint').textContent=mode==='local'?'Use as abas G1 e G2 para preparar os dois exércitos.':'Entre como G1 ou G2; marque controlar ambos antes de entrar numa sala vazia.';status(mode==='online'?'Escolha o lado, confira o código e entre na sala.':'Prepare os dois exércitos.');if(mode==='online'&&!$('generalRoom').value)$('generalRoom').value=randomRoomCode();if(mode==='local'){forgetRoom();recoverLocal();}render();};
$('generalSide').onchange=()=>switchSide($('generalSide').value);
$('generalTabPlayer').onclick=()=>switchSide('player');$('generalTabEnemy').onclick=()=>switchSide('enemy');
for(const s of sides)for(const prefix of ['generalTeam','generalLoss'])$(prefix+s).onchange=changeConfig;
$('generalRoundLimit').onchange=changeConfig;
$('generalShowBoth').onchange=()=>{renderBoard();renderInspector();};$('generalShowActions').onchange=()=>{focusedEvent=null;renderBoard();};
$('generalClearEvents').onclick=()=>{actionLog=[];focusedEvent=null;render();saveLocal();};
$('generalFinish').onclick=()=>{if(!state||state.gameOver)return;if(mode==='online'){if(control.finishVotes?.[side])return send({type:'generalControl',command:'cancelFinish'});if(confirm('Pedir encerramento sem vencedor? Com dois generais, ambos precisam concordar.'))send({type:'generalControl',command:'finish'});}else if(confirm('Encerrar esta observação sem vencedor? O replay ficará disponível.')){stopTimer();const result=finishGeneralObservation(ref);state=JSON.parse(ref.exportState());capture('Observação encerrada');status(result.status);render();saveLocal();}};
$('generalNewRoom').onclick=()=>{$('generalRoom').value=randomRoomCode();status('Novo código criado. Compartilhe-o se outro general for entrar.');};
$('generalJoin').onclick=()=>{stopTimer();closedByUser=true;ws?.close();room=$('generalRoom').value.toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);$('generalRoom').value=room;if(!room)return status('Informe um código de sala.');rememberRoom();controlledSides=[side];actionLog=[];focusedEvent=null;observationSeq=0;lastObservationId=null;roomState=null;state=null;ref=null;recorder=null;replayFrames=[];ready={player:false,enemy:false};status('Conectando...');openOnline();render();};
$('generalDifficulty').onchange=()=>{const level=$('generalDifficulty').value;if(mode==='online')send({type:'generalDifficulty',difficulty:level});else control.difficulties[side]=level;};
$('generalBase1').onclick=()=>{tool={kind:'base',index:0};status('Escolha uma casa para o Posto 1.');};$('generalBase2').onclick=()=>{tool={kind:'base',index:1};status('Escolha uma casa para o Posto 2.');};
$('generalRandom').onclick=randomSetup;$('generalReady').onclick=setupReady;
$('generalQuickWatch').onclick=()=>{if(mode!=='local'||state)return;ready={player:false,enemy:false};side='player';randomSetup();setupReady();randomSetup();setupReady();};
$('generalPause').onclick=()=>{if(mode==='online')send({type:'generalControl',command:control.paused?'resume':'pause'});else{control.paused=!control.paused;control.error=null;render();saveLocal();schedule();}};
$('generalStep').onclick=()=>{if(mode==='online')send({type:'generalControl',command:'step'});else{stopTimer();control.paused=true;localStep();}};
$('generalSpeed').onchange=()=>{const delay=Number($('generalSpeed').value);if(mode==='online')send({type:'generalControl',command:'speed',delay});else{control.delay=delay;saveLocal();schedule();}};
$('generalSurrender').onclick=()=>{if(!confirm(`Render o exército do ${label(side)}?`))return;if(mode==='online')send({type:'action',action:{type:'surrender'}});else{stopTimer();const result=ref.createClient(side).surrender();state=JSON.parse(ref.exportState());capture('Rendição de '+label(side));status(result.status);render();saveLocal();}};
$('generalReplay').onclick=()=>{window.GameReplay.open(replayFrames.length?replayFrames:recorder.items,{kind:'classic',title:'Replay — Generais'+(recorder?.partial?' · trecho recente':'')});};
$('generalReset').onclick=()=>{if(state&&!state.gameOver&&!confirm('Sair da observação? Online, as IAs continuam na sala; você pode reconectar. Local, esta partida será apagada.'))return;stopTimer();closedByUser=true;clearTimeout(retry);clearInterval(heartbeat);ws?.close();ws=null;joined=false;roomState=null;state=null;ref=null;brains=null;recorder=null;replayFrames=[];ready={player:false,enemy:false};tool=null;inspected=null;actionLog=[];focusedEvent=null;observationSeq=0;lastObservationId=null;control=defaultGeneralControl();if(mode==='local')try{sessionStorage.removeItem(storageKey);}catch{}status(mode==='online'?'Use outro código para uma nova partida, ou o código anterior para reconectar.':'Ajuste as formações e dê Pronto novamente.');render();};
$('generalRules').onclick=()=>$('generalHelp').showModal();$('generalCloseHelp').onclick=()=>$('generalHelp').close();
window.addEventListener('pagehide',saveLocal);
const initialUrl=new URL(location.href);
if(initialUrl.searchParams.get('mode')==='online'){
  mode='online';$('generalMode').value=mode;room=String(initialUrl.searchParams.get('room')||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);$('generalRoom').value=room;
  let token='';try{token=localStorage.getItem(tokenKey())||'';}catch{}
  if(room&&token){status('Recuperando seu lado na sala...');openOnline();}
}else recoverLocal();applyConfig(matchConfig);render();
