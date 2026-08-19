(() => {
'use strict';

// O. V14 — lifecycle guards installed before LIVE DUEL / LEVEL RUN.
// Keeps legacy interval features scoped while allowing the V14 identity layer
// to repaint immediately after old 2-player render code runs.
const nativeSetInterval = window.setInterval.bind(window);
const nativeClearInterval = window.clearInterval.bind(window);

function fnSource(fn){
  try { return Function.prototype.toString.call(fn); }
  catch { return ''; }
}
function repaintParty(){try{window.O_LIVE_PARTY_RENDER?.()}catch{}}

window.setInterval = function(fn, delay, ...args){
  const ms = Number(delay) || 0;
  const source = fnSource(fn);
  let id = null;

  // LIVE state polling remains alive until the final reward UI is visible.
  if(ms === 850 && /pollLiveState|liveEdge\(['"]state['"]/.test(source)){
    const wrapped = async (...cbArgs) => {
      if(document.hidden) return;
      try { await fn(...cbArgs); }
      finally {
        repaintParty();
        const label = document.getElementById('liveClockLabel')?.textContent || '';
        const overlay = document.getElementById('liveRewardOverlay');
        const rewardVisible = !!overlay && (overlay.classList.contains('visible') || overlay.getAttribute('aria-hidden') === 'false');
        if(/DUEL FINISHED|DÜELLO BİTTİ/i.test(label) && rewardVisible && id != null) nativeClearInterval(id);
      }
    };
    id = nativeSetInterval(wrapped, ms, ...args);
    return id;
  }

  // Keep the accurate legacy 250 ms clock, then immediately restore V14's
  // real usernames / direct avatars / third-player HUD fields.
  if(ms === 250 && /renderLive\(liveSession\.room\)/.test(source)){
    const wrapped = (...cbArgs) => {
      if(document.hidden) return;
      const labelBefore = document.getElementById('liveClockLabel')?.textContent || '';
      if(/DUEL FINISHED|DÜELLO BİTTİ/i.test(labelBefore)){
        repaintParty();
        if(id != null) nativeClearInterval(id);
        return;
      }
      fn(...cbArgs);
      repaintParty();
      const labelAfter = document.getElementById('liveClockLabel')?.textContent || '';
      if(/DUEL FINISHED|DÜELLO BİTTİ/i.test(labelAfter) && id != null) nativeClearInterval(id);
    };
    id = nativeSetInterval(wrapped, ms, ...args);
    return id;
  }

  // LEVEL RUN clock belongs only to the active game screen.
  if(ms === 100 && /levelExpiredShown|showLevelFailed/.test(source)){
    const wrapped = (...cbArgs) => {
      try {
        if(typeof currentScreen !== 'undefined' && currentScreen !== 'game'){
          if(id != null) nativeClearInterval(id);
          return;
        }
      } catch {}
      fn(...cbArgs);
    };
    id = nativeSetInterval(wrapped, ms, ...args);
    return id;
  }

  return nativeSetInterval(fn, ms, ...args);
};
})();