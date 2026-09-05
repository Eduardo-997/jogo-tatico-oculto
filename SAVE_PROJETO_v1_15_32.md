# SAVE_PROJETO_v1_15_32

Base: **v1.15.31 TESTE GIT**.

## Alterações
- Druida: ATQ alterado para 1 em Clássico, Online, Treino e Arena.
- Vidente: ao iniciar a habilidade, todas as primeiras casas válidas dentro do Alc. Hab. ficam visivelmente marcadas; após a primeira seleção, apenas as casas adjacentes válidas para a segunda seleção são destacadas.
- Ninja: habilidade ativa **Bomba de Fumaça**. Ao usar, fica completamente indetectável até o fim do próximo turno próprio. PER, Vidente, armadilha da Sentinela, Cerco Final e demais efeitos de revelação não conseguem localizá-lo. Recarga: 2 turnos próprios. A fumaça não concede invulnerabilidade a dano.
- Kamikaze: mantém a explosão passiva ao morrer e ganhou **Autodestruição** ativa. Antes de confirmar, a área atingida é destacada. Alc. Hab. funciona em anéis: 1 = primeiro anel; 2 = dois primeiros anéis; etc.
- Árvores e Pedras exibem Vida restante no mapa.
- Regras rápidas foram atualizadas com mecânicas recentes, imagens e a nomenclatura **Biomas**.
- Clássico mantém apenas os Lagos D3 e E6.
- Arena: Biomas redistribuídos nas quatro profundidades do mapa e coordenadas visíveis no formato setor + A–H / 1–4.

## Biomas atuais da Arena
- Árvores: A-B1 / B-B1 / C-B1 (IDs internos A02/B02/C02)
- Pedras: A-G2 / B-G2 / C-G2 (A23/B23/C23)
- Lagos: A-C3 / B-C3 / C-C3 (A11/B11/C11)
- Pântanos: A-G4 / B-G4 / C-G4 (A31/B31/C31)

## Observação
As coordenadas visíveis da Arena foram criadas para facilitar pedidos futuros de reposicionamento. O prefixo A/B/C identifica o setor da Arena e a parte seguinte funciona como coordenada do Clássico.

## Validação final
- Sintaxe de todos os JavaScript em `public/` e `src/`: OK.
- Teste funcional Clássico/Treino: Druida ATQ1, Vida da Árvore, Bomba de Fumaça + Vidente + recarga, Autodestruição e Lagos D3/E6: OK.
- Teste funcional Arena: distribuição dos Biomas nas quatro linhas, coordenadas visíveis, Bomba de Fumaça e Autodestruição: OK.
- Corrigida durante a validação a prévia da Autodestruição no Clássico/Online para que as casas atingidas fiquem salvas no estado e realmente apareçam destacadas antes da confirmação.
