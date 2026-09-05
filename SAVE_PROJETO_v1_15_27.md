# SAVE_PROJETO_v1.15.27 — STAGING / TERRENO + MOBILE

Base: v1.15.26 HOTFIX MOBILE.

## Alterações

1. **Correção definitiva do layout mobile**
   - Corrigida a causa restante da sobreposição dos controles: o `board-popup` usava `position: sticky` com margem negativa no mobile e puxava a barra de ações por cima do tabuleiro.
   - No Clássico, Clássico Online e Treino, o tabuleiro 8x8 permanece inteiro e os 6 controles ficam em fluxo normal, abaixo dele.
   - Cache dos assets atualizado para `v=1.15.27`.

2. **Novo terreno: Rocha**
   - Clássico/Online/Treino: rochas fixas em **F3** e **C6**.
   - Arena: rochas simétricas em **C06, B22 e A22**.
   - Regra provisória aprovada: rocha funciona como terreno bloqueante, equivalente à árvore para movimento e posicionamento.
   - Druida NÃO atravessa rocha.
   - Postos, Espelhos, armadilhas, revives e invocações não podem ocupar rocha.

3. **Novo terreno: Água**
   - Clássico/Online/Treino: água fixa em **D4** e **E5**.
   - Arena: água simétrica em **C02, B18 e A18**.
   - Regra provisória aprovada: água é passável e não altera movimento/combate por enquanto.
   - Regras especiais para rocha/água ficam para uma versão futura.

4. **Replay / IA / Online**
   - Rocha e água aparecem no Replay.
   - IA reconhece rochas como terreno bloqueado.
   - Worker do Clássico Online recebeu as mesmas regras do núcleo local.
   - Arena local/online recebeu os mesmos terrenos no núcleo autoritativo.

## Publicação

Esta versão deve ser publicada primeiro no repositório de teste **Eduardo-997/jogo-tatico-oculto**.
O repositório principal **Eduardo-997/Batalha-nas-sombras-v1** permanece como versão estável até aprovação manual do teste.
