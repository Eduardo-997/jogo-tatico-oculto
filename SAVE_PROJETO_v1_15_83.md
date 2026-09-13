# SAVE_PROJETO — v1.15.83 TESTE GIT

Base: v1.15.82. Publicação autorizada somente em Eduardo-997/jogo-tatico-oculto.

Motivo: completar o acabamento da preparação do modo Generais após a reorganização visual da v1.15.82.

Mudanças:

- O contêiner inteiro do modo Generais agora é centralizado na página, não apenas o tabuleiro dentro da coluna esquerda.
- Clicar em um personagem novo no catálogo já o adiciona à primeira casa válida e livre do próprio campo.
- Clicar novamente no personagem escolhido mantém o reposicionamento manual por clique.
- Personagens e Postos já posicionados podem ser arrastados e soltos em outra casa durante a preparação.
- Arrastar conserva as mesmas validações do clique: metade correta, obstáculo, ocupação e proibição de Postos nos cantos.
- O arraste está disponível somente durante a preparação e apenas para peças/Postos do lado atualmente controlado.

As correções funcionais anteriores permanecem: remoção sem evento duplicado, reposicionamento por clique, abas G1/G2, controle duplo Online, preparação secreta e gerador de código.

Não houve alteração em regras, IA, balanceamento, Worker ou protocolos. Os 586 testes automatizados passaram, além da validação de sintaxe, referências, IDs e paridade dos bundles. A simulação de Generais concluiu 80/80 partidas, com 21.376 ações, sem ação inválida, invariante quebrada ou estagnação. Sem navegador gráfico real disponível no ambiente.
