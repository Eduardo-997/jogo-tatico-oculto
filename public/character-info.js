(() => {
  'use strict';
  // Fonte única da ficha nos quatro modos. Geometria: lados do grid/grafo de cada mapa.
  const text=Object.freeze({
    'Arqueiro':'Tiro Certeiro: mostra o alcance dobrado e pede confirmação. Depois de confirmado, o próximo ataque normal usa esse alcance naquele turno. Recarga: 1 turno próprio.',
    'Ninja':'Bomba de Fumaça: fica indetectável por PER, Vidente, armadilha da Sentinela e revelações até o fim do próximo turno próprio. Recarga: 2 turnos próprios.',
    'Piromante':'Rajada Dupla: escolha exatamente 2 casas diferentes dentro do Alc. Hab. A confirmação aparece somente após a segunda escolha. Recarga: 1 turno próprio.',
    'Kamikaze':'Explode ao morrer e pode confirmar Autodestruição como habilidade ativa. A prévia mostra a área inteira: Alc. Hab. 1 atinge o primeiro anel ao redor; 2 atinge os dois primeiros anéis, e assim por diante. Causa 1 de dano inclusive em aliados.',
    'Caçador':'Mantém 1 armadilha de dano oculta dentro do Alc. Hab. Pode colocá-la em casa ocupada; ela só dispara quando um inimigo entrar depois. Causa 1 de dano antes do Confronto Direto e desaparece. Colocar outra substitui a anterior.',
    'Paranoia':'Presença Fantasma: escolha exatamente 2 casas dentro do Alc. Hab. atual. Você vê as presenças; a PER inimiga as detecta como personagens. Atacar uma presença faz o atacante acreditar que atingiu Paranoia e receber uma nova detecção falsa no próximo turno. Entrar nela não causa dano nem repele: o adversário descobre que era falsa e recebe um Eco falso conhecido no próximo turno. Máximo de 2 presenças por fonte; novas substituem as antigas.',
    'Escudeiro':'Pode compartilhar casa com 1 aliado e o protege de ataques, dano em área, reflexão de Espelho e Confronto Direto. A proteção exige estarem na mesma casa. Vincular usa o Alc. Hab. atual (0 = própria casa): reúne as peças e faz uma acompanhar o deslocamento da outra. Enquanto vinculado não anda sozinho. Use a habilidade novamente para Desvincular, gastando o turno.',
    'Golem':'Absorver Rocha: consome uma Pedra adjacente por lado. Golem normal recebe 1 de Armadura até o fim do próximo turno próprio; cada dano é reduzido em 1 e dano reduzido a 0 não o transforma. Quando sofre dano, transforma-se em Golem de Lava. Nessa forma, absorver Pedra concede +1 M permanente e cumulativo.',
    'Golem de Lava':'Absorver Rocha: consome uma Pedra adjacente por lado e recebe +1 M permanente e cumulativo.',
    'Cavaleiro':'Não possui habilidade ativa.',
    'Slime':'Ao cair, cria até 2 Mini-Slimes nas casas livres disponíveis. A perda original só conta quando toda a linhagem morrer; sem espaço para nenhum, conta imediatamente. Os Mini-Slimes herdam os bônus.',
    'Mini-Slime':'Pertence à linhagem do Slime original. A perda só conta quando todos os Mini-Slimes dessa linhagem forem destruídos. Não se divide novamente.',
    'Zumbi':'A primeira morte não conta como perda original. Tenta voltar na rodada seguinte, na casa da morte, com 1 de Vida; se ela estiver bloqueada, aguarda uma rodada posterior. Após 3 turnos próprios do corpo reanimado, cai definitivamente. Morrer reanimado conta imediatamente.',
    'Druida':'Pode entrar em Árvore viva e se esconder da PER. Desperta 1 Árvore dentro do Alc. Hab. como Galho-Vivo, que usa um turno normal disponível. Limite de 1 Galho-Vivo por fonte. Se a fonte morrer, ele volta a ser Árvore.',
    'Galho-Vivo':'Invocação do Druida. Usa um turno normal disponível e volta a ser Árvore viva se a unidade que o despertou morrer.',
    'Vidente':'A prévia mostra o Alc. Hab. atual. Escolha 2 casas ligadas por lado: ambas precisam estar dentro do alcance do próprio Vidente. Revela unidades detectáveis nessas casas; Fumaça mantém o Ninja indetectável.',
    'Mago do Espelho':'Cria 1 Espelho dentro do Alc. Hab., medido em passos por lado do mapa. Gera falsa presença e reflete o primeiro ataque contra o atacante. Criar outro substitui o anterior. Disponível a cada turno.',
    'Necromante':'Ergue um Esqueleto usando um cadáver dentro do Alc. Hab. Limite de 1 Esqueleto vivo por fonte.',
    'Esqueleto':'Invocação do Necromante; usa um turno normal disponível. Seu arquétipo Condenado perde para os demais e empata com outro Condenado.',
    'Doppelgänger':'Ao passar por um cadáver, registra sua habilidade. As habilidades ativas compatíveis usam os atributos e o Alc. Hab. do próprio Doppelgänger, sem copiar os atributos do personagem. Passivas como movimento diagonal, possessão, divisão, reanimação e esconder-se em Árvores não são transferidas. Ao encontrar outra habilidade, escolha manter ou trocar.',
    'Sentinela':'Mantém até 2 armadilhas ocultas dentro do Alc. Hab. Podem ser colocadas em casas ocupadas; só disparam na entrada posterior de um inimigo. A posição dele fica revelada até o início do próximo turno daquela peça. Fumaça impede a revelação.',
    'Bardo':'Inspira 1 aliado dentro do Alc. Hab., concedendo +1 ATQ, ALC, Alc. Hab., M ou Vida. Mantém 1 aliado inspirado por fonte; o efeito dura até o fim do próximo turno próprio da fonte ou sua morte. Dano consome a Vida adicional; ao expirar, somente a parcela temporária restante é retirada.',
    'Trapaceiro':'Pode mover-se pelas diagonais.',
    'Fantasma':'Seu ataque e a vitória em Confronto Direto possuem um corpo inimigo compatível, controlando sua Vida, atributos e habilidades. O antigo dono perde a localização. Quando o corpo é derrotado, o Fantasma morre e o hospedeiro volta ao dono na casa atual ou na casa legal mais próxima; sem vaga, aguarda recuperação. Não pode possuir um corpo que já esteja possuindo outro.'
  });
  const passiveOnly=new Set(['Cavaleiro','Slime','Mini-Slime','Zumbi','Trapaceiro','Fantasma','Doppelgänger','Esqueleto','Galho-Vivo']);
  function abilityText(p){
    const name=p?.copied||p?.displayName||p?.name;
    if(p?.copied){
      if(passiveOnly.has(name))return `Cópia registrada: ${name}. Esta característica não possui habilidade ativa compatível; sua passiva não é transferida. Mantém os atributos e características do Doppelgänger.`;
      if(name==='Druida')return 'Desperta 1 Árvore dentro do próprio Alc. Hab. como Galho-Vivo. Limite de 1 por fonte; volta a ser Árvore se a fonte morrer. Não copia a passiva de esconder-se em Árvores.';
      if(name==='Golem')return 'Absorver Rocha: consome uma Pedra adjacente por lado e recebe 1 de Armadura até o fim do próximo turno próprio. Não copia a transformação nem os atributos do Golem.';
      return (text[name]||'Sem habilidade ativa compatível.')+' A cópia usa os atributos e alcance do próprio Doppelgänger.';
    }
    return text[name]||text[p?.name]||'Sem habilidade ativa ou característica adicional.';
  }
  function unitLabel(p,coordinate=c=>c){
    const kind=p?.possessing?'possuído pelo Fantasma':p?.summonType==='miniSlime'?'divisão do Slime':p?.summonType?'invocação':p?.original?'original':'unidade';
    const location=p?.coord?coordinate(p.coord):null;
    return `${p?.icon||''} ${p?.displayName||p?.name||'Unidade'} — ${kind}${location?` — ${location}`:''}`.trim();
  }
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unitHtml=(p,coordinate)=>escapeHtml(unitLabel(p,coordinate));
  window.BNSCharacterInfo=Object.freeze({text,abilityText,unitLabel,unitHtml});
})();
