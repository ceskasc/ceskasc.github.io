(() => {
'use strict';

const MQ = window.matchMedia('(min-width: 980px)');
let desktopBuilt = false;
let observer = null;

function isTr(){ return document.documentElement.lang === 'tr' || document.body.classList.contains('locale-tr'); }
function L(en,tr){ return isTr() ? tr : en; }
function byId(id){ return document.getElementById(id); }
function setText(id,value){ const el=byId(id); if(el && el.textContent!==String(value)) el.textContent=String(value); }
function existingNav(screen){ return document.querySelector(`.bottom-nav [data-screen="${screen}"]`); }
function go(screen){ existingNav(screen)?.click(); }
function clickMode(id){ byId(id)?.click(); }

function createRail(){
  if(byId('desktopRail')) return;
  const rail=document.createElement('aside');
  rail.id='desktopRail';
  rail.className='desktop-rail';
  rail.innerHTML=`
    <div class="desktop-rail-brand"><b>O<span>.</span></b><small id="desktopSeason">SEASON 01</small></div>
    <nav class="desktop-rail-nav" aria-label="Desktop navigation">
      <button type="button" data-desk-screen="home"><i>○</i><span>${L('Play','Oyna')}</span><kbd>H</kbd></button>
      <button type="button" data-desk-screen="rankings"><i>≡</i><span>${L('Rankings','Sıralama')}</span><kbd>R</kbd></button>
      <button type="button" data-desk-screen="profile"><i>·</i><span>${L('Profile','Profil')}</span><kbd>P</kbd></button>
    </nav>
    <div class="desktop-rail-foot">
      <span>${L('DRAW THE IMPOSSIBLE','İMKÂNSIZI ÇİZ')}</span>
      <small>${L('Desktop edition','Masaüstü sürümü')}</small>
    </div>`;
  document.body.appendChild(rail);
  rail.querySelectorAll('[data-desk-screen]').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.deskScreen)));
}

function buildHome(){
  const home=byId('homeScreen');
  const copy=home?.querySelector('.home-copy');
  const actions=home?.querySelector('.home-actions');
  const top=home?.querySelector('.home-topline');
  if(!home||!copy||!actions||byId('desktopHomeWorkspace')) return;

  const workspace=document.createElement('div');
  workspace.id='desktopHomeWorkspace';
  workspace.className='desktop-home-workspace';
  workspace.innerHTML=`
    <section class="desktop-hero-pane" id="desktopHeroPane"><div class="desktop-orbit" aria-hidden="true"><i></i><span></span></div></section>
    <section class="desktop-mode-pane" id="desktopModePane"></section>
    <aside class="desktop-status-pane" id="desktopStatusPane">
      <div class="desktop-player-card">
        <div class="desktop-player-avatar" id="desktopPlayerAvatar"><img alt=""><span>?</span></div>
        <div><small>${L('PLAYER','OYUNCU')}</small><b id="desktopPlayerName">—</b><em id="desktopPlayerState">${L('SECURE PROFILE','GÜVENLİ PROFİL')}</em></div>
      </div>
      <div class="desktop-status-grid">
        <article><span>${L('PRECISION','HASSASİYET')}</span><b id="desktopPrecision">—</b><small>PR</small></article>
        <article><span>${L('CROWNS','TAÇ')}</span><b id="desktopCrowns">0</b><small>LIVE</small></article>
        <article><span>${L('STREAK','SERİ')}</span><b id="desktopStreak">0</b><small>${L('DAYS','GÜN')}</small></article>
        <article><span>${L('TRACE','İZ SÜR')}</span><b id="desktopTrace">01</b><small>/ 30</small></article>
      </div>
      <div class="desktop-shortcuts">
        <div><span>${L('QUICK PLAY','HIZLI OYNA')}</span><small>${L('Keyboard','Klavye')}</small></div>
        <p><kbd>1</kbd>${L('Classic','Klasik')} <kbd>2</kbd>${L('Daily','Günlük')}</p>
        <p><kbd>3</kbd>${L('One Shot','Tek Şans')} <kbd>6</kbd>${L('Trace','İz Sür')}</p>
        <p><kbd>G</kbd>${L('Ghost','Hayalet')} <kbd>L</kbd>${L('Live Duel','Canlı Düello')}</p>
      </div>
      <div class="desktop-status-mark"><span>O.</span><small>${L('Human precision, measured.','İnsan hassasiyeti, ölçüldü.')}</small></div>
    </aside>`;

  top?.classList.add('desktop-home-top');
  workspace.querySelector('#desktopHeroPane').appendChild(copy);
  workspace.querySelector('#desktopModePane').appendChild(actions);
  home.insertBefore(workspace,home.querySelector('.bottom-nav'));
}

function createGameAside(){
  if(byId('desktopGameAside')) return;
  const aside=document.createElement('aside');
  aside.id='desktopGameAside';
  aside.className='desktop-game-aside';
  aside.innerHTML=`
    <header><span>${L('STUDIO','STÜDYO')}</span><b>O.</b></header>
    <section class="desktop-game-mode-card">
      <small id="desktopGameEyebrow">MODE</small>
      <h3 id="desktopGameMode">CLASSIC</h3>
      <p id="desktopGamePrompt">${L('One stroke. No corrections.','Tek çizgi. Düzeltme yok.')}</p>
    </section>
    <section class="desktop-game-readout">
      <div><span>${L('BEST','EN İYİ')}</span><b id="desktopGameBest">—</b></div>
      <div><span>${L('INPUT','GİRDİ')}</span><b>${L('MOUSE / PEN','FARE / KALEM')}</b></div>
    </section>
    <section class="desktop-game-guide">
      <span>${L('CONTROL','KONTROL')}</span>
      <p><kbd>ESC</kbd>${L('Exit / close','Çık / kapat')}</p>
      <p><kbd>SPACE</kbd>${L('Retry after result','Sonuçtan sonra tekrar')}</p>
    </section>
    <footer><i></i><span>${L('SERVER VERIFIED','SUNUCUDA DOĞRULANIR')}</span></footer>`;
  document.body.appendChild(aside);
}

function buildProfileGrid(){
  const screen=byId('profileScreen');
  if(!screen||byId('desktopProfileGrid')) return;
  const grid=document.createElement('div');
  grid.id='desktopProfileGrid';
  grid.className='desktop-profile-grid';
  grid.innerHTML='<div class="desktop-profile-left"></div><div class="desktop-profile-right"></div>';
  const left=grid.firstElementChild,right=grid.lastElementChild;
  const fixed=new Set(['section-header','bottom-nav','desktop-section-accent']);
  [...screen.children].forEach(node=>{
    if([...node.classList].some(c=>fixed.has(c))) return;
    const isLeft=node.matches('.profile-identity,.claim-button,.account-profile-card,.duel-crown-card,.trace-profile-card,.season-card,.stats-grid,.precision-card');
    (isLeft?left:right).appendChild(node);
  });
  screen.insertBefore(grid,screen.querySelector('.bottom-nav'));
}

function createSectionChrome(){
  ['rankingsScreen','profileScreen'].forEach(id=>{
    const screen=byId(id); if(!screen||screen.querySelector('.desktop-section-accent')) return;
    const accent=document.createElement('div');
    accent.className='desktop-section-accent';
    accent.innerHTML='<i></i><span>O.</span>';
    screen.appendChild(accent);
  });
}

function syncDesktop(){
  if(!MQ.matches) return;
  const season=byId('homeSeason')?.textContent?.trim(); if(season) setText('desktopSeason',season);
  const name=byId('profileName')?.textContent?.trim()||'—';
  setText('desktopPlayerName',name);
  const letter=(name&&name!=='UNCLAIMED'&&name!=='SAHİPSİZ'?name:'?').slice(0,1).toUpperCase();
  const avatar=byId('desktopPlayerAvatar'); if(avatar&&avatar.querySelector('span')?.textContent!==letter) avatar.querySelector('span').textContent=letter;
  const src=document.querySelector('.account-avatar img.visible')?.getAttribute('src')||'';
  const img=avatar?.querySelector('img'); if(img){ if(src){if(img.getAttribute('src')!==src)img.src=src;img.classList.add('visible')}else{if(img.hasAttribute('src'))img.removeAttribute('src');img.classList.remove('visible')} }
  const precision=byId('precisionRating')?.textContent?.trim()||'—'; setText('desktopPrecision',precision.replace(/^PR\s*/i,''));
  setText('desktopCrowns',byId('duelCrownCount')?.textContent?.trim()||'0');
  setText('desktopStreak',byId('profileStreak')?.textContent?.trim()||'0');
  const trace=(byId('traceHomeLevel')?.textContent||'01').match(/\d+/)?.[0]||'01'; setText('desktopTrace',trace.padStart(2,'0'));
  setText('desktopGameEyebrow',byId('gameModeEyebrow')?.textContent||'MODE');
  setText('desktopGameMode',byId('gameModeLabel')?.textContent||'CLASSIC');
  setText('desktopGamePrompt',byId('promptText')?.textContent||L('One stroke. No corrections.','Tek çizgi. Düzeltme yok.'));
  setText('desktopGameBest',byId('gameBest')?.textContent||'—');
  document.querySelectorAll('[data-desk-screen]').forEach(btn=>{
    const target=btn.dataset.deskScreen;
    const active=byId(`${target}Screen`)?.classList.contains('active');
    btn.classList.toggle('active',!!active);
  });
  const game=byId('gameScreen')?.classList.contains('active');
  const traceVisible=byId('traceScreen')?.classList.contains('visible');
  document.body.classList.toggle('desktop-play-active',!!game||!!traceVisible);
}

function installObserver(){
  if(observer) return;
  observer=new MutationObserver(()=>requestAnimationFrame(syncDesktop));
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','src']});
}

function keyHandler(e){
  if(!MQ.matches || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag=document.activeElement?.tagName; if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.activeElement?.isContentEditable) return;
  if(byId('accountGate')?.classList.contains('visible')) return;
  const k=e.key.toLowerCase();
  if(k==='h') return go('home');
  if(k==='r') return go('rankings');
  if(k==='p') return go('profile');
  const homeActive=byId('homeScreen')?.classList.contains('active');
  if(homeActive){
    if(k==='1') return clickMode('classicButton');
    if(k==='2') return clickMode('dailyButton');
    if(k==='3') return clickMode('oneShotButton');
    if(k==='l') return clickMode('liveDuelButton');
    if(k==='5') return clickMode('levelRunButton');
    if(k==='6') return clickMode('traceModeButton');
    if(k==='g') return clickMode('beatSelfButton');
  }
  if(e.key==='Escape'){
    if(byId('traceScreen')?.classList.contains('visible')) return byId('traceBack')?.click();
    if(byId('liveLobby')?.classList.contains('visible')) return byId('liveLobbyClose')?.click();
    if(byId('levelHub')?.classList.contains('visible')) return (byId('levelHubClose')||byId('levelHub')?.querySelector('header button'))?.click();
    if(byId('gameScreen')?.classList.contains('active')) return byId('exitGame')?.click();
    return go('home');
  }
  if(e.code==='Space' && byId('resultSheet')?.classList.contains('visible')){ e.preventDefault(); byId('retryButton')?.click(); }
}

function restoreResponsiveDom(){
  const home=byId('homeScreen'),workspace=byId('desktopHomeWorkspace');
  if(home&&workspace){
    const copy=workspace.querySelector('.home-copy'),actions=workspace.querySelector('.home-actions'),nav=home.querySelector('.bottom-nav');
    if(copy)home.insertBefore(copy,nav);if(actions)home.insertBefore(actions,nav);workspace.remove();
  }
  const profile=byId('profileScreen'),grid=byId('desktopProfileGrid');
  if(profile&&grid){const nav=profile.querySelector('.bottom-nav');[...grid.querySelectorAll(':scope > div > *')].forEach(n=>profile.insertBefore(n,nav));grid.remove()}
}

function build(){
  if(desktopBuilt) return;
  desktopBuilt=true;
  document.body.classList.add('desktop-enhanced');
  createRail(); buildHome(); createGameAside(); createSectionChrome(); buildProfileGrid(); installObserver(); syncDesktop();
  setTimeout(()=>{try{if(typeof loadProfileStats==='function'&&typeof profile!=='undefined'&&profile)loadProfileStats()}catch{}},700);
  document.addEventListener('keydown',keyHandler);
}
function teardownClass(){
  document.body.classList.toggle('desktop-enhanced',MQ.matches);
  if(MQ.matches){ if(!desktopBuilt)build(); else {buildHome();buildProfileGrid();syncDesktop()} }
  else restoreResponsiveDom();
}
MQ.addEventListener?.('change',teardownClass);
if(MQ.matches) build(); else document.body.classList.remove('desktop-enhanced');
setTimeout(()=>{if(MQ.matches){build();syncDesktop()}},500);
})();
