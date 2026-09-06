# SAVE_PROJETO_v1_15_45

Base: **v1.15.44 HOTFIX DEPLOY TESTE GIT**.

## Mudanças principais

### Golem / Golem de Lava
- Golem normal continua podendo **Absorver Rocha**: consome uma Pedra adjacente e recebe **1 de Armadura até o fim do próximo turno próprio**.
- O Golem de Lava continua tendo **Absorver Rocha**.
- Na forma Lava, cada Pedra adjacente consumida concede **+1 Movimento permanente e cumulativo**.
- Assim, o Golem de Lava pode sair de M0 para M1 e voltar a se movimentar; consumos posteriores podem aumentar ainda mais o Movimento.

### Arqueiro — Tiro Certeiro
- A habilidade não é mais aplicada imediatamente.
- Ao clicar em **Tiro Certeiro**, a interface mostra a área de ataque ampliada.
- O jogador precisa **Confirmar** ou **Cancelar**.
- Após confirmar, o próximo ataque normal daquele turno usa o alcance dobrado.
- Recarga preservada em **1 turno**.

### Piromante — Rajada Dupla
- O ataque normal do Piromante passa a atingir apenas **1 casa**.
- A antiga característica de acertar duas casas virou a habilidade ativa **Rajada Dupla**.
- A habilidade permite escolher **1 ou 2 casas distintas** dentro do Alc. Hab., mostra a prévia e pede confirmação.
- Cada casa recebe o ATQ normal do Piromante.
- Recarga: **1 turno**.

### Paranoia — Presença Fantasma
- A habilidade antiga foi removida.
- Nova habilidade ativa: **Presença Fantasma**.
- **Alc. Hab.: 3**.
- Escolhe **exatamente 2 casas** dentro do alcance.
- Máximo de **2 Presenças Fantasmas por Paranoia**. Ao criar novas, as mais antigas são removidas.
- As presenças não bloqueiam movimento e só aparecem visualmente para o dono.
- A Percepção inimiga pode detectá-las como se fossem peças reais.
- Elas podem ser atacadas e também podem gerar um **Confronto Direto falso** quando uma peça inimiga entra na casa.
- Ataque/Confronto destrói a Presença Fantasma e deixa um **Eco da Presença Fantasma** na peça que a descobriu.
- O Eco acontece no **próximo turno próprio** dessa peça, independentemente de onde ela estiver.
- A detecção do Eco é marcada como **conhecidamente falsa** para o jogador e para a IA; a IA não transforma esse Eco em suspeita real.
- Presença Fantasma não funciona como escudo para peças, Espelhos ou terreno real na mesma casa: alvos reais têm prioridade na resolução.

### Alcance / interface de habilidades
- A casa atual da unidade é destacada como **origem da habilidade** quando um modo de habilidade está ativo.
- Habilidades que fazem sentido na própria casa podem selecioná-la, como Vidente, armadilhas e Presença Fantasma.
- Habilidades que não admitem autoalvo continuam sem poder escolher a própria casa.

### Terminologia
- Textos ativos de ficha, regras e interface foram revisados para preferir **turno/turnos** em vez de ativação/ativações quando o termo é apresentado ao jogador.
- Nomes internos de variáveis/métodos foram preservados quando isso evita alterações desnecessárias de código.

## Modos sincronizados
- Clássico local.
- Clássico Online / Worker.
- Treino.
- Arena solo.
- Arena Online.
- IA do Clássico e Arena.
- Replay.

## Deploy
- Preservado o hotfix que removeu o `require('./rules.js')` inexistente de `src/worker.js`.
- `src/worker.js` não possui `require('./rules.js')` nem `module.exports`.
- `GameReferee` do Worker foi sincronizado com o árbitro local.
- `src/tri-core.js` foi sincronizado com `public/tri-core.js`.
