# Modo Generais — definição aprovada, implementação pendente

Não confundir com um espectador passivo de partidas humanas.

- Dois amigos escolhem lados diferentes. Cada general define seu próprio exército e posicionamento, sem acessar a formação do adversário.
- A composição e as posições permanecem secretas durante toda a preparação, inclusive quando apenas um jogador confirmou Pronto.
- Depois que ambos confirmam Pronto, o estado completo do mapa é revelado aos generais.
- As IAs passam a comandar os exércitos; os generais observam, sem executar ações das peças.
- A visão completa dos espectadores não deve ampliar a informação disponível aos controladores de IA: continuam usando as mesmas regras de informação oculta do jogo normal.
- Servidor valida a propriedade do lado, a formação e a prontidão; ocultação não pode depender somente da interface.
- Reconexão deve recuperar o lado do general e sua etapa de preparação ou observação, sem permitir tomar o lado do outro participante.

Antes de entregar esse modo, testar isolamento de preparação, prontidão simultânea, IA dos dois lados, escolhas pendentes de Confronto/Doppelgänger, reconexão e replay.

Sem alteração de balanceamento. Rendição continua com a regra existente; apenas foi movida para junto das ações na v1.15.74. Não foi adicionada regra automática de empate.
