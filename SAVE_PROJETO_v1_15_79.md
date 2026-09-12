# SAVE_PROJETO — v1.15.79 TESTE GIT

Base: v1.15.78. Destino autorizado: Eduardo-997/jogo-tatico-oculto. Não publicar esta versão no repositório principal sem novo pedido.

Generais (tabuleiro Clássico): quantidade independente de 1 a 8 peças por lado e limite de perdas configurável; um general pode reservar ambos os lados de sala Online nova e vazia. Dois amigos continuam com preparação secreta. Propriedade dos lados validada no servidor, inclusive preparação, dificuldade e rendição. Reconexão recupera lados e preparações confirmadas.

Observação: registro clicável de ações, últimas casas atacadas/deslocamentos/criações destacados, acompanhamento opcional, placar e limpeza de sinais. Encerramento manual sem vencedor libera replay; Online exige concordância de ambos os lados. Limite opcional de rodadas (0 sem limite; 1–500 para testes) encerra apenas a observação. Replay aceita esse encerramento. Recuperação local pausada conserva configuração e registro; armazenamento cheio reduz apenas replay.

569/569 testes automatizados passaram. 200 simulações sem limite de rodadas: 193 terminaram normalmente, 7 alcançaram o teto técnico de 5.000 ações; 80.328 ações, nenhuma inválida ou violação dos invariantes verificados. Novas execuções das configurações 1×1 e 2×5 com limite de 200 rodadas: 80/80 observações encerraram, 23.676 ações, nenhuma inválida ou violação. Encerramentos pelo limite não contam como vitórias naturais. IA, atributos e balanceamento não alterados. Sem teste visual em navegador real; testes Online usam mocks de WebSocket/Durable Objects.

Manter núcleos e bundles sincronizados via npm run sync; executar npm test e npm run validate. Não adicionar type:module; não renomear Worker/bindings/migrations. Preserve arquivos históricos remotos ao publicar.
