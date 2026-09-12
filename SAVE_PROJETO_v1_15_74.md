# Batalha nas Sombras — SAVE v1.15.74

Base integral: v1.15.73. Histórico anterior preservado no pacote.

## Entrega deste bloco

- Rendição movida do cabeçalho para depois de Cancelar, junto às ações, no Clássico local, Clássico Online e Arena (solo/Online usam a mesma página).
- IDs, handlers, confirmação, visibilidade e semântica de rendição preservados. Nenhuma mudança nas condições de vitória ou nos turnos.
- Cache do registro de imagens atualizado da referência antiga v1.15.72 para v1.15.74. Referências HTML e versão de pacote também atualizadas.
- Validador agora verifica 70 referências de imagens geradas pelo registro, incluindo aliases e invocações, além das referências HTML.
- Validador impede regressão da localização da Rendição e da versão de cache de imagens.
- Quatro novos testes de posicionamento/identidade do botão e cache/aliases de imagens.

## Verificação real desta versão

- npm test: 484 testes, 484 passaram, zero falhas, cancelamentos ou ignorados.
- npm run validate: 35 JS/MJS válidos, 79 referências HTML existentes, zero IDs duplicados; 70 referências dinâmicas de assets existentes; paridade do Worker, núcleo da Arena e fonte empacotada da IA preservada.
- Simulações amplas e matrizes combinatórias da v1.15.73 permanecem como histórico, não são apresentadas como novas simulações da v1.15.74.
- Sem teste visual em navegador real nesta entrega. Nenhum deploy realizado.

## Compatibilidade preservada

Não remover automaticamente campos e aliases antigos: são usados na importação de saves e personagens legados. Os PNGs não foram alterados nem excluídos. O marcador de formato compatível do checkpoint permanece em 1.15.73: esta atualização não modifica seu esquema e mantém recuperação de partidas salvas nessa versão.

Wrangler, bindings e migrações de Durable Objects preservados. Nenhum ajuste de balanceamento. Não foi introduzida regra automática de empate nem alterada a semântica da rendição da Arena.

## Próximo bloco: modo Generais

O usuário definiu um novo modo, não apenas espectador: cada amigo escolhe seu lado e prepara secretamente peças/posições; somente após ambos confirmarem Pronto os generais enxergam todo o mapa; as IAs controlam os exércitos. Implementação pendente, requisitos em docs/MODO_GENERAIS.md. A IA deve continuar recebendo informação oculta, mesmo que o espectador tenha visão completa.

Publicação: site de teste permanece na v1.15.72, commit dfb05ca712527d97d18679cb9d4d77c62fb1cf2e. v1.15.73 e v1.15.74 não foram publicadas. Publicar somente com autorização explícita, no repositório Eduardo-997/jogo-tatico-oculto.
