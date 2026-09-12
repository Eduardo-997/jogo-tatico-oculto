import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GameRoom,TriGameRoom} from '../src/worker.js';
import {enqueue,loadReplay,persistReplay} from '../src/room-protocol.js';

class Socket{
  constructor(){this.readyState=1;this.att={side:null};this.sent=[];}
  serializeAttachment(value){this.att=structuredClone(value);}
  deserializeAttachment(){return structuredClone(this.att);}
  send(raw){this.sent.push(JSON.parse(raw));}
  close(code,reason){this.readyState=3;this.closeCode=code;this.closeReason=reason;}
  last(type){return this.sent.filter(x=>x.type===type).at(-1);}
}
function context(saved,prefix){const data=new Map(saved?[[prefix,structuredClone(saved)]]:[]),ctx={sockets:[],storage:{async get(k){return structuredClone(data.get(k));},async put(k,v){if(typeof k==='object'){for(const [key,value] of Object.entries(k))data.set(key,structuredClone(value));}else data.set(k,structuredClone(v));}},blockConcurrencyWhile(fn){ctx.init=fn();},getWebSockets(){return ctx.sockets;}};return ctx;}
const send=(room,ws,msg)=>room.webSocketMessage(ws,JSON.stringify(msg));
test('Arena Online: rendição de A mantém B e IA C na partida, persiste e só libera replay ao final',async()=>{
  const ctx=context(),room=new TriGameRoom(ctx,{});await ctx.init;const a=new Socket(),b=new Socket();ctx.sockets.push(a,b);for(const ws of [a,b])await send(room,ws,{type:'join',room:'TEST'});
  const cfg={teamSize:{A:1,B:1,C:1},lossLimit:{A:1,B:1,C:1}};
  // Use the same valid setup generator as the referee, then import the started state into the room.
  const seed=room.referee.autoSetup('A','easy',1);assert.equal(room.referee.startSolo(seed.setup,seed.bases,{B:'easy',C:'easy'},cfg).ok,true);room.started=true;room.resetReplay();let raw=JSON.parse(room.referee.exportState());raw.turn='A';raw.controllers={A:'human',B:'human',C:'ai'};room.referee.importState(JSON.stringify(raw));room.resetReplay();
  await send(room,a,{type:'action',action:{type:'surrender'}});const view=b.last('view').view;assert.equal(view.gameOver,false);assert.equal(view.eliminated.A,true);assert.equal(view.eliminated.B,false);assert.equal(view.eliminated.C,false);assert.equal(view.turn,'B');assert.equal(a.last('arenaReplay'),undefined);const recovered=new TriGameRoom(ctx,{});await ctx.init;assert.equal(JSON.parse(recovered.referee.exportState()).eliminated.A,true);assert.equal(JSON.parse(recovered.referee.exportState()).gameOver,false);
  await send(room,b,{type:'action',action:{type:'surrender'}});assert.equal(b.last('view').view.result,'C');assert.ok(b.last('arenaReplay'));assert.equal(room.replayActions.filter(x=>x.action.type==='surrender').length,2);
});
test('Interface Clássico Online: aplica visão do próprio lado e rejeita lado ausente ou adversário',()=>{
  const src=fs.readFileSync(new URL('../public/multiplayer-ui.js',import.meta.url),'utf8'),marker="}else if(m.type==='view'){";
  const body=src.slice(src.indexOf(marker)+marker.length,src.indexOf("}else if(m.type==='classicReplay'){"));
  for(const side of ['player','enemy']){
    let draws=0;const context={side,currentView:null,rosterCollapsed:false,closeBasePanel(){},hideBardChoice(){},seerPreview:new Set(),seerConfirm:{classList:{add(){}}},render(){draws++;},setStatus(){}};
    const apply=view=>{context.m={view};vm.runInNewContext('(function(){'+body+'})()',context);};
    apply({phase:'play'});assert.equal(draws,0);assert.equal(context.currentView,null);
    apply({side,phase:'play'});assert.equal(draws,1);assert.equal(context.currentView.side,side);
    apply({side:side==='player'?'enemy':'player',phase:'play'});assert.equal(draws,1);assert.equal(context.currentView.side,side);
  }
});
test('Clássico Online: ambos Prontos recebem visão identificada que a interface aceita',async()=>{
  const ctx=context(),room=new GameRoom(ctx,{});await ctx.init;
  const a=new Socket(),b=new Socket();ctx.sockets.push(a,b);
  for(const ws of [a,b])await send(room,ws,{type:'join',room:'TEST'});
  const names=['Ninja','Cavaleiro','Bardo','Fantasma'];
  for(const [ws,coords,bases]of [[a,['A2','C2','E2','H2'],['B1','G1']],[b,['H7','F7','D7','A7'],['G8','B8']]])await send(room,ws,{type:'ready',setup:names.map((name,i)=>({name,coord:coords[i]})),bases});
  assert.equal(room.started,true);
  for(const ws of [a,b]){const view=ws.last('view').view;assert.equal(view.phase,'play');assert.equal(view.side,ws.att.side);assert.equal(view.visibleOpponents.length,0);assert.equal(view.ownPieces.length,4);}
  const aa=new Socket();ctx.sockets.push(aa);await send(room,aa,{type:'join',room:'TEST',seatToken:a.last('joined').seatToken});assert.equal(aa.last('view').view.side,'player');
});
for(const [Class,sides,prefix] of [[GameRoom,['player','enemy'],'room'],[TriGameRoom,['A','B'],'triRoom']]){
  const label=Class.name;
  async function make(saved){const ctx=context(saved,prefix),room=new Class(ctx,{});await ctx.init;return{ctx,room};}
  async function connect(room,ctx,seatToken){const ws=new Socket();ctx.sockets.push(ws);await send(room,ws,{type:'join',room:'TEST',...(seatToken?{seatToken}:{})});return ws;}
  test(`${label}: assentos, identidade e reconexão sem inversão`,async()=>{
    const {room,ctx}=await make(),a=await connect(room,ctx),b=await connect(room,ctx),ta=a.last('joined').seatToken,tb=b.last('joined').seatToken;
    assert.equal(a.att.side,sides[0]);assert.equal(b.att.side,sides[1]);assert.notEqual(ta,tb);
    assert.equal(JSON.stringify(a.sent).includes(tb),false);assert.equal(JSON.stringify(b.sent).includes(ta),false);
    room.started=true;await room.persist();a.close(1006);await room.webSocketClose(a);
    const b2=await connect(room,ctx,tb);assert.equal(b2.att.side,sides[1]);assert.equal(b.att.side,null);assert.equal(b.readyState,3);
    const a2=await connect(room,ctx,ta);assert.equal(a2.att.side,sides[0]);
    const stranger=await connect(room,ctx);assert.equal(stranger.att.side,null);assert.equal(stranger.closeCode,1008);
    const wrong=await connect(room,ctx,'wrong-token');assert.equal(wrong.att.side,null);assert.equal(wrong.closeCode,1008);
    const saved=await ctx.storage.get(prefix),restored=await make(saved);for(const [key,value] of Object.entries(saved))assert.notEqual(key,'replayActions');
    const same=await connect(restored.room,restored.ctx,tb);assert.equal(same.att.side,sides[1]);
  });
  test(`${label}: joins concorrentes não duplicam o assento`,async()=>{const {room,ctx}=await make(),a=new Socket(),b=new Socket();ctx.sockets.push(a,b);await Promise.all([send(room,a,{type:'join',room:'TEST'}),send(room,b,{type:'join',room:'TEST'})]);assert.deepEqual([a.att.side,b.att.side],sides);});
  test(`${label}: fechamento antigo não apaga preparo da conexão nova`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx),token=a.last('joined').seatToken;room.ready[sides[0]]={setup:[],bases:[]};const newer=await connect(room,ctx,token);await room.webSocketClose(a);assert.ok(room.ready[sides[0]]);assert.equal(room.sideSocket(sides[0]),newer);});
  test(`${label}: formato antigo migra cada assento uma vez`,async()=>{const {room,ctx}=await make({started:true});const a=await connect(room,ctx),b=await connect(room,ctx);assert.equal(a.att.side,sides[0]);assert.equal(b.att.side,sides[1]);a.close(1006);const unknown=await connect(room,ctx);assert.equal(unknown.att.side,null);const valid=await connect(room,ctx,a.last('joined').seatToken);assert.equal(valid.att.side,sides[0]);});
  test(`${label}: mensagens malformadas e parâmetros não alteram jogo`,async()=>{
    const {room,ctx}=await make(),a=await connect(room,ctx),before=room.referee.exportState();
    for(const raw of ['{','null','[]','42','"action"'])await room.webSocketMessage(a,raw);
    for(const msg of [{type:'ready',setup:[null],bases:[]},{type:'action',action:null},{type:'action',action:{type:'constructor'}},{type:'action',action:{type:'end',advance:'false'}},{type:'action',action:{type:'seer',cells:['A1']}}])await send(room,a,msg);
    assert.equal(room.referee.exportState(),before);assert.ok(a.last('error'));
    await room.webSocketMessage(a,'x'.repeat(16385));assert.equal(a.closeCode,1009);
  });
  test(`${label}: taxa de mensagens limitada por conexão`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx);for(let i=0;i<45;i++)await send(room,a,{type:'ping'});assert.match(a.last('error').message,/Muitas mensagens/);assert.equal(a.sent.filter(m=>m.type==='pong').length,39);});
  test(`${label}: gravação falhada desfaz configuração sem confirmar sucesso`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx),before=structuredClone(room.matchConfig);const put=ctx.storage.put,previous=console.error;try{console.error=()=>{};ctx.storage.put=async()=>{throw Error('storage failed');};await send(room,a,{type:'setMatchConfig',config:{teamSize:Object.fromEntries(sides.map(s=>[s,1])),lossLimit:Object.fromEntries(sides.map(s=>[s,1]))}});}finally{ctx.storage.put=put;console.error=previous;}assert.deepEqual(room.matchConfig,before);assert.equal(a.last('result').ok,false);assert.match(a.last('result').status,/desfeita/);});
  test(`${label}: cancelar pronto mantém assento reservado`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx),token=a.last('joined').seatToken;room.ready[sides[0]]={setup:[],bases:[]};await send(room,a,{type:'unready'});assert.equal(room.ready[sides[0]],null);assert.equal(room.seatTokens[sides[0]],token);assert.equal(a.last('result').ok,true);});
  test(`${label}: bônus do Bardo atravessa validação de mensagem`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx);let received;room.started=true;room.runAI=async()=>{};const method=prefix==='room'?'createClient':'client',actionType=prefix==='room'?'bardBuff':'bard',targetKey=prefix==='room'?'targetPieceId':'targetId';const client={bardBuff(id,stat){received={id,stat};return{ok:true};},getView(){return{gameOver:false};}};room.referee[method]=()=>client;await send(room,a,{type:'action',action:{type:actionType,[targetKey]:'ally',stat:'life'}});assert.deepEqual(received,{id:'ally',stat:'life'});assert.equal(room.replayActions[0].action.stat,'life');});
  for(const throws of [false,true])test(`${label}: falha/exception de ação não deixa mutação parcial (${throws})`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx);room.started=true;room.runAI=async()=>{};const before=room.referee.exportState(),method=prefix==='room'?'createClient':'client';room.referee[method]=()=>({selectPiece(){const raw=JSON.parse(room.referee.exportState());raw.round=99;room.referee.importState(JSON.stringify(raw));if(throws)throw Error('injected');return{ok:false,status:'rejected'};},getView(){return{gameOver:false};}});const previous=console.error;try{console.error=()=>{};await send(room,a,{type:'action',action:{type:prefix==='room'?'selectPiece':'select',pieceId:'p'}});}finally{console.error=previous;}assert.equal(JSON.parse(room.referee.exportState()).round,JSON.parse(before).round);assert.equal(room.replayActions.length,0);});
  test(`${label}: falha ao salvar ação restaura núcleo e replay`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx);room.started=true;room.runAI=async()=>{};const before=room.referee.exportState(),method=prefix==='room'?'createClient':'client';room.referee[method]=()=>({selectPiece(){const raw=JSON.parse(room.referee.exportState());raw.round=99;room.referee.importState(JSON.stringify(raw));return{ok:true};},getView(){return{gameOver:false};}});const put=ctx.storage.put,previous=console.error;try{console.error=()=>{};ctx.storage.put=async()=>{throw Error('injected');};await send(room,a,{type:'action',action:{type:prefix==='room'?'selectPiece':'select',pieceId:'p'}});}finally{ctx.storage.put=put;console.error=previous;}assert.equal(JSON.parse(room.referee.exportState()).round,JSON.parse(before).round);assert.equal(room.replayActions.length,0);assert.equal(a.last('result').ok,false);});
  test(`${label}: replay somente no fim e somente para assentos`,async()=>{const {room,ctx}=await make(),a=await connect(room,ctx),b=await connect(room,ctx),observer=new Socket();ctx.sockets.push(observer);room.started=true;room.resetReplay();room.broadcastViews();assert.equal(a.last(prefix==='room'?'classicReplay':'arenaReplay'),undefined);const raw=JSON.parse(room.referee.exportState());raw.gameOver=true;room.referee.importState(JSON.stringify(raw));room.broadcastViews();assert.ok(a.last(prefix==='room'?'classicReplay':'arenaReplay'));assert.ok(b.last(prefix==='room'?'classicReplay':'arenaReplay'));assert.equal(observer.sent.some(m=>/Replay|view/.test(m.type)),false);});
}
test('Fila mantém ordem de mutações mesmo quando há espera assíncrona',async()=>{const room={},order=[];await Promise.all([enqueue(room,async()=>{await Promise.resolve();order.push(1);}),enqueue(room,async()=>order.push(2))]);assert.deepEqual(order,[1,2]);});
test('Arena Online: entrar/reconectar retoma o processamento da IA',async()=>{const ctx=context(),room=new TriGameRoom(ctx,{});await ctx.init;let runs=0;room.runAI=async()=>{runs++;};room.started=true;room.seatTokens.A='token';const ws=new Socket();ctx.sockets.push(ws);await send(room,ws,{type:'join',room:'TEST',seatToken:'token'});assert.equal(ws.att.side,'A');assert.equal(runs,1);});
for(const throws of [false,true])test(`Arena Online: falha de IA restaura núcleo, replay e memória (${throws?'exception':'persistência'})`,async()=>{const ctx=context(),room=new TriGameRoom(ctx,{});await ctx.init;room.started=true;room.ai=new(class{constructor(){this.clock=0;}decide(){this.clock++;if(throws)throw Error('injected');return{type:'end'};}reportResult(){}})();room.referee.client=()=>({getView(){return{turn:'C',gameOver:false};},endActivation(){const raw=JSON.parse(room.referee.exportState());raw.round=99;room.referee.importState(JSON.stringify(raw));return{ok:true};}});const before=room.referee.exportState(),put=ctx.storage.put,previous=console.error;try{console.error=()=>{};if(!throws)ctx.storage.put=async()=>{throw Error('storage failed');};await assert.doesNotReject(()=>room.runAI());}finally{ctx.storage.put=put;console.error=previous;}assert.equal(JSON.parse(room.referee.exportState()).round,JSON.parse(before).round);assert.equal(room.ai.clock,0);assert.equal(room.replayActions.length,0);});
test('Replay em blocos: migração, acréscimo e recarga sem perdas',async()=>{
  const ctx=context(),room={ctx,replayActions:Array.from({length:70},(_,i)=>({side:'player',action:{type:'selectPiece',pieceId:'p'+i}}))};
  await persistReplay(room,'room',{started:true});const saved=await ctx.storage.get('room');assert.equal(saved.replayActions,undefined);assert.equal(saved.replayActionCount,70);assert.deepEqual(await loadReplay(ctx.storage,'room',saved),room.replayActions);
  room.replayActions.push({side:'enemy',action:{type:'endActivation'}});await persistReplay(room,'room',{started:true});assert.deepEqual(await loadReplay(ctx.storage,'room',await ctx.storage.get('room')),room.replayActions);
  assert.deepEqual(await loadReplay(ctx.storage,'room',{replayActions:room.replayActions}),room.replayActions);
});
test('Migração de replay grande divide lotes de armazenamento',async()=>{const ctx=context(),put=ctx.storage.put;ctx.storage.put=async(k,v)=>{if(typeof k==='object')assert.ok(Object.keys(k).length<=64);return put(k,v);};const room={ctx,replayActions:Array.from({length:4200},(_,i)=>({side:'A',action:{type:'moveStep',to:'A01',id:i}}))};await persistReplay(room,'triRoom',{started:true});assert.equal((await loadReplay(ctx.storage,'triRoom',await ctx.storage.get('triRoom'))).length,4200);});
