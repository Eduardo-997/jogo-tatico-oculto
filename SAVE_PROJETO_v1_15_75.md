# Batalha nas Sombras — SAVE v1.15.75

Base: v1.15.74 integral, com correções cumulativas da v1.15.73. Histórico anterior preservado.

## Pedido e implementação

O usuário relatou na Arena dois contornos ao selecionar peça/casa: um no polígono correto e outro maior. Solicitou corrigir, mostrar a versão do jogo e publicar no repositório de teste Eduardo-997/jogo-tatico-oculto.

Inspeção remota confirmou que main ainda estava na v1.15.72, commit dfb05ca712527d97d18679cb9d4d77c62fb1cf2e, anterior à correção de foco SVG entregue na v1.15.73. Nesta versão, a proteção também fica no CSS estático: .mode-arena .board-svg e todos os descendentes não desenham outline/box-shadow retangular; foco por teclado continua desenhado pelo stroke do polígono da casa. Foco da peça continua encaminhado visualmente para sua casa real. Não foi alterada a geometria do mapa.

Versão v1.15.75 visível abaixo do título nas quatro telas: Clássico, Clássico Online, Arena solo/Online e Treino. HTMLs e registro de imagens usam cache v1.15.75. Validador e testes garantem correspondência com package.json.

## Verificação efetivamente executada

- npm test: 489 testes, 489 passaram, zero falhas/ignorados/cancelados.
- npm run validate: 35 arquivos JS/MJS sem erro de sintaxe; 79 referências HTML existentes; 70 referências dinâmicas de imagens existentes; zero IDs duplicados; paridade Worker/Arena/IA empacotada preservada.
- Cinco novos testes: versão visível/cache nas quatro telas e CSS de foco SVG, além das regressões anteriores.
- Sem navegador real nesta etapa: a validação do foco usa testes de DOM/SVG simulado e verificação do CSS. Não alegar teste visual real.
- Nenhuma nova simulação de partidas nesta versão. Relatórios da v1.15.73 permanecem históricos.
- ZIP deve ser conferido com unzip -t antes da entrega.

## Publicação solicitada

Publicar somente no repositório Eduardo-997/jogo-tatico-oculto, main, sem force e sem excluir arquivos históricos remotos. Cloudflare é acionado pela integração existente; verificar check Workers Builds concluído com sucesso. Resultado do deploy e commit devem ser comunicados na mensagem final (não presumidos neste registro pré-publicação).

Wrangler, bindings, migrações, imagens e balanceamento preservados. Checkpoint mantém formato compatível 1.15.73 para não invalidar partidas locais existentes.

## Próxima funcionalidade

Modo Generais permanece pendente: preparação secreta por lado, mapa revelado aos espectadores somente após ambos confirmarem Pronto, IAs comandam os exércitos com views filtradas. Requisitos em docs/MODO_GENERAIS.md. Usuário pediu estas correções antes desse novo modo.
