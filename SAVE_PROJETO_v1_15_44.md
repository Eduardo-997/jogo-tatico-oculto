# SAVE_PROJETO_v1_15_44

Base: **v1.15.43 TESTE GIT**.

## Mudanças principais

- **Percepção após movimento — caminho conhecido como vazio**
  - cada ativação passa a registrar as casas deixadas pela unidade durante o movimento (`movePath`);
  - ao detectar presença depois de andar, as casas já atravessadas naquela ativação deixam de aparecer como possibilidades de presença;
  - a regra vale para movimento de vários passos: não apenas a última casa, mas todo o caminho comprovadamente vazio é eliminado das possibilidades;
  - a IA também limpa a suspeita/memória dessas casas, evitando ataques desperdiçados nelas;
  - aplicado ao núcleo do Clássico/Treino/Clássico Online e ao núcleo da Arena/Arena Online.

- **IA — prioridade da percepção recém-detectada**
  - a IA passa a dar prioridade forte às casas indicadas pela percepção da ativação atual;
  - isso corrige especialmente o Arqueiro, que podia detectar alguém próximo e ainda preferir um tiro especulativo distante baseado em memória antiga;
  - inimigos atualmente visíveis/confirmados continuam podendo ter prioridade sobre uma percepção genérica.

- **Clássico Online — preparação restaurada**
  - corrigido `multiplayer-ui.js`, que utilizava os assets por `A.*` sem vincular `A` a `window.BNSAssets`;
  - restauradas as referências de `setupInspector`, `setupInspectorTitle` e `setupInspectorBody`, que eram usadas no `render()` sem declaração;
  - a tela volta a renderizar o elenco e permite selecionar personagens, posicionar os 2 Postos e enviar “Pronto”.

- **Arena / Arena Online — fluxo de interface restaurado**
  - restauradas as funções `hideBoardPopup()`, `boardChoice()` e `contextChoice()`, que ainda eram chamadas pela interface mas haviam desaparecido do JavaScript;
  - corrigido o erro que interrompia `renderAll()` e podia quebrar preparação, decisões e Confrontos;
  - alterações sincronizadas em `tri-ui.js` e `tri-ui-global.js`.

## Compatibilidade

- `movePath` é opcional e recebe `[]` quando não existe, preservando compatibilidade com estados/saves anteriores.
- Identificadores internos dos níveis de IA continuam os mesmos; apenas o raciocínio/prioridade foi ajustado.
- Persistência de salas Online já iniciadas foi mantida de propósito para preservar reconexão; esta versão não reinicia salas automaticamente.
- Nenhuma publicação Git/Cloudflare foi realizada.
