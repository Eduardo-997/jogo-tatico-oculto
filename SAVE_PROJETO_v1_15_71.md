# SAVE_PROJETO v1.15.71 — Batalha nas Sombras

## Base e continuidade

- Pacote: `jogo_v1_15_71_TESTE_GIT.zip`, cumulativo sobre a v1.15.70.
- O usuário autorizou consolidar as correções antes de fazer seu próximo teste.
- Este pacote incorpora as correções anteriores de mecânicas; não reconstruir a partir dos ZIPs antigos.
- O SAVE v1.15.70 incluído no projeto é histórico. Este é o registro atual.
- Somente o usuário publica no Git/Cloudflare. Não houve deploy nem alteração de salas reais.

## IA

### Clássico

- Busca caminhos levando em conta ocupação, obstáculos, compartilhamento legal, Pântano e Voador.
- Explora casas alcançáveis do mapa completo, com memória de visitas e penalização de retorno imediato; não fica limitada aos antigos pontos fixos de busca.
- Sob pressão de busca, avança antes de repetir indefinidamente habilidades utilitárias no mesmo lugar.
- Escudeiro pode desvincular-se quando seu protegido não consegue mover e a busca exige deslocamento.
- Usa o alcance próprio do Doppelgänger ao copiar Arqueiro e reconhece as ativas compatíveis copiadas.
- Piromante procura alvos em todo seu Alc. Hab. e escolhe as duas casas antes de confirmar, inclusive quando a segunda tem menor prioridade.
- Limites de Esqueleto, Galho-Vivo, armadilhas e Espelho são consultados por fonte, não como se todas as fontes da equipe fossem uma só.
- Cópia de Sentinela não é confundida com a armadilha do Armadilheiro.
- Removida dependência estratégica de recarga/bloqueio obsoletos do Espelho.

### Arena

- Busca pelo grafo real da Arena, sem converter a geometria em grid quadrado.
- Explora casas alcançáveis com memória de visitas, em vez de insistir em objetivos parados na própria região.
- Aprende tipos de contatos somente por informação visível ou pelo resultado do próprio Confronto.
- Evita repetir Confrontos conhecidos como empate/derrota quando pode atacar normalmente.
- Após deslocar-se, pode parar o movimento e atacar o contato dentro do alcance.
- Mantém a pressão contra repetição de habilidades utilitárias e pode liberar Escudeiro preso a protegido sem Movimento.
- Prefere posições menos suspeitas para Espelho, reduzindo tentativas rejeitadas sobre inimigos ocultos.
- Não recebe posições ou identidades escondidas para tomar decisões.

## Mecânicas, informação oculta e replay

- Identificação da fonte de Esqueleto/Galho-Vivo é entregue à própria equipe; não revela essas ligações ao adversário. Isso também permite à IA respeitar os limites corretos.
- Ataques distantes contra Zumbi e eliminação de corpo possuído usam mensagem genérica quando a identidade não deve ser revelada.
- O sorteio do Eco do Paranoia utiliza estado pseudoaleatório persistido no núcleo. Exportar/importar o mesmo estado e repetir as mesmas ações reproduz o sorteio.
- Replays antigos sem essa informação não permitem recuperar exatamente sorteios históricos que nunca foram registrados.
- Recorder local conserva os campos completos das peças e detecta alterações isoladas de radar, PER, recargas, efeitos, ativação, revelações, impactos e Vida de Pedra.
- Validação da preparação rejeita entradas malformadas, nomes inexistentes, coordenadas inválidas e duplicidade por alias Coringa/Trapaceiro antes de modificar a partida.
- Treino mantém suas liberdades de posicionamento, mas valida o formato e as coordenadas antes de aplicar a preparação.

## Online — Clássico e Arena

- Reconexão por token individual de assento, separado por host, sala e modalidade.
- O mesmo token retoma o lado anterior e substitui a conexão antiga. Fechar a conexão substituída não apaga a preparação da nova.
- Token não aparece no URL, na visão do adversário nem no replay.
- Salas iniciadas não entregam assentos desconectados a quem chega sem o token correto.
- Migração compatível de salas antigas sem tokens, com uma primeira reivindicação por assento. Identidades históricas nunca registradas não podem ser comprovadas retroativamente.
- Interfaces ignoram callbacks de conexões antigas e tentam reconectar até cinco vezes, com espera progressiva; recusas permanentes não geram tentativas infinitas.
- Preparação confirmada é restaurada ao retornar. Arena permite cancelar Pronto antes do início e impede edição silenciosa da formação enquanto pronta.
- Mensagens são validadas e saneadas: máximo 16 KiB, 40 mensagens/segundo por conexão, 64 mensagens pendentes e 16 conexões por sala.
- A fila serializa mutações, inclusive quando armazenamento ou IA aguardam operações assíncronas.
- Confirmação da ação ocorre após persistência. Se a gravação falha, estado, replay e memória da IA são restaurados, e a ação não é anunciada como concluída.
- Replay armazenado em blocos de 32 ações; migração e gravação respeitam lotes limitados de armazenamento, sem regravar o histórico inteiro a cada ação.
- Memória estratégica da IA da Arena também é persistida.
- Sala encerrada permanece encerrada. Para outra partida Online, utilizar um novo código; botão e guia deixam isso explícito.
- Estas medidas não constituem autenticação de conta nem garantem proteção contra todos os abusos externos.

## Interface, textos e acabamento

- Uma fonte compartilhada (`public/character-info.js`) fornece as descrições nas quatro interfaces, incluindo formas e invocações.
- Ficha de Doppelgänger explica a ativa copiada sem prometer atributos, transformação ou passivas que o núcleo não concede.
- Slime: “até 2” Mini-Slimes, conforme casas livres; Zumbi: recuperação pode aguardar; Vidente: ambas as casas dentro do próprio alcance; Escudeiro: proteção também em Espelho/Confronto.
- Histórico de combate utiliza filtro compartilhado, conservando falha, acerto, reflexão, transformação e dano em terreno sem misturar todas as prévias triviais.
- Concordância do histórico da Arena corrigida para quantidade real de Mini-Slimes.
- Na Arena, clicar na imagem durante ataque/habilidade seleciona a casa do alvo, inclusive aliado já ativado. Movimento sobre a imagem também segue a rota de movimento legal.
- Durante habilidade dirigida a aliado não ativado, o clique não troca indevidamente a peça ativa. Bardo e Escudeiro continuam no fluxo de escolha do alvo.
- Navegação por teclado e rótulos adicionados a casas/peças da Arena e casas do Clássico, usando apenas informação já apresentada ao jogador.
- Referência acessível da Arena usa A–H / 1–15, mantendo o exemplo A02 = E6.
- Abas de regras têm navegação por teclado e estados acessíveis. Diálogos controlam foco; Escape fecha regras/replay, não decisões obrigatórias de combate.
- Áudio não derruba o jogo se volume salvo estiver corrompido ou AudioContext for bloqueado; nós de áudio são desconectados após uso.
- Guia de execução/publicação atualizado. Guia antigo preservado em `docs/HISTORICO_DEPLOY_ATE_v1_15_70.txt`.

## Decisões deliberadamente preservadas

- Balanceamento, atributos, geometria, coordenadas internas e biomas não foram alterados nesta etapa.
- Sem nova regra de empate por inatividade ou morte súbita. A IA foi melhorada; o limite do simulador não é uma regra do jogo.
- Rendição na Arena encerra a partida inteira, como na regra vigente.
- Doppelgänger continua copiando as ativas compatíveis existentes, não todas as passivas gerais.
- Assets de compatibilidade Coringa/Trapaceiro, General futuro e resolução original de Presença Fantasma preservados. Otimizar assets é opcional, não correção obrigatória.
- Nome histórico do Worker, bindings e migrations não devem ser renomeados só para acompanhar a versão do ZIP.

## Verificação desta entrega

- `npm test`: 265 testes, 265 aprovados, nenhum falhou ou foi ignorado.
- Inclui regressões de mecânicas em núcleos locais/Online, IA, handlers de interface, replay e protocolo/persistência com mocks de Durable Objects.
- `npm run validate`: 32 JavaScripts/MJS passaram na sintaxe; 77 referências HTML locais verificadas, nenhuma faltando; nenhum ID HTML duplicado.
- Worker embutido, núcleos/cópias/bundles da Arena e IA empacotada sincronizados por `npm run sync` e conferidos por paridade.
- Clássico: 80 simulações de IA contra oponente parado, nas quatro dificuldades; 80 concluídas, 18.982 ações, nenhuma ação inválida, nenhum travamento no limite e nenhuma violação de invariantes.
- Arena: 240 partidas completas de IA, nas quatro dificuldades; 240 concluídas, 110.816 ações, nenhuma ação inválida, nenhum travamento no limite e nenhuma violação de invariantes.
- Total dessas simulações: 320 partidas concluídas e 129.798 ações. Clássico utiliza oponente parado para testar perseguição; Arena utiliza três IAs.
- Relatórios JSON das simulações incluídos em `docs/VALIDACAO_CLASSICO_v1_15_71.json` e `docs/VALIDACAO_ARENA_v1_15_71.json`.
- Todos os 67 assets e o arquivo de geometria da Arena foram comparados com a base e permaneceram byte a byte iguais.
- As simulações verificam coordenadas legais, IDs, compartilhamento, vínculos e ausência de adversários na mesma casa, além das ações aceitas.
- Estes resultados são evidência sobre os cenários executados, não prova de inexistência de todos os bugs possíveis.

## Limitações e teste final do usuário

- Não foi possível validar esta entrega em navegador real neste ambiente. Testes de handlers/VM não substituem conferir layout, toque, contraste, áudio e foco real.
- Não houve teste em Cloudflare real; persistência, reconexão, limites e falhas foram testados com mocks. Confirmar duas sessões reais após publicar o pacote de teste.
- Teste sugerido: movimento parcial e Parar movimento; Escudeiro com Confronto/Espelho; Vidente nos limites; Piromante com duas casas; possessão e invocações; partida de IA até o fim; Online com reconexão/cancelar Pronto; replay e celular.
- Se surgir falha, manter esta base e enviar modo, peças, sequência e replay/save quando disponível. Não regressar a versões antigas.

## Fontes e comandos

- Clássico: `public/rules.js`, `public/referee.js`, `public/ai-worker.js`.
- Arena: `public/tri-core.js`, `public/tri-map.js`, `public/tri-ui.js`.
- Online: `src/worker.js`, `src/room-protocol.js`, `public/online-session.js`.
- Descrições: `public/character-info.js`; replay: `public/replay.js`.
- Sincronizar: `npm run sync`; testes: `npm test`; integridade: `npm run validate`.
- IA Clássico: `npm run simulate:classic`; Arena: `GAMES=60 npm run simulate:arena` (240 partidas).
- Local: `npm install` e `npm run dev`; deploy somente pelo usuário após aprovação.
- Não editar cópias geradas nem inserir `require('./rules.js')` no Worker.
- Não adicionar `type:module` sem migrar o CommonJS: a mistura atual de módulos é intencional.
