(()=>{
  const btn=document.getElementById('quickRulesBtn');
  if(!btn)return;
  const A=window.BNSAssets||{};
  const art=(src,alt)=>src?`<img class="qr-art" src="${src}" alt="${alt}" draggable="false">`:'';
  const visual=(src,title,text,alt=title)=>`<div class="qr-card qr-visual"><div>${art(src,alt)}</div><div><b>${title}</b><p>${text}</p></div></div>`;
  const wrap=document.createElement('div');
  wrap.id='quickRulesModal';wrap.className='qr-overlay';
  wrap.innerHTML=`
    <div class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
      <div class="qr-head"><div><h2 id="qrTitle">📖 Regras</h2><div class="qr-sub">Regras atuais de Batalha nas Sombras.</div></div><button id="quickRulesClose" type="button">Fechar</button></div>
      <div class="qr-tabs" role="tablist">
        <button class="qr-tab active" data-tab="partida" type="button">🎲 Partida</button>
        <button class="qr-tab" data-tab="combate" type="button">⚔️ Combate</button>
        <button class="qr-tab" data-tab="atributos" type="button">📊 Atributos</button>
        <button class="qr-tab" data-tab="personagens" type="button">🧩 Personagens</button>
        <button class="qr-tab" data-tab="info" type="button">👁️ Informações</button>
        <button class="qr-tab" data-tab="biomas" type="button">🌍 Biomas</button>
      </div>
      <div class="qr-content">
        <section class="qr-page active" data-page="partida">
          <div class="qr-card"><b>🏆 Objetivo</b><p>A quantidade de personagens originais e o número de perdas necessárias para derrotar cada lado são definidos nas <strong>Configurações da Partida</strong>. O padrão continua sendo 4 personagens e derrota ao perder 3 originais. Unidades criadas durante a partida não contam como perdas originais.</p></div>
          <div class="qr-card"><b>🔄 Rodadas e turnos</b><p>Cada unidade viva pode agir no máximo uma vez por rodada. O limite do lado é <strong>suas unidades vivas</strong> ou <strong>unidades vivas do adversário + 1</strong>, valendo o menor número. Invocações, divisões e outras unidades extras entram nessa contagem enquanto estiverem vivas.</p><div class="qr-example">Ex.: você tem 6 unidades vivas e o adversário tem 4 → até 5 unidades suas podem ter turno na rodada. Se tiver 3 contra 5 → as 3 podem agir.</div></div>
          <div class="qr-card"><b>🎯 Turno da unidade</b><p>Selecione uma unidade. Você pode mover primeiro e depois usar <strong>ataque ou habilidade</strong>. Ataques e habilidades geralmente encerram o turno automaticamente; se não quiser usar nenhum, encerre manualmente.</p></div>
          ${visual(A.structures?.baseAlly,'🏰 Postos de Operação','Cada lado começa com 2. Sabotar um Posto permite escolher um benefício disponível para uma unidade aliada.','Posto de Operação')}
          <div class="qr-card"><b>👁️ Cerco Final</b><p>Quando todos os Postos ativos forem sabotados, a borda externa do tabuleiro passa a revelar unidades permanentemente.</p></div>
        </section>

        <section class="qr-page" data-page="combate">
          ${visual(A.effects?.dano,'⚔️ Ataque normal','ATQ é o dano e ALC é a distância máxima. Quando alguém ataca, a casa atingida fica marcada no mapa para mostrar onde o ataque aconteceu. Árvores e Pedras também podem receber dano.','Ataque')}
          ${visual(A.effects?.confronto,'🤺 Confronto Direto','Entrar na casa de um inimigo inicia Confronto Direto, resolvido pelos arquétipos. A casa do confronto fica marcada com ⚔️ no mapa.','Confronto Direto')}
          <div class="qr-card"><b>🧱 Biomas destrutíveis</b><p>Árvores e Pedras possuem Vida. Ao chegar a 0, deixam de bloquear o caminho conforme a regra de cada bioma.</p></div>
          <div class="qr-card"><b>💥 Dano em área</b><p>Efeitos em área atingem todas as casas indicadas pela prévia. Quando a habilidade puder acertar aliados, a área é mostrada antes da confirmação.</p></div>
        </section>

        <section class="qr-page" data-page="atributos">
          <div class="qr-card"><b>❤️ Vida</b><p>Quanto dano a unidade suporta. Ao chegar a 0, aplica-se a regra de morte, transformação ou efeito especial daquela unidade.</p></div>
          <div class="qr-card"><b>👣 M — Movimento</b><p>Quantidade de pontos disponíveis para deslocamento. Um passo comum custa 1; alguns biomas podem alterar esse custo.</p></div>
          <div class="qr-card"><b>⚔️ ATQ — Ataque</b><p>Dano causado pelo ataque normal. ATQ 0 significa que a unidade não possui ataque normal, salvo alguma regra especial.</p></div>
          <div class="qr-card"><b>🎯 ALC — Alcance de Ataque</b><p>Distância máxima do ataque normal. Bônus e efeitos podem aumentar ou reduzir o valor atual.</p></div>
          <div class="qr-card"><b>👁️ PER — Percepção</b><p>Alcance usado para detectar presença sem revelar automaticamente a posição exata. Efeitos de radar podem tornar a informação mais precisa.</p></div>
          <div class="qr-card"><b>✨ Alc. Hab. — Alcance de Habilidade</b><p>Alcance usado pelas habilidades. A prévia no tabuleiro mostra a área real com o valor atual; algumas habilidades usam formatos próprios, como áreas ou anéis.</p></div>
        </section>

        <section class="qr-page" data-page="personagens">
          ${visual(A.effects?.voador,'Voador','Ignora o custo extra do Pântano e pode atravessar Árvores e Pedras, mas não terminar o movimento sobre elas. Para cruzar um obstáculo, precisa ter movimento suficiente para entrar e sair; cancelar ou encerrar sobre ele não é permitido.','Voador')}
          ${visual(A.archetypes?.R,'🛡️ Vanguarda','Vence Executor e perde para Estrategista.','Vanguarda')}
          ${visual(A.archetypes?.P,'📜 Estrategista','Vence Vanguarda e perde para Executor.','Estrategista')}
          ${visual(A.archetypes?.S,'🗡️ Executor','Vence Estrategista e perde para Vanguarda.','Executor')}
          ${visual(A.archetypes?.J,'🃏 Coringa','Vence Vanguarda, Estrategista e Executor. Empata com outro Coringa.','Coringa')}
          ${visual(A.archetypes?.C,'🦴 Condenado','Perde para os demais arquétipos e empata com outro Condenado.','Condenado')}
          <div class="qr-card"><b>📋 Habilidades dos personagens</b><p>As habilidades e características de cada personagem aparecem na própria ficha ao selecioná-lo.</p></div>
        </section>

        <section class="qr-page" data-page="info">
          ${visual(A.effects?.dano,'Impacto de ataque','A casa atingida por um ataque fica marcada no mapa para indicar onde o golpe aconteceu.','Impacto de ataque')}
          ${visual(A.effects?.confronto,'Confronto Direto','O símbolo ⚔️ marca a casa onde ocorreu um Confronto Direto.','Confronto Direto')}
          <div class="qr-card"><b>❗ Presença detectada</b><p>Quando a PER detecta alguém sem saber a posição exata, um <strong>❗ vermelho</strong> aparece nas casas possíveis.</p></div>
          ${visual(A.effects?.revelada,'Casa revelada','Quando uma casa está sendo revelada, este símbolo aparece pequeno no canto para não esconder a unidade revelada.','Casa revelada')}
          <div class="qr-card"><b>🕵️ Informação oculta</b><p>Posições inimigas só aparecem quando alguma regra realmente as revela. Os marcadores mostram o que você conseguiu descobrir sem entregar informação extra.</p></div>
        </section>

        <section class="qr-page" data-page="biomas">
          ${visual(A.terrain?.tree,'🌳 Árvore · V3','Bloqueia passagem e posicionamento. Pode ser atacada; em 0 de Vida vira Árvore Destruída e a casa fica passável.','Árvore')}
          ${visual(A.terrain?.rock,'🪨 Pedra · V3','Bloqueia passagem e posicionamento. Pode ser atacada; em 0 de Vida desaparece e abre caminho.','Pedra')}
          ${visual(A.terrain?.water,'💧 Lago','É passável e não cobra movimento extra.','Lago')}
          ${visual(A.terrain?.swamp,'🌾 Pântano','É passável, mas entrar custa 2 de Movimento para unidades terrestres.','Pântano')}
          <div class="qr-card"><b>❤️ Vida dos Biomas</b><p>A Vida restante de Árvores e Pedras aparece diretamente no tabuleiro.</p></div>
          <div class="qr-card"><b>🗺️ Posições atuais — Clássico</b><p>Árvores: B3/G6 · Pedras: F2/C7 · Lagos: D3/E6 · Pântanos: C5/F4.</p></div>
        </section>
      </div>
    </div>`;
  const st=document.createElement('style');st.textContent=`
    .qr-overlay{position:fixed;inset:0;background:#000c;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}
    .qr-modal{width:min(980px,96vw);max-height:90vh;overflow:auto;background:linear-gradient(155deg,#1a1b1d,#101113);border:1px solid #5b4b35;border-radius:14px;padding:18px;color:#eee;box-shadow:0 24px 70px #000b}
    .qr-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.qr-head h2{margin:0;color:#f1d8a5;font-family:Georgia,"Times New Roman",serif}.qr-sub{font-size:12px;color:#a9a59c;margin-top:4px}
    .qr-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0 12px;padding-bottom:12px;border-bottom:1px solid #3a3329;position:sticky;top:-18px;z-index:5;background:#151516}.qr-tab{min-width:112px}.qr-tab.active{border-color:#b48b4c;background:linear-gradient(180deg,#59401f,#302416);color:#fff1d0}
    .qr-page{display:none;grid-template-columns:1fr 1fr;gap:10px}.qr-page.active{display:grid}.qr-card{background:#111214;border:1px solid #353027;border-radius:9px;padding:12px;font-size:13px;line-height:1.48}.qr-card b{color:#ead2a2}.qr-card p{margin:6px 0 0;color:#ddd}.qr-example{margin-top:8px;padding:8px 9px;border-left:3px solid #9f7c46;background:#181612;color:#e7d6b6;border-radius:4px}
    .qr-visual{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:center}.qr-art{width:58px;height:58px;object-fit:contain;object-position:center center;border-radius:9px;border:1px solid #6a5536;background:#090a0b;box-shadow:0 3px 10px #0008}
    @media(max-width:680px){.qr-page.active{grid-template-columns:1fr}.qr-modal{padding:14px}.qr-tab{min-width:auto;flex:1}.qr-head{align-items:center}.qr-visual{grid-template-columns:52px 1fr}.qr-art{width:48px;height:48px}}
  `;
  document.head.appendChild(st);document.body.appendChild(wrap);
  const close=()=>wrap.style.display='none';btn.onclick=()=>wrap.style.display='flex';document.getElementById('quickRulesClose').onclick=close;wrap.onclick=e=>{if(e.target===wrap)close();};
  wrap.querySelectorAll('.qr-tab').forEach(tab=>tab.onclick=()=>{wrap.querySelectorAll('.qr-tab').forEach(x=>x.classList.toggle('active',x===tab));wrap.querySelectorAll('.qr-page').forEach(x=>x.classList.toggle('active',x.dataset.page===tab.dataset.tab));});
})();
