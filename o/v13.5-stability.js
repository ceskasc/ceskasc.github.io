(() => {
'use strict';
const RELEASE='13.5';

// De-duplicate the old unversioned service-worker registration left in
// app-ui.js. Both callers are funneled into one versioned registration.
try{
  if('serviceWorker' in navigator){
    const sw=navigator.serviceWorker;
    const nativeRegister=sw.register.bind(sw);
    let registrationPromise=null;
    sw.register=(url,options={})=>{
      let isOServiceWorker=false;
      try{isOServiceWorker=new URL(String(url),location.href).pathname.endsWith('/o/sw.js')}catch{}
      if(!isOServiceWorker)return nativeRegister(url,options);
      if(!registrationPromise){
        registrationPromise=nativeRegister(`./sw.js?v=${RELEASE}`,{...options,updateViaCache:'none'})
          .then(reg=>{reg.update?.().catch?.(()=>{});return reg;})
          .catch(err=>{registrationPromise=null;throw err});
      }
      return registrationPromise;
    };
    if(document.readyState==='complete') sw.register(`./sw.js?v=${RELEASE}`,{updateViaCache:'none'}).catch(()=>{});
  }
}catch{}

// Beat Yourself becomes a memory-ghost challenge: the ghost can be studied
// before the stroke and after release, but never traced while the hand moves.
try{
  if(typeof redraw==='function'){
    const redrawWithGhost=redraw;
    redraw=function(...args){
      const out=redrawWithGhost(...args);
      const label=String(els?.gameModeLabel?.textContent||'').trim();
      const memoryGhost=/BEAT YOURSELF|KENDİNİ GEÇ/i.test(label);
      if(memoryGhost && isDrawing){
        clearCanvas();
        if(points?.length>1){
          ctx.save();
          ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=theme.ink;ctx.lineWidth=2.15;
          ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
          for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
          ctx.stroke();ctx.restore();
        }
      }
      return out;
    };
  }
}catch{}

// If TRACE verification finishes after the player already closed TRACE, do not
// resurrect its result sheet on top of another screen.
try{
  const traceScreen=document.getElementById('traceScreen');
  const traceResult=document.getElementById('traceResult');
  if(traceScreen&&traceResult){
    const keepTraceResultScoped=()=>{
      if(traceResult.classList.contains('visible')&&!traceScreen.classList.contains('visible')){
        traceResult.classList.remove('visible');
        traceResult.setAttribute('aria-hidden','true');
      }
    };
    new MutationObserver(keepTraceResultScoped).observe(traceResult,{attributes:true,attributeFilter:['class','aria-hidden']});
    new MutationObserver(keepTraceResultScoped).observe(traceScreen,{attributes:true,attributeFilter:['class','aria-hidden']});
    keepTraceResultScoped();
  }
}catch{}

// Provisional precision ratings must not present an official league before the
// five verified calibration attempts are complete.
try{
  const league=document.getElementById('precisionLeague');
  const state=document.getElementById('precisionState');
  const next=document.getElementById('precisionNext');
  const track=document.getElementById('precisionTrack');
  const home=document.getElementById('homePrecision');
  const result=document.getElementById('resultPrecision');
  let calibrating=false;
  const renderCalibration=()=>{
    if(!state||!league)return;
    const text=String(state.textContent||'').trim();
    let m=text.match(/PROVISIONAL\s*·?\s*(\d+)\s+VERIFIED/i);
    if(!m && calibrating) m=text.match(/PROVISIONAL\s*·?\s*(\d+)\/5\s+VERIFIED/i);
    if(!m){calibrating=false;return;}
    const attempts=Math.max(0,Math.min(4,Number(m[1])||0));
    if(!attempts)return;
    calibrating=true;
    const tr=document.body.classList.contains('locale-tr')||document.documentElement.lang==='tr';
    const stateText=`PROVISIONAL · ${attempts}/5 VERIFIED`;
    const leagueText=tr?'KALİBRASYON':'CALIBRATING';
    const homeText=tr?`KALİBRASYON ${attempts}/5`:`CALIBRATING ${attempts}/5`;
    const left=5-attempts;
    const nextText=tr?`SIRALAMA İÇİN ${left}`:`${left} TO RANK`;
    if(state.textContent!==stateText)state.textContent=stateText;
    if(league.textContent!==leagueText)league.textContent=leagueText;
    if(home&&home.textContent!==homeText)home.textContent=homeText;
    if(next&&next.textContent!==nextText)next.textContent=nextText;
    if(track)requestAnimationFrame(()=>{track.style.width=`${attempts*20}%`});
    if(result&&result.textContent){const rating=(document.getElementById('precisionRating')?.textContent||'').trim();result.textContent=rating&&rating!=='—'?`PR ${rating} · ${leagueText}`:leagueText;}
  };
  if(state){new MutationObserver(()=>queueMicrotask(renderCalibration)).observe(state,{subtree:true,childList:true,characterData:true});renderCalibration();}
}catch{}

// Keep the user's own duel avatar fresh immediately after an avatar upload,
// even if the older duel module has cached the previous public URL.
try{
  const accountAvatar=document.getElementById('accountAvatarImage');
  const syncOwnDuelAvatar=()=>{
    const url=accountAvatar?.getAttribute('src')||profile?.avatar_url||'';
    const username=String(profile?.username||'').trim();
    if(!url||!username)return;
    const slots=[
      ['[data-duel-avatar="host"]','liveHostName'],['[data-duel-avatar="guest"]','liveGuestName'],
      ['[data-hud-avatar="host"]','liveHudYouName'],['[data-hud-avatar="guest"]','liveHudRivalName']
    ];
    for(const [selector,nameId] of slots){
      const label=String(document.getElementById(nameId)?.textContent||'').trim();
      if(!['YOU','SEN',username].includes(label))continue;
      const img=document.querySelector(`${selector} img`);const fallback=document.querySelector(`${selector} span`);
      if(img){img.src=url;img.classList.add('loaded')}
      if(fallback)fallback.textContent=username.slice(0,1).toUpperCase();
    }
  };
  if(accountAvatar)new MutationObserver(syncOwnDuelAvatar).observe(accountAvatar,{attributes:true,attributeFilter:['src','class']});
  document.getElementById('accountAvatarInput')?.addEventListener('change',()=>setTimeout(syncOwnDuelAvatar,1600));
}catch{}

// Remove stale version wording from the legacy settings toast without touching
// the score engine itself.
try{
  if(typeof showToast==='function'){
    const baseToast=showToast;
    showToast=function(message,...args){
      const s=String(message||'');
      const clean=s==='SCORE V5 · VERIFIED SEASONS'?'SERVER VERIFIED · SEASONS':s;
      return baseToast(clean,...args);
    };
  }
}catch{}
})();
