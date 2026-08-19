  'use strict';

  const $ = (id) => document.getElementById(id);
  const qsa = (sel) => [...document.querySelectorAll(sel)];
  const config = window.O_CONFIG || {};

  const els = {
    home: $('homeScreen'), game: $('gameScreen'), rankings: $('rankingsScreen'), profile: $('profileScreen'),
    canvas: $('canvas'), centerCue: $('centerCue'), gamePrompt: $('gamePrompt'), promptIndex: $('promptIndex'), promptText: $('promptText'),
    gestureHint: $('gestureHint'), liveStatus: $('liveStatus'), gameModeEyebrow: $('gameModeEyebrow'), gameModeLabel: $('gameModeLabel'), gameBest: $('gameBest'),
    result: $('resultSheet'), resultRank: $('resultRank'), resultMode: $('resultMode'), resultScore: $('resultScore'), resultVerdict: $('resultVerdict'), personalBest: $('personalBest'),
    resultContext: $('resultContext'), resultPercentile: $('resultPercentile'), resultStreak: $('resultStreak'), achievementUnlock: $('achievementUnlock'), achievementUnlockTitle: $('achievementUnlockTitle'),
    metricShape: $('metricShape'), metricClosure: $('metricClosure'), metricFlow: $('metricFlow'),
    analysis: $('analysisPanel'), analysisScore: $('analysisScore'), analysisBest: $('analysisBest'), analysisWeak: $('analysisWeak'),
    usernameDialog: $('usernameDialog'), usernameForm: $('usernameForm'), usernameInput: $('usernameInput'), usernameError: $('usernameError'), saveUsername: $('saveUsername'),
    rankingList: $('rankingList'), rankingEmpty: $('rankingEmpty'), rankingCount: $('rankingCount'), rankingDateLabel: $('rankingDateLabel'),
    profileName: $('profileName'), profileCaption: $('profileCaption'), profileMonogram: $('profileMonogram'), claimProfileButton: $('claimProfileButton'),
    profileSeasonName: $('profileSeasonName'), profileSeasonRank: $('profileSeasonRank'), profileSeasonTop: $('profileSeasonTop'), profileStreak: $('profileStreak'), profileBestStreak: $('profileBestStreak'),
    statBest: $('statBest'), statAttempts: $('statAttempts'), statAverage: $('statAverage'), statDaily: $('statDaily'), historyList: $('historyList'), achievementGrid: $('achievementGrid'), achievementCount: $('achievementCount'),
    toast: $('toast'), dailyDate: $('dailyDate'), homeSeason: $('homeSeason'),
    challengeDialog: $('challengeDialog'), challengeTarget: $('challengeTarget'), challengeFrom: $('challengeFrom'),
    oneShotStatus: $('oneShotStatus')
  };

  const ctx = els.canvas.getContext('2d', { alpha: true, desynchronized: true });
  const API = `${config.supabaseUrl || ''}/rest/v1`;
  const FUNCTION_API = `${config.supabaseUrl || ''}/functions/v1/o-score`;
  const RETENTION_API = `${config.supabaseUrl || ''}/functions/v1/o-retention`;
  const API_KEY = config.supabasePublishableKey || '';
  const screens = { home: els.home, game: els.game, rankings: els.rankings, profile: els.profile };
  const theme = { ink:'#f0ede5', faint:'rgba(240,237,229,.16)', accent:'#d4f45d' };

  let currentScreen = 'home';
  let gameMode = 'classic';
  let rankingMode = 'daily';
  let isDrawing = false;
  let pointerId = null;
  let points = [];
  let fitted = null;
  let lastResult = null;
  let drawStart = 0;
  let dpr = 1;
  let hideTimer = null;
  let pendingScore = null;
  let profile = null;
  let activeChallenge = null;
  let currentShareSlug = null;
  let pendingModeAfterUsername = null;
  let pendingShareAfterUsername = false;
  let pendingScorePromise = null;
  let lastVerifiedScore = null;
  let retentionSnapshot = null;
  let installationId = loadInstallationId();
  let installationSecret = loadInstallationSecret();

  function todayIstanbul() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const get = (t) => parts.find(p => p.type === t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  function currentSeasonId() { return todayIstanbul().slice(0,7); }

  function displayDailyDate() {
    const label = new Intl.DateTimeFormat('en-US', { timeZone:'Europe/Istanbul', month:'short', day:'numeric' }).format(new Date()).toUpperCase();
    els.dailyDate.textContent = label;
  }

  function loadInstallationId() {
    let id = localStorage.getItem('o.installationId');
    if (!id) {
      id = crypto.randomUUID?.() || ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
      localStorage.setItem('o.installationId', id);
    }
    return id;
  }

  function loadInstallationSecret() {
    let secret = localStorage.getItem('o.installationSecret');
    if (!secret) {
      const bytes=crypto.getRandomValues(new Uint8Array(32));
      secret=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      localStorage.setItem('o.installationSecret',secret);
    }
    return secret;
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, node]) => node.classList.toggle('active', key === name));
    currentScreen = name;
    closeResult();
    closeAnalysis();
    if (name === 'rankings') loadRankings();
    if (name === 'profile') loadProfileStats();
  }

  function supaHeaders(extra = {}) {
    return { apikey: API_KEY, 'Content-Type':'application/json', ...extra };
  }

  async function api(path, options = {}) {
    if (!API_KEY || !config.supabaseUrl) throw new Error('Backend unavailable');
    const response = await fetch(`${API}/${path}`, { ...options, headers:supaHeaders(options.headers || {}) });
    const text = await response.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!response.ok) {
      const err = new Error(data?.message || data?.hint || `Request failed (${response.status})`);
      err.status = response.status; err.data = data; throw err;
    }
    return data;
  }

  async function callFunction(url, payload = {}) {
    if (!API_KEY || !config.supabaseUrl) throw new Error('Backend unavailable');
    const response = await fetch(url, {
      method:'POST',
      headers:{ apikey:API_KEY, 'Content-Type':'application/json' },
      body:JSON.stringify({ installationSecret, ...payload })
    });
    const text = await response.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!response.ok) {
      const err = new Error(data?.error || `Request failed (${response.status})`);
      err.status = response.status; err.data = data; throw err;
    }
    return data;
  }

  async function edge(action, payload = {}) { return callFunction(FUNCTION_API,{ action, ...payload }); }
  async function syncRetention(scoreId=null) { return callFunction(RETENTION_API,{ installationId, scoreId }); }

  async function loadProfile() {
    try {
      const rows = await api(`o_profiles?installation_id=eq.${encodeURIComponent(installationId)}&select=installation_id,username,country_code&limit=1`);
      profile = rows?.[0] || null;
    } catch { profile = null; }
    renderProfileIdentity();
  }

  function renderProfileIdentity() {
    if (profile) {
      els.profileName.textContent = profile.username;
      els.profileCaption.textContent = profile.country_code ? profile.country_code : 'Global player';
      els.profileMonogram.textContent = profile.username.slice(0,1).toUpperCase();
      els.claimProfileButton.classList.add('hidden');
    } else {
      els.profileName.textContent = 'UNCLAIMED';
      els.profileCaption.textContent = 'Choose a name to join global rankings.';
      els.profileMonogram.textContent = '?';
      els.claimProfileButton.classList.remove('hidden');
    }
  }

  async function claimUsername(username) {
    const clean = username.trim();
    if (!/^[A-Za-z0-9_]{3,18}$/.test(clean)) throw new Error('Use 3–18 letters, numbers or _.');
    const data=await edge('profile',{installationId,username:clean});
    return data?.profile || { installation_id:installationId, username:clean, country_code:null };
  }

  function openUsername() {
    els.usernameError.textContent = '';
    els.usernameInput.value = profile?.username || '';
    if (typeof els.usernameDialog.showModal === 'function') els.usernameDialog.showModal();
    else els.usernameDialog.setAttribute('open','');
    setTimeout(() => els.usernameInput.focus(), 80);
  }

  function closeUsername() {
    if (typeof els.usernameDialog.close === 'function') els.usernameDialog.close();
    else els.usernameDialog.removeAttribute('open');
  }

  function resizeCanvas() {
    const rect = els.canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    els.canvas.width = Math.round(rect.width * dpr);
    els.canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    redraw(!!fitted && !!lastResult);
  }

  function clearCanvas() { ctx.clearRect(0,0,els.canvas.width/dpr,els.canvas.height/dpr); }
  function distance(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
  function clamp(v,a=0,b=1) { return Math.max(a,Math.min(b,v)); }
  function mean(a) { return a.reduce((s,v)=>s+v,0)/Math.max(1,a.length); }
  function rms(a) { return Math.sqrt(mean(a.map(v=>v*v))); }
  function std(a) { const m=mean(a); return Math.sqrt(mean(a.map(v=>(v-m)*(v-m)))); }
  function percentile(arr,p) { if(!arr.length) return 0; const a=[...arr].sort((x,y)=>x-y); return a[Math.min(a.length-1,Math.floor((a.length-1)*p))]; }
