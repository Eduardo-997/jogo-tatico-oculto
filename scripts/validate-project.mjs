import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()&&!['node_modules','.git'].includes(x.name)?walk(path.join(d,x.name)):x.isFile()?[path.join(d,x.name)]:[]);
const files=walk(root),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const withoutCjs=s=>s.replace(/^if\(typeof module[^\n]*module\.exports[^\n]*\n?/gm,'').replace(/^if\(!__refRoot\.GameRules[^\n]*require\('\.\/rules\.js'\)[^\n]*\n?/gm,'').trimEnd();
let js=0,refs=0;
for(const file of files){
  if(/\.(?:js|mjs)$/.test(file)){execFileSync(process.execPath,['--check',file],{stdio:'pipe'});js++;}
  if(/\.html$/.test(file)){
    const s=fs.readFileSync(file,'utf8'),ids=[...s.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,'ID HTML duplicado em '+file);
    for(const [,ref] of s.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)){if(/^(?:[a-z]+:|\/\/|#)/i.test(ref))continue;const p=ref.split(/[?#]/)[0];if(!p)continue;assert.ok(fs.existsSync(path.resolve(path.dirname(file),p)),'Referência ausente: '+ref+' em '+file);refs++;}
  }
}
assert.equal(read('src/tri-core.js'),read('public/tri-core.js'));
assert.equal(read('src/tri-map.js'),read('public/tri-map.js'));
const worker=read('src/worker.js');assert.equal(worker.includes("require('./rules.js')"),false);
assert.equal(worker.slice(worker.indexOf("'use strict';"),worker.indexOf('const actionMap=')).trim(),(withoutCjs(read('public/rules.js'))+'\n\n'+withoutCjs(read('public/referee.js'))).trim());
const packed=read('public/ai.js').match(/  const source = ("(?:\\.|[^"\\])*");\n/);assert.ok(packed,'Fonte da IA empacotada ausente');assert.equal(JSON.parse(packed[1]),read('public/ai-worker.js'));
assert.equal(read('public/tri-ui-global.js').includes('import '),false,'Import ESM indevido no bundle global');
// Validate paths built dynamically by the asset registry, not just HTML links.
const assetContext={window:{}};
vm.runInNewContext(read('public/assets.js'),assetContext);
const assets=assetContext.window.BNSAssets;
let assetReferences=0;
for(const group of [assets.terrain,assets.structures,assets.effects,assets.archetypes]){
  for(const ref of Object.values(group)){
    assert.ok(fs.existsSync(path.join(root,'public',ref.split('?')[0])),'Asset dinâmico ausente: '+ref);
    assetReferences++;
  }
}
const version=JSON.parse(read('package.json')).version;
for(const page of ['index.html','multiplayer.html','triplayer.html','training.html','generals.html']){
  const html=read('public/'+page);
  assert.ok(html.includes(`aria-label="Versão do jogo">v${version}</span>`),'Versão visível incorreta em '+page);
  for(const [,cache] of html.matchAll(/\?v=(\d+\.\d+\.\d+)/g))assert.equal(cache,version,'Cache HTML fora da versão em '+page);
}
const characterMap=read('public/assets.js').match(/const charMap=\{([\s\S]*?)\n  \};/);
assert.ok(characterMap,'Registro de personagens ausente');
for(const [,name] of characterMap[1].matchAll(/'([^']+)'\s*:/g)){
  const ref=assets.character(name);
  assert.ok(ref&&fs.existsSync(path.join(root,'public',ref.split('?')[0])),'Asset de personagem ausente: '+name);
  assetReferences++;
}
assert.ok(read('public/assets.js').includes(`?v=${version}`),'Cache de assets fora da versão do pacote');
for(const page of ['index.html','multiplayer.html','triplayer.html']){
  const html=read('public/'+page),button=html.indexOf('id="surrenderBtn"'),cancel=html.indexOf(page==='triplayer.html'?'id="cancelBtn"':'id="cancel"');
  assert.ok(button>cancel&&cancel>=0&&html.slice(cancel,button).includes('class="surrender-zone"'),'Rendição deve ficar separada das ações em '+page);
}
console.log(JSON.stringify({javascriptSyntax:js,localHtmlReferences:refs,missingReferences:0,duplicateHtmlIds:0,workerParity:true,arenaParity:true,aiBundleParity:true},null,2));
console.log(JSON.stringify({dynamicAssetReferences:assetReferences,assetCacheVersion:version,surrenderPlacement:true},null,2));
const brainBody=read('public/ai-worker.js').split("if(typeof self!=='undefined')self.onmessage=")[0].replace(/^'use strict';\s*/,'');
assert.ok(read('public/classic-ai.mjs').includes(brainBody),'IA dos Generais fora de sincronia');
assert.equal(/\b(?:eval\(|new Function\b)/.test(read('public/classic-ai.mjs')),false,'IA do servidor não pode depender de eval');
console.log(JSON.stringify({generalBrainParity:true,generalModePages:1},null,2));
for(const[source,target,namespace,imports]of [
  ['classic-ai.mjs','classic-ai-global.js','ClassicBrains',null],
  ['generals-core.mjs','generals-core-global.js','GeneralGame','const {createClassicBrain}=window.ClassicBrains;'],
  ['generals-ui.mjs','generals-ui-global.js',null,'const {GENERAL_SIDES,defaultGeneralControl,makeGeneralBrains,brainSnapshots,generalStep,applyGeneralAction,applyGeneralRecord,finishGeneralObservation}=window.GeneralGame;']
]){
  let body=read('public/'+source);const names=[...body.matchAll(/^export (?:const|function) (\w+)/gm)].map(m=>m[1]);body=body.replace(/^export /gm,'');if(imports)body=body.replace(/^import [^\n]+;\n/,imports+'\n');
  assert.equal(read('public/'+target),'(function(){\n'+body+(namespace?'\nwindow.'+namespace+'={'+names.join(',')+'};':'')+'\n})();\n','Bundle de Generais fora de sincronia: '+target);
}
console.log(JSON.stringify({generalGlobalBundleParity:true},null,2));
