# Modo Generais — Clássico, atualizado na v1.15.79

## Melhorias da v1.15.79

Cada lado pode usar de 1 a 8 peças, com limite de perdas configurável. No Online, o anfitrião define a configuração antes da preparação. Uma sala nova e vazia também pode reservar ambos os lados para um só general; a reconexão recupera os dois. Em salas com dois amigos, cada preparação continua secreta até ambos confirmarem Pronto.

Ataques, deslocamentos e criações recentes permanecem destacados no mapa. O registro clicável localiza a ação e permite acompanhar automaticamente os acontecimentos. A ficha e o placar ajudam a consultar peças e perdas. A visão do observador nunca é fornecida às IAs.

Encerrar observação não declara um vencedor: libera o replay e interrompe as IAs. Localmente basta confirmar; Online, ambos os lados precisam concordar (um general dos dois lados confirma sozinho). Um limite opcional de 1 a 500 rodadas oferece o mesmo encerramento para testes; 0 mantém a observação sem limite. Não é uma nova regra de empate do jogo normal. Algumas combinações podem permanecer em impasse sem esse limite.

Recuperação local conserva configuração, registro e estado, sempre pausada. Se o armazenamento ficar cheio, tenta reduzir apenas o trecho de replay. O Online conserva preparações confirmadas durante desconexões e impede comandos em lados não controlados.

Validação da v1.15.79: 569 testes passaram; simulações descritas em VALIDACAO_v1_15_79.json. Não foi realizado teste visual em navegador real.

Não confundir com um espectador passivo de partidas humanas.

Estado atual: preparação secreta Online entre dois amigos e observação local IA × IA implementadas no tabuleiro do Clássico. Entrada em /generals.html, com links nas telas Clássico e Arena. A versão da Arena deste modo ainda é futura; o link nela abre o duelo do Clássico, não um modo de três generais.

Local: preparação manual de ambos os exércitos ou botão de observação aleatória; níveis de IA independentes, pausa, velocidade, passo de uma ação, ficha dos dois lados e recuperação local após F5 (pausada). Online: General 1 e 2 escolhem lados distintos e só recebem sua própria preparação até ambos darem Pronto. Visão completa liberada apenas depois do início. Reconexão por token separado das salas normais; nenhuma formação secreta fica no roomState.

As ações das peças e escolhas de Confronto/Doppelgänger são feitas pelas IAs. Ambos os generais podem pausar/retomar e avançar uma ação; rendição é do próprio exército. Replay após encerramento: pode conter somente trecho recente, devido ao limite do visualizador. Não foram alteradas regras de vitória, prioridades ou atributos.

- Dois amigos escolhem lados diferentes. Cada general define seu próprio exército e posicionamento, sem acessar a formação do adversário.
- A composição e as posições permanecem secretas durante toda a preparação, inclusive quando apenas um jogador confirmou Pronto.
- Depois que ambos confirmam Pronto, o estado completo do mapa é revelado aos generais.
- As IAs passam a comandar os exércitos; os generais observam, sem executar ações das peças.
- A visão completa dos espectadores não deve ampliar a informação disponível aos controladores de IA: continuam usando as mesmas regras de informação oculta do jogo normal.
- Servidor valida a propriedade do lado, a formação e a prontidão; ocultação não pode depender somente da interface.
- Reconexão deve recuperar o lado do general e sua etapa de preparação ou observação, sem permitir tomar o lado do outro participante.

Regressões permanentes cobrem isolamento de preparação, prontidão, IA dos dois lados, escolhas pendentes, reconexão, rollback de persistência/agendamento e replay. Relatório em docs/VALIDACAO_v1_15_76.json. Testes de servidor usam mocks de Durable Objects/WebSocket; navegador e Cloudflare reais ainda precisam de validação após publicação.

Sem alteração de balanceamento. Rendição continua com a regra existente; apenas foi movida para junto das ações na v1.15.74. Não foi adicionada regra automática de empate.
