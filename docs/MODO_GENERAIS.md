# Modo Generais — Clássico, atualizado na v1.15.81

Generais é um modo de jogo e de observação: os generais montam os exércitos e as IAs executam a partida. Ele usa as regras e o tabuleiro do Clássico.

## Preparação

- Local: uma pessoa controla G1 e G2 pelas duas abas visíveis. Pode montar cada lado ou preencher tudo automaticamente.
- Online com dois amigos: cada general ocupa G1 ou G2 e recebe somente sua própria preparação até os dois confirmarem.
- Online sozinho: marque “Controlar G1 e G2” antes de entrar numa sala nova e vazia. As duas abas ficam disponíveis.
- Cada lado aceita de 1 a 8 peças, duas bases e limite próprio de perdas. G1 configura esses limites no Online.
- Clicar numa peça da lista adiciona e seleciona; clicar no tabuleiro posiciona. Uma peça ou Posto já colocado pode ser clicado para reposicionamento. “Remover” realmente retira a peça sem selecioná-la novamente.

Na v1.15.81, a seleção foi movida para antes do tabuleiro, os lados viraram abas G1/G2, as confirmações receberam cartões separados e o layout ganhou regras próprias para celular. A aba de lado permanece acessível durante a observação para um general de ambos poder escolher qual exército consultar ou render.

## Observação

As IAs recebem somente a visão filtrada normal; a visão completa dos generais não vaza para a decisão delas. Ataques, movimentos, confrontos e criações recentes ficam marcados no mapa e no registro clicável. Há pausa, passo único, velocidade e replay.

Encerrar observação termina sem vencedor. Localmente basta confirmar. Online exige concordância dos dois lados; um general que controla G1 e G2 confirma por ambos. O limite opcional de 1 a 500 rodadas produz o mesmo encerramento para testes; 0 significa sem limite. Isso não altera a regra de empate do Clássico.

Rendição continua sendo por exército. Um general comum não pode preparar ou render o lado alheio. Reconexão restaura o lado reservado e preparações confirmadas. A recuperação local volta pausada e reduz somente o trecho de replay se faltar espaço.

## Limites

Ainda não há Generais no tabuleiro da Arena. O replay pode conter apenas o trecho recente quando ultrapassa o limite de armazenamento. Testes Online usam simulações de WebSocket e Durable Objects; a validação automatizada não substitui conferência visual em navegador real.

