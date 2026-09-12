import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {GameRoom,TriGameRoom} from '../src/worker.js';
import {TriReferee,TRI_SIDES} from '../public/tri-core.js';
const require=createRequire(import.meta.url),R=require('../public/rules.js'),Ref=require('../public/referee.js');
const read=p=>fs.readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const node=()=>({value:'NEW',disabled:false,classList:{add(){},remove(){}},textContent:''});
test('Clássico Online: trocar sala desconectado não conserva partida ou formação antiga',()=>{
  const source=read('multiplayer-ui.js'),start=source.indexOf('  let reconnectTimer=null'),end=source.indexOf('  joinRoom.onclick=',start);
  const ctx={joined:false,room:'OLD',side:'player',ws:null,currentView:{phase:'play',gameOver:true},roomState:{started:true},readyMe:true,selected:['Cavaleiro'],setupPos:new Map([['A2','Cavaleiro']]),setupBasePos:new Map([[1,'B1']]),setupSelected:'Cavaleiro',setupBaseSelected:1,seerPreview:new Set(['A1']),pendingShieldTargetId:'old',onlineReplayFrames:[{}],previousFxView:{},turnGuideSticky:'old',roomCode:node(),connectionStatus:node(),joinRoom:node(),location:{host:'game.test',protocol:'https:'},window:{BNSOnlineSession:{normalize:s=>s}},WebSocket:class{},clearTimeout(){},setTimeout(){},closeBasePanel(){},hideBardChoice(){},hideStackChoice(){},render(){},setStatus(){}};
  vm.runInNewContext(source.slice(start,end),ctx);ctx.roomCode.value='OLD';ctx.connect(true);assert.equal(ctx.currentView.phase,'play');assert.equal(ctx.selected.length,1);ctx.roomCode.value='NEW';ctx.connect();assert.equal(ctx.currentView,null);assert.equal(ctx.roomState,null);assert.equal(ctx.selected.length,0);assert.equal(ctx.setupPos.size,0);assert.equal(ctx.setupBasePos.size,0);assert.equal(ctx.side,null);assert.equal(ctx.readyMe,false);
});
test('Arena Online: trocar sala não conserva visão, prontidão ou composição anterior',()=>{
  const source=read('tri-ui.js'),start=source.indexOf('let reconnectTimer'),end=source.indexOf('\n',source.indexOf('function connectRoom(',start));
  const roomInput=node(),ctx={mode:'online',side:'A',onlineRoom:'OLD',joined:true,connected:true,view:{phase:'play'},roomState:{started:true},draft:{setup:[{name:'Cavaleiro',coord:'A01'}],bases:['A03','A04']},seerPick:['A02'],pendingBase:{},pendingShieldTargetId:'old',setupSelected:{},inspected:{},inspectedDef:{},onlineReplayFrames:[{}],lastResult:{},turnGuidePrev:{},turnGuideSticky:'old',ws:null,officialOnlineDifficulty:'extreme',$(id){return id==='roomCode'?roomInput:node();},location:{host:'game.test',protocol:'https:'},WebSocket:class{},clearTimeout(){},setTimeout(){},setStatus(){},renderAll(){},applyArenaConfig(){},hideBoardPopup(){}};
  vm.runInNewContext(source.slice(start,end)+"\nonlineRoom='OLD';",ctx);roomInput.value='OLD';ctx.connectRoom(true);assert.equal(ctx.view.phase,'play');assert.equal(ctx.draft.setup.length,1);roomInput.value='NEW';ctx.connectRoom();assert.equal(ctx.view,null);assert.equal(ctx.roomState,null);assert.equal(ctx.joined,false);assert.equal(ctx.draft.setup.length,0);assert.equal(ctx.draft.bases.length,0);assert.equal(ctx.onlineReplayFrames.length,0);
});
class Socket{constructor(){this.readyState=1;this.att={};this.sent=[];}serializeAttachment(v){this.att=structuredClone(v);}deserializeAttachment(){return structuredClone(this.att);}send(raw){this.sent.push(JSON.parse(raw));}close(){this.readyState=3;}last(t){return this.sent.filter(m=>m.type===t).at(-1);}}
function context(){const data=new Map(),ctx={sockets:[],storage:{async get(k){return structuredClone(data.get(k));},async put(k,v){if(typeof k==='object')for(const [a,b]of Object.entries(k))data.set(a,structuredClone(b));else data.set(k,structuredClone(v));}},getWebSockets(){return ctx.sockets;},blockConcurrencyWhile(fn){ctx.init=fn();}};return ctx;}
async function connect(room,ctx,token){const s=new Socket();ctx.sockets.push(s);await room.webSocketMessage(s,JSON.stringify({type:'join',room:'AUDIT',seatToken:token}));return s;}
async function message(room,ws,m){ws.att.rateStart=0;await room.webSocketMessage(ws,JSON.stringify(m));}
const coords={player:['A2','B2','C2','D2','E2','G2','H2','A3'],enemy:['H7','G7','F7','E7','D7','B7','A7','H6']},bases={player:['B1','G1'],enemy:['B8','G8']};
const setup=(side,count,offset)=>coords[side].slice(0,count).map((coord,i)=>({coord,name:R.defs[(offset+i)%R.defs.length].name}));
for(const size of [1,4,8])for(const first of ['player','enemy'])test(`Clássico Online: tamanho ${size}, Pronto ${first} primeiro, ações e retomada`,async()=>{
  const ctx=context(),room=new GameRoom(ctx,{});await ctx.init;const sockets={player:await connect(room,ctx),enemy:await connect(room,ctx)};
  await message(room,sockets.player,{type:'setMatchConfig',config:{teamSize:{player:size,enemy:size},lossLimit:{player:size,enemy:size}}});
  for(const side of [first,first==='player'?'enemy':'player'])await message(room,sockets[side],{type:'ready',setup:setup(side,size,size),bases:bases[side]});
  assert.equal(room.started,true);for(const side of ['player','enemy']){const v=sockets[side].last('view').view;assert.equal(v.side,side);assert.equal(v.phase,'play');assert.equal(v.ownPieces.length,size);assert.equal(v.visibleOpponents.length,0);}
  const turn=JSON.parse(room.referee.exportState()).turn,v=sockets[turn].last('view').view;
  await message(room,sockets[turn],{type:'action',action:{type:'selectPiece',pieceId:v.availablePieceIds[0]}});assert.equal(sockets[turn].last('result').ok,true);
  await message(room,sockets[turn],{type:'action',action:{type:'endActivation'}});assert.equal(sockets[turn].last('result').ok,true);
  const recovered=new GameRoom(ctx,{});await ctx.init;const rejoined=await connect(recovered,ctx,sockets[turn].last('joined').seatToken);assert.equal(rejoined.last('view').view.side,turn);const expected=new Ref();expected.importState(room.referee.exportState());for(const side of ['player','enemy'])assert.deepEqual(recovered.referee.createClient(side).getView(),expected.createClient(side).getView());
});
for(const size of [1,4,8])for(const first of ['A','B'])test(`Arena Online: tamanho ${size}, Pronto ${first} primeiro, ações e retomada`,async()=>{
  const ctx=context(),room=new TriGameRoom(ctx,{});await ctx.init;room.runAI=async()=>{};const sockets={A:await connect(room,ctx),B:await connect(room,ctx)};
  await message(room,sockets.A,{type:'setMatchConfig',config:{teamSize:{A:size,B:size,C:size},lossLimit:{A:size,B:size,C:size}}});
  for(const side of [first,first==='A'?'B':'A']){const z=room.referee.autoSetup(side,'normal',size);await message(room,sockets[side],{type:'ready',...z});}
  assert.equal(room.started,true);for(const side of ['A','B']){const v=sockets[side].last('view').view;assert.equal(v.side,side);assert.equal(v.phase,'play');assert.equal(v.ownPieces.length,size);assert.equal(v.visibleOpponents.length,0);}
  const turn=JSON.parse(room.referee.exportState()).turn;if(turn!=='C'){const v=sockets[turn].last('view').view;await message(room,sockets[turn],{type:'action',action:{type:'select',pieceId:v.availablePieceIds[0]}});assert.equal(sockets[turn].last('result').ok,true);await message(room,sockets[turn],{type:'action',action:{type:'end'}});assert.equal(sockets[turn].last('result').ok,true);}
  const recovered=new TriGameRoom(ctx,{});await ctx.init;recovered.runAI=async()=>{};const rejoined=await connect(recovered,ctx,sockets.B.last('joined').seatToken);assert.equal(rejoined.last('view').view.side,'B');const expected=new TriReferee();expected.importState(room.referee.exportState());for(const side of TRI_SIDES)assert.deepEqual(recovered.referee.client(side).getView(),expected.client(side).getView());
});
test('Clássico solo, Treino e Arena: início com todos os 20 personagens',()=>{
  for(let i=0;i<R.defs.length;i++){
    const solo=new Ref();assert.equal(solo.startGame(setup('player',4,i),bases.player).ok,true);assert.equal(solo.createClient('player').getView().phase,'play');
    const training=new Ref();assert.equal(training.startTrainingGame(setup('player',4,i),setup('enemy',4,i),bases.player,bases.enemy).ok,true);assert.equal(training.createClient('enemy').getView().phase,'play');
    const arena=new TriReferee(),z=arena.autoSetup('A');z.setup=z.setup.map((p,j)=>({...p,name:R.defs[(i+j)%R.defs.length].name}));assert.equal(arena.startSolo(z.setup,z.bases).ok,true);for(const side of TRI_SIDES)assert.equal(arena.client(side).getView().phase,'play');
  }
});
for(const [Class,sides]of [[GameRoom,['player','enemy']],[TriGameRoom,['A','B']]]){
  async function make(){const ctx=context(),room=new Class(ctx,{});await ctx.init;room.runAI=async()=>{};const sockets=await Promise.all(sides.map(()=>connect(room,ctx)));const ready=sides.map(side=>Class===GameRoom?{type:'ready',setup:setup(side,4,0),bases:bases[side]}:{type:'ready',...room.referee.autoSetup(side)});return{ctx,room,sockets,ready};}
  test(`${Class.name}: Prontos simultâneos iniciam uma única partida`,async()=>{const {room,sockets,ready}=await make();await Promise.all(sockets.map((ws,i)=>message(room,ws,ready[i])));assert.equal(room.started,true);assert.equal(room.replayActions.length,0);for(const ws of sockets){assert.equal(ws.last('view').view.phase,'play');assert.equal(ws.last('view').view.side,ws.att.side);assert.equal(ws.last('view').view.ownPieces.length,4);}});
  test(`${Class.name}: falha ao salvar segundo Pronto é desfeita e nova tentativa inicia`,async()=>{
    const {ctx,room,sockets,ready}=await make();await message(room,sockets[0],ready[0]);assert.equal(sockets[0].last('view'),undefined);assert.equal(sockets[1].last('view'),undefined);
    const put=ctx.storage.put,log=console.error;try{console.error=()=>{};ctx.storage.put=async()=>{throw Error('quota injected');};await message(room,sockets[1],ready[1]);}finally{ctx.storage.put=put;console.error=log;}
    assert.equal(room.started,false);assert.equal(JSON.parse(room.referee.exportState()).phase,'setup');assert.ok(room.ready[sides[0]]);assert.equal(room.ready[sides[1]],null);assert.equal(sockets[1].last('result').ok,false);
    await message(room,sockets[1],ready[1]);assert.equal(room.started,true);for(const ws of sockets)assert.equal(ws.last('view').view.phase,'play');
  });
  test(`${Class.name}: cancelar Pronto e confirmar novamente não prende a preparação`,async()=>{const {room,sockets,ready}=await make();await message(room,sockets[0],ready[0]);await message(room,sockets[0],{type:'unready'});await message(room,sockets[1],ready[1]);assert.equal(room.started,false);await message(room,sockets[0],ready[0]);assert.equal(room.started,true);});
}
test('Clássico Online: todos os comandos de jogabilidade chegam ao método e parâmetros corretos',async()=>{
  const ctx=context(),room=new GameRoom(ctx,{});await ctx.init;const ws=await connect(room,ctx);room.started=true;
  const source=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('const actionMap='),source.indexOf('export class GameRoom'));
  const methods=vm.runInNewContext(body+';Object.keys(actionMap);'),calls=[],client=new Proxy({getView:()=>({gameOver:false})},{get(target,k){return target[k]||((...args)=>{calls.push({method:k,args});return{ok:true,status:'wire tested'};});}});room.referee.createClient=()=>client;
  const argumentsByMethod={selectPiece:['p'],moveStep:['D4'],attack:['D4'],selectPyroTarget:['D4'],selectParanoiaTarget:['D4'],useSeer:[['D4','D5']],raiseAt:['D4'],placeMirror:['D4'],awakenTree:['D4'],placeTrap:['D4'],bardBuff:['ally','life'],absorbRock:['D4'],shieldLink:['ally'],chooseCombatPosition:[true],sabotageBase:['base','attack','ally'],chooseDoppelCopy:[true]};
  for(const type of methods){await message(room,ws,{type:'action',action:{type,pieceId:'p',to:'D4',coord:'D4',targetPieceId:'ally',stat:'life',cells:['D4','D5'],advance:true,copyNew:true,baseId:'base',bonusId:'attack'}});assert.equal(ws.last('result').ok,true,type);assert.deepEqual(calls.at(-1),{method:type,args:argumentsByMethod[type]||[]});}
  assert.equal(methods.length,28);
});
