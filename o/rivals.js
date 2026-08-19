(() => {
  'use strict';

  const RIVALS_API = `${config.supabaseUrl || ''}/functions/v1/o-rivals`;

  function ensureRivalsUI(){
    if(document.getElementById('rivalsSection')) return;
    const achievement=document.querySelector('.profile-screen .achievement-section');
    if(!achievement) return;
    achievement.insertAdjacentHTML('afterend', `
      <section class="rivals-section" id="rivalsSection">
        <div class="section-label"><span>RIVALS</span><b id="rivalsCount">0 MATCHES</b></div>
        <div class="rivals-list" id="rivalsList">
          <div class="rivals-empty">A verified challenge creates your first rivalry.</div>
        </div>
      </section>
    `);
  }

  async function syncRivals(){
    if(!profile || !API_KEY || !config.supabaseUrl) return null;
    const response=await fetch(RIVALS_API,{
      method:'POST',
      headers:{apikey:API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({installationId,installationSecret})
    });
    const text=await response.text();
    let data=null;
    if(text){try{data=JSON.parse(text)}catch{data=null}}
    if(!response.ok) throw new Error(data?.error || `Rival sync failed (${response.status})`);
    return data;
  }

  function shortDate(value){
    if(!value) return '—';
    const d=new Date(value);
    if(Number.isNaN(+d)) return '—';
    return new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(d).toUpperCase();
  }

  function renderRivals(data){
    ensureRivalsUI();
    const list=document.getElementById('rivalsList');
    const count=document.getElementById('rivalsCount');
    if(!list || !count) return;
    const rivals=data?.rivals||[];
    count.textContent=`${data?.totalMatches||0} MATCH${Number(data?.totalMatches||0)===1?'':'ES'}`;
    list.innerHTML='';
    if(!rivals.length){
      list.innerHTML='<div class="rivals-empty">A verified challenge creates your first rivalry.</div>';
      return;
    }
    rivals.slice(0,6).forEach((r,index)=>{
      const row=document.createElement('div');
      row.className='rival-row';
      row.innerHTML=`
        <span class="rival-index">${String(index+1).padStart(2,'0')}</span>
        <div class="rival-name"><b></b><span></span></div>
        <div class="rival-record"><strong>${r.wins}–${r.losses}${r.ties?`–${r.ties}`:''}</strong><small>${r.matches} MATCH${r.matches===1?'':'ES'}</small></div>
      `;
      row.querySelector('.rival-name b').textContent=r.username||'anonymous';
      row.querySelector('.rival-name span').textContent=`${r.countryCode||'GLOBAL'} · ${shortDate(r.lastPlayed)}`;
      list.appendChild(row);
    });
  }

  async function refreshRivals({silent=true}={}){
    if(!profile) return null;
    try{
      const data=await syncRivals();
      renderRivals(data);
      return data;
    }catch(err){
      if(!silent && typeof showToast==='function') showToast('RIVALS SYNC UNAVAILABLE');
      return null;
    }
  }

  ensureRivalsUI();

  if(typeof loadProfileStats==='function'){
    const baseLoadProfileStats=loadProfileStats;
    loadProfileStats=async function(...args){
      const out=await baseLoadProfileStats(...args);
      await refreshRivals();
      return out;
    };
  }

  if(typeof refreshRetention==='function'){
    const baseRefreshRetention=refreshRetention;
    refreshRetention=async function(...args){
      const out=await baseRefreshRetention(...args);
      const isResult=!!args?.[1]?.result;
      if(isResult && gameMode==='challenge') await refreshRivals();
      return out;
    };
  }

  setTimeout(()=>{ if(profile) refreshRivals(); },260);
})();
