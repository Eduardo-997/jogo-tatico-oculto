import {createClassicBrain} from './classic-ai.mjs';
export const GENERAL_SIDES=['player','enemy'];
export const defaultGeneralControl=()=>({paused:false,delay:600,difficulties:{player:'normal',enemy:'normal'},error:null});
export function makeGeneralBrains(control,saved={}){return Object.fromEntries(GENERAL_SIDES.map(side=>[side,createClassicBrain(side,control.difficulties[side],saved?.[side])]));}
export const brainSnapshots=brains=>Object.fromEntries(GENERAL_SIDES.filter(side=>brains?.[side]).map(side=>[side,brains[side].snapshot()]));
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
export function generalStep(referee,brains){
  const raw=JSON.parse(referee.exportState());if(raw.gameOver)return {done:true};
  const side=raw.pendingCombat?.winnerSide||GENERAL_SIDES.find(s=>raw.doppelChoice?.[s])||raw.turn;
  const client=referee.createClient(side),view=client.getView();
  const action=brains[side].decide(view),result=applyGeneralAction(client,action);
  brains[side].reportResult(action,result);
  return {side,action,result,done:!!JSON.parse(referee.exportState()).gameOver};
}
