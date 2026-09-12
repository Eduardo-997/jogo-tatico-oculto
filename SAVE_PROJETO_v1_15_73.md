# SAVE_PROJETO v1.15.73 — Batalha nas Sombras

## Base e autorização

- Cumulativo sobre `jogo_v1_15_72_TESTE_GIT`; não reconstruir versões antigas.
- O usuário autorizou corrigir e ampliar testes sem exigir testes manuais entre lotes.
- A v1.15.72 foi publicada anteriormente na main de Eduardo-997/jogo-tatico-oculto, commit dfb05ca712527d97d18679cb9d4d77c62fb1cf2e; Cloudflare Workers confirmou sucesso. A v1.15.73 desta entrega NÃO foi publicada.
- O repositório principal não foi alterado. Configuração Wrangler, bindings/migrations, mapas e PNGs preservados.
- Prioridade inicial continua alternando no Clássico e girando na Arena. Empate e rendição não foram redefinidos.

## Testes manuais informados pelo usuário

- Escudeiro: proteção/vínculo aprovados.
- Vidente/Piromante: alcance e confirmação aprovados.
- Movimento parcial/Parar movimento: aprovado.
- Reconexão Arena Online: aprovada.
- Aparência no celular: parece correta segundo o usuário.
- Treino: ataque contra Slime possuído recuperou o hospedeiro normalmente.
- Reconexão do Clássico Online e partida real de IA até o fim NÃO foram testadas pelo usuário. Clássico contra IA continuar sem internet é esperado: ele é local. Atualizar a página perder progresso na v1.15.72 era ausência de persistência local, não falha de reconexão.

## Correções v1.15.73

### Arena: foco e seleção com geometria real

- Outline retangular do foco SVG removido tanto das casas quanto dos grupos de peças; o foco usa o stroke do polígono real.
- Focar uma peça marca sua própria casa como keyboard-focus; desfocar remove a marca. Enter/Espaço e navegação por teclado continuam funcionando.
- Nenhuma conversão para grid quadrado e nenhuma alteração da geometria/coordenadas/biomas.

### Identificação das unidades

- `BNSCharacterInfo.unitLabel/unitHtml` centralizam nome, categoria e posição.
- Um corpo possuído aparece como `Cavaleiro — possuído pelo Fantasma — D4`, mesmo quando original=true representa a origem do Fantasma no núcleo.
- Original, invocação e divisão de Slime têm categorias diferentes. Unidade possuída não é erroneamente rotulada como invocação.
- Na Arena, posição usa referência visual A–H / 1–15; os códigos internos não são apresentados nas escolhas de benefício.
- Aplicado à sabotagem em Clássico, Clássico Online, Treino e Arena solo/Online; escolhas do Bardo também identificam a unidade.
- HTML dos alvos de sabotagem é escapado. As opções usam somente a visão filtrada já disponível; localização perdida não é recuperada/revelada.

### Manual

- Texto compartilhado do Clássico: `No Clássico, quem começa é sorteado e alterna a cada rodada. Na passagem entre rodadas, um jogador pode agir duas vezes seguidas.`
- A regra da Arena continua sendo rotação entre A/B/C; o Treino não passa a alternar jogadores.

### Recuperação local após atualizar a página

- Novo `public/local-checkpoint.js`, carregado antes das interfaces locais.
- Clássico contra IA e Arena solo salvam estado exportado em sessionStorage, separado por modalidade e nesta aba.
- Restaura Vida, turnos/rodada, posições, efeitos, bônus, fontes, vínculos, possessões, invocações, sementes, impactos, decisões e movimento pendente. Formação/configuração/dificuldade também retornam.
- Os controladores de IA são reconstruídos e retomam uma ação/decisão pendente; não se afirma que toda memória estratégica privada anterior foi preservada.
- Valida versão/formato, lados, configurações, peças/IDs/coordenadas, efeitos, compartilhamento e vínculos antes de importar. Invocações são aceitas mesmo não sendo personagens selecionáveis.
- Falha de armazenamento não lança exceção. Dados corruptos/incompatíveis são descartados. Não se promete recuperação se o navegador bloqueia sessionStorage ou sua cota.
- Limita o replay salvo a 120 quadros e cerca de 900 mil unidades de texto; a partida atual tem prioridade em caso de cota. O replay em memória não é cortado pela gravação.
- Replay recuperado parcial tem sinalização `Trecho recente`; a indicação continua nas gravações seguintes. `Recorder.restore` evita duplicar o estado final.
- Reiniciar remove o checkpoint e preserva a formação. Trocar para Online não grava estado Online no checkpoint local; retornar ao solo pode recuperar a partida local.
- Não implementa sincronização entre dispositivos, servidor de partidas locais, abertura Offline após F5, nem recuperação retroativa de partidas perdidas na v1.15.72.

### Clássico: respostas atrasadas da IA

- Existia risco real de uma resposta do Worker antigo agir em outra partida: onmessage não conferia id da solicitação, e Reiniciar não cancelava o timer nem limpava a memória do cérebro.
- Agora apenas a resposta pendente e atual é aceita uma vez; respostas antigas/duplicadas são ignoradas.
- Reiniciar invalida a solicitação, cancela timer e envia reset ao Worker. Reset limpa a memória sem retornar ação.
- Aceita a decisão pendente da IA defensora mesmo quando o turno formal é do jogador.

## Validação automatizada

### Estagnação encontrada e corrigida durante a revisão

- A execução inicial das 240 Arenas com sementes novas concluiu 239; uma chegou a 5.000 ações sem terminar. Zero ações inválidas/invariantes, mas não foi considerada aprovação total.
- Seed 173053, nível 4: restaram Bardo contra Bardo + Vidente possuído. Todos ATQ0, Confrontos empatados; o Bardo insistia em Vida em vez de dar ATQ ao aliado.
- Bardo da IA agora prioriza +1 ATQ quando todo o próprio exército está sem ataque normal/possessão ofensiva. Essa habilidade útil também tem prioridade sobre a regra genérica de mover antes de repetir preparação.
- Correção aplicada a IA Clássico e TriAI (Arena solo/Online), sem receber informação oculta nem mudar atributos/regras do personagem.
- Cinco regressões permanentes verificam a escolha com equipe ATQ0 e pressão de estagnação. O caso reproduzível e três outras sementes direcionadas passaram: 4/4 concluídas, 2.304 ações, zero inválidas/estagnação/invariantes.
- Evidência anterior preservada em `docs/VALIDACAO_ARENA_ANTES_AJUSTE_BARDO_v1_15_73.json`; a suíte completa de simulações foi repetida após o ajuste.
- Isso não resolve por decreto posições realmente sem possibilidade de vitória (ex.: somente um Bardo ATQ0 em cada lado). Uma regra geral de empate continua decisão pendente.

- 480 testes permanentes aprovados; zero falha/ignorado.
- Matriz de 400 pares dos 20 personagens em cinco variantes: Treino, Clássico solo, Worker Clássico, Arena módulo e Arena bundle global. Total: 2.000 casos de Confronto, com +1 M para exercitar peças M0, atributos naturais de Vida e passivas.
- 500 casos de Inspiração: cinco bônus do Bardo nos 20 personagens, em cinco variantes, incluindo expiração e Vida.
- 190 casos de Escudeiro: ataque normal e Rajada Dupla contra os outros 19 personagens, em cinco variantes.
- Total das três matrizes: 2.690 casos; não confundir casos internos com o contador de 480 testes do runner.
- Round trip conserva as visões dos lados e a normalização permanece estável. Defaults acrescentados em invocações durante importState são compatibilidade, não perda de estado.
- Testes específicos de recuperação, retomada da IA, replay limitado/cota, dados malformados, identificação e foco SVG.
- Simulações finais: ver `docs/VALIDACAO_v1_15_73.json` e os relatórios específicos. Executadas com validação do checkpoint em cada ação.
- Bateria final com sementes novas: Clássico 80/80, 20.764 ações; Arena 240/240, 100.924 ações. Total: 320/320 partidas concluídas, 121.688 ações, zero inválidas/estagnação/violação de invariantes.
- Clássico usa IA contra oponente parado; Arena utiliza três IAs. Não apresentar os 80 Clássicos como duelo IA versus IA.
- Verificação final: 34 JS/MJS na sintaxe, 79 referências HTML, zero ausente/ID duplicado, cópias Worker/Arena/IA sincronizadas, 67 PNGs/mapa/configuração Wrangler byte a byte iguais à base.
- Scripts de simulação aceitam SEED_OFFSET e falham também se uma partida atinge o limite sem terminar; não mascaram estagnação como sucesso.

## Limitações e próximos itens

- Testes em Node/VM e geometria não são teste visual em navegador real. Sem Chromium instalado nesta rodada; não se afirma teste de toque, áudio, contraste ou F5 real pelo navegador.
- Online continua testado por mocks nesta revisão, além dos relatos manuais anteriores do usuário. Não houve teste/deploy real novo no Cloudflare.
- Resultados cobrem os cenários executados, não todas as combinações possíveis de oito unidades ou sequências de ações.
- IA x IA/espectador como opção na interface permanece melhoria futura, não foi implementada neste lote.
- Regra de empate/estagnação e rendição individual da Arena exigem decisão de design. Mantidas como estavam.
- Limpeza de campos antigos do Espelho e otimização de PNGs grandes/duplicados são manutenção opcional; preservados para compatibilidade.

## Fontes e comandos

- Editar regras Clássicas em `public/rules.js`, `public/referee.js`, `public/ai-worker.js`; Arena em `public/tri-core.js`, `public/tri-ui.js`, `public/tri-map.js`.
- Recuperação: `public/local-checkpoint.js`; descrições/identificação: `public/character-info.js`; foco/acessibilidade: `public/ui-accessibility.js`.
- Executar `npm run sync`, `npm test`, `npm run validate`; não editar cópias geradas nem inserir require('./rules.js') no Worker.
- Simulações: `GAMES=20 SEED_OFFSET=20000 CHECKPOINT=1 npm run simulate:classic` e `GAMES=60 SEED_OFFSET=20000 CHECKPOINT=1 npm run simulate:arena`.
- Base seguinte: v1.15.73. Publicação somente quando o usuário pedir; preservar configuração e identidade das salas.
