import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

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
console.log(JSON.stringify({javascriptSyntax:js,localHtmlReferences:refs,missingReferences:0,duplicateHtmlIds:0,workerParity:true,arenaParity:true,aiBundleParity:true},null,2));
