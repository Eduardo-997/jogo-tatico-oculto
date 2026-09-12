# Batalha nas Sombras — SAVE v1.15.76

Base integral: v1.15.75 TESTE GIT. Esta entrega cria o primeiro bloco do modo Generais, no tabuleiro do Clássico. Não reconstruir o jogo nem voltar para bases antigas.

## O pedido

O usuário definiu uma mistura de modo de jogo e teste: cada amigo escolhe secretamente peças/posições como general de um lado; quando ambos dão Pronto, os generais veem todo o mapa e as IAs passam a comandar os exércitos. O usuário autorizou implementar depois das correções de contorno/versão da v1.15.75. Foi comunicado antes da implementação que este primeiro bloco seria do Clássico, com dois lados, e que também haveria observação local IA × IA.

## Entregue

- Página /generals.html, com links no Clássico e na Arena. O link da Arena abre o tabuleiro Clássico de Generais; não é um modo de três generais.
- Online: escolha explícita General 1 (azul/player) ou General 2 (vermelho/enemy), inclusive General 2 entrando primeiro. Cada lado prepara 4 personagens + 2 Postos e escolhe o nível de sua própria IA.
- Preparação privada no servidor: roomState contém prontidão, conexão e níveis, não peças/posições. Reconexão pré-jogo recebe apenas a preparação confirmada do próprio general. Não há generalView antes de ambos confirmarem.
- Após ambos darem Pronto, generalView divulga o estado real completo do mapa somente aos dois assentos autenticados. As peças são controladas pelas IAs; o servidor recusa ações manuais, exceto rendição do próprio lado.
- Local: preparação manual dos dois lados ou botão de observação aleatória em um clique. Níveis independentes, pausa, velocidade lenta/normal/rápida, avanço de uma ação, inspeção de ambas as equipes e histórico por lado.
- Uma jogada corresponde a uma ação interna (selecionar, mover uma casa, atacar, resolver uma escolha), não necessariamente a uma ativação inteira. Confronto Direto e escolha de cópia são decididos pela IA correta, mesmo fora da vez nominal.
- Recuperação local via sessionStorage após F5, sempre pausada para inspeção. Depende do armazenamento permitido no navegador. Não é save na nuvem.
- Online: token separado das salas normais; sala e modalidade no URL permitem reconexão após F5 pelo navegador original. Token nunca vai no URL, mapa, histórico ou replay. Lados já reservados não podem ser tomados por visitantes, mesmo durante preparação desconectada.
- Pausa/retomada, velocidade e passo Online são compartilhados: ambos os generais podem operar a observação. Salas iniciadas não reiniciam pelo cliente; para nova partida, usar outro código.
- Replay disponível após o fim. Há limite de quadros do visualizador e do checkpoint: pode ser somente um trecho recente, não prometer gravação local ilimitada.

## Arquitetura e segurança

- public/ai-worker.js continua fonte autoritativa da estratégia do Clássico, sem alteração nesta versão. npm run sync gera public/classic-ai.mjs: cada chamada de createClassicBrain cria memória lexical independente.
- A estratégia existente esperava own=enemy no tabuleiro. Para General 1, o adaptador gira referências em 180 graus e troca rótulos de lados/configurações; depois desfaz a transformação na ação. IDs de peças não são substituídos. A visão entregue ao controlador continua sendo createClient(side).getView(), nunca o estado completo de espectador.
- public/generals-core.mjs define aplicação de ações, escolha do lado com decisão pendente e snapshots dos dois cérebros.
- public/generals-ui.mjs é a fonte da interface. Bundles classic-ai-global.js, generals-core-global.js e generals-ui-global.js são gerados por npm run sync. A página usa esses bundles, inclusive para funcionar no fluxo local file:// sem import ESM. Online exige HTTP/HTTPS e servidor.
- GameRoom reutiliza o binding GAME_ROOMS com namespace GENERALS:CODIGO em /ws?generals=1. Salas normais com o mesmo código continuam isoladas. Não foram criados bindings, classes de DO ou migrações adicionais.
- IA Online avança por alarmes, com persistência de jogo e memórias. Continua com os dois espectadores desconectados. Pausa impede execução de alarmes pendentes. Uma falha de ação/persistência desfaz o avanço e as memórias, e pausa para inspeção; falha de agendamento depois de salvar não desfaz ação já persistida.
- Código de servidor não depende de eval/new Function. Validação de mensagens, identidade, tamanho, fila e rate limit existentes preservada.

## Testes efetivamente executados

- npm test: 521 testes, 521 passaram, zero falhas/cancelamentos/ignorados.
- npm run validate: 44 JS/MJS válidos; 95 referências HTML existentes; 70 referências dinâmicas de imagens; zero IDs duplicados; paridade Worker/Arena/IA original e paridade dos bundles/fábrica de Generais.
- Nova bateria principal: GAMES=40 RESTORE=1 SEED_OFFSET=40000 node scripts/simulate-generals.mjs. 160 partidas de IA × IA (40 por nível), 160 terminaram, 43.919 ações, zero ações inválidas, travamentos ou erros de ocupação/vínculo. Recupera núcleo e memórias a cada 31 ações. Maior checkpoint medido: 38.647 bytes; a bateria verifica margem de armazenamento.
- Baterias preliminares: 20/20 e 80/80 partidas terminaram. Não somá-las à bateria principal ao anunciar 160 partidas.
- Regressões de Generais cobrem orientação involutiva, independência de memória, filtragem da visão, papéis, reserva de lado, preparação privada, revelação, ações manuais recusadas, pausa/passo, níveis, reconexão, rollback, alarmes e replay. Quatro testes conduzem partidas completas pela rotina de alarmes do servidor mockado, com replay reproduzido.
- Interface testada com DOM/WS/timers simulados: preparação, início, inspeção sem mutação, pausa/passo, reset, recuperação local, handshake/reconexão, posicionamento e execução dos bundles reais. Não confundir isso com navegador real.
- Não há executáveis Chromium/Firefox/WebKit instalados neste ambiente. Nenhum teste visual/touch ou WebSocket/alarme em Cloudflare real desta nova versão. Não declarar QA visual ou reconexão real validada.
- public/rules.js, public/referee.js, public/tri-core.js, public/tri-map.js, src/tri-core.js, src/tri-map.js, public/ai-worker.js e wrangler.jsonc idênticos à v1.15.75. Todos os 67 PNGs preservados.

## Publicação e pendências

Esta v1.15.76 não foi publicada. Site de teste permanece na v1.15.75, commit final 32bb3c6dcd62d4c89e33ff1ef8500c9e110b8e22 (correção de jogo no commit anterior c39ac1ff4b32ff6061ea23619509e4379d93399b), build Cloudflare concluído com sucesso na tarefa anterior.

Publicar apenas com autorização explícita no Eduardo-997/jogo-tatico-oculto. Não tocar no repositório principal, não renomear Wrangler/bindings/migrações, não usar force nem apagar histórico remoto.

Generais na Arena ainda é futuro. Balanceamento, regra de rodadas, vitória, rendição dos modos existentes e ausência de empate automático por inatividade foram preservados. O sistema futuro de personagem General/habilidades de uso único e Modo História não foram implementados por este modo de observação.
