(() => {
'use strict';

const LIVE_FINAL_API = `${config.supabaseUrl || ''}/functions/v1/o-live`;
let finalBusy = false;
let finalDoneSlug = null;
let finalRetry = null;
let finalAttempts = 0;

function isTurkish(){
  return document.body.classList.contains('locale-tr') || document.documentElement.lang === 'tr';
}
function liveSlug(){
  try { return new URLSearchParams(location.search).get('live'); }
  catch { return null; }
}
function duelLooksFinished(){
  const label = document.getElementById('liveClockLabel')?.textContent || '';
  const clock = document.getElementById('liveClock')?.textContent || '';
  return /DUEL FINISHED|DÜELLO BİTTİ/i.test(label) || clock.trim() === '0:00';
}
function rewardAlreadyVisible(){
  const overlay = document.getElementById('liveRewardOverlay');
  return !!overlay && (overlay.classList.contains('visible') || overlay.getAttribute('aria-hidden') === 'false');
}
function setVisible(el, visible){
  if(!el) return;
  el.classList.toggle('visible', visible);
  el.setAttribute('aria-hidden', visible ? 'false' : 'true');
}
function paintFinalReward(reward, slug){
  if(!reward?.finalized || !slug) return false;

  const tr = isTurkish();
  let myId = '';
  try { myId = String(installationId || ''); } catch {}
  const mine = !!reward.winnerInstallationId && String(reward.winnerInstallationId) === myId;
  const tie = !!reward.tie;
  const crowns = Number(reward.winnerTotalCrowns);

  if(mine && Number.isFinite(crowns)){
    const crownCount = document.getElementById('duelCrownCount');
    if(crownCount) crownCount.textContent = String(crowns);
  }

  const kicker = document.getElementById('liveRewardKicker');
  const title = document.getElementById('liveRewardTitle');
  const crown = document.getElementById('liveRewardCrown');
  const copy = document.getElementById('liveRewardCopy');
  if(kicker) kicker.textContent = tr ? 'CANLI DÜELLO · SONUÇ' : 'LIVE DUEL · FINAL';
  if(title) title.textContent = tie ? (tr ? 'BERABERE' : 'DRAW') : mine ? (tr ? 'KAZANDIN' : 'YOU WON') : (tr ? 'RAKİP KAZANDI' : 'RIVAL WON');
  if(crown) crown.textContent = tie ? (tr ? 'TAÇ YOK' : 'NO CROWN') : mine ? (tr ? '+1 TAÇ' : '+1 CROWN') : (tr ? 'TAÇ RAKİBİN' : 'CROWN LOST');
  if(copy){
    if(tie) copy.textContent = tr ? 'En iyi skorlar eşit. Bu tur ödül yok.' : 'Equal best scores. No reward this round.';
    else if(mine) copy.textContent = tr ? `TAÇ #${Number.isFinite(crowns) ? crowns : ''} profiline eklendi.` : `CROWN #${Number.isFinite(crowns) ? crowns : ''} added to your profile.`;
    else copy.textContent = tr ? `${reward.winnerName || 'Rakibin'} TAÇ kazandı.` : `${reward.winnerName || 'Your rival'} earned the CROWN.`;
  }

  const hud = document.getElementById('liveHud');
  if(hud) hud.classList.add('hidden');
  setVisible(document.getElementById('liveLobby'), true);
  setVisible(document.getElementById('liveRewardOverlay'), true);

  finalDoneSlug = slug;
  finalAttempts = 0;
  clearTimeout(finalRetry);
  finalRetry = null;
  try { navigator.vibrate?.(mine ? [40,35,70,35,120] : tie ? [30,40,30] : [60]); } catch {}
  return true;
}

async function requestFinalState(slug){
  let key = '';
  let playerId = '';
  let playerSecret = '';
  try { key = API_KEY; playerId = installationId; playerSecret = installationSecret; } catch {}
  if(!slug || !key || !playerId || !playerSecret) throw new Error('Live identity unavailable');

  const response = await fetch(LIVE_FINAL_API, {
    method:'POST',
    headers:{apikey:key, 'Content-Type':'application/json'},
    body:JSON.stringify({action:'state', installationId:playerId, installationSecret:playerSecret, slug})
  });
  const text = await response.text();
  let data = null;
  if(text){ try { data = JSON.parse(text); } catch {} }
  if(!response.ok) throw new Error(data?.error || `Live finalize failed (${response.status})`);
  return data;
}

function scheduleRetry(delay=350){
  clearTimeout(finalRetry);
  if(finalAttempts >= 12) return;
  finalRetry = setTimeout(finalizeIfNeeded, delay);
}

async function finalizeIfNeeded(){
  const slug = liveSlug();
  if(!slug || finalBusy || finalDoneSlug === slug) return;
  if(rewardAlreadyVisible()){
    finalDoneSlug = slug;
    return;
  }
  if(!duelLooksFinished()) return;

  finalBusy = true;
  finalAttempts += 1;
  try{
    const data = await requestFinalState(slug);
    if(paintFinalReward(data?.reward, slug)) return;
    scheduleRetry(300);
  }catch{
    scheduleRetry(500);
  }finally{
    finalBusy = false;
  }
}

function observeFinish(){
  const label = document.getElementById('liveClockLabel');
  const clock = document.getElementById('liveClock');
  if(label && !label.dataset.finalWatch){
    label.dataset.finalWatch = '1';
    new MutationObserver(()=>queueMicrotask(finalizeIfNeeded)).observe(label,{subtree:true,childList:true,characterData:true});
  }
  if(clock && !clock.dataset.finalWatch){
    clock.dataset.finalWatch = '1';
    new MutationObserver(()=>queueMicrotask(finalizeIfNeeded)).observe(clock,{subtree:true,childList:true,characterData:true});
  }
  finalizeIfNeeded();
}

const rootObserver = new MutationObserver(observeFinish);
rootObserver.observe(document.body,{subtree:true,childList:true});
observeFinish();
window.addEventListener('pageshow',observeFinish,{passive:true});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) observeFinish(); },{passive:true});
})();
