'use strict';

// IA v2: recebe somente o snapshot filtrado do lado inimigo.
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
const BLOCKED=new Set(['C3','F6']);
const isBlocked=c=>BLOCKED.has(c);
function attackCells(p){
  if((p.a||0)<=0||(p.range||0)<=0)return [];
  return CELLS.filter(c=>c!==p.coord&&man(p.coord,c)<=p.range);
}
const clamp=(n,a=0,b=2)=>Math.max(a,Math.min(b,n));
let difficulty='normal';
const DIFFICULTY={
  easy:{noise:5.5,memoryDecay:0.56,contactTtl:2,certaintyDecay:0.64,randomPiece:0.24,randomMove:0.24,skipAbility:0.28},
  normal:{noise:0.18,memoryDecay:0.72,contactTtl:3,certaintyDecay:0.78,randomPiece:0,randomMove:0,skipAbility:0},
  hard:{noise:0.03,memoryDecay:0.82,contactTtl:4,certaintyDecay:0.88,randomPiece:0,randomMove:0,skipAbility:0}
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
  'Escudeiro':{type:'R',role:'guard'},
  'Golem':{type:'R',role:'tank'},
  'Golem de Lava':{type:'R',role:'fighter'},
  'Cavaleiro':{type:'R',role:'hunter'},
  'Slime':{type:'R',role:'tank'},
  'Mini-Slime':{type:'R',role:'tank'},
  'Vidente':{type:'P',role:'seer'},
  'Mago do Espelho':{type:'P',role:'trickster'},
  'Necromante':{type:'P',role:'summoner'},
  'Doppelgänger':{type:'P',role:'trickster'},
  'Coringa':{type:'J',role:'hunter'},
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
  processedPerception:null, abilityRound:Object.create(null), failedCells:Object.create(null)
};
function resetMemory(view){
  memory.initialized=true;memory.lastRound=view.round||1;memory.lastOwnDeaths=view.ownOriginalDeaths||0;memory.lastEnemyDeaths=view.enemyOriginalDeaths||0;
  memory.heat=Object.create(null);memory.contacts=Object.create(null);memory.seenHistory=[];memory.seenIntel=[];memory.lastAction=null;memory.lastView=null;memory.processedPerception=null;memory.abilityRound=Object.create(null);memory.failedCells=Object.create(null);
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
      const orth=perceptionCells(p.coord,p.per||1,false);
      const all=perceptionCells(p.coord,p.per||1,true),diag=all.filter(c=>!orth.includes(c));
      if(a.lastPerception===false){for(const c of orth)clearHeat(c);if(p.radarExpanded)for(const c of diag)clearHeat(c);}
      else{
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
  if(isBlocked(c)||baseCoords(view).has(c))return false;
  const ps=ownAt(view,c).filter(x=>x.id!==p.id);if(!ps.length)return true;if(ps.length>=2)return false;
  return p.name==='Escudeiro'||ps.some(x=>x.name==='Escudeiro');
}
function knownEnemyAt(c){return memory.contacts[c]||null;}
function enemyTypeFromContact(k){if(!k?.name)return null;return META[k.name]?.type||null;}
function approachCells(view,b){return neighbors(b.coord,true).filter(c=>!isBlocked(c)&&!baseCoords(view).has(c));}

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

function bestAttackTarget(view,p,{allowSpeculative=true}={}){
  if((p.a||0)<=0)return null;
  const legal=attackCells(p).filter(c=>!baseCoords(view).has(c));
  const ownSet=ownCoords(view),visMap=new Map((view.visibleOpponents||[]).map(e=>[e.coord,e]));
  let candidates=[];
  for(const c of legal){
    if(ownSet.has(c))continue;
    const visible=visMap.get(c),k=knownEnemyAt(c),h=heat(c);
    let score=0;
    if(visible)score=120+(visible.hp<=p.a?30:0)+(visible.original?8:0);
    else if(k)score=70*(k.certainty||0.5)+h*20;
    else if(h>=0.28)score=h*38;
    else if(p.name==='Arqueiro'&&allowSpeculative){const row=Number(c.slice(1));score=h*22+(row<=4?5:0);}
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
  const legal=neighbors(p.coord,false).filter(c=>!baseCoords(view).has(c));
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
    if(s>10)scored.push({c,s});
  }
  scored.sort((a,b)=>b.s-a.s);return scored.slice(0,2).map(x=>x.c);
}

function bestSeerArea(view){
  const visSet=new Set((view.visibleOpponents||[]).map(e=>e.coord));let best=null;
  for(const main of CELLS){
    const ns=neighbors(main,true);if(ns.length<3)continue;
    const ranked=[...ns].sort((a,b)=>(heat(b)+(memory.contacts[b]?0.45:0)-(visSet.has(b)?1:0))-(heat(a)+(memory.contacts[a]?0.45:0)-(visSet.has(a)?1:0)));
    const cells=[main,...ranked.slice(0,3)];let score=0;
    for(const c of cells){score+=heat(c)*2.4;if(memory.contacts[c])score+=1.1;if(visSet.has(c))score-=2.5;}
    const avgY=cells.reduce((n,c)=>n+rc(c).y,0)/4;score+=Math.max(0,(4.0-avgY))*0.12;
    if(!best||score>best.score)best={cells,score};
  }
  return best;
}
function legalRaiseCells(view,p){
  const ownSet=ownCoords(view),corpses=new Set((view.corpses||[]).map(c=>c.coord));
  return neighbors(p.coord,false).filter(c=>corpses.has(c)&&!ownSet.has(c));
}
function bestRaiseCell(view,p){
  const cells=legalRaiseCells(view,p);if(!cells.length)return null;
  const b=pickBest(cells,c=>heat(c)*10+enemyBases(view).reduce((m,b)=>Math.max(m,8-man(c,b.coord)),0));
  return b?.item||cells[0];
}
function mirrorCandidates(view,p){
  const ownSet=ownCoords(view),bases=baseCoords(view),mirrors=new Set((view.ownMirrors||[]).map(m=>m.coord));
  const out=[];const q=rc(p.coord);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])for(let s=1;s<=2;s++){
    const x=q.x+dx*s,y=q.y+dy*s;if(!inside(x,y))continue;const c=coord(x,y);
    if(isBlocked(c)||ownSet.has(c)||bases.has(c)||mirrors.has(c))continue;
    if((memory.failedCells[c]||0)>=view.round)continue;out.push(c);
  }
  return out;
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
function effectiveAbility(p){
  if(p.name==='Vidente')return'seer';if(p.name==='Necromante')return'raise';if(p.name==='Mago do Espelho')return'mirror';
  if(p.name==='Doppelgänger'){
    if(p.copied==='Vidente')return'seer';if(p.copied==='Necromante')return'raise';if(p.copied==='Mago do Espelho')return'mirror';
  }
  return null;
}
function shouldUseAbility(view,p,a){
  const ab=effectiveAbility(p);if(!ab)return false;
  if(difficulty==='easy'&&Math.random()<diff().skipAbility)return false;
  if(ab==='raise'){
    const skeletonAlive=ownAlive(view).some(x=>x.summonType==='skeleton');return !skeletonAlive&&legalRaiseCells(view,p).length>0;
  }
  if(ab==='mirror'){
    if(p.name==='Mago do Espelho'&&a?.mirrorBlockedCurrentActivation)return false;
    if((view.ownMirrors||[]).length)return false;
    return !!bestMirrorCell(view,p);
  }
  if(ab==='seer'){
    const best=bestSeerArea(view),last=memory.abilityRound[p.id]||-99;
    if(!best)return false;
    const hasExact=(view.visibleOpponents||[]).length>0||Object.values(memory.contacts).some(k=>(k.certainty||0)>0.85);
    return view.round-last>=2&&(best.score>=1.9||!hasExact);
  }
  return false;
}

function bestObjective(view,p){
  const objectives=[];
  // Sabotagem: chegar a qualquer casa em volta de Posto inimigo ainda vivo.
  for(const b of enemyBases(view))for(const c of approachCells(view,b))objectives.push({coord:c,score:62,kind:'base'});
  // Contatos conhecidos / regiões quentes.
  for(const x of targetHeatCells(view,p,0.22))objectives.push({coord:x.coord,score:30+x.score*18,kind:'contact'});
  // Necromante tende a se aproximar de cadáveres para criar Esqueleto.
  if(effectiveAbility(p)==='raise')for(const corpse of view.corpses||[])for(const c of neighbors(corpse.coord,false))objectives.push({coord:c,score:36+heat(corpse.coord)*8,kind:'corpse'});
  if(!objectives.length){
    // Exploração genérica: atravessar o centro rumo à metade do jogador.
    for(const c of ['D4','E4','F3','D3','E3','C2','F2'])objectives.push({coord:c,score:12,kind:'explore'});
  }
  const result=pickBest(objectives,o=>o.score-man(p.coord,o.coord)*4.2);
  return result?.item||null;
}
function movementStep(view,p,a){
  if(a.moveRemaining<=0)return {type:'stopMove'};
  const opts=neighbors(p.coord,!!p.diag).filter(c=>canShare(view,p,c));
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
    if(objective)s+=(man(p.coord,objective.coord)-man(c,objective.coord))*8+objective.score*0.05;
    s+=directMoveRisk(p,c);
    // Não encosta inutilmente em nossas próprias bordas; favorece avanço e centro.
    const q=rc(c);s+=(7-q.y)*0.34;s+=(3.5-Math.abs(q.x-3.5))*0.18;
    // Caçadores aceitam mais risco, suportes preferem não pisar em casa muito suspeita.
    const role=metaOf(p).role;if(heat(c)>0.65)s+=(role==='hunter'||p.name==='Coringa'?5:-4)*heat(c);
    return s;
  });
  return choice?{type:'moveStep',to:choice.item}:{type:'stopMove'};
}

function bonusTargetScore(view,bonus,p){
  const role=metaOf(p).role;let s=0;
  if(bonus==='radarAdvanced'||bonus==='radarExpanded'){
    if((bonus==='radarAdvanced'&&p.radarAdvanced)||(bonus==='radarExpanded'&&p.radarExpanded))return -999;
    s=(p.m||0)*3+(p.per||1)*4+(role==='hunter'?8:0)+(p.name==='Coringa'?5:0);
  } else if(bonus==='move'){
    s=(p.m===0?28:8)+(role==='hunter'?10:0)+(p.name==='Golem'||p.displayName==='Golem de Lava'?7:0);
  } else if(bonus==='life'){
    s=(p.maxHp<=1?16:8)+(p.hp<p.maxHp?8:0)+(p.name==='Coringa'||p.name==='Arqueiro'||p.name==='Vidente'?7:0)-(p.name==='Kamikaze'?8:0);
  } else if(bonus==='attack'){
    s=(p.a===0?16:12)+(p.m||0)*2+(role==='hunter'?8:0)+(p.name==='Coringa'?12:0)+(p.name==='Kamikaze'?-10:0);
  } else if(bonus==='range'){
    if(p.a<=0||p.range>=8)return -999;s=15+(p.name==='Ninja'?10:0)+(p.name==='Piromante'?5:0)+(p.m||0);
  }
  return s;
}
function chooseSabotage(view,p){
  const base=enemyBases(view).find(b=>neighbors(b.coord,true).includes(p.coord));if(!base)return null;
  const used=new Set(view.chosenBaseBonuses||[]),choices=(view.baseBonusCatalog||[]).filter(b=>!used.has(b.id));
  let best=null;
  for(const bonus of choices){
    const targets=ownAlive(view).filter(x=>bonus.id!=='range'||x.a>0);
    for(const target of targets){const s=bonusTargetScore(view,bonus.id,target);if(!best||s>best.score)best={bonus,target,score:s};}
  }
  return best?{type:'sabotage',baseId:base.id,bonusId:best.bonus.id,targetPieceId:best.target.id}:null;
}

function pieceSelectionScore(view,p){
  let s=Math.random()*0.5;
  if(enemyBases(view).some(b=>neighbors(b.coord,true).includes(p.coord)))s+=120;
  const atk=bestAttackTarget(view,p,{allowSpeculative:p.name==='Arqueiro'});if(atk)s+=Math.min(105,atk.score*0.9);
  const dummyActivation={mirrorBlockedCurrentActivation:p.name==='Mago do Espelho'&&p.mirrorCooldown===1};
  if(shouldUseAbility(view,p,dummyActivation)){
    const ab=effectiveAbility(p);s+=ab==='raise'?72:ab==='seer'?58:38;
  }
  const obj=bestObjective(view,p);if(obj&&p.m>0)s+=Math.max(0,32-man(p.coord,obj.coord)*3)+(p.m*2);
  if(p.name==='Coringa')s+=8;if(p.name==='Cavaleiro'||p.name==='Ninja')s+=5;
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
  if(view.doppelChoice)return {type:'doppelChoice',copyNew:true};
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
  if(a.mode==='pyro'){
    const picked=Array.isArray(a.pyroTargets)?a.pyroTargets:[],targets=bestPyroTargets(view,p).filter(c=>!picked.includes(c));
    if(picked.length>=2)return {type:'pyroConfirm'};
    if(!picked.length){const to=targets[0];return to?{type:'pyroSelect',to}:{type:'end'};}
    if(targets.length&&heat(targets[0])>0.24)return {type:'pyroSelect',to:targets[0]};
    return {type:'pyroConfirm'};
  }
  if(a.mode==='seer'){
    const best=bestSeerArea(view);if(best){memory.abilityRound[p.id]=view.round;return {type:'seer',cells:best.cells};}
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

  const sabotage=chooseSabotage(view,p);if(sabotage)return sabotage;

  // Alvo confirmado no alcance: atacar antes de se mover para não perder a informação do Vidente.
  const immediate=bestAttackTarget(view,p,{allowSpeculative:false});
  if(immediate&&immediate.score>=55)return {type:'startAttack'};

  // Habilidades com propósito têm prioridade sobre andar sem informação.
  if(shouldUseAbility(view,p,a))return {type:'startAbility'};

  // Movimento é usado para alcançar Postos, contatos e regiões ainda relevantes.
  if(!a.movementUsed&&p.m>0)return {type:'startMove'};

  // Depois de terminar o movimento, percepção pode ter criado um alvo provável.
  const afterMoveAttack=bestAttackTarget(view,p,{allowSpeculative:p.name==='Arqueiro'||a.lastPerception===true});
  if(afterMoveAttack)return {type:'startAttack'};

  // Arqueiro pode fazer tiro especulativo com base na memória do mapa mesmo sem mover.
  if(p.name==='Arqueiro'&&p.a>0)return {type:'startAttack'};
  return {type:'end'};
}

function rememberIssued(action,view){
  if(!action||['wait','select','startMove','stopMove','startAttack','startAbility','end','combatChoice','sabotage','pyroSelect'].includes(action.type)){
    memory.lastAction=action&&action.type==='sabotage'?{...action,pieceId:view.activation?.pieceId}:null;return;
  }
  memory.lastAction={...action,pieceId:view.activation?.pieceId,round:view.round};
}

if(typeof self!=='undefined')self.onmessage=e=>{
  const {id,view,lastResult,difficulty:requestedDifficulty}=e.data||{};
  difficulty=['easy','normal','hard'].includes(requestedDifficulty)?requestedDifficulty:'normal';
  const action=decide(view,lastResult||null);
  rememberIssued(action,view);
  self.postMessage({id,action,debug:{round:view?.round,knownContacts:Object.keys(memory.contacts).length}});
};

if(typeof module!=='undefined'&&module.exports)module.exports={decide,processView,resetMemory,rememberIssued,memory};
