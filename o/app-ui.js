  function showResult(a){
    currentShareSlug=null;
    const [defaultLabel,copy]=rank(a.score);
    const bestKey=`o.best.v3.${gameMode}`;
    const previous=Number(localStorage.getItem(bestKey)||0);
    const isBest=gameMode!=='challenge' && a.score>previous;
    if(isBest) localStorage.setItem(bestKey,a.score.toFixed(2));

    let label=defaultLabel;
    let verdict=a.score>=99.5?copy:`${(100-a.score).toFixed(2)}% from perfection.`;
    if(gameMode==='challenge' && activeChallenge){
      const target=Number(activeChallenge.target_score);
      const delta=a.score-target;
      label=delta>0?'YOU WON':Math.abs(delta)<.01?'TIE':'SO CLOSE';
      verdict=delta>0?`${delta.toFixed(2)} above the target.`:`${Math.abs(delta).toFixed(2)} short of ${target.toFixed(2)}.`;
    }

    els.resultRank.textContent=label;
    els.resultMode.textContent=gameMode==='one_shot'?'ONE SHOT':gameMode.toUpperCase();
    els.resultScore.textContent=a.score.toFixed(2);
    els.resultVerdict.textContent=verdict;
    els.metricShape.textContent=a.shape.toFixed(0);
    els.metricClosure.textContent=a.closure.toFixed(0);
    els.metricFlow.textContent=a.smoothness.toFixed(0);
    els.personalBest.classList.toggle('hidden',!isBest);
    els.gameBest.textContent=gameMode==='challenge'&&activeChallenge?Number(activeChallenge.target_score).toFixed(2):(bestForMode(gameMode)||'—');

    const retry=$('retryButton');
    retry.disabled=gameMode==='one_shot';
    retry.textContent=gameMode==='one_shot'?'LOCKED':gameMode==='challenge'?'TRY AGAIN':'AGAIN';

    $('rankingJoinButton').classList.toggle('hidden',!!profile || gameMode==='challenge');
    els.result.classList.add('visible');
    els.result.setAttribute('aria-hidden','false');

    pendingScore={
      ...a,
      mode:gameMode,
      dailyDate:(gameMode==='daily'||gameMode==='one_shot')?todayIstanbul():null,
      challengeSlug:gameMode==='challenge'?activeChallenge?.slug||null:null
    };

    if(gameMode==='one_shot'){
      localStorage.setItem(`o.oneshot.v3.${todayIstanbul()}`,a.score.toFixed(2));
      updateOneShotStatus();
    }

    if(profile) submitScore(pendingScore).catch(err=>{
      if(gameMode==='one_shot' && (err.status===409 || err.status===400)) showToast('ONE SHOT ALREADY USED');
      else showToast('SCORE SAVED LOCALLY');
    });
    if(isBest) showToast('NEW PERSONAL BEST');
  }

  function closeResult(){ els.result.classList.remove('visible'); els.result.setAttribute('aria-hidden','true'); }

  async function submitScore(a){
    if(!profile||!a)return null;
    const payload={
      installation_id:installationId,
      mode:a.mode,
      score:+a.score.toFixed(2),
      shape:+a.shape.toFixed(2),
      radius:+a.radius.toFixed(2),
      closure:+a.closure.toFixed(2),
      coverage:+a.coverage.toFixed(2),
      smoothness:+a.smoothness.toFixed(2),
      stability:+a.stability.toFixed(2),
      purity:+a.purity.toFixed(2),
      stroke_duration:a.duration,
      point_count:a.pointCount,
      daily_date:a.dailyDate,
      verification_status:'prototype',
      score_version:'v3',
      challenge_slug:a.challengeSlug||null
    };
    const rows=await api('o_scores',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
    pendingScore=null;
    return rows?.[0]||null;
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
      const date=todayIstanbul();
      const dated=rankingMode==='daily'||rankingMode==='one_shot';
      const filter=dated?`mode=eq.${rankingMode}&daily_date=eq.${date}&score_version=eq.v3`:`mode=eq.${rankingMode}&score_version=eq.v3`;
      const rows=await api(`o_scores?${filter}&select=installation_id,score,mode,daily_date,created_at,o_profiles(username,country_code)&order=score.desc,created_at.asc&limit=500`);
      const best=new Map();
      for(const row of rows||[]){
        const prev=best.get(row.installation_id);
        if(!prev||Number(row.score)>Number(prev.score)) best.set(row.installation_id,row);
      }
      const ranked=[...best.values()].sort((a,b)=>Number(b.score)-Number(a.score)||new Date(a.created_at)-new Date(b.created_at)).slice(0,100);
      els.rankingCount.textContent=`${best.size} PLAYER${best.size===1?'':'S'}`;
      els.rankingDateLabel.textContent=dated?date:'V3 · GLOBAL';
      els.rankingList.innerHTML='';
      ranked.forEach((row,i)=>{
        const div=document.createElement('div');
        div.className=`ranking-row${row.installation_id===installationId?' me':''}`;
        const username=row.o_profiles?.username || 'anonymous';
        const country=row.o_profiles?.country_code || '—';
        div.innerHTML=`<span class="place">${String(i+1).padStart(2,'0')}</span><span class="player"><b></b><span></span></span><b class="rank-score">${Number(row.score).toFixed(2)}</b>`;
        div.querySelector('.player b').textContent=username;
        div.querySelector('.player span').textContent=row.installation_id===installationId?'YOU':country;
        els.rankingList.appendChild(div);
      });
      els.rankingEmpty.classList.toggle('hidden',ranked.length>0);
    } catch(err){
      els.rankingList.innerHTML='';
      els.rankingCount.textContent='OFFLINE';
      els.rankingEmpty.textContent='Ranking is temporarily unavailable.';
      els.rankingEmpty.classList.remove('hidden');
    }
  }

  async function loadProfileStats(){
    renderProfileIdentity();
    const localBest=Math.max(...['classic','blind','daily','one_shot'].map(m=>Number(localStorage.getItem(`o.best.v3.${m}`)||0)),0);
    if(!profile){
      els.statBest.textContent=localBest?localBest.toFixed(2):'—';
      els.statAttempts.textContent='0';
      els.statAverage.textContent='—';
      els.statDaily.textContent=bestForMode('daily')||'—';
      els.historyList.innerHTML='<div class="empty-state">Claim a username to save V3 history.</div>';
      return;
    }
    try{
      const rows=await api(`o_scores?installation_id=eq.${encodeURIComponent(installationId)}&score_version=eq.v3&select=score,mode,daily_date,created_at&order=created_at.desc&limit=200`);
      const scores=(rows||[]).map(r=>Number(r.score));
      const daily=(rows||[]).filter(r=>r.mode==='daily').map(r=>Number(r.score));
      els.statBest.textContent=scores.length?Math.max(...scores).toFixed(2):(localBest?localBest.toFixed(2):'—');
      els.statAttempts.textContent=String(scores.length);
      els.statAverage.textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2):'—';
      els.statDaily.textContent=daily.length?Math.max(...daily).toFixed(2):(bestForMode('daily')||'—');
      els.historyList.innerHTML='';
      (rows||[]).slice(0,8).forEach(r=>{
        const item=document.createElement('div');
        item.className='history-item';
        const d=new Date(r.created_at);
        item.innerHTML=`<div><span>${String(r.mode).replace('_',' ').toUpperCase()}</span><b>${Number(r.score).toFixed(2)}</b></div><time>${new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(d)}</time>`;
        els.historyList.appendChild(item);
      });
      if(!rows?.length) els.historyList.innerHTML='<div class="empty-state">Your next V3 circle will appear here.</div>';
    } catch {
      els.historyList.innerHTML='<div class="empty-state">History is temporarily unavailable.</div>';
    }
  }

  function randomChallengeSlug(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes=crypto.getRandomValues(new Uint8Array(9));
    return [...bytes].map(v=>chars[v%chars.length]).join('');
  }

  async function createShareChallenge(){
    if(!lastResult)return null;
    if(currentShareSlug) return currentShareSlug;
    for(let attempt=0;attempt<3;attempt++){
      const slug=randomChallengeSlug();
      try{
        await api('o_share_challenges',{
          method:'POST',
          headers:{Prefer:'return=minimal'},
          body:JSON.stringify({
            slug,
            installation_id:installationId,
            target_score:+lastResult.score.toFixed(2),
            source_mode:gameMode,
            score_version:'v3',
            expires_at:new Date(Date.now()+30*86400000).toISOString()
          })
        });
        currentShareSlug=slug;
        return slug;
      }catch(err){ if(err.status!==409) throw err; }
    }
    throw new Error('Could not create challenge');
  }

  function challengeUrl(slug){
    const url=new URL(location.href);
    url.search='';
    url.hash='';
    url.searchParams.set('c',slug);
    return url.toString();
  }

  async function buildShareCardBlob(url){
    const c=document.createElement('canvas');
    c.width=1080; c.height=1920;
    const g=c.getContext('2d');
    g.fillStyle='#0c0c0b'; g.fillRect(0,0,c.width,c.height);

    g.fillStyle='#f0ede5';
    g.font='800 74px system-ui, sans-serif';
    g.fillText('O.',82,122);
    g.fillStyle='#8c8b85';
    g.font='700 24px system-ui, sans-serif';
    g.fillText('DRAW THE IMPOSSIBLE',82,178);

    g.fillStyle='#f0ede5';
    g.font='780 210px system-ui, sans-serif';
    g.fillText(lastResult.score.toFixed(2),72,470);
    g.fillStyle='#d4f45d';
    g.font='800 48px system-ui, sans-serif';
    g.fillText('%',872,350);

    const label=rank(lastResult.score)[0];
    g.fillStyle='#aaa8a1';
    g.font='800 26px system-ui, sans-serif';
    g.fillText(label,84,538);

    const drawCx=540,drawCy=1040,targetR=305;
    if(fitted&&points.length>1){
      const scale=targetR/Math.max(1,fitted.r);
      g.save();
      g.translate(drawCx,drawCy);
      g.scale(scale,scale);
      g.translate(-fitted.cx,-fitted.cy);
      g.strokeStyle='#f0ede5';
      g.lineWidth=3.2/scale;
      g.lineCap='round'; g.lineJoin='round';
      g.beginPath(); g.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++) g.lineTo(points[i].x,points[i].y);
      g.stroke();
      g.restore();

      g.save();
      g.strokeStyle='#d4f45d';
      g.globalAlpha=.72;
      g.lineWidth=2;
      g.setLineDash([10,14]);
      g.beginPath(); g.arc(drawCx,drawCy,targetR,0,Math.PI*2); g.stroke();
      g.restore();
    }

    g.strokeStyle='rgba(240,237,229,.14)';
    g.beginPath(); g.moveTo(82,1500); g.lineTo(998,1500); g.stroke();
    g.fillStyle='#f0ede5';
    g.font='760 48px system-ui, sans-serif';
    g.fillText('CAN YOU BEAT THIS?',82,1595);
    g.fillStyle='#8c8b85';
    g.font='500 28px system-ui, sans-serif';
    g.fillText('One stroke. No corrections.',82,1650);
    g.fillStyle='#d4f45d';
    g.font='700 24px system-ui, sans-serif';
    g.fillText(new URL(url).host.toUpperCase(),82,1775);

    return await new Promise(resolve=>c.toBlob(resolve,'image/png',.94));
  }

  async function shareResult(){
    if(!lastResult)return;
    try{
      showToast('BUILDING CHALLENGE');
      const slug=await createShareChallenge();
      const url=challengeUrl(slug);
      const text=`O. · ${lastResult.score.toFixed(2)}% · ${rank(lastResult.score)[0]}\nBeat my circle.`;
      const blob=await buildShareCardBlob(url);
      const file=blob?new File([blob],`O-${lastResult.score.toFixed(2)}.png`,{type:'image/png'}):null;

      if(navigator.share){
        if(file && navigator.canShare?.({files:[file]})) await navigator.share({title:'O. — Draw the impossible',text,url,files:[file]});
        else await navigator.share({title:'O. — Draw the impossible',text,url});
      }else if(navigator.clipboard){
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast('CHALLENGE LINK COPIED');
      }
    }catch(err){
      if(err?.name!=='AbortError') showToast('SHARE UNAVAILABLE');
    }
  }

  async function updateOneShotStatus(){
    const local=localStorage.getItem(`o.oneshot.v3.${todayIstanbul()}`);
    if(local){
      els.oneShotStatus.textContent=`LOCKED TODAY · ${Number(local).toFixed(2)}`;
      return true;
    }
    if(!profile){
      els.oneShotStatus.textContent='ONE ATTEMPT. NO RETRY.';
      return false;
    }
    try{
      const rows=await api(`o_scores?installation_id=eq.${encodeURIComponent(installationId)}&mode=eq.one_shot&daily_date=eq.${todayIstanbul()}&score_version=eq.v3&select=score&limit=1`);
      if(rows?.length){
        const value=Number(rows[0].score).toFixed(2);
        localStorage.setItem(`o.oneshot.v3.${todayIstanbul()}`,value);
        els.oneShotStatus.textContent=`LOCKED TODAY · ${value}`;
        return true;
      }
    }catch{}
    els.oneShotStatus.textContent='ONE ATTEMPT. NO RETRY.';
    return false;
  }

  async function startOneShot(){
    if(!profile){
      pendingModeAfterUsername='one_shot';
      openUsername();
      showToast('CHOOSE A NAME FIRST');
      return;
    }
    if(await updateOneShotStatus()){
      showToast('ONE SHOT · ALREADY USED');
      return;
    }
    startGame('one_shot');
  }

  function closeChallengeDialog(){
    if(!els.challengeDialog)return;
    if(typeof els.challengeDialog.close==='function' && els.challengeDialog.open) els.challengeDialog.close();
    else els.challengeDialog.removeAttribute('open');
  }

  function openChallengeDialog(challenge,username){
    activeChallenge=challenge;
    els.challengeTarget.textContent=Number(challenge.target_score).toFixed(2);
    els.challengeFrom.textContent=username?`${username} challenged you.`:'A player challenged you.';
    if(typeof els.challengeDialog.showModal==='function') els.challengeDialog.showModal();
    else els.challengeDialog.setAttribute('open','');
  }

  async function loadChallengeFromUrl(){
    const slug=new URLSearchParams(location.search).get('c');
    if(!slug || !/^[A-Za-z0-9_-]{7,14}$/.test(slug)) return;
    try{
      const rows=await api(`o_share_challenges?slug=eq.${encodeURIComponent(slug)}&score_version=eq.v3&select=slug,installation_id,target_score,source_mode,expires_at&limit=1`);
      const challenge=rows?.[0];
      if(!challenge)return;
      let username=null;
      try{
        const profiles=await api(`o_profiles?installation_id=eq.${encodeURIComponent(challenge.installation_id)}&select=username&limit=1`);
        username=profiles?.[0]?.username||null;
      }catch{}
      openChallengeDialog(challenge,username);
    }catch{}
  }

  function vibrate(pattern){ if(navigator.vibrate) navigator.vibrate(pattern); }
  function showToast(text){ els.toast.textContent=text; els.toast.classList.add('visible'); clearTimeout(hideTimer); hideTimer=setTimeout(()=>els.toast.classList.remove('visible'),1450); }

  // navigation
  $('classicButton').addEventListener('click',()=>startGame('classic'));
  $('dailyButton').addEventListener('click',()=>startGame('daily'));
  $('oneShotButton').addEventListener('click',startOneShot);
  $('exitGame').addEventListener('click',()=>showScreen('home'));
  $('gameBestButton').addEventListener('click',()=>showToast(bestForMode(gameMode)?`BEST · ${bestForMode(gameMode)}`:'NO SCORE YET'));
  qsa('[data-screen]').forEach(b=>b.addEventListener('click',()=>showScreen(b.dataset.screen)));
  qsa('[data-back-home]').forEach(b=>b.addEventListener('click',()=>showScreen('home')));
  $('retryButton').addEventListener('click',resetRound);
  $('analysisButton').addEventListener('click',openAnalysis);
  $('closeAnalysis').addEventListener('click',closeAnalysis);
  $('shareButton').addEventListener('click',shareResult);
  $('acceptChallenge').addEventListener('click',()=>{closeChallengeDialog();startGame('challenge');});
  $('closeChallenge').addEventListener('click',closeChallengeDialog);
  $('rankingJoinButton').addEventListener('click',openUsername);
  els.claimProfileButton.addEventListener('click',openUsername);
  $('closeUsername').addEventListener('click',()=>{pendingModeAfterUsername=null;closeUsername();});
  $('refreshRankings').addEventListener('click',loadRankings);
  $('settingsButton').addEventListener('click',()=>showToast('SCORE V3 · HAPTICS ON'));
  qsa('[data-ranking]').forEach(btn=>btn.addEventListener('click',()=>{qsa('[data-ranking]').forEach(b=>b.classList.toggle('active',b===btn));rankingMode=btn.dataset.ranking;loadRankings();}));
  qsa('[data-metric]').forEach(btn=>btn.addEventListener('click',openAnalysis));

  els.usernameForm.addEventListener('submit',async(e)=>{
    e.preventDefault(); els.usernameError.textContent=''; els.saveUsername.disabled=true;
    try{
      profile=await claimUsername(els.usernameInput.value); renderProfileIdentity(); closeUsername(); showToast('NAME CLAIMED');
      if(pendingScore) await submitScore(pendingScore);
      const nextMode=pendingModeAfterUsername;
      pendingModeAfterUsername=null;
      if(currentScreen==='profile') loadProfileStats();
      updateOneShotStatus();
      if(nextMode==='one_shot') setTimeout(startOneShot,80);
    }catch(err){els.usernameError.textContent=err.message||'Could not claim name.';}finally{els.saveUsername.disabled=false;}
  });

  els.canvas.addEventListener('pointerdown',begin,{passive:false}); els.canvas.addEventListener('pointermove',move,{passive:false}); els.canvas.addEventListener('pointerup',end,{passive:false}); els.canvas.addEventListener('pointercancel',end,{passive:false});
  window.addEventListener('resize',resizeCanvas); document.addEventListener('contextmenu',e=>e.preventDefault());

  displayDailyDate();
  loadProfile().then(()=>updateOneShotStatus()).catch(()=>updateOneShotStatus());
  resizeCanvas();
  loadChallengeFromUrl();
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
