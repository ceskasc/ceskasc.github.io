(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const boot = $('#boot');
  const bootBar = $('#bootBar');
  const bootText = $('#bootText');
  const bootLines = ['recovering dead links…', 'mounting /memories…', 'checking guestbook…', 'waking forgotten plugins…', 'archive ready.'];
  if (boot) {
    let step = 0;
    const tick = () => {
      step++;
      bootBar.style.width = `${Math.min(step * 23, 100)}%`;
      bootText.textContent = bootLines[Math.min(step - 1, bootLines.length - 1)];
      if (step < 5) setTimeout(tick, reducedMotion ? 20 : 210 + Math.random() * 170);
      else setTimeout(() => boot.classList.add('is-gone'), reducedMotion ? 30 : 380);
    };
    setTimeout(tick, reducedMotion ? 10 : 220);
  }

  const clock = $('#archiveClock');
  const updateClock = () => {
    if (!clock) return;
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
    clock.textContent = `ARCHIVE TIME — ${time}`;
  };
  updateClock(); setInterval(updateClock, 1000);

  const cursorGlow = $('#cursorGlow');
  if (matchMedia('(pointer:fine)').matches && cursorGlow) {
    addEventListener('pointermove', e => {
      cursorGlow.style.left = `${e.clientX}px`;
      cursorGlow.style.top = `${e.clientY}px`;
      cursorGlow.style.opacity = '1';
    }, { passive: true });
  }

  const menuButton = $('#menuButton');
  const mobileNav = $('#mobileNav');
  const setMenu = open => {
    menuButton?.setAttribute('aria-expanded', String(open));
    mobileNav?.classList.toggle('is-open', open);
    if (mobileNav) mobileNav.inert = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('#mobileNav a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  const toast = $('#toast');
  let toastTimer;
  const say = text => {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  };

  let audioCtx, master, wind, drone, windGain;
  const soundToggle = $('#soundToggle');
  const stopAudio = () => {
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    soundToggle?.setAttribute('aria-pressed', 'false');
    $('.sound-label') && ($('.sound-label').textContent = 'sound off');
    soundToggle?.setAttribute('aria-label', 'Turn ambient sound on');
  };
  const startAudio = async () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { say('AUDIO ARCHIVE UNSUPPORTED'); return; }
    audioCtx = new AC();
    master = audioCtx.createGain(); master.gain.value = 0.18; master.connect(audioCtx.destination);
    const droneGain = audioCtx.createGain(); droneGain.gain.value = 0.07; droneGain.connect(master);
    drone = audioCtx.createOscillator(); drone.type = 'sine'; drone.frequency.value = 46; drone.connect(droneGain); drone.start();
    const drone2 = audioCtx.createOscillator(); const drone2Gain = audioCtx.createGain(); drone2.type = 'triangle'; drone2.frequency.value = 69; drone2Gain.gain.value = 0.025; drone2.connect(drone2Gain); drone2Gain.connect(master); drone2.start();
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0); for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
    wind = audioCtx.createBufferSource(); wind.buffer = buffer; wind.loop = true;
    const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 430;
    windGain = audioCtx.createGain(); windGain.gain.value = 0.08; wind.connect(filter); filter.connect(windGain); windGain.connect(master); wind.start();
    const swell = () => { if (!audioCtx || !windGain) return; const now=audioCtx.currentTime; windGain.gain.cancelScheduledValues(now); windGain.gain.setValueAtTime(windGain.gain.value,now); windGain.gain.linearRampToValueAtTime(0.035+Math.random()*.1,now+3+Math.random()*4); setTimeout(swell, 3500+Math.random()*3500); }; swell();
    await audioCtx.resume();
    soundToggle?.setAttribute('aria-pressed', 'true');
    $('.sound-label') && ($('.sound-label').textContent = 'sound on');
    soundToggle?.setAttribute('aria-label', 'Turn ambient sound off');
  };
  soundToggle?.addEventListener('click', async () => audioCtx ? stopAudio() : startAudio());

  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const filter = btn.dataset.filter;
    $$('.grave').forEach((grave, i) => {
      const visible = filter === 'all' || grave.dataset.category === filter;
      grave.hidden = !visible;
      if (visible && !reducedMotion) grave.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,delay:i*20,fill:'both'});
    });
  }));

  const memorials = {
    msn: {code:'001',years:'1999 — 2013',name:'MSN Messenger',text:'The little green person who knew exactly when your crush came online. Status messages were poetry. Going offline and back online was a notification strategy.',stats:[['Last ritual','Nudge'],['Native language',':P  xD  <3'],['Emotional damage','High']],type:'msn'},
    flash:{code:'002',years:'1996 — 2020',name:'Adobe Flash',text:'A whole generation learned that the web could move, scream, explode, play games and ignore every performance budget imaginable.',stats:[['Natural habitat','Browser plugin'],['Diet','.SWF files'],['Cause of death','The future']],type:'flash'},
    ie:{code:'003',years:'1995 — 2022',name:'Internet Explorer',text:'For millions, the internet began with a blue e. Later, its most important job became helping people download another browser.',stats:[['Final speed','Eventually'],['Compatibility','It depends'],['Last task','Download Chrome']],type:'ie'},
    vine:{code:'004',years:'2013 — 2017',name:'Vine',text:'Six seconds, infinite cultural damage. It proved the internet did not need more time — only better timing.',stats:[['Runtime','6 seconds'],['Loop','Forever'],['Too young to die','Yes']],type:'vine'},
    winamp:{code:'005',years:'1997 — ∞',name:'Winamp Era',text:'Not technically dead. Spiritually immortal. Your music player looked like alien hardware and somehow that was obviously correct.',stats:[['Skin count','Too many'],['Sacred text','It really whips…'],['Status','Undead']],type:'winamp'},
    limewire:{code:'006',years:'2000 — 2010',name:'LimeWire',text:'A peer-to-peer casino where every file could be the song you wanted, a mislabeled remix, or a computer-ending surprise.',stats:[['Trust model','Absolutely none'],['Filename','final_FINAL.mp3.exe'],['Risk','Character building']],type:'limewire'},
    myspace:{code:'007',years:'2003 — 2008*',name:'MySpace Top 8',text:'Social networking with consequences. You had eight public slots to explain your entire social hierarchy. Tom was the only stable relationship.',stats:[['Default friend','Tom'],['Social slots','8'],['Drama potential','Catastrophic']],type:'myspace'},
    googleplus:{code:'008',years:'2011 — 2019',name:'Google+',text:'Beautiful circles, impressive engineering, and the strange feeling of arriving at a party where everyone had already left.',stats:[['Friends','Circles'],['Energy','Corporate optimism'],['Party guests','Complicated']],type:'googleplus'},
    yahoo:{code:'009',years:'1998 — 2018',name:'Yahoo! Messenger',text:'Purple windows, status messages and the nuclear weapon of instant messaging: BUZZ!!!',stats:[['Signature move','BUZZ!!!'],['Color','Aggressively purple'],['Volume','Too loud']],type:'yahoo'},
    orkut:{code:'010',years:'2004 — 2014',name:'Orkut',text:'Communities, scraps and testimonials. The web felt smaller because somehow everyone was already in the same weird group.',stats:[['Love language','Testimonials'],['Messages','Scraps'],['Brazil','Basically home']],type:'orkut'},
    guestbook:{code:'011',years:'1994 — ???',name:'Website Guestbooks',text:'Before comments, likes and follower counts, there was one sacred request: “cool site, sign my guestbook.”',stats:[['Moderation','Optional'],['Typography','Comic Sans'],['Etiquette','Sign mine back']],type:'guestbook'},
    realplayer:{code:'012',years:'1995 — 2000s',name:'RealPlayer',text:'A tiny rectangle of hope, a spinning icon, and the revolutionary idea that video might begin before the entire file finished downloading.',stats:[['State','Buffering'],['Resolution','Conceptual'],['Patience required','Yes']],type:'realplayer'}
  };

  const memorial = $('#memorial');
  const closeMemorial = $('#closeMemorial');
  const exp = $('#memorialExperience');
  const experienceHTML = type => ({
    msn:`<div class="retro-window" id="msnWindow"><div class="retro-title"><span>MSN Messenger</span><span>_ □ ×</span></div><div class="retro-body"><div class="buddy"><span class="buddy-face"></span><div><b>someone_special@hotmail.com</b><small>online · listening to Linkin Park</small></div></div><div class="chat-log" id="chatLog"><b>someone_special says:</b><br>naber :D<br><br><b>someone_special says:</b><br>hala ordamısın?</div><div class="chat-entry"><input id="chatInput" value="evet :P" aria-label="Chat message"><button id="nudgeBtn">NUDGE</button></div></div></div>`,
    flash:`<div class="flash-stage" id="flashStage"><p>SCORE: <b id="flashScore">000</b> · CLICK THE BALL</p><span class="ball" id="flashBall"></span><span class="paddle"></span></div>`,
    ie:`<div class="ie-window"><div class="ie-bar">Internet Explorer — Not Responding</div><div class="ie-url">https://www.google.com/chrome</div><div class="ie-page" id="iePage"><b>Downloading Chrome…</b><div class="progress"><i></i></div><small id="iePercent">3%</small></div></div>`,
    vine:`<div class="vine-stage" id="vineStage"><strong>V</strong><p id="vineCaption">tap to replay the same six seconds</p></div>`,
    winamp:`<div class="winamp"><div class="winamp-head">WINAMP · CESKA_ARCHIVE.MP3</div><div class="winamp-display"><b id="waTime">00:00</b><span>1. INTERNET_CEMETERY — NOTHING_TRULY_DIES.MP3</span></div><div class="winamp-controls"><button>◀◀</button><button id="waPlay">▶</button><button>■</button><button>▶▶</button></div></div>`,
    limewire:`<div class="lime-list"><div class="lime-head">LimeWire — Search Results: “linkin park numb”</div><table><tr><th>Name</th><th>Type</th><th>Quality</th></tr><tr><td>Linkin_Park_Numb.mp3</td><td>Audio</td><td>128 kbps</td></tr><tr><td>linkin_park_numb_REAL.mp3</td><td>Audio</td><td>192 kbps</td></tr><tr class="danger"><td>Linkin_Park_Numb.mp3.exe</td><td>Application</td><td>???</td></tr><tr><td>Numb_FINAL_no_virus.mp3</td><td>Audio</td><td>56 kbps</td></tr></table></div>`,
    myspace:`<div class="top8"><h3>Sadık's Friend Space</h3><p><b>Sadık has 8 friends.</b></p><div class="friends">${['Tom','xXemoXx','Merve','Burak','Ece','band_guy','Deniz','???'].map((n,i)=>`<div><div class="friend">${['☺','☠','★','☻','♥','♫','✦','?'][i]}</div><small>${n}</small></div>`).join('')}</div></div>`,
    googleplus:`<div class="gplus"><div class="gplus-head">Google+</div><div class="gplus-card"><b>People you may know</b><p>You are currently in 47 circles and somehow still alone here.</p><button id="circleBtn">+ Add to circles</button></div></div>`,
    yahoo:`<div class="buzz-window" id="buzzWindow"><div class="buzz-head">Yahoo! Messenger</div><div class="buzz-body"><p>ceska_2008: selam</p><button id="buzzBtn">BUZZ!!!</button></div></div>`,
    orkut:`<div class="orkut-card"><h3>testimonials</h3><div class="testimonial"><b>★ ★ ★ trustworthy / cool / sexy</b><p>cok iyi biridir tanıdıgıma cok memnunum :))) silme bunu kalsın</p><small>— posted sometime before adulthood</small></div></div>`,
    guestbook:`<div class="guestbook"><h3>★ WELCOME 2 MY SITE ★</h3><marquee>~*~ PLEASE SIGN MY GUESTBOOK ~*~ BEST VIEWED 800×600 ~*~</marquee><input id="guestInput" value="cool site!!! visit mine"><button id="guestBtn">SIGN GUESTBOOK</button></div>`,
    realplayer:`<div class="realplayer"><div class="real-head">RealPlayer — live_stream.rm</div><div class="real-screen"><div><div class="spinner"></div><p>Buffering… <span id="bufferValue">2%</span></p></div></div><div class="real-controls">56 Kbps · SureStream™ · Stereo (probably)</div></div>`
  })[type];

  const bindExperience = type => {
    if (type === 'msn') $('#nudgeBtn')?.addEventListener('click', () => { $('#msnWindow').classList.remove('nudge'); void $('#msnWindow').offsetWidth; $('#msnWindow').classList.add('nudge'); say('YOU HAVE BEEN NUDGED'); });
    if (type === 'flash') { let score=0; const ball=$('#flashBall'); ball?.addEventListener('click', e=>{e.stopPropagation(); score+=10; $('#flashScore').textContent=String(score).padStart(3,'0'); ball.style.left=`${8+Math.random()*78}%`; ball.style.top=`${16+Math.random()*62}%`;}); }
    if (type === 'ie') { const page=$('#iePage'); let p=3; page?.addEventListener('click',()=>{page.classList.add('started'); const t=setInterval(()=>{p=Math.min(88,p+1); $('#iePercent').textContent=`${p}%`; if(p===88){clearInterval(t); $('#iePercent').textContent='88% — connection reset';}},75);},{once:true}); }
    if (type === 'vine') $('#vineStage')?.addEventListener('click',()=>{const c=$('#vineCaption'); c.textContent='and again.'; setTimeout(()=>c.textContent='tap to replay the same six seconds',1100);});
    if (type === 'winamp') { let sec=0,t; $('#waPlay')?.addEventListener('click',()=>{ if(t){clearInterval(t);t=null;$('#waPlay').textContent='▶';return;} $('#waPlay').textContent='Ⅱ'; t=setInterval(()=>{sec++;$('#waTime').textContent=`00:${String(sec%60).padStart(2,'0')}`},1000);}); }
    if (type === 'googleplus') $('#circleBtn')?.addEventListener('click',e=>{e.currentTarget.textContent='✓ Added to a circle nobody checks';});
    if (type === 'yahoo') $('#buzzBtn')?.addEventListener('click',()=>{const w=$('#buzzWindow');w.classList.remove('buzzing');void w.offsetWidth;w.classList.add('buzzing');say('BUZZ!!!');});
    if (type === 'guestbook') $('#guestBtn')?.addEventListener('click',()=>say('THANKS 4 SIGNING!!!1!'));
    if (type === 'realplayer') { let p=2; const t=setInterval(()=>{const el=$('#bufferValue'); if(!el){clearInterval(t);return;} p=(p+Math.floor(Math.random()*5))%37;el.textContent=`${p}%`;},500); }
  };

  const openMemorial = id => {
    const m = memorials[id]; if (!m || !memorial) return;
    $('#memorialCode').textContent = `MEMORIAL / ${m.code}`;
    $('#memorialYears').textContent = m.years;
    $('#memorialName').textContent = m.name;
    $('#memorialText').textContent = m.text;
    $('#memorialStats').innerHTML = m.stats.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('');
    exp.innerHTML = experienceHTML(m.type);
    memorial.showModal();
    bindExperience(m.type);
  };
  $$('.grave').forEach(g => g.addEventListener('click', () => openMemorial(g.dataset.id)));
  closeMemorial?.addEventListener('click', () => memorial.close());
  memorial?.addEventListener('click', e => { const r=memorial.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) memorial.close(); });

  $$('[data-artifact]').forEach(btn => btn.addEventListener('click', () => {
    const type = btn.dataset.artifact;
    if (type === 'modem') { $('.modem-box')?.classList.add('is-dialing'); btn.textContent='krrrr—beep—shhhhh—SCREEECH'; say('CONNECTING AT 56,000 BPS'); setTimeout(()=>{btn.textContent='Connected. Nobody may use the phone.';},2300); }
    if (type === 'cursor') { document.body.classList.toggle('trail-on'); btn.textContent=document.body.classList.contains('trail-on')?'Disable terrible cursor ↗':'Enable terrible cursor ↗'; say(document.body.classList.contains('trail-on')?'1999 CURSOR ENABLED':'CURSOR EXORCISED'); }
    if (type === 'counter') { const el=$('#hitCounter'); let n=Number(el.textContent); el.textContent=String(++n).padStart(7,'0'); btn.textContent=`You are visitor #${n} ↗`; }
    if (type === 'construction') say('STILL UNDER CONSTRUCTION. CHECK BACK IN 1998.');
  }));

  let lastTrail = 0;
  addEventListener('pointermove', e => {
    if (!document.body.classList.contains('trail-on') || e.timeStamp-lastTrail<70) return;
    lastTrail=e.timeStamp; const i=document.createElement('i');i.textContent=Math.random()>.5?'✦':'✧';i.style.left=`${e.clientX}px`;i.style.top=`${e.clientY}px`;$('#trail').appendChild(i);setTimeout(()=>i.remove(),700);
  },{passive:true});

  const form = $('#burialForm'), plot = $('#personalPlot');
  const plotNumber = $('#plotNumber');
  const buildPlotNo = text => { let h=0; for(const c of text) h=(h*31+c.charCodeAt(0))%9000; return String(1000+h); };
  const renderBurial = data => {
    if (!data) { plot.hidden=true; form.hidden=false; plotNumber.textContent='#????'; return; }
    const no=buildPlotNo(data.name+data.epitaph);
    $('#personalName').textContent=data.name;
    $('#personalEpitaph').textContent=`“${data.epitaph}”`;
    $('#personalYear').textContent=`${data.year||'????'} — ∞`;
    $('#personalPlotNo').textContent=`PLOT #${no}`; plotNumber.textContent=`#${no}`;
    form.hidden=true;plot.hidden=false;
  };
  let stored=null; try{stored=JSON.parse(localStorage.getItem('internetCemeteryBurial')||'null')}catch{} renderBurial(stored);
  form?.addEventListener('submit',e=>{e.preventDefault();const data={name:$('#burialName').value.trim(),epitaph:$('#burialEpitaph').value.trim(),year:$('#burialYear').value.trim()};if(!data.name||!data.epitaph)return;localStorage.setItem('internetCemeteryBurial',JSON.stringify(data));renderBurial(data);say('MEMORY BURIED. MAY IT REST OFFLINE.');plot.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'center'});});
  $('#removeGrave')?.addEventListener('click',()=>{localStorage.removeItem('internetCemeteryBurial');renderBurial(null);form.reset();say('MEMORY EXHUMED. UNFORTUNATE.');});

  let moonClicks=0,moonTimer;
  const moon=$('#moon');
  const haunt=()=>{moonClicks++;clearTimeout(moonTimer);moonTimer=setTimeout(()=>moonClicks=0,1500);moon.classList.add('is-awake');setTimeout(()=>moon.classList.remove('is-awake'),500);if(moonClicks>=3){moonClicks=0;const ghost=document.createElement('div');ghost.className='easter-ghost';ghost.textContent='☹';document.body.appendChild(ghost);say('SOMETHING FOLLOWED YOU OUT.');setTimeout(()=>ghost.remove(),4300);}};
  moon?.addEventListener('click',haunt);moon?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();haunt();}});

  if ('IntersectionObserver' in window && !reducedMotion) {
    const targets=$$('.section-heading,.grave,.artifact,.dig-copy,.burial-form,.manifesto-line');
    targets.forEach(el=>{el.style.opacity='0';el.style.transform='translateY(18px)';});
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});io.unobserve(entry.target);}}),{threshold:.08,rootMargin:'0px 0px -5%'});targets.forEach(el=>io.observe(el));
  }
})();
