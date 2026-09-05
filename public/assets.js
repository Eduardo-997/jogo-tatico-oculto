'use strict';
(() => {
  const charMap={
    'Arqueiro':'arqueiro','Ninja':'ninja','Piromante':'piromante','Kamikaze':'kamikaze','Caçador':'cacador','Paranoia':'paranoia',
    'Escudeiro':'escudeiro','Golem':'golem','Golem de Lava':'golem-de-lava','Cavaleiro':'cavaleiro','Slime':'slime','Mini-Slime':'mini-slime','Zumbi':'zumbi','Druida':'druida',
    'Vidente':'vidente','Mago do Espelho':'mago-do-espelho','Necromante':'necromante','Doppelgänger':'doppelganger','Doppelganger':'doppelganger','Sentinela':'sentinela','Bardo':'bardo',
    'Trapaceiro':'trapaceiro','Coringa':'trapaceiro','Joker':'trapaceiro','Fantasma':'fantasma','Esqueleto':'esqueleto','Galho-Vivo':'galho-vivo','Galho Vivo':'galho-vivo','General':'general'
  };
  const terrain={tree:'assets/terrain/arvore.png',deadTree:'assets/terrain/arvore-destruida.png',rock:'assets/terrain/pedra.png',swamp:'assets/terrain/pantano.png',water:'assets/terrain/lago.png'};
  const structures={
    trapHunter:'assets/structures/armadilha-cacador.png',trapSentry:'assets/structures/armadilha-sentinela.png',
    baseAlly:'assets/structures/posto-aliado.png',baseEnemy:'assets/structures/posto-inimigo.png',
    baseSabotagedAlly:'assets/structures/posto-sabotado-aliado.png',baseSabotagedEnemy:'assets/structures/posto-sabotado-inimigo.png',
    hidden:'assets/structures/casa-oculta.png'
  };
  const effects={
    movimento:'assets/effects/movimento.png',ataque:'assets/effects/ataque.png',alcHab:'assets/effects/alc-hab.png',alcAtq:'assets/effects/alc-atq.png',presenca:'assets/effects/presenca.png',
    percepcao:'assets/effects/percepcao.png',vida:'assets/effects/vida.png',revelada:'assets/effects/casa-revelada.png',confronto:'assets/effects/confronto.png',buff:'assets/effects/buff.png',
    dano:'assets/effects/dano.png',cura:'assets/effects/cura.png',trapAtivada:'assets/effects/armadilha-ativada.png',espelho:'assets/effects/espelho.png',canalizacao:'assets/effects/canalizacao.png',
    vinculo:'assets/effects/vinculo.png',oculto:'assets/effects/oculto.png',explosao:'assets/effects/explosao.png',fogo:'assets/effects/fogo.png',sabotagem:'assets/effects/sabotagem.png',
    invocacao:'assets/effects/invocacao.png',lapide:'assets/effects/lapide.png'
  };
  const archetypes={R:'assets/archetypes/vanguarda.png',P:'assets/archetypes/estrategista.png',S:'assets/archetypes/executor.png',J:'assets/archetypes/coringa.png',C:'assets/archetypes/condenado.png'};
  const character=name=>{const key=charMap[name]||charMap[String(name||'').trim()];return key?`assets/characters/${key}.png`:null;};
  function img(src,className='bns-art',alt=''){
    if(!src)return null;const el=document.createElement('img');el.src=src;el.className=className;el.alt=alt||'';el.draggable=false;return el;
  }
  function html(src,className='bns-inline-art',alt=''){
    if(!src)return '';const esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    return `<img class="${esc(className)}" src="${esc(src)}" alt="${esc(alt)}" draggable="false">`;
  }
  window.BNSAssets={character,terrain,structures,effects,archetypes,img,html};
})();
