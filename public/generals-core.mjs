import {createClassicBrain} from './classic-ai.mjs';
export const GENERAL_SIDES=['player','enemy'];
export const defaultGeneralControl=()=>({paused:false,delay:600,difficulties:{player:'normal',enemy:'normal'},error:null});
export function makeGeneralBrains(control,saved={}){return Object.fromEntries(GENERAL_SIDES.map(side=>[side,createClassicBrain(side,control.difficulties[side],saved?.[side])]));}
export const brainSnapshots=brains=>Object.fromEntries(GENERAL_SIDES.filter(side=>brains?.[side]).map(side=>[side,brains[side].snapshot()]));
export function finishGeneralObservation(referee,reason='manual'){
  const raw=JSON.parse(referee.exportState());if(raw.phase!=='play'||raw.gameOver)return {ok:false,status:'Não há observação em andamento.'};
  raw.gameOver=true;raw.result='draw';raw.generalEnded=true;raw.generalEndReason=reason;raw.pendingCombat=null;raw.activation={player:null,enemy:null};raw.doppelChoice={player:null,enemy:null};
  for(const side of GENERAL_SIDES)raw.history[side].unshift('⏹ Observação encerrada pelos generais, sem vencedor.');
  referee.importState(JSON.stringify(raw));return {ok:true,status:'Observação encerrada, sem vencedor.'};
}
export function applyGeneralRecord(referee,entry){return entry.action?.type==='observerFinish'?finishGeneralObservation(referee,entry.action.reason||'manual'):applyGeneralAction(referee.createClient(entry.side),entry.action);}
export function describeGeneralStep(raw,action,result,side,after){
  const actor=raw.pieces?.[side]?.find(p=>p.id===(raw.activation?.[side]?.pieceId||raw.pendingCombat?.winnerId)),target=raw.pieces?.[side]?.find(p=>p.id===(action.targetPieceId||action.targetId));
  const kinds={moveStep:'move',attack:'attack',pyroConfirm:'attack',kamikazeConfirm:'attack',mirror:'place',trap:'place',raise:'place',awaken:'place',paranoiaConfirm:'place',seer:'ability',bard:'ability',absorbRock:'ability',shieldLink:'ability',sabotage:'ability',combatChoice:'combat',doppelChoice:'ability',sureShotConfirm:'ability',startAbility:'ability'};
  const kind=kinds[action?.type];if(!kind||!result?.ok)return null;
  if(action.type==='startAbility'&&!JSON.stringify(after.replayEvent||{}).includes('Bomba de Fumaça'))return null;
  const flatten=e=>e?.type==='sequence'?(e.events||[]).flatMap(flatten):e?[e]:[];
  const events=flatten(after.replayEvent),cells=[action.to,action.coord,...(action.cells||[]),...(action.type==='pyroConfirm'?raw.activation?.[side]?.pyroTargets||[]:[]),...(action.type==='kamikazeConfirm'?raw.activation?.[side]?.kamikazeCells||[]:[]),...(action.type==='paranoiaConfirm'?raw.activation?.[side]?.paranoiaTargets||[]:[]),target?.coord,...events.flatMap(e=>[e.coord,...(e.cells||[])])].filter(c=>typeof c==='string'&&/^[A-H][1-8]$/.test(c));
  if(!cells.length&&actor?.coord)cells.push(actor.coord);
  if(action.type==='sabotage'){const base=raw.bases?.find(b=>b.id===action.baseId);if(base?.coord)cells.push(base.coord);}
  if(action.type==='combatChoice'){const winner=after.pieces?.[side]?.find(p=>p.id===raw.pendingCombat?.winnerId);if(winner?.coord)cells.push(winner.coord);}
  const names={moveStep:'Moveu',attack:'Atacou',pyroConfirm:'Rajada Dupla',kamikazeConfirm:'Explodiu',mirror:'Criou Espelho',trap:'Preparou armadilha',raise:'Invocou Esqueleto',awaken:'Despertou árvore',paranoiaConfirm:'Criou presenças',seer:'Revelou',bard:'Inspirou',absorbRock:'Absorveu Pedra',shieldLink:'Alterou vínculo',sabotage:'Sabotou Posto',combatChoice:'Escolheu posição',doppelChoice:'Escolheu cópia',sureShotConfirm:'Tiro Certeiro',startAbility:'Fumaça'};
  return {side,round:raw.round,kind,cells:[...new Set(cells)],from:actor?.coord||null,piece:actor?.form==='lava'?'Golem de Lava':actor?.name||'',text:names[action.type]||action.type,status:result.status||'',detail:after.history?.[side]?.[0]!==raw.history?.[side]?.[0]?after.history?.[side]?.[0]||'':''};
}
export function applyGeneralAction(client,a){
  switch(a?.type){
    case 'surrender':return client.surrender();
    case 'select':return client.selectPiece(a.pieceId);
    case 'startMove':return client.startMove();case 'moveStep':return client.moveStep(a.to);case 'stopMove':return client.stopMove();
    case 'startAttack':return client.startAttack();case 'attack':return client.attack(a.to);
    case 'startAbility':return client.startAbility();case 'end':return client.endActivation();
    case 'pyroSelect':return client.selectPyroTarget(a.to);case 'pyroConfirm':return client.confirmPyroAttack();case 'sureShotConfirm':return client.confirmSureShot();
    case 'paranoiaSelect':return client.selectParanoiaTarget(a.to);case 'paranoiaConfirm':return client.confirmParanoia();case 'kamikazeConfirm':return client.confirmKamikaze();
    case 'seer':return client.useSeer(a.cells);case 'raise':return client.raiseAt(a.to);case 'mirror':return client.placeMirror(a.to);case 'awaken':return client.awakenTree(a.to);case 'trap':return client.placeTrap(a.to);
    case 'bard':return client.bardBuff(a.targetPieceId,a.stat);case 'absorbRock':return client.absorbRock(a.coord);case 'shieldLink':return client.shieldLink(a.targetPieceId||null);
    case 'sabotage':return client.sabotageBase(a.baseId,a.bonusId,a.targetPieceId||null);
    case 'combatChoice':return client.chooseCombatPosition(!!a.advance);case 'doppelChoice':return client.chooseDoppelCopy(!!a.copyNew);
    default:return {ok:false,status:'A IA não produziu uma ação válida.'};
  }
}
export function generalStep(referee,brains,control={}){
  const raw=JSON.parse(referee.exportState());if(raw.gameOver)return {done:true};
  if(control.roundLimit>0&&raw.round>control.roundLimit){const result=finishGeneralObservation(referee,'roundLimit');return {side:raw.turn,action:{type:'observerFinish',reason:'roundLimit'},result,observation:null,done:true};}
  const side=raw.pendingCombat?.winnerSide||GENERAL_SIDES.find(s=>raw.doppelChoice?.[s])||raw.turn;
  const client=referee.createClient(side),view=client.getView();
  const action=brains[side].decide(view),result=applyGeneralAction(client,action);
  brains[side].reportResult(action,result);
  const after=JSON.parse(referee.exportState());return {side,action,result,observation:describeGeneralStep(raw,action,result,side,after),done:!!after.gameOver};
}
