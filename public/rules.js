'use strict';
var __gameRoot = typeof window!=='undefined' ? window : globalThis;
__gameRoot.GameRules = (() => {
  const defs = [
    {name:'Arqueiro',icon:'🏹',type:'S',typeIcon:'🗡️',v:1,m:0,a:1,range:99,per:1,ah:0},
    {name:'Ninja',icon:'🗡️',type:'S',typeIcon:'🗡️',v:1,m:2,a:1,range:2,per:1,ah:0},
    {name:'Piromante',icon:'🔥',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Kamikaze',icon:'💣',type:'S',typeIcon:'🗡️',v:1,m:1,a:0,range:1,per:1,ah:1},
    {name:'Caçador',icon:'🐾',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Paranoia',icon:'🧠',type:'S',typeIcon:'🗡️',v:1,m:1,a:1,range:1,per:1,ah:0},
    {name:'Escudeiro',icon:'🛡️',type:'R',typeIcon:'🛡️',v:2,m:1,a:0,range:1,per:1,ah:0},
    {name:'Golem',icon:'🗿',type:'R',typeIcon:'🛡️',v:2,m:1,a:0,range:1,per:1,ah:0},
    {name:'Cavaleiro',icon:'🐎',type:'R',typeIcon:'🛡️',v:1,m:3,a:1,range:1,per:1,ah:0},
    {name:'Slime',icon:'🟢',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:0},
    {name:'Zumbi',icon:'🧟',type:'R',typeIcon:'🛡️',v:2,m:1,a:1,range:1,per:1,ah:0},
    {name:'Druida',icon:'🌿',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:1},
    {name:'Vidente',icon:'👁️',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:3},
    {name:'Mago do Espelho',icon:'🔮',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:2},
    {name:'Necromante',icon:'☠️',type:'P',typeIcon:'📜',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Doppelgänger',icon:'🎭',type:'P',typeIcon:'📜',v:1,m:1,a:1,range:1,per:1,ah:1},
    {name:'Sentinela',icon:'🦉',type:'P',typeIcon:'📜',v:1,m:2,a:0,range:1,per:1,ah:1},
    {name:'Bardo',icon:'🎵',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:1,per:1,ah:2},
    {name:'Coringa',icon:'🃏',type:'J',typeIcon:'🃏',v:1,m:1,a:0,range:1,per:1,ah:0,diag:true},
    {name:'Fantasma',icon:'👻',type:'J',typeIcon:'🃏',v:1,m:1,a:0,range:1,per:1,ah:0}
  ];
  const skeletonDef={name:'Esqueleto',icon:'💀',type:'C',typeIcon:'🦴',v:1,m:1,a:1,range:1,per:1,ah:0};
  const miniDef={name:'Mini-Slime',icon:'🟢',type:'R',typeIcon:'🛡️',v:1,m:1,a:0,range:1,per:1,ah:0};
  const lavaDef={name:'Golem de Lava',icon:'🌋',type:'R',typeIcon:'🛡️',v:1,m:0,a:1,range:1,per:1,ah:0};
  const branchDef={name:'Galho-Vivo',icon:'🌲',type:'C',typeIcon:'🦴',v:1,m:1,a:1,range:1,per:1,ah:0};
  const byName = Object.fromEntries(defs.map(d=>[d.name,d]));
  const archetypeNames=Object.freeze({R:'Vanguarda',P:'Estrategista',S:'Executor',J:'Coringa',C:'Condenado'});
  const archetypeName=type=>archetypeNames[type]||type||'—';
  const baseBonuses=[
    {id:'radarAdvanced',icon:'📡',name:'Radar Avançado',description:'A percepção ortogonal da unidade escolhida informa a casa exata com presença.'},
    {id:'radarExpanded',icon:'📶',name:'Radar Ampliado',description:'A unidade escolhida também detecta nas diagonais dentro do alcance de PER e informa se a presença é ortogonal ou diagonal.'},
    {id:'move',icon:'👟',name:'Mobilidade',description:'+1 M permanente para uma unidade aliada viva.'},
    {id:'life',icon:'❤️',name:'Reforço',description:'+1 Vida máxima e +1 Vida atual para uma unidade aliada viva.'},
    {id:'attack',icon:'⚔️',name:'Armamento',description:'+1 ATQ permanente para uma unidade aliada viva.'},
    {id:'range',icon:'🎯',name:'Mira',description:'+1 ALC permanente para uma unidade aliada viva que possua ataque normal.'},
    {id:'abilityRange',icon:'✨',name:'Canalização',description:'+1 Alc. Hab. permanente para uma unidade com habilidade que use Alcance de Habilidade.'}
  ];
  const rc=c=>({x:c.charCodeAt(0)-65,y:Number(c.slice(1))-1});
  const coord=(x,y)=>String.fromCharCode(65+x)+(y+1);
  const inside=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
  const man=(a,b)=>{const A=rc(a),B=rc(b);return Math.abs(A.x-B.x)+Math.abs(A.y-B.y)};
  const sameLine=(a,b)=>{const A=rc(a),B=rc(b);return A.x===B.x||A.y===B.y};
  const treeCells=Object.freeze(['B3','G6']);
  const rockCells=Object.freeze(['F2','C7']);
  const waterCells=Object.freeze(['E3','D6']);
  const swampCells=Object.freeze(['C5','F4']);
  const blockedCells=Object.freeze([...treeCells,...rockCells]);
  const isBlocked=c=>blockedCells.includes(c);
  const isRock=c=>rockCells.includes(c);
  const isWater=c=>waterCells.includes(c);
  const isSwamp=c=>swampCells.includes(c);
  function neighbors(c,diag=false){
    const a=rc(c),ds=diag?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
    return ds.map(([dx,dy])=>[a.x+dx,a.y+dy]).filter(([x,y])=>inside(x,y)).map(([x,y])=>coord(x,y));
  }
  function defOf(p){
    if(!p) return null;
    let base;
    if(p.summonType==='skeleton') base=skeletonDef;
    else if(p.summonType==='miniSlime') base=miniDef;
    else if(p.summonType==='livingBranch') base=branchDef;
    else if(p.form==='lava') base=lavaDef;
    else base=byName[p.name] || p;
    const temp=(p.effects||[]).reduce((acc,e)=>{
      const m=e&&e.modifiers||{};
      acc.v+=(Number(m.v)||0);acc.m+=(Number(m.m)||0);acc.a+=(Number(m.a)||0);acc.range+=(Number(m.range)||0);acc.per+=(Number(m.per)||0);acc.ah+=(Number(m.ah)||0);
      return acc;
    },{v:0,m:0,a:0,range:0,per:0,ah:0});
    return {...base,
      v:Math.max(1,(base.v||0)+(p.bonusV||0)+temp.v),
      m:Math.max(0,(base.m||0)+(p.bonusM||0)+temp.m),
      a:Math.max(0,(base.a||0)+(p.bonusA||0)+temp.a),
      range:Math.max(0,(base.range||0)+(p.bonusRange||0)+temp.range),
      per:Math.max(0,(base.per??1)+(p.bonusPer||0)+temp.per),
      ah:Math.max(0,(base.ah||0)+(p.bonusAH||0)+temp.ah)
    };
  }
  function attackCells(p){
    const d=defOf(p),out=[];
    // Objetos enviados à interface já carregam ATQ/ALC finais (incluindo efeitos temporários, como o Bardo).
    // Peças internas do Árbitro não possuem esses campos diretos, então continuam usando defOf(p).
    const attack=Number.isFinite(Number(p?.a))?Number(p.a):d.a;
    const range=Number.isFinite(Number(p?.range))?Number(p.range):d.range;
    if(attack<=0 && p.name!=='Fantasma')return out;
    for(let y=0;y<8;y++) for(let x=0;x<8;x++){
      const c=coord(x,y); if(c!==p.coord&&man(p.coord,c)<=range) out.push(c);
    }
    return out;
  }
  function abilityCells(p){
    const d=defOf(p),out=[];
    // Na interface, p.ah é o Alc. Hab. final; usar esse valor evita perder bônus temporários na marcação.
    const ah=Number.isFinite(Number(p?.ah))?Number(p.ah):d.ah;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=coord(x,y);if(c!==p.coord&&man(p.coord,c)<=ah)out.push(c)}
    return out;
  }
  function blastCells(c,ah=1){
    ah=Math.max(0,Math.floor(Number(ah)||0));if(!ah)return[];
    const dist={[c]:0},q=[c];
    while(q.length){const cur=q.shift(),d=dist[cur];if(d>=ah)continue;for(const n of neighbors(cur,true))if(dist[n]==null){dist[n]=d+1;q.push(n)}}
    return Object.keys(dist).filter(x=>x!==c&&dist[x]<=ah);
  }
  function perceptionCells(c,per=1,diag=false){
    const a=rc(c),limit=Math.max(0,Math.floor(Number(per)||0));
    const ds=diag?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
    const out=[];
    for(const [dx,dy] of ds) for(let step=1;step<=limit;step++){
      const x=a.x+dx*step,y=a.y+dy*step;if(inside(x,y))out.push(coord(x,y));
    }
    return out;
  }
  function directWinner(a,d){
    const A=defOf(a).type,D=defOf(d).type;
    if(A==='C'&&D==='C')return'tie';
    if(A==='C')return'def';
    if(D==='C')return'att';
    if(A==='J'&&D==='J')return'tie';
    if(A==='J')return'att';
    if(D==='J')return'def';
    if(A===D)return'tie';
    return((A==='R'&&D==='S')||(A==='S'&&D==='P')||(A==='P'&&D==='R'))?'att':'def';
  }
  return Object.freeze({defs,skeletonDef,miniDef,lavaDef,branchDef,baseBonuses,byName,archetypeNames,archetypeName,rc,coord,inside,man,sameLine,treeCells,rockCells,waterCells,swampCells,blockedCells,isBlocked,isRock,isWater,isSwamp,neighbors,perceptionCells,defOf,attackCells,abilityCells,blastCells,directWinner});
})();

if(typeof module!=='undefined'&&module.exports) module.exports=__gameRoot.GameRules;
