// Proteções compartilhadas pelos dois Durable Objects. Tokens nunca entram nas visões/replays.
export function activeSocket(room,side){return room.sockets().find(ws=>(ws.readyState==null||ws.readyState===1)&&(room.attachment(ws).side===side||(room.generals&&room.attachment(ws).controlledSides?.includes(side))))||null;}
export function readMessage(room,ws,raw){
  const bytes=typeof raw==='string'?new TextEncoder().encode(raw).byteLength:raw?.byteLength;
  if(!Number.isFinite(bytes)||bytes>16384){room.send(ws,{type:'error',message:'Mensagem grande demais.'});try{ws.close(1009,'Limite de mensagem');}catch{}return null;}
  const att=room.attachment(ws),now=Date.now();
  if(!att.rateStart||now-att.rateStart>=1000){att.rateStart=now;att.rateCount=0;}
  if(++att.rateCount>40){room.send(ws,{type:'error',message:'Muitas mensagens. Aguarde um instante.'});ws.serializeAttachment(att);return null;}
  ws.serializeAttachment(att);
  let msg;try{msg=JSON.parse(typeof raw==='string'?raw:new TextDecoder().decode(raw));}catch{}
  if(!msg||typeof msg!=='object'||Array.isArray(msg)||typeof msg.type!=='string'||msg.type.length>48){room.send(ws,{type:'error',message:'Mensagem inválida.'});return null;}
  if(msg.type==='action'&&(!msg.action||typeof msg.action!=='object'||Array.isArray(msg.action)||typeof msg.action.type!=='string'||msg.action.type.length>48)){room.send(ws,{type:'result',ok:false,status:'Ação inválida.'});return null;}
  if(msg.type==='action'){
    const action={type:msg.action.type};
    for(const key of ['pieceId','to','coord','targetId','targetPieceId','baseId','bonusId','stat'])if(msg.action[key]!=null){if(typeof msg.action[key]!=='string'||msg.action[key].length>32){room.send(ws,{type:'result',ok:false,status:'Parâmetro de ação inválido.'});return null;}action[key]=msg.action[key];}
    for(const key of ['copyNew','advance'])if(msg.action[key]!=null){if(typeof msg.action[key]!=='boolean'){room.send(ws,{type:'result',ok:false,status:'Confirmação inválida.'});return null;}action[key]=msg.action[key];}
    if(msg.action.cells!=null){if(!Array.isArray(msg.action.cells)||msg.action.cells.length!==2||msg.action.cells.some(c=>typeof c!=='string'||c.length>16)){room.send(ws,{type:'result',ok:false,status:'Casas de habilidade inválidas.'});return null;}action.cells=msg.action.cells;}
    msg.action=action;
  }
  if(msg.type==='ready'&&(!Array.isArray(msg.setup)||msg.setup.length>8||msg.setup.some(x=>!x||typeof x!=='object'||typeof x.name!=='string'||typeof x.coord!=='string')||!Array.isArray(msg.bases)||msg.bases.some(c=>typeof c!=='string'))){room.send(ws,{type:'result',ok:false,status:'Preparação inválida.'});return null;}
  return msg;
}
export function enqueue(room,task){
  room.pendingMessages=(room.pendingMessages||0)+1;
  const result=(room.messageQueue||Promise.resolve()).then(task);
  room.messageQueue=result.catch(err=>console.error('Erro no processamento da sala:',err)).finally(()=>{room.pendingMessages--;});
  return result;
}
export function checkpoint(room){return {gameState:room.referee.exportState(),ready:structuredClone(room.ready),started:room.started,matchConfig:structuredClone(room.matchConfig),difficulty:room.difficulty,replayInitialState:room.replayInitialState,replayActions:room.replayActions,replayCount:room.replayActions.length,replayPersistedCount:room.replayPersistedCount,ai:room.ai,aiState:room.ai?structuredClone({...room.ai}):null};}
export function restore(room,before){room.referee.importState(before.gameState);room.ready=before.ready;room.started=before.started;room.matchConfig=before.matchConfig;room.difficulty=before.difficulty;room.replayInitialState=before.replayInitialState;room.replayActions=before.replayActions;room.replayActions.length=before.replayCount;room.replayPersistedCount=before.replayPersistedCount;room.ai=before.ai;if(room.ai&&before.aiState){for(const key of Object.keys(room.ai))delete room.ai[key];Object.assign(room.ai,before.aiState);}}
export async function commit(room,before,ws=null){if(await room.safePersist())return true;restore(room,before);const msg={type:'result',ok:false,status:'Não foi possível salvar a ação. Ela foi desfeita; tente novamente.'};if(ws)room.send(ws,msg);else room.broadcast(msg);room.broadcastRoomState();room.broadcastViews();return false;}
// O histórico não cresce dentro de um único valor do armazenamento. Migração automática do formato antigo.
export async function loadReplay(storage,prefix,saved){
  if(!saved.replayChunked)return Array.isArray(saved.replayActions)?saved.replayActions:[];
  const actions=[];for(let i=0;i<Math.ceil((saved.replayActionCount||0)/32);i++){const chunk=await storage.get(`${prefix}:replay:${i}`);if(!Array.isArray(chunk))throw Error('Bloco de replay ausente: '+i);actions.push(...chunk);}return actions.slice(0,saved.replayActionCount);
}
export async function persistReplay(room,prefix,state){
  const actions=room.replayActions||[],persisted=room.replayPersistedCount||0;
  const start=actions.length<persisted?0:Math.floor(persisted/32);
  const values={};for(let i=start;i<Math.ceil(actions.length/32);i++)values[`${prefix}:replay:${i}`]=actions.slice(i*32,(i+1)*32);
  values[prefix]={...state,replayChunked:true,replayActionCount:actions.length};
  const entries=Object.entries(values);while(entries.length>64){const batch=entries.splice(0,64);await room.ctx.storage.put(Object.fromEntries(batch));}
  await room.ctx.storage.put(Object.fromEntries(entries));room.replayPersistedCount=actions.length;
}
export async function joinSeat(room,ws,msg,sides){
  if(room.attachment(ws).side)return;
  room.seatTokens??={};
  const token=typeof msg.seatToken==='string'?msg.seatToken:'';
  if(room.generals&&msg.both===true&&!token&&sides.some(s=>room.seatTokens[s]||activeSocket(room,s))){room.send(ws,{type:'error',message:'Para controlar ambos, use uma sala nova e vazia.'});return;}
  let chosen=token?sides.find(side=>room.seatTokens[side]===token):null;
  if(room.generals&&msg.both===true&&!token)chosen=sides[0];
  if(token&&!chosen){room.send(ws,{type:'error',message:'A reconexão não corresponde a esta sala. Confira o código ou use uma nova sala.'});try{ws.close(1008,'Reconexão inválida');}catch{}return;}
  if(!chosen&&!room.started){
    if(room.generals&&msg.side!=null){
      if(!sides.includes(msg.side)||activeSocket(room,msg.side)||room.seatTokens[msg.side]){room.send(ws,{type:'error',message:'Esse lado está ocupado ou é inválido. Escolha o outro general.'});return;}
      chosen=msg.side;
    }else chosen=sides.find(side=>!activeSocket(room,side)&&(!room.generals||!room.seatTokens[side]));
  }
  // Salas antigas sem tokens podem migrar uma única vez para assentos reservados.
  if(!chosen&&room.started)chosen=sides.find(side=>(room.legacySeats||[]).includes(side)&&!room.seatTokens[side]&&!activeSocket(room,side));
  if(!chosen){room.send(ws,{type:'error',message:room.started?'Partida já iniciada. Reconecte pelo navegador original ou use outro código de sala.':'Sala cheia.'});try{ws.close(1008,'Assento indisponível');}catch{}return;}
  const old=activeSocket(room,chosen),newToken=token||crypto.randomUUID();
  const controlledSides=room.generals&&(msg.both===true&&!token||token&&sides.every(s=>room.seatTokens[s]===token))?[...sides]:[chosen];
  const oldTokens=structuredClone(room.seatTokens);
  const previous=room.seatTokens[chosen];room.seatTokens[chosen]=newToken;
  for(const s of controlledSides)room.seatTokens[s]=newToken;
  const legacy=room.legacySeats||[];room.legacySeats=legacy.filter(side=>side!==chosen);
  try{await room.persist();}catch(err){room.seatTokens=oldTokens;room.legacySeats=legacy;room.send(ws,{type:'error',message:'Não foi possível reservar seu lugar. Tente novamente.'});return;}
  if(old&&old!==ws){old.serializeAttachment({...room.attachment(old),side:null});try{old.close(1000,'Reconectado em outra conexão');}catch{}}
  ws.serializeAttachment({...room.attachment(ws),side:chosen,...(room.generals?{controlledSides}:{})});
  room.send(ws,{type:'joined',room:String(msg.room||'').slice(0,16),side:chosen,seatToken:newToken,preparation:room.started?null:(room.ready[chosen]||null),...(room.generals?{controlledSides,preparations:room.started?null:Object.fromEntries(controlledSides.map(s=>[s,room.ready[s]||null]))}:{})});
  room.broadcastRoomState();if(room.started)room.broadcastViews();
}
