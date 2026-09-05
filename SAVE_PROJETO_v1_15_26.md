# SAVE_PROJETO — Batalha nas Sombras v1.15.26

Base: **v1.15.25 HOTFIX GIT + CLOUDFLARE**.
Tipo desta versão: **HOTFIX MOBILE GIT + CLOUDFLARE**.

## Objetivo

Corrigir o problema visual visto no celular em que o painel de ações ficava sobre o tabuleiro e escondia as linhas inferiores, principalmente as linhas 7 e 8 do Clássico 8x8.

## Causa

Em `public/ui-v1157.css`, para telas com até 980px, `.controls` usava:

- `position: sticky`;
- `bottom: 6px`;
- `z-index: 35`.

Ao rolar a página, o bloco `Mover / Parar / Atacar / Habilidade / Encerrar / Cancelar` ficava preso no rodapé do viewport e passava por cima do tabuleiro.

## Correção

Em telas de até 980px, `.controls` agora usa o fluxo normal da página:

- `position: static`;
- `bottom: auto`;
- `z-index: auto`;
- `backdrop-filter: none`.

Assim, o tabuleiro aparece inteiro e os controles ficam abaixo dele, sem cobrir nenhuma casa.

## Modos revisados

- Clássico local;
- Clássico Online;
- Treino;
- Arena.

A regra foi deixada comum para os modos que usam `ui-v1157.css`, evitando que o mesmo defeito reapareça em outra tela.

## Versão / cache

- `package.json`: **1.15.26**.
- Todos os **35** cache-busts ativos foram atualizados para `?v=1.15.26`.
- `LEIA-ME_DEPLOY.txt` atualizado para v1.15.26.
- `wrangler.jsonc` e o nome técnico do Worker não foram alterados.

## Não alterado

- Regras do jogo;
- IA;
- Vincular do Escudeiro;
- Replay;
- atributos e balanceamento;
- mapas;
- informação oculta;
- Online/Worker.

## Estado

**v1.15.26 HOTFIX MOBILE preparada para Git + Cloudflare.**
