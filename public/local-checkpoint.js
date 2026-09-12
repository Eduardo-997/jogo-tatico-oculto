(() => {
  'use strict';
  // Recuperação nesta aba: nunca recebe ou grava estado de partidas Online.
  const build='1.15.73',maxBytes=2_000_000,maxReplayBytes=900_000;
  function create(kind,{coords,names,storage}={}){
    const sides=kind==='classic'?['player','enemy']:kind==='arena'?['A','B','C']:null;
    if(!sides)throw new Error('Modalidade local inválida.');
    const cells=new Set(coords),characters=new Set([...names,'Esqueleto','Mini-Slime','Galho-Vivo','Golem de Lava']),key=`bnsLocalCheckpoint:${kind}`;
    const store=()=>storage||window.sessionStorage;
    const coordinate=c=>typeof c==='string'&&cells.has(c);
    function valid(raw){
      if(typeof raw!=='string'||raw.length>maxBytes)return false;
      let s;try{s=JSON.parse(raw);}catch{return false;}
      if(!s||s.phase!=='play'||(kind==='classic'&&s.mode!=='solo')||!sides.includes(s.turn)||!Number.isInteger(s.round)||s.round<1||typeof s.gameOver!=='boolean')return false;
      const ids=new Set(),living=new Map();
      for(const side of sides){
        const ps=s.pieces?.[side];if(!Array.isArray(ps)||ps.length>128||!Array.isArray(s.history?.[side]))return false;
        for(const name of ['traps','falsePresences'])if(s[name]?.[side]!==undefined&&!Array.isArray(s[name][side]))return false;
        for(const p of ps){
          if(!p||p.owner!==side||typeof p.id!=='string'||ids.has(p.id)||!characters.has(p.name)||typeof p.alive!=='boolean'||!Number.isFinite(p.hp)||!Array.isArray(p.effects)||(!coordinate(p.coord)&&(p.alive||p.coord!==null)))return false;
          ids.add(p.id);if(p.alive){const group=living.get(p.coord)||[];group.push(p);living.set(p.coord,group);}
        }
        const a=s.activation?.[side];if(a&&(!ps.some(p=>p.id===a.pieceId)||typeof a!=='object'))return false;
        const size=s.matchConfig?.teamSize?.[side],loss=s.matchConfig?.lossLimit?.[side];
        if(!Number.isInteger(size)||size<1||size>8||!Number.isInteger(loss)||loss<1||loss>size)return false;
        for(const t of s.traps?.[side]||[])if(!t||!coordinate(t.coord))return false;
        for(const f of s.falsePresences?.[side]||[])if(!f||!coordinate(f.coord))return false;
      }
      for(const group of living.values()){
        if(group.length>2||new Set(group.map(p=>p.owner)).size>1)return false;
        if(group.length===2&&!group.some(p=>p.name==='Escudeiro'||p.name==='Doppelgänger'&&p.copied==='Escudeiro'))return false;
        for(const p of group)if(p.linkedToId&&!group.some(q=>q.id===p.linkedToId&&q.owner===p.owner))return false;
      }
      for(const name of ['bases','trees','corpses','mirrors']){if(!Array.isArray(s[name]))return false;for(const x of s[name])if(!x||!coordinate(x.coord))return false;}
      for(const name of ['rocks','water','swamps']){if(!Array.isArray(s[name])||s[name].some(c=>!coordinate(c)))return false;}
      return true;
    }
    function clear(){try{store().removeItem(key);return true;}catch{return false;}}
    function read(){
      try{
        const raw=store().getItem(key);if(!raw)return null;
        if(raw.length>maxBytes){clear();return null;}
        const saved=JSON.parse(raw);
        if(saved.format!==1||saved.build!==build||saved.kind!==kind||!valid(saved.state)){clear();return null;}
        if(!Array.isArray(saved.frames)||saved.frames.length>120||saved.frames.some(f=>!f||!valid(JSON.stringify(f.state)))){saved.frames=[];saved.replayTruncated=true;}
        return saved;
      }catch{clear();return null;}
    }
    function write(state,{frames=[],meta={}}={}){
      if(!valid(state))return {saved:false,reason:'state'};
      const kept=[];let bytes=0;
      // Limita histórico salvo; o replay completo em memória não é modificado.
      for(let i=frames.length-1;i>=0&&kept.length<120;i--){const f=frames[i],size=JSON.stringify(f).length;if(bytes+size>maxReplayBytes)break;bytes+=size;kept.unshift(f);}
      const saved={format:1,build,kind,state,frames:kept,replayTruncated:kept.length<frames.length||!!meta.replayPartial,meta};
      try{
        let serialized=JSON.stringify(saved);if(serialized.length>maxBytes){saved.frames=[];saved.replayTruncated=frames.length>0;serialized=JSON.stringify(saved);}
        store().setItem(key,serialized);return {saved:true,replayTruncated:saved.replayTruncated};
      }catch{
        try{saved.frames=[];saved.replayTruncated=frames.length>0;store().setItem(key,JSON.stringify(saved));return {saved:true,replayTruncated:saved.replayTruncated};}
        catch{return {saved:false,reason:'storage'};}
      }
    }
    return Object.freeze({read,write,clear,valid});
  }
  window.BNSLocalCheckpoint=Object.freeze({create});
})();
