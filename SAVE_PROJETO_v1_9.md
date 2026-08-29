# SAVE PROJETO — v1.9 Cloudflare / X1 online

Base funcional: v1.8.

## Mudança desta versão
- Modo solo continua em `public/index.html`.
- X1 online em `public/multiplayer.html`.
- Cliente X1 conecta em `/ws?room=CODIGO`.
- O servidor X1 foi migrado de Node.js local para Cloudflare Worker + Durable Object.
- Cada código de sala corresponde a um Durable Object separado.
- O Árbitro completo (`GameReferee`) existe apenas no servidor da sala.
- Cada navegador recebe somente `createClient(side).getView()`.
- Estado da partida é persistido no Durable Object após preparação e ações.
- WebSockets usam a API de hibernação do Durable Object.

## Regra de continuidade
Não reconstruir as regras do jogo. Futuras mudanças devem partir desta versão ou do último save posterior aprovado.

## Estado de publicação
Código está preparado para deploy Cloudflare, mas um URL público só existe depois que o projeto for implantado em uma conta Cloudflare com permissão de escrita/deploy.
