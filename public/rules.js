'use strict';
var __gameRoot = typeof window!=='undefined' ? window : globalThis;
__gameRoot.GameRules = (() => {
  const defs = [
    {name:'Arqueiro',icon:'🏹',type:'S',typeIcon:'✂️',v:1,m:0,a:1,range:99},
    {name:'Ninja',icon:'🥷',type:'S',typeIcon:'✂️',v:1,m:2,a:1,range:2},
    {name:'Piromante',icon:'🔥',type:'S',typeIcon:'✂️',v:1,m:1,a:1,range:1},
    {name:'Kamikaze',icon:'💣',type:'S',typeIcon:'✂️',v:1,m:1,a:0,range:0},
    {name:'Escudeiro',icon:'🛡️',type:'R',typeIcon:'🪨',v:2,m:1,a:0,range:0},
    {name:'Golem',icon:'🗿',type:'R',typeIcon:'🪨',v:2,m:1,a:0,range:0},
    {name:'Cavaleiro',icon:'🐎',type:'R',typeIcon:'🪨',v:1,m:3,a:1,range:1},
    {name:'Slime',icon:'🟢',type:'R',typeIcon:'🪨',v:1,m:1,a:0,range:0},
    {name:'Vidente',icon:'👁️',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:0},
    {name:'Mago do Espelho',icon:'🔮',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:0},
    {name:'Necromante',icon:'☠️',type:'P',typeIcon:'📜',v:1,m:1,a:1,range:1},
    {name:'Doppelgänger',icon:'🎭',type:'P',typeIcon:'📜',v:1,m:1,a:0,range:0},
    {name:'Coringa',icon:'🃏',type:'J',typeIcon:'🃏',v:1,m:1,a:0,range:0,diag:true}
  ];
  const skeletonDef={name:'Esqueleto',icon:'💀',type:'C',typeIcon:'🦴',v:1,m:1,a:1,range:1};
  const miniDef={name:'Mini-Slime',icon:'🟢',type:'R',typeIcon:'🪨',v:1,m:1,a:0,range:0};
  const lavaDef={name:'Golem de Lava',icon:'🌋',type:'R',typeIcon:'🪨',v:1,m:0,a:1,range:1};
  const byName = Object.fromEntries(defs.map(d=>[d.name,d]));
  const baseBonuses=[
    {id:'radarAdvanced',icon:'📡',name:'Radar Avançado',description:'Percepção ortogonal informa a casa exata com presença.'},
    {id:'radarExpanded',icon:'📶',name:'Radar Ampliado',description:'Percepção também detecta diagonais e informa se a presença é ortogonal ou diagonal.'},
    {id:'move',icon:'👟',name:'Mobilidade',description:'+1 M permanente para uma unidade aliada viva.'},
    {id:'life',icon:'❤️',name:'Reforço',description:'+1 Vida máxima e +1 Vida atual para uma unidade aliada viva.'},
    {id:'attack',icon:'⚔️',name:'Armamento',description:'+1 ATQ permanente para uma unidade aliada viva.'},
    {id:'range',icon:'🎯',name:'Mira',description:'+1 alcance permanente para uma unidade aliada viva que possua ataque normal.'}
  ];
  const rc=c=>({x:c.charCodeAt(0)-65,y:Number(c.slice(1))-1});
  const coord=(x,y)=>String.fromCharCode(65+x)+(y+1);
  const inside=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
  const man=(a,b)=>{const A=rc(a),B=rc(b);return Math.abs(A.x-B.x)+Math.abs(A.y-B.y)};
  const sameLine=(a,b)=>{const A=rc(a),B=rc(b);return A.x===B.x||A.y===B.y};
  function neighbors(c,diag=false){
    const a=rc(c),ds=diag?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
    return ds.map(([dx,dy])=>[a.x+dx,a.y+dy]).filter(([x,y])=>inside(x,y)).map(([x,y])=>coord(x,y));
  }
  function defOf(p){
    if(!p) return null;
    let base;
    if(p.summonType==='skeleton') base=skeletonDef;
    else if(p.summonType==='miniSlime') base=miniDef;
    else if(p.form==='lava') base=lavaDef;
    else base=byName[p.name] || p;
    return {...base,
      v:(base.v||0)+(p.bonusV||0),
      m:(base.m||0)+(p.bonusM||0),
      a:(base.a||0)+(p.bonusA||0),
      range:(base.range||0)+(p.bonusRange||0)
    };
  }
  function attackCells(p){
    const d=defOf(p),out=[];
    for(let y=0;y<8;y++) for(let x=0;x<8;x++){
      const c=coord(x,y); if(c!==p.coord&&man(p.coord,c)<=d.range) out.push(c);
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
  return Object.freeze({defs,skeletonDef,miniDef,lavaDef,baseBonuses,byName,rc,coord,inside,man,sameLine,neighbors,defOf,attackCells,directWinner});
})();

if(typeof module!=='undefined'&&module.exports) module.exports=__gameRoot.GameRules;
