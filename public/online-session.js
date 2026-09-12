(() => {
  'use strict';
  const cache=new Map();
  const normalize=room=>String(room||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);
  const key=(kind,room)=>`bnsSeat:v1:${location.host}:${kind}:${normalize(room)}`;
  function token(kind,room){const k=key(kind,room);try{return localStorage.getItem(k)||cache.get(k)||'';}catch{return cache.get(k)||'';}}
  function remember(kind,room,value){if(typeof value!=='string'||!value)return false;const k=key(kind,room);cache.set(k,value);try{localStorage.setItem(k,value);return true;}catch{return false;}}
  // Sem enviar token no URL e sem compartilhar os tokens dos demais jogadores.
  window.BNSOnlineSession={normalize,token,remember};
})();
