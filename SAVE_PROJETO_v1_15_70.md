# SAVE_PROJETO_v1.15.70 — BATALHA NAS SOMBRAS

## Base e autorização
- Base aprovada utilizada: jogo_v1_15_69_TESTE_GIT.zip. Nenhuma versão anterior foi reconstruída.
- Entrega: v1.15.70 TESTE GIT — auditoria, etapa 1 (mecânicas).
- O usuário autorizou executar as correções da auditoria e escolher ordem/tamanho dos lotes.
- Plano combinado: (1) mecânicas; (2) IA e Online; (3) acabamento, acessibilidade e manutenção.
- Somente o usuário publica no Git/Cloudflare. Nenhum deploy, commit remoto ou alteração de sala real foi realizado.
- Próxima base: esta v1.15.70 após teste/aprovação do usuário; não voltar para v1.15.69 ou versões anteriores.

## Correções desta etapa

### Possessão
- A troca de corpo é validada por completo antes de modificar peças, posições ou vínculos.
- Se um Escudeiro empilhado for possuído, seu protegido só é deslocado para uma casa adjacente livre. Sem destino válido, a tentativa termina sem criar adversários na mesma casa e sem romper os vínculos originais.
- A tentativa de possessão falhada usa mensagem genérica, sem explicar ocupantes escondidos.
- Fantasma leva seu Escudeiro vinculado junto durante possessão bem-sucedida, inclusive em Confronto Direto.
- No Confronto, o atacante protegido deslocado pela possessão não é devolvido incorretamente para a casa agora ocupada pelo adversário.
- Quando o Fantasma morre, o hospedeiro volta na casa atual se legal; caso contrário, usa a casa legal mais próxima (distância Manhattan no Clássico, distância do grafo na Arena).
- Recuperação respeita adversários, Postos, obstáculos e limite de compartilhamento: máximo de duas peças aliadas, com Escudeiro presente.
- No caso extremo de inexistir qualquer casa legal, o hospedeiro aguarda recuperação sem contar como perda original. A recuperação é tentada após as ativações seguintes.
- Corpo de invocação transmite seu summonType, preservando atributos do Esqueleto/Mini-Slime/Galho-Vivo; também transmite recarga do Piromante, antes ausente.
- Snapshot completo do Fantasma original é preservado, com compatibilidade para snapshots antigos.
- Possessão de um corpo que já esteja possuído é impedida para não criar cadeias de hospedeiros órfãos; funcionamento de possessão encadeada não foi acrescentado como nova regra.
- Na Arena, hospedeiro de equipe já eliminada não retorna ao mapa via possessão. Se a equipe do Fantasma for eliminada, seus corpos possuídos são libertados antes da remoção das peças.
- Bônus do Bardo e Galhos criados pelo corpo possuído são limpos pela identificação da fonte ao terminar a possessão.

### Escudeiro e Confronto
- Arena: Escudeiro acompanha o aliado que entra numa Presença Fantasma, antes de encerrar o confronto falso.
- Cópia do Escudeiro é reconhecida nos fluxos de interceptação de ataque e posicionamento após Confronto Direto, incluindo Clássico Online.
- A disponibilidade de Avançar considera o bloqueio real da casa para onde o protegido precisaria ir; a interface não oferece uma escolha que o núcleo depois ignoraria.
- Vínculos inválidos/separados são limpos ao finalizar ativações, impedindo vínculo fantasma persistente.
- Doppelgänger não pode perder a habilidade do Escudeiro enquanto divide casa com aliado, pois criaria dupla ilegal. A escolha informa o motivo; pode manter, desvincular/separar e voltar ao cadáver. A IA mantém a cópia nesse caso.

### Doppelgänger — habilidades ativas existentes
- Arqueiro: Tiro Certeiro dobra o ALC próprio do Doppelgänger (1 → 2, sem copiar atributos do Arqueiro); efeito acaba e recarga diminui no tempo correto.
- Kamikaze: morte/ativação da habilidade copiada agora provoca explosão também no Clássico e Worker.
- Bardo: inspiração copiada expira após o próximo turno próprio da fonte; bônus de Vida temporário é removido corretamente.
- Druida: Galho-Vivo copiado volta a Árvore quando a fonte morre, mesmo que a fonte não tenha nome literal Druida.
- A definição de quais passivas podem ser copiadas NÃO foi modificada nesta etapa.

### Ataques e impacto público
- Arena recusa ataque comum e Rajada Dupla contra Postos, sem gastar ação na tentativa inválida, como já faz o Clássico.
- Interfaces excluem Postos das prévias de ataque/Rajada; IA da Arena também exclui esses alvos.
- Clássico mantém lista impactCells, com impactCell legado apontando para a última casa para compatibilidade de estados/interfaces.
- Rajada Dupla preserva seus dois impactos no mapa dos adversários.
- Todos os fluxos marcam a casa atacada, inclusive Espelho, Zumbi caído, fogo amigo e tentativa/resultado de possessão.
- Interfaces local, Online e Treino renderizam a lista de impactos; os efeitos visuais usam as novas casas da lista.
- Fantasma em corpo já possuído de ATQ0 não oferece ataque inválido na interface, nos cálculos de alcance nem na IA. Isso elimina o loop específico de Fantasma possuindo Fantasma; a revisão estratégica geral da IA fica na etapa 2.

## Sincronização e ferramentas permanentes
- public/referee.js e public/rules.js são fontes para o núcleo Clássico incorporado em src/worker.js.
- public/tri-core.js é fonte da cópia src/tri-core.js e do bundle public/tri-core-global.js.
- public/tri-ui.js é fonte do bundle public/tri-ui-global.js.
- public/ai-worker.js é fonte do Worker empacotado em public/ai.js.
- npm run sync: gera essas cópias mecanicamente, removendo require/exports CommonJS do Worker Cloudflare.
- npm test: tests/mechanics-regression.mjs.
- npm run validate: sintaxe, referências HTML, IDs duplicados e paridade de Worker/Arena/IA.
- npm run simulate:arena: 120 jogos determinísticos por padrão; GAMES=60 usa 240 jogos (quatro dificuldades).
- npm run simulate:classic: 80 jogos determinísticos contra jogador parado, para testar perseguição da IA.
- Os simuladores verificam estado legal a cada ação e retornam erro se houver ação inválida/violação. Limite de 5.000 ações é detector de estagnação, não regra de empate acrescentada ao jogo.
- package/cache/assets/HTMLs atualizados para 1.15.70.
- Mapas, coordenadas, biomas, PNGs e balanceamento não foram alterados.

## Validação executada
- 181/181 regressões passaram: Treino, Clássico solo, Worker Clássico, Arena ESM e bundle Arena do navegador avaliado em VM.
- Casos cobertos: alcance/recarga de Tiro Certeiro literal/copiado, explosão copiada, duração do Bardo e Vida temporária, ciclo do Galho, Escudeiro copiado, Presença Fantasma, possessão protegida/bloqueada, recuperação ocupada/dupla/vaga pendente, atributos de invocação, ATQ0 possuído, Postos, impactos de Rajada/Espelho/Zumbi/fogo amigo/possessão, Vidente, movimento parcial, avanço/permanência do Escudeiro, Armadura, Fumaça, export/import e eliminação com possessão.
- Arena: 240 simulações; 118.937 ações; 0 ações inválidas; 0 coordenadas inválidas, IDs duplicados, vínculos separados ou empilhamentos ilegais. 234 concluíram e 6 atingiram o limite de 5.000 ações.
- Clássico: 80 simulações; 81.070 ações; 0 ações inválidas; 0 estados ilegais. 67 concluíram e 13 atingiram o limite.
- Estagnação das simulações é pendência conhecida e não foi mascarada como partida concluída.
- 27 arquivos JS/MJS passam node --check (22 existentes + 5 novos de testes/ferramentas).
- 71 referências locais HTML existem; 0 IDs HTML estáticos duplicados.
- Worker Clássico equivale textualmente às fontes locais, sem require('./rules.js').
- Arena public/src são byte a byte idênticos; mapas public/src idênticos; fonte da IA empacotada equivalente.
- Teste visual em navegador real NÃO realizado: navegação local bloqueada e Chromium indisponível no ambiente. Avaliação em VM do bundle não é teste visual.

## Pendências preservadas da auditoria (numeração da lista apresentada no chat)

### Etapa 2 — IA/Online
- #2 IA Clássico: antiestagnação, busca de últimos inimigos, prioridade de movimento sobre preparação repetitiva.
- #3 Partidas infinitas/empates repetidos: melhorar decisões da IA; regra geral de empate/morte súbita exige definição.
- #14 Replay Online: gravar resultados aleatórios/semente do Eco da Paranoia.
- #15 Reconexão: identidade/token de assento; evitar inversão e tomada de lugar desconectado.
- #26 Reconhecer habilidades copiadas na estratégia da IA.
- #27 Limites de invocação por fonte na IA, não globais do time.
- #28 Decisão estratégica de desvincular Escudeiro.
- #40 Salas encerradas/reinício, limite de mensagens e endurecimento WebSocket.

### Etapa 3 — acabamento/manutenção
- #11 Texto/passivas do Doppelgänger: definir se copia apenas ativas ou implementar passivas; não prometer poder inexistente na ficha.
- #17 Decidir se rendição da Arena encerra todo o jogo ou elimina só quem se rende (regra mantida).
- #18 Texto do Slime deve esclarecer 0/1/2 fragmentos quando faltam casas.
- #19 Texto do Zumbi deve esclarecer atraso quando falta espaço para ressuscitar.
- #20 Vidente: ficha explicitar que ambas as casas permanecem dentro do AH.
- #21 Escudeiro: texto incluir Espelho e Confronto Direto.
- #22 Plural real Mini-Slime, remover Mini-Slime(s).
- #23 e #32 Unificar/categorizar apresentação de eventos/histórico.
- #24 Documentação completa e comentários antigos (LEIA-ME agora registra esta etapa, mas histórico antigo foi preservado).
- #25 Nome histórico do Worker v1-14-experimental: documentar; nunca renomear automaticamente/deploy sem decisão do usuário.
- #29 Arena SVG: teclado, nomes acessíveis e leitor de tela.
- #30 Casas vazias Clássico: coordenadas/terreno/ação acessíveis.
- #31 Foco, Escape e restauração de foco dos modais.
- #33 Centralizar descrições/metadados de personagens das quatro interfaces.
- #36 Campos abandonados do Espelho: documentar ou remover após validar regra.
- #37 Assinaturas de replay: incluir campos omitidos relevantes.
- #39 Assets grandes/duplicados/não usados: otimizar com compatibilidade.
- #38 Suíte permanente foi iniciada; expandir para mais interações, IA e Online nas próximas etapas.
- #34/#35 Sincronização automática implementada nesta etapa; manter testes de paridade obrigatórios.
- QA manual/visual/responsivo final em navegador real, especialmente celular, camadas de marcadores, contraste, animações e áudio.

## Guia para próxima conversa
Continuar desta entrega. Usuário confiou a ordem dos lotes ao assistente e não quer confirmações repetitivas quando não há dúvidas. Preservar regras existentes ao corrigir bugs; discutir escolhas reais de regra (passivas do Doppelgänger, desempate e rendição da Arena) antes de alterá-las. Nunca publicar no lugar do usuário. Não declarar que toda a auditoria foi concluída em implementação: apenas a etapa 1 está entregue; etapas 2 e 3 permanecem.

