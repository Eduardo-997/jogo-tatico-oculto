# SAVE_PROJETO — v1.15.80

Base: v1.15.79 TESTE GIT. Pedido: corrigir Nova partida, afastar Desistir das ações e fazer rendição da Arena eliminar somente o desistente. Publicação autorizada nos dois repositórios: Eduardo-997/jogo-tatico-oculto e Eduardo-997/Batalha-nas-sombras-v1.

Causa de Nova partida: o modal apenas recarregava a página, que recuperava o checkpoint encerrado. Agora Clássico local usa o reinício real que cancela IA, limpa checkpoint/replay e preserva formação/dificuldade. Arena local usa seu reinício real; Arena Online sai da sala encerrada e solicita novo código. Clássico Online mantém abertura de nova sala sem recuperar a partida anterior.

Desistir está em área separada, com espaço e divisória, fora de Mover/Atacar/Habilidade/Encerrar. Também separado em Generais, sem ficar disponível durante a preparação. Confirmação mantida.

Arena: rendição remove apenas esse exército, suas unidades e objetos e desabilita seus Postos, utilizando a mesma limpeza da eliminação. Não encerra os outros dois lados. Próximas ativações pulam o desistente. Quando resta somente um exército, ele vence normalmente. Escolhas pendentes do desistente são descartadas; confrontos entre os outros lados são preservados. Estado de rendições persiste e é reconstruído pelo replay. Replay completo Online só chega ao final da Arena para não revelar posições durante a partida.

Validação: 581 testes automatizados, incluindo núcleo Arena módulo/bundle, rendições A/B/C, duas rendições, confronto de terceiros preservado, persistência Online e replay final. Sintaxe, referências e paridade verificados por npm run validate. Testes Online usam mocks de Durable Objects/WebSocket; não houve teste visual em navegador real. Simulações históricas da v1.15.79 não são novas simulações da v1.15.80.

Versão/cache: 1.15.80. Bundles sincronizados via npm run sync. Preserve arquivos históricos e configuração Wrangler de cada destino; sem mudanças de balanceamento e sem type:module.
