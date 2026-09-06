# SAVE_PROJETO_v1_15_43

Base: **v1.15.42 TESTE GIT**.

## Mudanças principais

- **Golem — Absorver Rocha refeito**
  - consome uma Pedra adjacente;
  - recebe **1 de Armadura** até o fim do próximo turno próprio;
  - Armadura reduz cada evento de dano recebido em 1;
  - dano reduzido a 0 não transforma o Golem em Golem de Lava;
  - removida a antiga escolha permanente de +Vida / +Movimento / +ATQ.

- **Filtro Voador**
  - adicionado aos filtros de personagens do Clássico, Clássico Online, Arena e Treino;
  - filtra pela característica `flying`, independentemente do arquétipo.

- **Arena — Postos nos cantos**
  - os cantos extremos A16/A32, B16/B32 e C16/C32 não aceitam Postos;
  - validação aplicada na interface, no núcleo e na colocação automática das IAs.

- **Arena — coordenadas**
  - A–H e 1–8 agora são calculados a partir dos limites reais do tabuleiro SVG em vez de posições fixas;
  - objetivo: manter alinhamento no PC e no celular após redimensionamento responsivo.

- **Arena — dificuldade das IAs**
  - Arena solo agora possui seleção separada para **IA B** e **IA C**;
  - cada uma pode usar Nível 1, 2, 3 ou 4 independentemente;
  - Arena Online mantém apenas IA C, definida pelo Jogador A.

- **Arena — correção crítica das IAs**
  - corrigido o controlador que podia tentar fazer a IA errada agir enquanto outra IA tinha Confronto Direto ou escolha do Doppelgänger pendente;
  - prioridades agora são: resolver escolhas pendentes -> agir com a IA cujo turno realmente está ativo;
  - controlador também trata falhas recuperáveis de ação sem congelar a partida.

- Regras de unidades extras revisadas para respeitar partidas personalizadas, sem citar fixamente 4 unidades originais.

## Compatibilidade
- Saves antigos continuam recebendo valores padrão de campos novos quando necessário.
- Identificadores internos dos níveis (`easy`, `normal`, `hard`, `extreme`) permanecem para compatibilidade; a interface usa Nível 1–4.
