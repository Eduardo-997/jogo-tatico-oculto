# SAVE_PROJETO_v1_15_44_HOTFIX_DEPLOY

Base: **v1.15.44 TESTE GIT**.

## Motivo
O deploy do Cloudflare Workers falhou após o upload da v1.15.44.

## Causa encontrada no pacote
`src/worker.js` continha esta dependência residual:

```js
if(!__refRoot.GameRules && typeof require!=='undefined') __refRoot.GameRules=require('./rules.js');
```

Porém **`src/rules.js` não existe**. O Worker já declara `GameRules` no próprio `src/worker.js` antes de criar `GameReferee`, portanto o fallback CommonJS era redundante.

A linha não era executada ao importar o Worker como ES Module, por isso os testes locais de sintaxe/importação passavam. Um bundler como o usado pelo Wrangler, entretanto, pode tentar resolver estaticamente `require('./rules.js')` durante o empacotamento e falhar por módulo inexistente.

## Correção
- removido somente o `require('./rules.js')` residual de `src/worker.js`;
- nenhuma regra, IA, interface ou mecânica da v1.15.44 foi alterada;
- mantidas as correções de percepção, prioridade da IA e Online/Arena da v1.15.44.

## Validação
- todos os JavaScript passam em `node --check`;
- `src/worker.js` importa como ES Module;
- todos os imports relativos de `src` apontam para arquivos existentes;
- não existem mais chamadas `require(...)` em `src`;
- `src/tri-core.js` e seus imports continuam presentes;
- ZIP validado após criação.
