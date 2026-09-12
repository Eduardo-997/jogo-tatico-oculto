import {createRequire} from 'node:module';
import {makeGeneralBrains,defaultGeneralControl,generalStep,brainSnapshots} from '../public/generals-core.mjs';
const require=createRequire(import.meta.url),R=require('../public/rules.js');require('../public/referee.js');
const sides=['player','enemy'],cells=Array.from({length:64},(_,i)=>R.coord(i%8,Math.floor(i/8)));
const out={games:0,completed:0,actions:0,invalid:[],invariants:[],stalled:[],results:{},maxCheckpointBytes:0};
const orig=Math.random,seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const config=new globalThis.GameReferee().normalizeMatchConfig({teamSize:{player:Number(process.env.TEAM_PLAYER)||4,enemy:Number(process.env.TEAM_ENEMY)||4},lossLimit:{player:Number(process.env.LOSSES_PLAYER)||3,enemy:Number(process.env.LOSSES_ENEMY)||3}});out.config=config;
for(const [di,difficulty]of ['easy','normal','hard','extreme'].entries())for(let game=0;game<Number(process.env.GAMES||20);game++){
  const seed=760000+(Number(process.env.SEED_OFFSET)||0)+di*1000+game;Math.random=seeded(seed);
  let ref=new globalThis.GameReferee();const team=(offset,positions)=>Array.from({length:config.teamSize[offset===0?'player':'enemy']},(_,i)=>({name:R.defs[(game*4+di*3+offset+i)%20].name,coord:positions[i]}));
  const playerCells=['A2','C2','E2','H2','B2','D2','G2','A3'],enemyCells=['H7','F7','D7','A7','G7','E7','B7','H6'];
  const start=ref.startMultiplayerGame(team(0,playerCells),['B1','G1'],team(7,enemyCells),['G8','B8'],config);if(!start.ok)throw Error(start.status);
  const control=defaultGeneralControl();control.difficulties={player:difficulty,enemy:difficulty};control.roundLimit=Number(process.env.MAX_ROUNDS)||0;let brains=makeGeneralBrains(control),steps=0;
  for(;steps<5000;steps++){
    const raw=JSON.parse(ref.exportState());if(raw.gameOver)break;
    const step=generalStep(ref,brains,control);out.actions++;
    if(!step.result?.ok){out.invalid.push({difficulty,game,seed,step:steps,...step});break;}
    const alive=sides.flatMap(s=>JSON.parse(ref.exportState()).pieces[s]).filter(p=>p.alive),errors=[];
    for(const p of alive){if(!cells.includes(p.coord))errors.push('coord '+p.id);if(p.linkedToId&&!alive.some(q=>q.id===p.linkedToId&&q.owner===p.owner&&q.coord===p.coord))errors.push('link '+p.id);}
    for(const c of cells){const here=alive.filter(p=>p.coord===c);if(new Set(here.map(p=>p.owner)).size>1)errors.push('opponent stack '+c);if(here.length>2)errors.push('stack '+c);if(here.length===2&&!here.some(p=>p.name==='Escudeiro'||(p.name==='Doppelgänger'&&p.copied==='Escudeiro')))errors.push('nonshield stack '+c);}
    if(errors.length){out.invariants.push({difficulty,game,step:steps,errors});break;}
    if(process.env.RESTORE==='1'&&steps%31===0){const state=ref.exportState(),saved=brainSnapshots(brains);const bytes=Buffer.byteLength(JSON.stringify({gameState:state,generalBrains:saved,generalControl:control,ready:{player:team(0,playerCells),enemy:team(7,enemyCells)}}));out.maxCheckpointBytes=Math.max(out.maxCheckpointBytes,bytes);if(bytes>120000)throw Error('Checkpoint próximo do limite de armazenamento: '+bytes);ref=new globalThis.GameReferee();ref.importState(state);brains=makeGeneralBrains(control,saved);}
  }
  out.games++;const end=JSON.parse(ref.exportState());if(end.gameOver){out.completed++;out.results[end.result]=(out.results[end.result]||0)+1;}else out.stalled.push({difficulty,game,seed,steps,round:end.round,pieces:end.pieces});
}
Math.random=orig;console.log(JSON.stringify(out,null,2));if(out.invalid.length||out.invariants.length||out.stalled.length)process.exitCode=1;
