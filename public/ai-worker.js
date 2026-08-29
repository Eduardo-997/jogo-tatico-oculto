'use strict';
const rc=c=>({x:c.charCodeAt(0)-65,y:Number(c.slice(1))-1});
const coord=(x,y)=>String.fromCharCode(65+x)+(y+1);
const inside=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
const man=(a,b)=>{const A=rc(a),B=rc(b);return Math.abs(A.x-B.x)+Math.abs(A.y-B.y)};
function neighbors(c,diag=false){
  const a=rc(c),ds=diag?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
  return ds.map(([dx,dy])=>[a.x+dx,a.y+dy]).filter(([x,y])=>inside(x,y)).map(([x,y])=>coord(x,y));
}
function random(arr){return arr.length?arr[Math.floor(Math.random()*arr.length)]:null;}
function attackCells(p){const out=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=coord(x,y);if(c!==p.coord&&man(p.coord,c)<=p.range)out.push(c);}return out;}
function chooseSabotage(view,p){
  const base=(view.bases||[]).find(b=>b.owner!=='enemy'&&!b.sabotaged&&neighbors(b.coord,true).includes(p.coord));
  if(!base)return null;
  const used=new Set(view.chosenBaseBonuses||[]),choices=(view.baseBonusCatalog||[]).filter(b=>!used.has(b.id));
  const shuffled=[...choices].sort(()=>Math.random()-.5);
  for(const bonus of shuffled){
    if(['move','life','attack','range'].includes(bonus.id)){
      let targets=view.ownPieces.filter(x=>x.alive);
      if(bonus.id==='range')targets=targets.filter(x=>x.a>0);
      const target=random(targets);if(!target)continue;
      return {type:'sabotage',baseId:base.id,bonusId:bonus.id,targetPieceId:target.id};
    }
    return {type:'sabotage',baseId:base.id,bonusId:bonus.id};
  }
  return null;
}
function decide(view){
  if(view.gameOver||view.turn!=='enemy')return {type:'wait'};
  if(view.pendingCombat)return {type:'combatChoice',advance:Math.random()<0.5};
  const ownAlive=view.ownPieces.filter(p=>p.alive), ownCoords=new Set(ownAlive.map(p=>p.coord)),baseCoords=new Set((view.bases||[]).map(b=>b.coord));
  const ownAt=c=>ownAlive.filter(x=>x.coord===c);
  const canShare=(piece,c)=>{if(baseCoords.has(c))return false;const ps=ownAt(c).filter(x=>x.id!==piece.id);if(!ps.length)return true;if(ps.length>=2)return false;return piece.name==='Escudeiro'||ps.some(x=>x.name==='Escudeiro');};
  const a=view.activation;
  if(!a){const id=random(view.availablePieceIds);return id?{type:'select',pieceId:id}:{type:'wait'};}
  const p=ownAlive.find(x=>x.id===a.pieceId);if(!p)return {type:'wait'};
  if(a.mode==='move'){
    if(a.moveRemaining<=0)return {type:'stopMove'};
    if((a.stepsTaken||0)>0&&Math.random()<0.30)return {type:'stopMove'};
    const opts=neighbors(p.coord,p.diag).filter(c=>canShare(p,c));
    const to=random(opts);return to?{type:'moveStep',to}:{type:'stopMove'};
  }
  if(a.mode==='attack'){
    let opts=attackCells(p).filter(c=>!ownCoords.has(c)&&!baseCoords.has(c));
    if(a.lastPerception===true){const adj=new Set(neighbors(p.coord,false));const near=opts.filter(c=>adj.has(c));if(near.length)opts=near;}
    const to=random(opts);return to?{type:'attack',to}:{type:'end'};
  }
  if(a.mode==='pyro'){
    const picked=Array.isArray(a.pyroTargets)?a.pyroTargets:[];
    const legal=neighbors(p.coord,false).filter(c=>!picked.includes(c)&&!ownCoords.has(c)&&!baseCoords.has(c));
    if(!picked.length){const to=random(legal);return to?{type:'pyroSelect',to}:{type:'end'};}
    if(picked.length>=2||!legal.length||Math.random()<0.5)return {type:'pyroConfirm'};
    return {type:'pyroSelect',to:random(legal)};
  }
  const sabotage=chooseSabotage(view,p);if(sabotage)return sabotage;
  if(!a.movementUsed&&p.m>0)return {type:'startMove'};
  if(p.a>0)return {type:'startAttack'};
  return {type:'end'};
}
self.onmessage=e=>{
  const {id,view}=e.data||{};
  const action=decide(view);
  self.postMessage({id,action});
};
