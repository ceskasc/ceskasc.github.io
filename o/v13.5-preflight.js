(() => {
'use strict';

// O. V13.5 — lifecycle guards installed before LIVE DUEL / LEVEL RUN.
// Keeps legacy interval-based features from doing network/UI work after their
// owning screen has gone away, without changing any scoring behavior.
const nativeSetInterval = window.setInterval.bind(window);
const nativeClearInterval = window.clearInterval.bind(window);

function fnSource(fn){
  try { return Function.prototype.toString.call(fn); }
  catch { return ''; }
}

window.setInterval = function(fn, delay, ...args){
  const ms = Number(delay) || 0;
  const source = fnSource(fn);
  let id = null;

  // LIVE state polling: no network work while hidden and retire the poller
  // after the room reaches a final state.
  if(ms === 850 && /pollLiveState|liveEdge\(['"]state['"]/.test(source)){
    const wrapped = async (...cbArgs) => {
      if(document.hidden) return;
      try { await fn(...cbArgs); }
      finally {
        const label = document.getElementById('liveClockLabel')?.textContent || '';
        if(/DUEL FINISHED|DÜELLO BİTTİ/i.test(label) && id != null) nativeClearInterval(id);
      }
    };
    id = nativeSetInterval(wrapped, ms, ...args);
    return id;
  }

  // LIVE visual clock: stop rendering after the room has finished; skip work
  // while the tab/app is backgrounded.
  if(ms === 250 && /renderLive\(liveSession\.room\)/.test(source)){
    const wrapped = (...cbArgs) => {
      if(document.hidden) return;
      const labelBefore = document.getElementById('liveClockLabel')?.textContent || '';
      if(/DUEL FINISHED|DÜELLO BİTTİ/i.test(labelBefore)){
        if(id != null) nativeClearInterval(id);
        return;
      }
      fn(...cbArgs);
      const labelAfter = document.getElementById('liveClockLabel')?.textContent || '';
      if(/DUEL FINISHED|DÜELLO BİTTİ/i.test(labelAfter) && id != null) nativeClearInterval(id);
    };
    id = nativeSetInterval(wrapped, ms, ...args);
    return id;
  }

  // LEVEL RUN clock belongs only to the active game screen. Leaving the run
  // retires the 100 ms timer; opening/resuming a run creates a fresh timer.
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
