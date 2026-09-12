import {TriReferee,TriAI,applyTriAction,TRI_SIDES} from './tri-core.js';
import {activeSocket,readMessage,enqueue,joinSeat,loadReplay,persistReplay,checkpoint,restore,commit} from './room-protocol.js';
import {defaultGeneralControl,makeGeneralBrains,brainSnapshots,generalStep,finishGeneralObservation} from '../public/generals-core.mjs';
// Batalha nas Sombras — Cloudflare Worker + Durable Objects (fontes sincronizadas).
// Regras e árbitro mantidos autoritativos no servidor para o X1.
'use strict';
var __gameRoot = typeof window!=='undefined' ? window : globalThis;
__gameRoot.GameRules = (() => {
  const defs = [
    {name:'Arqueiro',icon:'🏹',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:3,per:1,ah:0},
    {name:'Ninja',icon:'🗡️',type:'S',typeIcon:'🗡️',v:1,m:2,a:1,range:2,per:1,ah:0},
    {name:'Piromante',icon:'🔥',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:2},
    {name:'Kamikaze',icon:'💣',type:'S',typeIcon:'🗡️',v:1,m:1,a:0,range:1,per:1,ah:1},
    {name:'Caçador',icon:'🐾',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Paranoia',icon:'🧠',type:'R',typeIcon:'🛡️',v:2,m:2,a:0,range:1,per:1,ah:2},
    {name:'Escudeiro',icon:'🛡️',type:'R',typeIcon:'🛡️',v:2,m:1,a:0,range:1,per:1,ah:0},
    {name:'Golem',icon:'🗿',type:'R',typeIcon:'🛡️',v:2,m:1,a:0,range:1,per:1,ah:0},
    {name:'Cavaleiro',icon:'🐎',type:'R',typeIcon:'🛡️',v:1,m:3,a:1,range:1,per:1,ah:0},
    {name:'Slime',icon:'🟢',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:0},
    {name:'Zumbi',icon:'🧟',type:'R',typeIcon:'🛡️',v:2,m:1,a:1,range:1,per:1,ah:0},
    {name:'Druida',icon:'🌿',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Vidente',icon:'👁️',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:3},
    {name:'Mago do Espelho',icon:'🔮',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:2},
    {name:'Necromante',icon:'☠️',type:'P',typeIcon:'📜',v:1,m:2,a:1,range:1,per:1,ah:1},
    {name:'Doppelgänger',icon:'🎭',type:'P',typeIcon:'📜',v:1,m:2,a:1,range:1,per:1,ah:2},
    {name:'Sentinela',icon:'🦉',type:'P',typeIcon:'📜',v:1,m:2,a:0,range:1,per:1,ah:1},
    {name:'Bardo',icon:'🎵',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:2},
    {name:'Trapaceiro',icon:'🃏',type:'J',typeIcon:'🃏',v:1,m:1,a:0,range:1,per:1,ah:0,diag:true},
    {name:'Fantasma',icon:'👻',type:'J',typeIcon:'🃏',v:1,m:1,a:0,range:1,per:1,ah:0,flying:true}
  ];
  const skeletonDef={name:'Esqueleto',icon:'💀',type:'C',typeIcon:'🦴',v:1,m:1,a:1,range:1,per:1,ah:0};
  const miniDef={name:'Mini-Slime',icon:'🟢',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:0};
  const lavaDef={name:'Golem de Lava',icon:'🌋',type:'R',typeIcon:'🛡️',v:1,m:0,a:1,range:1,per:1,ah:0};
  const branchDef={name:'Galho-Vivo',icon:'🌲',type:'C',typeIcon:'🦴',v:1,m:1,a:1,range:1,per:1,ah:0};
  const byName = Object.fromEntries(defs.map(d=>[d.name,d]));
  byName.Coringa=byName.Trapaceiro; // compatibilidade com saves/clientes antigos
  const archetypeNames=Object.freeze({R:'Vanguarda',P:'Estrategista',S:'Executor',J:'Coringa',C:'Condenado'});
  const archetypeName=type=>archetypeNames[type]||type||'—';
  const baseBonuses=[
    {id:'radarAdvanced',icon:'📡',name:'Radar Avançado',description:'A percepção ortogonal da unidade escolhida informa a casa exata com presença.'},
    {id:'radarExpanded',icon:'📶',name:'Radar Ampliado',description:'A unidade escolhida também detecta nas diagonais dentro do alcance de PER e informa se a presença é ortogonal ou diagonal.'},
    {id:'move',icon:'👟',name:'Mobilidade',description:'+1 M permanente para uma unidade aliada viva.'},
    {id:'life',icon:'❤️',name:'Reforço',description:'+1 Vida máxima e +1 Vida atual para uma unidade aliada viva.'},
    {id:'attack',icon:'⚔️',name:'Armamento',description:'+1 ATQ permanente para uma unidade aliada viva.'},
    {id:'range',icon:'🎯',name:'Mira',description:'+1 ALC permanente para uma unidade aliada viva que possua ataque normal.'},
    {id:'abilityRange',icon:'✨',name:'Alc. Hab.',description:'+1 Alc. Hab. permanente para uma unidade com habilidade que use Alcance de Habilidade.'}
  ];
  const rc=c=>({x:c.charCodeAt(0)-65,y:Number(c.slice(1))-1});
  const coord=(x,y)=>String.fromCharCode(65+x)+(y+1);
  const inside=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
  const man=(a,b)=>{const A=rc(a),B=rc(b);return Math.abs(A.x-B.x)+Math.abs(A.y-B.y)};
  const sameLine=(a,b)=>{const A=rc(a),B=rc(b);return A.x===B.x||A.y===B.y};
  const treeCells=Object.freeze(['B3','G6']);
  const rockCells=Object.freeze(['F2','C7']);
  const waterCells=Object.freeze(['D3','E6']);
  const swampCells=Object.freeze(['C5','F4']);
  const blockedCells=Object.freeze([...treeCells,...rockCells]);
  const isBlocked=c=>blockedCells.includes(c);
  const isRock=c=>rockCells.includes(c);
  const isWater=c=>waterCells.includes(c);
  const isSwamp=c=>swampCells.includes(c);
  function neighbors(c,diag=false){
    const a=rc(c),ds=diag?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
    return ds.map(([dx,dy])=>[a.x+dx,a.y+dy]).filter(([x,y])=>inside(x,y)).map(([x,y])=>coord(x,y));
  }
  function defOf(p){
    if(!p) return null;
    let base;
    if(p.summonType==='skeleton') base=skeletonDef;
    else if(p.summonType==='miniSlime') base=miniDef;
    else if(p.summonType==='livingBranch') base=branchDef;
    else if(p.form==='lava') base=lavaDef;
    else base=byName[p.name] || p;
    const temp=(p.effects||[]).reduce((acc,e)=>{
      const m=e&&e.modifiers||{};
      acc.v+=(Number(m.v)||0);acc.m+=(Number(m.m)||0);acc.a+=(Number(m.a)||0);acc.range+=(Number(m.range)||0);acc.per+=(Number(m.per)||0);acc.ah+=(Number(m.ah)||0);
      return acc;
    },{v:0,m:0,a:0,range:0,per:0,ah:0});
    const rawV=Math.max(1,(base.v||0)+(p.bonusV||0)+temp.v);
    const rawM=Math.max(0,(base.m||0)+(p.bonusM||0)+temp.m);
    const rawA=Math.max(0,(base.a||0)+(p.bonusA||0)+temp.a);
    let rawRange=Math.max(0,(base.range||0)+(p.bonusRange||0)+temp.range);
    if(p.sureShotActive)rawRange*=2;
    return {...base,
      v:rawV,m:rawM,a:rawA,range:rawRange,
      per:Math.max(0,(base.per??1)+(p.bonusPer||0)+temp.per),
      ah:Math.max(0,(base.ah||0)+(p.bonusAH||0)+temp.ah)
    };
  }
  function attackCells(p){
    const d=defOf(p),out=[];
    // Objetos enviados à interface já carregam ATQ/ALC finais (incluindo efeitos temporários, como o Bardo).
    // Peças internas do Árbitro não possuem esses campos diretos, então continuam usando defOf(p).
    const attack=Number.isFinite(Number(p?.a))?Number(p.a):d.a;
    const range=Number.isFinite(Number(p?.range))?Number(p.range):d.range;
    if(attack<=0 && !((p.name==='Fantasma'||p.identity==='Fantasma')&&!p.possession&&!p.possessing))return out;
    for(let y=0;y<8;y++) for(let x=0;x<8;x++){
      const c=coord(x,y); if(c!==p.coord&&man(p.coord,c)<=range) out.push(c);
    }
    return out;
  }
  function abilityCells(p,includeSelf=false){
    const d=defOf(p),out=[];
    // Na interface, p.ah é o Alc. Hab. final; usar esse valor evita perder bônus temporários na marcação.
    const ah=Number.isFinite(Number(p?.ah))?Number(p.ah):d.ah;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=coord(x,y);if((includeSelf||c!==p.coord)&&man(p.coord,c)<=ah)out.push(c)}
    return out;
  }
  function blastCells(c,ah=1){
    ah=Math.max(0,Math.floor(Number(ah)||0));if(!ah)return[];
    const dist={[c]:0},q=[c];
    while(q.length){const cur=q.shift(),d=dist[cur];if(d>=ah)continue;for(const n of neighbors(cur,true))if(dist[n]==null){dist[n]=d+1;q.push(n)}}
    return Object.keys(dist).filter(x=>x!==c&&dist[x]<=ah);
  }
  function perceptionCells(c,per=1,diag=false){
    const a=rc(c),limit=Math.max(0,Math.floor(Number(per)||0));
    const ds=diag?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
    const out=[];
    for(const [dx,dy] of ds) for(let step=1;step<=limit;step++){
      const x=a.x+dx*step,y=a.y+dy*step;if(inside(x,y))out.push(coord(x,y));
    }
    return out;
  }
  function directWinner(a,d){
    const A=defOf(a).type,D=defOf(d).type;
    if(A==='C'&&D==='C')return'tie';
    if(A==='C')return'def';
    if(D==='C')return'att';
    if(A==='J'&&D==='J')return'tie';
    if(A==='J')return'att';
    if(D==='J')return'def';
    if(A===D)return'tie';
    return((A==='R'&&D==='S')||(A==='S'&&D==='P')||(A==='P'&&D==='R'))?'att':'def';
  }
  return Object.freeze({defs,skeletonDef,miniDef,lavaDef,branchDef,baseBonuses,byName,archetypeNames,archetypeName,rc,coord,inside,man,sameLine,treeCells,rockCells,waterCells,swampCells,blockedCells,isBlocked,isRock,isWater,isSwamp,neighbors,perceptionCells,defOf,attackCells,abilityCells,blastCells,directWinner});
})();

'use strict';
var __refRoot = typeof window!=='undefined' ? window : globalThis;
__refRoot.GameReferee = class GameReferee {
  #R = __refRoot.GameRules;
  #s;
  constructor(){ this.reset(); }
  #random(){let seed=(this.#s.rngState??0x6d2b79f5)>>>0;seed=(Math.imul(seed,1664525)+1013904223)>>>0;this.#s.rngState=seed;return seed/4294967296;}

  reset(){
    this.#s={
      rngState:Math.floor(Math.random()*4294967296)>>>0,
      phase:'setup', mode:null, round:1, turn:'player', roundStarter:'player', idSeq:1, gameOver:false, result:null, surrenderedBy:null, aiDifficulty:'normal', matchConfig:{teamSize:{player:4,enemy:4},lossLimit:{player:3,enemy:3}},
      pieces:{player:[],enemy:[]}, bases:[], chosenBaseBonuses:{player:[],enemy:[]}, corpses:[], mirrors:[], pendingSlimeSplits:[],
      history:{player:[],enemy:[]}, intel:{player:[],enemy:[]}, impact:{player:null,enemy:null}, combatMarks:{player:[],enemy:[]}, combatHold:{player:false,enemy:false}, perceptionHints:{player:[],enemy:[]},
      seer:{player:new Set(),enemy:new Set()}, seerExpires:{player:false,enemy:false},
      activation:{player:null,enemy:null}, roundActivations:{player:0,enemy:0}, pendingCombat:null, doppelChoice:{player:null,enemy:null},
      trees:[{coord:'B3',state:'live',hp:3},{coord:'G6',state:'live',hp:3}], rocks:['F2','C7'], rockHp:{F2:3,C7:3}, water:['D3','E6'], swamps:['C5','F4'], traps:{player:[],enemy:[]}, falsePresences:{player:[],enemy:[]}, spotReveals:{player:{},enemy:{}}, replayEvent:null
    };
  }

  createClient(side){
    if(side!=='player'&&side!=='enemy') throw new Error('lado inválido');
    const self=this;
    const run=fn=>(...args)=>{self.#s.replayEvent=null;return fn(...args);};
    return Object.freeze({
      getView:()=>self.#getView(side),
      selectPiece:run((id)=>self.#selectPiece(side,id)),
      cancelSelection:run(()=>self.#cancelSelection(side)),
      cancelMode:run(()=>self.#cancelMode(side)),
      startMove:run(()=>self.#startMove(side)),
      moveStep:run((to)=>self.#moveStep(side,to)),
      stopMove:run(()=>self.#stopMove(side)),
      startAttack:run(()=>self.#startAttack(side)),
      attack:run((to)=>self.#attack(side,to)),
      selectPyroTarget:run((to)=>self.#selectPyroTarget(side,to)),
      confirmPyroAttack:run(()=>self.#confirmPyroAttack(side)),
      confirmSureShot:run(()=>self.#confirmSureShot(side)),
      selectParanoiaTarget:run((to)=>self.#selectParanoiaTarget(side,to)),
      confirmParanoia:run(()=>self.#confirmParanoia(side)),
      startAbility:run(()=>self.#startAbility(side)),
      confirmKamikaze:run(()=>self.#confirmKamikaze(side)),
      useSeer:run((cells)=>self.#useSeer(side,cells)),
      raiseAt:run((coord)=>self.#raiseAt(side,coord)),
      placeMirror:run((coord)=>self.#placeMirror(side,coord)),
      awakenTree:run((coord)=>self.#awakenTree(side,coord)),
      placeTrap:run((coord)=>self.#placeTrap(side,coord)),
      bardBuff:run((targetId,stat)=>self.#bardBuff(side,targetId,stat)),
      absorbRock:run(coord=>self.#absorbRock(side,coord)),
      shieldLink:run((targetId=null)=>self.#shieldLink(side,targetId)),
      endActivation:run(()=>self.#endActivationRequest(side)),
      chooseCombatPosition:run((advance)=>self.#chooseCombatPosition(side,advance)),
      sabotageBase:run((baseId,bonusId,targetPieceId=null)=>self.#sabotageBase(side,baseId,bonusId,targetPieceId)),
      chooseDoppelCopy:run((copyNew)=>self.#chooseDoppelCopy(side,copyNew)),
      surrender:run(()=>self.#surrender(side)),
      advanceTrainingRound:run(()=>self.#advanceTrainingRound())
    });
  }

  normalizeMatchConfig(config={}){
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(n)||a)));
    const ps=clamp(config?.teamSize?.player??config?.playerTeamSize??4,1,8),es=clamp(config?.teamSize?.enemy??config?.enemyTeamSize??4,1,8);
    const pl=clamp(config?.lossLimit?.player??config?.playerLossLimit??Math.min(3,ps),1,ps),el=clamp(config?.lossLimit?.enemy??config?.enemyLossLimit??Math.min(3,es),1,es);
    return {teamSize:{player:ps,enemy:es},lossLimit:{player:pl,enemy:el}};
  }

  validateSetup(side,setup,bases,expectedCount=4){
    if(side!=='player'&&side!=='enemy') return this.#fail('Lado inválido.');
    if(!Array.isArray(setup)||setup.length!==expectedCount) return this.#fail(`É necessário posicionar exatamente ${expectedCount} ${expectedCount===1?'personagem':'personagens'}.`);
    if(!Array.isArray(bases)||bases.length!==2) return this.#fail('É necessário posicionar exatamente 2 Postos de Operação.');
    if(setup.some(x=>!x||typeof x!=='object'||typeof x.name!=='string'||typeof x.coord!=='string'||! /^[A-H][1-8]$/.test(x.coord)||!this.#R.defs.some(d=>d.name===(x.name==='Coringa'?'Trapaceiro':x.name))))return this.#fail('Personagem ou casa inicial inválidos.');
    if(bases.some(c=>typeof c!=='string'||! /^[A-H][1-8]$/.test(c)))return this.#fail('Casa do Posto inválida.');
    const names=new Set(setup.map(x=>x.name==='Coringa'?'Trapaceiro':x.name)),coords=new Set(setup.map(x=>x.coord)),baseCoords=new Set(bases);
    if(names.size!==expectedCount||coords.size!==expectedCount) return this.#fail('Personagens e casas iniciais precisam ser únicos.');
    if(baseCoords.size!==2) return this.#fail('Os dois Postos precisam ficar em casas diferentes.');
    const minRow=side==='player'?1:5,maxRow=side==='player'?4:8;
    for(const x of setup){
      const d=this.#R.byName[x.name];if(!d)return this.#fail('Personagem inválido.');
      const r=Number(x.coord?.slice(1));if(!x.coord||r<minRow||r>maxRow)return this.#fail(`Posicionamento deve ficar nas linhas ${minRow}–${maxRow}.`);
      if(this.#R.isBlocked(x.coord))return this.#fail('Árvores e rochas bloqueiam a casa e não podem ser ocupadas.');
      if(baseCoords.has(x.coord))return this.#fail('Postos não podem ocupar a mesma casa de um personagem.');
    }
    for(const c of bases){
      if(!c)return this.#fail('Posto sem posição.');
      const q=this.#R.rc(c),r=q.y+1;if(r<minRow||r>maxRow)return this.#fail(`Postos devem ficar nas linhas ${minRow}–${maxRow}.`);
      if(this.#R.isBlocked(c))return this.#fail('Postos não podem ocupar uma casa com árvore ou rocha.');
      if(this.#isCorner(c))return this.#fail('Postos não podem ficar nos quatro cantos do mapa.');
    }
    return this.#ok('Preparação válida.');
  }

  startMultiplayerGame(playerSetup,playerBases,enemySetup,enemyBases,config=null){
    if(this.#s.phase!=='setup')return this.#fail('A partida já começou.');
    const cfg=this.normalizeMatchConfig(config);
    const vp=this.validateSetup('player',playerSetup,playerBases,cfg.teamSize.player);if(!vp.ok)return vp;
    const ve=this.validateSetup('enemy',enemySetup,enemyBases,cfg.teamSize.enemy);if(!ve.ok)return ve;
    this.#s.matchConfig=cfg;
    this.#s.pieces.player=[];this.#s.pieces.enemy=[];this.#s.bases=[];
    for(const [side,setup,bases] of [['player',playerSetup,playerBases],['enemy',enemySetup,enemyBases]]){
      for(const x of setup){const d=this.#R.byName[x.name];this.#s.pieces[side].push({id:(side==='player'?'p':'e')+this.#s.idSeq++,owner:side,name:d.name,identity:d.name,hp:d.v,coord:x.coord,alive:true,activated:false,original:true,form:null,copied:null,mirrorCooldown:0,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false});}
      bases.forEach((coord,i)=>this.#s.bases.push({id:(side==='player'?'bp':'be')+(i+1),owner:side,coord,sabotaged:false}));
    }
    const starter=Math.random()<.5?'player':'enemy';
    this.#s.phase='play';this.#s.mode='multiplayer';this.#s.round=1;this.#s.roundStarter=starter;this.#s.turn=starter;this.#s.gameOver=false;this.#s.result=null;this.#s.surrenderedBy=null;
    this.#addHistory('player',`🎲 Clássico iniciado. ${starter==='player'?'Você':'O adversário'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    this.#addHistory('enemy',`🎲 Clássico iniciado. ${starter==='enemy'?'Você':'O adversário'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    return this.#ok(`Partida Clássica iniciada. ${starter==='player'?'Jogador 1':'Jogador 2'} começa.`);
  }

  startGame(playerSetup,playerBases,difficulty='normal',config=null){
    if(this.#s.phase!=='setup') return this.#fail('A partida já começou.');
    const cfg=this.normalizeMatchConfig(config),expectedCount=cfg.teamSize.player;
    if(!Array.isArray(playerSetup)||playerSetup.length!==expectedCount) return this.#fail(`É necessário posicionar exatamente ${expectedCount} ${expectedCount===1?'personagem':'personagens'}.`);
    if(!Array.isArray(playerBases)||playerBases.length!==2) return this.#fail('É necessário posicionar exatamente 2 Postos de Operação.');
    const valid=this.validateSetup('player',playerSetup,playerBases,expectedCount);if(!valid.ok)return valid;
    const names=new Set(playerSetup.map(x=>x.name)), coords=new Set(playerSetup.map(x=>x.coord));
    const baseCoords=new Set(playerBases);
    if(names.size!==expectedCount||coords.size!==expectedCount) return this.#fail('Personagens e casas iniciais precisam ser únicos.');
    if(baseCoords.size!==2) return this.#fail('Os dois Postos precisam ficar em casas diferentes.');
    for(const x of playerSetup){
      const d=this.#R.byName[x.name];
      if(!d) return this.#fail('Personagem inválido.');
      const r=Number(x.coord.slice(1)); if(r<1||r>4) return this.#fail('Posicionamento do jogador deve ficar nas linhas 1–4.');
      if(this.#R.isBlocked(x.coord)) return this.#fail('Árvores e rochas bloqueiam a casa e não podem ser ocupadas.');
      if(baseCoords.has(x.coord)) return this.#fail('Postos não podem ocupar a mesma casa de um personagem.');
    }
    for(const c of playerBases){
      const q=this.#R.rc(c),r=q.y+1;
      if(r<1||r>4)return this.#fail('Postos do jogador devem ficar nas linhas 1–4.');
      if(this.#R.isBlocked(c))return this.#fail('Postos não podem ocupar uma casa com árvore ou rocha.');
      if(this.#isCorner(c))return this.#fail('Postos não podem ficar nos quatro cantos do mapa.');
    }
    this.#s.pieces.player=playerSetup.map(x=>{
      const d=this.#R.byName[x.name];
      return {id:'p'+this.#s.idSeq++,owner:'player',name:d.name,identity:d.name,hp:d.v,coord:x.coord,alive:true,activated:false,original:true,form:null,copied:null,mirrorCooldown:0,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false};
    });
    this.#s.bases=playerBases.map((coord,i)=>({id:'bp'+(i+1),owner:'player',coord,sabotaged:false}));
    this.#s.matchConfig=cfg;
    this.#s.aiDifficulty=['easy','normal','hard','extreme'].includes(difficulty)?difficulty:'normal';
    this.#enemySetup(this.#s.aiDifficulty,cfg.teamSize.enemy);
    const starter=Math.random()<.5?'player':'enemy';
    this.#s.phase='play'; this.#s.mode='solo'; this.#s.round=1; this.#s.roundStarter=starter; this.#s.turn=starter; this.#s.gameOver=false; this.#s.result=null; this.#s.surrenderedBy=null;
    this.#addHistory('player',`🎲 Partida iniciada. ${starter==='player'?'Você':'A IA'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    this.#addHistory('enemy',`🎲 Partida iniciada. ${starter==='enemy'?'Você':'O jogador'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    return this.#ok(`Partida iniciada. ${starter==='player'?'Você começa':'A IA começa'}.`);
  }

  startTrainingGame(playerSetup,enemySetup,playerBases,enemyBases){
    if(this.#s.phase!=='setup')return this.#fail('O treino já começou.');
    if(!Array.isArray(playerSetup)||playerSetup.length!==4||!Array.isArray(enemySetup)||enemySetup.length!==4)return this.#fail('O Treino usa 4 peças em cada lado (8 no total).');
    if(!Array.isArray(playerBases)||playerBases.length!==2||!Array.isArray(enemyBases)||enemyBases.length!==2)return this.#fail('O Treino usa exatamente 2 Postos de Operação em cada lado.');
    const all=[...playerSetup,...enemySetup];
    if(all.some(x=>!x||typeof x.name!=='string'||typeof x.coord!=='string'||! /^[A-H][1-8]$/.test(x.coord)||!this.#R.defs.some(d=>d.name===(x.name==='Coringa'?'Trapaceiro':x.name)))||[...playerBases,...enemyBases].some(c=>typeof c!=='string'||! /^[A-H][1-8]$/.test(c)))return this.#fail('Personagem ou casa inválidos no Treino.');
    const coords=new Set(),baseCoords=new Set([...playerBases,...enemyBases]);
    if(baseCoords.size!==4)return this.#fail('Os 4 Postos do Treino precisam ficar em casas diferentes.');
    for(const x of all){
      const d=this.#R.byName[x.name];if(!d)return this.#fail('Personagem inválido no Treino.');
      if(!x.coord||this.#R.isBlocked(x.coord))return this.#fail('Posicione todas as peças em casas livres, fora de árvores e rochas.');
      if(coords.has(x.coord))return this.#fail('Duas peças não podem começar na mesma casa no Treino.');
      if(baseCoords.has(x.coord))return this.#fail('Personagens e Postos não podem começar na mesma casa no Treino.');
      coords.add(x.coord);
    }
    for(const [side,bases] of [['player',playerBases],['enemy',enemyBases]]){
      const min=side==='player'?1:5,max=side==='player'?4:8;
      for(const c of bases){
        if(!c||this.#R.isBlocked(c))return this.#fail('Postos não podem ocupar árvores ou rochas.');
        const r=Number(c.slice(1));if(r<min||r>max)return this.#fail(`Os Postos do Lado ${side==='player'?'A':'B'} devem ficar no próprio lado do tabuleiro.`);
        if(this.#isCorner(c))return this.#fail('Postos não podem ficar nos quatro cantos do mapa.');
      }
    }
    this.#s.pieces.player=[];this.#s.pieces.enemy=[];this.#s.bases=[];
    for(const [side,setup] of [['player',playerSetup],['enemy',enemySetup]]){
      for(const x of setup){const d=this.#R.byName[x.name];this.#s.pieces[side].push({id:(side==='player'?'p':'e')+this.#s.idSeq++,owner:side,name:d.name,identity:d.name,hp:d.v,coord:x.coord,alive:true,activated:false,original:true,form:null,copied:null,mirrorCooldown:0,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false});}
    }
    playerBases.forEach((coord,i)=>this.#s.bases.push({id:'bp'+(i+1),owner:'player',coord,sabotaged:false}));
    enemyBases.forEach((coord,i)=>this.#s.bases.push({id:'be'+(i+1),owner:'enemy',coord,sabotaged:false}));
    this.#s.phase='play';this.#s.mode='training';this.#s.round=1;this.#s.turn='player';this.#s.gameOver=false;this.#s.result=null;this.#s.surrenderedBy=null;
    this.#addHistory('player','🧪 Treino iniciado. 4 peças e 2 Postos por lado; ambos os lados podem ser controlados livremente.');
    this.#addHistory('enemy','🧪 Treino iniciado. 4 peças e 2 Postos por lado; ambos os lados podem ser controlados livremente.');
    return this.#ok('Treino iniciado. Controle qualquer lado, teste os Postos e repita turnos livremente.');
  }

  #advanceTrainingRound(){
    if(this.#s.mode!=='training'||this.#s.phase!=='play')return this.#fail('Só é possível avançar rodada no modo Treino.');
    if(this.#s.pendingCombat)return this.#fail('Resolva o Confronto Direto antes de avançar a rodada.');
    if(this.#s.doppelChoice?.player||this.#s.doppelChoice?.enemy)return this.#fail('Resolva a escolha do Doppelgänger antes de avançar a rodada.');
    for(const side of ['player','enemy']){const p=this.#activePiece(side);if(p&&this.#R.defOf(p)?.flying&&this.#solidTerrain(p.coord))return this.#fail('Voador precisa terminar o movimento fora de Árvore ou Pedra antes de avançar a rodada.');}
    this.#s.activation.player=null;this.#s.activation.enemy=null;
    this.#s.round++;this.#tickRoundEffects();this.#s.roundActivations={player:0,enemy:0};
    for(const side of ['player','enemy'])for(const p of this.#pieces(side))p.activated=false;
    this.#processZombieRevives();
    this.#addHistory('player',`🔄 Treino avançou manualmente para a rodada ${this.#s.round}.`);
    this.#addHistory('enemy',`🔄 Treino avançou manualmente para a rodada ${this.#s.round}.`);
    return this.#ok(`Rodada ${this.#s.round} do Treino.`);
  }

  #enemySetup(difficulty='normal',count=4){
    // Dificuldade nunca altera informação disponível para a IA. Aqui ela só muda
    // qualidade de composição/posicionamento inicial — especialmente os Postos.
    const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
    count=Math.max(1,Math.min(8,Math.floor(Number(count)||4)));
    let chosen=[];
    if(difficulty==='easy'){
      chosen=[...this.#R.defs].sort(()=>Math.random()-.5).slice(0,count);
    }else{
      const byType=t=>this.#R.defs.filter(d=>d.type===t),preferred=['R','P','S'];
      for(const t of preferred){if(chosen.length>=count)break;const pool=byType(t).filter(d=>!chosen.some(x=>x.name===d.name));if(pool.length)chosen.push(pick(pool));}
      while(chosen.length<count){const remaining=this.#R.defs.filter(d=>!chosen.some(x=>x.name===d.name));if(!remaining.length)break;const premium=remaining.filter(d=>['Trapaceiro','Bardo','Vidente','Caçador','Druida','Fantasma'].includes(d.name));const joker=remaining.find(d=>d.type==='J');const jokerChance=difficulty==='extreme'?0.50:difficulty==='hard'?0.38:0.30;chosen.push((joker&&Math.random()<jokerChance)?joker:(difficulty==='extreme'&&premium.length?pick(premium):pick(remaining)));}
    }
    const used=new Set([...this.#s.bases.filter(b=>b.owner==='player').map(b=>b.coord),...this.#R.blockedCells]);
    this.#s.pieces.enemy=[];
    for(const d of chosen){
      let c; do{c=this.#R.coord(Math.floor(Math.random()*8),4+Math.floor(Math.random()*4));}while(used.has(c));
      used.add(c);
      this.#s.pieces.enemy.push({id:'e'+this.#s.idSeq++,owner:'enemy',name:d.name,identity:d.name,hp:d.v,coord:c,alive:true,activated:false,original:true,form:null,copied:null,mirrorCooldown:0,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false});
    }
    const validBaseCells=(rows)=>{
      const out=[];for(const y of rows)for(let x=0;x<8;x++){
        const c=this.#R.coord(x,y);if(!used.has(c)&&!this.#isCorner(c))out.push(c);
      }return out;
    };
    let candidates;
    if(difficulty==='easy') candidates=validBaseCells([4,5,6,7]);
    else if(difficulty==='hard'||difficulty==='extreme'){
      candidates=validBaseCells([7]);
      if(candidates.length<2)candidates.push(...validBaseCells([6]).filter(c=>!candidates.includes(c)));
    }else{
      // Normal: prefere última linha, mas às vezes usa a penúltima.
      const back=validBaseCells([7]),penultimate=validBaseCells([6]);
      candidates=[...back,...back,...back,...penultimate];
    }
    const chosenBases=[];
    while(chosenBases.length<2){
      const pool=candidates.filter(c=>!used.has(c)&&!chosenBases.includes(c));
      if(!pool.length){candidates=validBaseCells([4,5,6,7]);continue;}
      let c;
      if((difficulty==='hard'||difficulty==='extreme')&&chosenBases.length){
        c=[...pool].sort((a,b)=>this.#R.man(b,chosenBases[0])-this.#R.man(a,chosenBases[0]))[0];
      }else c=pick(pool);
      chosenBases.push(c);used.add(c);
    }
    chosenBases.forEach((c,i)=>this.#s.bases.push({id:'be'+(i+1),owner:'enemy',coord:c,sabotaged:false}));
  }

  #other(side){return side==='player'?'enemy':'player';}
  #aliveActivationUnits(side){return this.#pieces(side).filter(p=>p.alive).length;}
  #activationLimit(side){if(this.#s.mode==='training')return Infinity;const own=this.#aliveActivationUnits(side),opp=this.#aliveActivationUnits(this.#other(side));return Math.min(own,opp+1);}
  #hasActivationLeft(side){if(this.#s.mode==='training')return true;const used=this.#s.roundActivations?.[side]||0;if(used>=this.#activationLimit(side))return false;return this.#pieces(side).some(p=>p.alive&&!p.activated);}
  #isCorner(c){const q=this.#R.rc(c);return (q.x===0||q.x===7)&&(q.y===0||q.y===7);}
  #baseAt(c){return this.#s.bases.find(b=>b.coord===c)||null;}
  #baseById(id){return this.#s.bases.find(b=>b.id===id)||null;}
  #treeAt(c){return (this.#s.trees||[]).find(t=>t.coord===c)||null;}
  #rockAt(c){return (this.#s.rocks||[]).includes(c);}
  #waterAt(c){return (this.#s.water||[]).includes(c);}
  #swampAt(c){return (this.#s.swamps||[]).includes(c);}
  #moveCost(p,c){return this.#R.defOf(p)?.flying?1:(this.#swampAt(c)?2:1);}
  #treeBlocks(p,c){if(this.#R.defOf(p)?.flying)return false;if(this.#rockAt(c))return true;const t=this.#treeAt(c);if(!t||t.state!=='live')return false;return !(p?.name==='Druida'&&t.state==='live');}
  #solidTerrain(c){return this.#rockAt(c)||this.#treeAt(c)?.state==='live';}
  #damageTerrain(c,n,side,attackerName='Ataque'){const tree=this.#treeAt(c);if(tree?.state==='live'){tree.hp=Math.max(0,(Number(tree.hp)||3)-Math.max(0,Number(n)||0));if(tree.hp<=0){tree.state='dead';tree.hp=0;this.#addHistory(side,`🌳 ${attackerName} destruiu uma árvore e abriu a passagem.`);this.#noteReplay('terrain',side,{terrain:'tree',coord:c,destroyed:true});}else this.#addHistory(side,`🌳 Árvore atingida: ${tree.hp}/3 Vida.`);return true;}if(this.#rockAt(c)){this.#s.rockHp=this.#s.rockHp||{};const hp=Math.max(0,(Number(this.#s.rockHp[c])||3)-Math.max(0,Number(n)||0));this.#s.rockHp[c]=hp;if(hp<=0){this.#s.rocks=this.#s.rocks.filter(x=>x!==c);delete this.#s.rockHp[c];this.#addHistory(side,`🪨 ${attackerName} destruiu uma pedra e abriu a passagem.`);this.#noteReplay('terrain',side,{terrain:'rock',coord:c,destroyed:true});}else this.#addHistory(side,`🪨 Pedra atingida: ${hp}/3 Vida.`);return true;}return false;}
  #isDruidHidden(p){return !!(p?.alive&&p.name==='Druida'&&this.#treeAt(p.coord)?.state==='live');}
  #isUndetectable(p){return !!(p?.alive&&(p.ninjaSmokeRemaining||0)>0);}
  #rawPieceById(side,id){return this.#pieces(side).find(p=>p.id===id)||null;}
  #isGhost(p){return !!p&&(p.identity==='Fantasma'||p.name==='Fantasma')&&!p.possession;}
  #abilityDistance(p,c){return this.#R.man(p.coord,c);}
  #inAbilityRange(p,c,allowSelf=false){const ah=this.#R.defOf(p).ah||0,dist=this.#abilityDistance(p,c);return (allowSelf?dist>=0:dist>0)&&dist<=ah;}
  #isShieldUnit(p){return !!p&&(p.name==='Escudeiro'||(p.name==='Doppelgänger'&&p.copied==='Escudeiro'));}
  #linkedShieldFor(p){if(!p)return null;return this.#pieces(p.owner).find(x=>x.alive&&x.linkedToId===p.id)||null;}
  #clearShieldLinks(p){if(!p)return;if(p.linkedToId)p.linkedToId=null;for(const q of this.#pieces(p.owner))if(q.linkedToId===p.id)q.linkedToId=null;}
  #impactCells(side){const x=this.#s.impact[side];return Array.isArray(x)?x:x?[x]:[];}
  #markImpact(side,c){for(const viewer of ['player','enemy'])if(viewer!==side)this.#s.impact[viewer]=[...new Set([...this.#impactCells(viewer),c])];}
  #canAdvanceCombat(pc){
    if(!pc||!this.#pieceById(pc.winnerSide,pc.winnerId))return false;
    if(pc.protectedAllyId)return !this.#piecesAt(pc.winnerSide,pc.ownCell).some(x=>x.id!==pc.winnerId);
    return !this.#piecesAt(this.#other(pc.winnerSide),pc.deadCell).length;
  }
  #doppelChoiceView(side){const ch=this.#s.doppelChoice[side];if(!ch)return null;const p=this.#pieceById(side,ch.pieceId),blocked=p&&this.#isShieldUnit(p)&&ch.newAbility!=='Escudeiro'&&this.#piecesAt(side,p.coord).length>1;return {...ch,canCopyNew:!blocked,reason:blocked?'Separe as peças antes de trocar a cópia do Escudeiro; desvincule primeiro, se necessário.':''};}
  #noteReplay(type,side,data={}){const e={type,side,round:this.#s.round,...structuredClone(data)},cur=this.#s.replayEvent;if(!cur)this.#s.replayEvent=e;else if(cur.type==='sequence'&&Array.isArray(cur.events))cur.events.push(e);else this.#s.replayEvent={type:'sequence',side,round:this.#s.round,events:[cur,e]};}
  #spottedFor(viewer,p){if(this.#isUndetectable(p))return false;const x=this.#s.spotReveals?.[viewer]?.[p.id];return !!x&&p.alive;}
  #siegeActive(){return this.#s.phase==='play'&&this.#s.bases.length>=4&&this.#s.bases.every(b=>b.sabotaged);}
  #siegeCells(){if(!this.#siegeActive())return [];const out=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(x===0||x===7||y===0||y===7)out.push(this.#R.coord(x,y));return out;}
  #clearSpotOnTurnStart(p){if(!p)return;for(const side of ['player','enemy'])if(this.#s.spotReveals?.[side]?.[p.id])delete this.#s.spotReveals[side][p.id];}
  #hasBaseBonus(side,id){return this.#s.chosenBaseBonuses[side].includes(id);}
  #pieces(side){return this.#s.pieces[side];}
  #pieceById(side,id){return this.#pieces(side).find(p=>p.id===id&&p.alive);}
  #piecesAt(side,c){return this.#pieces(side).filter(p=>p.alive&&p.coord===c);}
  #pieceAt(side,c){const ps=this.#piecesAt(side,c);return ps.find(p=>this.#isShieldUnit(p))||ps[0]||null;}
  #shieldAt(side,c){return this.#piecesAt(side,c).find(p=>this.#isShieldUnit(p))||null;}
  #protectedTarget(side,c){const ps=this.#piecesAt(side,c);if(!ps.length)return null;return ps.find(p=>this.#isShieldUnit(p))||ps[0];}
  #canShareCell(side,p,c){
    if(this.#treeBlocks(p,c)||this.#baseAt(c))return false;
    if(this.#pieceAt(this.#other(side),c))return true;
    const ps=this.#piecesAt(side,c).filter(x=>x.id!==p.id),isLinker=x=>x?.name==='Escudeiro'||(x?.name==='Doppelgänger'&&x?.copied==='Escudeiro');
    const follower=this.#linkedShieldFor(p);if(follower?.alive&&follower.coord===p.coord&&ps.length)return false;
    if(!ps.length)return true;if(ps.length>=2)return false;return isLinker(p)||ps.some(isLinker);
  }
  #corpseAt(c){return this.#s.corpses.find(x=>x.coord===c);}
  #mirrorAt(c,owner){return this.#s.mirrors.find(m=>m.coord===c&&m.owner===owner);}
  #slimeLineageAlive(side,sourceId){return this.#pieces(side).some(p=>(p.alive||p.possessedBy||p.recoveryPending)&&p.summonType==='miniSlime'&&p.slimeLineageId===sourceId);}
  #originalDeaths(side){
    return this.#pieces(side).filter(p=>p.original&&!p.alive&&!p.possessedBy&&!(p.name==='Zumbi'&&!p.zombieFinal)&&(p.name!=='Slime'||!this.#slimeLineageAlive(side,p.id))).length;
  }
  #activation(side){return this.#s.activation[side];}
  #activePiece(side){const a=this.#activation(side);return a?this.#pieceById(side,a.pieceId):null;}
  #addHistory(side,t){
    // O histórico registra acontecimentos relevantes; simples encerramentos de turno ficam fora para reduzir ruído.
    if(/encerrou sua ativa[cç][aã]o/i.test(t))return;
    const a=this.#s.history[side];a.unshift(t);this.#s.history[side]=a.slice(0,20);
  }
  #appendLatestHistory(side,t){const a=this.#s.history[side];if(a.length)a[0]=`${a[0].replace(/\.$/,'')} → ${t}`;else this.#addHistory(side,t);}
  #addIntel(side,t){const a=this.#s.intel[side];a.unshift(t);this.#s.intel[side]=a.slice(0,3);}
  #ok(status='',extra={}){return {ok:true,status,...extra};}
  #fail(status='',extra={}){return {ok:false,status,...extra};}

  #publicPiece(p,viewerSide=p.owner){
    const d=this.#R.defOf(p);const possessedAway=!!p.possessedBy&&viewerSide===p.owner;
    const extraEffects=[...(p.effects||[]).filter(e=>viewerSide===p.owner||e.public!==false)];
    if(p.paranoiaEchoPending&&p.paranoiaEchoKnownFalse&&viewerSide===p.owner)extraEffects.push({id:'paranoia-echo',name:'Eco da Presença Fantasma',icon:'🧠',remaining:1,kind:'debuff',tick:'turn'});
    if((p.ninjaSmokeRemaining||0)>0&&viewerSide===p.owner)extraEffects.push({id:'ninja-smoke',name:'Bomba de Fumaça',icon:'🌫️',remaining:p.ninjaSmokeRemaining,kind:'buff',tick:'turn'});
return {id:p.id,name:p.name,displayName:d.name,icon:d.icon,type:d.type,typeIcon:d.typeIcon||'',hp:p.hp,maxHp:d.v,coord:possessedAway?null:p.coord,alive:possessedAway?false:p.alive,possessedAway,possessing:!!p.possession,activated:p.activated,original:!!p.original,summonType:p.summonType||null,summonerId:viewerSide===p.owner?(p.summonerId||null):null,druidId:viewerSide===p.owner?(p.druidId||null):null,form:p.form||null,copied:p.copied||null,mirrorCooldown:p.mirrorCooldown||0,m:d.m,a:d.a,range:d.range,per:d.per,ah:d.ah||0,diag:!!d.diag,flying:!!d.flying,bonusM:p.bonusM||0,bonusV:p.bonusV||0,bonusA:p.bonusA||0,bonusRange:p.bonusRange||0,bonusAH:p.bonusAH||0,radarAdvanced:!!p.bonusRadarAdvanced,radarExpanded:!!p.bonusRadarExpanded,zombiePending:!!p.zombiePending,zombieTurnsLeft:p.zombieTurnsLeft||0,sureShotCooldown:p.sureShotCooldown||0,sureShotActive:!!p.sureShotActive,pyroCooldown:p.pyroCooldown||0,paranoiaEchoPending:viewerSide===p.owner?!!p.paranoiaEchoPending:false,paranoiaEchoKnownFalse:viewerSide===p.owner?!!p.paranoiaEchoKnownFalse:false,ninjaSmokeCooldown:p.ninjaSmokeCooldown||0,ninjaSmokeRemaining:p.ninjaSmokeRemaining||0,golemArmor:((p.golemArmorExpireAfterTurn||0)>(p.turnsTaken||0)?1:0),golemArmorExpireAfterTurn:p.golemArmorExpireAfterTurn||0,linkedToId:viewerSide===p.owner?(p.linkedToId||null):null,effects:extraEffects.map(e=>({id:e.id||'',name:e.name||'Efeito temporário',icon:e.icon||'⏳',remaining:Math.max(0,Number(e.remaining)||0),kind:e.kind||'neutral',tick:e.tick||'round'}))};
  }

  #getView(side){
    const other=this.#other(side), act=this.#activation(side), visible=[],siegeCells=this.#siegeCells(),siegeSet=new Set(siegeCells);
    for(const e of this.#pieces(other)) if(e.alive&&!this.#isUndetectable(e)&&(this.#s.seer[side].has(e.coord)||this.#spottedFor(side,e)||siegeSet.has(e.coord))) visible.push(this.#publicPiece(e,side));
    const pc=this.#s.pendingCombat;
    const pending=pc&&pc.winnerSide===side?{canChoose:true,canAdvance:this.#canAdvanceCombat(pc)}:null;
    return structuredClone({
      phase:this.#s.phase, round:this.#s.round, turn:this.#s.turn, gameOver:this.#s.gameOver, result:this.#s.result, surrenderedBy:this.#s.surrenderedBy||null,
      ownPieces:this.#pieces(side).map(p=>this.#publicPiece(p,side)), visibleOpponents:visible,
      bases:this.#s.bases.map(b=>({id:b.id,owner:b.owner,coord:b.coord,sabotaged:b.sabotaged})),
      trees:(this.#s.trees||[]).map(t=>({...t})), rocks:[...(this.#s.rocks||[])], rockHp:{...(this.#s.rockHp||{})}, water:[...(this.#s.water||[])], swamps:[...(this.#s.swamps||[])], ownTraps:(this.#s.traps?.[side]||[]).map(t=>({id:t.id,coord:t.coord,kind:t.kind,placerId:t.placerId||null})), ownFalsePresences:(this.#s.falsePresences?.[side]||[]).map(f=>({id:f.id,coord:f.coord,seq:f.seq})),
      chosenBaseBonuses:[...this.#s.chosenBaseBonuses[side]], baseBonusCatalog:this.#R.baseBonuses.map(b=>({...b})),
      ownOriginalDeaths:this.#originalDeaths(side), enemyOriginalDeaths:this.#originalDeaths(other), matchConfig:structuredClone(this.#s.matchConfig||{teamSize:{player:4,enemy:4},lossLimit:{player:3,enemy:3}}), corpses:this.#s.corpses.map(c=>({coord:c.coord})),
      ownMirrors:this.#s.mirrors.filter(m=>m.owner===side).map(m=>({coord:m.coord,mageId:m.mageId||null})), seerArea:[...this.#s.seer[side]], impactCells:[...this.#impactCells(side)], impactCell:this.#impactCells(side).at(-1)||null, combatCells:[...(this.#s.combatMarks?.[side]||[])],
      history:[...this.#s.history[side]], intel:[...this.#s.intel[side]], perceptionHints:(this.#s.perceptionHints[side]||[]).map(h=>({...h})),
      activation:act?{...act}:null, pendingCombat:pending, doppelChoice:this.#doppelChoiceView(side),
      availablePieceIds:this.#pieces(side).filter(p=>p.alive&&(this.#s.mode==='training'||(this.#hasActivationLeft(side)&&!p.activated))).map(p=>p.id),
      roundActivationsUsed:this.#s.mode==='training'?null:(this.#s.roundActivations?.[side]||0), roundActivationLimit:this.#s.mode==='training'?null:this.#activationLimit(side), mode:this.#s.mode,
      siegeActive:siegeCells.length>0,siegeCells
    });
  }

  #validateTurn(side){
    if(this.#s.phase!=='play') return this.#fail('A partida ainda não começou.');
    if(this.#s.gameOver) return this.#fail('A partida já terminou.');
    if(this.#s.pendingCombat) return this.#fail('Há um Confronto Direto aguardando resolução.');
    if(this.#s.doppelChoice?.[side]) return this.#fail('Escolha qual habilidade do Doppelgänger manter.');
    if(this.#s.mode!=='training'&&this.#s.turn!==side) return this.#fail('Não é a vez deste lado.');
    return null;
  }

  #selectPiece(side,id){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const p=this.#pieceById(side,id); if(!p)return this.#fail('Peça indisponível.');
    if(this.#s.mode!=='training'&&!this.#hasActivationLeft(side))return this.#fail('Seu limite de turnos desta rodada já foi atingido.');
    if(this.#s.mode!=='training'&&p.activated)return this.#fail(`${this.#R.defOf(p).name} já agiu nesta rodada.`);
    
    const a=this.#activation(side);
    if(a&&a.committed&&a.pieceId!==id) return this.#fail(`O turno de ${this.#R.defOf(this.#activePiece(side)).name} já foi comprometido.`);
    this.#s.activation[side]={pieceId:id,committed:a?.pieceId===id?!!a.committed:false,movementUsed:a?.pieceId===id?!!a.movementUsed:false,mode:null,moveRemaining:0,stepsTaken:a?.pieceId===id?(a.stepsTaken||0):0,movePath:a?.pieceId===id?[...(a.movePath||[])]:[],lastPerception:a?.pieceId===id?(a.lastPerception??null):null,pyroTargets:[],paranoiaTargets:[],mirrorBlockedCurrentActivation:false};
    return this.#ok(`${this.#R.defOf(p).name} selecionado. Ainda pode trocar enquanto não agir.`);
  }

  #cancelSelection(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side); if(!a)return this.#fail('Nada para cancelar.');
    if(a.committed)return this.#fail('O turno já foi comprometido.');
    this.#s.activation[side]=null; return this.#ok('Seleção cancelada.');
  }

  #cancelMode(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side);if(!a)return this.#fail('Nenhuma peça selecionada.');
    if(a.mode==='move')return this.#stopMove(side);
    a.mode=null;a.moveRemaining=0;a.pyroTargets=[];a.paranoiaTargets=[];a.kamikazeCells=[];a.seerCells=[];return this.#ok('Ação cancelada. A peça continua selecionada.');
  }

  #commit(side){
    const a=this.#activation(side); if(!a||a.committed)return;
    this.#s.perceptionHints[side]=[];
    if(this.#s.seerExpires[side]){this.#s.seer[side].clear();this.#s.seerExpires[side]=false;}
    const p=this.#activePiece(side);
    this.#clearSpotOnTurnStart(p);
    a.committed=true;
    // O Eco só nasce no próximo turno próprio. Em movimento, ele é resolvido
    // no fim do deslocamento para usar a posição final; nas demais ações,
    // aparece logo após o turno ser realmente comprometido.
    if(p&&a.mode!=='move'&&this.#paranoiaEchoReady(p))this.#triggerParanoiaEchoWithoutMove(side,p);
  }

  #startMove(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Selecione uma peça.');
    const d=this.#R.defOf(p); if(p.linkedToId)return this.#fail(`${this.#R.defOf(p).name} está vinculado e não pode se mover sozinho. Use a habilidade para desvincular primeiro.`); if(a.movementUsed)return this.#fail(`${d.name} já usou o movimento.`); if(d.m<=0)return this.#fail(`${d.name} tem M0 e não pode se mover.`);
    a.mode='move';a.moveRemaining=d.m;return this.#ok(`Prévia de movimento: até ${d.m} ${d.m===1?'passo':'passos'}.${d.flying?' Voador ignora o custo extra do Pântano e pode atravessar Árvores/Pedras sem terminar sobre elas.':' Casas de pântano gastam 2 de movimento.'} Ainda pode cancelar sem gastar.`);
  }

  #moveStep(side,to){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p||a.mode!=='move')return this.#fail('Movimento não iniciado.');
    const d=this.#R.defOf(p), cost=this.#moveCost(p,to), solidDest=this.#solidTerrain(to);
    if(a.moveRemaining<=0||!this.#R.neighbors(p.coord,d.diag).includes(to)||!this.#canShareCell(side,p,to)||cost>a.moveRemaining)return this.#fail(cost>1?'Pântano exige 2 de movimento; escolha outra casa ou ganhe mais mobilidade.':'Escolha uma casa válida.');if(d.flying&&solidDest&&a.moveRemaining<=cost)return this.#fail('Unidades voadoras podem atravessar Árvores e Pedras, mas não terminar o movimento sobre elas.');
    this.#commit(side);a.movementUsed=true;a.stepsTaken=(a.stepsTaken||0)+1;
    const from=p.coord,foe=this.#pieceAt(this.#other(side),to),linkedShield=this.#linkedShieldFor(p);
    a.movePath=a.movePath||[];if(!a.movePath.includes(from))a.movePath.push(from);
    p.coord=to;
    const trap=this.#triggerTraps(side,p,to);
    if(!p.alive||p.owner!==side){a.mode=null;a.moveRemaining=0;return this.#finishActivation(side);}
    if(foe&&foe.alive){p.coord=from;return this.#resolveDirect(side,p,foe,from,to);}
    const fake=this.#falsePresenceAt(this.#other(side),to);if(fake){if(linkedShield?.alive&&linkedShield.coord===from)linkedShield.coord=to;return this.#resolveFalsePresenceConfrontation(side,p,fake,from,to);}
    if(linkedShield?.alive&&linkedShield.coord===from)linkedShield.coord=to;
    this.#noteReplay('move',side,{piece:this.#R.defOf(p).name,from,to,linkedShield:linkedShield?.alive&&linkedShield.coord===to?this.#R.defOf(linkedShield).name:null,moveCost:cost});
    this.#checkDoppel(side,p);a.moveRemaining-=cost;
    if(a.moveRemaining<=0)return this.#finishMove(side);
    return this.#ok(`${d.name}: ${a.moveRemaining===1?'resta':'restam'} ${a.moveRemaining} ${a.moveRemaining===1?'ponto de movimento':'pontos de movimento'}.${cost>1?' O pântano consumiu 2.':''}${trap?' Armadilha ativada.':''}`);
  }

  #stopMove(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||a.mode!=='move')return this.#fail('Nenhum movimento em andamento.');if(p&&this.#R.defOf(p)?.flying&&this.#solidTerrain(p.coord))return this.#fail('Unidades voadoras precisam terminar o movimento fora de Árvores e Pedras.');
    return this.#finishMove(side);
  }

  #finishMove(side){
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Sem peça ativa.');
    if(!a.committed){a.mode=null;a.moveRemaining=0;return this.#ok('Movimento cancelado sem gastar o turno.');}
    a.mode=null;a.moveRemaining=0;
    const other=this.#other(side),d=this.#R.defOf(p),per=Math.max(0,d.per||0);
    const orth=this.#R.perceptionCells(p.coord,per,false);
    const traversed=new Set(a.movePath||[]),orthPossible=orth.filter(c=>!traversed.has(c));
    const visibleEnemyAt=c=>{const e=this.#pieceAt(other,c);return (e&&!this.#isDruidHidden(e)&&!this.#isUndetectable(e))||this.#mirrorAt(c,other)||this.#falsePresenceAt(other,c)};
    const orthHits=orth.filter(visibleEnemyAt);
    const diagOnly=this.#R.perceptionCells(p.coord,per,true).filter(c=>!orth.includes(c)),diagPossible=diagOnly.filter(c=>!traversed.has(c));
    const diagHits=diagOnly.filter(visibleEnemyAt);
    const expanded=!!p.bonusRadarExpanded,advanced=!!p.bonusRadarAdvanced;
    let detected=per>0&&(orthHits.length>0||(expanded&&diagHits.length>0));
    const echo=this.#paranoiaEchoReady(p)&&per>0,echoKnown=!!(echo&&p.paranoiaEchoKnownFalse);if(echo){p.paranoiaEchoPending=false;p.paranoiaEchoReadyTurn=0;p.paranoiaEchoKnownFalse=false;detected=true;}
    a.lastPerception=detected;
    const hintable=c=>!this.#solidTerrain(c)&&!this.#pieceAt(side,c)&&!this.#baseAt(c);
    const hints=[];let echoCell=null;
    if(per>0){
      if(advanced&&orthHits.length){for(const c of orthHits)hints.push({coord:c,kind:'exact'});}
      else if(orthHits.length){for(const c of orthPossible.filter(hintable))hints.push({coord:c,kind:'orth'});}
      if(expanded&&diagHits.length){for(const c of diagPossible.filter(hintable))hints.push({coord:c,kind:'diag'});}
      if(echo){
        const pool=orthPossible.filter(hintable);echoCell=pool[Math.floor(this.#random()*Math.max(1,pool.length))]||null;
        if(echoCell){if(advanced)hints.push({coord:echoCell,kind:'exact',knownFalse:echoKnown});else for(const c of orthPossible.filter(hintable))hints.push({coord:c,kind:'orth',knownFalse:echoKnown});}
      }
    }
    this.#s.perceptionHints[side]=hints.filter((h,i,a)=>a.findIndex(x=>x.coord===h.coord&&x.kind===h.kind&&!!x.knownFalse===!!h.knownFalse)===i);
    let msg;
    if(per<=0)msg='◌ PER0: esta unidade não possui percepção.';
    else if(echoKnown)msg=advanced?'🧠 Eco da Presença Fantasma: esta detecção é falsa e conhecida.':'🧠 Eco da Presença Fantasma: presença falsa conhecida no alcance ortogonal.';
    else if(echo)msg=advanced&&echoCell?`📡 presença ortogonal em ${echoCell}`:'⚠️ presença inimiga no alcance ortogonal.';
    else if(advanced&&orthHits.length){msg=`📡 presença ortogonal em ${orthHits.join(', ')}`;if(expanded&&diagHits.length)msg+=' + 📶 presença diagonal no alcance';}
    else if(expanded){const parts=[];if(orthHits.length)parts.push('presença ortogonal no alcance');if(diagHits.length)parts.push('presença diagonal no alcance');msg=parts.length?`📶 ${parts.join(' e ')}`:`✓ nenhuma presença no alcance PER${per}`;}
    else msg=orthHits.length?'⚠️ presença inimiga no alcance ortogonal.':`✓ nenhuma presença inimiga no alcance PER${per}.`;
    this.#addIntel(side,`${d.icon} ${d.name}: ${msg}`);if(echoKnown&&orthHits.length)this.#addIntel(side,'🧠 Eco da Presença Fantasma também disparou neste turno; a indicação extra é falsa e conhecida.');
    this.#noteReplay('perception',side,{piece:d.name,coord:p.coord,detected:!!detected,hints:(this.#s.perceptionHints[side]||[]).map(h=>({...h})),knownFalse:echoKnown,text:msg});
    return this.#ok('Movimento encerrado. Agora ataque, use habilidade, sabote um Posto ou encerre.');
  }

  #startAttack(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Selecione uma peça.');
    if(a.mode==='move'&&a.committed)return this.#fail('Primeiro termine ou pare o movimento.');
    const d=this.#R.defOf(p); if(d.a<=0&&!this.#isGhost(p))return this.#fail(`${d.name} tem ATQ0 e não possui ataque normal.`);
    a.moveRemaining=0;
    a.mode='attack';return this.#ok(this.#isGhost(p)?'👻 Escolha uma casa em ALC para tentar possuir um inimigo.':'Escolha uma casa para atacar.');
  }

  #attack(side,to){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p||a.mode!=='attack')return this.#fail('Ataque não iniciado.');
    if(!this.#R.attackCells(p).includes(to))return this.#fail('Casa fora do alcance.');
    if(this.#baseAt(to))return this.#fail('Postos de Operação não podem ser atacados; precisam ser sabotados.');
    this.#commit(side);this.#markImpact(side,to);this.#noteReplay('attack',side,{piece:this.#R.defOf(p).name,from:p.coord,cells:[to]});
    if(this.#isGhost(p)){
      const target=this.#protectedTarget(this.#other(side),to);
      if(target&&this.#possess(side,p,target)){this.#addHistory(side,`👻 Fantasma possuiu ${this.#R.defOf(target).name}.`);this.#addHistory(this.#other(side),'👻 Uma de suas peças foi possuída; sua localização foi perdida.');}
      else this.#addHistory(side,'👻 A tentativa de possessão não se completou.');
      a.mode=null;return this.#finishActivation(side);
    }
    this.#hitAttack(side,p,to);a.mode=null;return this.#finishActivation(side);
  }

  #selectPyroTarget(side,to){
    const bad=this.#validateTurn(side);if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='pyro'||this.#effectiveAbility(p)!=='pyroBurst')return this.#fail('Ataque do Piromante não iniciado.');
    if(!this.#inAbilityRange(p,to))return this.#fail(`O Piromante só pode escolher casas dentro do Alc. Hab. ${this.#R.defOf(p).ah}.`);
    if(this.#baseAt(to))return this.#fail('O Piromante não pode atacar Postos de Operação.');
    a.pyroTargets=Array.isArray(a.pyroTargets)?a.pyroTargets:[];
    if(a.pyroTargets.includes(to)){a.pyroTargets=a.pyroTargets.filter(c=>c!==to);return this.#ok('Casa removida da rajada.',{pyroTargets:[...a.pyroTargets]});}
    if(a.pyroTargets.length>=2)return this.#fail('O Piromante pode escolher no máximo 2 casas.');
    a.pyroTargets.push(to);return this.#ok(`${a.pyroTargets.length}/2 ${a.pyroTargets.length===1?'casa escolhida':'casas escolhidas'}.`,{pyroTargets:[...a.pyroTargets]});
  }

  #confirmPyroAttack(side){
    const bad=this.#validateTurn(side);if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='pyro'||this.#effectiveAbility(p)!=='pyroBurst')return this.#fail('Ataque do Piromante não iniciado.');
    const targets=[...new Set(a.pyroTargets||[])];if(targets.length!==2)return this.#fail('Escolha exatamente 2 casas antes de confirmar.');
    this.#commit(side);p.pyroCooldown=2;a.mode=null;a.pyroTargets=[];this.#noteReplay('ability',side,{piece:'Piromante',ability:'Rajada Dupla',from:p.coord,cells:[...targets],text:`Ataque de habilidade em ${targets.length} casa${targets.length===1?'':'s'}.`});
    this.#addHistory(side,`🔥 Piromante usou Rajada Dupla em ${targets.length} casa${targets.length===1?'':'s'}.`);
    for(const c of targets)this.#hitAttack(side,p,c);
    return this.#finishActivation(side);
  }

  #startAbility(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Selecione uma peça.');
    if(a.mode==='move'&&a.committed)return this.#fail('Primeiro termine o movimento.');
    const ab=this.#effectiveAbility(p),ah=this.#R.defOf(p).ah||0;
    if(ab==='sureShot'){if((p.sureShotCooldown||0)>0)return this.#fail(`🏹 Tiro Certeiro em recarga por mais ${p.sureShotCooldown} turno.`);a.mode='sureShotConfirm';return this.#ok('🏹 Confira a área marcada: o Tiro Certeiro dobrará o ALC do Arqueiro neste turno. Confirme para ativar.',{ability:'sureShot',confirm:true,cells:this.#sureShotPreviewCells(p)});}
    if(ab==='pyroBurst'){if((p.pyroCooldown||0)>0)return this.#fail(`🔥 Rajada Dupla em recarga por mais ${p.pyroCooldown} turno${p.pyroCooldown===1?'':'s'}.`);a.mode='pyro';a.pyroTargets=[];return this.#ok(`🔥 Escolha 2 casas diferentes dentro do Alc. Hab. ${ah}. A confirmação aparecerá depois da segunda escolha.`,{ability:'pyroBurst'});}
    if(ab==='phantomPresence'){a.mode='paranoiaPresence';a.paranoiaTargets=[];return this.#ok(`🧠 Escolha 2 casas dentro do Alc. Hab. ${ah} para criar Presenças Fantasmas. Você verá as presenças; o inimigo não.`,{ability:'phantomPresence'});}
    if(ab==='absorbRock'){const legal=this.#R.neighbors(p.coord,false).filter(c=>this.#rockAt(c));if(!legal.length)return this.#fail('🗿 Não há nenhuma pedra adjacente para consumir.');a.mode='absorbRock';return this.#ok('🗿 Escolha uma pedra adjacente para consumir.',{ability:'absorbRock'});}
    if(ab==='smoke'){if((p.ninjaSmokeCooldown||0)>0)return this.#fail(`🌫️ Bomba de Fumaça em recarga por mais ${p.ninjaSmokeCooldown} turno${p.ninjaSmokeCooldown===1?'':'s'}.`);this.#commit(side);p.ninjaSmokeRemaining=1;p.ninjaSmokeCooldown=3;this.#addHistory(side,'🌫️ Ninja lançou Bomba de Fumaça e ficará indetectável até o fim do próximo turno próprio.');this.#noteReplay('ability',side,{piece:this.#R.defOf(p).name,ability:'Bomba de Fumaça',coord:p.coord,text:'Indetectável até o fim do próximo turno próprio.'});const done=this.#finishActivation(side);return {...done,status:'🌫️ Bomba de Fumaça ativa: esta unidade não pode ser detectada até o fim do próximo turno próprio.'};}
    if(ab==='kamikaze'){a.mode='kamikaze';const cells=this.#R.blastCells(p.coord,ah||1);a.kamikazeCells=[...cells];return this.#ok(`💣 Autodestruição pronta. Alc. Hab. ${ah||1} atinge ${ah===1?'o primeiro anel':'os '+(ah||1)+' anéis'} ao redor. Confirme para explodir.`,{ability:'kamikaze',blastCells:cells});}
    if(ab==='seer'){a.mode='seer';a.seerCells=[p.coord,...this.#R.abilityCells(p)];return this.#ok(`👁️ Escolha 2 casas ligadas, ambas dentro do Alc. Hab. ${ah}.`,{ability:'seer',cells:[...a.seerCells]});}
    if(ab==='shieldLink'){const actor=this.#R.defOf(p).name;if(p.linkedToId){a.mode='shieldUnlink';return this.#ok(`🛡️ ${actor} está vinculado. Confirme para desvincular e gastar este turno.`,{ability:'shieldUnlink',confirm:true});}const ah=this.#R.defOf(p).ah||0,targets=this.#pieces(side).filter(x=>x.id!==p.id&&x.alive&&this.#R.man(p.coord,x.coord)<=ah&&(x.coord===p.coord||this.#piecesAt(side,x.coord).length<2));if(!targets.length)return this.#fail(`Nenhum aliado disponível dentro do Alc. Hab. ${ah}.`);a.mode='shieldLink';return this.#ok(`🛡️ Escolha um aliado dentro do Alc. Hab. ${ah}. Alc. Hab. 0 alcança a própria casa.`,{ability:'shieldLink'});}
    if(ab==='raise'){
      const has=this.#pieces(side).some(x=>x.alive&&x.summonType==='skeleton'&&x.summonerId===p.id);if(has)return this.#fail('Este Necromante já controla um Esqueleto vivo.');
      const legal=this.#s.corpses.filter(x=>this.#inAbilityRange(p,x.coord)&&!this.#pieceAt(side,x.coord));
      a.mode='raise';return this.#ok(legal.length?`☠️ Escolha um cadáver dentro do Alc. Hab. ${ah}.`:`☠️ Alc. Hab. ${ah} marcado. Nenhum cadáver válido no alcance no momento.`,{ability:'raise'});
    }
    if(ab==='mirror'){a.mode='mirror';return this.#ok(`🪞 Escolha uma casa dentro do Alc. Hab. ${ah}. Diagonais entram naturalmente pelo custo de distância.`,{ability:'mirror'});}
    if(ab==='awaken'){const legal=(this.#s.trees||[]).filter(t=>t.state==='live'&&this.#inAbilityRange(p,t.coord)&&!this.#piecesAt(side,t.coord).length);a.mode='awaken';return this.#ok(legal.length?`🌿 Escolha uma árvore viva dentro do Alc. Hab. ${ah} para criar Galho-Vivo.`:`🌿 Alc. Hab. ${ah} marcado. Nenhuma árvore viva válida no alcance no momento.`,{ability:'awaken'});}
    if(ab==='spotTrap'){a.mode='spotTrap';return this.#ok(`🦉 Escolha uma casa dentro do Alc. Hab. ${ah} para colocar uma armadilha de revelação. Máximo 2.`,{ability:'spotTrap'});}
    if(ab==='damageTrap'){a.mode='damageTrap';return this.#ok(`🕳️ Escolha uma casa dentro do Alc. Hab. ${ah} para colocar a armadilha de dano.`,{ability:'damageTrap'});}
    if(ab==='bard'){a.mode='bard';return this.#ok(`🎵 Escolha 1 aliado dentro do Alc. Hab. ${ah}.`,{ability:'bard'});}
    if(p.name==='Doppelgänger')return this.#fail(p.copied?`A habilidade copiada de ${p.copied} ainda não possui efeito ativo compatível.`:'Doppelgänger ainda não copiou habilidade.');
    return this.#fail(`${this.#R.defOf(p).name} não possui habilidade ativa.`);
  }

  #effectiveAbility(p){
    const name=p.name==='Doppelgänger'?p.copied:p.name;
    if(name==='Arqueiro')return'sureShot';if(name==='Piromante')return'pyroBurst';if(name==='Paranoia')return'phantomPresence';if(name==='Ninja')return'smoke';if(name==='Kamikaze')return'kamikaze';if(name==='Golem')return'absorbRock';if(name==='Escudeiro')return'shieldLink';if(name==='Vidente')return'seer';if(name==='Necromante')return'raise';if(name==='Mago do Espelho')return'mirror';if(name==='Druida')return'awaken';if(name==='Sentinela')return'spotTrap';if(name==='Caçador')return'damageTrap';if(name==='Bardo')return'bard';return null;
  }


  #sureShotPreviewCells(p){const d=this.#R.defOf(p),range=Math.max(0,(d.range||0)*2);const out=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=this.#R.coord(x,y);if(c!==p.coord&&this.#R.man(p.coord,c)<=range)out.push(c);}return out;}
  #confirmSureShot(side){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='sureShotConfirm'||this.#effectiveAbility(p)!=='sureShot')return this.#fail('Tiro Certeiro não está aguardando confirmação.');
    if((p.sureShotCooldown||0)>0)return this.#fail('Tiro Certeiro está em recarga.');
    this.#commit(side);p.sureShotActive=true;p.sureShotCooldown=2;a.mode=null;this.#addHistory(side,'🏹 Arqueiro ativou Tiro Certeiro: Alcance de Ataque dobrado neste turno.');this.#noteReplay('ability',side,{piece:'Arqueiro',ability:'Tiro Certeiro',coord:p.coord,cells:this.#R.attackCells(p),text:'Alcance de Ataque dobrado neste turno.'});return this.#ok('🏹 Tiro Certeiro ativo. Agora escolha Atacar para usar o alcance ampliado.',{ability:'sureShot'});
  }
  #selectParanoiaTarget(side,to){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='paranoiaPresence'||this.#effectiveAbility(p)!=='phantomPresence')return this.#fail('Presença Fantasma não iniciada.');
    if(!this.#inAbilityRange(p,to,true))return this.#fail(`Escolha casas dentro do Alc. Hab. ${this.#R.defOf(p).ah}.`);
    if(this.#solidTerrain(to)||this.#baseAt(to))return this.#fail('Presenças Fantasmas não podem ser criadas sobre Árvores, Pedras ou Postos.');
    a.paranoiaTargets=Array.isArray(a.paranoiaTargets)?a.paranoiaTargets:[];
    if(a.paranoiaTargets.includes(to)){a.paranoiaTargets=a.paranoiaTargets.filter(c=>c!==to);return this.#ok('Casa removida.',{paranoiaTargets:[...a.paranoiaTargets]});}
    if(a.paranoiaTargets.length>=2)return this.#fail('Escolha no máximo 2 casas.');
    a.paranoiaTargets.push(to);return this.#ok(`${a.paranoiaTargets.length}/2 casas escolhidas.`,{paranoiaTargets:[...a.paranoiaTargets]});
  }
  #confirmParanoia(side){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='paranoiaPresence'||this.#effectiveAbility(p)!=='phantomPresence')return this.#fail('Presença Fantasma não iniciada.');
    const targets=[...new Set(a.paranoiaTargets||[])];if(targets.length!==2)return this.#fail('Escolha exatamente 2 casas antes de confirmar.');
    this.#commit(side);for(const c of targets)this.#addFalsePresence(side,p,c);a.mode=null;a.paranoiaTargets=[];this.#addHistory(side,'🧠 Paranoia criou 2 Presenças Fantasmas invisíveis ao adversário.');this.#noteReplay('ability',side,{piece:'Paranoia',ability:'Presença Fantasma',coord:p.coord,cells:[...targets],text:'Duas presenças falsas foram criadas.'});return this.#finishActivation(side);
  }


  #confirmKamikaze(side){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='kamikaze'||this.#effectiveAbility(p)!=='kamikaze')return this.#fail('Autodestruição não iniciada.');
    const ah=this.#R.defOf(p).ah||1,cells=this.#R.blastCells(p.coord,ah);this.#commit(side);a.mode=null;a.kamikazeCells=[];this.#noteReplay('ability',side,{piece:this.#R.defOf(p).name,ability:'Autodestruição',coord:p.coord,cells:[...cells],text:`Explosão em ${ah} anel${ah===1?'':'éis'} de alcance.`});this.#addHistory(side,'💣 Kamikaze confirmou a Autodestruição.');this.#kill(p);return this.#finishActivation(side);
  }

  #useSeer(side,cells){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='seer')return this.#fail('Visão não iniciada.');
    if(!Array.isArray(cells)||cells.length!==2||new Set(cells).size!==2)return this.#fail('Selecione 2 casas ligadas.');
    const main=cells[0],second=cells[1],legal=new Set(a.seerCells?.length?a.seerCells:[p.coord,...this.#R.abilityCells(p)]);if(!legal.has(main)||!legal.has(second))return this.#fail(`As duas casas precisam estar dentro do Alc. Hab. ${this.#R.defOf(p).ah}.`);if(!this.#R.neighbors(main,false).includes(second))return this.#fail('A segunda casa precisa estar ligada por lado à primeira.');
    this.#commit(side);this.#s.seer[side]=new Set(cells);const seen=this.#pieces(this.#other(side)).filter(e=>e.alive&&!this.#isUndetectable(e)&&this.#s.seer[side].has(e.coord)).length;
    this.#addIntel(side,`👁️ Área do Vidente: ${seen} ${seen===1?'presença detectada':'presenças detectadas'} nas 2 casas.`);this.#addHistory(side,'👁️ Vidente ativou visão em 2 casas ligadas.');this.#noteReplay('seer',side,{piece:this.#R.defOf(p).name,cells:[...cells],seen});this.#s.seerExpires[side]=true;a.mode=null;return this.#finishActivation(side);
  }

  #shieldLink(side,targetId=null){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||this.#effectiveAbility(p)!=='shieldLink'||!['shieldLink','shieldUnlink'].includes(a.mode))return this.#fail('Vínculo não iniciado.');
    if(a.mode==='shieldUnlink'){if(!p.linkedToId)return this.#fail('Escudeiro não está vinculado.');const target=this.#rawPieceById(side,p.linkedToId),name=target?this.#R.defOf(target).name:'aliado';this.#commit(side);p.linkedToId=null;this.#addHistory(side,`🛡️ ${this.#R.defOf(p).name} se desvinculou de ${name}.`);this.#noteReplay('ability',side,{piece:this.#R.defOf(p).name,ability:'Desvincular',coord:p.coord,text:`Escudeiro se desvinculou de ${name}.`});a.mode=null;return this.#finishActivation(side);}
    const target=this.#pieceById(side,targetId),ah=this.#R.defOf(p).ah||0;if(!target||target.id===p.id||this.#R.man(p.coord,target.coord)>ah)return this.#fail(`Escolha um aliado vivo dentro do Alc. Hab. ${ah}.`);if(target.coord!==p.coord&&this.#piecesAt(side,target.coord).length>=2)return this.#fail('A casa do aliado já está lotada.');this.#commit(side);const from=p.coord;p.coord=target.coord;p.linkedToId=target.id;this.#addHistory(side,`🛡️ ${this.#R.defOf(p).name} se vinculou a ${this.#R.defOf(target).name} e passou a acompanhá-lo.`);this.#noteReplay('ability',side,{piece:this.#R.defOf(p).name,ability:'Vincular',coord:p.coord,from,target:this.#R.defOf(target).name,text:`Vinculado a ${this.#R.defOf(target).name}.`});a.mode=null;return this.#finishActivation(side);
  }

  #raiseAt(side,c){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='raise')return this.#fail('Necromancia não iniciada.');
    if(!this.#inAbilityRange(p,c)||!this.#corpseAt(c)||this.#pieceAt(side,c)||this.#solidTerrain(c))return this.#fail('Não foi possível usar esse cadáver.');
    this.#commit(side);const corpse=this.#corpseAt(c);this.#s.corpses=this.#s.corpses.filter(x=>x!==corpse);
    const summon={id:(side==='player'?'p':'e')+this.#s.idSeq++,owner:side,name:'Esqueleto',hp:1,coord:c,alive:true,activated:true,original:false,summonType:'skeleton',summonerId:p.id,form:null,copied:null,mirrorCooldown:0,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false};
    this.#pieces(side).push(summon);const hostile=this.#pieceAt(this.#other(side),c);if(hostile)this.#resolveSpawnConflict(side,summon,hostile,c);else this.#addHistory(side,`💀 ${this.#R.defOf(p).name} ergueu um Esqueleto.`);a.mode=null;return this.#finishActivation(side);
  }

  // Regra geral para unidades criadas em casa ocupada:
  // aliado bloqueia a criação; inimigo provoca Confronto Direto imediato.
  // Como a unidade criada não possui casa anterior para ser repelida, empate ou defensor sobrevivente desfaz a criação.
  #resolveSpawnConflict(side,summon,def,c){
    if(!summon?.alive||!def?.alive)return;
    const other=this.#other(side),sName=this.#R.defOf(summon).name,dName=this.#R.defOf(def).name,r=this.#R.directWinner(summon,def);
    if(r==='tie'){
      summon.alive=false;
      this.#addHistory(side,`💀 ${sName} surgiu sobre ${dName} → Confronto empatou e a criação foi desfeita.`);
      this.#addHistory(other,`🛡️ ${sName} inimigo surgiu sobre seu ${dName} → empate; seu defensor impediu a criação.`);
      return;
    }
    if(r==='att'){
      const res=this.#damage(def,1);this.#resolveSlimeSplits();
      if(res.dead){
        this.#addHistory(side,`💀 ${sName} surgiu sobre ${dName} → venceu o Confronto e eliminou o defensor.`);
        this.#addHistory(other,`☠️ ${sName} inimigo surgiu sobre seu ${dName} → seu defensor foi eliminado.`);
      }else{
        summon.alive=false;
        const result=res.transform?`${dName} sofreu 1, virou Golem de Lava e impediu a criação.`:`${dName} sofreu 1, sobreviveu e impediu a criação.`;
        this.#addHistory(side,`💀 ${sName} surgiu sobre ${dName} → ${result}`);
        this.#addHistory(other,`🛡️ ${sName} inimigo surgiu sobre seu ${dName} → ${result}`);
      }
      return;
    }
    const res=this.#damage(summon,1);if(!res.dead)summon.alive=false;
    this.#addHistory(side,`💀 ${sName} surgiu sobre ${dName} → perdeu o Confronto e foi destruído.`);
    this.#addHistory(other,`🛡️ ${sName} inimigo surgiu sobre seu ${dName} → seu defensor venceu e destruiu a criação.`);
  }

  #placeMirror(side,c){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='mirror')return this.#fail('Espelho não iniciado.');
    if(!this.#inAbilityRange(p,c)||this.#solidTerrain(c)||this.#pieceAt(side,c)||this.#mirrorAt(c,side)||this.#baseAt(c))return this.#fail('Casa inválida para o Espelho.');
    this.#commit(side);this.#s.mirrors=this.#s.mirrors.filter(m=>!(m.owner===side&&m.mageId===p.id));this.#s.mirrors.push({owner:side,coord:c,mageId:p.id});
    this.#addHistory(side,'🪞 Mago do Espelho criou um Espelho invisível para o adversário.');this.#addIntel(side,'🪞 Seu Espelho gera falsa presença e reflete o primeiro ataque que acertá-lo.');a.mode=null;return this.#finishActivation(side);
  }

  #awakenTree(side,c){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='awaken')return this.#fail('Despertar não iniciado.');
    const tree=this.#treeAt(c);if(!tree||tree.state!=='live'||!this.#inAbilityRange(p,c)||this.#pieceAt(side,c))return this.#fail('Árvore inválida para despertar.');
    const existing=this.#pieces(side).find(x=>x.alive&&x.summonType==='livingBranch'&&x.druidId===p.id);if(existing)return this.#fail('Este Druida já controla um Galho-Vivo.');
    this.#commit(side);this.#s.trees=this.#s.trees.filter(t=>t!==tree);const summon={id:(side==='player'?'p':'e')+this.#s.idSeq++,owner:side,name:'Galho-Vivo',hp:1,coord:c,alive:true,activated:true,original:false,summonType:'livingBranch',druidId:p.id,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false};this.#pieces(side).push(summon);const hostile=this.#pieceAt(this.#other(side),c);if(hostile)this.#resolveSpawnConflict(side,summon,hostile,c);else this.#addHistory(side,'🌿 Druida deu vida a uma árvore: Galho-Vivo despertou.');a.mode=null;return this.#finishActivation(side);
  }
  #placeTrap(side,c){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||!['spotTrap','damageTrap'].includes(a.mode))return this.#fail('Armadilha não iniciada.');
    if(!this.#inAbilityRange(p,c,true)||this.#solidTerrain(c)||this.#baseAt(c))return this.#fail('Casa inválida para a armadilha.');
    const kind=a.mode==='spotTrap'?'spot':'damage',limit=kind==='spot'?2:1;this.#commit(side);let arr=this.#s.traps[side];arr=arr.filter(t=>!(t.placerId===p.id&&t.coord===c));const owned=arr.filter(t=>t.placerId===p.id&&t.kind===kind).sort((x,y)=>x.seq-y.seq);while(owned.length>=limit){const old=owned.shift();arr=arr.filter(t=>t.id!==old.id);}arr.push({id:'t'+this.#s.idSeq++,owner:side,placerId:p.id,kind,coord:c,seq:this.#s.idSeq});this.#s.traps[side]=arr;this.#addHistory(side,kind==='spot'?'🦉 Sentinela preparou uma armadilha de revelação oculta.':'🕳️ Caçador preparou uma armadilha de dano oculta.');a.mode=null;return this.#finishActivation(side);
  }
  #absorbRock(side,c){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='absorbRock'||this.#effectiveAbility(p)!=='absorbRock')return this.#fail('Absorção de rocha não iniciada.');
    if(!this.#R.neighbors(p.coord,false).includes(c)||!this.#rockAt(c))return this.#fail('Escolha uma pedra adjacente.');
    this.#commit(side);this.#s.rocks=this.#s.rocks.filter(x=>x!==c);if(this.#s.rockHp)delete this.#s.rockHp[c];if(p.form==='lava'){p.bonusM=(p.bonusM||0)+1;this.#addHistory(side,'🌋 Golem de Lava consumiu uma pedra e recebeu +1 M permanente.');this.#noteReplay('ability',side,{piece:'Golem de Lava',ability:'Absorver Rocha',coord:c,text:'+1 Movimento permanente.'});}else{p.golemArmorExpireAfterTurn=(p.turnsTaken||0)+2;this.#addHistory(side,'🛡️ Golem consumiu uma pedra e recebeu 1 de Armadura até o fim do próximo turno próprio.');this.#noteReplay('ability',side,{piece:'Golem',ability:'Absorver Rocha',coord:c,text:'1 de Armadura até o fim do próximo turno próprio.'});}a.mode=null;return this.#finishActivation(side);
  }

  #bardBuff(side,targetId,stat){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='bard')return this.#fail('Inspiração não iniciada.');const target=this.#pieceById(side,targetId);if(!target||target.id===p.id)return this.#fail('Escolha outro aliado vivo.');if(this.#R.man(p.coord,target.coord)>this.#R.defOf(p).ah)return this.#fail(`Aliado fora do Alc. Hab. ${this.#R.defOf(p).ah}.`);const map={attack:['ATQ','a'],range:['ALC','range'],abilityRange:['Alc. Hab.','ah'],move:['M','m'],life:['Vida','v']};if(!map[stat])return this.#fail('Bônus inválido.');
    this.#commit(side);this.#clearBardEffects(p.id,side);const [label,key]=map[stat],mods={[key]:1};target.effects=target.effects||[];target.effects.push({id:`bard-${p.id}`,name:`Inspiração +1 ${label}`,icon:'🎵',kind:'buff',public:true,sourceBardId:p.id,expireAfterSourceTurn:(p.turnsTaken||0)+2,modifiers:mods,remaining:1,tick:'bardTurn',tempLife:stat==='life'?1:0});if(stat==='life')target.hp+=1;this.#addHistory(side,`🎵 Bardo inspirou ${this.#R.defOf(target).name}: +1 ${label} até o fim do próximo turno do Bardo.`);a.mode=null;return this.#finishActivation(side);
  }
  #falsePresenceAt(owner,c){return (this.#s.falsePresences?.[owner]||[]).find(f=>f.coord===c)||null;}
  #addFalsePresence(side,source,c){
    this.#s.falsePresences=this.#s.falsePresences||{player:[],enemy:[]};let arr=this.#s.falsePresences[side]||[];arr=arr.filter(f=>!(f.sourceId===source.id&&f.coord===c));const owned=arr.filter(f=>f.sourceId===source.id).sort((a,b)=>a.seq-b.seq);while(owned.length>=2){const old=owned.shift();arr=arr.filter(f=>f.id!==old.id);}arr.push({id:'fp'+this.#s.idSeq++,owner:side,sourceId:source.id,coord:c,seq:this.#s.idSeq++});this.#s.falsePresences[side]=arr;
  }
  #removeFalsePresence(owner,f){if(!f)return;this.#s.falsePresences[owner]=(this.#s.falsePresences?.[owner]||[]).filter(x=>x.id!==f.id);}
  #paranoiaEchoReady(p){return !!(p?.paranoiaEchoPending&&Number(p.turnsTaken||0)>=Number(p.paranoiaEchoReadyTurn||0));}
  #markParanoiaEcho(p,knownFalse=false){if(p?.alive){p.paranoiaEchoPending=true;p.paranoiaEchoKnownFalse=!!knownFalse;p.paranoiaEchoReadyTurn=(p.turnsTaken||0)+1;}}
  #resolveFalsePresenceConfrontation(side,p,fake,from,to){
    const owner=fake.owner;this.#removeFalsePresence(owner,fake);this.#markParanoiaEcho(p,true);const a=this.#activation(side);if(a){a.mode=null;a.moveRemaining=0;}for(const s of ['player','enemy'])this.#s.combatMarks[s]=[...new Set([...(this.#s.combatMarks[s]||[]),to])];this.#s.combatHold[side]=true;this.#noteReplay('combat',side,{coord:to,attacker:this.#R.defOf(p).name,defender:'Presença Fantasma',falsePresence:true});this.#addHistory(side,`🧠 ${this.#R.defOf(p).name} entrou em Confronto Direto com uma Presença Fantasma. Ela desapareceu; no próximo turno desta peça haverá uma detecção falsa conhecida.`);this.#addHistory(owner,'🧠 Uma de suas Presenças Fantasmas foi encontrada em Confronto Direto.');return this.#finishActivation(side);
  }
  #triggerParanoiaEchoWithoutMove(side,p){
    if(!this.#paranoiaEchoReady(p))return;
    const per=Math.max(0,this.#R.defOf(p).per||0),knownFalse=!!p.paranoiaEchoKnownFalse;
    p.paranoiaEchoPending=false;p.paranoiaEchoReadyTurn=0;p.paranoiaEchoKnownFalse=false;
    const a=this.#activation(side),orth=this.#R.perceptionCells(p.coord,per,false),pool=orth.filter(c=>!this.#solidTerrain(c)&&!this.#pieceAt(side,c)&&!this.#baseAt(c));
    const advanced=!!p.bonusRadarAdvanced,cell=pool[Math.floor(this.#random()*Math.max(1,pool.length))];
    if(cell){this.#s.perceptionHints[side]=advanced?[{coord:cell,kind:'exact',knownFalse}]:pool.map(c=>({coord:c,kind:'orth',knownFalse}));if(a)a.lastPerception=true;}
    const text=knownFalse?'Eco da Presença Fantasma: detecção falsa conhecida.':(advanced&&cell?`presença ortogonal em ${cell}`:'presença inimiga no alcance ortogonal.');
    this.#addIntel(side,knownFalse?'🧠 Eco da Presença Fantasma: esta detecção é falsa e conhecida.':`${this.#R.defOf(p).icon} ${this.#R.defOf(p).name}: ${advanced&&cell?'📡 '+text:'⚠️ '+text}`);
    this.#noteReplay('perception',side,{piece:this.#R.defOf(p).name,coord:p.coord,detected:true,hints:(this.#s.perceptionHints[side]||[]).map(h=>({...h})),knownFalse,text});
  }
  #triggerTraps(moverSide,p,to){
    const enemy=this.#other(moverSide),hits=(this.#s.traps?.[enemy]||[]).filter(t=>t.coord===to);if(!hits.length)return false;let any=false;
    for(const t of hits){if(t.kind==='spot'&&this.#isUndetectable(p))continue;any=true;this.#s.traps[enemy]=this.#s.traps[enemy].filter(x=>x.id!==t.id);this.#noteReplay('trap',enemy,{coord:to,kind:t.kind,target:this.#R.defOf(p).name});if(t.kind==='spot'){this.#s.spotReveals[enemy][p.id]={};this.#addIntel(enemy,`📍 Armadilha da Sentinela revelou ${this.#R.defOf(p).name} em ${to} até o início do próximo turno dessa peça.`);this.#addHistory(moverSide,'🦉 Você ativou uma armadilha inimiga e sua posição foi revelada.');}else{this.#addHistory(enemy,`🕳️ Armadilha do Caçador atingiu ${this.#R.defOf(p).name} antes da resolução da casa.`);this.#addHistory(moverSide,'🕳️ Uma armadilha inimiga causou 1 de dano.');this.#damage(p,1);this.#resolveSlimeSplits();}}
    return any;
  }
  #possess(side,ghost,target){
    if(!ghost?.alive||!target?.alive||target.possession)return false;
    const targetSide=target.owner,coord=target.coord,from=ghost.coord,follower=this.#linkedShieldFor(ghost);
    const traveling=follower?.alive&&follower.coord===from?follower:null,ignored=new Set([ghost.id,target.id,...(traveling?[traveling.id]:[])]);
    const others=this.#piecesAt(targetSide,coord).filter(x=>x.id!==target.id),moves=[],reserved=new Set([coord]);
    if(this.#baseAt(coord)||this.#piecesAt(side,coord).some(x=>!ignored.has(x.id)))return false;
    // Primeiro valida toda a troca; uma possessão impedida não altera vínculos ou peças.
    for(const ally of others){const dest=this.#R.neighbors(coord,false).find(c=>!reserved.has(c)&&!this.#solidTerrain(c)&&!this.#baseAt(c)&&!['player','enemy'].some(s=>this.#piecesAt(s,c).some(x=>!ignored.has(x.id))));if(!dest)return false;moves.push([ally,dest]);reserved.add(dest);}
    this.#clearShieldLinks(target);
    ghost.possession={hostSide:targetSide,hostId:target.id,hostSnapshot:structuredClone(target),ghostState:structuredClone(ghost)};
    target.alive=false;target.possessedBy=ghost.id;target.coord=null;
    for(const key of ['name','form','copied','hp','summonType','bonusM','bonusV','bonusA','bonusRange','bonusAH','bonusPer','bonusRadarAdvanced','bonusRadarExpanded','golemArmorExpireAfterTurn','sureShotCooldown','sureShotActive','pyroCooldown','paranoiaEchoPending','paranoiaEchoKnownFalse','paranoiaEchoReadyTurn','ninjaSmokeCooldown','ninjaSmokeRemaining','mirrorCooldown','turnsTaken'])ghost[key]=target[key]??null;
    ghost.coord=coord;ghost.effects=structuredClone(target.effects||[]);
    for(const [ally,dest] of moves){this.#clearShieldLinks(ally);ally.coord=dest;}
    if(traveling)traveling.coord=coord;
    return true;
  }
  #recoveryCell(target,origin){
    const legal=c=>{if(this.#treeBlocks(target,c)||this.#baseAt(c)||this.#pieceAt(this.#other(target.owner),c))return false;const own=this.#piecesAt(target.owner,c).filter(x=>x.id!==target.id);return !own.length||(own.length===1&&(this.#isShieldUnit(target)||this.#isShieldUnit(own[0])));};
    const cells=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)cells.push(this.#R.coord(x,y));cells.sort((a,b)=>this.#R.man(origin,a)-this.#R.man(origin,b));
    return cells.find(legal)||null;
  }
  #processHostRecoveries(){for(const side of ['player','enemy'])for(const p of this.#pieces(side)){if(!p.recoveryPending)continue;const c=this.#recoveryCell(p,p.recoveryOrigin);if(!c)continue;p.coord=c;p.alive=true;p.possessedBy=null;p.recoveryPending=false;this.#addHistory(side,`👻 Sua peça recuperada voltou em ${c}.`);}}
  #repairShieldLinks(){for(const side of ['player','enemy'])for(const p of this.#pieces(side)){if(!p.linkedToId)continue;const target=this.#pieceById(side,p.linkedToId);if(!p.alive||!this.#isShieldUnit(p)||!target||target.coord!==p.coord)p.linkedToId=null;}}
  #breakPossession(ghost){
    const pos=ghost?.possession;if(!pos)return null;
    const coord=ghost.coord,target=this.#rawPieceById(pos.hostSide,pos.hostId);
    this.#collapseDruidBranches(ghost);this.#clearBardEffects(ghost.id,ghost.owner);this.#clearShieldLinks(ghost);
    const gs=pos.ghostState;Object.assign(ghost,gs);ghost.name='Fantasma';ghost.identity='Fantasma';ghost.summonType=gs.summonType||null;ghost.possession=null;ghost.hp=0;ghost.linkedToId=null;ghost.alive=false;ghost.coord=coord;this.#createCorpse(ghost);
    if(target){Object.assign(target,pos.hostSnapshot,{effects:structuredClone(target.effects||[]),hp:target.hp});target.linkedToId=null;const dest=this.#recoveryCell(target,coord);target.coord=dest;target.alive=!!dest;target.possessedBy=dest?null:ghost.id;target.recoveryPending=!dest;target.recoveryOrigin=coord;}
    this.#addHistory(ghost.owner,'☠️ Seu Fantasma foi expulso e morreu; o hospedeiro voltou ao dono original.');this.#addHistory(pos.hostSide,target?.alive?'👻 Sua peça foi recuperada após a morte do Fantasma.':'👻 Sua peça foi recuperada e aguarda uma casa válida para retornar.');return target;
  }

  #sabotageBase(side,baseId,bonusId,targetPieceId=null){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p)return this.#fail('Selecione uma peça para sabotar o Posto.');if(a.mode)return this.#fail('Cancele ou termine a ação atual antes de sabotar.');const base=this.#baseById(baseId);if(!base||base.owner===side)return this.#fail('Escolha um Posto inimigo.');if(base.sabotaged)return this.#fail('Esse Posto já foi sabotado.');if(!this.#R.neighbors(base.coord,true).includes(p.coord))return this.#fail('Para sabotar, a peça precisa estar em uma das 8 casas ao redor do Posto.');const bonus=this.#R.baseBonuses.find(b=>b.id===bonusId);if(!bonus)return this.#fail('Benefício inválido.');if(this.#hasBaseBonus(side,bonusId))return this.#fail('Esse benefício já foi escolhido nesta partida.');
    let target=null;if(['radarAdvanced','radarExpanded','move','life','attack','range','abilityRange'].includes(bonusId)){target=this.#pieceById(side,targetPieceId);if(!target)return this.#fail('Escolha uma unidade aliada viva para receber o benefício.');if(bonusId==='range'&&this.#R.defOf(target).a<=0)return this.#fail('Mira só pode ser aplicada a um personagem que já possua ataque normal.');if(bonusId==='abilityRange'&&this.#R.defOf(target).ah<=0)return this.#fail('Alc. Hab. só pode ser aplicado a uma habilidade que use Alc. Hab.');}
    this.#commit(side);base.sabotaged=true;this.#s.chosenBaseBonuses[side].push(bonusId);if(target){if(bonusId==='move')target.bonusM=(target.bonusM||0)+1;if(bonusId==='life'){target.bonusV=(target.bonusV||0)+1;target.hp+=1;}if(bonusId==='attack')target.bonusA=(target.bonusA||0)+1;if(bonusId==='range')target.bonusRange=(target.bonusRange||0)+1;if(bonusId==='abilityRange')target.bonusAH=(target.bonusAH||0)+1;if(bonusId==='radarAdvanced')target.bonusRadarAdvanced=true;if(bonusId==='radarExpanded')target.bonusRadarExpanded=true;}
    const detail=target?`${bonus.icon} ${bonus.name} em ${this.#R.defOf(target).name}`:`${bonus.icon} ${bonus.name}`;this.#addHistory(side,`🏰 Posto inimigo sabotado. Benefício escolhido: ${detail}.`);this.#addHistory(this.#other(side),'🏚️ Um dos seus Postos de Operação foi sabotado.');if(this.#siegeActive()){const msg='👁️ Cerco Final: todos os Postos foram sabotados. A borda externa do tabuleiro agora revela permanentemente qualquer unidade para os dois lados.';this.#addHistory('player',msg);this.#addHistory('enemy',msg);}a.mode=null;return this.#finishActivation(side);
  }

  #surrender(side){
    if(this.#s.phase!=='play')return this.#fail('A partida ainda não começou.');
    if(this.#s.mode==='training')return this.#fail('O Treino não possui desistência.');
    if(this.#s.gameOver)return this.#fail('A partida já terminou.');
    const other=this.#other(side);this.#s.gameOver=true;this.#s.result=other;this.#s.surrenderedBy=side;this.#s.activation={player:null,enemy:null};this.#s.pendingCombat=null;this.#s.doppelChoice={player:null,enemy:null};
    this.#addHistory(side,'🏳️ Você desistiu da partida.');this.#addHistory(other,'🏆 O adversário desistiu da partida.');this.#noteReplay('surrender',side,{side,text:'Desistência'});
    return this.#ok('Você desistiu da partida.',{gameOver:true,surrendered:true});
  }

  #endActivationRequest(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const p=this.#activePiece(side);if(!p)return this.#fail('Selecione uma peça.');
    const a=this.#activation(side);if(a?.mode==='move'&&this.#R.defOf(p)?.flying&&this.#solidTerrain(p.coord))return this.#fail('Voador precisa sair da Árvore ou Pedra antes de encerrar o turno.');
    if(a?.mode==='move'&&a.committed&&Number(a.moveRemaining||0)>0)return this.#fail('Primeiro use Parar movimento antes de encerrar o turno.');
    this.#commit(side);return this.#finishActivation(side);
  }

  #createCorpse(p){if(!p.original||p.name==='Slime'||p.possessedBy)return;if(!this.#s.corpses.some(c=>c.sourceId===p.id))this.#s.corpses.push({sourceId:p.id,coord:p.coord,name:p.identity||p.name,owner:p.owner});}
  #kill(p,forceZombieFinal=false){
    if(!p||!p.alive)return;
    if(p.possession){this.#breakPossession(p);return;}
    if(p.name==='Zumbi'&&p.original&&!p.zombieRevived&&!forceZombieFinal){this.#clearShieldLinks(p);p.alive=false;p.zombiePending=true;p.zombieReviveRound=this.#s.round+1;p.zombieDeathCoord=p.coord;p.zombieFinal=false;this.#addHistory(p.owner,'🧟 Zumbi caiu, mas ainda não conta como eliminação. Ele tentará se levantar na próxima rodada.');return;}
    if(p.summonType==='livingBranch'){
      this.#clearShieldLinks(p);p.alive=false;this.#s.trees.push({coord:p.coord,state:'dead'});this.#addHistory(p.owner,'🌲 Galho-Vivo caiu e virou uma árvore morta.');return;
    }
    this.#clearShieldLinks(p);p.alive=false;if(p.name==='Zumbi')p.zombieFinal=true;
    this.#collapseDruidBranches(p);
    this.#clearBardEffects(p.id,p.owner);
    if(p.name==='Slime'&&p.original)this.#s.pendingSlimeSplits.push({owner:p.owner,coord:p.coord,lineageId:p.id,bonusM:p.bonusM||0,bonusV:p.bonusV||0,bonusA:p.bonusA||0,bonusRange:p.bonusRange||0,bonusAH:p.bonusAH||0,bonusPer:p.bonusPer||0,bonusRadarAdvanced:!!p.bonusRadarAdvanced,bonusRadarExpanded:!!p.bonusRadarExpanded,effects:(p.effects||[]).map(e=>structuredClone(e))});else this.#createCorpse(p);
    if(p.summonType==='miniSlime'&&p.slimeLineageId&&!this.#slimeLineageAlive(p.owner,p.slimeLineageId)){this.#addHistory(p.owner,'☠️ O último Mini-Slime caiu. A linhagem do Slime foi eliminada e agora conta como 1 perda.');this.#addHistory(this.#other(p.owner),'☠️ Uma eliminação inimiga foi confirmada.');}
    if(this.#effectiveAbility(p)==='kamikaze'&&p.original)this.#explodeKamikaze(p);
  }
  #collapseDruidBranches(druid){for(const b of this.#pieces(druid.owner).filter(x=>x.alive&&x.summonType==='livingBranch'&&x.druidId===druid.id)){const c=b.coord;this.#clearShieldLinks(b);b.alive=false;this.#s.trees=this.#s.trees.filter(t=>t.coord!==c);this.#s.trees.push({coord:c,state:'live',hp:3});this.#addHistory(druid.owner,'🌳 Com a morte do Druida, Galho-Vivo voltou a ser uma árvore normal.');}}
  #clearBardEffects(bardId,side){for(const q of ['player','enemy'].flatMap(s=>this.#pieces(s))){const removed=(q.effects||[]).filter(e=>e.sourceBardId===bardId),temp=removed.reduce((n,e)=>n+Math.max(0,Number(e.tempLife)||0),0);q.effects=(q.effects||[]).filter(e=>e.sourceBardId!==bardId);if(temp&&q.alive)q.hp=Math.max(1,q.hp-temp);const max=this.#R.defOf(q).v;if(q.hp>max)q.hp=max;}}
  #processZombieRevives(){for(const side of ['player','enemy'])for(const p of this.#pieces(side)){if(!p.zombiePending||p.zombieReviveRound>this.#s.round)continue;const free=c=>c&&!this.#solidTerrain(c)&&!this.#baseAt(c)&&!this.#pieceAt('player',c)&&!this.#pieceAt('enemy',c);let c=free(p.zombieDeathCoord)?p.zombieDeathCoord:this.#R.neighbors(p.zombieDeathCoord,false).find(free);if(!c)continue;p.coord=c;p.hp=1;p.alive=true;p.zombiePending=false;p.zombieRevived=true;p.zombieTurnsLeft=3;p.activated=false;this.#addHistory(side,`🧟 Zumbi se levantou em ${c} com 1 Vida e terá 3 turnos antes de cair definitivamente.`);}}
  #expireBardAfterTurn(bard){bard.turnsTaken=(bard.turnsTaken||0)+1;for(const q of ['player','enemy'].flatMap(s=>this.#pieces(s))){const expired=(q.effects||[]).filter(e=>e.sourceBardId===bard.id&&bard.turnsTaken>=(e.expireAfterSourceTurn||Infinity));if(!expired.length)continue;const temp=expired.reduce((n,e)=>n+Math.max(0,Number(e.tempLife)||0),0);q.effects=(q.effects||[]).filter(e=>!expired.includes(e));if(temp&&q.alive)q.hp=Math.max(1,q.hp-temp);const max=this.#R.defOf(q).v;if(q.hp>max)q.hp=max;this.#addHistory(bard.owner,`🎵 A Inspiração em ${this.#R.defOf(q).name} terminou.`);}}

  #damage(p,n){
    if(!p||!p.alive)return{dead:true,transform:false};
    const wasPossessed=!!p.possession,possessedHostName=wasPossessed?this.#R.defOf(p).name:null;
    const incoming=Math.max(0,Number(n)||0),armorActive=(p.golemArmorExpireAfterTurn||0)>(p.turnsTaken||0),armorReduced=armorActive?Math.min(1,incoming):0,actual=incoming-armorReduced;
    let pending=actual;for(const e of p.effects||[]){if(!pending)break;const temp=Math.max(0,Number(e.tempLife)||0);if(!temp)continue;const used=Math.min(temp,pending);e.tempLife=temp-used;pending-=used;}
    p.hp-=actual;if(actual>0&&p.name==='Golem'&&!p.form&&p.hp>0){p.form='lava';p.hp=1+(p.bonusV||0)+(p.effects||[]).reduce((sum,e)=>sum+Math.max(0,Number(e.tempLife)||0),0);return{dead:false,transform:true,armorReduced};}
    if(p.hp<=0){if(wasPossessed){this.#breakPossession(p);return{dead:false,transform:false,possessionBroken:true,hostName:possessedHostName};}const zombieWasFirst=p.name==='Zumbi'&&p.original&&!p.zombieRevived;this.#kill(p);return{dead:!zombieWasFirst&&!p.alive,transform:false,zombieDown:zombieWasFirst};}return{dead:false,transform:false,armorReduced:typeof armorReduced==='number'?armorReduced:0};
  }
  #explodeKamikaze(p){
    const ah=this.#R.defOf(p).ah||1,cells=this.#R.blastCells(p.coord,ah);this.#addHistory(p.owner,`💥 Seu Kamikaze explodiu: 1 de dano em toda a área de Alc. Hab. ${ah}, com fogo amigo.`);this.#addHistory(this.#other(p.owner),'💥 Um Kamikaze inimigo explodiu nas proximidades.');for(const c of cells){for(const side of ['player','enemy']){const t=this.#protectedTarget(side,c);if(t)this.#damage(t,1);}}this.#resolveSlimeSplits();
  }
  #resolveSlimeSplits(){
    const q=[...this.#s.pendingSlimeSplits];this.#s.pendingSlimeSplits=[];
    for(const s of q){
      const occupied=c=>this.#solidTerrain(c)||!!this.#pieceAt('player',c)||!!this.#pieceAt('enemy',c)||!!this.#baseAt(c);
      const spots=[s.coord,...this.#R.neighbors(s.coord,false)].filter((c,i,a)=>a.indexOf(c)===i&&!occupied(c)).slice(0,2);
      for(const c of spots)this.#pieces(s.owner).push({id:(s.owner==='player'?'p':'e')+this.#s.idSeq++,owner:s.owner,name:'Mini-Slime',hp:1+(s.bonusV||0),coord:c,alive:true,activated:true,original:false,summonType:'miniSlime',slimeLineageId:s.lineageId,form:null,copied:null,mirrorCooldown:0,effects:(s.effects||[]).map(e=>structuredClone(e)),bonusM:s.bonusM||0,bonusV:s.bonusV||0,bonusA:s.bonusA||0,bonusRange:s.bonusRange||0,bonusAH:s.bonusAH||0,bonusPer:s.bonusPer||0,bonusRadarAdvanced:!!s.bonusRadarAdvanced,bonusRadarExpanded:!!s.bonusRadarExpanded});
      const splitText=`dividiu-se em ${spots.length} Mini-Slime${spots.length===1?'':'s'}; herdaram os bônus e a perda só conta quando todos os fragmentos forem destruídos.`;
      const latest=this.#s.history[s.owner]?.[0]||'';
      if(/Slime/i.test(latest)&&/(rompido|atingido|Confronto)/i.test(latest))this.#appendLatestHistory(s.owner,splitText);else this.#addHistory(s.owner,`🟢 Slime ${splitText}`);
    }
  }

  #hitAttack(side,attacker,to){
    this.#markImpact(side,to);
    const other=this.#other(side),d=this.#R.defOf(attacker),mir=this.#mirrorAt(to,other);
    if(mir){this.#s.mirrors=this.#s.mirrors.filter(m=>m!==mir);const reflectedTarget=this.#protectedTarget(side,attacker.coord)||attacker,intercepted=reflectedTarget.id!==attacker.id,res=this.#damage(reflectedTarget,d.a);this.#addHistory(side,`🪞 O ataque do seu ${d.name} foi refletido por um Espelho.${intercepted?' Seu Escudeiro interceptou o reflexo e protegeu o atacante.':''}${res.dead?` ${intercepted?'O Escudeiro':'Seu atacante'} morreu.`:res.possessionBroken?' A possessão foi quebrada.':''}`);this.#addHistory(other,`🪞 Seu Espelho refletiu um ataque.${intercepted?' O Escudeiro inimigo interceptou o reflexo.':''}${res.dead?` ${intercepted?'O Escudeiro inimigo':'O atacante inimigo'} morreu.`:''}`);this.#resolveSlimeSplits();return;}
    const friendly=this.#protectedTarget(side,to),hostile=this.#protectedTarget(other,to),target=friendly||hostile,dist=this.#R.man(attacker.coord,to);if(!target&&this.#damageTerrain(to,d.a,side,d.name)){return;}if(!target){const fake=this.#falsePresenceAt(other,to);if(fake){this.#removeFalsePresence(other,fake);this.#markParanoiaEcho(attacker,false);this.#addHistory(side,`⚔️ Paranoia inimigo foi atingido por ${d.name}.`);this.#addHistory(other,'🧠 Uma de suas Presenças Fantasmas foi destruída por um ataque; o adversário acredita ter atingido Paranoia.');return;}this.#addHistory(side,`${d.icon} ${d.name} atacou, mas não atingiu ninguém.`);this.#addIntel(other,'💥 Ataque inimigo detectado: a casa atingida foi marcada no tabuleiro.');return;}
    const targetSide=target.owner,stacked=this.#piecesAt(targetSide,to).length>1&&this.#isShieldUnit(target);const before=this.#R.defOf(target).name,res=this.#damage(target,d.a),friendlyFire=targetSide===side,slimeSplit=target.name==='Slime'&&target.original&&res.dead;
    if(res.possessionBroken){this.#addHistory(side,!friendlyFire&&dist>1?'☠️ Um alvo distante foi eliminado.':`👻 O golpe expulsou o Fantasma de ${res.hostName}; a peça foi recuperada pelo dono original.`);this.#addHistory(targetSide,`👻 ${res.hostName} foi recuperado após a morte do Fantasma.`);return;}
    if(res.zombieDown){this.#addHistory(side,!friendlyFire&&dist>1?'🎯 Um alvo distante foi atingido, mas nenhuma eliminação foi confirmada.':`🧟 ${before} caiu, mas ainda não conta como eliminação.`);this.#addHistory(targetSide,`🧟 Seu Zumbi caiu e tentará voltar.`);return;}
    if(friendlyFire){this.#addHistory(side,slimeSplit?`🟢 Seu Slime foi rompido pelo seu ${d.name} e vai se dividir.`:res.dead?`⚠️ Seu ${before} foi eliminado pelo seu ${d.name}.`:res.transform?'🌋 Você atingiu seu Golem e o transformou em Golem de Lava.':`⚠️ Seu ${before} foi atingido pelo seu ${d.name}.`);if(stacked)this.#addIntel(side,'🛡️ Seu Escudeiro interceptou o ataque aliado e protegeu a outra peça.');}
    else{if(dist===1)this.#addHistory(side,slimeSplit?`🟢 Slime inimigo foi rompido por ${d.name} e se dividiu.`:res.dead?`☠️ ${before} inimigo eliminado por ${d.name}.`:res.transform?'🌋 Golem inimigo virou Golem de Lava.':`⚔️ ${before} inimigo foi atingido por ${d.name}.`);else this.#addHistory(side,slimeSplit?'🎯 O alvo distante foi atingido, mas nenhuma eliminação foi confirmada.':res.dead?'☠️ Um alvo distante foi eliminado.':'🎯 Um alvo distante foi atingido.');if(stacked)this.#addIntel(side,'🛡️ O Escudeiro inimigo interceptou o dano destinado à casa.');if(dist===1)this.#addHistory(other,slimeSplit?`🟢 Seu Slime foi rompido por ${d.name} e vai se dividir.`:res.dead?`☠️ Seu ${before} foi eliminado por ${d.name}.`:res.transform?'🌋 Seu Golem virou Golem de Lava.':`⚔️ Seu ${before} foi atingido por ${d.name}.`);else this.#addHistory(other,slimeSplit?'🟢 Seu Slime foi atingido por ataque distante e vai se dividir.':res.dead?`☠️ Seu ${before} foi eliminado por ataque distante.`:`🎯 Seu ${before} foi atingido por ataque distante.`);if(stacked)this.#addIntel(other,'🛡️ Seu Escudeiro protegeu a outra peça na mesma casa.');}
    this.#resolveSlimeSplits();
  }

  #checkDoppel(side,p){
    if(p.name!=='Doppelgänger')return;const corpse=this.#corpseAt(p.coord);if(!corpse||p.copied===corpse.name)return;
    if(!p.copied){p.copied=corpse.name;this.#addIntel(side,`🎭 Doppelgänger copiou a habilidade de ${corpse.name}.`);return;}
    this.#s.doppelChoice[side]={pieceId:p.id,current:p.copied,newAbility:corpse.name};
    this.#addIntel(side,`🎭 Novo cadáver encontrado: manter ${p.copied} ou copiar ${corpse.name}?`);
  }
  #chooseDoppelCopy(side,copyNew){
    const ch=this.#s.doppelChoice?.[side];if(!ch)return this.#fail('Nenhuma escolha do Doppelgänger disponível.');
    if(copyNew&&!this.#doppelChoiceView(side).canCopyNew)return this.#fail(this.#doppelChoiceView(side).reason);
    const p=this.#pieceById(side,ch.pieceId);if(p&&copyNew)p.copied=ch.newAbility;this.#s.doppelChoice[side]=null;
    this.#addIntel(side,copyNew?`🎭 Doppelgänger agora mantém ${ch.newAbility}.`:`🎭 Doppelgänger manteve ${ch.current}.`);
    return this.#ok('Escolha do Doppelgänger confirmada.');
  }

  #resolveDirect(attackerSide,att,def,from,to){
    const defenderSide=this.#other(attackerSide),r=this.#R.directWinner(att,def),aName=this.#R.defOf(att).name,dName=this.#R.defOf(def).name;const a=this.#activation(attackerSide);if(a){a.mode=null;a.moveRemaining=0;}
    for(const s of ['player','enemy'])this.#s.combatMarks[s]=[...new Set([...(this.#s.combatMarks[s]||[]),to])];this.#s.combatHold[attackerSide]=true;this.#noteReplay('combat',attackerSide,{coord:to,attacker:aName,defender:dName});
    if(r==='tie'){att.coord=from;this.#addHistory(attackerSide,`↩️ ${aName} foi repelido por ${dName}.`);this.#addHistory(defenderSide,`↩️ ${aName} inimigo foi repelido pelo seu ${dName}.`);return this.#finishActivation(attackerSide);}
    const attackerWins=r==='att',winner=attackerWins?att:def,loser=attackerWins?def:att,loserCell=loser===att?from:to,shield=!this.#isShieldUnit(loser)?this.#shieldAt(loser.owner,loserCell):null;
    if(this.#isGhost(winner)){
      const possessionTarget=shield||loser;
      if(!this.#possess(winner.owner,winner,possessionTarget)){att.coord=from;this.#addHistory(attackerSide,'👻 A possessão no Confronto não se completou; as peças permaneceram na origem.');this.#addHistory(defenderSide,'👻 A possessão no Confronto não se completou; as peças permaneceram na origem.');return this.#finishActivation(attackerSide);}
      if(shield){const msg=`🛡️ Escudeiro interceptou o Fantasma no Confronto e protegeu ${this.#R.defOf(loser).name}.`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);}else{this.#addHistory(winner.owner,`👻 Fantasma venceu o Confronto e possuiu ${this.#R.defOf(loser).name}.`);this.#addHistory(loser.owner,'👻 Sua peça foi possuída em Confronto Direto e desapareceu da sua visão.');}return this.#finishActivation(attackerSide);
    }
    if(shield){const protectedName=this.#R.defOf(loser).name,res=this.#damage(shield,1);this.#resolveSlimeSplits();att.coord=from;const msg=`🛡️ Escudeiro interceptou o dano do Confronto e protegeu ${protectedName}.${res.dead?' O Escudeiro foi eliminado.':' O Escudeiro sofreu 1 de dano.'}`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);return this.#finishActivation(attackerSide);}
    const before=this.#R.defOf(loser).name,res=this.#damage(loser,1);this.#resolveSlimeSplits();
    if(res.possessionBroken){att.coord=from;const msg=`👻 O Confronto expulsou o Fantasma de ${res.hostName}; a peça original foi recuperada.`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);return this.#finishActivation(attackerSide);}
    if(!res.dead){att.coord=from;const msg=res.zombieDown?`🧟 ${before} caiu no Confronto, mas ainda não conta como eliminação.`:res.transform?`🌋 ${this.#R.defOf(winner).name} venceu o Confronto contra ${before}; ${before} sofreu 1 e virou Golem de Lava.`:`⚔️ ${this.#R.defOf(winner).name} venceu o Confronto e causou 1 em ${before}, que sobreviveu.`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);return this.#finishActivation(attackerSide);}
    if(!winner.alive){const msg=`💥 ${before} morreu, mas a reação também eliminou ${this.#R.defOf(winner).name}.`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);return this.#finishActivation(attackerSide);}
    const slimeSplit=loser.name==='Slime'&&loser.original,directMsg=slimeSplit?`🟢 Slime foi rompido por ${this.#R.defOf(winner).name} no Confronto Direto e se dividiu.`:`☠️ ${before} eliminado por ${this.#R.defOf(winner).name} em Confronto Direto.`;this.#addHistory(attackerSide,directMsg);this.#addHistory(defenderSide,directMsg);
    const ownCell=winner===att?from:to,deadCell=winner===att?to:from,winnerSide=winner.owner;const protectedAlly=this.#isShieldUnit(loser)?this.#piecesAt(loser.owner,deadCell).find(x=>x.id!==loser.id):null;const shieldProtected=this.#isShieldUnit(loser)&&protectedAlly&&protectedAlly.alive;winner.coord=ownCell;this.#s.pendingCombat={winnerId:winner.id,winnerSide,ownCell,deadCell,afterSide:attackerSide,protectedAllyId:shieldProtected?protectedAlly.id:null,protectedSide:shieldProtected?protectedAlly.owner:null};return this.#ok('Confronto resolvido. O vencedor deve escolher onde termina.',{pendingCombat:true});
  }

  #chooseCombatPosition(side,advance){
    const p=this.#s.pendingCombat;if(!p||p.winnerSide!==side)return this.#fail('Nenhuma escolha de confronto disponível.');
    const winner=this.#pieceById(side,p.winnerId);
    const protectedAlly=p.protectedAllyId&&p.protectedSide?this.#pieceById(p.protectedSide,p.protectedAllyId):null;
    if(winner){
      let doAdvance=!!advance&&this.#canAdvanceCombat(p);
      if(!protectedAlly&&doAdvance&&this.#piecesAt(this.#other(side),p.deadCell).length)doAdvance=false;
      if(protectedAlly&&doAdvance){const blockers=this.#piecesAt(side,p.ownCell).filter(x=>x.id!==winner.id);if(blockers.length)doAdvance=false;}
      winner.coord=doAdvance?p.deadCell:p.ownCell;
      if(protectedAlly&&protectedAlly.alive){
        const allyDest=doAdvance?p.ownCell:p.deadCell;
        const enemyBlock=this.#piecesAt(side,allyDest).some(x=>x.id!==winner.id);
        if(!enemyBlock)protectedAlly.coord=allyDest;
        else {winner.coord=p.ownCell;protectedAlly.coord=p.deadCell;}
      }
      // O vínculo não pode terminar com Escudeiro e aliado em casas diferentes.
      // Se o vencedor for o aliado seguido, leva o Escudeiro; se o próprio Escudeiro
      // vinculado vencer e avançar, leva também o alvo do vínculo.
      const linkedShield=this.#linkedShieldFor(winner);
      if(linkedShield?.alive&&linkedShield.coord===p.ownCell)linkedShield.coord=winner.coord;
      const linkedTarget=winner.linkedToId?this.#pieceById(side,winner.linkedToId):null;
      if(linkedTarget?.alive&&linkedTarget.coord===p.ownCell)linkedTarget.coord=winner.coord;
      this.#checkDoppel(side,winner);
    }
    const after=p.afterSide;this.#s.pendingCombat=null;return this.#finishActivation(after);
  }

  #tickPieceEffects(p,tick){
    if(!p||!p.alive||!Array.isArray(p.effects)||!p.effects.length)return;
    const keep=[];
    for(const effect of p.effects){
      const e={...effect};
      if(((e.tick||'round')===tick||((e.tick||'round')==='activation'&&tick==='turn'))&&Number.isFinite(Number(e.remaining)))e.remaining=Number(e.remaining)-1;
      if(Number(e.remaining)>0){keep.push(e);continue;}
      this.#addHistory(p.owner,`⏳ ${e.name||'Um efeito temporário'} terminou em ${this.#R.defOf(p).name}.`);
      if(e.onExpire==='despawn'&&p.alive){
        this.#clearShieldLinks(p);p.alive=false;
        this.#addHistory(p.owner,`⌛ ${this.#R.defOf(p).name} deixou o campo ao fim da duração.`);
        this.#addHistory(this.#other(p.owner),'⌛ Uma presença temporária inimiga deixou o campo.');
      }
    }
    p.effects=keep;const maxHp=this.#R.defOf(p).v;if(p.hp>maxHp)p.hp=maxHp;
  }
  #tickRoundEffects(){
    for(const side of ['player','enemy'])for(const p of this.#pieces(side))this.#tickPieceEffects(p,'round');
  }

  #finishActivation(side){
    const active=this.#activation(side),hadActivation=!!active,p=this.#activePiece(side);if(p&&this.#paranoiaEchoReady(p)&&!active?.movementUsed)this.#triggerParanoiaEchoWithoutMove(side,p);if(this.#s.mode!=='training'&&hadActivation)this.#s.roundActivations[side]=(this.#s.roundActivations?.[side]||0)+1;if(p&&p.alive){p.sureShotActive=false;if((p.sureShotCooldown||0)>0)p.sureShotCooldown--;if((p.pyroCooldown||0)>0)p.pyroCooldown--;if((p.ninjaSmokeCooldown||0)>0)p.ninjaSmokeCooldown--;if((p.ninjaSmokeRemaining||0)>0&&p.ninjaSmokeCooldown<2)p.ninjaSmokeRemaining--;p.activated=this.#s.mode==='training'?false:true;this.#tickPieceEffects(p,'turn');this.#expireBardAfterTurn(p);if((p.golemArmorExpireAfterTurn||0)>0&&(p.turnsTaken||0)>=p.golemArmorExpireAfterTurn){p.golemArmorExpireAfterTurn=0;this.#addHistory(side,'🛡️ A Armadura do Golem terminou.');}if(p.name==='Zumbi'&&p.zombieTurnsLeft>0){p.zombieTurnsLeft--;if(p.zombieTurnsLeft<=0){this.#addHistory(side,'🧟 Os 3 turnos do Zumbi terminaram; ele caiu definitivamente.');this.#kill(p,true);}}}
    this.#s.activation[side]=null;this.#s.impact[side]=[];this.#processHostRecoveries();this.#repairShieldLinks();if(this.#s.combatHold?.[side])this.#s.combatHold[side]=false;else if(this.#s.combatMarks)this.#s.combatMarks[side]=[];if(this.#s.mode==='training'){this.#s.turn=side;return this.#ok('Ação de treino encerrada. Você pode usar qualquer peça novamente.',{training:true});}if(this.#checkEnd())return this.#ok('Partida encerrada.',{gameOver:true});this.#advanceAfterActivation(side);return this.#ok('Turno encerrado.',{turn:this.#s.turn});
  }

  #advanceAfterActivation(side){
    const pLeft=this.#hasActivationLeft('player'),eLeft=this.#hasActivationLeft('enemy');
    if(!pLeft&&!eLeft){this.#s.round++;this.#tickRoundEffects();for(const p of this.#pieces('player'))p.activated=false;for(const p of this.#pieces('enemy'))p.activated=false;this.#s.roundActivations={player:0,enemy:0};this.#processZombieRevives();this.#s.roundStarter=this.#s.roundStarter==='player'?'enemy':'player';this.#s.turn=this.#hasActivationLeft(this.#s.roundStarter)?this.#s.roundStarter:this.#other(this.#s.roundStarter);this.#addHistory('player',`🔄 Rodada ${this.#s.round} começou. ${this.#s.turn==='player'?'Você':'O adversário'} tem a prioridade inicial.`);this.#addHistory('enemy',`🔄 Rodada ${this.#s.round} começou. ${this.#s.turn==='enemy'?'Você':'O adversário'} tem a prioridade inicial.`);return;}
    if(side==='player')this.#s.turn=eLeft?'enemy':'player';else this.#s.turn=pLeft?'player':(eLeft?'enemy':'player');
  }

  #checkEnd(){
    if(this.#s.mode==='training')return false;
    const pd=this.#originalDeaths('player'),ed=this.#originalDeaths('enemy'),cfg=this.#s.matchConfig||{teamSize:{player:4,enemy:4},lossLimit:{player:3,enemy:3}},pl=cfg.lossLimit.player,el=cfg.lossLimit.enemy;
    if(pd>=pl&&ed>=el){this.#s.gameOver=true;this.#s.result='draw';this.#addHistory('player',`⚖️ As duas equipes chegaram ao próprio limite de perdas na mesma resolução.`);this.#addHistory('enemy',`⚖️ As duas equipes chegaram ao próprio limite de perdas na mesma resolução.`);return true;}
    if(pd>=pl){this.#s.gameOver=true;this.#s.result='enemy';this.#addHistory('player',`☠️ Derrota: ${pd}/${pl} perdas originais.`);this.#addHistory('enemy',`🏆 Vitória: o adversário atingiu ${pd}/${pl} perdas originais.`);return true;}
    if(ed>=el){this.#s.gameOver=true;this.#s.result='player';this.#addHistory('player',`🏆 Vitória: o adversário atingiu ${ed}/${el} perdas originais.`);this.#addHistory('enemy',`☠️ Derrota: ${ed}/${el} perdas originais.`);return true;}
    return false;
  }
  exportState(){
    return JSON.stringify(this.#s,(k,v)=>v instanceof Set?{__set:[...v]}:v);
  }
  importState(raw){ this.#importState(raw); }
  #importState(raw){
    if(!raw)return;this.#s=JSON.parse(raw,(k,v)=>v&&typeof v==='object'&&Array.isArray(v.__set)?new Set(v.__set):v);if(!this.#s.doppelChoice)this.#s.doppelChoice={player:null,enemy:null};if(!this.#s.matchConfig)this.#s.matchConfig={teamSize:{player:4,enemy:4},lossLimit:{player:3,enemy:3}};if(!this.#s.roundStarter)this.#s.roundStarter='player';if(!this.#s.roundActivations)this.#s.roundActivations={player:0,enemy:0};if(!this.#s.trees)this.#s.trees=[{coord:'B3',state:'live',hp:3},{coord:'G6',state:'live',hp:3}];for(const tr of this.#s.trees)if(tr.hp==null)tr.hp=tr.state==='live'?3:0;if(!this.#s.rocks)this.#s.rocks=['F2','C7'];if(!this.#s.rockHp)this.#s.rockHp=Object.fromEntries((this.#s.rocks||[]).map(c=>[c,3]));if(!this.#s.water)this.#s.water=['D3','E6'];if(!this.#s.swamps)this.#s.swamps=['C5','F4'];if(!this.#s.traps)this.#s.traps={player:[],enemy:[]};if(!this.#s.falsePresences)this.#s.falsePresences={player:[],enemy:[]};if(!this.#s.spotReveals)this.#s.spotReveals={player:{},enemy:{}};if(!this.#s.combatMarks)this.#s.combatMarks={player:[],enemy:[]};if(!this.#s.combatHold)this.#s.combatHold={player:false,enemy:false};if(this.#s.replayEvent===undefined)this.#s.replayEvent=null;if(this.#s.surrenderedBy===undefined)this.#s.surrenderedBy=null;for(const side of ['player','enemy'])for(const p of this.#pieces(side)){if(p.name==='Coringa')p.name='Trapaceiro';if(p.identity==='Coringa')p.identity='Trapaceiro';if(!Array.isArray(p.effects))p.effects=[];if(p.bonusAH==null)p.bonusAH=0;if(p.turnsTaken==null)p.turnsTaken=0;if(p.linkedToId===undefined)p.linkedToId=null;if(p.sureShotCooldown==null)p.sureShotCooldown=0;if(p.sureShotActive==null)p.sureShotActive=false;if(p.pyroCooldown==null)p.pyroCooldown=0;if(p.paranoiaEchoPending==null)p.paranoiaEchoPending=false;if(p.paranoiaEchoKnownFalse==null)p.paranoiaEchoKnownFalse=false;if(p.paranoiaEchoReadyTurn==null)p.paranoiaEchoReadyTurn=0;p.paranoia=null;if(p.golemArmorExpireAfterTurn==null)p.golemArmorExpireAfterTurn=0;p.golemAbsorbStat=null;if(p.ninjaSmokeCooldown==null)p.ninjaSmokeCooldown=0;if(p.ninjaSmokeRemaining==null)p.ninjaSmokeRemaining=0;}
  }

};


const actionMap={
  surrender:c=>c.surrender(),selectPiece:(c,a)=>c.selectPiece(a.pieceId),cancelSelection:c=>c.cancelSelection(),cancelMode:c=>c.cancelMode(),startMove:c=>c.startMove(),moveStep:(c,a)=>c.moveStep(a.to),stopMove:c=>c.stopMove(),startAttack:c=>c.startAttack(),attack:(c,a)=>c.attack(a.to),selectPyroTarget:(c,a)=>c.selectPyroTarget(a.to),confirmPyroAttack:c=>c.confirmPyroAttack(),confirmSureShot:c=>c.confirmSureShot(),selectParanoiaTarget:(c,a)=>c.selectParanoiaTarget(a.to),confirmParanoia:c=>c.confirmParanoia(),startAbility:c=>c.startAbility(),confirmKamikaze:c=>c.confirmKamikaze(),useSeer:(c,a)=>c.useSeer(a.cells),raiseAt:(c,a)=>c.raiseAt(a.coord),placeMirror:(c,a)=>c.placeMirror(a.coord),awakenTree:(c,a)=>c.awakenTree(a.coord),placeTrap:(c,a)=>c.placeTrap(a.coord),bardBuff:(c,a)=>c.bardBuff(a.targetPieceId,a.stat),absorbRock:(c,a)=>c.absorbRock(a.coord),shieldLink:(c,a)=>c.shieldLink(a.targetPieceId||null),endActivation:c=>c.endActivation(),chooseCombatPosition:(c,a)=>c.chooseCombatPosition(!!a.advance),sabotageBase:(c,a)=>c.sabotageBase(a.baseId,a.bonusId,a.targetPieceId||null),chooseDoppelCopy:(c,a)=>c.chooseDoppelCopy(!!a.copyNew)
};

export class GameRoom {
  constructor(ctx,env){
    this.generals=false;this.generalControl=defaultGeneralControl();this.generalBrains=null;
    this.ctx=ctx;this.env=env;this.seatTokens={};this.legacySeats=[];this.referee=new globalThis.GameReferee();this.ready={player:null,enemy:null};this.started=false;this.matchConfig={teamSize:{player:4,enemy:4},lossLimit:{player:3,enemy:3}};this.replayInitialState=null;this.replayActions=[];
    ctx.blockConcurrencyWhile(async()=>{
      const saved=await ctx.storage.get('room');
      if(saved?.generals){this.generals=true;this.generalControl=saved.generalControl||defaultGeneralControl();this.generalBrains=makeGeneralBrains(this.generalControl,saved.generalBrains);}
      if(saved){this.seatTokens=saved.seatTokens||{};this.legacySeats=saved.legacySeats||(saved.started&&!saved.seatTokens?['player','enemy']:[]);this.ready=saved.ready||{player:null,enemy:null};this.started=!!saved.started;this.matchConfig=saved.matchConfig||{teamSize:{player:4,enemy:4},lossLimit:{player:3,enemy:3}};this.replayInitialState=saved.replayInitialState||null;this.replayActions=await loadReplay(ctx.storage,'room',saved);this.replayPersistedCount=saved.replayChunked?this.replayActions.length:0;if(saved.gameState)this.referee.importState(saved.gameState);}
    });
  }
  resetReplay(){try{this.replayInitialState=this.referee.exportState();this.replayActions=[];this.replayPersistedCount=0;}catch(e){console.error('Falha ao iniciar Replay do Clássico Online:',e);this.replayInitialState=null;this.replayActions=[];}}
  recordReplayAction(side,action){try{if(!['player','enemy'].includes(side)||!action)return false;const copy=typeof structuredClone==='function'?structuredClone(action):JSON.parse(JSON.stringify(action));this.replayActions.push({side,action:copy});return true;}catch(e){console.error('Falha ao registrar ação no Replay do Clássico Online:',e);return false;}}
  async persist(){await persistReplay(this,'room',{generals:this.generals,generalControl:this.generalControl,generalBrains:brainSnapshots(this.generalBrains),seatTokens:this.seatTokens,legacySeats:this.legacySeats,ready:this.ready,started:this.started,matchConfig:this.matchConfig,gameState:this.referee.exportState(),replayInitialState:this.replayInitialState});}
  async safePersist(){try{await this.persist();return true;}catch(e){console.error('Falha ao persistir sala Clássico Online:',e);return false;}}
  send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
  sockets(){return this.ctx.getWebSockets();}
  attachment(ws){try{return ws.deserializeAttachment()||{};}catch{return {};}}
  sideSocket(side){return activeSocket(this,side);}
  roomState(){return {type:'roomState',generals:this.generals,generalControl:this.generals?{...this.generalControl,latest:undefined}:undefined,started:this.started,connected:{player:!!this.sideSocket('player'),enemy:!!this.sideSocket('enemy')},ready:{player:!!this.ready.player,enemy:!!this.ready.enemy},matchConfig:this.matchConfig};}
  broadcast(obj){for(const ws of this.sockets())this.send(ws,obj);}
  broadcastRoomState(){this.broadcast(this.roomState());}
  broadcastViews(){if(!this.started)return;const sent=new Set();for(const side of ['player','enemy']){const ws=this.sideSocket(side);if(!ws||sent.has(ws))continue;sent.add(ws);let view;try{view=this.referee.createClient(side).getView();if(this.generals)this.send(ws,{type:'generalView',state:JSON.parse(this.referee.exportState()),control:this.generalControl});else this.send(ws,{type:'view',view:{...view,side}});}catch(e){console.error('Falha ao gerar visão do Clássico Online para '+side+':',e);continue;}if(view.gameOver&&this.replayInitialState){try{this.send(ws,{type:'classicReplay',initialState:this.replayInitialState,actions:this.replayActions});}catch(e){console.error('Falha ao enviar Replay do Clássico Online:',e);}}}}
  async scheduleGenerals(){if(this.generals&&this.started&&!this.generalControl.paused&&!JSON.parse(this.referee.exportState()).gameOver)await this.ctx.storage.setAlarm(Date.now()+this.generalControl.delay);}
  async generalTick(){
    if(!this.generals||!this.started||JSON.parse(this.referee.exportState()).gameOver)return;
    const before=checkpoint(this),control=structuredClone(this.generalControl),saved=brainSnapshots(this.generalBrains);
    try{
      const step=generalStep(this.referee,this.generalBrains,this.generalControl);
      if(!step.result?.ok)throw Error(step.result?.status||'Ação inválida');
      this.recordReplayAction(step.side,step.action);
      if(step.observation)this.generalControl.latest={...step.observation,id:this.replayActions.length};
      await this.persist();
    }catch(err){
      restore(this,before);this.generalControl={...control,paused:true,error:'IA pausada: '+String(err.message).slice(0,180)};this.generalBrains=makeGeneralBrains(control,saved);
      await this.safePersist();this.broadcastRoomState();this.broadcastViews();
      return;
    }
    this.broadcastViews();
    try{await this.scheduleGenerals();}catch{this.generalControl.paused=true;this.generalControl.error='Não foi possível agendar a IA. Retome para tentar novamente.';await this.safePersist();this.broadcastRoomState();this.broadcastViews();}
  }
  async alarm(){return enqueue(this,async()=>{if(!this.generalControl.paused)await this.generalTick();});}
  async generalMessage(ws,msg,side){
    if(msg.type==='generalControl'){
      if(!this.started)return this.send(ws,{type:'result',ok:false,status:'Aguarde ambos confirmarem Pronto.'});
      if(['finish','cancelFinish'].includes(msg.command)){
        if(JSON.parse(this.referee.exportState()).gameOver)return this.send(ws,{type:'result',ok:false,status:'A observação já terminou.'});
        const before=checkpoint(this),old=structuredClone(this.generalControl),owned=this.attachment(ws).controlledSides||[side];
        this.generalControl.finishVotes={...this.generalControl.finishVotes};for(const s of owned)this.generalControl.finishVotes[s]=msg.command==='finish';
        let result={ok:true,status:'Pedido de encerramento atualizado. Os dois generais precisam concordar.'};
        if(['player','enemy'].every(s=>this.generalControl.finishVotes[s])){result=finishGeneralObservation(this.referee);if(result.ok)this.recordReplayAction(side,{type:'observerFinish'});}
        if(!await this.safePersist()){restore(this,before);this.generalControl=old;return this.send(ws,{type:'result',ok:false,status:'Não foi possível salvar o encerramento.'});}
        if(JSON.parse(this.referee.exportState()).gameOver)await this.ctx.storage.deleteAlarm();
        this.send(ws,{type:'result',...result});this.broadcastRoomState();this.broadcastViews();return true;
      }
      if(!['pause','resume','step','speed'].includes(msg.command))return this.send(ws,{type:'result',ok:false,status:'Controle inválido.'});
      if(msg.command==='speed'&&![150,600,1200].includes(msg.delay))return this.send(ws,{type:'result',ok:false,status:'Velocidade inválida.'});
      const previous=structuredClone(this.generalControl);
      if(msg.command==='speed')this.generalControl.delay=msg.delay;else this.generalControl.paused=msg.command!=='resume';
      this.generalControl.error=null;
      if(!await this.safePersist()){this.generalControl=previous;return this.send(ws,{type:'result',ok:false,status:'Não foi possível salvar o controle.'});}
      if(this.generalControl.paused)await this.ctx.storage.deleteAlarm();
      if(msg.command==='step')await this.generalTick();else {this.broadcastRoomState();this.broadcastViews();await this.scheduleGenerals();}
      return true;
    }
    if(msg.type==='generalDifficulty'){
      if(this.started||!['easy','normal','hard','extreme'].includes(msg.difficulty))return this.send(ws,{type:'result',ok:false,status:'Nível inválido ou partida iniciada.'});
      const old=this.generalControl.difficulties[side];this.generalControl.difficulties[side]=msg.difficulty;
      if(!await this.safePersist()){this.generalControl.difficulties[side]=old;return this.send(ws,{type:'result',ok:false,status:'Não foi possível salvar o nível.'});}
      this.broadcastRoomState();return true;
    }
    if(msg.type==='action'){
      if(msg.action?.type!=='surrender')return this.send(ws,{type:'result',ok:false,status:'As peças são comandadas pelas IAs neste modo.'});
      if(!this.started)return this.send(ws,{type:'result',ok:false,status:'A partida ainda não começou.'});
      const before=checkpoint(this),res=this.referee.createClient(side).surrender();
      if(res.ok){this.recordReplayAction(side,msg.action);if(!await commit(this,before,ws))return;await this.ctx.storage.deleteAlarm();}
      this.send(ws,{type:'result',...res});this.broadcastViews();return true;
    }
    return false;
  }
  async fetch(request){
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
    if(this.sockets().filter(ws=>ws.readyState==null||ws.readyState===1).length>=16)return new Response('Limite de conexões da sala.',{status:429});
    const generals=new URL(request.url).searchParams.get('generals')==='1';
    if(this.started||Object.keys(this.seatTokens).length){if(this.generals!==generals)return new Response('Modalidade incompatível.',{status:409});}else this.generals=generals;
    const pair=new WebSocketPair();const client=pair[0],server=pair[1];
    this.ctx.acceptWebSocket(server);server.serializeAttachment({side:null});
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,message){const msg=readMessage(this,ws,message);if(!msg)return;if((this.pendingMessages||0)>=64)return this.send(ws,{type:'error',message:'Sala ocupada. Aguarde a resolução das ações.'});return enqueue(this,()=>this.processMessage(ws,msg));}
  async processMessage(ws,msg){
    if(ws.readyState!=null&&ws.readyState!==1)return;
    const att=this.attachment(ws);let side=att.side;
    if(this.generals&&['ready','unready','generalDifficulty','action'].includes(msg.type)&&msg.side!=null){
      if(!(att.controlledSides||[att.side]).includes(msg.side))return this.send(ws,{type:'result',ok:false,status:'Esse exército não pertence ao seu general.'});
      side=msg.side;
    }
    if(msg.type==='join'){await joinSeat(this,ws,msg,['player','enemy']);if(this.attachment(ws).side)await this.scheduleGenerals();return;}
    if(!side)return this.send(ws,{type:'error',message:'Entre na sala primeiro.'});
    if(msg.type==='ping')return this.send(ws,{type:'pong'});
    if(this.generals&&['generalControl','generalDifficulty','action'].includes(msg.type)){await this.generalMessage(ws,msg,side);return;}
    if(msg.type==='setMatchConfig'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'As configurações da partida já estão travadas.'});
      if(side!=='player')return this.send(ws,{type:'result',ok:false,status:'As configurações da partida são definidas pelo Jogador 1.'});
      if(this.generals&&msg.roundLimit!=null&&(!Number.isInteger(msg.roundLimit)||msg.roundLimit<0||msg.roundLimit>500))return this.send(ws,{type:'result',ok:false,status:'Limite de rodadas inválido (0 a 500).'});
      if(this.generals){const before=checkpoint(this),old=structuredClone(this.generalControl);this.matchConfig=this.referee.normalizeMatchConfig(msg.config||{});this.generalControl.roundLimit=msg.roundLimit??this.generalControl.roundLimit??0;this.ready={player:null,enemy:null};if(!await this.safePersist()){restore(this,before);this.generalControl=old;this.send(ws,{type:'result',ok:false,status:'Não foi possível salvar a configuração.'});this.broadcastRoomState();return;}this.broadcastRoomState();this.send(ws,{type:'result',ok:true,status:'Exércitos e limite da observação atualizados.'});return;}
      const before=checkpoint(this);this.matchConfig=this.referee.normalizeMatchConfig(msg.config||{});this.ready={player:null,enemy:null};if(!await commit(this,before,ws))return;this.broadcastRoomState();this.send(ws,{type:'result',ok:true,status:'Configurações da partida atualizadas.'});return;
    }
    if(msg.type==='unready'){
      if(!this.started){const before=checkpoint(this);this.ready[side]=null;if(!await commit(this,before,ws))return;this.send(ws,{type:'result',ok:true,status:'Pronto cancelado. Você pode alterar a preparação.'});this.broadcastRoomState();}return;
    }
    if(msg.type==='ready'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'A partida já começou.'});
      const res=this.referee.validateSetup(side,msg.setup,msg.bases,this.matchConfig.teamSize[side]);if(!res.ok)return this.send(ws,{type:'result',ok:false,status:res.status});
      const before=checkpoint(this);this.ready[side]={setup:msg.setup,bases:msg.bases};
      if(this.ready.player&&this.ready.enemy){const a=this.ready.player,b=this.ready.enemy;const start=this.referee.startMultiplayerGame(a.setup,a.bases,b.setup,b.bases,this.matchConfig);if(!start.ok){restore(this,before);return this.broadcast({type:'result',ok:false,status:start.status});}this.started=true;if(this.generals)this.generalBrains=makeGeneralBrains(this.generalControl);this.resetReplay();}
      if(!await commit(this,before,ws))return;this.send(ws,{type:'result',ok:true,status:this.started?'Partida iniciada.':'Pronto. Aguardando o outro jogador.'});this.broadcastRoomState();this.broadcastViews();await this.scheduleGenerals();return;
    }
    if(msg.type==='action'){
      if(!this.started)return this.send(ws,{type:'result',ok:false,status:'A partida ainda não começou.'});
      const action=msg.action||{},fn=Object.hasOwn(actionMap,action.type)?actionMap[action.type]:null;if(!fn)return this.send(ws,{type:'result',ok:false,status:'Ação desconhecida.'});
      const before=checkpoint(this);let res;try{res=fn(this.referee.createClient(side),action);}catch(e){console.error(e);res={ok:false,status:'Erro interno ao resolver a ação.'};}
      if(res?.ok){this.recordReplayAction(side,action);if(!await commit(this,before,ws))return;}else restore(this,before);this.send(ws,{type:'result',...res});this.broadcastViews();return;
    }
    this.send(ws,{type:'error',message:'Tipo de mensagem desconhecido.'});
  }
  async webSocketClose(ws){return enqueue(this,()=>this.closeSocket(ws));}
  async closeSocket(ws){
    const side=this.attachment(ws).side;if(side&&!this.generals&&!this.started&&!this.sideSocket(side)){this.ready[side]=null;await this.safePersist();}
    this.broadcastRoomState();
  }
  async webSocketError(ws){this.broadcastRoomState();}
}



export class TriGameRoom {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.seatTokens={};this.legacySeats=[];this.referee=new TriReferee();this.ready={A:null,B:null};this.started=false;this.ai=null;this.difficulty='normal';this.matchConfig={teamSize:{A:4,B:4,C:4},lossLimit:{A:3,B:3,C:3}};this.replayInitialState=null;this.replayActions=[];
    ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get('triRoom');if(saved){this.seatTokens=saved.seatTokens||{};this.legacySeats=saved.legacySeats||(saved.started&&!saved.seatTokens?['A','B']:[]);this.ready=saved.ready||{A:null,B:null};this.started=!!saved.started;this.difficulty=['easy','normal','hard','extreme'].includes(saved.difficulty)?saved.difficulty:'normal';this.matchConfig=saved.matchConfig||{teamSize:{A:4,B:4,C:4},lossLimit:{A:3,B:3,C:3}};this.replayInitialState=saved.replayInitialState||null;this.replayActions=await loadReplay(ctx.storage,'triRoom',saved);this.replayPersistedCount=saved.replayChunked?this.replayActions.length:0;if(saved.gameState)this.referee.importState(saved.gameState);if(this.started){this.ai=new TriAI('C',this.difficulty);if(saved.aiState)Object.assign(this.ai,saved.aiState,{side:'C',difficulty:this.difficulty});}}});
  }
  resetReplay(){try{this.replayInitialState=this.referee.exportState();this.replayActions=[];this.replayPersistedCount=0;}catch(e){console.error('Falha ao iniciar Replay da Arena:',e);this.replayInitialState=null;this.replayActions=[];}}
  recordReplayAction(side,action){try{if(!TRI_SIDES.includes(side)||!action)return false;const copy=typeof structuredClone==='function'?structuredClone(action):JSON.parse(JSON.stringify(action));this.replayActions.push({side,action:copy});return true;}catch(e){console.error('Falha ao registrar ação no Replay da Arena:',e);return false;}}
  async persist(){await persistReplay(this,'triRoom',{seatTokens:this.seatTokens,legacySeats:this.legacySeats,ready:this.ready,started:this.started,difficulty:this.difficulty,aiState:this.ai?structuredClone({...this.ai}):null,matchConfig:this.matchConfig,gameState:this.referee.exportState(),replayInitialState:this.replayInitialState});}
  async safePersist(){try{await this.persist();return true;}catch(e){console.error('Falha ao persistir sala Arena Online:',e);return false;}}
  send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
  sockets(){return this.ctx.getWebSockets();}
  attachment(ws){try{return ws.deserializeAttachment()||{};}catch{return {};}}
  sideSocket(side){return activeSocket(this,side);}
  roomState(){return{type:'roomState',started:this.started,connected:{A:!!this.sideSocket('A'),B:!!this.sideSocket('B')},ready:{A:!!this.ready.A,B:!!this.ready.B},ai:'C',difficulty:this.difficulty,matchConfig:this.matchConfig};}
  broadcast(obj){for(const ws of this.sockets())this.send(ws,obj);}
  broadcastRoomState(){this.broadcast(this.roomState());}
  broadcastViews(){if(!this.started)return;for(const side of ['A','B']){const ws=this.sideSocket(side);if(!ws)continue;let view;try{view=this.referee.client(side).getView();this.send(ws,{type:'view',view});}catch(e){console.error('Falha ao gerar visão da Arena para '+side+':',e);continue;}if(view.gameOver&&this.replayInitialState){try{this.send(ws,{type:'arenaReplay',initialState:this.replayInitialState,actions:this.replayActions});}catch(e){console.error('Falha ao enviar Replay da Arena:',e);}}}}
  async runAI(){
    if(!this.started||!this.ai)return;
    let lastFail='',failCount=0;
    for(let guard=0;guard<120;guard++){
      const va=this.referee.client('A').getView(),vb=this.referee.client('B').getView(),v=this.referee.client('C').getView();
      if(v.gameOver||va.pendingCombat||va.doppelChoice||vb.pendingCombat||vb.doppelChoice||!(v.pendingCombat||v.doppelChoice||v.turn==='C'))break;
      const before=checkpoint(this);let act,issued,res;
      try{act=this.ai.decide(v);issued=act&&act.type!=='wait'?act:{type:'end'};res=applyTriAction(this.referee.client('C'),issued);this.ai.reportResult(issued,res,v);}
      catch(err){restore(this,before);console.error('Falha ao resolver ação da IA da Arena:',err);this.broadcast({type:'result',ok:false,status:'A ação da IA não foi concluída. O estado anterior foi preservado; reconecte para tentar retomar.'});this.broadcastRoomState();this.broadcastViews();break;}
      if(!res?.ok){this.referee.importState(before.gameState);const sig=JSON.stringify(issued);failCount=sig===lastFail?failCount+1:1;lastFail=sig;if(failCount<2){await new Promise(r=>setTimeout(r,20));continue;}issued=v.pendingCombat?{type:'combatChoice',advance:false}:v.doppelChoice?{type:'doppel',copyNew:false}:{type:'end'};res=applyTriAction(this.referee.client('C'),issued);if(!res?.ok){this.referee.importState(before.gameState);break;}}
      this.recordReplayAction('C',issued);if(!await commit(this,before))break;
      lastFail='';failCount=0;this.broadcastViews();await new Promise(r=>setTimeout(r,120));
    }
  }
  async fetch(request){if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});if(this.sockets().filter(ws=>ws.readyState==null||ws.readyState===1).length>=16)return new Response('Limite de conexões da sala.',{status:429});
    const pair=new WebSocketPair();const client=pair[0],server=pair[1];this.ctx.acceptWebSocket(server);server.serializeAttachment({side:null});return new Response(null,{status:101,webSocket:client});}
  async webSocketMessage(ws,message){const msg=readMessage(this,ws,message);if(!msg)return;if((this.pendingMessages||0)>=64)return this.send(ws,{type:'error',message:'Sala ocupada. Aguarde a resolução das ações.'});return enqueue(this,()=>this.processMessage(ws,msg));}
  async processMessage(ws,msg){
    if(ws.readyState!=null&&ws.readyState!==1)return;
    const att=this.attachment(ws),side=att.side;
    if(msg.type==='join'){await joinSeat(this,ws,msg,['A','B']);if(this.attachment(ws).side)await this.runAI();return;}
    if(!side)return this.send(ws,{type:'error',message:'Entre na sala primeiro.'});
    if(msg.type==='ping')return this.send(ws,{type:'pong'});
    if(msg.type==='setDifficulty'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'O nível da IA C já está travado para esta partida.'});
      if(side!=='A')return this.send(ws,{type:'result',ok:false,status:'O nível da IA C é definido pelo Jogador A.'});
      const before=checkpoint(this);this.difficulty=['easy','normal','hard','extreme'].includes(msg.difficulty)?msg.difficulty:'normal';
      if(!await commit(this,before,ws))return;this.broadcastRoomState();this.send(ws,{type:'result',ok:true,status:`IA C definida como ${{easy:'Nível 1',normal:'Nível 2',hard:'Nível 3',extreme:'Nível 4'}[this.difficulty]||'Nível 2'}.`});return;
    }
    if(msg.type==='unready'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'A partida já começou.'});
      const before=checkpoint(this);this.ready[side]=null;if(!await commit(this,before,ws))return;
      this.send(ws,{type:'result',ok:true,status:'Pronto cancelado. Ajuste sua formação.'});this.broadcastRoomState();return;
    }
    if(msg.type==='setMatchConfig'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'As configurações da Arena já estão travadas para esta partida.'});
      if(side!=='A')return this.send(ws,{type:'result',ok:false,status:'As configurações da Arena são definidas pelo Jogador A.'});
      const before=checkpoint(this);this.matchConfig=this.referee.normalizeMatchConfig(msg.config||{});this.ready={A:null,B:null};if(!await commit(this,before,ws))return;this.broadcastRoomState();this.send(ws,{type:'result',ok:true,status:'Configurações da Arena atualizadas.'});return;
    }
    if(msg.type==='ready'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'A partida já começou.'});const res=this.referee.validateSetup(side,msg.setup,msg.bases,this.matchConfig.teamSize[side]);if(!res.ok)return this.send(ws,{type:'result',ok:false,status:res.status});
      const before=checkpoint(this);this.ready[side]={setup:msg.setup,bases:msg.bases};
      if(this.ready.A&&this.ready.B){const st=this.referee.startOnline(this.ready.A.setup,this.ready.A.bases,this.ready.B.setup,this.ready.B.bases,this.difficulty,this.matchConfig);if(!st.ok){restore(this,before);return this.broadcast({type:'result',ok:false,status:st.status});}this.started=true;this.ai=new TriAI('C',this.difficulty);this.resetReplay();}
      if(!await commit(this,before,ws))return;this.send(ws,{type:'result',ok:true,status:this.started?'Partida iniciada.':'Pronto. Aguardando o outro jogador.'});this.broadcastRoomState();this.broadcastViews();if(this.started)await this.runAI();return;
    }
    if(msg.type==='action'){
      if(!this.started)return this.send(ws,{type:'result',ok:false,status:'A partida ainda não começou.'});const action=msg.action||{},before=checkpoint(this);let res;try{res=applyTriAction(this.referee.client(side),action);}catch(e){console.error(e);res={ok:false,status:'Erro interno.'};}
      if(res?.ok){this.recordReplayAction(side,action);if(!await commit(this,before,ws))return;}else restore(this,before);this.send(ws,{type:'result',...res});this.broadcastViews();await this.runAI();return;
    }
    this.send(ws,{type:'error',message:'Tipo desconhecido.'});
  }
  async webSocketClose(ws){return enqueue(this,()=>this.closeSocket(ws));}
  async closeSocket(ws){const side=this.attachment(ws).side;if(side&&!this.generals&&!this.started&&!this.sideSocket(side)){this.ready[side]=null;await this.safePersist();}this.broadcastRoomState();}
  async webSocketError(ws){this.broadcastRoomState();}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/ws'){
      const room=String(url.searchParams.get('room')||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);
      if(!room)return new Response('Código de sala inválido.',{status:400});
      return env.GAME_ROOMS.getByName(url.searchParams.get('generals')==='1'?'GENERALS:'+room:room).fetch(request);
    }
    if(url.pathname==='/tri-ws'){
      const room=String(url.searchParams.get('room')||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);
      if(!room)return new Response('Código de sala inválido.',{status:400});
      return env.TRI_ROOMS.getByName(room).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
