# SAVE PROJETO — v1.14 EXPERIMENTAL

## Foco da versão
Arena 1x1x1 online para 2 humanos + 1 IA, com o novo elenco e o sistema AH.

## Arena
- 96 casas, 32 por território.
- Zona de preparação: 2 camadas externas, 24 casas por jogador.
- Lado compartilhado = adjacência normal; apenas vértice = diagonal.
- Ordem A → B → C.
- Com 3 perdas originais/linhagens, o jogador é eliminado; último exército vence.
- Árvores simétricas: A06, B06, C22.

## AH — Alcance de Habilidade
Distância calculada pelo grafo de adjacência normal. Portanto, uma diagonal que exige 2 passos normais entra em AH2.
- AH0: Arqueiro, Ninja, Escudeiro, Golem, Cavaleiro, Slime, Zumbi, Paranoia, Coringa, Fantasma, Galho-Vivo.
- AH1: Piromante, Kamikaze, Necromante, Doppelgänger, Druida, Sentinela, Caçador.
- AH2: Mago do Espelho, Bardo.
- AH3: Vidente.
- Posto: Canalização = +1 AH permanente em unidade que use AH.

## Novos personagens
### Zumbi 🧟 — Pedra
V2 M1 ATQ1 ALC1 PER1 AH0.
Primeira morte não conta. Tenta retornar na rodada seguinte com V1; após reviver possui 3 turnos próprios. Se morrer de novo ou terminar o terceiro turno, morre definitivamente e só então conta eliminação.

### Paranoia 🧠 — Tesoura
V1 M1 ATQ1 ALC1 PER1 AH0.
Ao detectar com PER, afeta até 2 inimigos simultaneamente por 2 turnos deles. O status só se revela após o alvo se mover. Enquanto ativo, a percepção sempre acusa presença, verdadeira ou falsa.

### Druida 🌿 — Pedra
V1 M1 ATQ0 ALC1 PER1 AH1.
Pode entrar em árvore viva e fica oculto à PER enquanto estiver nela. Pode despertar uma árvore viva dentro do AH como Galho-Vivo. Druida e Galho-Vivo compartilham o turno. Se Druida morrer, o Galho-Vivo volta a ser árvore normal.

### Galho-Vivo 🌲
V2 M1 ATQ1 ALC1 PER1 AH0.
Invocação controlada pelo Druida. Se morrer, vira árvore morta e não pode ser despertada novamente.

### Sentinela 🦉 — Papel
V1 M2 ATQ0 ALC1 PER1 AH1.
Mantém até 2 armadilhas ocultas de revelação. Inimigo que passa pela casa consome a armadilha e fica revelado exatamente até o início do próximo turno daquela peça.

### Caçador 🪤 — Tesoura
V1 M1 ATQ1 ALC1 PER1 AH1.
Mantém 1 armadilha oculta de dano. Só inimigos ativam. Causa 1 de dano e desaparece. Se a entrada na casa iniciar Confronto Direto, o dano da armadilha resolve antes do confronto.

### Bardo 🎵 — Papel
V1 M1 ATQ0 ALC1 PER1 AH2.
Escolhe 1 aliado dentro do AH e concede +1 ATQ, +1 ALC, +1 M ou +1 Vida. Um alvo por Bardo; o efeito dura até o fim do próximo turno do próprio Bardo. Não concede PER.

### Fantasma 👻 — Joker
V1 M1 ATQ0 ALC1 PER1 AH0.
Ataque normal ou vitória em Confronto Direto possui o inimigo em vez de causar dano. O Fantasma passa a usar a peça possuída como se fosse ela; não pode trocar de hospedeiro. O antigo dono perde a localização. Ao Fantasma sofrer dano no corpo possuído, ele morre e a peça original volta ao dono.

## Ajustes de personagens antigos
- Vidente: AH3; casa principal dentro do AH + 3 vizinhas por lado ou ponta.
- Mago do Espelho: AH2, sem cooldown; diagonal alcançável corretamente por 2 passos normais.
- Piromante: AH1 para selecionar 1 ou 2 casas.
- Kamikaze: AH1 mantém explosão ao redor; AH maior expande a explosão por camadas.
- Necromante: AH1.
- Doppelgänger: ATQ1 e AH1; habilidades copiadas usam o AH do Doppel.
- Golem: descrição explicita que ao virar Lava perde Movimento e ganha Ataque.
- Escudeiro: descrição explicita que esconde a presença do aliado compartilhando a casa.

## Segurança da informação
O Árbitro do servidor mantém estado completo. A e B recebem apenas suas próprias unidades e informação legalmente revelada. Armadilhas inimigas, coordenadas escondidas e demais estado secreto não são enviados ao navegador adversário.

## Testes v1.14
- test_tri_core.mjs: passou.
- test_v114_features.mjs: passou.
- test_tri_room.mjs: passou (A+B humanos, C IA, views filtradas, turno A→B).
- test_tri_global.mjs: passou.
- node --check nos módulos principais e Worker: passou.

Status: v1.14 experimental pronta para playtest da Arena. Balanceamento continua provisório.
