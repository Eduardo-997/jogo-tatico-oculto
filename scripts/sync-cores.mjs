import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Apenas geração mecânica: as fontes autoritativas ficam em public/.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const withoutCjs=s=>s.replace(/^if\(typeof module[^\n]*module\.exports[^\n]*\n?/gm,'').replace(/^if\(!__refRoot\.GameRules[^\n]*require\('\.\/rules\.js'\)[^\n]*\n?/gm,'').trimEnd();
const worker=read('src/worker.js');
const start=worker.indexOf("'use strict';");
const end=worker.indexOf('const actionMap=');
if(start<0||end<start)throw Error('Marcadores do Worker ausentes; sincronização interrompida.');
write('src/worker.js',worker.slice(0,start)+withoutCjs(read('public/rules.js'))+'\n\n'+withoutCjs(read('public/referee.js'))+'\n\n\n'+worker.slice(end));
write('src/tri-core.js',read('public/tri-core.js'));
write('src/tri-map.js',read('public/tri-map.js'));
const tri=read('public/tri-core.js').replace(/^import \{TRI_MAP\} from '\.\/tri-map\.js';\n/,'const TRI_MAP=window.TRI_MAP;\n').replace(/^export /gm,'');
const exported=[...read('public/tri-core.js').matchAll(/^export (?:const|function|class) (\w+)/gm)].map(x=>x[1]);
write('public/tri-core-global.js','(function(){\n'+tri+'\nwindow.TriGame={'+exported.join(',')+'};\n})();\n');
const triUi=read('public/tri-ui.js').replace(/^import \{([^}]+)\} from '\.\/tri-core\.js';/m,'const {$1}=window.TriGame;').replace(/^import \{TRI_MAP,?\} from '\.\/tri-map\.js';/m,'const TRI_MAP=window.TRI_MAP;');
write('public/tri-ui-global.js','(function(){\n'+triUi+'\n})();\n');
const ai=read('public/ai.js');
// Independent lexical memory for each general's army. No eval/new Function.
const aiBody=read('public/ai-worker.js').split("if(typeof self!=='undefined')self.onmessage=")[0].replace(/^'use strict';\s*/, '');
write('public/classic-ai.mjs',`// Generated from public/ai-worker.js by npm run sync.\nexport function orient(value,side){\n  if(side!=='player')return structuredClone(value);\n  const flip=c=>String.fromCharCode(72-(c.charCodeAt(0)-65))+(9-Number(c.slice(1)));\n  const visit=v=>{\n    if(typeof v==='string'){if(v==='player')return 'enemy';if(v==='enemy')return 'player';return v.replace(/\\b[A-H][1-8]\\b/g,flip);}\n    if(Array.isArray(v))return v.map(visit);\n    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k==='player'?'enemy':k==='enemy'?'player':/^[A-H][1-8]$/.test(k)?flip(k):k,visit(x)]));\n    return v;\n  };return visit(value);\n}\nexport function createClassicBrain(side,level='normal',saved=null){\n${aiBody}\n difficulty=['easy','normal','hard','extreme'].includes(level)?level:'normal';\n if(saved?.memory)Object.assign(memory,structuredClone(saved.memory));\n let lastResult=saved?.lastResult||null;\n return {\n  decide(view){const v=orient(view,side),a=decide(v,orient(lastResult,side));rememberIssued(a,v);return orient(a,side);},\n  reportResult(action,result){lastResult={action:structuredClone(action),ok:result?.ok!==false,status:result?.status||''};},\n  snapshot(){return {memory:structuredClone(memory),lastResult:structuredClone(lastResult)};}\n };\n}\n`);
write('public/ai.js',ai.replace(/  const source = [\s\S]*?;\n  window\.createGameAiWorker/, ()=>'  const source = '+JSON.stringify(read('public/ai-worker.js'))+';\n  window.createGameAiWorker'));
console.log('Worker, Arena Online, bundles globais e IA sincronizados.');
for(const [source,target,namespace,imports]of [
  ['classic-ai.mjs','classic-ai-global.js','ClassicBrains',null],
  ['generals-core.mjs','generals-core-global.js','GeneralGame',"const {createClassicBrain}=window.ClassicBrains;"],
  ['generals-ui.mjs','generals-ui-global.js',null,"const {GENERAL_SIDES,defaultGeneralControl,makeGeneralBrains,brainSnapshots,generalStep,applyGeneralAction}=window.GeneralGame;"]
]){
  let body=read('public/'+source);
  const names=[...body.matchAll(/^export (?:const|function) (\w+)/gm)].map(m=>m[1]);
  body=body.replace(/^export /gm,'');if(imports)body=body.replace(/^import [^\n]+;\n/,imports+'\n');
  write('public/'+target,'(function(){\n'+body+(namespace?'\nwindow.'+namespace+'={'+names.join(',')+'};':'')+'\n})();\n');
}
