# Modo Generais — Clássico implementado na v1.15.76

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
