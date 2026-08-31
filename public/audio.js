'use strict';
(() => {
  let ctx=null, master=null;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const store={get(k,f=null){try{return localStorage.getItem(k)??f}catch{return f}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
  let volume=clamp(Number(store.get('gameAudioVolume',0.32)),0,1);
  let muted=store.get('gameAudioMuted','0')==='1';

  function ensure(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    ctx=new AC();
    master=ctx.createGain();
    master.gain.value=muted?0:volume;
    master.connect(ctx.destination);
    return ctx;
  }
  async function resume(){const c=ensure();if(c&&c.state==='suspended'){try{await c.resume();}catch{}}}
  function gainNode(at,dur,level=0.08){
    const g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002,level),at+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,at+dur);
    g.connect(master);
    return g;
  }
  function tone(freq,dur=0.12,type='sine',level=0.07,delay=0,endFreq=null){
    if(!ensure()||muted||volume<=0)return;
    const at=ctx.currentTime+delay,o=ctx.createOscillator(),g=gainNode(at,dur,level);
    o.type=type;o.frequency.setValueAtTime(freq,at);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),at+dur);
    o.connect(g);o.start(at);o.stop(at+dur+0.02);
  }
  function noise(dur=0.12,level=0.05,delay=0,lowpass=1800){
    if(!ensure()||muted||volume<=0)return;
    const rate=ctx.sampleRate,len=Math.max(1,Math.floor(rate*dur)),buf=ctx.createBuffer(1,len,rate),data=buf.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=gainNode(ctx.currentTime+delay,dur,level);
    filter.type='lowpass';filter.frequency.value=lowpass;src.buffer=buf;src.connect(filter);filter.connect(g);
    src.start(ctx.currentTime+delay);
  }
  function play(kind){
    if(muted||volume<=0)return;
    resume();
    switch(kind){
      case 'attack':
        tone(230,.08,'sawtooth',.045,0,130); noise(.07,.025,.035,1300); break;
      case 'hit':
        noise(.11,.055,0,700); tone(95,.12,'triangle',.04,0,60); break;
      case 'clash':
        tone(620,.08,'square',.032,0,430); tone(900,.055,'triangle',.022,.025,620); noise(.075,.018,0,3500); break;
      case 'explosion':
        noise(.34,.095,0,850); tone(86,.32,'sawtooth',.055,0,42); break;
      case 'magic':
        tone(330,.12,'sine',.035,0,520); tone(520,.15,'sine',.03,.07,760); break;
      case 'summon':
        tone(120,.22,'triangle',.045,0,230); tone(360,.18,'sine',.032,.10,620); break;
      case 'transform':
        tone(105,.28,'sawtooth',.05,0,260); noise(.18,.035,.08,1000); break;
      case 'reflect':
        tone(980,.08,'sine',.035,0,1350); tone(670,.12,'triangle',.03,.055,980); break;
      case 'sabotage':
        tone(145,.12,'square',.038,0,90); noise(.13,.035,.04,950); tone(280,.07,'triangle',.025,.13,180); break;
      case 'perception':
        tone(520,.07,'sine',.025,0,700); tone(700,.08,'sine',.02,.075,880); break;
      case 'turn':
        tone(392,.09,'sine',.022,0,523); tone(523,.12,'sine',.022,.075,659); break;
      case 'death':
        tone(140,.18,'triangle',.035,0,72); break;
    }
  }
  function sync(){if(master)master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.015);}
  function setVolume(v){volume=clamp(Number(v)||0,0,1);store.set('gameAudioVolume',String(volume));sync();return volume;}
  function setMuted(v){muted=!!v;store.set('gameAudioMuted',muted?'1':'0');sync();return muted;}
  function toggleMute(){return setMuted(!muted);}
  function state(){return {muted,volume};}
  function bind(toggle,range){
    if(range){range.value=String(Math.round(volume*100));range.addEventListener('input',()=>{setVolume(Number(range.value)/100);if(volume>0&&muted)setMuted(false);update();resume();});}
    function update(){if(toggle){toggle.textContent=muted||volume===0?'🔇':'🔊';toggle.title=muted?'Ativar sons':'Silenciar sons';}}
    if(toggle)toggle.addEventListener('click',()=>{resume();toggleMute();update();});
    update();
  }
  window.addEventListener('pointerdown',()=>resume(),{once:true,capture:true});
  window.GameAudio={play,resume,setVolume,setMuted,toggleMute,state,bind};
})();
