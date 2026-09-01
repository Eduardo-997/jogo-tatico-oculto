# SAVE_PROJETO_v1_15_16

## Base
Criada sobre a v1.15.15.

## Correção principal — Clássico Online sincronizado
- Núcleo autoritativo do Clássico Online (`src/worker.js`) sincronizado com as regras atuais do Clássico local.
- Os 20 personagens atuais são reconhecidos pelo servidor.
- Alc. Hab. e Canalização (+1 Alc. Hab.) passam a funcionar no Online.
- Habilidades atuais sincronizadas: Druida/Galho-Vivo, Caçador, Sentinela, Bardo, Zumbi, Paranoia, Fantasma e demais regras do Clássico atual.
- Interface Online passou a enviar/interpretar `awakenTree`, `placeTrap` e `bardBuff`.
- Marcações de Alc. Hab. Online usam o alcance final real, incluindo bônus.
- Árvores vivas/mortas e armadilhas próprias são renderizadas corretamente no Online.
- Piromante, Vidente, Necromante e Mago do Espelho usam o modelo atual de Alc. Hab. no Online.
- Postos Online aceitam Canalização e selecionam apenas alvos compatíveis.

## Segurança
- O servidor continua sendo o Árbitro do Clássico Online.
- A visão de cada jogador continua filtrada pelo `GameReferee`; posições ocultas do adversário não são enviadas ao cliente.
- Nenhum Replay Online foi adicionado.

## Compatibilidade
- Arena não teve regras alteradas nesta versão.
- `wrangler.jsonc` foi preservado.
- Cache-bust aplicado a `rules.js` e `multiplayer-ui.js` da página Online para evitar mistura de versões no navegador.
