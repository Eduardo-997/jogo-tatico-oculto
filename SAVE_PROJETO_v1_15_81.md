# SAVE_PROJETO — v1.15.81 TESTE GIT

Base: v1.15.80. Destino autorizado nesta entrega: Eduardo-997/jogo-tatico-oculto. Não publicar no Batalha-nas-sombras-v1 sem novo pedido.

Pedido: revisão geral do modo Generais, com foco no layout, seleção/remoção de personagens e controle dos dois lados.

Correções e melhorias:

- Remoção: havia duas atribuições onclick no mesmo botão. A segunda anulava a proteção contra propagação e o cartão selecionava novamente a peça removida. Agora existe um único evento e um botão Remover explícito.
- G1/G2: o seletor discreto foi substituído por abas grandes azul/vermelha. No Local, ambas funcionam. Online, aparecem somente os lados realmente controlados; controlar os dois exige a opção correspondente e uma sala vazia.
- As abas permanecem acessíveis durante a observação, permitindo consultar e render o lado desejado quando o general controla ambos.
- Seleção de personagens fica antes do tabuleiro, com contador, cartões maiores, estado selecionado, posição e aviso de peça ainda não posicionada.
- Clicar numa peça ou Posto já colocado no tabuleiro permite reposicionar. Depois de uma colocação bem-sucedida, a ferramenta é limpa para evitar mudanças acidentais.
- Preparação mostra separadamente o progresso e o estado Pronto de G1 e G2. Os textos dos botões indicam claramente qual lado será preenchido ou confirmado.
- A ficha durante a preparação mostra peça, atributos, habilidade ou Posto da casa escolhida.
- As duas formações ficam visíveis por padrão na preparação local; continuam secretas no Online.
- Novo gerador de código de sala e texto mais claro para jogar Online sozinho ou com outro general.
- Layout responsivo próprio: seleção antes do tabuleiro, quatro colunas de personagens no desktop, duas no celular, controles de preparação reorganizados e áreas de observação preservadas.

Servidor, regras, IA e balanceamento não foram modificados nesta versão. As proteções Online da v1.15.79 permanecem: preparação secreta, propriedade de lado validada, dupla reserva somente em sala vazia, reconexão e controle independente das IAs.

Validação: 585/585 testes passaram. Os testes específicos cobrem adicionar, posicionar, clicar para reposicionar, remover sem seleção fantasma, alternar G1/G2 localmente, rascunhos independentes de um general Online dos dois lados e bloqueio do lado adversário. Rodar npm run sync, npm test e npm run validate. Testes de servidor usam mocks; sem navegador gráfico real disponível no ambiente.
