(() => {
  'use strict';

  const PROGRESS_API = `${config.supabaseUrl || ''}/functions/v1/o-progress`;
  let precisionSnapshot = null;

  const LEAGUES = [
    { name:'RAW', floor:0, ceil:700 },
    { name:'FORM', floor:700, ceil:800 },
    { name:'PRECISE', floor:800, ceil:870 },
    { name:'BLACK', floor:870, ceil:930 },
    { name:'ELITE', floor:930, ceil:970 },
    { name:'PERFECT?', floor:970, ceil:1000 }
  ];

  function ensureProgressUI(){
    if(!document.getElementById('precisionCard')){
      const anchor=document.querySelector('.profile-screen .season-card');
      if(anchor){
        anchor.insertAdjacentHTML('afterend', `
          <section class="precision-card" id="precisionCard" aria-label="Precision rating">
            <div class="precision-head">
              <div><span>PRECISION RATING</span><b id="precisionLeague">UNRANKED</b></div>
              <strong id="precisionRating">—</strong>
            </div>
            <div class="precision-meta"><span id="precisionState">NO VERIFIED DATA</span><b id="precisionNext">—</b></div>
            <div class="precision-track"><i id="precisionTrack"></i></div>
          </section>
          <section class="daily-recap-card" id="dailyRecapCard">
            <div class="section-label"><span>TODAY'S DAILY</span><b id="dailyRecapDate">—</b></div>
            <div class="daily-recap-grid">
              <div><small>BEST</small><strong id="dailyRecapBest">—</strong></div>
              <div><small>ATTEMPTS</small><strong id="dailyRecapAttempts">0</strong></div>
              <div><small>GAIN</small><strong id="dailyRecapGain">—</strong></div>
            </div>
            <p id="dailyRecapCopy">No verified Daily yet.</p>
          </section>
        `);
      }
    }

    if(!document.getElementById('precisionTrend')){
      const stats=document.querySelector('.profile-screen .stats-grid');
      if(stats){
        stats.insertAdjacentHTML('afterend', `
          <section class="precision-trend" id="precisionTrend">
            <div class="section-label"><span>30 DAY CURVE</span><b id="trendLabel">VERIFIED BEST</b></div>
            <svg id="trendChart" viewBox="0 0 320 108" role="img" aria-label="30 day verified score trend" preserveAspectRatio="none">
              <path id="trendGrid" d="M0 27H320M0 54H320M0 81H320"></path>
              <path id="trendPath" d=""></path>
              <g id="trendDots"></g>
            </svg>
            <div class="trend-footer"><span id="trendStart">—</span><b id="trendDelta">—</b><span id="trendEnd">—</span></div>
          </section>
        `);
      }
    }

    if(!document.getElementById('homePrecision')){
      const season=document.getElementById('homeSeason');
      if(season) season.insertAdjacentHTML('afterend','<span class="home-precision" id="homePrecision">UNRANKED</span>');
    }

    if(!document.getElementById('resultPrecision')){
      const context=document.getElementById('resultContext');
      if(context) context.insertAdjacentHTML('beforeend','<i class="precision-divider"></i><span id="resultPrecision"></span>');
    }
  }

  async function syncProgress(){
    if(!profile || !API_KEY || !config.supabaseUrl) return null;
    const response=await fetch(PROGRESS_API,{
      method:'POST',
      headers:{apikey:API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({installationId,installationSecret})
    });
    const text=await response.text();
    let data=null;
    if(text){try{data=JSON.parse(text)}catch{data=null}}
    if(!response.ok) throw new Error(data?.error || `Progress sync failed (${response.status})`);
    return data;
  }

  function leagueInfo(rating){
    const r=Number(rating)||0;
    return LEAGUES.find(x=>r>=x.floor && r<x.ceil) || LEAGUES[LEAGUES.length-1];
  }

  function nextLeague(rating){
    const current=leagueInfo(rating);
    const i=LEAGUES.findIndex(x=>x.name===current.name);
    return i>=0 && i<LEAGUES.length-1 ? LEAGUES[i+1] : null;
  }

  function renderTrend(rows=[]){
    const path=document.getElementById('trendPath');
    const dots=document.getElementById('trendDots');
    if(!path || !dots) return;
    const active=(rows||[]).filter(x=>Number.isFinite(Number(x.best)) && x.best!==null);
    const start=document.getElementById('trendStart');
    const end=document.getElementById('trendEnd');
    const delta=document.getElementById('trendDelta');
    start.textContent=rows?.[0]?.date?.slice(5)?.replace('-','.') || '—';
    end.textContent=rows?.at(-1)?.date?.slice(5)?.replace('-','.') || '—';
    dots.innerHTML='';

    if(!active.length){
      path.setAttribute('d','');
      delta.textContent='NO DATA YET';
      return;
    }

    const values=active.map(x=>Number(x.best));
    const min=Math.max(0,Math.min(...values)-4);
    const max=Math.min(100,Math.max(...values)+4);
    const range=Math.max(8,max-min);
    const points=active.map(row=>{
      const idx=rows.findIndex(x=>x.date===row.date);
      const x=rows.length>1?(idx/(rows.length-1))*320:160;
      const y=98-((Number(row.best)-min)/range)*88;
      return{x,y,value:Number(row.best),date:row.date};
    });

    path.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' '));
    for(const p of points){
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',String(p.x)); c.setAttribute('cy',String(p.y)); c.setAttribute('r','2.2');
      dots.appendChild(c);
    }
    const first=points[0].value,last=points.at(-1).value,d=last-first;
    delta.textContent=points.length<2?`BEST ${last.toFixed(2)}`:`${d>=0?'+':''}${d.toFixed(2)} / 30D`;
  }

  function renderPrecision(snapshot,{result=false}={}){
    if(!snapshot) return;
    precisionSnapshot=snapshot;
    const r=snapshot.rating || {};
    const rating=Number(r.rating)||0;
    const league=r.league || 'UNRANKED';
    const current=leagueInfo(rating);
    const next=nextLeague(rating);
    const progress=current.ceil>current.floor?((rating-current.floor)/(current.ceil-current.floor))*100:100;

    const ratingEl=document.getElementById('precisionRating');
    const leagueEl=document.getElementById('precisionLeague');
    const stateEl=document.getElementById('precisionState');
    const nextEl=document.getElementById('precisionNext');
    const track=document.getElementById('precisionTrack');
    const home=document.getElementById('homePrecision');
    if(ratingEl) ratingEl.textContent=r.attempts?String(rating):'—';
    if(leagueEl) leagueEl.textContent=league;
    if(stateEl) stateEl.textContent=r.attempts ? `${r.provisional?'PROVISIONAL · ':''}${r.attempts} VERIFIED` : 'NO VERIFIED DATA';
    if(nextEl) nextEl.textContent=next?`NEXT ${next.name} · ${next.floor}`:'MAX TIER';
    if(track) requestAnimationFrame(()=>track.style.width=`${Math.max(0,Math.min(100,progress))}%`);
    if(home) home.textContent=r.provisional && r.attempts?`${league} · P` : league;

    const recap=snapshot.dailyRecap||{};
    const recapDate=document.getElementById('dailyRecapDate');
    const recapBest=document.getElementById('dailyRecapBest');
    const recapAttempts=document.getElementById('dailyRecapAttempts');
    const recapGain=document.getElementById('dailyRecapGain');
    const recapCopy=document.getElementById('dailyRecapCopy');
    if(recapDate) recapDate.textContent=recap.date?.slice(5)?.replace('-','.') || '—';
    if(recapBest) recapBest.textContent=recap.best!==null&&recap.best!==undefined?Number(recap.best).toFixed(2):'—';
    if(recapAttempts) recapAttempts.textContent=String(recap.attempts||0);
    if(recapGain) recapGain.textContent=recap.improvement!==null&&recap.improvement!==undefined?`${Number(recap.improvement)>=0?'+':''}${Number(recap.improvement).toFixed(2)}`:'—';
    if(recapCopy){
      recapCopy.textContent=recap.attempts?`${recap.attempts} verified Daily attempt${recap.attempts===1?'':'s'}. Best mark ${Number(recap.best).toFixed(2)}.`:'No verified Daily yet.';
    }

    renderTrend(snapshot.trend||[]);

    const resultPrecision=document.getElementById('resultPrecision');
    if(resultPrecision) resultPrecision.textContent=r.attempts?`PR ${rating} · ${league}`:'';
    if(result && r.attempts){
      const context=document.getElementById('resultContext');
      if(context) context.classList.remove('hidden');
    }
  }

  async function refreshPrecision({result=false,silent=true}={}){
    if(!profile) return null;
    try{
      const snapshot=await syncProgress();
      renderPrecision(snapshot,{result});
      return snapshot;
    }catch(err){
      if(!silent && typeof showToast==='function') showToast('RATING SYNC UNAVAILABLE');
      return null;
    }
  }

  ensureProgressUI();

  if(typeof refreshRetention==='function'){
    const baseRefreshRetention=refreshRetention;
    refreshRetention=async function(...args){
      const out=await baseRefreshRetention(...args);
      const result=!!args?.[1]?.result;
      await refreshPrecision({result});
      return out;
    };
  }

  if(typeof loadProfileStats==='function'){
    const baseLoadProfileStats=loadProfileStats;
    loadProfileStats=async function(...args){
      const out=await baseLoadProfileStats(...args);
      await refreshPrecision();
      return out;
    };
  }

  setTimeout(()=>{ if(profile) refreshPrecision(); },180);
})();
