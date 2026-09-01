# SAVE_PROJETO v1.15.7 — EVENTOS + 💥 PERSISTENTE + FIM DE PARTIDA

## Base

Criada diretamente sobre a **v1.15.6 LOCAL — LAPIDAÇÃO GERAL DE INTERFACE**, que já havia sido aprovada visualmente pelo usuário.

Esta versão foi preparada como **GIT + CLOUDFLARE** mediante pedido explícito do usuário.

## Escopo aprovado

1. remover redundância dos dois históricos durante partidas normais;
2. manter apenas um painel curto de acontecimentos realmente relevantes;
3. fazer o marcador 💥 de ataque inimigo permanecer tempo suficiente para orientar a próxima decisão;
4. revisar obrigatoriamente a mesma mecânica na Arena;
5. criar uma tela clara de fim de partida;
6. não transformar Replay em histórico durante a partida e não criar Replay online/Arena nesta versão.

## 1. Eventos da Batalha

Clássico, Clássico Online e Arena agora exibem um único painel:

**EVENTOS DA BATALHA**

O antigo painel textual de `INFORMAÇÕES TÁTICAS` foi removido dessas telas, porque PER, presença e local de ataque já possuem representação direta no tabuleiro.

O novo painel prioriza acontecimentos que ainda têm valor como memória curta durante a partida, principalmente:

- Confronto Direto e repelidas;
- mortes/eliminações;
- dano relevante sofrido pela própria equipe;
- Posto próprio sabotado;
- ativação de armadilha inimiga;
- possessão/recuperação envolvendo Fantasma;
- transformações importantes ligadas a combate;
- vitória/derrota/eliminação de exército.

Eventos como início de rodada, uso rotineiro do Bardo/Vidente e outras ações que já ficam evidentes no tabuleiro/ficha deixam de ocupar o painel.

### Nota técnica

O Árbitro ainda mantém internamente os registros necessários para efeitos/Replay e os buffers de histórico foram ampliados para 20 entradas. A interface filtra e mostra no máximo os últimos 5 eventos relevantes. Isso evita que um evento importante desapareça apenas porque várias mensagens rotineiras ocorreram depois.

O Treino mantém seus históricos A/B e informações táticas por ser uma ferramenta de teste e depuração de interações, não uma partida competitiva normal.

## 2. Marcador 💥 — Clássico

Antes, o 💥 recebido por um ataque inimigo era apagado assim que o jogador comprometia a próxima ação.

Agora:

- o ataque inimigo marca a casa normalmente;
- selecionar peça não apaga;
- começar movimento/ataque/habilidade não apaga;
- mover e continuar a ativação não apaga;
- o 💥 só desaparece quando **esse jogador encerra sua própria ativação**.

A regra foi aplicada tanto ao Árbitro local quanto ao Árbitro autoritativo do Clássico Online.

## 3. Marcador 💥 — Arena

A Arena recebeu revisão específica, não apenas uma cópia do Clássico.

Antes cada jogador guardava somente uma casa de impacto por vez.

Agora cada jogador possui uma lista própria de impactos visíveis:

- ataques de B e C podem gerar dois ou mais 💥 simultâneos para A;
- os marcadores não somem quando A começa a agir;
- todos permanecem até A encerrar sua própria ativação;
- depois disso somente os marcadores de A são limpos; B e C mantêm os próprios até consumirem sua janela de informação.

### Ataque visto pelos três lados

Na Arena, a casa de um ataque é tratada como informação pública de combate para **todos os outros exércitos ativos**.

Exemplo:

- B ataca uma casa ocupada por C;
- C naturalmente recebe a informação;
- A também recebe o 💥 daquela casa, mesmo não sendo o alvo;
- se C atacar outra casa antes de A jogar, A pode ver os dois locais e decidir qual região merece atenção.

Nenhuma posição oculta de personagem é enviada junto com o 💥. A informação nova é somente a casa onde ocorreu o ataque, conforme a regra visual aprovada.

Salas de Arena antigas salvas pelo Durable Object são convertidas automaticamente do formato antigo de um único `impact` para a nova lista de impactos ao serem carregadas.

## 4. Tela de fim de partida

Clássico, Clássico Online e Arena agora exibem um modal de encerramento quando `gameOver` é verdadeiro.

Mostra:

- VITÓRIA / DERROTA / EMPATE;
- motivo principal do encerramento;
- perdas;
- número de rodadas.

### Clássico local

Além de `Jogar novamente`, oferece **Ver Replay** quando o Replay possui quadros gravados.

O Replay continua bloqueado durante a partida e só é oferecido no encerramento.

### Clássico Online / Arena

Não foi criado Replay novo para esses modos. O modal mostra o resultado e permite iniciar outra partida/recarregar o modo. A decisão sobre Replay online/Arena continua reservada para discussão futura.

## 5. Regras atualizadas

A aba Regras agora explica:

- no Clássico, que 💥 permanece até o jogador encerrar sua próxima ativação;
- na Arena, que vários ataques podem ficar marcados simultaneamente e são visíveis aos outros exércitos ativos até cada um encerrar sua própria ativação.

## Arquivos principais alterados

### Interface

- `public/index.html`
- `public/multiplayer.html`
- `public/triplayer.html`
- `public/training.html` apenas para apontar para a folha visual atualizada
- `public/ui.js`
- `public/multiplayer-ui.js`
- `public/tri-ui-global.js`
- `public/tri-ui.js`
- `public/quick-rules.js`
- novo `public/battle-presentation.js`
- novo `public/ui-v1157.css`

### Regras/Árbitro

- `public/referee.js`
- `src/worker.js` — somente comportamento aprovado do 💥 no Clássico Online + buffer interno de histórico
- `public/tri-core.js`
- `public/tri-core-global.js`
- `src/tri-core.js`

## Segurança / informação oculta

- nenhuma posição oculta de personagem foi adicionada às views;
- o Clássico Online continua usando o Árbitro autoritativo do Worker;
- o novo `impactCells` da Arena contém somente coordenadas de ataques públicos, sem identidade/posição secreta do atacante;
- `wrangler.jsonc`, bindings e migrations de Durable Objects permaneceram inalterados;
- não foi criado armazenamento de Replay online.

## Arquivos de versão

- `package.json`: `1.15.7`;
- `LEIA-ME_DEPLOY.txt` atualizado para pacote Git/Cloudflare;
- este `SAVE_PROJETO_v1_15_7.md` é o SAVE mais recente e deve prevalecer sobre SAVEs antigos em caso de conflito.

## Próximo passo

Publicar/testar a v1.15.7 e jogar partidas reais. A próxima fase continua sendo lapidação baseada em uso: observar quais elementos da interface ainda poluem, quais informações realmente ajudam durante a partida e quais ajustes de balanceamento aparecem nos playtests.
