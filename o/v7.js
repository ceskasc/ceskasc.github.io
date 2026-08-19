(() => {
  'use strict';

  const GHOST_API = `${config.supabaseUrl || ''}/functions/v1/o-ghost`;
  const SEASON_API = `${config.supabaseUrl || ''}/functions/v1/o-season-awards`;
  const LEAGUE_ORDER = ['RAW','FORM','PRECISE','BLACK','ELITE','PERFECT?'];

  let personalGhost = null;
  let beatSelfActive = false;
  let beatTargetScore = null;
  let ghostLoadPromise = null;
  let seasonAwards = null;

  async function privateEdge(url, payload={}) {
    if (!profile || !API_KEY || !config.supabaseUrl) throw new Error('Profile required');
    const response = await fetch(url, {
      method:'POST',
      headers:{apikey:API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({installationId, installationSecret, ...payload})
    });
    const text=await response.text();
    let data=null;
    if(text){try{data=JSON.parse(text)}catch{data=null}}
    if(!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
    return data;
  }

  async function loadPersonalGhost(force=false) {
    if(!profile) return null;
    if(personalGhost && !force) return personalGhost;
    if(ghostLoadPromise && !force) return ghostLoadPromise;
    ghostLoadPromise=privateEdge(GHOST_API,{action:'load'})
      .then(data=>{personalGhost=data?.ghost||null;return personalGhost})
      .catch(()=>null)
      .finally(()=>{ghostLoadPromise=null});
    return ghostLoadPromise;
  }

  async function saveVerifiedGhost(scoreId) {
    if(!profile || !scoreId || !points?.length) return null;
    try{
      const data=await privateEdge(GHOST_API,{action:'save',scoreId:Number(scoreId),stroke:serializeStrokeForServer()});
      if(data?.saved || !personalGhost || Number(data?.score)>Number(personalGhost?.score||0)) await loadPersonalGhost(true);
      updateBeatButton();
      return data;
    } catch { return null; }
  }

  function ensureV7UI() {
    const oneShot=document.getElementById('oneShotButton');
    if(oneShot && !document.getElementById('beatSelfButton')) {
      oneShot.insertAdjacentHTML('afterend', `
        <button class="beat-self-cta" id="beatSelfButton" type="button">
          <span><b>BEAT YOURSELF</b><i>GHOST</i></span>
          <small id="beatSelfStatus">CREATE A VERIFIED BEST FIRST.</small>
          <span class="arrow">→</span>
        </button>`);
      document.getElementById('beatSelfButton').addEventListener('click', startBeatSelf);
    }

    const actions=document.querySelector('.result-actions');
    if(actions && !document.getElementById('rematchButton')) {
      actions.insertAdjacentHTML('afterend','<button class="rematch-button hidden" id="rematchButton" type="button">CHALLENGE BACK ↗</button>');
      document.getElementById('rematchButton').addEventListener('click', async()=>{
        if(!lastVerifiedScore || lastVerifiedScore.verificationStatus!=='verified') { showToast('VERIFY SCORE FIRST'); return; }
        await shareResult();
      });
    }

    if(!document.getElementById('leaguePromotion')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="league-promotion" id="leaguePromotion" aria-hidden="true">
          <div class="league-orbit"><i></i><span>O.</span></div>
          <p>PRECISION CLASS ADVANCED</p>
          <strong id="promotionLeague">BLACK</strong>
          <small id="promotionRating">PR 870</small>
        </div>`);
    }

    const identity=document.querySelector('.profile-identity > div');
    if(identity && !document.getElementById('legacyTitle')) {
      identity.insertAdjacentHTML('beforeend','<span class="legacy-title hidden" id="legacyTitle"></span>');
    }

    const achievementSection=document.querySelector('.achievement-section');
    if(achievementSection && !document.getElementById('seasonTitleArchive')) {
      achievementSection.insertAdjacentHTML('beforebegin', `
        <section class="season-title-section" id="seasonTitleArchive">
          <div class="section-label"><span>SEASON TITLES</span><b id="seasonTitleCount">0 EARNED</b></div>
          <div id="seasonTitleList" class="season-title-list"><div class="achievement-empty">Permanent titles settle after each season.</div></div>
        </section>`);
    }
  }

  function updateBeatButton() {
    const status=document.getElementById('beatSelfStatus');
    const button=document.getElementById('beatSelfButton');
    if(!status||!button)return;
    if(!profile){status.textContent='CLAIM A NAME TO CREATE YOUR GHOST.';button.classList.remove('ready');return;}
    if(!personalGhost){status.textContent='CREATE A VERIFIED BEST FIRST.';button.classList.remove('ready');return;}
    status.textContent=`GHOST BEST · ${Number(personalGhost.score).toFixed(2)}`;
    button.classList.add('ready');
  }

  function ghostCenterAndRadius() {
    const canvasRect=els.canvas.getBoundingClientRect();
    const cueRect=els.centerCue?.getBoundingClientRect();
    const cx=cueRect?.width ? cueRect.left+cueRect.width/2-canvasRect.left : canvasRect.width/2;
    const cy=cueRect?.height ? cueRect.top+cueRect.height/2-canvasRect.top : canvasRect.height*.48;
    return {cx,cy,r:Math.min(canvasRect.width*.34,canvasRect.height*.25)};
  }

  function drawGhost() {
    if(!beatSelfActive || !personalGhost?.normalized_points?.length) return;
    const {cx,cy,r}=ghostCenterAndRadius();
    const pts=personalGhost.normalized_points;
    ctx.save();
    ctx.strokeStyle='rgba(212,244,93,.34)';
    ctx.lineWidth=1.25;
    ctx.setLineDash([3.5,7]);
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const x=cx+Number(p[0])*r, y=cy+Number(p[1])*r;
      if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.restore();
  }

  async function startBeatSelf() {
    if(!profile){openUsername();showToast('CHOOSE A NAME FIRST');return;}
    const ghost=await loadPersonalGhost();
    if(!ghost){showToast('SET A VERIFIED BEST FIRST');return;}
    beatSelfActive=true;
    beatTargetScore=Number(ghost.score);
    startGame('classic');
    beatSelfActive=true;
    els.gameModeEyebrow.textContent='YOUR GHOST';
    els.gameModeLabel.textContent='BEAT YOURSELF';
    els.promptIndex.textContent='VS';
    els.promptText.textContent=`Beat ${beatTargetScore.toFixed(2)}.`;
    els.gameBest.textContent=beatTargetScore.toFixed(2);
    redraw();
  }

  function applyBeatVerdict(score) {
    if(!beatSelfActive || beatTargetScore===null) return;
    const delta=Number(score)-Number(beatTargetScore);
    els.resultRank.textContent=delta>0?'NEW SELF.':Math.abs(delta)<.01?'EXACT MATCH':'GHOST HOLDS';
    els.resultVerdict.textContent=delta>0?`${delta.toFixed(2)} above your ghost.`:`${Math.abs(delta).toFixed(2)} short of your best.`;
  }

  const baseRedraw=redraw;
  redraw=function(...args){
    baseRedraw(...args);
    drawGhost();
  };

  const baseStartGame=startGame;
  startGame=function(mode){
    if(mode!=='classic' || !beatSelfActive){beatSelfActive=false;beatTargetScore=null;}
    return baseStartGame(mode);
  };

  const baseShowResult=showResult;
  showResult=function(a){
    const wasBeat=beatSelfActive;
    const target=beatTargetScore;
    const out=baseShowResult(a);
    if(wasBeat){beatSelfActive=true;beatTargetScore=target;applyBeatVerdict(a.score);}
    const rematch=document.getElementById('rematchButton');
    if(rematch)rematch.classList.add('hidden');
    return out;
  };

  const baseApplyVerified=applyVerifiedResult;
  applyVerifiedResult=function(data){
    const wasBeat=beatSelfActive;
    const target=beatTargetScore;
    const out=baseApplyVerified(data);
    if(wasBeat){beatSelfActive=true;beatTargetScore=target;applyBeatVerdict(data.score);}
    if(data?.verificationStatus==='verified'){
      saveVerifiedGhost(Number(data.id));
      const rematch=document.getElementById('rematchButton');
      if(rematch) rematch.classList.toggle('hidden',gameMode!=='challenge');
    }
    return out;
  };

  function showPromotion(league,rating){
    const overlay=document.getElementById('leaguePromotion');
    if(!overlay)return;
    document.getElementById('promotionLeague').textContent=league;
    document.getElementById('promotionRating').textContent=`PR ${rating||'—'}`;
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden','false');
    vibrate([16,30,26,42,34]);
    setTimeout(()=>{overlay.classList.remove('visible');overlay.setAttribute('aria-hidden','true');},2300);
  }

  function checkLeaguePromotion(){
    const league=document.getElementById('precisionLeague')?.textContent?.trim();
    const state=document.getElementById('precisionState')?.textContent||'';
    const rating=document.getElementById('precisionRating')?.textContent?.trim();
    if(!league||league==='UNRANKED'||state.includes('PROVISIONAL'))return;
    const key='o.precision.league.v7';
    const prev=localStorage.getItem(key);
    if(!prev){localStorage.setItem(key,league);return;}
    const before=LEAGUE_ORDER.indexOf(prev),after=LEAGUE_ORDER.indexOf(league);
    if(after>before&&before>=0)showPromotion(league,rating);
    if(after!==before)localStorage.setItem(key,league);
  }

  function watchLeague(){
    const league=document.getElementById('precisionLeague');
    const state=document.getElementById('precisionState');
    if(!league||!state){setTimeout(watchLeague,180);return;}
    const observer=new MutationObserver(()=>setTimeout(checkLeaguePromotion,30));
    observer.observe(league,{childList:true,subtree:true,characterData:true});
    observer.observe(state,{childList:true,subtree:true,characterData:true});
    checkLeaguePromotion();
  }

  async function syncSeasonAwards(){
    if(!profile)return null;
    try{
      const data=await privateEdge(SEASON_API,{});
      seasonAwards=data;
      renderSeasonAwards(data);
      return data;
    }catch{return null;}
  }

  function renderSeasonAwards(data){
    const current=data?.current;
    const badge=document.getElementById('legacyTitle');
    if(badge){
      if(current?.title){badge.textContent=current.title;badge.classList.remove('hidden');}
      else badge.classList.add('hidden');
    }
    const list=document.getElementById('seasonTitleList');
    const count=document.getElementById('seasonTitleCount');
    if(!list||!count)return;
    const awards=data?.awards||[];
    count.textContent=`${awards.length} EARNED`;
    if(!awards.length){list.innerHTML='<div class="achievement-empty">Permanent titles settle after each season.</div>';return;}
    list.innerHTML='';
    for(const award of awards){
      const row=document.createElement('div');
      row.className='season-title-row';
      row.innerHTML='<div><b></b><span></span></div><strong></strong>';
      row.querySelector('b').textContent=award.title;
      row.querySelector('span').textContent=award.o_seasons?.name||award.season_id;
      row.querySelector('strong').textContent=award.season_rank?`#${award.season_rank}`:'—';
      list.appendChild(row);
    }
  }

  if(typeof loadProfileStats==='function'){
    const baseLoadProfileStatsV7=loadProfileStats;
    loadProfileStats=async function(...args){
      const out=await baseLoadProfileStatsV7(...args);
      await Promise.all([loadPersonalGhost(),syncSeasonAwards()]);
      updateBeatButton();
      return out;
    };
  }

  ensureV7UI();
  watchLeague();
  loadProfile().then(async()=>{
    if(profile)await Promise.all([loadPersonalGhost(),syncSeasonAwards()]);
    updateBeatButton();
  }).catch(updateBeatButton);
})();
