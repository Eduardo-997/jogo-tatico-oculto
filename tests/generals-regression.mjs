import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GameRoom,default as worker} from '../src/worker.js';
import {orient,createClassicBrain} from '../public/classic-ai.mjs';
import {defaultGeneralControl,makeGeneralBrains,brainSnapshots,generalStep,applyGeneralAction} from '../public/generals-core.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
class Socket{constructor(){this.readyState=1;this.att={side:null};this.sent=[];}serializeAttachment(v){this.att=structuredClone(v);}deserializeAttachment(){return structuredClone(this.att);}send(raw){this.sent.push(JSON.parse(raw));}close(){this.readyState=3;}last(type){return this.sent.filter(m=>m.type===type).at(-1);}}
function context(saved){const data=new Map(saved?Object.entries(saved):[]),ctx={sockets:[],alarmTime:null,storage:{async get(k){return structuredClone(data.get(k));},async put(k,v){if(typeof k==='object')for(const [key,value]of Object.entries(k))data.set(key,structuredClone(value));else data.set(k,structuredClone(v));},async setAlarm(time){ctx.alarmTime=time;},async deleteAlarm(){ctx.alarmTime=null;}},blockConcurrencyWhile(fn){ctx.init=fn();},getWebSockets(){return ctx.sockets;},data};return ctx;}
async function make(saved){const ctx=context(saved),room=new GameRoom(ctx,{});await ctx.init;room.generals=true;return{ctx,room};}
const send=(room,ws,msg)=>room.webSocketMessage(ws,JSON.stringify(msg));
async function connect(room,ctx,side,seatToken){const ws=new Socket();ctx.sockets.push(ws);await send(room,ws,{type:'join',room:'GTEST',side,...(seatToken?{seatToken}:{})});return ws;}
const setup=s=>({setup:['Ninja','Cavaleiro','Bardo','Fantasma'].map((name,i)=>({name,coord:(s==='player'?['A2','C2','E2','H2']:['H7','F7','D7','A7'])[i]})),bases:s==='player'?['B1','G1']:['G8','B8']});
async function start(room,ctx){const a=await connect(room,ctx,'player'),b=await connect(room,ctx,'enemy');await send(room,a,{type:'ready',...setup('player')});await send(room,b,{type:'ready',...setup('enemy')});return{a,b};}
test('Orientação de IA é involutiva: casas, owners, configurações e texto',()=>{
  const value={turn:'player',ownPieces:[{id:'p1',coord:'B3',owner:'player'}],history:['Ataque em G6.'],rockHp:{F2:3},matchConfig:{teamSize:{player:2,enemy:8}},seer:['A1','H8']};
  const flipped=orient(value,'player');assert.equal(flipped.ownPieces[0].coord,'G6');assert.equal(flipped.ownPieces[0].owner,'enemy');assert.deepEqual(flipped.rockHp,{C7:3});assert.equal(flipped.matchConfig.teamSize.enemy,2);assert.deepEqual(orient(flipped,'player'),value);assert.deepEqual(orient(value,'enemy'),value);
});
test('Duas IAs têm memórias independentes e snapshots recuperáveis',()=>{
  const ref=new globalThis.GameReferee(),a=setup('player'),b=setup('enemy');ref.startMultiplayerGame(a.setup,a.bases,b.setup,b.bases);
  const brains=makeGeneralBrains(defaultGeneralControl()),before=brains.enemy.snapshot();brains.player.decide(ref.createClient('player').getView());assert.deepEqual(brains.enemy.snapshot(),before);
  const saved=brainSnapshots(brains),restored=makeGeneralBrains(defaultGeneralControl(),saved);assert.deepEqual(brainSnapshots(restored),saved);
});
test('Visão da IA não inclui a composição secreta mesmo com espectador completo',async()=>{
  const{room,ctx}=await make();const{a}=await start(room,ctx);assert.equal(a.last('generalView').state.pieces.enemy.length,4);
  for(const s of ['player','enemy']){const view=room.referee.createClient(s).getView();assert.equal(view.visibleOpponents.length,0);const brain=createClassicBrain(s);brain.decide(view);const text=JSON.stringify(brain.snapshot());const other=s==='player'?'enemy':'player';for(const p of JSON.parse(room.referee.exportState()).pieces[other])assert.equal(text.includes('"id":"'+p.id+'"'),false);}
});
test('Generais escolhem lados, inclusive General 2 entrando primeiro',async()=>{
  const{room,ctx}=await make();const b=await connect(room,ctx,'enemy'),a=await connect(room,ctx,'player');assert.equal(b.att.side,'enemy');assert.equal(a.att.side,'player');const occupied=await connect(room,ctx,'enemy');assert.equal(occupied.att.side,null);assert.match(occupied.last('error').message,/ocupado/);
});
test('General desconectado mantém lado reservado; token retoma sem troca',async()=>{
  const{room,ctx}=await make();const a=await connect(room,ctx,'player'),token=a.last('joined').seatToken;a.close();await room.webSocketClose(a);const stranger=await connect(room,ctx,'player');assert.equal(stranger.att.side,null);const recovered=await connect(room,ctx,'enemy',token);assert.equal(recovered.att.side,'player');
});
test('Pronto de apenas um lado não divulga peças ou posições; reconexão só recebe a própria preparação',async()=>{
  const{room,ctx}=await make(),a=await connect(room,ctx,'player'),b=await connect(room,ctx,'enemy');await send(room,a,{type:'ready',...setup('player')});assert.equal(room.started,false);assert.equal(a.last('generalView'),undefined);assert.equal(b.last('generalView'),undefined);assert.equal(JSON.stringify(b.sent).includes('A2'),false);assert.equal(JSON.stringify(b.sent).includes('"setup"'),false);
  const aa=await connect(room,ctx,'player',a.last('joined').seatToken);assert.deepEqual(aa.last('joined').preparation,setup('player'));assert.equal(b.last('joined').preparation,null);
});
test('Ambos prontos liberam mapa e agendam IA; espectadores sem assento não recebem estado',async()=>{
  const{room,ctx}=await make();const observer=new Socket();ctx.sockets.push(observer);const{a,b}=await start(room,ctx);assert.equal(room.started,true);assert.ok(ctx.alarmTime);for(const ws of [a,b]){assert.equal(ws.last('generalView').state.pieces.player.length,4);assert.equal(ws.last('generalView').state.pieces.enemy.length,4);assert.equal(ws.last('view'),undefined);}assert.equal(observer.last('generalView'),undefined);
});
test('Servidor recusa comandos manuais de peças no modo Generais',async()=>{
  const{room,ctx}=await make();const{a}=await start(room,ctx);const before=room.referee.exportState();await send(room,a,{type:'action',action:{type:'endActivation'}});assert.equal(a.last('result').ok,false);assert.equal(room.referee.exportState(),before);
});
test('Pausa impede alarme; passo avança exatamente uma ação mantendo pausa',async()=>{
  const{room,ctx}=await make();const{a}=await start(room,ctx);await send(room,a,{type:'generalControl',command:'pause'});const count=room.replayActions.length;await room.alarm();assert.equal(room.replayActions.length,count);assert.equal(ctx.alarmTime,null);await send(room,a,{type:'generalControl',command:'step'});assert.equal(room.replayActions.length,count+1);assert.equal(room.generalControl.paused,true);assert.equal(ctx.alarmTime,null);
});
test('General 2 também pode controlar observação; níveis são por lado e travam no início',async()=>{
  const{room,ctx}=await make(),a=await connect(room,ctx,'player'),b=await connect(room,ctx,'enemy');await send(room,b,{type:'generalDifficulty',difficulty:'extreme'});assert.equal(room.generalControl.difficulties.enemy,'extreme');assert.equal(room.generalControl.difficulties.player,'normal');await send(room,a,{type:'ready',...setup('player')});await send(room,b,{type:'ready',...setup('enemy')});await send(room,b,{type:'generalControl',command:'speed',delay:150});assert.equal(room.generalControl.delay,150);await send(room,b,{type:'generalDifficulty',difficulty:'easy'});assert.equal(room.generalControl.difficulties.enemy,'extreme');assert.equal(b.last('result').ok,false);
});
test('Velocidade e comandos inválidos não alteram controle',async()=>{
  const{room,ctx}=await make();const{a}=await start(room,ctx);const before=structuredClone(room.generalControl);await send(room,a,{type:'generalControl',command:'speed',delay:-1});assert.deepEqual(room.generalControl,before);await send(room,a,{type:'generalControl',command:'hack'});assert.deepEqual(room.generalControl,before);
});
test('Nova instância recupera jogo, controle, ambos os cérebros e token',async()=>{
  const{room,ctx}=await make();const{a}=await start(room,ctx);await room.generalTick();await send(room,a,{type:'generalControl',command:'pause'});const saved=Object.fromEntries(ctx.data),restored=await make(saved);assert.equal(restored.room.started,true);assert.deepEqual(brainSnapshots(restored.room.generalBrains),brainSnapshots(room.generalBrains));assert.equal(restored.room.generalControl.paused,true);const aa=await connect(restored.room,restored.ctx,'enemy',a.last('joined').seatToken);assert.equal(aa.att.side,'player');assert.ok(aa.last('generalView'));assert.equal(aa.last('joined').preparation,null);
});
test('Falha de persistência de IA desfaz ação e memórias e pausa para inspeção',async()=>{
  const{room,ctx}=await make();await start(room,ctx);room.referee.importState(room.referee.exportState());const before=room.referee.exportState(),brains=brainSnapshots(room.generalBrains),count=room.replayActions.length,put=ctx.storage.put,log=console.error;
  try{ctx.storage.put=async()=>{throw Error('storage fail');};console.error=()=>{};await room.generalTick();}finally{ctx.storage.put=put;console.error=log;}
  assert.equal(room.referee.exportState(),before);assert.deepEqual(brainSnapshots(room.generalBrains),brains);assert.equal(room.replayActions.length,count);assert.equal(room.generalControl.paused,true);
});
test('Falha de agendamento após salvar não desfaz ação já persistida',async()=>{
  const{room,ctx}=await make();await start(room,ctx);const count=room.replayActions.length;ctx.storage.setAlarm=async()=>{throw Error('alarm fail');};await room.generalTick();assert.equal(room.replayActions.length,count+1);assert.equal(room.generalControl.paused,true);assert.equal((await ctx.storage.get('room')).replayActionCount,count+1);
});
test('Rendição encerra o próprio exército e envia replay depois do fim',async()=>{
  const{room,ctx}=await make();const{a,b}=await start(room,ctx);assert.equal(a.last('classicReplay'),undefined);await send(room,b,{type:'action',action:{type:'surrender'}});assert.equal(JSON.parse(room.referee.exportState()).result,'player');assert.ok(a.last('classicReplay'));assert.equal(ctx.alarmTime,null);assert.equal(room.replayActions.at(-1).side,'enemy');
});
test('Rotas separam salas de Generais e Clássico normal com o mesmo código',async()=>{
  const names=[],env={GAME_ROOMS:{getByName(name){names.push(name);return{fetch:()=>new Response('ok')};}},ASSETS:{fetch:()=>new Response('asset')}};await worker.fetch(new Request('https://game/ws?room=TEST'),env);await worker.fetch(new Request('https://game/ws?room=TEST&generals=1'),env);assert.deepEqual(names,['TEST','GENERALS:TEST']);
});
test('Escolha pós-Confronto da IA tem prioridade mesmo fora da sua vez nominal',()=>{
  const ref=new globalThis.GameReferee();const a=setup('player'),b=setup('enemy');ref.startMultiplayerGame(a.setup,a.bases,b.setup,b.bases);const raw=JSON.parse(ref.exportState());raw.turn='player';raw.pendingCombat={winnerId:raw.pieces.enemy[0].id,winnerSide:'enemy',ownCell:'H7',deadCell:'H6',afterSide:'player'};ref.importState(JSON.stringify(raw));let seen;const fake={enemy:{decide(v){seen=v;return{type:'combatChoice',advance:false};},reportResult(){}}};const step=generalStep(ref,fake);assert.equal(step.side,'enemy');assert.ok(seen.pendingCombat);assert.ok(step.result.ok);
});
test('IA × IA reproduz ações gravadas sem divergência de regras',()=>{
  const ref=new globalThis.GameReferee(),a=setup('player'),b=setup('enemy');ref.startMultiplayerGame(a.setup,a.bases,b.setup,b.bases);const initial=ref.exportState(),brains=makeGeneralBrains(defaultGeneralControl()),records=[];for(let i=0;i<60&&!JSON.parse(ref.exportState()).gameOver;i++){const step=generalStep(ref,brains);assert.ok(step.result.ok);records.push(step);}const replay=new globalThis.GameReferee();replay.importState(initial);for(const step of records)assert.ok(applyGeneralAction(replay.createClient(step.side),step.action).ok);for(const s of ['player','enemy'])assert.deepEqual(replay.createClient(s).getView(),ref.createClient(s).getView());
});
test('Página Generais usa preparação privada, pausa/passo e versão atual',()=>{
  const html=read('public/generals.html'),version=JSON.parse(read('package.json')).version;assert.ok(html.includes(`Versão do jogo">v${version}`));for(const id of ['generalSide','generalReady','generalPause','generalStep','generalSpeed','generalSurrender'])assert.ok(html.includes('id="'+id+'"'));assert.match(read('public/generals-ui.mjs'),/generals=1&room=/);assert.ok(read('public/index.html').includes('href="generals.html"'));
});
test('Geração da fonte IA não usa eval nem altera os atributos das regras',()=>{
  const generated=read('public/classic-ai.mjs');assert.equal(/\b(?:eval\(|new Function\b)/.test(generated),false);const original=read('public/ai-worker.js').split("if(typeof self!=='undefined')self.onmessage=")[0].replace(/^'use strict';\s*/,'');assert.ok(generated.includes(original));
});
for(const difficulty of ['easy','normal','hard','extreme'])test(`Alarmes de Generais levam a partida ao fim e gravam replay: ${difficulty}`,async()=>{
  const{room,ctx}=await make();room.generalControl.difficulties={player:difficulty,enemy:difficulty};await start(room,ctx);let ticks=0;
  while(!JSON.parse(room.referee.exportState()).gameOver&&ticks<5000){await room.alarm();ticks++;assert.equal(room.generalControl.error,null);}
  assert.ok(JSON.parse(room.referee.exportState()).gameOver);assert.equal(room.replayActions.length,ticks);const stored=await ctx.storage.get('room');assert.equal(stored.gameState,room.referee.exportState());
  const replayRef=new globalThis.GameReferee();replayRef.importState(room.replayInitialState);for(const entry of room.replayActions)assert.ok(applyGeneralAction(replayRef.createClient(entry.side),entry.action).ok);
  for(const s of ['player','enemy'])assert.deepEqual(replayRef.createClient(s).getView(),room.referee.createClient(s).getView());
});
