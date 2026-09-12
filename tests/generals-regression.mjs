import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GameRoom,default as worker} from '../src/worker.js';
import {orient,createClassicBrain} from '../public/classic-ai.mjs';
import {defaultGeneralControl,makeGeneralBrains,brainSnapshots,generalStep,applyGeneralAction,applyGeneralRecord,finishGeneralObservation,describeGeneralStep} from '../public/generals-core.mjs';
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
test('Um general Online reserva ambos os lados e prepara níveis distintos',async()=>{
  const {ctx,room}=await make(),ws=new Socket();ctx.sockets.push(ws);await send(room,ws,{type:'join',room:'BOTH',side:'enemy',both:true});assert.deepEqual(ws.att.controlledSides,['player','enemy']);assert.equal(ws.att.side,'player');assert.equal(room.sideSocket('enemy'),ws);
  await send(room,ws,{type:'generalDifficulty',side:'enemy',difficulty:'extreme'});assert.equal(room.generalControl.difficulties.enemy,'extreme');assert.equal(room.generalControl.difficulties.player,'normal');
  await send(room,ws,{type:'ready',side:'player',...setup('player')});assert.equal(room.started,false);await send(room,ws,{type:'ready',side:'enemy',...setup('enemy')});assert.equal(room.started,true);assert.equal(ws.sent.filter(m=>m.type==='generalView').length,1);
  const recovered=await connect(room,ctx,'enemy',ws.last('joined').seatToken);assert.deepEqual(recovered.att.controlledSides,['player','enemy']);assert.equal(room.sideSocket('enemy'),recovered);
});
test('Reserva dupla, configuração e controle sobrevivem nova instância do servidor',async()=>{const {ctx,room}=await make(),ws=new Socket();ctx.sockets.push(ws);await send(room,ws,{type:'join',both:true,room:'GTEST'});await send(room,ws,{type:'setMatchConfig',roundLimit:25,config:{teamSize:{player:1,enemy:1},lossLimit:{player:1,enemy:1}}});const oldToken=ws.last('joined').seatToken;const recovered=await make(Object.fromEntries(ctx.data)),fresh=await connect(recovered.room,recovered.ctx,'enemy',oldToken);assert.deepEqual(fresh.att.controlledSides,['player','enemy']);assert.equal(recovered.room.matchConfig.teamSize.enemy,1);assert.equal(recovered.room.generalControl.roundLimit,25);});
test('Ambos só podem ser reservados em sala vazia; confirmação não revela preparação a terceiros',async()=>{
  const {ctx,room}=await make(),a=await connect(room,ctx,'enemy'),attacker=new Socket();ctx.sockets.push(attacker);await send(room,attacker,{type:'join',both:true,room:'GTEST'});assert.equal(attacker.att.side,null);assert.match(attacker.last('error').message,/sala nova/);assert.equal(room.seatTokens.enemy,a.last('joined').seatToken);
});
test('General comum não pode preparar, render ou definir nível do adversário',async()=>{
  const {ctx,room}=await make(),a=await connect(room,ctx,'player'),b=await connect(room,ctx,'enemy');for(const message of [{type:'ready',...setup('enemy')},{type:'generalDifficulty',difficulty:'extreme'},{type:'unready'},{type:'action',action:{type:'surrender'}}]){await send(room,a,{...message,side:'enemy'});assert.equal(a.last('result').ok,false);}assert.equal(room.ready.enemy,null);assert.equal(room.generalControl.difficulties.enemy,'normal');assert.equal(b.last('generalView'),undefined);
});
test('Falha de reserva dupla não deixa nenhum token reservado',async()=>{
  const {ctx,room}=await make(),ws=new Socket();ctx.sockets.push(ws);const put=ctx.storage.put;try{ctx.storage.put=async()=>{throw Error('injected');};await send(room,ws,{type:'join',both:true,room:'GTEST'});}finally{ctx.storage.put=put;}assert.deepEqual(room.seatTokens,{});assert.equal(ws.att.side,null);assert.ok(ws.last('error'));
});
test('Preparação dupla confirmada sobrevive desconexão antes do início',async()=>{
  const {ctx,room}=await make(),ws=new Socket();ctx.sockets.push(ws);await send(room,ws,{type:'join',both:true,room:'GTEST'});await send(room,ws,{type:'ready',side:'enemy',...setup('enemy')});ws.close();await room.webSocketClose(ws);const newer=await connect(room,ctx,'player',ws.last('joined').seatToken);assert.deepEqual(newer.last('joined').preparations.enemy,setup('enemy'));assert.equal(room.started,false);
});
for(const count of [1,2,8])test(`Generais Online: configuração de ${count} peças e limite de perdas`,async()=>{
  const {ctx,room}=await make(),a=await connect(room,ctx,'player'),b=await connect(room,ctx,'enemy');await send(room,a,{type:'setMatchConfig',config:{teamSize:{player:count,enemy:count},lossLimit:{player:count,enemy:count}}});assert.equal(a.last('result').ok,true);
  const cells={player:['A2','B2','C2','D2','E2','G2','H2','A3'],enemy:['A7','B7','D7','E7','F7','G7','H7','H6']};for(const [ws,side]of [[a,'player'],[b,'enemy']])await send(room,ws,{type:'ready',setup:globalThis.GameRules.defs.slice(0,count).map((d,i)=>({name:d.name,coord:cells[side][i]})),bases:setup(side).bases});assert.equal(room.started,true);const raw=JSON.parse(room.referee.exportState());assert.equal(raw.pieces.player.length,count);assert.equal(raw.matchConfig.lossLimit.enemy,count);
});
test('Reconfigurar cancela os dois Prontos; General 2 não altera configuração',async()=>{const {ctx,room}=await make(),a=await connect(room,ctx,'player'),b=await connect(room,ctx,'enemy');await send(room,a,{type:'ready',...setup('player')});await send(room,b,{type:'setMatchConfig',config:{teamSize:{player:1,enemy:1}}});assert.equal(b.last('result').ok,false);await send(room,a,{type:'setMatchConfig',config:{teamSize:{player:2,enemy:8}}});assert.equal(room.ready.player,null);assert.equal(room.ready.enemy,null);assert.equal(room.matchConfig.teamSize.enemy,8);});
test('Encerramento Online exige dois votos, pode cancelar e gera replay válido',async()=>{
  const {ctx,room}=await make(),{a,b}=await start(room,ctx);await send(room,a,{type:'generalControl',command:'finish'});assert.equal(JSON.parse(room.referee.exportState()).gameOver,false);await send(room,a,{type:'generalControl',command:'cancelFinish'});assert.equal(room.generalControl.finishVotes.player,false);await send(room,b,{type:'generalControl',command:'finish'});assert.equal(JSON.parse(room.referee.exportState()).gameOver,false);await send(room,a,{type:'generalControl',command:'finish'});const raw=JSON.parse(room.referee.exportState());assert.equal(raw.generalEnded,true);assert.equal(raw.result,'draw');assert.equal(ctx.alarmTime,null);const rr=new globalThis.GameReferee();rr.importState(room.replayInitialState);for(const entry of room.replayActions)assert.ok(applyGeneralRecord(rr,entry).ok);assert.equal(JSON.parse(rr.exportState()).generalEnded,true);assert.ok(a.last('classicReplay'));
});
test('Um general de ambos encerra sem segundo navegador e pode render o lado escolhido',async()=>{
  for(const command of ['finish','surrender']){const {ctx,room}=await make(),ws=new Socket();ctx.sockets.push(ws);await send(room,ws,{type:'join',both:true,room:'GTEST'});for(const side of ['player','enemy'])await send(room,ws,{type:'ready',side,...setup(side)});await send(room,ws,command==='finish'?{type:'generalControl',command}:{type:'action',side:'enemy',action:{type:'surrender'}});const raw=JSON.parse(room.referee.exportState());assert.equal(raw.gameOver,true);assert.equal(command==='finish'?raw.generalEnded:raw.result,command==='finish'?true:'player');}
});
test('Falha de gravação desfaz votos e encerramento da observação',async()=>{
  const {ctx,room}=await make(),{a,b}=await start(room,ctx);await send(room,a,{type:'generalControl',command:'finish'});const put=ctx.storage.put,log=console.error;try{ctx.storage.put=async()=>{throw Error('injected');};console.error=()=>{};await send(room,b,{type:'generalControl',command:'finish'});}finally{ctx.storage.put=put;console.error=log;}assert.equal(JSON.parse(room.referee.exportState()).gameOver,false);assert.equal(room.generalControl.finishVotes.enemy,undefined);assert.equal(room.replayActions.length,0);
});
test('Última ação conserva ataque vazio/criação e não vaza por roomState',async()=>{
  const raw={round:2,pieces:{player:[{id:'p',name:'Piromante',coord:'D4'}]},activation:{player:{pieceId:'p',pyroTargets:['D2','D3']}},history:{player:[]}},after={history:{player:['Não atingiu ninguém.']},replayEvent:{type:'sequence',events:[{type:'attack',cells:['D2']},{type:'attack',cells:['D3']}]}};
  const event=describeGeneralStep(raw,{type:'pyroConfirm'},{ok:true},'player',after);assert.deepEqual(event.cells,['D2','D3']);assert.equal(event.kind,'attack');assert.equal(event.detail,'Não atingiu ninguém.');for(const type of ['mirror','trap','raise','awaken'])assert.equal(describeGeneralStep(raw,{type,to:'D5'},{ok:true},'player',after).cells.includes('D5'),true);
  const {room,ctx}=await make();await start(room,ctx);room.generalControl.latest={...event,id:1};assert.equal(room.roomState().generalControl.latest,undefined);room.broadcastViews();assert.equal(room.sideSocket('player').last('generalView').control.latest.id,1);
});
test('Limite opcional de rodadas encerra apenas observação e é reproduzível no replay',()=>{
  const ref=new globalThis.GameReferee(),a=setup('player'),b=setup('enemy');ref.startMultiplayerGame(a.setup,a.bases,b.setup,b.bases);const raw=JSON.parse(ref.exportState());raw.round=3;ref.importState(JSON.stringify(raw));const step=generalStep(ref,{}, {roundLimit:2});assert.equal(step.result.ok,true);assert.equal(step.action.type,'observerFinish');assert.equal(JSON.parse(ref.exportState()).generalEndReason,'roundLimit');const rr=new globalThis.GameReferee();rr.importState(JSON.stringify(raw));assert.ok(applyGeneralRecord(rr,step).ok);assert.equal(JSON.parse(rr.exportState()).generalEndReason,'roundLimit');
});
test('Limite de rodadas Online só é configurado antes de iniciar e pelo General 1',async()=>{
  const {ctx,room}=await make(),a=await connect(room,ctx,'player'),b=await connect(room,ctx,'enemy');await send(room,b,{type:'setMatchConfig',roundLimit:2});assert.equal(b.last('result').ok,false);await send(room,a,{type:'setMatchConfig',roundLimit:-1});assert.equal(a.last('result').ok,false);await send(room,a,{type:'setMatchConfig',roundLimit:2});assert.equal(room.generalControl.roundLimit,2);for(const [ws,side]of [[a,'player'],[b,'enemy']])await send(room,ws,{type:'ready',...setup(side)});await send(room,a,{type:'setMatchConfig',roundLimit:5});assert.equal(a.last('result').ok,false);assert.equal(room.generalControl.roundLimit,2);
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
