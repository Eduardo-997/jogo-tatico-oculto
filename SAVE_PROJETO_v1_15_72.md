# SAVE_PROJETO v1.15.72 — Batalha nas Sombras

## Base, autorização e continuidade

- Base utilizada: `jogo_v1_15_71_TESTE_GIT`, preservada sem alterações.
- Nova entrega: `jogo_v1_15_72_TESTE_GIT.zip`, cumulativa sobre a auditoria anterior.
- O usuário autorizou prosseguir sem exigir teste manual entre os lotes.
- Escopo: combinações raras de mecânicas, falhas/reconexão Online, IA e interface.
- Nenhum deploy, alteração de repositório remoto ou ação em sala real foi executado. Somente o usuário publica.
- Esta passa a ser a próxima base de trabalho. SAVEs v1.15.70 e v1.15.71 incluídos são históricos; não voltar aos ZIPs antigos para implementar novas mudanças.

## Falhas reproduzidas e corrigidas

### Bardo Online — regressão da validação v1.15.71

- A validação das mensagens saneava o objeto de ação e descartava `stat`, o tipo de bônus escolhido pelo jogador.
- Isso impedia `bardBuff` no Clássico Online e `bard` na Arena Online de receberem a escolha corretamente.
- `stat` agora é preservado como string limitada; a validação de bônus permitidos continua no núcleo.
- Testes verificam recepção da escolha pelo handler e presença dela na ação gravada no replay.

### Vida temporária, Armadura e Golem

- O núcleo consumia `tempLife`, mas deixava de diminuir a Vida atual pelo dano absorvido nessa parcela. Assim, +1 Vida podia proteger contra mais dano do que concedia.
- Agora o dano efetivo reduz a Vida atual uma única vez; o contador temporário é consumido para que a expiração não retire novamente Vida já perdida.
- Armadura reduz o dano antes de consumir Vida temporária. Golpe completamente bloqueado não gasta o bônus do Bardo nem transforma o Golem.
- Golem que sofre dano efetivo e sobrevive transforma-se normalmente, conservando bônus permanentes e a parcela de Vida temporária ainda não consumida.
- Aplicado no núcleo Clássico/Treino, Worker Clássico e Arena local/Online.
- Descrição compartilhada do Bardo explica o consumo e a remoção apenas da parcela temporária restante.

### Inspiração durante possessão

- A Inspiração copiada para um corpo possuído podia escapar da expiração porque o código examinava somente a equipe original do Bardo.
- Expiração e morte/substituição da fonte agora limpam seus efeitos em todas as equipes, pela identificação única da fonte, sem conceder informação oculta à IA.
- Recuperação do hospedeiro preserva seus efeitos/HP atuais, em vez de restaurar do snapshot uma Inspiração já expirada.
- Testes cobrem inspiração de Vida, possessão do aliado, turno seguinte da fonte, dano no corpo controlado e retorno ao dono sem ressuscitar o bônus antigo.

### Linhagem de Slime possuída

- Possuir o último Mini-Slime retirava-o da lista de vivos do dono e podia contar a linhagem como perda original, encerrando a partida antes da hora.
- A linhagem permanece existente enquanto houver Mini-Slime vivo, possuído ou recuperado aguardando casa válida.
- Possessão não é tratada como destruição definitiva da linhagem.
- Testes nos cinco ambientes de mecânicas verificam ausência de vitória prematura e perdas corretas da Arena.

### Escolha pós-Confronto na Arena Online

- A interface bloqueava ações fora do turno mostrado, inclusive a escolha legítima do defensor vencedor.
- `combatChoice` agora pode ser enviado pelo jogador que recebe a escolha, mesmo que `view.turn` ainda indique o atacante. O núcleo continua validando o vencedor.
- Escolha de cópia pendente tem a mesma exceção específica; ataques/movimentos indevidos continuam bloqueados.
- O aviso de turno mostra “SUA ESCOLHA” durante essas decisões, em vez de mandar o vencedor aguardar.

### Retomada da IA da Arena Online

- Após restauração da sala durante turno/decisão da IA C, entrar ou reconectar apenas transmitia a visão e não retomava `runAI`.
- Entrada/reconexão autorizada agora retoma a IA quando ela tem ação pendente.
- A próxima ação recebida também pode tentar retomá-la após uma falha temporária, respeitando as decisões pendentes de humanos.

### Corrida entre IA solo e troca/reinício de partida

- O controlador assíncrono consultava referências globais após as pausas; uma execução antiga podia sobrescrever a visão ao trocar de modalidade ou reiniciar.
- Cada execução captura seu núcleo, cliente e cérebros e usa um identificador de sessão.
- Troca de modalidade, reinício e início de nova partida invalidam a execução anterior.
- Execução antiga não limpa o bloqueio de uma execução nova nem deixa um timer antigo atuar sobre a nova sessão.
- Teste com pausa controlada verifica que a visão Online não é sobrescrita pelo controlador solo cancelado.

### Geometria de peças compartilhadas na Arena

- O tamanho seguro anterior considerava uma imagem centralizada, mas não a soma do deslocamento lateral de duas imagens e seu deslocamento vertical.
- Verificação matemática encontrou 86 imagens compartilhadas que ultrapassavam algum limite da célula, entre os 192 posicionamentos de duas peças nas 96 células.
- `pieceSafeSize` calcula o limite pela distância às arestas e pelo espaço ocupado por imagem + deslocamento, sem impor o mínimo antigo que forçava transbordamento.
- Testes verificam os quatro cantos das 288 imagens: 96 individuais e 192 compartilhadas, dentro dos polígonos reais.
- Também verificado: quatro cantos livres antes de empilhamento e círculos de detecção com espaço para seu raio dentro das 96 células.
- A geometria do tabuleiro e os biomas não foram movidos.

### Formação e escolhas temporárias da Arena

- A formação lida do armazenamento da sessão era imediatamente apagada pela inicialização de modalidade. A inicialização agora pode preservá-la explicitamente.
- Formação salva é validada antes de renderizar: arrays, nomes conhecidos, coordenadas existentes, limites e ausência de duplicidade/overposição.
- Troca de modalidade e reinício limpam seleção, casas do Vidente, Posto pendente e alvo antigo de vínculo, além de parar a IA anterior.
- Cancelar Pronto verifica a conexão antes de tentar enviar a mensagem.
- A recuperação de preparação Online confirmada continua vindo do servidor; não foi acrescentado armazenamento durável de todo rascunho Online não confirmado.

### Grid de celular

- O tamanho das células era calculado pela viewport com descontos fixos, sem acompanhar necessariamente a largura efetiva do painel.
- No Clássico/Clássico Online/Treino, oito colunas agora dividem o espaço real disponível do container por `1fr`.
- Células usam largura de 100% da coluna e `aspect-ratio: 1/1`; eixo lateral acompanha a linha.
- Mantidos os controles no fluxo normal abaixo do tabuleiro, sem tornar o painel fixo sobre as casas inferiores.
- Teste estático da configuração CSS e do cálculo de distribuição em larguras de 320, 360, 390, 430 e 600 px, com diferentes espaços internos. Não substitui renderização visual.

### Identificação da fonte na própria visão da IA

- Espelhos e armadilhas próprios agora entregam `mageId`/`placerId`, campos que a estratégia consultava, mas que a visão filtrada omitia.
- Arena não bloqueia o Espelho de uma fonte só porque outra fonte da equipe tem um ativo.
- Os campos só acompanham objetos da própria equipe; o adversário não recebe esses objetos ou suas ligações.
- Removida duplicidade literal de `summonerId` e `druidId` na montagem de peça pública da Arena.

## Proteções adicionais — testes com falhas injetadas

- Handlers de ação Online restauram o checkpoint se o núcleo rejeitar a ação ou lançar uma exceção, impedindo que mutações parciais futuras escapem.
- Uma falha ao iniciar partida restaura a preparação anterior em vez de deixar a última confirmação apenas em memória.
- Erro interno no controlador da IA C restaura núcleo, replay e memória, informa falha sem confirmar a ação e permite tentativa de retomada por reconexão.
- Rejeição/fallback de IA restaura o estado do núcleo antes de tentar outra ação; aprendizagem da rejeição pode continuar no cérebro.
- Falhas de gravação continuam restaurando núcleo, replay e memória da IA antes de anunciar o estado aos clientes.
- Essas proteções foram verificadas por mocks e erros deliberadamente injetados. Não são alegações de que tais exceções aconteciam em partidas normais.

## Validação da v1.15.72

- `npm test`: 308 testes, todos aprovados; nenhuma falha, cancelamento ou teste ignorado.
- A bateria anterior tinha 265 testes; 43 regressões foram acrescentadas nesta etapa.
- Mecânicas exercitadas no Treino, Clássico solo, núcleo embutido do Worker Clássico, Arena ESM e bundle de navegador.
- `npm run validate`: 32 JS/MJS passaram na sintaxe, 77 referências HTML locais existem, nenhum ID HTML duplicado.
- Paridade do Worker embutido, cópias/bundles da Arena e IA empacotada conferida após `npm run sync`.
- Clássico: 80 simulações de perseguição contra oponente parado nas quatro dificuldades; 80 concluídas, 18.440 ações, nenhuma inválida, nenhum travamento no limite e nenhuma violação das invariantes verificadas.
- Arena: 240 partidas de três IAs nas quatro dificuldades; 240 concluídas, 109.976 ações, nenhuma inválida, nenhum travamento no limite e nenhuma violação das invariantes verificadas.
- Total: 320 partidas concluídas e 128.416 ações nessas simulações.
- Resultados incluídos em `docs/VALIDACAO_CLASSICO_v1_15_72.json` e `docs/VALIDACAO_ARENA_v1_15_72.json`; relatórios v1.15.71 são históricos.
- Assets e geometria foram preservados; checagem byte a byte consta no encerramento da validação.
- O limite de 5.000 ações do simulador serve para detectar partidas presas; não foi introduzido como regra de empate.

## Regras e decisões preservadas

- Sem alteração deliberada de atributos, balanceamento, mapas, coordenadas ou biomas.
- Sem empate por inatividade/morte súbita adicional.
- Rendição da Arena continua encerrando a partida inteira.
- Doppelgänger continua copiando somente as ativas compatíveis existentes; não recebe passivas gerais ou atributos do cadáver.
- Sem novo personagem, General ou Modo História.
- Nome histórico do Worker, bindings e migrations preservados.

## Limitações e teste final pendente

- Não houve navegador real nesta rodada: a dependência Playwright existe, mas o executável Chromium não está instalado. Não houve renderização visual nem teste de toque, áudio ou contraste.
- Testes de SVG são matemáticos; testes de celular são estáticos. Conferir a aparência e legibilidade reais das peças menores/compartilhadas no teste final.
- Online foi verificado com mocks de Durable Objects e WebSockets; não houve Cloudflare real, deploy ou manipulação de salas de produção.
- Resultados das simulações e regressões são evidência dos cenários executados, não garantia de que toda combinação possível está livre de bugs.
- Próximo teste manual recomendado: Bardo e bônus de Vida; Escudeiro/Confronto com defensor vencedor Online; possessão de aliado inspirado/Mini-Slime; reconexão durante turno da IA; reiniciar/trocar modalidade durante IA; celular, marcadores e replay.
- Ao reportar problema, informar versão, modalidade, peças, sequência e replay/save quando disponível; continuar desta base.

## Fontes e manutenção

- Editar fontes Clássicas em `public/rules.js`, `public/referee.js`, `public/ai-worker.js`.
- Editar Arena em `public/tri-core.js`, `public/tri-map.js`, `public/tri-ui.js`.
- Online: `src/worker.js`, `src/room-protocol.js`, `public/online-session.js`.
- Textos: `public/character-info.js`; CSS compartilhado: `public/ui-v1157.css`.
- Sempre executar `npm run sync`, `npm test` e `npm run validate` após mudanças aplicáveis.
- IA: `npm run simulate:classic`; `GAMES=60 npm run simulate:arena` para 240 jogos.
- Não editar cópias geradas, não reintroduzir `require('./rules.js')` no Worker, não adicionar `type:module` sem migrar o CommonJS.
- Publicação apenas pelo usuário, seguindo `LEIA-ME_DEPLOY.txt`.
