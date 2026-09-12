import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const page of ['index.html','multiplayer.html','triplayer.html']){
  test(`Rendição permanece única e junto das ações: ${page}`,()=>{
    const html=read('public/'+page);
    assert.equal([...html.matchAll(/id="surrenderBtn"/g)].length,1);
    const header=html.slice(html.indexOf('app-header'),html.indexOf('id="board"'));
    const id=html.indexOf('id="surrenderBtn"');
    const cancel=html.indexOf(page==='triplayer.html'?'id="cancelBtn"':'id="cancel"');
    assert.ok(id>cancel);
    assert.match(html.slice(cancel,id),/Cancelar<\/button><button class="hidden" /);
    assert.ok(header.includes('app-header'));
  });
}
test('Cache de assets acompanha a versão e aliases preservam imagens',()=>{
  const context={window:{}};vm.runInNewContext(read('public/assets.js'),context);
  const assets=context.window.BNSAssets,version=JSON.parse(read('package.json')).version;
  assert.ok(assets.character('Fantasma').endsWith('?v='+version));
  assert.equal(assets.character('Coringa'),assets.character('Trapaceiro'));
  assert.equal(assets.character('Doppelganger'),assets.character('Doppelgänger'));
  assert.equal(assets.character('personagem inexistente'),null);
});
for(const page of ['index.html','multiplayer.html','triplayer.html','training.html']){
  test(`Versão visível e cache sincronizados: ${page}`,()=>{
    const html=read('public/'+page),version=JSON.parse(read('package.json')).version;
    assert.equal([...html.matchAll(/class="game-version"/g)].length,1);
    assert.ok(html.includes(`aria-label="Versão do jogo">v${version}</span>`));
    for(const [,cache] of html.matchAll(/\?v=(\d+\.\d+\.\d+)/g))assert.equal(cache,version);
  });
}
test('Arena bloqueia outline retangular em todo SVG sem remover foco das casas',()=>{
  const css=read('public/ui-v1157.css');
  assert.match(css,/\.mode-arena \.board-svg,\.mode-arena \.board-svg \*\{outline:none!important;box-shadow:none!important\}/);
  assert.match(css,/\.mode-arena \.tri-cell:focus,\.mode-arena \.tri-cell\.keyboard-focus\{stroke:#fff2a8!important;stroke-width:4!important\}/);
});
