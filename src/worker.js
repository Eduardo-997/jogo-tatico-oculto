import {TriReferee,TriAI,applyTriAction,TRI_SIDES} from './tri-core.js';
// Jogo tático v1.13.5 — Cloudflare Worker + Durable Object
// Regras e árbitro mantidos autoritativos no servidor para o X1.
'use strict';
// Batalha nas Sombras v1.15.21 — dificuldade da IA C sincronizada pela sala.
'use strict';
var __gameRoot = typeof window!=='undefined' ? window : globalThis;
__gameRoot.GameRules = (() => {
  const defs = [
    {name:'Arqueiro',icon:'🏹',type:'S',typeIcon:'🗡️',v:1,m:0,a:1,range:99,per:1,ah:0},
    {name:'Ninja',icon:'🗡️',type:'S',typeIcon:'🗡️',v:1,m:2,a:1,range:2,per:1,ah:0},
    {name:'Piromante',icon:'🔥',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Kamikaze',icon:'💣',type:'S',typeIcon:'🗡️',v:1,m:1,a:0,range:1,per:1,ah:1},
    {name:'Caçador',icon:'🐾',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Paranoia',icon:'🧠',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:0},
    {name:'Escudeiro',icon:'🛡️',type:'R',typeIcon:'🛡️',v:2,m:1,a:0,range:1,per:1,ah:0},
    {name:'Golem',icon:'🗿',type:'R',typeIcon:'🛡️',v:2,m:1,a:0,range:1,per:1,ah:0},
    {name:'Cavaleiro',icon:'🐎',type:'R',typeIcon:'🛡️',v:1,m:3,a:1,range:1,per:1,ah:0},
    {name:'Slime',icon:'🟢',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:0},
    {name:'Zumbi',icon:'🧟',type:'R',typeIcon:'🛡️',v:2,m:1,a:1,range:1,per:1,ah:0},
    {name:'Druida',icon:'🌿',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:1},
    {name:'Vidente',icon:'👁️',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:3},
    {name:'Mago do Espelho',icon:'🔮',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:2},
    {name:'Necromante',icon:'☠️',type:'P',typeIcon:'📜',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Doppelgänger',icon:'🎭',type:'P',typeIcon:'📜',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Sentinela',icon:'🦉',type:'P',typeIcon:'📜',v:1,m:2,a:0,range:1,per:1,ah:1},
    {name:'Bardo',icon:'🎵',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:2},
    {name:'Coringa',icon:'🃏',type:'J',typeIcon:'🃏',v:1,m:1,a:0,range:1,per:1,ah:0,diag:true},
    {name:'Fantasma',icon:'👻',type:'J',typeIcon:'🃏',v:1,m:1,a:0,range:1,per:1,ah:0}
  ];
  const skeletonDef={name:'Esqueleto',icon:'💀',type:'C',typeIcon:'🦴',v:1,m:1,a:1,range:1,per:1,ah:0};
  const miniDef={name:'Mini-Slime',icon:'🟢',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:0};
  const lavaDef={name:'Golem de Lava',icon:'🌋',type:'R',typeIcon:'🛡️',v:1,m:0,a:1,range:1,per:1,ah:0};
  const branchDef={name:'Galho-Vivo',icon:'🌲',type:'C',typeIcon:'🦴',v:1,m:1,a:1,range:1,per:1,ah:0};
  const byName = Object.fromEntries(defs.map(d=>[d.name,d]));
  const archetypeNames=Object.freeze({R:'Vanguarda',P:'Estrategista',S:'Executor',J:'Coringa',C:'Condenado'});
  const archetypeName=type=>archetypeNames[type]||type||'—';
  const baseBonuses=[
    {id:'radarAdvanced',icon:'📡',name:'Radar Avançado',description:'A percepção ortogonal da unidade escolhida informa a casa exata com presença.'},
    {id:'radarExpanded',icon:'📶',name:'Radar Ampliado',description:'A unidade escolhida também detecta nas diagonais dentro do alcance de PER e informa se a presença é ortogonal ou diagonal.'},
    {id:'move',icon:'👟',name:'Mobilidade',description:'+1 M permanente para uma unidade aliada viva.'},
    {id:'life',icon:'❤️',name:'Reforço',description:'+1 Vida máxima e +1 Vida atual para uma unidade aliada viva.'},
    {id:'attack',icon:'⚔️',name:'Armamento',description:'+1 ATQ permanente para uma unidade aliada viva.'},
    {id:'range',icon:'🎯',name:'Mira',description:'+1 ALC permanente para uma unidade aliada viva que possua ataque normal.'},
    {id:'abilityRange',icon:'✨',name:'Canalização',description:'+1 Alc. Hab. permanente para uma unidade com habilidade que use Alcance de Habilidade.'}
  ];
  const rc=c=>({x:c.charCodeAt(0)-65,y:Number(c.slice(1))-1});
  const coord=(x,y)=>String.fromCharCode(65+x)+(y+1);
  const inside=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
  const man=(a,b)=>{const A=rc(a),B=rc(b);return Math.abs(A.x-B.x)+Math.abs(A.y-B.y)};
  const sameLine=(a,b)=>{const A=rc(a),B=rc(b);return A.x===B.x||A.y===B.y};
  const treeCells=Object.freeze(['C3','F6']);
  const rockCells=Object.freeze(['F3','C6']);
  const waterCells=Object.freeze(['D4','E5']);
  const blockedCells=Object.freeze([...treeCells,...rockCells]);
  const isBlocked=c=>blockedCells.includes(c);
  const isRock=c=>rockCells.includes(c);
  const isWater=c=>waterCells.includes(c);
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
    return {...base,
      v:Math.max(1,(base.v||0)+(p.bonusV||0)+temp.v),
      m:Math.max(0,(base.m||0)+(p.bonusM||0)+temp.m),
      a:Math.max(0,(base.a||0)+(p.bonusA||0)+temp.a),
      range:Math.max(0,(base.range||0)+(p.bonusRange||0)+temp.range),
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
    if(attack<=0 && p.name!=='Fantasma')return out;
    for(let y=0;y<8;y++) for(let x=0;x<8;x++){
      const c=coord(x,y); if(c!==p.coord&&man(p.coord,c)<=range) out.push(c);
    }
    return out;
  }
  function abilityCells(p){
    const d=defOf(p),out=[];
    // Na interface, p.ah é o Alc. Hab. final; usar esse valor evita perder bônus temporários na marcação.
    const ah=Number.isFinite(Number(p?.ah))?Number(p.ah):d.ah;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=coord(x,y);if(c!==p.coord&&man(p.coord,c)<=ah)out.push(c)}
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
  return Object.freeze({defs,skeletonDef,miniDef,lavaDef,branchDef,baseBonuses,byName,archetypeNames,archetypeName,rc,coord,inside,man,sameLine,treeCells,rockCells,waterCells,blockedCells,isBlocked,isRock,isWater,neighbors,perceptionCells,defOf,attackCells,abilityCells,blastCells,directWinner});
})();


'use strict';
var __refRoot = typeof window!=='undefined' ? window : globalThis;
__refRoot.GameReferee = class GameReferee {
  #R = __refRoot.GameRules;
  #s;
  constructor(){ this.reset(); }

  reset(){
    this.#s={
      phase:'setup', mode:null, round:1, turn:'player', roundStarter:'player', idSeq:1, gameOver:false, result:null, aiDifficulty:'normal',
      pieces:{player:[],enemy:[]}, bases:[], chosenBaseBonuses:{player:[],enemy:[]}, corpses:[], mirrors:[], pendingSlimeSplits:[],
      history:{player:[],enemy:[]}, intel:{player:[],enemy:[]}, impact:{player:null,enemy:null}, combatMarks:{player:[],enemy:[]}, combatHold:{player:false,enemy:false}, perceptionHints:{player:[],enemy:[]},
      seer:{player:new Set(),enemy:new Set()}, seerExpires:{player:false,enemy:false},
      activation:{player:null,enemy:null}, roundActivations:{player:0,enemy:0}, pendingCombat:null, doppelChoice:{player:null,enemy:null},
      trees:[{coord:'B3',state:'live'},{coord:'G6',state:'live'}], rocks:['F2','C7'], water:['D3','E6'], swamps:['C5','F4'], traps:{player:[],enemy:[]}, spotReveals:{player:{},enemy:{}}, replayEvent:null
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
      startAbility:run(()=>self.#startAbility(side)),
      useSeer:run((cells)=>self.#useSeer(side,cells)),
      raiseAt:run((coord)=>self.#raiseAt(side,coord)),
      placeMirror:run((coord)=>self.#placeMirror(side,coord)),
      awakenTree:run((coord)=>self.#awakenTree(side,coord)),
      placeTrap:run((coord)=>self.#placeTrap(side,coord)),
      bardBuff:run((targetId,stat)=>self.#bardBuff(side,targetId,stat)),
      shieldLink:run((targetId=null)=>self.#shieldLink(side,targetId)),
      endActivation:run(()=>self.#endActivationRequest(side)),
      chooseCombatPosition:run((advance)=>self.#chooseCombatPosition(side,advance)),
      sabotageBase:run((baseId,bonusId,targetPieceId=null)=>self.#sabotageBase(side,baseId,bonusId,targetPieceId)),
      chooseDoppelCopy:run((copyNew)=>self.#chooseDoppelCopy(side,copyNew)),
      advanceTrainingRound:run(()=>self.#advanceTrainingRound())
    });
  }

  validateSetup(side,setup,bases){
    if(side!=='player'&&side!=='enemy') return this.#fail('Lado inválido.');
    if(!Array.isArray(setup)||setup.length!==4) return this.#fail('É necessário posicionar exatamente 4 personagens.');
    if(!Array.isArray(bases)||bases.length!==2) return this.#fail('É necessário posicionar exatamente 2 Postos de Operação.');
    const names=new Set(setup.map(x=>x.name)),coords=new Set(setup.map(x=>x.coord)),baseCoords=new Set(bases);
    if(names.size!==4||coords.size!==4) return this.#fail('Personagens e casas iniciais precisam ser únicos.');
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

  startMultiplayerGame(playerSetup,playerBases,enemySetup,enemyBases){
    if(this.#s.phase!=='setup')return this.#fail('A partida já começou.');
    const vp=this.validateSetup('player',playerSetup,playerBases);if(!vp.ok)return vp;
    const ve=this.validateSetup('enemy',enemySetup,enemyBases);if(!ve.ok)return ve;
    this.#s.pieces.player=[];this.#s.pieces.enemy=[];this.#s.bases=[];
    for(const [side,setup,bases] of [['player',playerSetup,playerBases],['enemy',enemySetup,enemyBases]]){
      for(const x of setup){const d=this.#R.byName[x.name];this.#s.pieces[side].push({id:(side==='player'?'p':'e')+this.#s.idSeq++,owner:side,name:d.name,identity:d.name,hp:d.v,coord:x.coord,alive:true,activated:false,original:true,form:null,copied:null,mirrorCooldown:0,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false});}
      bases.forEach((coord,i)=>this.#s.bases.push({id:(side==='player'?'bp':'be')+(i+1),owner:side,coord,sabotaged:false}));
    }
    const starter=Math.random()<.5?'player':'enemy';
    this.#s.phase='play';this.#s.mode='multiplayer';this.#s.round=1;this.#s.roundStarter=starter;this.#s.turn=starter;this.#s.gameOver=false;this.#s.result=null;
    this.#addHistory('player',`🎲 Clássico iniciado. ${starter==='player'?'Você':'O adversário'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    this.#addHistory('enemy',`🎲 Clássico iniciado. ${starter==='enemy'?'Você':'O adversário'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    return this.#ok(`Partida Clássica iniciada. ${starter==='player'?'Jogador 1':'Jogador 2'} começa.`);
  }

  startGame(playerSetup,playerBases,difficulty='normal'){
    if(this.#s.phase!=='setup') return this.#fail('A partida já começou.');
    if(!Array.isArray(playerSetup)||playerSetup.length!==4) return this.#fail('É necessário posicionar exatamente 4 personagens.');
    if(!Array.isArray(playerBases)||playerBases.length!==2) return this.#fail('É necessário posicionar exatamente 2 Postos de Operação.');
    const names=new Set(playerSetup.map(x=>x.name)), coords=new Set(playerSetup.map(x=>x.coord));
    const baseCoords=new Set(playerBases);
    if(names.size!==4||coords.size!==4) return this.#fail('Personagens e casas iniciais precisam ser únicos.');
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
    this.#s.aiDifficulty=['easy','normal','hard','extreme'].includes(difficulty)?difficulty:'normal';
    this.#enemySetup(this.#s.aiDifficulty);
    const starter=Math.random()<.5?'player':'enemy';
    this.#s.phase='play'; this.#s.mode='solo'; this.#s.round=1; this.#s.roundStarter=starter; this.#s.turn=starter; this.#s.gameOver=false; this.#s.result=null;
    this.#addHistory('player',`🎲 Partida iniciada. ${starter==='player'?'Você':'A IA'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    this.#addHistory('enemy',`🎲 Partida iniciada. ${starter==='enemy'?'Você':'O jogador'} começa a rodada 1. A prioridade inicial alterna a cada rodada.`);
    return this.#ok(`Partida iniciada. ${starter==='player'?'Você começa':'A IA começa'}.`);
  }

  startTrainingGame(playerSetup,enemySetup,playerBases,enemyBases){
    if(this.#s.phase!=='setup')return this.#fail('O treino já começou.');
    const all=[...(playerSetup||[]),...(enemySetup||[])];
    if(!Array.isArray(playerSetup)||playerSetup.length!==4||!Array.isArray(enemySetup)||enemySetup.length!==4)return this.#fail('O Treino usa 4 peças em cada lado (8 no total).');
    if(!Array.isArray(playerBases)||playerBases.length!==2||!Array.isArray(enemyBases)||enemyBases.length!==2)return this.#fail('O Treino usa exatamente 2 Postos de Operação em cada lado.');
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
    this.#s.phase='play';this.#s.mode='training';this.#s.round=1;this.#s.turn='player';this.#s.gameOver=false;this.#s.result=null;
    this.#addHistory('player','🧪 Treino iniciado. 4 peças e 2 Postos por lado; ambos os lados podem ser controlados livremente.');
    this.#addHistory('enemy','🧪 Treino iniciado. 4 peças e 2 Postos por lado; ambos os lados podem ser controlados livremente.');
    return this.#ok('Treino iniciado. Controle qualquer lado, teste os Postos e repita turnos livremente.');
  }

  #advanceTrainingRound(){
    if(this.#s.mode!=='training'||this.#s.phase!=='play')return this.#fail('Só é possível avançar rodada no modo Treino.');
    if(this.#s.pendingCombat)return this.#fail('Resolva o Confronto Direto antes de avançar a rodada.');
    if(this.#s.doppelChoice?.player||this.#s.doppelChoice?.enemy)return this.#fail('Resolva a escolha do Doppelgänger antes de avançar a rodada.');
    this.#s.activation.player=null;this.#s.activation.enemy=null;
    this.#s.round++;this.#tickRoundEffects();this.#s.roundActivations={player:0,enemy:0};
    for(const side of ['player','enemy'])for(const p of this.#pieces(side))p.activated=false;
    this.#processZombieRevives();
    this.#addHistory('player',`🔄 Treino avançou manualmente para a rodada ${this.#s.round}.`);
    this.#addHistory('enemy',`🔄 Treino avançou manualmente para a rodada ${this.#s.round}.`);
    return this.#ok(`Rodada ${this.#s.round} do Treino.`);
  }

  #enemySetup(difficulty='normal'){
    // Dificuldade nunca altera informação disponível para a IA. Aqui ela só muda
    // qualidade de composição/posicionamento inicial — especialmente os Postos.
    const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
    let chosen;
    if(difficulty==='easy'){
      chosen=[...this.#R.defs].sort(()=>Math.random()-.5).slice(0,4);
    }else{
      const byType=t=>this.#R.defs.filter(d=>d.type===t);
      chosen=[pick(byType('R')),pick(byType('P')),pick(byType('S'))];
      const remaining=this.#R.defs.filter(d=>!chosen.some(x=>x.name===d.name));
      const joker=remaining.find(d=>d.type==='J');
      const jokerChance=difficulty==='extreme'?0.50:difficulty==='hard'?0.38:0.30;
      chosen.push(joker&&Math.random()<jokerChance?joker:pick(remaining));
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
  #activationKey(p){return p?.summonType==='livingBranch'&&p.druidId?`druid:${p.druidId}`:p?.name==='Druida'?`druid:${p.id}`:p?.id||'';}
  #aliveActivationUnits(side){const keys=new Set();for(const p of this.#pieces(side))if(p.alive)keys.add(this.#activationKey(p));return keys.size;}
  #activationLimit(side){if(this.#s.mode==='training')return Infinity;const own=this.#aliveActivationUnits(side),opp=this.#aliveActivationUnits(this.#other(side));return Math.min(own,opp+1);}
  #hasActivationLeft(side){if(this.#s.mode==='training')return true;const used=this.#s.roundActivations?.[side]||0;if(used>=this.#activationLimit(side))return false;return this.#pieces(side).some(p=>p.alive&&!p.activated);}
  #isCorner(c){const q=this.#R.rc(c);return (q.x===0||q.x===7)&&(q.y===0||q.y===7);}
  #baseAt(c){return this.#s.bases.find(b=>b.coord===c)||null;}
  #baseById(id){return this.#s.bases.find(b=>b.id===id)||null;}
  #treeAt(c){return (this.#s.trees||[]).find(t=>t.coord===c)||null;}
  #rockAt(c){return (this.#s.rocks||[]).includes(c);}
  #waterAt(c){return (this.#s.water||[]).includes(c);}
  #swampAt(c){return (this.#s.swamps||[]).includes(c);}
  #moveCost(c){return this.#swampAt(c)?2:1;}
  #treeBlocks(p,c){if(this.#rockAt(c))return true;const t=this.#treeAt(c);if(!t)return false;return !(p?.name==='Druida'&&t.state==='live');}
  #solidTerrain(c){return this.#rockAt(c)||!!this.#treeAt(c);}
  #isDruidHidden(p){return !!(p?.alive&&p.name==='Druida'&&this.#treeAt(p.coord)?.state==='live');}
  #rawPieceById(side,id){return this.#pieces(side).find(p=>p.id===id)||null;}
  #isGhost(p){return !!p&&(p.identity==='Fantasma'||p.name==='Fantasma')&&!p.possession;}
  #abilityDistance(p,c){return this.#R.man(p.coord,c);}
  #inAbilityRange(p,c,allowSelf=false){const ah=this.#R.defOf(p).ah||0,dist=this.#abilityDistance(p,c);return (allowSelf?dist>=0:dist>0)&&dist<=ah;}
  #shareTurnMate(p){if(!p)return null;if(p.name==='Druida')return this.#pieces(p.owner).find(x=>x.alive&&x.summonType==='livingBranch'&&x.druidId===p.id)||null;if(p.summonType==='livingBranch')return this.#rawPieceById(p.owner,p.druidId);return null;}
  #linkedShieldFor(p){if(!p)return null;return this.#pieces(p.owner).find(x=>x.alive&&x.linkedToId===p.id)||null;}
  #clearShieldLinks(p){if(!p)return;if(p.linkedToId)p.linkedToId=null;for(const q of this.#pieces(p.owner))if(q.linkedToId===p.id)q.linkedToId=null;}
  #noteReplay(type,side,data={}){const e={type,side,round:this.#s.round,...structuredClone(data)},cur=this.#s.replayEvent;if(!cur)this.#s.replayEvent=e;else if(cur.type==='sequence'&&Array.isArray(cur.events))cur.events.push(e);else this.#s.replayEvent={type:'sequence',side,round:this.#s.round,events:[cur,e]};}
  #spottedFor(viewer,p){const x=this.#s.spotReveals?.[viewer]?.[p.id];return !!x&&p.alive;}
  #siegeActive(){return this.#s.phase==='play'&&this.#s.bases.length>=4&&this.#s.bases.every(b=>b.sabotaged);}
  #siegeCells(){if(!this.#siegeActive())return [];const out=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(x===0||x===7||y===0||y===7)out.push(this.#R.coord(x,y));return out;}
  #clearSpotOnTurnStart(p){if(!p)return;for(const side of ['player','enemy'])if(this.#s.spotReveals?.[side]?.[p.id])delete this.#s.spotReveals[side][p.id];}
  #hasBaseBonus(side,id){return this.#s.chosenBaseBonuses[side].includes(id);}
  #pieces(side){return this.#s.pieces[side];}
  #pieceById(side,id){return this.#pieces(side).find(p=>p.id===id&&p.alive);}
  #piecesAt(side,c){return this.#pieces(side).filter(p=>p.alive&&p.coord===c);}
  #pieceAt(side,c){const ps=this.#piecesAt(side,c);return ps.find(p=>p.name==='Escudeiro')||ps[0]||null;}
  #shieldAt(side,c){return this.#piecesAt(side,c).find(p=>p.name==='Escudeiro')||null;}
  #protectedTarget(side,c){const ps=this.#piecesAt(side,c);if(!ps.length)return null;return ps.find(p=>p.name==='Escudeiro')||ps[0];}
  #canShareCell(side,p,c){
    if(this.#treeBlocks(p,c)||this.#baseAt(c))return false;
    if(this.#pieceAt(this.#other(side),c))return true;
    const ps=this.#piecesAt(side,c).filter(x=>x.id!==p.id),isLinker=x=>x?.name==='Escudeiro'||(x?.name==='Doppelgänger'&&x?.copied==='Escudeiro');
    const follower=this.#linkedShieldFor(p);if(follower?.alive&&follower.coord===p.coord&&ps.length)return false;
    if(!ps.length)return true;if(ps.length>=2)return false;return isLinker(p)||ps.some(isLinker);
  }
  #corpseAt(c){return this.#s.corpses.find(x=>x.coord===c);}
  #mirrorAt(c,owner){return this.#s.mirrors.find(m=>m.coord===c&&m.owner===owner);}
  #slimeLineageAlive(side,sourceId){return this.#pieces(side).some(p=>p.alive&&p.summonType==='miniSlime'&&p.slimeLineageId===sourceId);}
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
    if(p.paranoia?.revealed&&viewerSide===p.owner)extraEffects.push({id:'paranoia',name:'Paranoia',icon:'🧠',remaining:p.paranoia.remaining,kind:'debuff',tick:'turn'});
    return {id:p.id,name:p.name,displayName:d.name,icon:d.icon,type:d.type,typeIcon:d.typeIcon||'',hp:p.hp,maxHp:d.v,coord:possessedAway?null:p.coord,alive:possessedAway?false:p.alive,possessedAway,possessing:!!p.possession,activated:p.activated,original:!!p.original,summonType:p.summonType||null,form:p.form||null,copied:p.copied||null,mirrorCooldown:p.mirrorCooldown||0,m:d.m,a:d.a,range:d.range,per:d.per,ah:d.ah||0,diag:!!d.diag,bonusM:p.bonusM||0,bonusV:p.bonusV||0,bonusA:p.bonusA||0,bonusRange:p.bonusRange||0,bonusAH:p.bonusAH||0,radarAdvanced:!!p.bonusRadarAdvanced,radarExpanded:!!p.bonusRadarExpanded,zombiePending:!!p.zombiePending,zombieTurnsLeft:p.zombieTurnsLeft||0,linkedToId:viewerSide===p.owner?(p.linkedToId||null):null,effects:extraEffects.map(e=>({id:e.id||'',name:e.name||'Efeito temporário',icon:e.icon||'⏳',remaining:Math.max(0,Number(e.remaining)||0),kind:e.kind||'neutral',tick:e.tick||'round'}))};
  }

  #getView(side){
    const other=this.#other(side), act=this.#activation(side), visible=[],siegeCells=this.#siegeCells(),siegeSet=new Set(siegeCells);
    for(const e of this.#pieces(other)) if(e.alive&&(this.#s.seer[side].has(e.coord)||this.#spottedFor(side,e)||siegeSet.has(e.coord))) visible.push(this.#publicPiece(e,side));
    const pc=this.#s.pendingCombat;
    const pending=pc&&pc.winnerSide===side?{canChoose:true,canAdvance:!!pc.protectedAllyId||!this.#piecesAt(other,pc.deadCell).length}:null;
    return structuredClone({
      phase:this.#s.phase, round:this.#s.round, turn:this.#s.turn, gameOver:this.#s.gameOver, result:this.#s.result,
      ownPieces:this.#pieces(side).map(p=>this.#publicPiece(p,side)), visibleOpponents:visible,
      bases:this.#s.bases.map(b=>({id:b.id,owner:b.owner,coord:b.coord,sabotaged:b.sabotaged})),
      trees:(this.#s.trees||[]).map(t=>({...t})), rocks:[...(this.#s.rocks||[])], water:[...(this.#s.water||[])], swamps:[...(this.#s.swamps||[])], ownTraps:(this.#s.traps?.[side]||[]).map(t=>({id:t.id,coord:t.coord,kind:t.kind})),
      chosenBaseBonuses:[...this.#s.chosenBaseBonuses[side]], baseBonusCatalog:this.#R.baseBonuses.map(b=>({...b})),
      ownOriginalDeaths:this.#originalDeaths(side), enemyOriginalDeaths:this.#originalDeaths(other), corpses:this.#s.corpses.map(c=>({coord:c.coord})),
      ownMirrors:this.#s.mirrors.filter(m=>m.owner===side).map(m=>({coord:m.coord})), seerArea:[...this.#s.seer[side]], impactCell:this.#s.impact[side], combatCells:[...(this.#s.combatMarks?.[side]||[])],
      history:[...this.#s.history[side]], intel:[...this.#s.intel[side]], perceptionHints:(this.#s.perceptionHints[side]||[]).map(h=>({...h})),
      activation:act?{...act}:null, pendingCombat:pending, doppelChoice:this.#s.doppelChoice[side]?{...this.#s.doppelChoice[side]}:null,
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
    const mate=this.#shareTurnMate(p);if(this.#s.mode!=='training'&&mate?.activated)return this.#fail('Druida e Galho-Vivo compartilham o mesmo turno nesta rodada.');
    const a=this.#activation(side);
    if(a&&a.committed&&a.pieceId!==id) return this.#fail(`O turno de ${this.#R.defOf(this.#activePiece(side)).name} já foi comprometido.`);
    if(!a||a.pieceId!==id)this.#clearSpotOnTurnStart(p);
    this.#s.activation[side]={pieceId:id,committed:a?.pieceId===id?!!a.committed:false,movementUsed:a?.pieceId===id?!!a.movementUsed:false,mode:null,moveRemaining:0,stepsTaken:a?.pieceId===id?(a.stepsTaken||0):0,lastPerception:a?.pieceId===id?(a.lastPerception??null):null,mirrorBlockedCurrentActivation:false};
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
    a.mode=null;a.moveRemaining=0;a.pyroTargets=[];return this.#ok('Ação cancelada. A peça continua selecionada.');
  }

  #commit(side){
    const a=this.#activation(side); if(!a||a.committed)return;
    this.#s.perceptionHints[side]=[];
    if(this.#s.seerExpires[side]){this.#s.seer[side].clear();this.#s.seerExpires[side]=false;}
    const p=this.#activePiece(side);
    a.committed=true;
  }

  #startMove(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Selecione uma peça.');
    const d=this.#R.defOf(p); if(p.linkedToId)return this.#fail(`${this.#R.defOf(p).name} está vinculado e não pode se mover sozinho. Use a habilidade para desvincular primeiro.`); if(a.movementUsed)return this.#fail(`${d.name} já usou o movimento.`); if(d.m<=0)return this.#fail(`${d.name} tem M0 e não pode se mover.`);
    a.mode='move';a.moveRemaining=d.m;return this.#ok(`Prévia de movimento: até ${d.m} ${d.m===1?'passo':'passos'}. Casas de pântano gastam 2 de movimento. Ainda pode cancelar sem gastar.`);
  }

  #moveStep(side,to){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p||a.mode!=='move')return this.#fail('Movimento não iniciado.');
    const d=this.#R.defOf(p), cost=this.#moveCost(to);
    if(a.moveRemaining<=0||!this.#R.neighbors(p.coord,d.diag).includes(to)||!this.#canShareCell(side,p,to)||cost>a.moveRemaining)return this.#fail(cost>1?'Pântano exige 2 de movimento; escolha outra casa ou ganhe mais mobilidade.':'Escolha uma casa válida.');
    this.#commit(side);a.movementUsed=true;a.stepsTaken=(a.stepsTaken||0)+1;
    const from=p.coord,foe=this.#pieceAt(this.#other(side),to),linkedShield=this.#linkedShieldFor(p);
    p.coord=to;
    const trap=this.#triggerTraps(side,p,to);
    if(!p.alive||p.owner!==side){a.mode=null;a.moveRemaining=0;return this.#finishActivation(side);}
    if(foe&&foe.alive){p.coord=from;return this.#resolveDirect(side,p,foe,from,to);}
    if(linkedShield?.alive&&linkedShield.coord===from)linkedShield.coord=to;
    this.#noteReplay('move',side,{piece:this.#R.defOf(p).name,from,to,linkedShield:linkedShield?.alive&&linkedShield.coord===to?this.#R.defOf(linkedShield).name:null,moveCost:cost});
    this.#checkDoppel(side,p);a.moveRemaining-=cost;
    if(a.moveRemaining<=0)return this.#finishMove(side);
    return this.#ok(`${d.name}: ${a.moveRemaining===1?'resta':'restam'} ${a.moveRemaining} ${a.moveRemaining===1?'ponto de movimento':'pontos de movimento'}.${cost>1?' O pântano consumiu 2.':''}${trap?' Armadilha ativada.':''}`);
  }

  #stopMove(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side); if(!a||a.mode!=='move')return this.#fail('Nenhum movimento em andamento.');
    return this.#finishMove(side);
  }

  #finishMove(side){
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Sem peça ativa.');
    if(!a.committed){a.mode=null;a.moveRemaining=0;return this.#ok('Movimento cancelado sem gastar o turno.');}
    a.mode=null;a.moveRemaining=0;
    const other=this.#other(side),d=this.#R.defOf(p),per=Math.max(0,d.per||0);
    const orth=this.#R.perceptionCells(p.coord,per,false);
    const visibleEnemyAt=c=>{const e=this.#pieceAt(other,c);return (e&&!this.#isDruidHidden(e))||this.#mirrorAt(c,other)};
    const orthHits=orth.filter(visibleEnemyAt);
    const diagOnly=this.#R.perceptionCells(p.coord,per,true).filter(c=>!orth.includes(c));
    const diagHits=diagOnly.filter(visibleEnemyAt);
    const expanded=!!p.bonusRadarExpanded,advanced=!!p.bonusRadarAdvanced;
    let detected=per>0&&(orthHits.length>0||(expanded&&diagHits.length>0));
    if(p.name==='Paranoia'&&per>0){
      const realTargets=[];for(const c of orthHits){const e=this.#pieceAt(other,c);if(e&&!this.#isDruidHidden(e))realTargets.push(e);}if(expanded)for(const c of diagHits){const e=this.#pieceAt(other,c);if(e&&!this.#isDruidHidden(e))realTargets.push(e);}
      this.#infectParanoia(p,[...new Map(realTargets.map(x=>[x.id,x])).values()]);
    }
    if(p.paranoia&&!p.paranoia.revealed){p.paranoia.revealed=true;this.#addIntel(side,'🧠 A percepção desta peça está sob efeito de Paranoia por 2 turnos.');}
    const paranoid=!!p.paranoia?.revealed;
    const fake=paranoid&&!detected&&per>0;
    if(fake)detected=true;
    a.lastPerception=detected;
    const hintable=c=>!this.#solidTerrain(c)&&!this.#pieceAt(side,c)&&!this.#baseAt(c);
    const hints=[];
    if(per>0){
      if(advanced&&orthHits.length){for(const c of orthHits)hints.push({coord:c,kind:'exact'});}
      else if(orthHits.length){for(const c of orth.filter(hintable))hints.push({coord:c,kind:'orth'});}
      if(expanded&&diagHits.length){for(const c of diagOnly.filter(hintable))hints.push({coord:c,kind:'diag'});}
      if(fake){
        const pool=orth.filter(hintable);const fakeCell=pool[Math.floor(Math.random()*Math.max(1,pool.length))];
        if(fakeCell){if(advanced)hints.push({coord:fakeCell,kind:'exact'});else for(const c of orth.filter(hintable))hints.push({coord:c,kind:'orth'});}
      }
    }
    this.#s.perceptionHints[side]=hints.filter((h,i,a)=>a.findIndex(x=>x.coord===h.coord&&x.kind===h.kind)===i);
    let msg;
    if(per<=0)msg='◌ PER0: esta unidade não possui percepção.';
    else if(fake)msg=advanced?'📡 presença ortogonal detectada em uma casa exata.':'⚠️ presença inimiga no alcance ortogonal.';
    else if(advanced&&orthHits.length){msg=`📡 presença ortogonal em ${orthHits.join(', ')}`;if(expanded&&diagHits.length)msg+=' + 📶 presença diagonal no alcance';}
    else if(expanded){const parts=[];if(orthHits.length)parts.push('presença ortogonal no alcance');if(diagHits.length)parts.push('presença diagonal no alcance');msg=parts.length?`📶 ${parts.join(' e ')}`:`✓ nenhuma presença no alcance PER${per}`;}
    else msg=orthHits.length?'⚠️ presença inimiga no alcance ortogonal.':`✓ nenhuma presença inimiga no alcance PER${per}.`;
    this.#addIntel(side,`${d.icon} ${d.name}: ${msg}`);
    this.#noteReplay('perception',side,{piece:d.name,coord:p.coord,detected:!!detected,hints:(this.#s.perceptionHints[side]||[]).map(h=>({...h})),text:msg});
    return this.#ok('Movimento encerrado. Agora ataque, use habilidade, sabote um Posto ou encerre.');
  }

  #startAttack(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Selecione uma peça.');
    if(a.mode==='move'&&a.committed)return this.#fail('Primeiro termine ou pare o movimento.');
    const d=this.#R.defOf(p); if(d.a<=0&&!this.#isGhost(p))return this.#fail(`${d.name} tem ATQ0 e não possui ataque normal.`);
    a.moveRemaining=0;
    if(p.name==='Piromante'){a.mode='pyro';a.pyroTargets=[];return this.#ok(`🔥 Escolha 1 ou 2 casas dentro do Alc. Hab. ${d.ah} e confirme o ataque.`,{attackMode:'pyro'});}
    a.mode='attack';return this.#ok(this.#isGhost(p)?'👻 Escolha uma casa em ALC para tentar possuir um inimigo.':'Escolha uma casa para atacar.');
  }

  #attack(side,to){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p||a.mode!=='attack')return this.#fail('Ataque não iniciado.');
    if(!this.#R.attackCells(p).includes(to))return this.#fail('Casa fora do alcance.');
    if(this.#baseAt(to))return this.#fail('Postos de Operação não podem ser atacados; precisam ser sabotados.');
    this.#commit(side);this.#noteReplay('attack',side,{piece:this.#R.defOf(p).name,from:p.coord,cells:[to]});
    if(this.#isGhost(p)){
      const target=this.#protectedTarget(this.#other(side),to);
      if(target){this.#possess(side,p,target);this.#addHistory(side,`👻 Fantasma possuiu ${this.#R.defOf(target).name}.`);this.#addHistory(this.#other(side),'👻 Uma de suas peças foi possuída; sua localização foi perdida.');}
      else {this.#addHistory(side,'👻 O Fantasma tentou possuir a casa, mas não encontrou ninguém.');this.#s.impact[this.#other(side)]=to;}
      a.mode=null;return this.#finishActivation(side);
    }
    this.#hitAttack(side,p,to);a.mode=null;return this.#finishActivation(side);
  }

  #selectPyroTarget(side,to){
    const bad=this.#validateTurn(side);if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='pyro'||p.name!=='Piromante')return this.#fail('Ataque do Piromante não iniciado.');
    if(!this.#inAbilityRange(p,to))return this.#fail(`O Piromante só pode escolher casas dentro do Alc. Hab. ${this.#R.defOf(p).ah}.`);
    if(this.#baseAt(to))return this.#fail('O Piromante não pode atacar Postos de Operação.');
    a.pyroTargets=Array.isArray(a.pyroTargets)?a.pyroTargets:[];
    if(a.pyroTargets.includes(to)){a.pyroTargets=a.pyroTargets.filter(c=>c!==to);return this.#ok('Casa removida da rajada.',{pyroTargets:[...a.pyroTargets]});}
    if(a.pyroTargets.length>=2)return this.#fail('O Piromante pode escolher no máximo 2 casas.');
    a.pyroTargets.push(to);return this.#ok(`${a.pyroTargets.length}/2 ${a.pyroTargets.length===1?'casa escolhida':'casas escolhidas'}.`,{pyroTargets:[...a.pyroTargets]});
  }

  #confirmPyroAttack(side){
    const bad=this.#validateTurn(side);if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='pyro'||p.name!=='Piromante')return this.#fail('Ataque do Piromante não iniciado.');
    const targets=[...(a.pyroTargets||[])];if(targets.length<1||targets.length>2)return this.#fail('Escolha 1 ou 2 casas antes de confirmar.');
    this.#commit(side);a.mode=null;a.pyroTargets=[];this.#noteReplay('attack',side,{piece:'Piromante',from:p.coord,cells:[...targets]});
    this.#addHistory(side,`🔥 Piromante atacou ${targets.length} casa${targets.length===1?'':'s'} na mesma ação.`);
    for(const c of targets)this.#hitAttack(side,p,c);
    return this.#finishActivation(side);
  }

  #startAbility(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side); if(!a||!p)return this.#fail('Selecione uma peça.');
    if(a.mode==='move'&&a.committed)return this.#fail('Primeiro termine o movimento.');
    const ab=this.#effectiveAbility(p),ah=this.#R.defOf(p).ah||0;
    if(ab==='seer'){a.mode='seer';return this.#ok(`👁️ Escolha a primeira casa dentro do Alc. Hab. ${ah} e depois 1 casa ligada por lado.`,{ability:'seer'});}
    if(ab==='shieldLink'){const actor=this.#R.defOf(p).name;if(p.linkedToId){a.mode='shieldUnlink';return this.#ok(`🛡️ ${actor} está vinculado. Confirme para desvincular e gastar este turno.`,{ability:'shieldUnlink',confirm:true});}const mates=this.#piecesAt(side,p.coord).filter(x=>x.id!==p.id&&x.alive);if(!mates.length)return this.#fail(`Para vincular, ${actor} precisa dividir a casa com um aliado.`);a.mode='shieldLink';return this.#ok('🛡️ Escolha o aliado que está na mesma casa para vincular.',{ability:'shieldLink'});}
    if(ab==='raise'){
      const has=this.#pieces(side).some(x=>x.alive&&x.summonType==='skeleton'&&x.summonerId===p.id);if(has)return this.#fail('Este Necromante já controla um Esqueleto vivo.');
      const legal=this.#s.corpses.filter(x=>this.#inAbilityRange(p,x.coord)&&!this.#pieceAt(side,x.coord));
      a.mode='raise';return this.#ok(legal.length?`☠️ Escolha um cadáver dentro do Alc. Hab. ${ah}.`:`☠️ Alc. Hab. ${ah} marcado. Nenhum cadáver válido no alcance no momento.`,{ability:'raise'});
    }
    if(ab==='mirror'){a.mode='mirror';return this.#ok(`🪞 Escolha uma casa dentro do Alc. Hab. ${ah}. Diagonais entram naturalmente pelo custo de distância.`,{ability:'mirror'});}
    if(ab==='awaken'){const legal=(this.#s.trees||[]).filter(t=>t.state==='live'&&this.#inAbilityRange(p,t.coord)&&!this.#piecesAt(side,t.coord).length&&!this.#pieceAt(this.#other(side),t.coord));a.mode='awaken';return this.#ok(legal.length?`🌿 Escolha uma árvore viva dentro do Alc. Hab. ${ah} para criar Galho-Vivo.`:`🌿 Alc. Hab. ${ah} marcado. Nenhuma árvore viva válida no alcance no momento.`,{ability:'awaken'});}
    if(ab==='spotTrap'){a.mode='spotTrap';return this.#ok(`🦉 Escolha uma casa dentro do Alc. Hab. ${ah} para colocar uma armadilha de revelação. Máximo 2.`,{ability:'spotTrap'});}
    if(ab==='damageTrap'){a.mode='damageTrap';return this.#ok(`🕳️ Escolha uma casa dentro do Alc. Hab. ${ah} para colocar a armadilha de dano.`,{ability:'damageTrap'});}
    if(ab==='bard'){a.mode='bard';return this.#ok(`🎵 Escolha 1 aliado dentro do Alc. Hab. ${ah}.`,{ability:'bard'});}
    if(p.name==='Doppelgänger')return this.#fail(p.copied?`A habilidade copiada de ${p.copied} ainda não possui efeito ativo compatível.`:'Doppelgänger ainda não copiou habilidade.');
    return this.#fail(`${this.#R.defOf(p).name} não possui habilidade ativa.`);
  }

  #effectiveAbility(p){
    const name=p.name==='Doppelgänger'?p.copied:p.name;
    if(name==='Escudeiro')return'shieldLink';if(name==='Vidente')return'seer';if(name==='Necromante')return'raise';if(name==='Mago do Espelho')return'mirror';if(name==='Druida')return'awaken';if(name==='Sentinela')return'spotTrap';if(name==='Caçador')return'damageTrap';if(name==='Bardo')return'bard';return null;
  }

  #useSeer(side,cells){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='seer')return this.#fail('Visão não iniciada.');
    if(!Array.isArray(cells)||cells.length!==2||new Set(cells).size!==2)return this.#fail('Selecione 2 casas ligadas.');
    const main=cells[0],second=cells[1];if(this.#R.man(p.coord,main)>this.#R.defOf(p).ah)return this.#fail(`A primeira casa está fora do Alc. Hab. ${this.#R.defOf(p).ah}.`);if(!this.#R.neighbors(main,false).includes(second))return this.#fail('A segunda casa precisa estar ligada por lado à primeira.');
    this.#commit(side);this.#s.seer[side]=new Set(cells);const seen=this.#pieces(this.#other(side)).filter(e=>e.alive&&this.#s.seer[side].has(e.coord)).length;
    this.#addIntel(side,`👁️ Área do Vidente: ${seen} ${seen===1?'presença detectada':'presenças detectadas'} nas 2 casas.`);this.#addHistory(side,'👁️ Vidente ativou visão em 2 casas ligadas.');this.#noteReplay('seer',side,{piece:this.#R.defOf(p).name,cells:[...cells],seen});this.#s.seerExpires[side]=true;a.mode=null;return this.#finishActivation(side);
  }

  #shieldLink(side,targetId=null){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||this.#effectiveAbility(p)!=='shieldLink'||!['shieldLink','shieldUnlink'].includes(a.mode))return this.#fail('Vínculo não iniciado.');
    if(a.mode==='shieldUnlink'){if(!p.linkedToId)return this.#fail('Escudeiro não está vinculado.');const target=this.#rawPieceById(side,p.linkedToId),name=target?this.#R.defOf(target).name:'aliado';this.#commit(side);p.linkedToId=null;this.#addHistory(side,`🛡️ ${this.#R.defOf(p).name} se desvinculou de ${name}.`);this.#noteReplay('ability',side,{piece:this.#R.defOf(p).name,ability:'Desvincular',coord:p.coord,text:`Escudeiro se desvinculou de ${name}.`});a.mode=null;return this.#finishActivation(side);}
    const target=this.#pieceById(side,targetId);if(!target||target.id===p.id||target.coord!==p.coord)return this.#fail('Escolha um aliado vivo na mesma casa do Escudeiro.');this.#commit(side);p.linkedToId=target.id;this.#addHistory(side,`🛡️ ${this.#R.defOf(p).name} se vinculou a ${this.#R.defOf(target).name}. Enquanto estiverem juntos, acompanhará os movimentos do aliado.`);this.#noteReplay('ability',side,{piece:this.#R.defOf(p).name,ability:'Vincular',coord:p.coord,target:this.#R.defOf(target).name,text:`Vinculado a ${this.#R.defOf(target).name}.`});a.mode=null;return this.#finishActivation(side);
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
    if(this.#pieceAt(this.#other(side),c))return this.#fail('Não foi possível criar o Espelho nessa casa.');
    this.#commit(side);this.#s.mirrors=this.#s.mirrors.filter(m=>!(m.owner===side&&m.mageId===p.id));this.#s.mirrors.push({owner:side,coord:c,mageId:p.id});
    this.#addHistory(side,'🪞 Mago do Espelho criou um Espelho invisível para o adversário.');this.#addIntel(side,'🪞 Seu Espelho gera falsa presença e reflete o primeiro ataque que acertá-lo.');a.mode=null;return this.#finishActivation(side);
  }

  #awakenTree(side,c){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='awaken')return this.#fail('Despertar não iniciado.');
    const tree=this.#treeAt(c);if(!tree||tree.state!=='live'||!this.#inAbilityRange(p,c)||this.#pieceAt(side,c)||this.#pieceAt(this.#other(side),c))return this.#fail('Árvore inválida para despertar.');
    const existing=this.#pieces(side).find(x=>x.alive&&x.summonType==='livingBranch'&&x.druidId===p.id);if(existing)return this.#fail('Este Druida já controla um Galho-Vivo.');
    this.#commit(side);this.#s.trees=this.#s.trees.filter(t=>t!==tree);const summon={id:(side==='player'?'p':'e')+this.#s.idSeq++,owner:side,name:'Galho-Vivo',hp:1,coord:c,alive:true,activated:true,original:false,summonType:'livingBranch',druidId:p.id,effects:[],bonusM:0,bonusV:0,bonusA:0,bonusRange:0,bonusAH:0,bonusRadarAdvanced:false,bonusRadarExpanded:false};this.#pieces(side).push(summon);this.#addHistory(side,'🌿 Druida deu vida a uma árvore: Galho-Vivo despertou.');a.mode=null;return this.#finishActivation(side);
  }
  #placeTrap(side,c){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||!['spotTrap','damageTrap'].includes(a.mode))return this.#fail('Armadilha não iniciada.');
    if(!this.#inAbilityRange(p,c)||this.#solidTerrain(c)||this.#baseAt(c))return this.#fail('Casa inválida para a armadilha.');
    const kind=a.mode==='spotTrap'?'spot':'damage',limit=kind==='spot'?2:1;this.#commit(side);let arr=this.#s.traps[side];arr=arr.filter(t=>!(t.placerId===p.id&&t.coord===c));const owned=arr.filter(t=>t.placerId===p.id&&t.kind===kind).sort((x,y)=>x.seq-y.seq);while(owned.length>=limit){const old=owned.shift();arr=arr.filter(t=>t.id!==old.id);}arr.push({id:'t'+this.#s.idSeq++,owner:side,placerId:p.id,kind,coord:c,seq:this.#s.idSeq});this.#s.traps[side]=arr;this.#addHistory(side,kind==='spot'?'🦉 Sentinela preparou uma armadilha de revelação oculta.':'🕳️ Caçador preparou uma armadilha de dano oculta.');a.mode=null;return this.#finishActivation(side);
  }
  #bardBuff(side,targetId,stat){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p||a.mode!=='bard')return this.#fail('Inspiração não iniciada.');const target=this.#pieceById(side,targetId);if(!target||target.id===p.id)return this.#fail('Escolha outro aliado vivo.');if(this.#R.man(p.coord,target.coord)>this.#R.defOf(p).ah)return this.#fail(`Aliado fora do Alc. Hab. ${this.#R.defOf(p).ah}.`);const map={attack:['ATQ','a'],range:['ALC','range'],abilityRange:['Alc. Hab.','ah'],move:['M','m'],life:['Vida','v']};if(!map[stat])return this.#fail('Bônus inválido.');
    this.#commit(side);this.#clearBardEffects(p.id,side);const [label,key]=map[stat],mods={[key]:1};target.effects=target.effects||[];target.effects.push({id:`bard-${p.id}`,name:`Inspiração +1 ${label}`,icon:'🎵',kind:'buff',public:true,sourceBardId:p.id,expireAfterSourceTurn:(p.turnsTaken||0)+2,modifiers:mods,remaining:1,tick:'bardTurn',tempLife:stat==='life'?1:0});if(stat==='life')target.hp+=1;this.#addHistory(side,`🎵 Bardo inspirou ${this.#R.defOf(target).name}: +1 ${label} até o fim do próximo turno do Bardo.`);a.mode=null;return this.#finishActivation(side);
  }
  #infectParanoia(source,targets){
    const other=this.#other(source.owner);let active=this.#pieces(other).filter(x=>x.paranoia?.sourceId===source.id&&x.paranoia.remaining>0).length;for(const t of targets){if(active>=2)break;if(t.paranoia?.sourceId===source.id)continue;t.paranoia={sourceId:source.id,remaining:2,revealed:false};active++;}
  }
  #triggerTraps(moverSide,p,to){
    const enemy=this.#other(moverSide),hits=(this.#s.traps?.[enemy]||[]).filter(t=>t.coord===to);if(!hits.length)return false;let any=false;
    for(const t of hits){any=true;this.#s.traps[enemy]=this.#s.traps[enemy].filter(x=>x.id!==t.id);this.#noteReplay('trap',enemy,{coord:to,kind:t.kind,target:this.#R.defOf(p).name});if(t.kind==='spot'){this.#s.spotReveals[enemy][p.id]={};this.#addIntel(enemy,`📍 Armadilha da Sentinela revelou ${this.#R.defOf(p).name} em ${to} até o início do próximo turno dessa peça.`);this.#addHistory(moverSide,'🦉 Você ativou uma armadilha inimiga e sua posição foi revelada.');}else{this.#addHistory(enemy,`🕳️ Armadilha do Caçador atingiu ${this.#R.defOf(p).name} antes da resolução da casa.`);this.#addHistory(moverSide,'🕳️ Uma armadilha inimiga causou 1 de dano.');this.#damage(p,1);this.#resolveSlimeSplits();}}
    return any;
  }
  #possess(side,ghost,target){
    if(!ghost?.alive||!target?.alive)return false;const targetSide=target.owner,coord=target.coord;
    this.#clearShieldLinks(target);
    ghost.possession={hostSide:targetSide,hostId:target.id,hostSnapshot:structuredClone(target),ghostState:{name:'Fantasma',form:ghost.form||null,copied:ghost.copied||null,bonusM:ghost.bonusM||0,bonusV:ghost.bonusV||0,bonusA:ghost.bonusA||0,bonusRange:ghost.bonusRange||0,bonusAH:ghost.bonusAH||0,effects:structuredClone(ghost.effects||[])}};
    target.alive=false;target.possessedBy=ghost.id;target.coord=null;
    ghost.name=target.name;ghost.form=target.form||null;ghost.copied=target.copied||null;ghost.hp=target.hp;ghost.coord=coord;ghost.bonusM=target.bonusM||0;ghost.bonusV=target.bonusV||0;ghost.bonusA=target.bonusA||0;ghost.bonusRange=target.bonusRange||0;ghost.bonusAH=target.bonusAH||0;ghost.bonusRadarAdvanced=!!target.bonusRadarAdvanced;ghost.bonusRadarExpanded=!!target.bonusRadarExpanded;ghost.effects=structuredClone(target.effects||[]);
    const others=this.#piecesAt(targetSide,coord).filter(x=>x.id!==target.id);for(const ally of others){const dest=this.#R.neighbors(coord,false).find(c=>!this.#solidTerrain(c)&&!this.#baseAt(c)&&!this.#pieceAt(targetSide,c)&&!this.#pieceAt(side,c));if(dest)ally.coord=dest;}
    return true;
  }
  #breakPossession(ghost){
    const pos=ghost?.possession;if(!pos)return null;const coord=ghost.coord,target=this.#rawPieceById(pos.hostSide,pos.hostId);if(target){const snap=pos.hostSnapshot;Object.assign(target,snap);target.alive=true;target.possessedBy=null;target.coord=coord;target.hp=ghost.hp;target.form=ghost.form||null;target.copied=ghost.copied||null;target.bonusM=ghost.bonusM||0;target.bonusV=ghost.bonusV||0;target.bonusA=ghost.bonusA||0;target.bonusRange=ghost.bonusRange||0;target.bonusAH=ghost.bonusAH||0;target.effects=structuredClone(ghost.effects||[]);}
    const gs=pos.ghostState;ghost.name='Fantasma';ghost.identity='Fantasma';ghost.form=gs.form;ghost.copied=gs.copied;ghost.bonusM=gs.bonusM;ghost.bonusV=gs.bonusV;ghost.bonusA=gs.bonusA;ghost.bonusRange=gs.bonusRange;ghost.bonusAH=gs.bonusAH;ghost.effects=gs.effects;ghost.possession=null;ghost.hp=0;this.#clearShieldLinks(ghost);ghost.alive=false;ghost.coord=coord;this.#createCorpse(ghost);this.#addHistory(ghost.owner,'☠️ Seu Fantasma foi expulso e morreu; o hospedeiro voltou ao dono original.');this.#addHistory(pos.hostSide,'👻 Sua peça foi recuperada após a morte do Fantasma.');return target;
  }

  #sabotageBase(side,baseId,bonusId,targetPieceId=null){
    const bad=this.#validateTurn(side);if(bad)return bad;const a=this.#activation(side),p=this.#activePiece(side);if(!a||!p)return this.#fail('Selecione uma peça para sabotar o Posto.');if(a.mode)return this.#fail('Cancele ou termine a ação atual antes de sabotar.');const base=this.#baseById(baseId);if(!base||base.owner===side)return this.#fail('Escolha um Posto inimigo.');if(base.sabotaged)return this.#fail('Esse Posto já foi sabotado.');if(!this.#R.neighbors(base.coord,true).includes(p.coord))return this.#fail('Para sabotar, a peça precisa estar em uma das 8 casas ao redor do Posto.');const bonus=this.#R.baseBonuses.find(b=>b.id===bonusId);if(!bonus)return this.#fail('Benefício inválido.');if(this.#hasBaseBonus(side,bonusId))return this.#fail('Esse benefício já foi escolhido nesta partida.');
    let target=null;if(['radarAdvanced','radarExpanded','move','life','attack','range','abilityRange'].includes(bonusId)){target=this.#pieceById(side,targetPieceId);if(!target)return this.#fail('Escolha uma unidade aliada viva para receber o benefício.');if(bonusId==='range'&&this.#R.defOf(target).a<=0)return this.#fail('Mira só pode ser aplicada a um personagem que já possua ataque normal.');if(bonusId==='abilityRange'&&this.#R.defOf(target).ah<=0)return this.#fail('Canalização só pode ser aplicada a uma habilidade que use Alc. Hab.');}
    this.#commit(side);base.sabotaged=true;this.#s.chosenBaseBonuses[side].push(bonusId);if(target){if(bonusId==='move')target.bonusM=(target.bonusM||0)+1;if(bonusId==='life'){target.bonusV=(target.bonusV||0)+1;target.hp+=1;}if(bonusId==='attack')target.bonusA=(target.bonusA||0)+1;if(bonusId==='range')target.bonusRange=(target.bonusRange||0)+1;if(bonusId==='abilityRange')target.bonusAH=(target.bonusAH||0)+1;if(bonusId==='radarAdvanced')target.bonusRadarAdvanced=true;if(bonusId==='radarExpanded')target.bonusRadarExpanded=true;}
    const detail=target?`${bonus.icon} ${bonus.name} em ${this.#R.defOf(target).name}`:`${bonus.icon} ${bonus.name}`;this.#addHistory(side,`🏰 Posto inimigo sabotado. Benefício escolhido: ${detail}.`);this.#addHistory(this.#other(side),'🏚️ Um dos seus Postos de Operação foi sabotado.');if(this.#siegeActive()){const msg='👁️ Cerco Final: todos os Postos foram sabotados. A borda externa do tabuleiro agora revela permanentemente qualquer unidade para os dois lados.';this.#addHistory('player',msg);this.#addHistory('enemy',msg);}a.mode=null;return this.#finishActivation(side);
  }

  #endActivationRequest(side){
    const bad=this.#validateTurn(side); if(bad)return bad;
    const p=this.#activePiece(side);if(!p)return this.#fail('Selecione uma peça.');this.#commit(side);return this.#finishActivation(side);
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
    if(p.name==='Druida')this.#collapseDruidBranches(p);
    if(p.name==='Bardo')this.#clearBardEffects(p.id,p.owner);
    if(p.name==='Slime'&&p.original)this.#s.pendingSlimeSplits.push({owner:p.owner,coord:p.coord,lineageId:p.id,bonusM:p.bonusM||0,bonusV:p.bonusV||0,bonusA:p.bonusA||0,bonusRange:p.bonusRange||0,bonusAH:p.bonusAH||0,bonusPer:p.bonusPer||0,bonusRadarAdvanced:!!p.bonusRadarAdvanced,bonusRadarExpanded:!!p.bonusRadarExpanded,effects:(p.effects||[]).map(e=>structuredClone(e))});else this.#createCorpse(p);
    if(p.summonType==='miniSlime'&&p.slimeLineageId&&!this.#slimeLineageAlive(p.owner,p.slimeLineageId)){this.#addHistory(p.owner,'☠️ O último Mini-Slime caiu. A linhagem do Slime foi eliminada e agora conta como 1 perda.');this.#addHistory(this.#other(p.owner),'☠️ Uma eliminação inimiga foi confirmada.');}
    if(p.name==='Kamikaze'&&p.original)this.#explodeKamikaze(p);
  }
  #collapseDruidBranches(druid){for(const b of this.#pieces(druid.owner).filter(x=>x.alive&&x.summonType==='livingBranch'&&x.druidId===druid.id)){const c=b.coord;this.#clearShieldLinks(b);b.alive=false;this.#s.trees.push({coord:c,state:'live'});this.#addHistory(druid.owner,'🌳 Com a morte do Druida, Galho-Vivo voltou a ser uma árvore normal.');}}
  #clearBardEffects(bardId,side){for(const q of this.#pieces(side)){const removed=(q.effects||[]).filter(e=>e.sourceBardId===bardId),temp=removed.reduce((n,e)=>n+Math.max(0,Number(e.tempLife)||0),0);q.effects=(q.effects||[]).filter(e=>e.sourceBardId!==bardId);if(temp&&q.alive)q.hp=Math.max(1,q.hp-temp);const max=this.#R.defOf(q).v;if(q.hp>max)q.hp=max;}}
  #processZombieRevives(){for(const side of ['player','enemy'])for(const p of this.#pieces(side)){if(!p.zombiePending||p.zombieReviveRound>this.#s.round)continue;const free=c=>c&&!this.#solidTerrain(c)&&!this.#baseAt(c)&&!this.#pieceAt('player',c)&&!this.#pieceAt('enemy',c);let c=free(p.zombieDeathCoord)?p.zombieDeathCoord:this.#R.neighbors(p.zombieDeathCoord,false).find(free);if(!c)continue;p.coord=c;p.hp=1;p.alive=true;p.zombiePending=false;p.zombieRevived=true;p.zombieTurnsLeft=3;p.activated=false;this.#addHistory(side,`🧟 Zumbi se levantou em ${c} com 1 Vida e terá 3 turnos antes de cair definitivamente.`);}}
  #expireBardAfterTurn(bard){bard.turnsTaken=(bard.turnsTaken||0)+1;for(const q of this.#pieces(bard.owner)){const expired=(q.effects||[]).filter(e=>e.sourceBardId===bard.id&&bard.turnsTaken>=(e.expireAfterSourceTurn||Infinity));if(!expired.length)continue;const temp=expired.reduce((n,e)=>n+Math.max(0,Number(e.tempLife)||0),0);q.effects=(q.effects||[]).filter(e=>!expired.includes(e));if(temp&&q.alive)q.hp=Math.max(1,q.hp-temp);const max=this.#R.defOf(q).v;if(q.hp>max)q.hp=max;this.#addHistory(bard.owner,`🎵 A Inspiração em ${this.#R.defOf(q).name} terminou.`);}}

  #damage(p,n){
    if(!p||!p.alive)return{dead:true,transform:false};
    if(p.possession){const hostName=this.#R.defOf(p).name;this.#breakPossession(p);return{dead:false,transform:false,possessionBroken:true,hostName};}
    let pending=Math.max(0,Number(n)||0);for(const e of p.effects||[]){if(!pending)break;const temp=Math.max(0,Number(e.tempLife)||0);if(!temp)continue;const used=Math.min(temp,pending);e.tempLife=temp-used;pending-=used;}
    p.hp-=n;if(p.name==='Golem'&&!p.form&&p.hp>0){p.form='lava';p.hp=1+(p.bonusV||0);return{dead:false,transform:true};}
    if(p.hp<=0){const zombieWasFirst=p.name==='Zumbi'&&p.original&&!p.zombieRevived;this.#kill(p);return{dead:!zombieWasFirst&&!p.alive,transform:false,zombieDown:zombieWasFirst};}return{dead:false,transform:false};
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
    const other=this.#other(side),d=this.#R.defOf(attacker),mir=this.#mirrorAt(to,other);
    if(mir){this.#s.mirrors=this.#s.mirrors.filter(m=>m!==mir);const res=this.#damage(attacker,d.a);this.#addHistory(side,`🪞 O ataque do seu ${d.name} foi refletido por um Espelho.${res.dead?' Seu atacante morreu.':res.possessionBroken?' A possessão foi quebrada.':''}`);this.#addHistory(other,`🪞 Seu Espelho refletiu um ataque.${res.dead?' O atacante inimigo morreu.':''}`);this.#resolveSlimeSplits();return;}
    const friendly=this.#protectedTarget(side,to),hostile=this.#protectedTarget(other,to),target=friendly||hostile,dist=this.#R.man(attacker.coord,to);if(!target){this.#addHistory(side,`${d.icon} ${d.name} atacou, mas não atingiu ninguém.`);this.#addIntel(other,'💥 Ataque inimigo detectado: a casa atingida foi marcada no tabuleiro.');this.#s.impact[other]=to;return;}
    const targetSide=target.owner,stacked=this.#piecesAt(targetSide,to).length>1&&target.name==='Escudeiro';const before=this.#R.defOf(target).name,res=this.#damage(target,d.a),friendlyFire=targetSide===side,slimeSplit=target.name==='Slime'&&target.original&&res.dead;
    if(res.possessionBroken){this.#addHistory(side,`👻 O golpe expulsou o Fantasma de ${res.hostName}; a peça foi recuperada pelo dono original.`);this.#addHistory(targetSide,`👻 ${res.hostName} foi recuperado após a morte do Fantasma.`);this.#s.impact[targetSide]=to;return;}
    if(res.zombieDown){this.#addHistory(side,`🧟 ${before} caiu, mas ainda não conta como eliminação.`);this.#addHistory(targetSide,`🧟 Seu Zumbi caiu e tentará voltar.`);return;}
    if(friendlyFire){this.#addHistory(side,slimeSplit?`🟢 Seu Slime foi rompido pelo seu ${d.name} e vai se dividir.`:res.dead?`⚠️ Seu ${before} foi eliminado pelo seu ${d.name}.`:res.transform?'🌋 Você atingiu seu Golem e o transformou em Golem de Lava.':`⚠️ Seu ${before} foi atingido pelo seu ${d.name}.`);if(stacked)this.#addIntel(side,'🛡️ Seu Escudeiro interceptou o ataque aliado e protegeu a outra peça.');}
    else{if(dist===1)this.#addHistory(side,slimeSplit?`🟢 Slime inimigo foi rompido por ${d.name} e se dividiu.`:res.dead?`☠️ ${before} inimigo eliminado por ${d.name}.`:res.transform?'🌋 Golem inimigo virou Golem de Lava.':`⚔️ ${before} inimigo foi atingido por ${d.name}.`);else this.#addHistory(side,slimeSplit?'🎯 O alvo distante foi atingido, mas nenhuma eliminação foi confirmada.':res.dead?'☠️ Um alvo distante foi eliminado.':'🎯 Um alvo distante foi atingido.');if(stacked)this.#addIntel(side,'🛡️ O Escudeiro inimigo interceptou o dano destinado à casa.');if(dist===1)this.#addHistory(other,slimeSplit?`🟢 Seu Slime foi rompido por ${d.name} e vai se dividir.`:res.dead?`☠️ Seu ${before} foi eliminado por ${d.name}.`:res.transform?'🌋 Seu Golem virou Golem de Lava.':`⚔️ Seu ${before} foi atingido por ${d.name}.`);else this.#addHistory(other,slimeSplit?'🟢 Seu Slime foi atingido por ataque distante e vai se dividir.':res.dead?`☠️ Seu ${before} foi eliminado por ataque distante.`:`🎯 Seu ${before} foi atingido por ataque distante.`);if(stacked)this.#addIntel(other,'🛡️ Seu Escudeiro protegeu a outra peça na mesma casa.');this.#s.impact[other]=to;}
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
    const p=this.#pieceById(side,ch.pieceId);if(p&&copyNew)p.copied=ch.newAbility;this.#s.doppelChoice[side]=null;
    this.#addIntel(side,copyNew?`🎭 Doppelgänger agora mantém ${ch.newAbility}.`:`🎭 Doppelgänger manteve ${ch.current}.`);
    return this.#ok('Escolha do Doppelgänger confirmada.');
  }

  #resolveDirect(attackerSide,att,def,from,to){
    const defenderSide=this.#other(attackerSide),r=this.#R.directWinner(att,def),aName=this.#R.defOf(att).name,dName=this.#R.defOf(def).name;const a=this.#activation(attackerSide);if(a){a.mode=null;a.moveRemaining=0;}
    for(const s of ['player','enemy'])this.#s.combatMarks[s]=[...new Set([...(this.#s.combatMarks[s]||[]),to])];this.#s.combatHold[attackerSide]=true;this.#noteReplay('combat',attackerSide,{coord:to,attacker:aName,defender:dName});
    if(r==='tie'){att.coord=from;this.#addHistory(attackerSide,`↩️ ${aName} foi repelido por ${dName}.`);this.#addHistory(defenderSide,`↩️ ${aName} inimigo foi repelido pelo seu ${dName}.`);return this.#finishActivation(attackerSide);}
    const attackerWins=r==='att',winner=attackerWins?att:def,loser=attackerWins?def:att;
    if(this.#isGhost(winner)){
      this.#possess(winner.owner,winner,loser);const dest=loser===def?to:from;winner.coord=dest;this.#addHistory(winner.owner,`👻 Fantasma venceu o Confronto e possuiu ${this.#R.defOf(loser).name}.`);this.#addHistory(loser.owner,'👻 Sua peça foi possuída em Confronto Direto e desapareceu da sua visão.');return this.#finishActivation(attackerSide);
    }
    const before=this.#R.defOf(loser).name,res=this.#damage(loser,1);this.#resolveSlimeSplits();
    if(res.possessionBroken){att.coord=from;const msg=`👻 O Confronto expulsou o Fantasma de ${res.hostName}; a peça original foi recuperada.`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);return this.#finishActivation(attackerSide);}
    if(!res.dead){att.coord=from;const msg=res.zombieDown?`🧟 ${before} caiu no Confronto, mas ainda não conta como eliminação.`:res.transform?`🌋 ${this.#R.defOf(winner).name} venceu o Confronto contra ${before}; ${before} sofreu 1 e virou Golem de Lava.`:`⚔️ ${this.#R.defOf(winner).name} venceu o Confronto e causou 1 em ${before}, que sobreviveu.`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);return this.#finishActivation(attackerSide);}
    if(!winner.alive){const msg=`💥 ${before} morreu, mas a reação também eliminou ${this.#R.defOf(winner).name}.`;this.#addHistory(attackerSide,msg);this.#addHistory(defenderSide,msg);return this.#finishActivation(attackerSide);}
    const slimeSplit=loser.name==='Slime'&&loser.original,directMsg=slimeSplit?`🟢 Slime foi rompido por ${this.#R.defOf(winner).name} no Confronto Direto e se dividiu.`:`☠️ ${before} eliminado por ${this.#R.defOf(winner).name} em Confronto Direto.`;this.#addHistory(attackerSide,directMsg);this.#addHistory(defenderSide,directMsg);
    const ownCell=winner===att?from:to,deadCell=winner===att?to:from,winnerSide=winner.owner;const protectedAlly=loser.name==='Escudeiro'?this.#piecesAt(loser.owner,deadCell).find(x=>x.id!==loser.id):null;const shieldProtected=loser.name==='Escudeiro'&&protectedAlly&&protectedAlly.alive;winner.coord=ownCell;this.#s.pendingCombat={winnerId:winner.id,winnerSide,ownCell,deadCell,afterSide:attackerSide,protectedAllyId:shieldProtected?protectedAlly.id:null,protectedSide:shieldProtected?protectedAlly.owner:null};return this.#ok('Confronto resolvido. O vencedor deve escolher onde termina.',{pendingCombat:true});
  }

  #chooseCombatPosition(side,advance){
    const p=this.#s.pendingCombat;if(!p||p.winnerSide!==side)return this.#fail('Nenhuma escolha de confronto disponível.');
    const winner=this.#pieceById(side,p.winnerId);
    const protectedAlly=p.protectedAllyId&&p.protectedSide?this.#pieceById(p.protectedSide,p.protectedAllyId):null;
    if(winner){
      let doAdvance=!!advance;
      if(!protectedAlly&&doAdvance&&this.#piecesAt(this.#other(side),p.deadCell).length)doAdvance=false;
      if(protectedAlly&&doAdvance){const blockers=this.#piecesAt(side,p.ownCell).filter(x=>x.id!==winner.id);if(blockers.length)doAdvance=false;}
      winner.coord=doAdvance?p.deadCell:p.ownCell;const linkedShield=this.#linkedShieldFor(winner);if(linkedShield?.alive&&linkedShield.coord===p.ownCell)linkedShield.coord=winner.coord;
      if(protectedAlly&&protectedAlly.alive){
        const allyDest=doAdvance?p.ownCell:p.deadCell;
        const enemyBlock=this.#piecesAt(side,allyDest).some(x=>x.id!==winner.id);
        if(!enemyBlock)protectedAlly.coord=allyDest;
        else {winner.coord=p.ownCell;protectedAlly.coord=p.deadCell;}
      }
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
    const hadActivation=!!this.#activation(side),p=this.#activePiece(side);if(this.#s.mode!=='training'&&hadActivation)this.#s.roundActivations[side]=(this.#s.roundActivations?.[side]||0)+1;if(p&&p.alive){p.activated=this.#s.mode==='training'?false:true;const mate=this.#shareTurnMate(p);if(mate?.alive)mate.activated=this.#s.mode==='training'?false:true;this.#tickPieceEffects(p,'turn');if(p.name==='Bardo'||p.identity==='Bardo')this.#expireBardAfterTurn(p);else p.turnsTaken=(p.turnsTaken||0)+1;if(p.paranoia?.revealed){p.paranoia.remaining--;if(p.paranoia.remaining<=0){p.paranoia=null;this.#addIntel(side,'🧠 O efeito de Paranoia terminou.');}}if(p.name==='Zumbi'&&p.zombieTurnsLeft>0){p.zombieTurnsLeft--;if(p.zombieTurnsLeft<=0){this.#addHistory(side,'🧟 Os 3 turnos do Zumbi terminaram; ele caiu definitivamente.');this.#kill(p,true);}}}
    this.#s.activation[side]=null;this.#s.impact[side]=null;if(this.#s.combatHold?.[side])this.#s.combatHold[side]=false;else if(this.#s.combatMarks)this.#s.combatMarks[side]=[];if(this.#s.mode==='training'){this.#s.turn=side;return this.#ok('Ação de treino encerrada. Você pode usar qualquer peça novamente.',{training:true});}if(this.#checkEnd())return this.#ok('Partida encerrada.',{gameOver:true});this.#advanceAfterActivation(side);return this.#ok('Turno encerrado.',{turn:this.#s.turn});
  }

  #advanceAfterActivation(side){
    const pLeft=this.#hasActivationLeft('player'),eLeft=this.#hasActivationLeft('enemy');
    if(!pLeft&&!eLeft){this.#s.round++;this.#tickRoundEffects();for(const p of this.#pieces('player'))p.activated=false;for(const p of this.#pieces('enemy'))p.activated=false;this.#s.roundActivations={player:0,enemy:0};this.#processZombieRevives();this.#s.roundStarter=this.#s.roundStarter==='player'?'enemy':'player';this.#s.turn=this.#hasActivationLeft(this.#s.roundStarter)?this.#s.roundStarter:this.#other(this.#s.roundStarter);this.#addHistory('player',`🔄 Rodada ${this.#s.round} começou. ${this.#s.turn==='player'?'Você':'O adversário'} tem a prioridade inicial.`);this.#addHistory('enemy',`🔄 Rodada ${this.#s.round} começou. ${this.#s.turn==='enemy'?'Você':'O adversário'} tem a prioridade inicial.`);return;}
    if(side==='player')this.#s.turn=eLeft?'enemy':'player';else this.#s.turn=pLeft?'player':(eLeft?'enemy':'player');
  }

  #checkEnd(){
    if(this.#s.mode==='training')return false;
    const pd=this.#originalDeaths('player'),ed=this.#originalDeaths('enemy');
    if(pd>=3&&ed>=3){this.#s.gameOver=true;this.#s.result='draw';this.#addHistory('player','⚖️ As duas equipes chegaram a 3 perdas na mesma resolução.');this.#addHistory('enemy','⚖️ As duas equipes chegaram a 3 perdas na mesma resolução.');return true;}
    if(pd>=3){this.#s.gameOver=true;this.#s.result='enemy';this.#addHistory('player','☠️ Derrota: 3 das suas 4 peças originais foram eliminadas.');this.#addHistory('enemy','🏆 Vitória: você eliminou 3 das 4 peças inimigas.');return true;}
    if(ed>=3){this.#s.gameOver=true;this.#s.result='player';this.#addHistory('player','🏆 Vitória: você eliminou 3 das 4 peças inimigas.');this.#addHistory('enemy','☠️ Derrota: 3 das suas 4 peças originais foram eliminadas.');return true;}
    return false;
  }
  exportState(){
    return JSON.stringify(this.#s,(k,v)=>v instanceof Set?{__set:[...v]}:v);
  }
  importState(raw){
    if(!raw)return;this.#s=JSON.parse(raw,(k,v)=>v&&typeof v==='object'&&Array.isArray(v.__set)?new Set(v.__set):v);if(!this.#s.doppelChoice)this.#s.doppelChoice={player:null,enemy:null};if(!this.#s.roundStarter)this.#s.roundStarter='player';if(!this.#s.roundActivations)this.#s.roundActivations={player:0,enemy:0};if(!this.#s.trees)this.#s.trees=[{coord:'B3',state:'live'},{coord:'G6',state:'live'}];if(!this.#s.rocks)this.#s.rocks=['F2','C7'];if(!this.#s.water)this.#s.water=['D3','E6'];if(!this.#s.swamps)this.#s.swamps=['C5','F4'];if(!this.#s.traps)this.#s.traps={player:[],enemy:[]};if(!this.#s.spotReveals)this.#s.spotReveals={player:{},enemy:{}};if(!this.#s.combatMarks)this.#s.combatMarks={player:[],enemy:[]};if(!this.#s.combatHold)this.#s.combatHold={player:false,enemy:false};if(this.#s.replayEvent===undefined)this.#s.replayEvent=null;for(const side of ['player','enemy'])for(const p of this.#pieces(side)){if(!Array.isArray(p.effects))p.effects=[];if(p.bonusAH==null)p.bonusAH=0;if(p.turnsTaken==null)p.turnsTaken=0;if(p.linkedToId===undefined)p.linkedToId=null;}
  }

};

const actionMap={
  selectPiece:(c,a)=>c.selectPiece(a.pieceId),cancelSelection:c=>c.cancelSelection(),cancelMode:c=>c.cancelMode(),startMove:c=>c.startMove(),moveStep:(c,a)=>c.moveStep(a.to),stopMove:c=>c.stopMove(),startAttack:c=>c.startAttack(),attack:(c,a)=>c.attack(a.to),selectPyroTarget:(c,a)=>c.selectPyroTarget(a.to),confirmPyroAttack:c=>c.confirmPyroAttack(),startAbility:c=>c.startAbility(),useSeer:(c,a)=>c.useSeer(a.cells),raiseAt:(c,a)=>c.raiseAt(a.coord),placeMirror:(c,a)=>c.placeMirror(a.coord),awakenTree:(c,a)=>c.awakenTree(a.coord),placeTrap:(c,a)=>c.placeTrap(a.coord),bardBuff:(c,a)=>c.bardBuff(a.targetPieceId,a.stat),shieldLink:(c,a)=>c.shieldLink(a.targetPieceId||null),endActivation:c=>c.endActivation(),chooseCombatPosition:(c,a)=>c.chooseCombatPosition(!!a.advance),sabotageBase:(c,a)=>c.sabotageBase(a.baseId,a.bonusId,a.targetPieceId||null),chooseDoppelCopy:(c,a)=>c.chooseDoppelCopy(!!a.copyNew)
};

export class GameRoom {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.referee=new globalThis.GameReferee();this.ready={player:null,enemy:null};this.started=false;
    ctx.blockConcurrencyWhile(async()=>{
      const saved=await ctx.storage.get('room');
      if(saved){this.ready=saved.ready||{player:null,enemy:null};this.started=!!saved.started;if(saved.gameState)this.referee.importState(saved.gameState);}
    });
  }
  async persist(){await this.ctx.storage.put('room',{ready:this.ready,started:this.started,gameState:this.referee.exportState()});}
  async safePersist(){try{await this.persist();return true;}catch(e){console.error('Falha ao persistir sala Clássico Online:',e);return false;}}
  send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
  sockets(){return this.ctx.getWebSockets();}
  attachment(ws){try{return ws.deserializeAttachment()||{};}catch{return {};}}
  sideSocket(side){return this.sockets().find(ws=>this.attachment(ws).side===side)||null;}
  roomState(){return {type:'roomState',started:this.started,connected:{player:!!this.sideSocket('player'),enemy:!!this.sideSocket('enemy')},ready:{player:!!this.ready.player,enemy:!!this.ready.enemy}};}
  broadcast(obj){for(const ws of this.sockets())this.send(ws,obj);}
  broadcastRoomState(){this.broadcast(this.roomState());}
  broadcastViews(){if(!this.started)return;for(const side of ['player','enemy']){const ws=this.sideSocket(side);if(ws)this.send(ws,{type:'view',view:this.referee.createClient(side).getView()});}}
  async fetch(request){
    if(request.headers.get('Upgrade')!=='websocket')return new Response('WebSocket required',{status:426});
    const pair=new WebSocketPair();const client=pair[0],server=pair[1];
    this.ctx.acceptWebSocket(server);server.serializeAttachment({side:null});
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,message){
    let msg;try{msg=JSON.parse(typeof message==='string'?message:new TextDecoder().decode(message));}catch{return this.send(ws,{type:'error',message:'Mensagem inválida.'});}
    const att=this.attachment(ws);const side=att.side;
    if(msg.type==='join'){
      if(side)return;
      let chosen=null;if(!this.sideSocket('player'))chosen='player';else if(!this.sideSocket('enemy'))chosen='enemy';
      if(!chosen){this.send(ws,{type:'error',message:'Sala cheia.'});try{ws.close(1008,'Sala cheia');}catch{}return;}
      ws.serializeAttachment({side:chosen});this.send(ws,{type:'joined',room:String(msg.room||''),side:chosen});this.broadcastRoomState();if(this.started)this.broadcastViews();return;
    }
    if(!side)return this.send(ws,{type:'error',message:'Entre na sala primeiro.'});
    if(msg.type==='ping')return this.send(ws,{type:'pong'});
    if(msg.type==='unready'){
      if(!this.started){this.ready[side]=null;await this.persist();this.send(ws,{type:'result',ok:true,status:'Pronto cancelado. Você pode alterar a preparação.'});this.broadcastRoomState();}return;
    }
    if(msg.type==='ready'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'A partida já começou.'});
      const res=this.referee.validateSetup(side,msg.setup,msg.bases);if(!res.ok)return this.send(ws,{type:'result',ok:false,status:res.status});
      this.ready[side]={setup:msg.setup,bases:msg.bases};this.send(ws,{type:'result',ok:true,status:'Você está pronto. Aguardando o outro jogador.'});
      if(this.ready.player&&this.ready.enemy){const a=this.ready.player,b=this.ready.enemy;const start=this.referee.startMultiplayerGame(a.setup,a.bases,b.setup,b.bases);if(!start.ok)return this.broadcast({type:'result',ok:false,status:start.status});this.started=true;}
      await this.persist();this.broadcastRoomState();this.broadcastViews();return;
    }
    if(msg.type==='action'){
      if(!this.started)return this.send(ws,{type:'result',ok:false,status:'A partida ainda não começou.'});
      const action=msg.action||{},fn=actionMap[action.type];if(!fn)return this.send(ws,{type:'result',ok:false,status:'Ação desconhecida.'});
      let res;try{res=fn(this.referee.createClient(side),action);}catch(e){console.error(e);res={ok:false,status:'Erro interno ao resolver a ação.'};}
      await this.safePersist();this.send(ws,{type:'result',...res});this.broadcastViews();return;
    }
    this.send(ws,{type:'error',message:'Tipo de mensagem desconhecido.'});
  }
  async webSocketClose(ws){
    const side=this.attachment(ws).side;if(side&&!this.started){this.ready[side]=null;await this.persist();}
    this.broadcastRoomState();
  }
  async webSocketError(ws){this.broadcastRoomState();}
}



export class TriGameRoom {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.referee=new TriReferee();this.ready={A:null,B:null};this.started=false;this.ai=null;this.difficulty='normal';this.replayInitialState=null;this.replayActions=[];
    ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get('triRoom');if(saved){this.ready=saved.ready||{A:null,B:null};this.started=!!saved.started;this.difficulty=['easy','normal','hard','extreme'].includes(saved.difficulty)?saved.difficulty:'normal';this.replayInitialState=saved.replayInitialState||null;this.replayActions=Array.isArray(saved.replayActions)?saved.replayActions:[];if(saved.gameState)this.referee.importState(saved.gameState);if(this.started)this.ai=new TriAI('C',this.difficulty);}});
  }
  resetReplay(){try{this.replayInitialState=this.referee.exportState();this.replayActions=[];}catch(e){console.error('Falha ao iniciar Replay da Arena:',e);this.replayInitialState=null;this.replayActions=[];}}
  recordReplayAction(side,action){try{if(!TRI_SIDES.includes(side)||!action)return false;const copy=typeof structuredClone==='function'?structuredClone(action):JSON.parse(JSON.stringify(action));this.replayActions.push({side,action:copy});return true;}catch(e){console.error('Falha ao registrar ação no Replay da Arena:',e);return false;}}
  async persist(){await this.ctx.storage.put('triRoom',{ready:this.ready,started:this.started,difficulty:this.difficulty,gameState:this.referee.exportState(),replayInitialState:this.replayInitialState,replayActions:this.replayActions});}
  async safePersist(){try{await this.persist();return true;}catch(e){console.error('Falha ao persistir sala Arena Online:',e);return false;}}
  send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
  sockets(){return this.ctx.getWebSockets();}
  attachment(ws){try{return ws.deserializeAttachment()||{};}catch{return {};}}
  sideSocket(side){return this.sockets().find(ws=>this.attachment(ws).side===side)||null;}
  roomState(){return{type:'roomState',started:this.started,connected:{A:!!this.sideSocket('A'),B:!!this.sideSocket('B')},ready:{A:!!this.ready.A,B:!!this.ready.B},ai:'C',difficulty:this.difficulty};}
  broadcast(obj){for(const ws of this.sockets())this.send(ws,obj);}
  broadcastRoomState(){this.broadcast(this.roomState());}
  broadcastViews(){if(!this.started)return;for(const side of ['A','B']){const ws=this.sideSocket(side);if(!ws)continue;let view;try{view=this.referee.client(side).getView();this.send(ws,{type:'view',view});}catch(e){console.error('Falha ao gerar visão da Arena para '+side+':',e);continue;}if(view.gameOver&&this.replayInitialState){try{this.send(ws,{type:'arenaReplay',initialState:this.replayInitialState,actions:this.replayActions});}catch(e){console.error('Falha ao enviar Replay da Arena:',e);}}}}
  async runAI(){if(!this.started||!this.ai)return;let guard=0,lastFail='',failCount=0;while(guard++<100){const v=this.referee.client('C').getView();if(v.gameOver)break;if(!(v.pendingCombat||v.doppelChoice||v.turn==='C'))break;const act=this.ai.decide(v);if(!act||act.type==='wait')break;const sig=JSON.stringify(act),res=applyTriAction(this.referee.client('C'),act);if(res?.ok){this.recordReplayAction('C',act);lastFail='';failCount=0;}else{if(sig===lastFail)failCount++;else{lastFail=sig;failCount=1;}if(failCount>=2){const fallback={type:'end'},fr=applyTriAction(this.referee.client('C'),fallback);if(fr?.ok){this.recordReplayAction('C',fallback);lastFail='';failCount=0;}else break;}}this.broadcastViews();await new Promise(r=>setTimeout(r,res?.ok?120:20));}}
  async fetch(request){if(request.headers.get('Upgrade')!=='websocket')return new Response('WebSocket required',{status:426});const pair=new WebSocketPair();const client=pair[0],server=pair[1];this.ctx.acceptWebSocket(server);server.serializeAttachment({side:null});return new Response(null,{status:101,webSocket:client});}
  async webSocketMessage(ws,message){
    let msg;try{msg=JSON.parse(typeof message==='string'?message:new TextDecoder().decode(message));}catch{return this.send(ws,{type:'error',message:'Mensagem inválida.'});}
    const att=this.attachment(ws),side=att.side;
    if(msg.type==='join'){
      if(side)return;let chosen=null;if(!this.sideSocket('A'))chosen='A';else if(!this.sideSocket('B'))chosen='B';
      if(!chosen){this.send(ws,{type:'error',message:'Arena cheia: já existem dois humanos.'});try{ws.close(1008,'Sala cheia');}catch{}return;}
      ws.serializeAttachment({side:chosen});this.send(ws,{type:'joined',room:String(msg.room||''),side:chosen});this.broadcastRoomState();if(this.started)this.broadcastViews();return;
    }
    if(!side)return this.send(ws,{type:'error',message:'Entre na sala primeiro.'});
    if(msg.type==='ping')return this.send(ws,{type:'pong'});
    if(msg.type==='setDifficulty'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'A dificuldade da IA C já está travada para esta partida.'});
      if(side!=='A')return this.send(ws,{type:'result',ok:false,status:'A dificuldade da IA C é definida pelo Jogador A.'});
      this.difficulty=['easy','normal','hard','extreme'].includes(msg.difficulty)?msg.difficulty:'normal';
      await this.safePersist();this.broadcastRoomState();this.send(ws,{type:'result',ok:true,status:`IA C definida como ${this.difficulty==='easy'?'Fácil':this.difficulty==='hard'?'Difícil':this.difficulty==='extreme'?'Extrema':'Normal'}.`});return;
    }
    if(msg.type==='ready'){
      if(this.started)return this.send(ws,{type:'result',ok:false,status:'A partida já começou.'});const res=this.referee.validateSetup(side,msg.setup,msg.bases);if(!res.ok)return this.send(ws,{type:'result',ok:false,status:res.status});
      this.ready[side]={setup:msg.setup,bases:msg.bases};this.send(ws,{type:'result',ok:true,status:'Pronto. Aguardando o outro jogador.'});
      if(this.ready.A&&this.ready.B){const st=this.referee.startOnline(this.ready.A.setup,this.ready.A.bases,this.ready.B.setup,this.ready.B.bases,this.difficulty);if(!st.ok)return this.broadcast({type:'result',ok:false,status:st.status});this.started=true;this.ai=new TriAI('C',this.difficulty);this.resetReplay();}
      await this.safePersist();this.broadcastRoomState();this.broadcastViews();if(this.started){await this.runAI();await this.safePersist();this.broadcastViews();}return;
    }
    if(msg.type==='action'){
      if(!this.started)return this.send(ws,{type:'result',ok:false,status:'A partida ainda não começou.'});const action=msg.action||{};let res;try{res=applyTriAction(this.referee.client(side),action);}catch(e){console.error(e);res={ok:false,status:'Erro interno.'};}
      if(res?.ok)this.recordReplayAction(side,action);this.send(ws,{type:'result',...res});this.broadcastViews();await this.runAI();await this.safePersist();this.broadcastViews();return;
    }
    this.send(ws,{type:'error',message:'Tipo desconhecido.'});
  }
  async webSocketClose(ws){const side=this.attachment(ws).side;if(side&&!this.started){this.ready[side]=null;await this.safePersist();}this.broadcastRoomState();}
  async webSocketError(ws){this.broadcastRoomState();}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/ws'){
      const room=String(url.searchParams.get('room')||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);
      if(!room)return new Response('Código de sala inválido.',{status:400});
      return env.GAME_ROOMS.getByName(room).fetch(request);
    }
    if(url.pathname==='/tri-ws'){
      const room=String(url.searchParams.get('room')||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);
      if(!room)return new Response('Código de sala inválido.',{status:400});
      return env.TRI_ROOMS.getByName(room).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
