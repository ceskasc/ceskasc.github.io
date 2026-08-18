function showResult(a){
  const [label,copy]=rank(a.score); const bestKey=`o.best.${gameMode}`,previous=Number(localStorage.getItem(bestKey)||0),isBest=a.score>previous;
  if(isBest) localStorage.setItem(bestKey,a.score.toFixed(2));
  els.resultRank.textContent=label; els.resultMode.textContent=gameMode.toUpperCase(); els.resultScore.textContent=a.score.toFixed(2);
  els.resultVerdict.textContent=a.score>=99.5?copy:`${(100-a.score).toFixed(2)}% from perfection.`;
  els.metricShape.textContent=a.shape.toFixed(0); els.metricClosure.textContent=a.closure.toFixed(0); els.metricFlow.textContent=a.smoothness.toFixed(0);
  els.personalBest.classList.toggle('hidden',!isBest); els.gameBest.textContent=bestForMode(gameMode)||'—';
  $('rankingJoinButton').classList.toggle('hidden',!!profile);
  els.result.classList.add('visible'); els.result.setAttribute('aria-hidden','false');
  pendingScore={...a,mode:gameMode,dailyDate:gameMode==='daily'?todayIstanbul():null};
  if(profile) submitScore(pendingScore).catch(()=>showToast('SCORE SAVED LOCALLY'));
  if(isBest) showToast('NEW PERSONAL BEST');
}

function closeResult(){ els.result.classList.remove('visible'); els.result.setAttribute('aria-hidden','true'); }

async function submitScore(a){
  if(!profile||!a)return;
  const payload={
    installation_id:installationId, mode:a.mode, score:+a.score.toFixed(2), shape:+a.shape.toFixed(2), radius:+a.radius.toFixed(2), closure:+a.closure.toFixed(2), coverage:+a.coverage.toFixed(2),
    smoothness:+a.smoothness.toFixed(2), stability:+a.stability.toFixed(2), purity:+a.purity.toFixed(2), stroke_duration:a.duration, point_count:a.pointCount, daily_date:a.dailyDate, verification_status:'prototype'
  };
  await api('o_scores',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
  pendingScore=null;
}

function openAnalysis(){
  if(!lastResult)return; const a=lastResult; els.analysisScore.textContent=a.score.toFixed(2);
  const metrics={shape:a.shape,radius:a.radius,closure:a.closure,coverage:a.coverage,smoothness:a.smoothness,stability:a.stability,purity:a.purity};
  Object.entries(metrics).forEach(([key,value])=>{ const cap=key[0].toUpperCase()+key.slice(1); const valueEl=$(`a${cap}`),bar=$(`bar${cap}`); if(valueEl)valueEl.textContent=value.toFixed(0); if(bar)setTimeout(()=>bar.style.width=`${clamp(value,0,100)}%`,40); });
  const sorted=Object.entries(metrics).sort((a,b)=>b[1]-a[1]); els.analysisBest.textContent=sorted[0][0].toUpperCase(); els.analysisWeak.textContent=sorted.at(-1)[0].toUpperCase();
  els.analysis.classList.add('visible'); els.analysis.setAttribute('aria-hidden','false');
}
function closeAnalysis(){ els.analysis.classList.remove('visible'); els.analysis.setAttribute('aria-hidden','true'); qsa('.analysis-row i').forEach(i=>i.style.width='0'); }

async function loadRankings(){
  els.rankingList.innerHTML='<div class="loading-line"></div><div class="loading-line"></div><div class="loading-line"></div><div class="loading-line"></div>';
  els.rankingEmpty.classList.add('hidden');
  try{
    const date=todayIstanbul(); const filter=rankingMode==='daily'?`mode=eq.daily&daily_date=eq.${date}`:`mode=eq.${rankingMode}`;
    const rows=await api(`o_scores?${filter}&select=installation_id,score,mode,daily_date,created_at,o_profiles(username,country_code)&order=score.desc,created_at.asc&limit=500`);
    const best=new Map(); for(const row of rows||[]){ const prev=best.get(row.installation_id); if(!prev||Number(row.score)>Number(prev.score)) best.set(row.installation_id,row); }
    const ranked=[...best.values()].sort((a,b)=>Number(b.score)-Number(a.score)||new Date(a.created_at)-new Date(b.created_at)).slice(0,100);
    els.rankingCount.textContent=`${best.size} PLAYER${best.size===1?'':'S'}`; els.rankingDateLabel.textContent=rankingMode==='daily'?date:'GLOBAL';
    els.rankingList.innerHTML='';
    ranked.forEach((row,i)=>{
      const div=document.createElement('div'); div.className=`ranking-row${row.installation_id===installationId?' me':''}`;
      const username=row.o_profiles?.username || 'anonymous'; const country=row.o_profiles?.country_code || '—';
      div.innerHTML=`<span class="place">${String(i+1).padStart(2,'0')}</span><span class="player"><b></b><span></span></span><b class="rank-score">${Number(row.score).toFixed(2)}</b>`;
      div.querySelector('.player b').textContent=username; div.querySelector('.player span').textContent=row.installation_id===installationId?'YOU':country;
      els.rankingList.appendChild(div);
    });
    els.rankingEmpty.classList.toggle('hidden',ranked.length>0);
  } catch(err){ els.rankingList.innerHTML=''; els.rankingCount.textContent='OFFLINE'; els.rankingEmpty.textContent='Ranking is temporarily unavailable.'; els.rankingEmpty.classList.remove('hidden'); }
}

async function loadProfileStats(){
  renderProfileIdentity();
  const localBest=Math.max(...['classic','blind','daily'].map(m=>Number(localStorage.getItem(`o.best.${m}`)||0)),0);
  if(!profile){ els.statBest.textContent=localBest?localBest.toFixed(2):'—'; els.statAttempts.textContent='0'; els.statAverage.textContent='—'; els.statDaily.textContent=bestForMode('daily')||'—'; els.historyList.innerHTML='<div class="empty-state">Claim a username to save history.</div>'; return; }
  try{
    const rows=await api(`o_scores?installation_id=eq.${encodeURIComponent(installationId)}&select=score,mode,daily_date,created_at&order=created_at.desc&limit=200`);
    const scores=(rows||[]).map(r=>Number(r.score)); const daily=(rows||[]).filter(r=>r.mode==='daily').map(r=>Number(r.score));
    els.statBest.textContent=scores.length?Math.max(...scores).toFixed(2):(localBest?localBest.toFixed(2):'—'); els.statAttempts.textContent=String(scores.length); els.statAverage.textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2):'—'; els.statDaily.textContent=daily.length?Math.max(...daily).toFixed(2):(bestForMode('daily')||'—');
    els.historyList.innerHTML=''; (rows||[]).slice(0,8).forEach(r=>{ const item=document.createElement('div');item.className='history-item'; const d=new Date(r.created_at); item.innerHTML=`<div><span>${String(r.mode).toUpperCase()}</span><b>${Number(r.score).toFixed(2)}</b></div><time>${new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(d)}</time>`; els.historyList.appendChild(item); });
    if(!rows?.length) els.historyList.innerHTML='<div class="empty-state">Your next circle will appear here.</div>';
  } catch { els.historyList.innerHTML='<div class="empty-state">History is temporarily unavailable.</div>'; }
}

async function shareResult(){
  if(!lastResult)return; const text=`O. · ${lastResult.score.toFixed(2)}% · ${rank(lastResult.score)[0]}\nCan you draw a better circle?`;
  try{ if(navigator.share) await navigator.share({title:'O. — Draw the impossible',text,url:location.href}); else if(navigator.clipboard){await navigator.clipboard.writeText(text);showToast('RESULT COPIED');} }catch(err){ if(err?.name!=='AbortError')showToast('SHARE UNAVAILABLE'); }
}

function vibrate(pattern){ if(navigator.vibrate) navigator.vibrate(pattern); }
function showToast(text){ els.toast.textContent=text; els.toast.classList.add('visible'); clearTimeout(hideTimer); hideTimer=setTimeout(()=>els.toast.classList.remove('visible'),1450); }

$('classicButton').addEventListener('click',()=>startGame('classic'));
$('dailyButton').addEventListener('click',()=>startGame('daily'));
$('exitGame').addEventListener('click',()=>showScreen('home'));
$('gameBestButton').addEventListener('click',()=>showToast(bestForMode(gameMode)?`BEST · ${bestForMode(gameMode)}`:'NO SCORE YET'));
qsa('[data-screen]').forEach(b=>b.addEventListener('click',()=>showScreen(b.dataset.screen)));
qsa('[data-back-home]').forEach(b=>b.addEventListener('click',()=>showScreen('home')));
$('retryButton').addEventListener('click',resetRound);
$('analysisButton').addEventListener('click',openAnalysis);
$('closeAnalysis').addEventListener('click',closeAnalysis);
$('shareButton').addEventListener('click',shareResult);
$('rankingJoinButton').addEventListener('click',openUsername);
els.claimProfileButton.addEventListener('click',openUsername);
$('closeUsername').addEventListener('click',closeUsername);
$('refreshRankings').addEventListener('click',loadRankings);
$('settingsButton').addEventListener('click',()=>showToast('SOUND · HAPTICS · SOON'));
qsa('[data-ranking]').forEach(btn=>btn.addEventListener('click',()=>{qsa('[data-ranking]').forEach(b=>b.classList.toggle('active',b===btn));rankingMode=btn.dataset.ranking;loadRankings();}));
qsa('[data-metric]').forEach(btn=>btn.addEventListener('click',openAnalysis));

els.usernameForm.addEventListener('submit',async(e)=>{
  e.preventDefault(); els.usernameError.textContent=''; els.saveUsername.disabled=true;
  try{
    profile=await claimUsername(els.usernameInput.value); renderProfileIdentity(); closeUsername(); showToast('NAME CLAIMED');
    if(pendingScore) await submitScore(pendingScore);
    if(currentScreen==='profile') loadProfileStats();
  }catch(err){els.usernameError.textContent=err.message||'Could not claim name.';}finally{els.saveUsername.disabled=false;}
});

els.canvas.addEventListener('pointerdown',begin,{passive:false}); els.canvas.addEventListener('pointermove',move,{passive:false}); els.canvas.addEventListener('pointerup',end,{passive:false}); els.canvas.addEventListener('pointercancel',end,{passive:false});
window.addEventListener('resize',resizeCanvas); document.addEventListener('contextmenu',e=>e.preventDefault());

displayDailyDate(); loadProfile(); resizeCanvas();
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
