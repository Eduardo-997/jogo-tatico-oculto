# Batalha nas Sombras — SAVE v1.15.77 HOTFIX CLÁSSICO ONLINE

Base integral: v1.15.76. Usuário relatou que Clássico Online não inicia após ambos confirmarem Pronto.

## Causa reproduzida

GameRoom inicia corretamente no servidor, mas broadcastViews enviava type=view sem view.side. A interface public/multiplayer-ui.js tem verificação estrita view.side === lado autenticado. Assim, ambos recebiam phase=play, porém a interface rejeitava o estado e permanecia na preparação.

Diagnóstico real em contexto de servidor simulado: started=true; assentos player/enemy; receivedViewSide=null nos dois; frontendRejects=true nos dois. Não é erro de formação nem motivo para remover a verificação contra visão do adversário.

## Correção

Em src/worker.js, broadcastViews do Clássico normal envia view:{...view,side}, associando o estado ao assento autenticado. O getView filtrado continua intacto. GeneralView, Arena, regras, mapas, bindings e migrações não foram alterados. Cache HTML/assets e versão visível atualizados para 1.15.77. Formato de checkpoint de Generais permanece compatível 1.15.76; formato do checkpoint principal permanece compatível 1.15.73.

## Regressões

- Novo teste de início completo: ambos enviam Pronto, servidor começa e cada participante recebe phase=play com o próprio side e nenhuma posição inimiga oculta. Reconexão conserva identificação player.
- Novo teste executa a ramificação real de recepção view da interface: aceita lado correto, aplica render, rejeita lado ausente ou adversário sem trocar estado.
- Bateria final: 523 testes passaram; zero falhas, cancelamentos ou testes ignorados.
- Validador: 44 JS/MJS, 95 referências HTML, 70 imagens dinâmicas, paridade de núcleos e bundles preservada.
- Sem navegador real ou novo teste em Cloudflare real nesta versão. Não apresentar simulações da v1.15.76 como novas partidas deste hotfix.

## Publicação

Hotfix ainda não publicado nesta tarefa. Última versão no repositório de teste: v1.15.76, commit d0b06eeb9c702674fb5ed52daaa0545aee4d3421; build Cloudflare anterior success. Publicar somente com autorização explícita no Eduardo-997/jogo-tatico-oculto, sem force, mantendo histórico e sem alterar Wrangler.

Não pedir para reiniciar formação como solução: o servidor já iniciou essas salas. Após publicar, reconectar pelo navegador/token original deve permitir recuperar a partida com a identificação correta do estado.
