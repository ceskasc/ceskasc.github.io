(() => {
'use strict';

const LIVE_API=`${config.supabaseUrl||''}/functions/v1/o-live`;
const LIVE_SCORE_API=`${config.supabaseUrl||''}/functions/v1/o-live-score`;
let usernameGate=false, pendingLiveSlug=new URLSearchParams(location.search).get('live');
let liveSession=null, livePoll=null, liveTimer=null, liveSyncHealthy=false, livePollBusy=false;
let liveCrowns=0, lastRewardSlug=null;

async function liveEdge(action,payload={}){
  const r=await fetch(LIVE_API,{method:'POST',headers:{apikey:API_KEY,'Content-Type':'application/json'},body:JSON.stringify({action,installationId,installationSecret,...payload})});
  const t=await r.text();let d=null;if(t){try{d=JSON.parse(t)}catch{}}
  if(!r.ok){const e=new Error(d?.error||`Live room failed (${r.status})`);e.status=r.status;throw e}return d;
}
async function liveScore(a){
  if(!liveSession?.slug)throw new Error('Live room unavailable');
  const rect=els.canvas.getBoundingClientRect();
  const r=await fetch(LIVE_SCORE_API,{method:'POST',headers:{apikey:API_KEY,'Content-Type':'application/json'},body:JSON.stringify({installationId,installationSecret,liveRoomSlug:liveSession.slug,clientScore:+a.score.toFixed(2),viewport:{width:Math.round(rect.width*100)/100,height:Math.round(rect.height*100)/100},stroke:serializeStrokeForServer()})});
  const t=await r.text();let d=null;if(t){try{d=JSON.parse(t)}catch{}}
  if(!r.ok){const e=new Error(d?.error||`Live score failed (${r.status})`);e.status=r.status;throw e}return d;
}

function ensureV8UI(){
  const anchor=$('beatSelfButton')||$('oneShotButton');
  if(anchor&&!$('liveDuelButton')){
    anchor.insertAdjacentHTML('afterend','<button class="live-duel-cta" id="liveDuelButton" type="button"><span><b>LIVE DUEL</b><i>1M</i></span><small>INVITE ONE FRIEND · 60 SEC · BEST SCORE WINS</small><span class="live-pulse"></span><span class="arrow">→</span></button>');
    $('liveDuelButton').addEventListener('click',createLiveRoom);
  }
  if(!$('duelCrownCard')&&$('profileScreen')){
    const target=$('profileScreen').querySelector('.profile-identity');
    target?.insertAdjacentHTML('afterend','<div class="duel-crown-card" id="duelCrownCard"><span>LIVE DUEL REWARD</span><div><b id="duelCrownCount">0</b><i>CROWNS</i></div><small>Win a 60-second duel to earn +1.</small></div>');
  }
  if(!$('liveLobby')) document.body.insertAdjacentHTML('beforeend',`
    <section class="live-lobby" id="liveLobby" aria-hidden="true">
      <header><button id="liveLobbyClose" type="button">×</button><div><span>PRIVATE ROOM</span><b>LIVE DUEL</b></div><em id="liveRoomCode">—</em></header>
      <div class="live-clock"><small id="liveClockLabel">WAITING FOR PLAYER</small><strong id="liveClock">1:00</strong></div>
      <div class="live-versus">
        <article class="you"><span>YOU</span><b id="liveHostName">—</b><strong id="liveHostBest">—</strong><small id="liveHostAttempts">0 ATTEMPTS</small></article>
        <i>VS</i>
        <article><span>RIVAL</span><b id="liveGuestName">WAITING…</b><strong id="liveGuestBest">—</strong><small id="liveGuestAttempts">0 ATTEMPTS</small></article>
      </div>
      <p class="live-lobby-copy" id="liveLobbyCopy">Your friend opens the invite. The 60-second clock starts when they join.</p>
      <div class="live-reward-line"><span>WINNER REWARD</span><b>+1 CROWN</b></div>
      <div class="live-lobby-actions"><button id="liveShareInvite" type="button">SHARE INVITE ↗</button><button id="liveCopyInvite" type="button">COPY LINK</button></div>
      <button class="live-play hidden" id="livePlay" type="button">PLAY ROUND</button>
      <p class="live-state" id="liveState">SECURE VERIFIED SCORING</p>
    </section>`);
  if(!$('liveHud')) $('gameScreen').insertAdjacentHTML('beforeend','<div class="live-hud hidden" id="liveHud"><div><span id="liveHudYouName">YOU</span><b id="liveHudYou">—</b></div><strong id="liveHudTime">1:00</strong><div><span id="liveHudRivalName">RIVAL</span><b id="liveHudRival">—</b></div></div>');
  if(!$('liveRewardOverlay')) document.body.insertAdjacentHTML('beforeend',`<section class="live-reward-overlay" id="liveRewardOverlay" aria-hidden="true"><span class="reward-kicker" id="liveRewardKicker">LIVE DUEL</span><h2 id="liveRewardTitle">YOU WON</h2><strong id="liveRewardCrown">+1 CROWN</strong><p id="liveRewardCopy">Victory recorded.</p><button id="liveRewardClose" type="button">CONTINUE</button></section>`);
  $('liveLobbyClose')?.addEventListener('click',()=>toggleLobby(false));
  $('liveShareInvite')?.addEventListener('click',shareLiveInvite);
  $('liveCopyInvite')?.addEventListener('click',copyLiveInvite);
  $('livePlay')?.addEventListener('click',startLiveRound);
  $('liveRewardClose')?.addEventListener('click',()=>toggleReward(false));
  els.usernameDialog?.addEventListener('cancel',e=>{if(usernameGate&&!profile)e.preventDefault()});
}

function setUsernameGate(on){
  usernameGate=!!on;
  document.body.classList.toggle('username-gate',usernameGate);
  const close=$('closeUsername');if(close)close.disabled=usernameGate;
  if(usernameGate){
    const kicker=els.usernameDialog?.querySelector('.dialog-kicker');if(kicker)kicker.textContent='FIRST, CLAIM YOUR NAME';
    const h=els.usernameDialog?.querySelector('h2');if(h)h.textContent='Who are you?';
  }
}
const closeUsername0=closeUsername;
closeUsername=function(){if(usernameGate&&!profile)return;if(profile)setUsernameGate(false);return closeUsername0()};

async function enforceUsername(){
  await loadProfile();
  if(!profile){setUsernameGate(true);openUsername();return false}
  setUsernameGate(false);return true;
}

async function refreshCrowns(){
  if(!profile)return;
  try{
    const rows=await api(`o_profiles?installation_id=eq.${encodeURIComponent(installationId)}&select=duel_crowns&limit=1`);
    if(rows?.length){liveCrowns=Number(rows[0].duel_crowns||0);renderCrowns()}
  }catch{}
}
function renderCrowns(){if($('duelCrownCount'))$('duelCrownCount').textContent=String(liveCrowns||0)}
function applyLiveMeta(data){if(Number.isFinite(Number(data?.myCrowns))){liveCrowns=Number(data.myCrowns);renderCrowns()}}

function liveUrl(slug){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('live',slug);return u.toString()}
function setLiveUrl(slug){const u=new URL(location.href);u.search='';u.hash='';if(slug)u.searchParams.set('live',slug);history.replaceState({},'',u)}
function toggleLobby(open=true){const l=$('liveLobby');if(!l)return;l.classList.toggle('visible',open);l.setAttribute('aria-hidden',open?'false':'true')}
function toggleReward(open=true){const l=$('liveRewardOverlay');if(!l)return;l.classList.toggle('visible',open);l.setAttribute('aria-hidden',open?'false':'true')}
function normalizeRoom(data){return data?.room||data||null}
function secondsLeft(room){if(!room?.expires_at)return null;return Math.max(0,Math.ceil((new Date(room.expires_at).getTime()-Date.now())/1000))}
function clockText(sec){if(sec==null)return'1:00';const m=Math.floor(sec/60),s=sec%60;return`${m}:${String(s).padStart(2,'0')}`}
function liveRoleNames(room){
  const host=liveSession?.role==='host'?'YOU':(room.host_name||'HOST');
  const guest=liveSession?.role==='guest'?'YOU':(room.guest_name||'RIVAL');
  return{host,guest};
}
function renderLive(room){
  if(!room||!liveSession)return;liveSession.room=room;
  const names=liveRoleNames(room),sec=secondsLeft(room),active=room.status==='active'&&sec>0,finished=room.status==='finished'||sec===0;
  $('liveRoomCode').textContent=liveSession.slug.slice(0,6).toUpperCase();
  $('liveHostName').textContent=names.host;$('liveGuestName').textContent=room.guest_name?names.guest:'WAITING…';
  $('liveHostBest').textContent=room.host_best==null?'—':Number(room.host_best).toFixed(2);$('liveGuestBest').textContent=room.guest_best==null?'—':Number(room.guest_best).toFixed(2);
  $('liveHostAttempts').textContent=`${room.host_attempts||0} ATTEMPT${room.host_attempts===1?'':'S'}`;$('liveGuestAttempts').textContent=`${room.guest_attempts||0} ATTEMPT${room.guest_attempts===1?'':'S'}`;
  $('liveClockLabel').textContent=finished?'DUEL FINISHED':active?'TIME REMAINING':'WAITING FOR PLAYER';$('liveClock').textContent=active||finished?clockText(sec):'1:00';
  $('livePlay').classList.toggle('hidden',!active);$('liveLobbyCopy').textContent=finished?finalCopy(room):active?'You have 60 seconds. Draw as many verified circles as you can. Best score wins +1 CROWN.':'Your friend opens the invite. The 60-second clock starts when they join.';
  $('liveState').textContent=liveSyncHealthy?'LIVE · SECURE SYNC':'LIVE · RECONNECTING';
  $('liveHud').classList.toggle('hidden',gameMode!=='live'||!active);
  if(active){
    const myHost=liveSession.role==='host';$('liveHudYouName').textContent='YOU';$('liveHudRivalName').textContent=myHost?(room.guest_name||'RIVAL'):(room.host_name||'RIVAL');$('liveHudYou').textContent=Number(myHost?room.host_best:room.guest_best||0)?Number(myHost?room.host_best:room.guest_best).toFixed(2):'—';$('liveHudRival').textContent=Number(myHost?room.guest_best:room.host_best||0)?Number(myHost?room.guest_best:room.host_best).toFixed(2):'—';$('liveHudTime').textContent=clockText(sec);
  }
  if(finished&&gameMode==='live')$('liveHud').classList.add('hidden');
}
function finalCopy(room){const h=Number(room.host_best||0),g=Number(room.guest_best||0);if(!h&&!g)return'Duel ended with no verified scores.';if(Math.abs(h-g)<.005)return`Draw · ${h.toFixed(2)} vs ${g.toFixed(2)} · No CROWN`;const winner=h>g?room.host_name:room.guest_name;return`${winner||'Winner'} wins +1 CROWN · ${Math.max(h,g).toFixed(2)}`}
function startLiveTimer(){clearInterval(liveTimer);liveTimer=setInterval(()=>{if(liveSession?.room)renderLive(liveSession.room)},250)}

function handleReward(reward){
  if(!reward?.finalized||!liveSession?.slug||lastRewardSlug===liveSession.slug)return;
  lastRewardSlug=liveSession.slug;liveSession.reward=reward;
  const mine=reward.winnerInstallationId===installationId,tie=!!reward.tie;
  if(mine&&Number.isFinite(Number(reward.winnerTotalCrowns))){liveCrowns=Number(reward.winnerTotalCrowns);renderCrowns()}
  $('liveRewardKicker').textContent='LIVE DUEL · FINAL';
  $('liveRewardTitle').textContent=tie?'DRAW':mine?'YOU WON':'RIVAL WON';
  $('liveRewardCrown').textContent=tie?'NO CROWN':mine?'+1 CROWN':'CROWN LOST';
  $('liveRewardCopy').textContent=tie?'Equal best scores. No reward this round.':mine?`CROWN #${liveCrowns} added to your profile.`:`${reward.winnerName||'Your rival'} earned the CROWN.`;
  toggleLobby(true);toggleReward(true);
  if(navigator.vibrate)navigator.vibrate(mine?[40,35,70,35,120]:tie?[30,40,30]:[60]);
}

function stopLiveSync(){clearInterval(livePoll);livePoll=null;liveSyncHealthy=false;livePollBusy=false}
async function pollLiveState(){
  if(livePollBusy||!liveSession?.slug)return;
  livePollBusy=true;
  try{const d=await liveEdge('state',{slug:liveSession.slug});applyLiveMeta(d);liveSyncHealthy=true;renderLive(normalizeRoom(d));handleReward(d?.reward)}
  catch(e){liveSyncHealthy=false;if(e?.status===410&&liveSession?.room){liveSession.room.status='finished';renderLive(liveSession.room)}}
  finally{livePollBusy=false}
}
function startLiveSync(){stopLiveSync();pollLiveState();livePoll=setInterval(pollLiveState,850);startLiveTimer()}

async function createLiveRoom(){
  if(!profile){setUsernameGate(true);openUsername();return}
  if(liveSession?.slug&&liveSession?.room&&liveSession.room.status!=='finished'){toggleLobby(true);renderLive(liveSession.room);return}
  try{showToast('CREATING 60-SECOND DUEL');const d=await liveEdge('create');applyLiveMeta(d);liveSession={slug:d.slug,role:'host',room:normalizeRoom(d)};lastRewardSlug=null;setLiveUrl(d.slug);liveSyncHealthy=true;renderLive(liveSession.room);toggleLobby(true);startLiveSync()}catch(e){showToast(e.message||'LIVE ROOM UNAVAILABLE')}
}
async function joinLiveRoom(slug){
  if(!profile){pendingLiveSlug=slug;setUsernameGate(true);openUsername();return}
  try{showToast('JOINING 60-SECOND DUEL');const d=await liveEdge('join',{slug});applyLiveMeta(d);liveSession={slug,role:d.role,room:normalizeRoom(d)};lastRewardSlug=null;liveSyncHealthy=true;renderLive(liveSession.room);toggleLobby(true);startLiveSync();setLiveUrl(slug)}catch(e){showToast(e.message||'COULD NOT JOIN DUEL')}
}
async function shareLiveInvite(){if(!liveSession?.slug)return;const url=liveUrl(liveSession.slug),text='Join my 60-second O. Live Duel. Winner earns +1 CROWN.';try{if(navigator.share)await navigator.share({title:'O. — 60s Live Duel',text,url});else{await navigator.clipboard.writeText(url);showToast('INVITE COPIED')}}catch(e){if(e?.name!=='AbortError')showToast('SHARE UNAVAILABLE')}}
async function copyLiveInvite(){if(!liveSession?.slug)return;try{await navigator.clipboard.writeText(liveUrl(liveSession.slug));showToast('INVITE LINK COPIED')}catch{showToast('COPY UNAVAILABLE')}}
function startLiveRound(){if(!liveSession?.room||liveSession.room.status!=='active'||secondsLeft(liveSession.room)<=0)return showToast('DUEL IS NOT ACTIVE');toggleLobby(false);startGame('live');els.gameModeEyebrow.textContent='60 SEC';els.gameModeLabel.textContent='LIVE DUEL';els.promptIndex.textContent='VS';els.promptText.textContent='Beat your rival.';$('liveHud').classList.remove('hidden');renderLive(liveSession.room)}

const submitScore0=submitScore;
submitScore=async function(a){if(a?.mode==='live')return liveScore(a);return submitScore0(a)};
const verifiedV8=applyVerifiedResult;
applyVerifiedResult=function(data){const out=verifiedV8(data);if(gameMode==='live'&&data?.liveRoom){const room=Array.isArray(data.liveRoom)?data.liveRoom[0]:data.liveRoom;if(room)renderLive(room);const myHost=liveSession?.role==='host',mine=Number(myHost?room?.host_best:room?.guest_best||0),rival=Number(myHost?room?.guest_best:room?.host_best||0);els.resultRank.textContent=mine>=rival?'LIVE LEAD':'CHASING';els.resultVerdict.textContent=`Room best ${mine?mine.toFixed(2):'—'} · Rival ${rival?rival.toFixed(2):'—'}`;}return out};
const screenV8=showScreen;
showScreen=function(name){const out=screenV8(name);if(name!=='game')$('liveHud')?.classList.add('hidden');if(name==='profile')refreshCrowns();return out};

ensureV8UI();
loadProfile().then(async()=>{
  const ready=await enforceUsername();
  if(ready){await refreshCrowns();if(pendingLiveSlug){const slug=pendingLiveSlug;pendingLiveSlug=null;await joinLiveRoom(slug)}}
}).catch(()=>{setUsernameGate(true);openUsername()});
els.usernameDialog?.addEventListener('close',()=>{if(profile){setUsernameGate(false);refreshCrowns();if(pendingLiveSlug){const slug=pendingLiveSlug;pendingLiveSlug=null;setTimeout(()=>joinLiveRoom(slug),80)}}});
})();