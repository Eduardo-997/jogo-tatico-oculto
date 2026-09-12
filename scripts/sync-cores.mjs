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
write('public/ai.js',ai.replace(/  const source = [\s\S]*?;\n  window\.createGameAiWorker/, ()=>'  const source = '+JSON.stringify(read('public/ai-worker.js'))+';\n  window.createGameAiWorker'));
console.log('Worker, Arena Online, bundles globais e IA sincronizados.');
