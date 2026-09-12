# Batalha nas Sombras — SAVE v1.15.78 REVISÃO DE PUBLICAÇÃO

Base integral: v1.15.77, incluindo hotfix de identificação de lado no Clássico Online. Pedido: ignorar temporariamente Generais e revisar início e jogabilidade para futura publicação no principal. Nenhum deploy realizado nesta tarefa.

## Correções desta revisão

- Clássico Online: ao trocar o código de sala depois de desconectar, limpar visão, prontidão, formação e escolhas/replay da sala anterior. Antes, a visão antiga phase=play impedia a preparação e o botão Pronto da nova sala.
- Clássico Online: se o servidor atribuir outro lado durante uma entrada, limpar também a formação antiga antes de aplicar eventual preparação confirmada recebida.
- Arena Online: acompanhar a sala conectada; ao trocar sala, limpar visão, prontidão, formação e escolhas/replay anteriores. A troca não reutiliza a partida antiga.
- Reconectar na mesma sala preserva estado local até receber o estado autoritativo; token e preparação confirmada continuam funcionando.
- Versão visível e cache: 1.15.78. Generais permanece intacto em jogabilidade, fora desta auditoria; apenas seu HTML acompanha o cache/versão compartilhado. Ignorar não significa remover o modo do pacote.

## Cobertura e resultados

`npm run test:release`: 513 testes passaram, zero falhas/ignorados. Não inclui os dois arquivos de testes específicos de Generais.

22 novos testes em tests/startup-audit.mjs: troca de sala e preservação da mesma sala; Clássico/Arena Online com equipes 1, 4 e 8, ambas as ordens de Pronto; ações iniciais e recuperação do Durable Object/token; início com todos os 20 personagens em Clássico solo, Treino e Arena; Pronto concorrente; falha de armazenamento do segundo Pronto com rollback e retry; cancelamento de Pronto; todos os 28 comandos Clássicos encaminhados com parâmetros corretos.

Bateria existente cobre mecânicas nos cinco contextos de execução (Treino, solo, núcleo Clássico do Worker, Arena módulo e bundle), matriz de Confronto dos 20 contra os 20, bônus, vínculo, possessão/recuperação, invocações, dano/terreno, recargas, replay, ações fora de turno, identidade, quotas e checkpoints. Testes de lógica/handlers em VM não são inspeção visual em navegador real.

Validação estrutural: 45 JS/MJS sintaticamente válidos; 95 referências HTML locais e 70 referências dinâmicas de imagens; zero referências ausentes ou IDs HTML duplicados; paridade de Worker/Arena/IA/bundles mantida.

Simulações novas desta tarefa, na base v1.15.77, com CHECKPOINT=1 e SEED_OFFSET=77000:

- Clássico: 160/160 encerradas, 36.349 ações, zero ações inválidas, invariantes quebrados ou limite excedido. Jogador de teste fica parado; não é IA x IA e não mede balanceamento.
- Arena: 239/240 encerradas, 106.178 ações, zero ações inválidas ou invariantes quebrados; uma ultrapassou 5.000 ações na seed 227054, nível 1.
- Regras, árbitro, núcleo Arena, IA Clássica e Wrangler são byte a byte iguais entre a base simulada e esta candidata. Não apresentar as partidas como novas execuções de uma IA modificada.
- Reprodução adicional na candidata: `GAMES=1 DIFFICULTY=easy CHECKPOINT=1 SEED_OFFSET=77054 npm run simulate:arena`, novamente 5.000 ações válidas sem fim. Sobreviventes Vanguarda: Paranoia ATQ0/M2, Slime ATQ0/M1, Mini-Slime ATQ0/M1 e Golem de Lava ATQ1/M0. Todos os Postos já sabotados. Rodadas e confrontos continuam; não é bloqueio de início/interface. Um lado não dispõe mais de dano e só empata confrontos; o único causador de dano do outro está imóvel. Não garantir que isso seja formalmente impossível de resolver em todas as sequências futuras. Não alterar balanceamento, regra de empate ou fazer IA se render sem decisão do usuário.

O simulador Arena agora aceita DIFFICULTY para reproduzir um nível isolado e registra atributos efetivos dos sobreviventes quando excede o limite. Essa mudança é somente diagnóstico, não altera o jogo.

## Limites e publicação

Nenhum navegador real está disponível para QA visual nesta tarefa; testes Online usam os Durable Objects reais em contexto simulado, não duas conexões de celular/Cloudflare real. Não prometer zero bugs ou 240/240 partidas encerradas. Rendição continua sendo a saída humana já existente para um impasse.

Última publicação conhecida do repositório de teste: v1.15.76, commit d0b06eeb9c702674fb5ed52daaa0545aee4d3421. Não afirmar a versão do repositório principal sem consultá-lo. Nenhum push, build ou deploy deste SAVE foi realizado.

Wrangler, bindings e migrações preservados. Mistura CJS/ESM intencional: não adicionar type:module. Checkpoint principal continua formato compatível 1.15.73; Generais 1.15.76. SAVEs e relatórios antigos permanecem históricos.
