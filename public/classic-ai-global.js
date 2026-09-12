(function(){
// Generated from public/ai-worker.js by npm run sync.
function orient(value,side){
  if(side!=='player')return structuredClone(value);
  const flip=c=>String.fromCharCode(72-(c.charCodeAt(0)-65))+(9-Number(c.slice(1)));
  const visit=v=>{
    if(typeof v==='string'){if(v==='player')return 'enemy';if(v==='enemy')return 'player';return v.replace(/\b[A-H][1-8]\b/g,flip);}
    if(Array.isArray(v))return v.map(visit);
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k==='player'?'enemy':k==='enemy'?'player':/^[A-H][1-8]$/.test(k)?flip(k):k,visit(x)]));
    return v;
  };return visit(value);
}
function createClassicBrain(side,level='normal',saved=null){
// IA v3 tática: recebe somente o snapshot filtrado do lado inimigo.
// Toda "memória" abaixo é construída a partir do que a própria IA viu,
// percebeu ou tentou fazer em turnos anteriores.

const BOARD_SIZE = 8;
const rc = c => ({x:c.charCodeAt(0)-65, y:Number(c.slice(1))-1});
const coord = (x,y) => String.fromCharCode(65+x)+(y+1);
const inside = (x,y) => x>=0&&x<BOARD_SIZE&&y>=0&&y<BOARD_SIZE;
const man = (a,b) => { const A=rc(a),B=rc(b); return Math.abs(A.x-B.x)+Math.abs(A.y-B.y); };
const cheb = (a,b) => { const A=rc(a),B=rc(b); return Math.max(Math.abs(A.x-B.x),Math.abs(A.y-B.y)); };
function neighbors(c,diag=false){
  const a=rc(c), ds=diag
    ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
    : [[1,0],[-1,0],[0,1],[0,-1]];
  return ds.map(([dx,dy])=>[a.x+dx,a.y+dy]).filter(([x,y])=>inside(x,y)).map(([x,y])=>coord(x,y));
}
function perceptionCells(c,per=1,diag=false){
  const a=rc(c),limit=Math.max(0,Math.floor(Number(per)||0));
  const ds=diag
    ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
    : [[1,0],[-1,0],[0,1],[0,-1]];
  const out=[];
  for(const [dx,dy] of ds) for(let step=1;step<=limit;step++){
    const x=a.x+dx*step,y=a.y+dy*step;if(inside(x,y))out.push(coord(x,y));
  }
  return out;
}
function allCells(){const a=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)a.push(coord(x,y));return a;}
const CELLS=allCells();
const BLOCKED=new Set(['B3','G6','F2','C7']);

const isGhost=p=>!!p&&p.name==='Fantasma'&&!p.possessing;
const isBlocked=c=>BLOCKED.has(c);
function attackCells(p){
  if(((p.a||0)<=0&&!isGhost(p))||(p.range||0)<=0)return [];
  return CELLS.filter(c=>c!==p.coord&&man(p.coord,c)<=p.range);
}
function abilityCells(p){
  const ah=Math.max(0,Number(p.ah)||0);if(!ah)return [];
  return CELLS.filter(c=>c!==p.coord&&man(p.coord,c)<=ah);
}
const clamp=(n,a=0,b=2)=>Math.max(a,Math.min(b,n));
let difficulty='normal';
const DIFFICULTY={
  easy:{noise:5.5,memoryDecay:0.56,contactTtl:2,certaintyDecay:0.64,randomPiece:0.24,randomMove:0.24,skipAbility:0.28,tactical:0.20,risk:0.25,endgame:0.25,lookahead:0},
  normal:{noise:0.18,memoryDecay:0.74,contactTtl:4,certaintyDecay:0.82,randomPiece:0,randomMove:0,skipAbility:0,tactical:0.78,risk:0.65,endgame:0.85,lookahead:1},
  hard:{noise:0.03,memoryDecay:0.85,contactTtl:5,certaintyDecay:0.90,randomPiece:0,randomMove:0,skipAbility:0,tactical:1.00,risk:1.08,endgame:1.12,lookahead:2},
  extreme:{noise:0.004,memoryDecay:0.94,contactTtl:7,certaintyDecay:0.97,randomPiece:0,randomMove:0,skipAbility:0,tactical:1.28,risk:1.35,endgame:1.38,lookahead:3}
};
const diff=()=>DIFFICULTY[difficulty]||DIFFICULTY.normal;
const randomItem=arr=>arr&&arr.length?arr[Math.floor(Math.random()*arr.length)]:null;
const pickBest=(arr,scoreFn)=>{
  let best=null,bestScore=-Infinity;
  for(const item of arr){const s=scoreFn(item)+(Math.random()*diff().noise);if(s>bestScore){bestScore=s;best=item;}}
  return best==null?null:{item:best,score:bestScore};
};

const META={
  'Arqueiro':{type:'S',role:'sniper'},
  'Ninja':{type:'S',role:'hunter'},
  'Piromante':{type:'S',role:'hunter'},
  'Kamikaze':{type:'S',role:'bomb'},
  'Caçador':{type:'S',role:'trapper'},
  'Paranoia':{type:'R',role:'scout'},
  'Escudeiro':{type:'R',role:'guard'},
  'Golem':{type:'R',role:'tank'},
  'Golem de Lava':{type:'R',role:'fighter'},
  'Cavaleiro':{type:'R',role:'hunter'},
  'Slime':{type:'R',role:'tank'},
  'Mini-Slime':{type:'R',role:'tank'},
  'Zumbi':{type:'R',role:'bruiser'},
  'Druida':{type:'S',role:'summoner'},
  'Galho-Vivo':{type:'C',role:'fighter'},
  'Vidente':{type:'P',role:'seer'},
  'Mago do Espelho':{type:'P',role:'trickster'},
  'Necromante':{type:'P',role:'summoner'},
  'Doppelgänger':{type:'P',role:'trickster'},
  'Sentinela':{type:'P',role:'trapper'},
  'Bardo':{type:'P',role:'support'},
  'Trapaceiro':{type:'J',role:'hunter'},
  'Fantasma':{type:'J',role:'assassin'},
  'Esqueleto':{type:'C',role:'fighter'}
};
function metaOf(p){return META[p.displayName]||META[p.name]||{type:p.type||'?',role:'fighter'};}
function directResult(attType,defType){
  if(attType==='C'&&defType==='C')return 0;
  if(attType==='C')return -1;if(defType==='C')return 1;
  if(attType==='J'&&defType==='J')return 0;
  if(attType==='J')return 1;if(defType==='J')return -1;
  if(attType===defType)return 0;
  return ((attType==='R'&&defType==='S')||(attType==='S'&&defType==='P')||(attType==='P'&&defType==='R'))?1:-1;
}

const memory={
  initialized:false, lastRound:0,lastOwnDeaths:0,lastEnemyDeaths:0,
  heat:Object.create(null), contacts:Object.create(null),
  seenHistory:[], seenIntel:[], lastAction:null, lastView:null,
  processedPerception:null, abilityRound:Object.create(null), failedCells:Object.create(null), visits:Object.create(null), utilityAt:Object.create(null), clock:0
};
function resetMemory(view){
  memory.initialized=true;memory.lastRound=view.round||1;memory.lastOwnDeaths=view.ownOriginalDeaths||0;memory.lastEnemyDeaths=view.enemyOriginalDeaths||0;
  memory.heat=Object.create(null);memory.contacts=Object.create(null);memory.seenHistory=[];memory.seenIntel=[];memory.lastAction=null;memory.lastView=null;memory.processedPerception=null;memory.abilityRound=Object.create(null);memory.failedCells=Object.create(null);
  memory.visits=Object.create(null);memory.utilityAt=Object.create(null);memory.clock=0;
  // O jogador começa legalmente nas linhas 1–4. Isso é regra pública, não informação oculta.
  for(const c of CELLS){const row=Number(c.slice(1));memory.heat[c]=isBlocked(c)?0:(row<=4?0.34:0.05);}
}
function shouldReset(view){
  if(!memory.initialized)return true;
  if((view.round||1)<memory.lastRound)return true;
  if((view.ownOriginalDeaths||0)<memory.lastOwnDeaths||(view.enemyOriginalDeaths||0)<memory.lastEnemyDeaths)return true;
  return false;
}
function heat(c){return Number(memory.heat[c]||0);}
function setHeat(c,v){if(c)memory.heat[c]=clamp(v,0,2);}
function addHeat(c,v){if(c)setHeat(c,heat(c)+v);}
function clearHeat(c){if(c){memory.heat[c]=0;delete memory.contacts[c];}}
function decayAndDiffuse(){
  const old={...memory.heat},next=Object.create(null);
  for(const c of CELLS)next[c]=(old[c]||0)*diff().memoryDecay;
  for(const c of CELLS){
    const v=old[c]||0;if(v<0.35)continue;
    const ns=neighbors(c,true);for(const n of ns)next[n]=Math.max(next[n]||0,v*0.12);
  }
  memory.heat=next;
  for(const [c,k] of Object.entries(memory.contacts)){
    if((memory.lastRound-(k.round||0))>diff().contactTtl){delete memory.contacts[c];continue;}
    k.certainty=Math.max(0.25,(k.certainty||1)*diff().certaintyDecay);
  }
}
function rememberContact(c,name=null,certainty=1,round=memory.lastRound){
  if(!c)return;setHeat(c,Math.max(heat(c),certainty*1.45));memory.contacts[c]={name:name||memory.contacts[c]?.name||null,certainty,round};
}
function freshLines(lines,seen){
  const out=[];for(const line of lines||[]){if(!seen.includes(line))out.push(line);}seen.splice(0,seen.length,...(lines||[]).slice(0,12));return out;
}
function parseCoordList(text){return [...String(text||'').matchAll(/\b([A-H][1-8])\b/g)].map(m=>m[1]);}

function processPreviousAction(view,newHistory,lastResult){
  const act=memory.lastAction;if(!act)return;
  if(lastResult&&lastResult.action&&lastResult.action.type===act.type&&lastResult.ok===false){
    if(act.to)memory.failedCells[act.to]=(view.round||1)+1;
    memory.lastAction=null;return;
  }
  const joined=(newHistory||[]).join(' | ');
  if(act.type==='attack'&&act.to){
    if(/não atingiu ninguém|não acertou ninguém/i.test(joined))clearHeat(act.to);
    else if(/eliminad|último Mini-Slime|rompido/i.test(joined))setHeat(act.to,0.18);
    else if(/atingid|transform|intercept/i.test(joined))rememberContact(act.to,null,0.95,view.round);
  }
  if(act.type==='moveStep'&&act.to){
    const p=view.ownPieces.find(x=>x.id===act.pieceId);
    const reached=p&&p.coord===act.to;
    if(!reached&&(/Confronto|repelid|venceu|eliminad|rompido/i.test(joined)))rememberContact(act.to,null,0.92,view.round);
    if(reached&&memory.contacts[act.to]&&memory.contacts[act.to].certainty<0.9)clearHeat(act.to);
  }
  if(act.type==='mirror'&&act.to&&lastResult&&lastResult.ok===false)memory.failedCells[act.to]=(view.round||1)+1;
  memory.lastAction=null;
}

function processView(view,lastResult){
  if(shouldReset(view))resetMemory(view);
  memory.clock++;
  for(const p of view.ownPieces||[])if(p.alive&&p.coord){const previous=memory.lastView?.ownPieces?.find(x=>x.id===p.id);if(!previous||previous.coord!==p.coord)memory.visits[p.coord]=memory.clock;}
  if((view.round||1)>memory.lastRound){decayAndDiffuse();memory.lastRound=view.round||1;memory.failedCells=Object.create(null);}
  const newHistory=freshLines(view.history,memory.seenHistory);
  const newIntel=freshLines(view.intel,memory.seenIntel);
  processPreviousAction(view,newHistory,lastResult);

  // Vidente: toda casa vazia dentro da área observada é informação legalmente confirmada.
  const visibleMap=new Map((view.visibleOpponents||[]).map(x=>[x.coord,x]));
  for(const c of view.seerArea||[]){if(!visibleMap.has(c))clearHeat(c);}
  for(const e of view.visibleOpponents||[]){rememberContact(e.coord,e.displayName||e.name,1,view.round);}

  // Mensagens de radar/percepção são informação que a IA recebeu legitimamente.
  for(const line of newIntel){
    if(/presença ortogonal em/i.test(line))for(const c of parseCoordList(line))rememberContact(c,null,1,view.round);
  }
  const a=view.activation;
  if(a){
    const p=view.ownPieces.find(x=>x.id===a.pieceId&&x.alive);
    const sig=p?`${view.round}:${p.id}:${p.coord}:${a.stepsTaken||0}:${a.lastPerception}:${p.radarAdvanced}:${p.radarExpanded}`:null;
    if(p&&a.lastPerception!==null&&sig!==memory.processedPerception){
      memory.processedPerception=sig;
      const traversed=new Set(a.movePath||[]);for(const c of traversed)clearHeat(c);
      const orth=perceptionCells(p.coord,p.per||1,false).filter(c=>!traversed.has(c));
      const all=perceptionCells(p.coord,p.per||1,true),diag=all.filter(c=>!orth.includes(c)&&!traversed.has(c));
      const hints=(view.perceptionHints||[]).filter(h=>!traversed.has(h.coord));
      const realHints=hints.filter(h=>!h.knownFalse),falseHints=hints.filter(h=>h.knownFalse);
      for(const h of falseHints)clearHeat(h.coord); // o Eco é explicitamente conhecido como falso
      if(a.lastPerception===false){for(const c of orth)clearHeat(c);if(p.radarExpanded)for(const c of diag)clearHeat(c);}
      else if(realHints.length){
        for(const h of realHints){if(h.kind==='exact')rememberContact(h.coord,null,1,view.round);else addHeat(h.coord,h.kind==='diag'?0.38:0.42);}
      } else if(!falseHints.length){
        // Compatibilidade com snapshots antigos que não enviavam perceptionHints.
        const latest=(view.intel||[])[0]||'';
        if(/presença ortogonal em/i.test(latest))for(const c of parseCoordList(latest))rememberContact(c,null,1,view.round);
        else{
          if(/presença ortogonal/i.test(latest)||!p.radarExpanded)for(const c of orth)addHeat(c,0.42);
          if(p.radarExpanded&&/presença diagonal/i.test(latest))for(const c of diag)addHeat(c,0.38);
        }
      }
    }
  }

  // Se fomos atingidos por um atacante identificado, a própria regra informa que o ataque foi adjacente.
  if(view.impactCell){
    const impacted=view.ownPieces.find(p=>p.alive&&p.coord===view.impactCell);
    if(impacted){
      for(const line of newHistory){
        if(/Seu .* foi atingido por /i.test(line)&&!/ataque distante/i.test(line)){
          for(const c of neighbors(impacted.coord,false))addHeat(c,0.48);
        }
      }
    }
  }

  memory.lastOwnDeaths=view.ownOriginalDeaths||0;memory.lastEnemyDeaths=view.enemyOriginalDeaths||0;memory.lastView=view;
}

function ownAlive(view){return (view.ownPieces||[]).filter(p=>p.alive);}
function ownAt(view,c){return ownAlive(view).filter(p=>p.coord===c);}
function ownCoords(view){return new Set(ownAlive(view).map(p=>p.coord));}
function baseCoords(view){return new Set((view.bases||[]).map(b=>b.coord));}
function enemyBases(view){return (view.bases||[]).filter(b=>b.owner!=='enemy'&&!b.sabotaged);}
function canShare(view,p,c){
  if((solidAt(view,c)&&!p.flying&&!(p.name==='Druida'&&!(view.rocks||[]).includes(c)))||baseCoords(view).has(c))return false;
  const ps=ownAt(view,c).filter(x=>x.id!==p.id),isLinker=x=>x?.name==='Escudeiro'||(x?.name==='Doppelgänger'&&x?.copied==='Escudeiro');
  const follower=ownAlive(view).find(x=>x.linkedToId===p.id&&x.coord===p.coord);if(follower&&ps.length)return false;
  if(!ps.length)return true;if(ps.length>=2)return false;
  return isLinker(p)||ps.some(isLinker);
}
function solidAt(view,c){return (view.rocks||[]).includes(c)||(view.trees||[]).some(t=>t.coord===c&&t.state==='live');}
// Distâncias de percurso: não tenta atravessar obstáculos para chegar ao alvo.
function routeDistances(view,p,start=p.coord){
  const distance=new Map([[start,0]]),queue=[start];
  while(queue.length){queue.sort((a,b)=>distance.get(a)-distance.get(b));const c=queue.shift();for(const n of neighbors(c,!!p.diag)){
    if(!canShare(view,{...p,coord:c},n))continue;
    const cost=p.flying?1:((view.swamps||[]).includes(n)?2:1),next=distance.get(c)+cost;
    if(next<(distance.get(n)??Infinity)){distance.set(n,next);queue.push(n);}
  }}return distance;
}
function knownEnemyAt(c){return memory.contacts[c]||null;}
function enemyTypeFromContact(k){if(!k?.name)return null;return META[k.name]?.type||null;}
function approachCells(view,b){return neighbors(b.coord,true).filter(c=>!solidAt(view,c)&&!baseCoords(view).has(c));}

function targetHeatCells(view,p,min=0.18){
  const vis=new Set((view.visibleOpponents||[]).map(e=>e.coord));
  return CELLS.filter(c=>heat(c)>=min||vis.has(c)).map(c=>({coord:c,score:heat(c)+(vis.has(c)?1.5:0)}));
}
function directMoveRisk(p,c){
  const k=knownEnemyAt(c);if(!k)return heat(c)>0.85?(metaOf(p).role==='hunter'?1.5:-2.2):0;
  const dt=enemyTypeFromContact(k);if(!dt)return 0;
  const r=directResult(metaOf(p).type,dt);
  if(r>0)return 10;if(r===0)return -2;return p.hp>1?-5:-14;
}

function strategicPieceValue(p){
  const role=metaOf(p).role;let v=p.original?8:3;
  if(role==='seer'||role==='support')v+=6;if(role==='guard'||role==='tank')v+=4;if(role==='sniper'||role==='assassin')v+=5;
  if(p.name==='Vidente'||p.name==='Bardo'||isGhost(p))v+=3;
  return v;
}
function endgameState(view){const ownLimit=Math.max(1,Number(view.matchConfig?.lossLimit?.enemy)||3),enemyLimit=Math.max(1,Number(view.matchConfig?.lossLimit?.player)||3),ours=view.ownOriginalDeaths||0,theirs=view.enemyOriginalDeaths||0;return {ours,theirs,ownLimit,enemyLimit,finish:(enemyLimit-theirs)<=1,critical:(ownLimit-ours)<=1};}
function visibleThreatAt(view,p,c){
  let risk=0;
  for(const e of view.visibleOpponents||[]){
    if(!e?.coord)continue;
    if(((e.a||0)>0||isGhost(e))&&attackCells(e).includes(c))risk+=8+(e.a||1)*3+(e.original?2:0);
    if(cheb(e.coord,c)<=1){const r=directResult(metaOf(p).type,metaOf(e).type);risk+=r<0?11:r===0?4:-2;}
  }
  risk+=Math.max(0,heat(c)-.5)*5;if((p.hp||1)<=1)risk*=1.35;if(p.original)risk*=1.08;
  return Math.max(0,risk);
}
function futureAttackValue(view,p,c){
  const q={...p,coord:c},vis=new Map((view.visibleOpponents||[]).map(e=>[e.coord,e]));let best=0;
  for(const t of attackCells(q)){
    const e=vis.get(t);if(e){let s=18+(e.original?6:0)+(e.hp<=(q.a||0)?12:0);if(endgameState(view).finish&&e.original)s+=18;best=Math.max(best,s);}
    else best=Math.max(best,heat(t)*10);
  }
  return best;
}
function futureAbilityValue(view,p,c){
  const q={...p,coord:c},ab=effectiveAbility(q);if(!ab)return 0;
  if(ab==='raise')return (view.corpses||[]).some(x=>man(c,x.coord)<=Math.max(1,q.ah||0))?16:0;
  if(ab==='awaken')return (view.trees||[]).some(t=>t.state==='live'&&man(c,t.coord)<=Math.max(1,q.ah||0))?15:0;
  if(ab==='spotTrap'||ab==='damageTrap')return neighbors(c,true).reduce((n,x)=>n+heat(x),0)*3;
  if(ab==='seer')return CELLS.filter(x=>man(c,x)<=Math.max(1,q.ah||0)).reduce((n,x)=>n+heat(x),0)*.7;
  if(ab==='bard'||ab==='shieldLink')return ownAlive(view).some(x=>x.id!==p.id&&man(c,x.coord)<=Math.max(0,q.ah||0))?11:0;
  if(ab==='smoke')return visibleThreatAt(view,p,c)>7?8:0;
  return 0;
}
function positionTacticalValue(view,p,c){
  const role=metaOf(p).role,eg=endgameState(view);let s=futureAttackValue(view,p,c)*.65+futureAbilityValue(view,p,c)*.8;
  if(enemyBases(view).some(b=>neighbors(b.coord,true).includes(c)))s+=20+(eg.finish?3:0);
  const late=view.round>24?.72:view.round>14?.88:1,risk=visibleThreatAt(view,p,c)*diff().risk*late;s-=risk;
  if((role==='support'||role==='seer'||role==='guard')&&risk>5)s-=4;
  if(eg.critical&&p.original)s-=risk*.45;
  if((role==='hunter'||role==='assassin'||role==='bruiser')&&heat(c)>.6)s+=heat(c)*2.4;
  return s;
}
function terrainTargetScore(view,p,c){
  const tree=(view.trees||[]).find(t=>t.coord===c&&t.state==='live'),rock=(view.rocks||[]).includes(c);if(!tree&&!rock)return 0;
  const bases=enemyBases(view);if(!bases.length)return 0;const nearest=[...bases].sort((a,b)=>man(p.coord,a.coord)-man(p.coord,b.coord))[0];
  let s=9;const before=man(p.coord,nearest.coord),after=man(c,nearest.coord);if(after<before)s+=7;if(man(p.coord,c)<=1)s+=3;
  const hp=tree?(tree.hp??3):((view.rockHp||{})[c]??3);if((p.a||0)>=hp)s+=12;else if(hp<=2)s+=4;
  const own=ownAlive(view),seen=view.visibleOpponents||[];
  if(rock&&own.some(x=>x.name==='Golem'&&!x.form&&man(x.coord,c)<=2))s-=22;
  if(tree&&own.some(x=>x.name==='Druida'&&man(x.coord,c)<=Math.max(2,x.ah||0)))s-=20;
  if(rock&&seen.some(x=>x.name==='Golem'&&!x.form))s+=7;
  if(tree&&seen.some(x=>x.name==='Druida'))s+=7;
  return Math.max(0,s);
}
function activationPlanValue(view,p){
  let s=0,eg=endgameState(view);const immediate=bestAttackTarget(view,p,{allowSpeculative:p.name==='Arqueiro'});if(immediate)s+=Math.min(75,immediate.score*.55);
  if(shouldUseAbility(view,p,{}))s+=18;
  if(p.m>0&&!p.linkedToId){const opts=neighbors(p.coord,!!p.diag).filter(c=>canShare(view,p,c));let best=-999;for(const c of opts)best=Math.max(best,positionTacticalValue(view,p,c));if(best>-999)s+=Math.max(0,best)*diff().tactical;}
  if(eg.finish&&immediate?.score>=100)s+=42*diff().endgame;
  if(eg.critical&&p.original)s-=visibleThreatAt(view,p,p.coord)*.8;
  return s;
}

function bestAttackTarget(view,p,{allowSpeculative=true}={}){
  if((p.a||0)<=0&&!isGhost(p))return null;
  const legal=attackCells(p).filter(c=>!baseCoords(view).has(c));
  const ownSet=ownCoords(view),visMap=new Map((view.visibleOpponents||[]).map(e=>[e.coord,e]));
  const freshPerception=view.activation?.pieceId===p.id&&view.activation?.lastPerception===true?new Map((view.perceptionHints||[]).filter(h=>!h.knownFalse).map(h=>[h.coord,h.kind||'orth'])):new Map();
  let candidates=[];
  for(const c of legal){
    if(ownSet.has(c))continue;
    const visible=visMap.get(c),k=knownEnemyAt(c),h=heat(c);
    let score=0;
    if(visible){
      if(isGhost(p))score=132+(visible.original?14:0)+(visible.hp>=2?10:0);
      else score=120+(visible.hp<=p.a?30:0)+(visible.original?8:0);
      if(endgameState(view).finish&&visible.original)score+=42*diff().endgame;
    }
    else if(k)score=70*(k.certainty||0.5)+h*20;
    else if(h>=0.28)score=h*38;
    else if(p.name==='Arqueiro'&&allowSpeculative){const row=Number(c.slice(1));score=h*22+(row<=4?5:0);}
    const freshKind=freshPerception.get(c);if(freshKind)score+=freshKind==='exact'?125:freshKind==='diag'?82:92;
    if(!visible&&!k&&h<0.28){const terrainScore=terrainTargetScore(view,p,c);if(terrainScore>0)score=Math.max(score,terrainScore);}
    if(score>0)candidates.push({c,score});
  }
  // Tática de fogo amigo: detonar Kamikaze só quando a memória indica alvo(s) ao redor e o saldo parece favorável.
  for(const ally of ownAlive(view)){
    if(ally.name!=='Kamikaze'||ally.id===p.id||!legal.includes(ally.coord))continue;
    const around=neighbors(ally.coord,true);let enemyValue=0,allyCost=0;
    for(const c of around)enemyValue+=Math.min(1.4,heat(c))*3.0;
    for(const a of ownAlive(view))if(a.id!==ally.id&&around.includes(a.coord))allyCost+=a.hp>1?2.4:3.2;
    const score=enemyValue-allyCost-2.2;
    if(score>=2.2)candidates.push({c:ally.coord,score:88+score*5,friendlyPlan:'kamikaze'});
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>b.score-a.score);return candidates[0];
}

function bestPyroTargets(view,p){
  const legal=abilityCells(p).filter(c=>!baseCoords(view).has(c));
  const ownSet=ownCoords(view),visSet=new Set((view.visibleOpponents||[]).map(e=>e.coord));
  const scored=[];
  for(const c of legal){
    let s=visSet.has(c)?120:heat(c)*55;
    if(ownSet.has(c)){
      const ally=ownAt(view,c)[0];
      if(ally?.name==='Kamikaze'){
        let enemyValue=0,allyCost=0;for(const q of neighbors(c,true))enemyValue+=Math.min(1.4,heat(q))*3;
        for(const a of ownAlive(view))if(a.id!==ally.id&&neighbors(c,true).includes(a.coord))allyCost+=3;
        s=enemyValue-allyCost>=2?90+(enemyValue-allyCost)*4:-50;
      }else s=-80;
    }
    scored.push({c,s});
  }
  scored.sort((a,b)=>b.s-a.s);return scored.slice(0,2).map(x=>x.c);
}

function bestSeerArea(view,p){
  const visSet=new Set((view.visibleOpponents||[]).map(e=>e.coord));let best=null;
  const mains=p?[p.coord,...abilityCells(p)]:CELLS,legal=new Set(mains);
  for(const main of mains){
    const ns=neighbors(main,false).filter(c=>legal.has(c));if(!ns.length)continue;
    const second=[...ns].sort((a,b)=>(heat(b)+(memory.contacts[b]?0.45:0)-(visSet.has(b)?1:0))-(heat(a)+(memory.contacts[a]?0.45:0)-(visSet.has(a)?1:0)))[0];
    if(!second)continue;const cells=[main,second];let score=0;
    for(const c of cells){score+=heat(c)*2.4;if(memory.contacts[c])score+=1.1;if(visSet.has(c))score-=2.5;}
    const avgY=cells.reduce((n,c)=>n+rc(c).y,0)/2;score+=Math.max(0,(4.0-avgY))*0.12;
    if(!best||score>best.score)best={cells,score};
  }
  return best;
}
function legalRaiseCells(view,p){
  const ownSet=ownCoords(view),corpses=new Set((view.corpses||[]).map(c=>c.coord)),solid=new Set([...(view.trees||[]).filter(t=>t.state==='live').map(t=>t.coord),...(view.rocks||[])]);
  return abilityCells(p).filter(c=>corpses.has(c)&&!ownSet.has(c)&&!solid.has(c));
}
function bestRaiseCell(view,p){
  const cells=legalRaiseCells(view,p);if(!cells.length)return null;
  const b=pickBest(cells,c=>heat(c)*10+enemyBases(view).reduce((m,b)=>Math.max(m,8-man(c,b.coord)),0));
  return b?.item||cells[0];
}
function mirrorCandidates(view,p){
  const ownSet=ownCoords(view),visibleEnemy=new Set((view.visibleOpponents||[]).filter(x=>x.coord).map(x=>x.coord)),bases=baseCoords(view),mirrors=new Set((view.ownMirrors||[]).map(m=>m.coord)),solid=new Set([...(view.trees||[]).filter(t=>t.state==='live').map(t=>t.coord),...(view.rocks||[])]);
  return abilityCells(p).filter(c=>!solid.has(c)&&!ownSet.has(c)&&!visibleEnemy.has(c)&&!bases.has(c)&&!mirrors.has(c)&&(memory.failedCells[c]||0)<view.round);
}
function bestMirrorCell(view,p){
  const cells=mirrorCandidates(view,p);if(!cells.length)return null;
  const ownBases=(view.bases||[]).filter(b=>b.owner==='enemy'&&!b.sabotaged);
  const b=pickBest(cells,c=>{
    let s=heat(c)*5+(3.5-Math.abs(rc(c).x-3.5))*0.15;
    for(const base of ownBases)s+=Math.max(0,4-cheb(c,base.coord))*1.2;
    return s;
  });
  return b?.item||cells[0];
}
function bestAwakenCell(view,p){
  const legal=new Set(abilityCells(p)),ownSet=ownCoords(view),visSet=new Set((view.visibleOpponents||[]).map(x=>x.coord));
  const hasBranch=ownAlive(view).some(x=>x.summonType==='livingBranch'&&x.druidId===p.id);if(hasBranch)return null;
  const trees=(view.trees||[]).filter(t=>t.state==='live'&&legal.has(t.coord)&&!ownSet.has(t.coord)&&!visSet.has(t.coord)&&(memory.failedCells[t.coord]||0)<view.round);
  const b=pickBest(trees,t=>{
    let s=18+heat(t.coord)*7+neighbors(t.coord,true).reduce((q,c)=>q+heat(c)*2,0);
    for(const base of enemyBases(view))s+=Math.max(0,6-man(t.coord,base.coord))*1.4;
    return s;
  });
  return b?.item?.coord||null;
}
function trapCandidates(view,p){
  const bases=baseCoords(view),solid=new Set([...(view.trees||[]).filter(t=>t.state==='live').map(t=>t.coord),...(view.rocks||[])]);
  return abilityCells(p).filter(c=>!bases.has(c)&&!solid.has(c)&&(memory.failedCells[c]||0)<view.round);
}
function bestTrapCell(view,p){
  const cells=trapCandidates(view,p);if(!cells.length)return null;
  const kind=effectiveAbility(p)==='spotTrap'?'spot':'damage',ownTrap=(view.ownTraps||[]).filter(t=>t.kind===kind);
  const b=pickBest(cells,c=>{
    let s=heat(c)*22+neighbors(c,true).reduce((q,n)=>q+heat(n)*3,0);
    for(const base of (view.bases||[]).filter(b=>b.owner==='enemy'&&!b.sabotaged))s+=Math.max(0,5-man(c,base.coord))*1.8;
    if(ownTrap.some(t=>t.coord===c))s-=20;
    const q=rc(c);s+=(3.5-Math.abs(q.x-3.5))*0.5;
    return s;
  });
  return b?.item||null;
}
function bardStatScore(target,stat){
  const role=metaOf(target).role;let s=0;
  if(stat==='attack')s=(target.a<=0?4:14)+(role==='hunter'||role==='assassin'||role==='bruiser'?8:0)+(target.name==='Trapaceiro'?8:0)-(target.name==='Kamikaze'?10:0);
  if(stat==='range')s=target.a>0&&target.range<8?12+(target.name==='Ninja'?8:0)+(target.name==='Caçador'?3:0):-999;
  if(stat==='abilityRange')s=(target.ah||0)>0?14+(['Vidente','Bardo','Druida','Caçador','Sentinela','Necromante','Mago do Espelho'].includes(target.name)?8:0):-999;
  if(stat==='move')s=10+(target.m===0?16:0)+(role==='hunter'||role==='scout'||role==='trapper'?6:0);
  if(stat==='life')s=10+(target.maxHp<=1?10:0)+(target.hp<=1?8:0)+(role==='support'||role==='seer'?4:0)-(target.name==='Kamikaze'?8:0);
  return s;
}
function bestBardChoice(view,p){
  const mates=ownAlive(view).filter(x=>x.id!==p.id&&man(p.coord,x.coord)<=Math.max(0,p.ah||0));if(!mates.length)return null;
  const needsAttack=ownAlive(view).every(x=>(x.a||0)<=0&&!isGhost(x));
  let best=null;for(const t of mates)for(const stat of ['attack','range','abilityRange','move','life']){
    let score=bardStatScore(t,stat)+(needsAttack&&stat==='attack'?80:0);
    if(difficulty==='extreme'){
      const nearHot=neighbors(t.coord,true).reduce((q,c)=>q+heat(c),0);score+=nearHot*(stat==='attack'||stat==='life'?2.2:0.8);
      if(stat==='abilityRange'&&effectiveAbility(t))score+=4;
    }
    if(!best||score>best.score)best={targetId:t.id,stat,score};
  }return best;
}
function effectiveAbility(p){
  const name=p.name==='Doppelgänger'?p.copied:p.name;
  if(name==='Arqueiro')return'sureShot';if(name==='Piromante')return'pyroBurst';if(name==='Paranoia')return'phantomPresence';if(name==='Golem')return'absorbRock';
  if(name==='Ninja')return'smoke';if(name==='Kamikaze')return'kamikaze';if(name==='Escudeiro')return'shieldLink';if(name==='Vidente')return'seer';if(name==='Necromante')return'raise';if(name==='Mago do Espelho')return'mirror';
  if(name==='Druida')return'awaken';if(name==='Sentinela')return'spotTrap';if(name==='Caçador')return'damageTrap';if(name==='Bardo')return'bard';
  return null;
}
function shouldUseAbility(view,p,a){
  const ab=effectiveAbility(p);if(!ab)return false;
  if(ab==='sureShot')return (p.sureShotCooldown||0)<=0&&!!bestAttackTarget(view,{...p,range:(p.range||1)*2},{allowSpeculative:true});
  if(ab==='absorbRock')return (view.rocks||[]).some(c=>man(p.coord,c)===1);
  if(difficulty==='easy'&&Math.random()<diff().skipAbility)return false;
  if(ab==='pyroBurst'){if((p.pyroCooldown||0)>0)return false;return bestPyroTargets(view,p).some(c=>heat(c)>0.18||(view.visibleOpponents||[]).some(e=>e.coord===c));}
  if(ab==='phantomPresence'){const legal=abilityCells(p).filter(c=>!solidAt(view,c)&&!(view.bases||[]).some(b=>b.coord===c));return legal.length>=2;}
  if(ab==='smoke'){if((p.ninjaSmokeCooldown||0)>0)return false;const objective=bestObjective(view,p),danger=(view.visibleOpponents||[]).some(e=>cheb(p.coord,e.coord)<=2)||neighbors(p.coord,true).some(c=>heat(c)>.70),infiltration=objective&&enemyBases(view).some(b=>b.coord===objective.coord||neighbors(b.coord,true).includes(objective.coord))&&man(p.coord,objective.coord)<=3&&neighbors(p.coord,true).some(c=>heat(c)>.45);return danger||infiltration;}
  if(ab==='kamikaze'){const ah=Math.max(1,p.ah||1);return (view.visibleOpponents||[]).some(e=>cheb(p.coord,e.coord)<=ah);}
  if(ab==='shieldLink'){if(p.linkedToId)return false;const ah=p.ah||0;return ownAlive(view).some(x=>x.id!==p.id&&x.alive&&man(p.coord,x.coord)<=ah&&((ownAt(view,x.coord)||[]).length<2||x.coord===p.coord));}
  if(ab==='raise'){
    const skeletonAlive=ownAlive(view).some(x=>x.summonType==='skeleton'&&x.summonerId===p.id);return !skeletonAlive&&legalRaiseCells(view,p).length>0;
  }
  if(ab==='mirror'){

    if((view.ownMirrors||[]).some(m=>m.mageId===p.id))return false;
    return !!bestMirrorCell(view,p);
  }
  if(ab==='seer'){
    const best=bestSeerArea(view,p),last=memory.abilityRound[p.id]||-99;
    if(!best)return false;
    const hasExact=(view.visibleOpponents||[]).length>0||Object.values(memory.contacts).some(k=>(k.certainty||0)>0.85);
    const cooldown=difficulty==='extreme'?1:2;
    return view.round-last>=cooldown&&(best.score>=(difficulty==='extreme'?1.35:1.9)||!hasExact);
  }
  if(ab==='awaken')return !!bestAwakenCell(view,p);
  if(ab==='spotTrap'||ab==='damageTrap'){
    const kind=ab==='spotTrap'?'spot':'damage',limit=kind==='spot'?2:1,owned=(view.ownTraps||[]).filter(t=>t.kind===kind&&t.placerId===p.id).length;
    if(owned<limit)return !!bestTrapCell(view,p);
    return difficulty==='extreme'&&!!bestTrapCell(view,p)&&Object.values(memory.heat).some(v=>v>0.7);
  }
  if(ab==='bard')return !!bestBardChoice(view,p);
  return false;
}

function bestObjective(view,p){
  const objectives=[];
  const routes=routeDistances(view,p);
  // Sabotagem: chegar a qualquer casa em volta de Posto inimigo ainda vivo.
  for(const b of enemyBases(view))for(const c of approachCells(view,b))objectives.push({coord:c,score:62,kind:'base'});
  // Contatos conhecidos / regiões quentes.
  for(const x of targetHeatCells(view,p,0.22))objectives.push({coord:x.coord,score:30+x.score*18,kind:'contact'});
  // Necromante tende a se aproximar de cadáveres para criar Esqueleto.
  if(effectiveAbility(p)==='raise')for(const corpse of view.corpses||[])for(const c of neighbors(corpse.coord,false))objectives.push({coord:c,score:36+heat(corpse.coord)*8,kind:'corpse'});
  if(effectiveAbility(p)==='awaken')for(const t of view.trees||[])if(t.state==='live')objectives.push({coord:t.coord,score:34+neighbors(t.coord,true).reduce((q,c)=>q+heat(c)*2,0),kind:'tree'});
  if(metaOf(p).role==='trapper')for(const x of targetHeatCells(view,p,0.35))objectives.push({coord:x.coord,score:34+x.score*16,kind:'trap-zone'});
  if(p.name==='Paranoia')for(const x of targetHeatCells(view,p,0.2))objectives.push({coord:x.coord,score:38+x.score*20,kind:'infect'});
  // Explora todas as casas acessíveis, não apenas sete destinos fixos.
  for(const c of CELLS)if(c!==p.coord&&!solidAt(view,c)&&!ownCoords(view).has(c))objectives.push({coord:c,score:20+Math.min(30,(memory.clock-(memory.visits[c]||-100))*0.12),kind:'explore'});
  const reachable=objectives.filter(o=>routes.has(o.coord)&&!solidAt(view,o.coord)&&(o.coord!==p.coord||o.kind==='base'));
  const result=pickBest(reachable,o=>o.score-routes.get(o.coord)*4.2);
  return result?.item||null;
}
function legalMoveOptions(view,p,remaining){
  const left=Math.max(0,Number(remaining)||0);
  return neighbors(p.coord,!!p.diag).filter(c=>{const solid=solidAt(view,c),cost=p.flying?1:((view.swamps||[]).includes(c)?2:1);return canShare(view,p,c)&&cost<=left&&!(p.flying&&solid&&left<=cost);});
}
function movementStep(view,p,a){
  if(a.moveRemaining<=0)return {type:'stopMove'};
  const opts=legalMoveOptions(view,p,a.moveRemaining);
  if(!opts.length)return {type:'stopMove'};
  // Se já alcançou um Posto ou uma boa oportunidade de tiro, não desperdiça passos.
  if((a.stepsTaken||0)>0){
    if(enemyBases(view).some(b=>neighbors(b.coord,true).includes(p.coord)))return {type:'stopMove'};
    const atk=bestAttackTarget(view,p,{allowSpeculative:false});if(atk&&atk.score>=55)return {type:'stopMove'};
  }
  const objective=bestObjective(view,p);
  if(difficulty==='easy'&&Math.random()<diff().randomMove)return {type:'moveStep',to:randomItem(opts)};
  const choice=pickBest(opts,c=>{
    let s=0;
    if(objective){const route=routeDistances(view,p,c).get(objective.coord);s+=route==null?-1000:-route*12+objective.score*0.05;}
    if((a.movePath||[]).includes(c))s-=24;
    s-=Math.max(0,24-(memory.clock-(memory.visits[c]||-100)))*0.6;
    s+=directMoveRisk(p,c);
    // Não encosta inutilmente em nossas próprias bordas; favorece avanço e centro.
    const q=rc(c);s+=(7-q.y)*0.34;s+=(3.5-Math.abs(q.x-3.5))*0.18;s-=p.flying?0:((view.swamps||[]).includes(c)?1.2:0);
    // Caçadores aceitam mais risco, suportes preferem não pisar em casa muito suspeita.
    const role=metaOf(p).role;if(heat(c)>0.65)s+=((role==='hunter'||role==='assassin'||role==='bruiser'||p.name==='Trapaceiro')?5:-4)*heat(c);
    s+=positionTacticalValue(view,p,c)*diff().tactical;
    if(diff().lookahead>1&&objective){
      const second=(p.diag?neighbors(c,true):neighbors(c,false)).filter(n=>canShare(view,{...p,coord:c},n));let best2=-999;
      for(const n of second){let q=(man(c,objective.coord)-man(n,objective.coord))*4+positionTacticalValue(view,p,n)*.45;if(!p.flying&&(view.swamps||[]).includes(n))q-=1;best2=Math.max(best2,q);}
      if(best2>-999)s+=best2*(diff().lookahead===3?.55:.35);
    }
    if(difficulty==='extreme'){
      const k=knownEnemyAt(c);if(k){const r=directResult(metaOf(p).type,enemyTypeFromContact(k));s+=r>0?9:r<0?-12:-3;}
      if(role==='support'||role==='seer')s-=heat(c)*3;
    }
    return s;
  });
  return choice?{type:'moveStep',to:choice.item}:{type:'stopMove'};
}

function bonusTargetScore(view,bonus,p){
  const role=metaOf(p).role;let s=0;
  if(bonus==='radarAdvanced'||bonus==='radarExpanded'){
    if((bonus==='radarAdvanced'&&p.radarAdvanced)||(bonus==='radarExpanded'&&p.radarExpanded))return -999;
    s=(p.m||0)*3+(p.per||1)*4+(role==='hunter'?8:0)+(p.name==='Trapaceiro'?5:0);
  } else if(bonus==='move'){
    s=(p.m===0?28:8)+(role==='hunter'?10:0)+(p.name==='Golem'||p.displayName==='Golem de Lava'?7:0);
  } else if(bonus==='life'){
    s=(p.maxHp<=1?16:8)+(p.hp<p.maxHp?8:0)+(p.name==='Trapaceiro'||p.name==='Arqueiro'||p.name==='Vidente'?7:0)-(p.name==='Kamikaze'?8:0);
  } else if(bonus==='attack'){
    s=(p.a===0?16:12)+(p.m||0)*2+(role==='hunter'?8:0)+(p.name==='Trapaceiro'?12:0)+(p.name==='Kamikaze'?-10:0);
  } else if(bonus==='range'){
    if(p.a<=0||p.range>=8)return -999;s=15+(p.name==='Ninja'?10:0)+(p.name==='Piromante'?5:0)+(p.m||0);
  } else if(bonus==='abilityRange'){
    if((p.ah||0)<=0)return -999;s=18+(effectiveAbility(p)?8:0)+(['Vidente','Bardo','Druida','Caçador','Sentinela'].includes(p.name)?6:0);
  }
  return s;
}
function chooseSabotage(view,p){
  const base=enemyBases(view).find(b=>neighbors(b.coord,true).includes(p.coord));if(!base)return null;
  const used=new Set(view.chosenBaseBonuses||[]),choices=(view.baseBonusCatalog||[]).filter(b=>!used.has(b.id));
  let best=null;
  for(const bonus of choices){
    const targets=ownAlive(view).filter(x=>(bonus.id!=='range'||x.a>0)&&(bonus.id!=='abilityRange'||x.ah>0));
    for(const target of targets){const s=bonusTargetScore(view,bonus.id,target);if(!best||s>best.score)best={bonus,target,score:s};}
  }
  return best?{type:'sabotage',baseId:base.id,bonusId:best.bonus.id,targetPieceId:best.target.id}:null;
}

function pieceSelectionScore(view,p){
  let s=Math.random()*0.5;
  if(enemyBases(view).some(b=>neighbors(b.coord,true).includes(p.coord)))s+=120;
  const atk=bestAttackTarget(view,p,{allowSpeculative:p.name==='Arqueiro'});if(atk)s+=Math.min(105,atk.score*0.9);
  const dummyActivation={};
  if(shouldUseAbility(view,p,dummyActivation)){
    const ab=effectiveAbility(p);s+=ab==='raise'?72:ab==='seer'?58:ab==='bard'?62:ab==='awaken'?54:(ab==='spotTrap'||ab==='damageTrap')?48:38;
  }
  const obj=bestObjective(view,p);if(obj&&p.m>0)s+=Math.max(0,32-man(p.coord,obj.coord)*3)+(p.m*2);
  s+=activationPlanValue(view,p);
  const eg=endgameState(view);if(eg.critical&&p.original&&['Vidente','Bardo','Arqueiro'].includes(p.name))s+=4;if(eg.finish&&atk?.score>=100)s+=28*diff().endgame;
  if(p.name==='Trapaceiro'||isGhost(p))s+=8;if(p.name==='Cavaleiro'||p.name==='Ninja'||p.name==='Paranoia')s+=5;
  if(p.name==='Zumbi'&&p.zombieRevived)s+=7;
  if(p.name==='Arqueiro'&&!atk)s-=8;
  return s;
}

function decide(view,lastResult){
  processView(view,lastResult);
  if(view.gameOver)return {type:'wait'};
  // Em solo, a IA também pode precisar escolher a posição após vencer um confronto durante a ação do jogador.
  if(view.pendingCombat){
    if(!view.pendingCombat.canAdvance)return {type:'combatChoice',advance:false};
    return {type:'combatChoice',advance:true};
  }
  if(view.doppelChoice)return {type:'doppelChoice',copyNew:view.doppelChoice.canCopyNew!==false};
  if(view.turn!=='enemy')return {type:'wait'};

  const alive=ownAlive(view),a=view.activation;
  if(!a){
    const candidates=alive.filter(p=>view.availablePieceIds.includes(p.id));
    if(difficulty==='easy'&&Math.random()<diff().randomPiece){const p=randomItem(candidates);return p?{type:'select',pieceId:p.id}:{type:'wait'};}
    const best=pickBest(candidates,p=>pieceSelectionScore(view,p));
    return best?{type:'select',pieceId:best.item.id}:{type:'wait'};
  }
  const p=alive.find(x=>x.id===a.pieceId);if(!p)return {type:'wait'};

  if(a.mode==='move')return movementStep(view,p,a);
  if(a.mode==='attack'){
    const target=bestAttackTarget(view,p,{allowSpeculative:p.name==='Arqueiro'||a.lastPerception===true});
    return target?{type:'attack',to:target.c}:{type:'end'};
  }
  if(a.mode==='sureShotConfirm')return {type:'sureShotConfirm'};
  if(a.mode==='pyro'){
    const picked=Array.isArray(a.pyroTargets)?a.pyroTargets:[],targets=bestPyroTargets(view,p).filter(c=>!picked.includes(c));
    if(picked.length>=2)return {type:'pyroConfirm'};
    if(!picked.length){const to=targets[0];return to?{type:'pyroSelect',to}:{type:'end'};}
    return targets.length?{type:'pyroSelect',to:targets[0]}:{type:'end'};
  }
  if(a.mode==='paranoiaPresence'){
    const picked=Array.isArray(a.paranoiaTargets)?a.paranoiaTargets:[];
    if(picked.length>=2)return {type:'paranoiaConfirm'};
    const legal=[p.coord,...abilityCells(p)].filter(c=>!picked.includes(c)&&!solidAt(view,c)&&!(view.bases||[]).some(b=>b.coord===c));
    const choice=pickBest(legal,c=>heat(c)*18+neighbors(c,true).reduce((q,n)=>q+heat(n),0)*3+(8-Number(c.slice(1)))*.25);
    return choice?{type:'paranoiaSelect',to:choice.item}:{type:'end'};
  }
  if(a.mode==='kamikaze')return {type:'kamikazeConfirm'};
  if(a.mode==='absorbRock'){const rocks=(view.rocks||[]).filter(c=>man(p.coord,c)===1);if(!rocks.length)return {type:'end'};return {type:'absorbRock',coord:rocks[0]};}
  if(a.mode==='shieldLink'){const ah=p.ah||0,target=pickBest(ownAlive(view).filter(x=>x.id!==p.id&&x.alive&&man(p.coord,x.coord)<=ah&&((ownAt(view,x.coord)||[]).length<2||x.coord===p.coord)),x=>strategicPieceValue(x)+(x.maxHp<=1?6:0)+(x.hp<x.maxHp?4:0)+futureAttackValue(view,x,x.coord)*.15)?.item;return target?{type:'shieldLink',targetPieceId:target.id}:{type:'end'};}
  if(a.mode==='shieldUnlink')return {type:'shieldLink',targetPieceId:null};
  if(a.mode==='seer'){
    const best=bestSeerArea(view,p);if(best){memory.abilityRound[p.id]=view.round;return {type:'seer',cells:best.cells};}
    return {type:'end'};
  }
  if(a.mode==='raise'){
    const to=bestRaiseCell(view,p);if(to){memory.abilityRound[p.id]=view.round;return {type:'raise',to};}
    return {type:'end'};
  }
  if(a.mode==='mirror'){
    const to=bestMirrorCell(view,p);if(to){memory.abilityRound[p.id]=view.round;return {type:'mirror',to};}
    return {type:'end'};
  }
  if(a.mode==='awaken'){
    const to=bestAwakenCell(view,p);return to?{type:'awaken',to}:{type:'end'};
  }
  if(a.mode==='spotTrap'||a.mode==='damageTrap'){
    const to=bestTrapCell(view,p);return to?{type:'trap',to}:{type:'end'};
  }
  if(a.mode==='bard'){
    const b=bestBardChoice(view,p);return b?{type:'bard',targetPieceId:b.targetId,stat:b.stat}:{type:'end'};
  }

  // Extrema prioriza uma eliminação/posse confirmada antes de parar para sabotar um Posto.
  const immediate=bestAttackTarget(view,p,{allowSpeculative:false});
  if(difficulty==='extreme'&&immediate&&immediate.score>=100)return {type:'startAttack'};
  const sabotage=chooseSabotage(view,p);if(sabotage)return sabotage;

  // Alvo confirmado no alcance: atacar antes de se mover para não perder a informação do Vidente.
  if(immediate&&immediate.score>=(difficulty==='extreme'?45:55))return {type:'startAttack'};

  const ability=effectiveAbility(p),utility=['bard','seer','phantomPresence','spotTrap','damageTrap','mirror'].includes(ability),stationary=memory.utilityAt[p.id];
  const searching=!(view.visibleOpponents||[]).length&&(view.round>8||alive.filter(x=>x.original).length<=2);
  const canMove=!a.movementUsed&&p.m>0&&!p.linkedToId&&legalMoveOptions(view,p,p.m).length;
  if(ability==='bard'&&alive.every(x=>(x.a||0)<=0&&!isGhost(x))&&bestBardChoice(view,p))return {type:'startAbility'};
  if(canMove&&utility&&(searching||(stationary?.coord===p.coord&&stationary.count>=1)))return {type:'startMove'};
  if(p.linkedToId&&ability==='shieldLink'&&searching){const host=alive.find(x=>x.id===p.linkedToId);if(host&&(host.m||0)<=0&&p.m>0)return {type:'startAbility'};}

  // Habilidades com propósito têm prioridade sobre andar sem informação.
  if(shouldUseAbility(view,p,a))return {type:'startAbility'};

  // Movimento é usado para alcançar Postos, contatos e regiões ainda relevantes.
  if(!a.movementUsed&&p.m>0&&!p.linkedToId&&legalMoveOptions(view,p,p.m).length)return {type:'startMove'};

  // Depois de terminar o movimento, percepção pode ter criado um alvo provável.
  const afterMoveAttack=bestAttackTarget(view,p,{allowSpeculative:p.name==='Arqueiro'||isGhost(p)||a.lastPerception===true});
  if(afterMoveAttack)return {type:'startAttack'};

  // Arqueiro pode fazer tiro especulativo com base na memória do mapa mesmo sem mover.
  if((p.name==='Arqueiro'&&p.a>0)||isGhost(p))return {type:'startAttack'};
  return {type:'end'};
}

function rememberIssued(action,view){
  if(action&&['bard','seer','paranoiaConfirm','trap','mirror'].includes(action.type)){
    const p=view.ownPieces?.find(x=>x.id===view.activation?.pieceId);if(p){const old=memory.utilityAt[p.id];memory.utilityAt[p.id]={coord:p.coord,count:old?.coord===p.coord?old.count+1:1};}
  }
  if(!action||['wait','select','startMove','stopMove','startAttack','startAbility','end','combatChoice','sabotage','pyroSelect','paranoiaSelect','sureShotConfirm'].includes(action.type)){
    memory.lastAction=action&&action.type==='sabotage'?{...action,pieceId:view.activation?.pieceId}:null;return;
  }
  memory.lastAction={...action,pieceId:view.activation?.pieceId,round:view.round};
}


 difficulty=['easy','normal','hard','extreme'].includes(level)?level:'normal';
 if(saved?.memory)Object.assign(memory,structuredClone(saved.memory));
 let lastResult=saved?.lastResult||null;
 return {
  decide(view){const v=orient(view,side),a=decide(v,orient(lastResult,side));rememberIssued(a,v);return orient(a,side);},
  reportResult(action,result){lastResult={action:structuredClone(action),ok:result?.ok!==false,status:result?.status||''};},
  snapshot(){return {memory:structuredClone(memory),lastResult:structuredClone(lastResult)};}
 };
}

window.ClassicBrains={orient,createClassicBrain};
})();
