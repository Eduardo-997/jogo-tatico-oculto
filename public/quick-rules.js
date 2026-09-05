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
      </div>
      <div class="qr-content">
        <section class="qr-page active" data-page="partida">
          <div class="qr-card"><b>🏆 Objetivo</b><p>Elimine <strong>3 dos 4 personagens originais</strong> do adversário. Invocações não contam como perda original.</p></div>
          <div class="qr-card"><b>🔄 Rodadas e ativações</b><p>Na rodada 1, a prioridade inicial é sorteada; depois alterna. A vantagem numérica é limitada a no máximo <strong>1 ativação a mais</strong> que o adversário.</p><div class="qr-example">Ex.: 4 × 2 → o lado com 4 escolhe 3 unidades para ativar; o lado com 2 ativa as 2.</div></div>
          <div class="qr-card"><b>🎯 Turno da unidade</b><p>Selecione uma unidade → movimento opcional → ataque <strong>ou</strong> habilidade → encerre. Algumas habilidades encerram a ativação imediatamente.</p></div>
          <div class="qr-card"><b>🌿 Turno compartilhado</b><p>Algumas unidades ligadas por uma mesma mecânica podem compartilhar a ativação. Quando isso acontece, agir com uma delas também consome o turno da outra naquela rodada.</p></div>
          <div class="qr-card qr-visual"><div>${art(A.structures?.baseAlly,'Posto de Operação')}</div><div><b>🏰 Postos de Operação</b><p>Cada lado começa com 2. Sabotar um Posto permite escolher um benefício disponível para uma unidade aliada.</p></div></div>
          <div class="qr-card"><b>👁️ Cerco Final</b><p>Quando todos os Postos ativos forem sabotados, a borda externa do tabuleiro passa a revelar unidades permanentemente. Elementos ocultos continuam seguindo suas próprias regras.</p></div>
        </section>

        <section class="qr-page" data-page="combate">
          <div class="qr-card"><b>👣 M — Movimento</b><p>M indica os pontos de movimento disponíveis. Entrar em Pântano custa 2 pontos; outros passos normais custam 1.</p></div>
          <div class="qr-card"><b>⚔️ ATQ</b><p>ATQ é o dano do ataque normal. Árvores e Pedras também podem ser atacadas e recebem esse dano normalmente.</p></div>
          <div class="qr-card"><b>🎯 ALC</b><p>ALC é o alcance do ataque normal. ALC indica a distância máxima do ataque normal e pode ser alterado por bônus ou efeitos temporários.</p></div>
          <div class="qr-card"><b>✨ Alc. Hab.</b><p>É o alcance usado por habilidades. A prévia no tabuleiro sempre considera o valor atual e mostra a área real da habilidade, inclusive quando ela usa formatos diferentes de uma distância simples.</p></div>
          <div class="qr-card qr-visual"><div>${art(A.effects?.confronto,'Confronto Direto')}</div><div><b>🤺 Confronto Direto</b><p>Entrar na casa de um inimigo inicia Confronto Direto, separado do ataque normal e resolvido pelos arquétipos.</p></div></div>
          <div class="qr-card"><b>🛡️ 📜 🗡️ Arquétipos</b><p>Vanguarda vence Executor; Executor vence Estrategista; Estrategista vence Vanguarda. Coringa vence os três. Condenado perde para os demais. Iguais empatam.</p></div>
        </section>

        <section class="qr-page" data-page="info">
          <div class="qr-card"><b>👁️ PER — Percepção</b><p>PER detecta presença por conexões do mapa. Detectar presença não revela automaticamente a posição exata.</p></div>
          <div class="qr-card qr-visual"><div>${art(A.effects?.revelada,'Área revelada')}</div><div><b>🔎 Áreas de revelação</b><p>Algumas habilidades e efeitos revelam uma ou mais casas do mapa. Durante a escolha, o jogo destaca apenas as casas válidas e mostra a área que será afetada.</p></div></div>
          <div class="qr-card qr-visual"><div>${art(A.effects?.oculto,'Ocultação')}</div><div><b>🌫️ Ocultação total</b><p>Alguns efeitos podem tornar uma unidade completamente indetectável. Enquanto o efeito durar, PER, áreas de revelação, armadilhas de revelação e efeitos semelhantes não conseguem localizá-la.</p></div></div>
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
