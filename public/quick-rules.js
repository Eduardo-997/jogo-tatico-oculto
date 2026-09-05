(()=>{
  const btn=document.getElementById('quickRulesBtn');
  if(!btn)return;
  const A=window.BNSAssets||{},R=window.GameRules||{};
  const art=(src,alt)=>src?`<img class="qr-art" src="${src}" alt="${alt}" draggable="false">`:'';
  const char=(name)=>art(A.character?.(name),name);
  const biome=(src,alt)=>art(src,alt);
  const wrap=document.createElement('div');
  wrap.id='quickRulesModal';wrap.className='qr-overlay';
  wrap.innerHTML=`
    <div class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
      <div class="qr-head"><div><h2 id="qrTitle">📖 Regras</h2><div class="qr-sub">Regras atuais de Batalha nas Sombras.</div></div><button id="quickRulesClose" type="button">Fechar</button></div>
      <div class="qr-tabs" role="tablist">
        <button class="qr-tab active" data-tab="partida" type="button">🎲 Partida</button>
        <button class="qr-tab" data-tab="combate" type="button">⚔️ Combate</button>
        <button class="qr-tab" data-tab="info" type="button">👁️ Informação</button>
        <button class="qr-tab" data-tab="biomas" type="button">🌍 Biomas</button>
        <button class="qr-tab" data-tab="personagens" type="button">🧙 Personagens</button>
      </div>
      <div class="qr-content">
        <section class="qr-page active" data-page="partida">
          <div class="qr-card"><b>🏆 Objetivo</b><p>Elimine <strong>3 dos 4 personagens originais</strong> do adversário. Invocações não contam como perda original.</p></div>
          <div class="qr-card"><b>🔄 Rodadas e ativações</b><p>Na rodada 1, a prioridade inicial é sorteada; depois alterna. A vantagem numérica é limitada a no máximo <strong>1 ativação a mais</strong> que o adversário.</p><div class="qr-example">Ex.: 4 × 2 → o lado com 4 escolhe 3 unidades para ativar; o lado com 2 ativa as 2.</div></div>
          <div class="qr-card"><b>🎯 Turno da unidade</b><p>Selecione uma unidade → movimento opcional → ataque <strong>ou</strong> habilidade → encerre. Algumas habilidades, como Bomba de Fumaça, gastam a ativação ao serem usadas.</p></div>
          <div class="qr-card"><b>🌿 Turno compartilhado</b><p>Druida e Galho-Vivo compartilham a mesma ativação. Usar um deles gasta o turno dos dois naquela rodada.</p></div>
          <div class="qr-card qr-visual"><div>${art(A.structures?.baseAlly,'Posto de Operação')}</div><div><b>🏰 Postos de Operação</b><p>Cada lado começa com 2. Sabotar um Posto permite escolher um benefício disponível para uma unidade aliada.</p></div></div>
          <div class="qr-card"><b>👁️ Cerco Final</b><p>Quando todos os Postos ativos forem sabotados, a borda externa do tabuleiro passa a revelar unidades permanentemente. Elementos ocultos continuam seguindo suas próprias regras.</p></div>
        </section>

        <section class="qr-page" data-page="combate">
          <div class="qr-card"><b>👣 M — Movimento</b><p>M indica os pontos de movimento disponíveis. Entrar em Pântano custa 2 pontos; outros passos normais custam 1.</p></div>
          <div class="qr-card"><b>⚔️ ATQ</b><p>ATQ é o dano do ataque normal. Árvores e Pedras também podem ser atacadas e recebem esse dano normalmente.</p></div>
          <div class="qr-card"><b>🎯 ALC</b><p>ALC é o alcance do ataque normal. O Arqueiro possui ALC 3 e pode dobrá-lo temporariamente com Tiro Certeiro.</p></div>
          <div class="qr-card"><b>✨ Alc. Hab.</b><p>É a distância usada para habilidades. A área marcada considera bônus atuais. <strong>Kamikaze é uma exceção visual:</strong> seu Alc. Hab. representa anéis completos ao redor dele.</p></div>
          <div class="qr-card qr-visual"><div>${art(A.effects?.confronto,'Confronto Direto')}</div><div><b>🤺 Confronto Direto</b><p>Entrar na casa de um inimigo inicia Confronto Direto, separado do ataque normal e resolvido pelos arquétipos.</p></div></div>
          <div class="qr-card"><b>🛡️ 📜 🗡️ Arquétipos</b><p>Vanguarda vence Executor; Executor vence Estrategista; Estrategista vence Vanguarda. Coringa vence os três. Condenado perde para os demais. Iguais empatam.</p></div>
        </section>

        <section class="qr-page" data-page="info">
          <div class="qr-card"><b>👁️ PER — Percepção</b><p>PER detecta presença por conexões do mapa. Detectar presença não revela automaticamente a posição exata.</p></div>
          <div class="qr-card qr-visual"><div>${char('Vidente')}</div><div><b>🔮 Vidente</b><p>Ao ativar, todas as casas válidas do Alc. Hab. são destacadas. Depois da primeira escolha, o jogo mostra as casas adjacentes válidas para completar a área de 2 casas.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Ninja')}</div><div><b>🌫️ Bomba de Fumaça</b><p>O Ninja fica <strong>completamente indetectável</strong> até o fim do próximo turno próprio: PER, Vidente, armadilha da Sentinela, Cerco Final e outras revelações não conseguem localizá-lo. Recarga: 2 turnos próprios.</p></div></div>
          <div class="qr-card"><b>🕵️ Informação oculta</b><p>Jogadores e IA recebem apenas informações que poderiam conhecer pelas regras. A IA não recebe posições ocultas extras.</p></div>
          <div class="qr-card"><b>💥 Marcadores</b><p>Ataques, Confrontos e outros eventos importantes deixam marcadores temporários para ajudar a reconstruir o que aconteceu sem entregar informação proibida.</p></div>
        </section>

        <section class="qr-page" data-page="biomas">
          <div class="qr-card qr-visual"><div>${biome(A.terrain?.tree,'Árvore')}</div><div><b>🌳 Árvore · V3</b><p>Bloqueia passagem e posicionamento, exceto a interação especial do Druida. Pode ser atacada. Em 0 de Vida vira Árvore Destruída e a casa fica passável.</p></div></div>
          <div class="qr-card qr-visual"><div>${biome(A.terrain?.rock,'Pedra')}</div><div><b>🪨 Pedra · V3</b><p>Bloqueia passagem e posicionamento. Pode ser atacada. Em 0 de Vida desaparece e abre caminho. O Golem pode consumir uma Pedra adjacente mesmo que ela já esteja danificada.</p></div></div>
          <div class="qr-card qr-visual"><div>${biome(A.terrain?.water,'Lago')}</div><div><b>💧 Lago</b><p>É passável e não cobra movimento extra.</p></div></div>
          <div class="qr-card qr-visual"><div>${biome(A.terrain?.swamp,'Pântano')}</div><div><b>🌾 Pântano</b><p>É passável, mas <strong>entrar custa 2 de Movimento</strong>. Uma unidade com apenas 1 ponto disponível não consegue entrar.</p></div></div>
          <div class="qr-card"><b>❤️ Vida dos Biomas</b><p>A Vida restante de Árvores e Pedras aparece diretamente no tabuleiro, como acontece com personagens.</p></div>
          <div class="qr-card"><b>🗺️ Posições atuais — Clássico</b><p>Árvores: B3/G6 · Pedras: F2/C7 · Lagos: D3/E6 · Pântanos: C5/F4.</p></div>
        </section>

        <section class="qr-page" data-page="personagens">
          <div class="qr-card qr-visual"><div>${char('Arqueiro')}</div><div><b>🏹 Arqueiro</b><p><strong>Tiro Certeiro:</strong> dobra o ALC do ataque no turno em que é ativado. Recarga: 1 turno próprio.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Kamikaze')}</div><div><b>💣 Kamikaze</b><p>Explode ao morrer e também pode escolher <strong>Autodestruição</strong>. O jogo destaca a área e exige confirmação. Alc. Hab. 1 = 1 anel; Alc. Hab. 2 = 2 anéis; e assim por diante.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Golem')}</div><div><b>🗿 Golem</b><p><strong>Absorver Rocha:</strong> consome Pedra adjacente e escolhe +1 Vida, +1 Movimento ou +1 ATQ. Nova absorção substitui a anterior. A adaptação permanece no Golem de Lava.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Druida')}</div><div><b>🌿 Druida</b><p>Pode se esconder em árvore viva contra PER e despertar uma árvore como Galho-Vivo.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Caçador')}</div><div><b>🐾 Caçador</b><p>Prepara uma armadilha oculta de dano. Ela pode ser colocada sob uma peça, mas só dispara quando um inimigo entrar depois.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Sentinela')}</div><div><b>🦉 Sentinela</b><p>Mantém até 2 armadilhas de revelação. Bomba de Fumaça impede que a armadilha detecte o Ninja enquanto o efeito estiver ativo.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Bardo')}</div><div><b>🎵 Bardo</b><p>Inspira 1 aliado com +1 ATQ, ALC, Alc. Hab., Movimento ou Vida até o fim do próximo turno do Bardo.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Escudeiro')}</div><div><b>🛡️ Escudeiro</b><p>Pode dividir casa com aliado. <strong>Vincular</strong> escolhe um aliado dentro do Alc. Hab.; Alc. Hab. 0 alcança a própria casa. Ao vincular, o Escudeiro se reúne ao aliado, acompanha seus movimentos e o protege.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Trapaceiro')}</div><div><b>🃏 Trapaceiro</b><p>Pode se mover pelas diagonais. Seu arquétipo continua sendo <strong>Coringa</strong>, com as regras normais desse arquétipo em Confronto Direto.</p></div></div>

          <div class="qr-card qr-visual"><div>${char('Piromante')}</div><div><b>🔥 Piromante</b><p>Escolhe 1 ou 2 casas dentro do Alc. Hab. e resolve os ataques na mesma ação.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Paranoia')}</div><div><b>🧠 Paranoia</b><p>Ao detectar inimigos com PER, pode causar falsas presenças na percepção deles por tempo limitado.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Cavaleiro')}</div><div><b>🐎 Cavaleiro</b><p>Não possui habilidade ativa; sua identidade está na alta mobilidade.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Slime')}</div><div><b>🟢 Slime</b><p>Ao cair, divide-se em 2 Mini-Slimes. A perda só conta quando toda a linhagem for destruída.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Zumbi')}</div><div><b>🧟 Zumbi</b><p>A primeira morte não conta como eliminação: ele retorna na rodada seguinte e depois possui tempo limitado.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Mago do Espelho')}</div><div><b>🔮 Mago do Espelho</b><p>Cria um Espelho dentro do Alc. Hab.; ele gera falsa presença e reflete o primeiro ataque.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Necromante')}</div><div><b>☠️ Necromante</b><p>Usa um cadáver dentro do Alc. Hab. para erguer 1 Esqueleto.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Doppelgänger')}</div><div><b>🎭 Doppelgänger</b><p>Ao passar por cadáver, copia a habilidade dele. Habilidades copiadas usam o Alc. Hab. do Doppelgänger.</p></div></div>
          <div class="qr-card qr-visual"><div>${char('Fantasma')}</div><div><b>👻 Fantasma</b><p>Ao vencer ataque ou Confronto, possui o inimigo. Se o corpo possuído sofrer dano, o Fantasma morre e o hospedeiro retorna.</p></div></div>
        </section>
      </div>
    </div>`;
  const st=document.createElement('style');st.textContent=`
    .qr-overlay{position:fixed;inset:0;background:#000c;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}
    .qr-modal{width:min(940px,96vw);max-height:90vh;overflow:auto;background:linear-gradient(155deg,#1a1b1d,#101113);border:1px solid #5b4b35;border-radius:14px;padding:18px;color:#eee;box-shadow:0 24px 70px #000b}
    .qr-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.qr-head h2{margin:0;color:#f1d8a5;font-family:Georgia,"Times New Roman",serif}.qr-sub{font-size:12px;color:#a9a59c;margin-top:4px}
    .qr-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0 12px;padding-bottom:12px;border-bottom:1px solid #3a3329;position:sticky;top:-18px;z-index:5;background:#151516}.qr-tab{min-width:112px}.qr-tab.active{border-color:#b48b4c;background:linear-gradient(180deg,#59401f,#302416);color:#fff1d0}
    .qr-page{display:none;grid-template-columns:1fr 1fr;gap:10px}.qr-page.active{display:grid}.qr-card{background:#111214;border:1px solid #353027;border-radius:9px;padding:12px;font-size:13px;line-height:1.48}.qr-card b{color:#ead2a2}.qr-card p{margin:6px 0 0;color:#ddd}.qr-example{margin-top:8px;padding:8px 9px;border-left:3px solid #9f7c46;background:#181612;color:#e7d6b6;border-radius:4px}
    .qr-visual{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:center}.qr-art{width:58px;height:58px;object-fit:cover;border-radius:9px;border:1px solid #6a5536;background:#090a0b;box-shadow:0 3px 10px #0008}
    @media(max-width:680px){.qr-page.active{grid-template-columns:1fr}.qr-modal{padding:14px}.qr-tab{min-width:auto;flex:1}.qr-head{align-items:center}.qr-visual{grid-template-columns:52px 1fr}.qr-art{width:48px;height:48px}}
  `;
  document.head.appendChild(st);document.body.appendChild(wrap);
  const close=()=>wrap.style.display='none';btn.onclick=()=>wrap.style.display='flex';document.getElementById('quickRulesClose').onclick=close;wrap.onclick=e=>{if(e.target===wrap)close();};
  wrap.querySelectorAll('.qr-tab').forEach(tab=>tab.onclick=()=>{wrap.querySelectorAll('.qr-tab').forEach(x=>x.classList.toggle('active',x===tab));wrap.querySelectorAll('.qr-page').forEach(x=>x.classList.toggle('active',x.dataset.page===tab.dataset.tab));});
})();
