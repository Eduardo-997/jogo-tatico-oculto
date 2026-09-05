(()=>{
  const btn=document.getElementById('quickRulesBtn');
  if(!btn)return;
  const wrap=document.createElement('div');
  wrap.id='quickRulesModal';
  wrap.className='qr-overlay';
  wrap.innerHTML=`
    <div class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
      <div class="qr-head">
        <div><h2 id="qrTitle">📖 Regras</h2><div class="qr-sub">Encontre rapidamente a regra que precisa consultar.</div></div>
        <button id="quickRulesClose" type="button">Fechar</button>
      </div>
      <div class="qr-tabs" role="tablist">
        <button class="qr-tab active" data-tab="partida" type="button">🎲 Partida</button>
        <button class="qr-tab" data-tab="combate" type="button">⚔️ Combate</button>
        <button class="qr-tab" data-tab="info" type="button">👁️ Informação</button>
        <button class="qr-tab" data-tab="campo" type="button">🏰 Campo</button>
      </div>
      <div class="qr-content">
        <section class="qr-page active" data-page="partida">
          <div class="qr-card"><b>🏆 Objetivo</b><p>Elimine <strong>3 dos 4 personagens originais</strong> do adversário. Invocações não contam como perda original.</p></div>
          <div class="qr-card"><b>🔄 Rodadas e turnos</b><p>Cada unidade pode ter um turno por rodada. Na rodada 1, quem tem a prioridade inicial é sorteado entre os dois lados; a cada nova rodada essa prioridade alterna. A vantagem numérica é limitada: um lado pode ter no máximo <strong>1 turno de unidade a mais que o adversário</strong> naquela rodada.</p><div class="qr-example">Exemplo: em 4 × 2, o lado com 4 escolhe quais <strong>3</strong> unidades vai usar; o lado com 2 usa as <strong>2</strong>.</div></div>
          <div class="qr-card"><b>🎯 Como funciona um turno</b><p>Escolha uma unidade → movimento opcional → ataque <strong>ou</strong> habilidade opcional → encerrar. Selecionar uma unidade ou consultar sua ficha não gasta o turno.</p></div>
          <div class="qr-card"><b>🌿 Turnos compartilhados</b><p>Druida e Galho-Vivo compartilham o mesmo turno. Usar um deles gasta o turno dos dois naquela rodada.</p></div>
        </section>
        <section class="qr-page" data-page="combate">
          <div class="qr-card"><b>👣 M — Movimento</b><p>M indica quantos passos a unidade pode percorrer no próprio turno. Cada passo segue as conexões normais do tabuleiro; personagens com exceções têm isso indicado na ficha.</p></div>
          <div class="qr-card"><b>⚔️ ATQ — Ataque</b><p>ATQ indica quanto dano o ataque normal causa quando acerta. Ataque normal e Confronto Direto são sistemas separados.</p></div>
          <div class="qr-card"><b>🎯 ALC — Alcance de Ataque</b><p>ALC indica a distância máxima do ataque normal. A marcação no tabuleiro sempre considera o alcance final, incluindo bônus ativos.</p></div>
          <div class="qr-card"><b>✨ Alc. Hab. — Alcance de Habilidade</b><p>Indica a distância máxima para escolher casas ou alvos com habilidades que usam esse atributo. Ao clicar em Habilidade, o tabuleiro mostra a área disponível.</p></div>
          <div class="qr-card"><b>🤺 Confronto Direto</b><p>Entrar em uma casa ocupada por inimigo inicia Confronto Direto. Ele é separado do ataque normal e usa os arquétipos.</p></div>
          <div class="qr-card"><b>🛡️ 📜 🗡️ Arquétipos</b><p>Vanguarda vence Executor, Executor vence Estrategista e Estrategista vence Vanguarda. Coringa vence os demais arquétipos; Condenado perde para todos os outros. Arquétipos iguais empatam.</p></div>
          <div class="qr-card"><b>❤️ Sobrevivência</b><p>O vencedor do Confronto causa 1 de dano. Se o derrotado sobreviver, a invasão pode ser repelida conforme a situação.</p></div>
        </section>
        <section class="qr-page" data-page="info">
          <div class="qr-card"><b>👁️ PER — Percepção</b><p>PER define até onde a unidade detecta presença inimiga pelas conexões do mapa. Detectar presença não significa necessariamente revelar tudo.</p></div>
          
          <div class="qr-card"><b>🕵️ Informação oculta</b><p>Você só recebe o que sua equipe poderia saber. Posições ocultas do adversário não são entregues à IA nem ao outro jogador.</p></div>
          <div class="qr-card"><b>💥 Local de ataque inimigo</b><p>Quando um inimigo ataca, o local do ataque fica marcado com 💥 até você <strong>encerrar seu próximo turno</strong>. Começar a agir não apaga a marca.</p></div>
        </section>
        <section class="qr-page" data-page="campo">
          <div class="qr-card"><b>🏰 Postos de Operação</b><p>Cada lado começa com 2 Postos. Para sabotar um Posto inimigo, fique adjacente e use o turno da unidade para escolher um benefício disponível.</p></div>
          <div class="qr-card"><b>👁️ Cerco Final</b><p>Quando os <strong>4 Postos</strong> tiverem sido sabotados, toda a <strong>borda externa do tabuleiro</strong> fica permanentemente revelada para os dois lados. Apenas unidades são reveladas por essa regra; armadilhas, Espelhos e outros elementos ocultos continuam seguindo suas próprias regras.</p></div>
          <div class="qr-card"><b>🌳 Árvores e terreno</b><p>Árvores e pedras bloqueiam movimento e posicionamento. Lagos são passáveis. Pântanos custam 2 de movimento para entrar. Algumas habilidades interagem diretamente com árvores.</p></div>
          <div class="qr-card"><b>💀 Invocações e formas</b><p>Esqueleto, Mini-Slimes, Galho-Vivo e transformações seguem as regras de seus criadores/formas. Elas não contam automaticamente como personagens originais.</p></div>
          <div class="qr-card"><b>🃏 Habilidades específicas</b><p>As habilidades completas ficam nas fichas dos personagens. Esta seção resume apenas as regras gerais do jogo.</p></div>
        </section>
      </div>
    </div>`;
  const st=document.createElement('style');
  st.textContent=`
    .qr-overlay{position:fixed;inset:0;background:#000c;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}
    .qr-modal{width:min(900px,96vw);max-height:88vh;overflow:auto;background:linear-gradient(155deg,#1a1b1d,#101113);border:1px solid #5b4b35;border-radius:14px;padding:18px;color:#eee;box-shadow:0 24px 70px #000b}
    .qr-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.qr-head h2{margin:0;color:#f1d8a5;font-family:Georgia,"Times New Roman",serif}.qr-sub{font-size:12px;color:#a9a59c;margin-top:4px}
    .qr-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0 12px;padding-bottom:12px;border-bottom:1px solid #3a3329}.qr-tab{min-width:120px}.qr-tab.active{border-color:#b48b4c;background:linear-gradient(180deg,#59401f,#302416);color:#fff1d0}
    .qr-page{display:none;grid-template-columns:1fr 1fr;gap:10px}.qr-page.active{display:grid}.qr-card{background:#111214;border:1px solid #353027;border-radius:9px;padding:12px;font-size:13px;line-height:1.48}.qr-card b{color:#ead2a2}.qr-card p{margin:6px 0 0;color:#ddd}.qr-example{margin-top:8px;padding:8px 9px;border-left:3px solid #9f7c46;background:#181612;color:#e7d6b6;border-radius:4px}
    @media(max-width:680px){.qr-page.active{grid-template-columns:1fr}.qr-modal{padding:14px}.qr-tab{min-width:auto;flex:1}.qr-head{align-items:center}}
  `;
  document.head.appendChild(st);document.body.appendChild(wrap);
  const close=()=>wrap.style.display='none';
  btn.onclick=()=>wrap.style.display='flex';
  document.getElementById('quickRulesClose').onclick=close;
  wrap.onclick=e=>{if(e.target===wrap)close();};
  wrap.querySelectorAll('.qr-tab').forEach(tab=>tab.onclick=()=>{
    wrap.querySelectorAll('.qr-tab').forEach(x=>x.classList.toggle('active',x===tab));
    wrap.querySelectorAll('.qr-page').forEach(x=>x.classList.toggle('active',x.dataset.page===tab.dataset.tab));
  });
})();
