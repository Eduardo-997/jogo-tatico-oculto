import * as T from '../public/tri-core.js';
import * as M from '../public/tri-map.js';
import fs from 'node:fs';
import vm from 'node:vm';
const checkpointContext=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(new URL('../public/local-checkpoint.js',import.meta.url),'utf8'),checkpointContext);
const checkpoint=checkpointContext.window.BNSLocalCheckpoint.create('arena',{coords:M.TRI_MAP.ids,names:T.TRI_DEFS.map(d=>d.name)});

function invariantErrors(ref){
  const s=JSON.parse(ref.exportState()),errors=[];
  const alive=T.TRI_SIDES.flatMap(side=>(s.pieces[side]||[]).filter(p=>p.alive));
  const ids=new Set();
  for(const p of alive){
    if(ids.has(p.id))errors.push(`duplicate id ${p.id}`);ids.add(p.id);
    if(!M.TRI_MAP.ids.includes(p.coord))errors.push(`invalid coord ${p.id}:${p.coord}`);
    const linked=p.linkedToId&&alive.find(q=>q.id===p.linkedToId&&q.owner===p.owner);
    if(p.linkedToId&&(!linked||linked.coord!==p.coord))errors.push(`broken link ${p.id}->${p.linkedToId}`);
  }
  for(const c of M.TRI_MAP.ids){
    const here=alive.filter(p=>p.coord===c),owners=new Set(here.map(p=>p.owner));
    if(owners.size>1)errors.push(`opponents share ${c}: ${here.map(p=>p.owner+':'+p.name).join(',')}`);
    for(const side of T.TRI_SIDES){const own=here.filter(p=>p.owner===side);if(own.length>2)errors.push(`three allies share ${c}`);if(own.length===2&&!own.some(p=>p.name==='Escudeiro'||(p.name==='Doppelgänger'&&p.copied==='Escudeiro')))errors.push(`invalid ally stack ${c}`);}
  }
  return [...new Set(errors)];
}

const difficulties=['easy','normal','hard','extreme'];
const totals={games:0,completed:0,actions:0,invalid:0,stalled:0,maxRound:0,invariants:[],results:{}};
const originalRandom=Math.random;
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
for(const [di,difficulty] of difficulties.entries()){
  if(process.env.DIFFICULTY&&process.env.DIFFICULTY!==difficulty)continue;
  for(let game=0;game<Math.max(1,Number(process.env.GAMES)||30);game++){
    const seed=150000+(Number(process.env.SEED_OFFSET)||0)+di*1000+game;Math.random=seeded(seed);
    const ref=new T.TriReferee(),a=ref.autoSetup('A',difficulty,4),start=ref.startSolo(a.setup,a.bases,{B:difficulty,C:difficulty});
    if(!start.ok)throw new Error(`setup failed ${difficulty}: ${start.status}`);
    const ais=Object.fromEntries(T.TRI_SIDES.map(side=>[side,new T.TriAI(side,difficulty)]));
    let steps=0;
    for(;steps<5000;steps++){
      const state=JSON.parse(ref.exportState());
      if(state.gameOver)break;
      const side=state.pendingCombat?.winnerSide||T.TRI_SIDES.find(x=>state.doppelChoice?.[x])||state.turn;
      const client=ref.client(side),before=client.getView(),action=ais[side].decide(before),res=T.applyTriAction(client,action);
      totals.actions++;
      ais[side].reportResult(action,res,before);
      if(!res.ok){
        totals.invalid++;totals.invalidDetails=totals.invalidDetails||[];if(totals.invalidDetails.length<20)totals.invalidDetails.push({difficulty,game,seed,step:steps,action,res});
        const fallback=client.getView().pendingCombat?{type:'combatChoice',advance:false}:client.getView().doppelChoice?{type:'doppel',copyNew:false}:{type:'end'};
        T.applyTriAction(client,fallback);
      }
      let errs=invariantErrors(ref);if(process.env.CHECKPOINT==='1'&&!checkpoint.valid(ref.exportState()))errs.push('checkpoint inválido');if(errs.length){const raw=JSON.parse(ref.exportState()),related=T.TRI_SIDES.flatMap(x=>raw.pieces[x]).filter(p=>p.alive&&(errs.some(e=>e.includes(p.id)||e.includes(p.coord))||p.linkedToId));totals.invariants.push({difficulty,game,seed,step:steps,action,res,errs,turn:raw.turn,pendingCombat:raw.pendingCombat,related,history:Object.fromEntries(T.TRI_SIDES.map(x=>[x,raw.history[x].slice(0,6)]))});break;}
    }
    totals.games++;
    const end=JSON.parse(ref.exportState());totals.maxRound=Math.max(totals.maxRound,end.round||0);
    if(end.gameOver){totals.completed++;totals.results[end.result]=(totals.results[end.result]||0)+1;}else{totals.stalled++;totals.stallDetails=totals.stallDetails||[];totals.stallDetails.push({difficulty,game,seed,round:end.round,turn:end.turn,alive:Object.fromEntries(T.TRI_SIDES.map(x=>[x,end.pieces[x].filter(p=>p.alive).map(p=>({id:p.id,name:p.name,identity:p.identity,coord:p.coord,hp:p.hp,linkedToId:p.linkedToId,copied:p.copied}))])),combatStats:Object.fromEntries(T.TRI_SIDES.map(side=>[side,ref.client(side).getView().ownPieces.filter(p=>p.alive).map(p=>({id:p.id,name:p.name,type:p.type,attack:p.a,movement:p.m}))])),bases:end.bases,history:Object.fromEntries(T.TRI_SIDES.map(x=>[x,end.history[x].slice(0,8)]))});}
  }
}
Math.random=originalRandom;
console.log(JSON.stringify(totals,null,2));
if(totals.invalid||totals.invariants.length||totals.stalled)process.exitCode=1;
