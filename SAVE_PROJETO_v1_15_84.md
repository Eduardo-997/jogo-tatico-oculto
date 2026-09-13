# SAVE_PROJETO — v1.15.84 TESTE GIT

Base: v1.15.83. Publicação autorizada somente em Eduardo-997/jogo-tatico-oculto.

Motivo: tornar visíveis e inequívocos a ficha dos personagens e o início manual do modo Generais.

Mudanças:

- Foi criado o botão visível “Iniciar formações escolhidas” no topo do modo Local.
- O botão valida G1 e G2, informa qual formação está incompleta e inicia diretamente quando ambas estão válidas.
- “Partida aleatória” virou um atalho secundário com nome que deixa claro que substituirá as formações.
- A ficha completa foi movida para cima do catálogo, ficando visível durante a escolha.
- Cada cartão do catálogo passou a mostrar Vida, Movimento, Ataque e arquétipo, além do nome e imagem.
- Posicionamento automático, reposicionamento por clique e arrastar/soltar da v1.15.83 foram preservados.

As correções funcionais anteriores permanecem: remoção sem evento duplicado, reposicionamento por clique, abas G1/G2, controle duplo Online, preparação secreta e gerador de código.

Não houve alteração em regras, IA, balanceamento, Worker ou protocolos. Os 587 testes automatizados passaram, além da validação de sintaxe, referências, IDs e paridade dos bundles. A simulação de Generais concluiu 80/80 partidas, com 21.376 ações, sem ação inválida, invariante quebrada ou estagnação. Sem navegador gráfico real disponível no ambiente.
