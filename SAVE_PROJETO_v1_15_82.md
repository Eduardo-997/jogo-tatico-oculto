# SAVE_PROJETO — v1.15.82 TESTE GIT

Base: v1.15.81. Publicação autorizada somente em Eduardo-997/jogo-tatico-oculto.

Motivo: o layout da v1.15.81 melhorou os controles, mas empilhou preparação, seleção e tabuleiro verticalmente. Isso exigia rolar a página para alternar entre as partes principais.

Mudanças:

- Layout alinhado aos outros modos: tabuleiro central à esquerda e painel de preparação à direita.
- Tabuleiro limitado a 560 px no desktop, próximo do porte visual do Clássico, e conjunto de duas colunas centralizado.
- Configuração de quantidade, perdas e rodadas foi movida para a lateral e começa recolhida.
- Opções, abas G1/G2, dificuldade, Postos, preenchimento, confirmação, escolhidos e catálogo ficam reunidos na lateral.
- Catálogo compacto em três colunas, cartões escolhidos em duas e botões menores, preservando nomes e imagens.
- Painel lateral é fixo dentro da janela no desktop e possui rolagem própria somente quando seu conteúdo excede a altura disponível.
- Durante a observação, o seletor de modo é ocultado e ficam visíveis tabuleiro, placar e controles relevantes.
- Em telas de até 820 px, o layout vira uma coluna e a preparação vem antes do tabuleiro; a lateral deixa de ser fixa. Em celulares estreitos, catálogo usa duas colunas e controles mantêm alvos de toque adequados.
- Status e placar compartilham uma faixa compacta. Textos redundantes foram encurtados.

As correções funcionais da v1.15.81 permanecem: remoção sem evento duplicado, reposicionamento pelo tabuleiro, abas G1/G2, controle duplo Online, preparação secreta e gerador de código.

Não houve alteração em regras, IA, balanceamento, Worker ou protocolos. Os 585 testes automatizados passaram, além da validação de sintaxe, referências, IDs e paridade dos bundles. Sem navegador gráfico real disponível no ambiente.
