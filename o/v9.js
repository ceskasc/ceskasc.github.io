(() => {
'use strict';

const ACCOUNT_API = `${config.supabaseUrl || ''}/functions/v1/o-account`;
const LEVEL_API = `${config.supabaseUrl || ''}/functions/v1/o-level`;
const LEVEL_SCORE_API = `${config.supabaseUrl || ''}/functions/v1/o-level-score`;

let authClient = null;
let accountReady = false;
let accountStatus = null;
let levelSnapshot = null;
let levelRun = null;
let levelTimer = null;
let levelExpiredShown = false;
let v9ProfileLoadPromise = null;

function internalEmail(username) {
  return `o.${String(username || '').trim().toLowerCase()}@users.ocircle.app`;
}

async function accountEdge(action, payload = {}, accessToken = null) {
  const headers = { apikey: API_KEY, 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const r = await fetch(ACCOUNT_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, installationId, installationSecret, ...payload })
  });
  const text = await r.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!r.ok) {
    const e = new Error(data?.error || `Account request failed (${r.status})`);
    e.status = r.status;
    throw e;
  }
  return data;
}

async function levelEdge(action, payload = {}) {
  const r = await fetch(LEVEL_API, {
    method: 'POST',
    headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, installationId, installationSecret, ...payload })
  });
  const text = await r.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!r.ok) {
    const e = new Error(data?.error || `Level request failed (${r.status})`);
    e.status = r.status;
    throw e;
  }
  return data;
}

function ensureV9UI() {
  if (!document.getElementById('accountGate')) {
    document.body.insertAdjacentHTML('beforeend', `
      <section class="account-gate" id="accountGate" aria-hidden="true">
        <div class="account-shell">
          <div class="account-mark">O<span>.</span></div>
          <p class="account-kicker" id="accountKicker">YOUR IDENTITY</p>
          <h2 id="accountTitle">Enter O.</h2>
          <p class="account-copy" id="accountCopy">Your scores, CROWNS and progress follow this account.</p>

          <div class="account-tabs" id="accountTabs">
            <button type="button" data-auth-tab="create" class="active">CREATE</button>
            <button type="button" data-auth-tab="login">SIGN IN</button>
          </div>

          <form class="account-form" id="accountForm">
            <label id="accountUsernameLabel"><span>USERNAME</span><input id="accountUsername" maxlength="18" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="your_name" /></label>
            <label><span>PASSWORD</span><input id="accountPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="8+ characters" /></label>
            <label id="accountConfirmLabel"><span>CONFIRM</span><input id="accountConfirm" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="repeat password" /></label>
            <p class="account-error" id="accountError"></p>
            <button class="account-submit" id="accountSubmit" type="submit">CREATE ACCOUNT</button>
          </form>
          <p class="account-foot">No email required · username + password</p>
        </div>
      </section>`);
  }

  const homeAnchor = document.getElementById('liveDuelButton') || document.getElementById('beatSelfButton') || document.getElementById('oneShotButton');
  if (homeAnchor && !document.getElementById('levelRunButton')) {
    homeAnchor.insertAdjacentHTML('afterend', `
      <button class="level-run-cta" id="levelRunButton" type="button">
        <span><b>LEVEL RUN</b><i id="levelHomeLevel">LV. 01</i></span>
        <small id="levelHomeTarget">80+ IN 60 SEC</small>
        <em id="levelHomeStars">★ 0</em><span class="arrow">→</span>
      </button>`);
  }

  if (!document.getElementById('levelHub')) {
    document.body.insertAdjacentHTML('beforeend', `
      <section class="level-hub" id="levelHub" aria-hidden="true">
        <header><button id="levelHubClose" type="button">×</button><div><span>PROGRESSION</span><b>LEVEL RUN</b></div><em id="levelHubStars">★ 0</em></header>
        <div class="level-orbit"><small id="levelHubLevel">LEVEL 01 / 20</small><strong id="levelHubTarget">80.00</strong><i>%</i><p>IN 60 SECONDS</p></div>
        <div class="level-reward"><span>REWARD</span><b id="levelHubReward">+5 STARS</b></div>
        <div class="level-badges" id="levelBadgeTrack">
          <div data-level-milestone="5"><span>05</span><b>FIRST RING</b></div>
          <div data-level-milestone="10"><span>10</span><b>SHARP</b></div>
          <div data-level-milestone="15"><span>15</span><b>BLACK LINE</b></div>
          <div data-level-milestone="20"><span>20</span><b>PERFECT HUNTER</b></div>
        </div>
        <p class="level-hub-copy" id="levelHubCopy">Beat the target before the clock reaches zero. Every circle is server verified.</p>
        <button class="level-start" id="levelStartButton" type="button">START 60 SEC</button>
      </section>`);
  }

  if (!document.getElementById('levelHud')) {
    document.getElementById('gameScreen')?.insertAdjacentHTML('beforeend', `
      <div class="level-hud hidden" id="levelHud">
        <div><span id="levelHudLevel">LV.01</span><b id="levelHudTarget">80.00+</b></div>
        <strong id="levelHudClock">1:00.0</strong>
        <div class="right"><span>BEST</span><b id="levelHudBest">—</b></div>
      </div>`);
  }

  if (!document.getElementById('levelClearOverlay')) {
    document.body.insertAdjacentHTML('beforeend', `
      <section class="level-clear-overlay" id="levelClearOverlay" aria-hidden="true">
        <span id="levelClearKicker">LEVEL CLEARED</span>
        <h2 id="levelClearTitle">80.00+</h2>
        <strong id="levelClearReward">+5 STARS</strong>
        <p id="levelClearCopy">Level 02 unlocked.</p>
        <b class="level-badge-reveal hidden" id="levelBadgeReveal"></b>
        <button id="levelClearNext" type="button">NEXT LEVEL →</button>
      </section>`);
  }

  if (!document.getElementById('accountProfileCard') && document.getElementById('profileScreen')) {
    const identity = document.querySelector('#profileScreen .profile-identity');
    identity?.insertAdjacentHTML('afterend', `
      <section class="account-profile-card" id="accountProfileCard">
        <label class="account-avatar" for="accountAvatarInput">
          <span id="accountAvatarFallback">?</span><img id="accountAvatarImage" alt="Profile photo" />
          <i>EDIT</i><input id="accountAvatarInput" type="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <div class="account-profile-copy"><span>SECURE ACCOUNT</span><b id="accountProfileName">—</b><small>USERNAME + PASSWORD</small></div>
        <div class="account-profile-stats"><div><span>LEVEL</span><b id="accountProfileLevel">01</b></div><div><span>STARS</span><b id="accountProfileStars">0</b></div></div>
        <button id="accountSignOut" type="button">SIGN OUT</button>
      </section>`);
  }

  document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => setAuthMode(btn.dataset.authTab)));
  document.getElementById('accountForm')?.addEventListener('submit', submitAccountForm);
  document.getElementById('levelRunButton')?.addEventListener('click', openLevelHub);
  document.getElementById('levelHubClose')?.addEventListener('click', () => toggleLevelHub(false));
  document.getElementById('levelStartButton')?.addEventListener('click', startLevelRun);
  document.getElementById('levelClearNext')?.addEventListener('click', nextLevelFromOverlay);
  document.getElementById('accountAvatarInput')?.addEventListener('change', uploadAvatar);
  document.getElementById('accountSignOut')?.addEventListener('click', signOutAccount);
}

let authMode = 'create';
function setAuthMode(mode, lockedUsername = null) {
  authMode = mode;
  document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.toggle('active', b.dataset.authTab === mode));
  const tabs = document.getElementById('accountTabs');
  const username = document.getElementById('accountUsername');
  const confirm = document.getElementById('accountConfirmLabel');
  const password = document.getElementById('accountPassword');
  const submit = document.getElementById('accountSubmit');
  const kicker = document.getElementById('accountKicker');
  const title = document.getElementById('accountTitle');
  const copy = document.getElementById('accountCopy');
  const error = document.getElementById('accountError');
  error.textContent = '';

  if (mode === 'migrate') {
    tabs.classList.add('hidden');
    username.value = lockedUsername || '';
    username.readOnly = true;
    confirm.classList.remove('hidden');
    password.autocomplete = 'new-password';
    submit.textContent = 'SECURE PROFILE';
    kicker.textContent = 'ACCOUNT UPGRADE';
    title.textContent = 'Protect your profile.';
    copy.textContent = 'Set a password once. Your existing scores, CROWNS and history stay exactly where they are.';
  } else if (mode === 'login') {
    tabs.classList.remove('hidden');
    username.readOnly = false;
    if (lockedUsername) username.value = lockedUsername;
    confirm.classList.add('hidden');
    password.autocomplete = 'current-password';
    submit.textContent = 'SIGN IN';
    kicker.textContent = 'WELCOME BACK';
    title.textContent = 'Enter O.';
    copy.textContent = 'Sign in with your username and password.';
  } else {
    tabs.classList.remove('hidden');
    username.readOnly = false;
    confirm.classList.remove('hidden');
    password.autocomplete = 'new-password';
    submit.textContent = 'CREATE ACCOUNT';
    kicker.textContent = 'YOUR IDENTITY';
    title.textContent = 'Claim your place.';
    copy.textContent = 'One permanent profile for scores, CROWNS, levels and rivals.';
  }
}

function toggleAccountGate(open = true) {
  const gate = document.getElementById('accountGate');
  gate.classList.toggle('visible', open);
  gate.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.classList.toggle('account-locked', open);
}

function accountError(message) {
  document.getElementById('accountError').textContent = message || '';
}

async function submitAccountForm(e) {
  e.preventDefault();
  const username = document.getElementById('accountUsername').value.trim();
  const password = document.getElementById('accountPassword').value;
  const confirm = document.getElementById('accountConfirm').value;
  const submit = document.getElementById('accountSubmit');
  accountError('');
  if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) return accountError('Use 3–18 letters, numbers or _.');
  if (password.length < 8 || password.length > 72) return accountError('Password must be 8–72 characters.');
  if (authMode !== 'login' && password !== confirm) return accountError('Passwords do not match.');
  submit.disabled = true;
  try {
    if (authMode === 'migrate') {
      await accountEdge('migrate', { password });
      const { data, error } = await authClient.auth.signInWithPassword({ email: internalEmail(username), password });
      if (error) throw error;
      await linkSignedInDevice(data.session);
      showToast('PROFILE SECURED');
      await accountBootComplete(true);
      return;
    }
    if (authMode === 'create') {
      await accountEdge('register', { username, password });
      const { data, error } = await authClient.auth.signInWithPassword({ email: internalEmail(username), password });
      if (error) throw error;
      await linkSignedInDevice(data.session);
      showToast('ACCOUNT CREATED');
      await accountBootComplete(true);
      return;
    }
    const { data, error } = await authClient.auth.signInWithPassword({ email: internalEmail(username), password });
    if (error) throw new Error('Username or password is incorrect.');
    const linked = await linkSignedInDevice(data.session);
    if (linked?.installationId && linked.installationId !== installationId) {
      localStorage.setItem('o.installationId', linked.installationId);
      installationId = linked.installationId;
      location.reload();
      return;
    }
    showToast('SIGNED IN');
    await accountBootComplete(true);
  } catch (err) {
    accountError(err?.message || 'Could not continue.');
  } finally {
    submit.disabled = false;
  }
}

async function linkSignedInDevice(session) {
  if (!session?.access_token) throw new Error('Could not establish session.');
  return accountEdge('link_device', {}, session.access_token);
}

async function initAuthClient() {
  const mod = await import('https://esm.sh/@supabase/supabase-js@2');
  authClient = mod.createClient(config.supabaseUrl, API_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'o-circle-v9' } }
  });
}

async function bootAccount() {
  toggleAccountGate(true);
  try {
    await initAuthClient();
    accountStatus = await accountEdge('status');
    const { data: sessionData } = await authClient.auth.getSession();
    const session = sessionData?.session || null;

    if (accountStatus?.exists && accountStatus?.needsPassword) {
      setAuthMode('migrate', accountStatus.username);
      return;
    }

    if (!accountStatus?.exists) {
      if (session?.access_token) {
        try {
          const linked = await linkSignedInDevice(session);
          if (linked?.installationId) {
            localStorage.setItem('o.installationId', linked.installationId);
            installationId = linked.installationId;
            location.reload();
            return;
          }
        } catch {}
      }
      setAuthMode('create');
      return;
    }

    if (!session || session.user?.id !== accountStatus.installationId) {
      if (session) await authClient.auth.signOut().catch(() => {});
      setAuthMode('login', accountStatus.username);
      return;
    }

    await linkSignedInDevice(session).catch(() => {});
    await accountBootComplete(false);
  } catch (err) {
    setAuthMode(accountStatus?.exists ? 'login' : 'create', accountStatus?.username || null);
    accountError(err?.message || 'Account service unavailable.');
  }
}

async function accountBootComplete(reloadForInvite = false) {
  accountReady = true;
  toggleAccountGate(false);
  try { if (document.getElementById('usernameDialog')?.open) document.getElementById('usernameDialog').close(); } catch {}
  await loadProfile();
  await refreshAccountProfile();
  await refreshLevelStatus();
  if (reloadForInvite && new URLSearchParams(location.search).has('live')) {
    location.reload();
  }
}

async function signOutAccount() {
  try { await authClient?.auth.signOut(); } catch {}
  accountReady = false;
  setAuthMode('login', profile?.username || accountStatus?.username || null);
  toggleAccountGate(true);
}

async function refreshAccountProfile() {
  if (!accountReady || !authClient) return;
  try {
    const { data } = await authClient.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    const me = await accountEdge('me', {}, token);
    accountStatus = { ...(accountStatus || {}), ...me, exists: true, needsPassword: false };
    document.getElementById('accountProfileName').textContent = me.username;
    renderAvatar(me.avatarUrl, me.username);
    if (profile) profile.avatar_url = me.avatarUrl || null;
  } catch {}
}

function renderAvatar(url, username) {
  const img = document.getElementById('accountAvatarImage');
  const fallback = document.getElementById('accountAvatarFallback');
  const monogram = document.getElementById('profileMonogram');
  const letter = String(username || profile?.username || '?').slice(0, 1).toUpperCase();
  fallback.textContent = letter;
  if (url) {
    img.src = url;
    img.classList.add('visible');
    if (monogram) {
      monogram.textContent = '';
      monogram.style.backgroundImage = `url("${String(url).replace(/"/g, '')}")`;
      monogram.classList.add('has-avatar');
    }
  } else {
    img.removeAttribute('src');
    img.classList.remove('visible');
    if (monogram) {
      monogram.style.backgroundImage = '';
      monogram.classList.remove('has-avatar');
      monogram.textContent = letter;
    }
  }
}

async function uploadAvatar(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast('IMAGE MUST BE UNDER 2 MB');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showToast('USE JPG · PNG · WEBP');
  try {
    const { data } = await authClient.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Sign in required.');
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(ACCOUNT_API, { method: 'POST', headers: { apikey: API_KEY, Authorization: `Bearer ${token}` }, body: fd });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(out?.error || 'Upload failed.');
    renderAvatar(out.avatarUrl, profile?.username);
    if (profile) profile.avatar_url = out.avatarUrl;
    showToast('PROFILE PHOTO UPDATED');
  } catch (err) {
    showToast(err?.message || 'AVATAR UPLOAD FAILED');
  } finally {
    e.target.value = '';
  }
}

function toggleLevelHub(open = true) {
  const hub = document.getElementById('levelHub');
  hub.classList.toggle('visible', open);
  hub.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function toggleLevelClear(open = true) {
  const el = document.getElementById('levelClearOverlay');
  el.classList.toggle('visible', open);
  el.setAttribute('aria-hidden', open ? 'false' : 'true');
}

async function openLevelHub() {
  if (!accountReady) return toggleAccountGate(true);
  toggleLevelHub(true);
  document.getElementById('levelHubCopy').textContent = 'Loading your progression…';
  await refreshLevelStatus();
}

async function refreshLevelStatus() {
  if (!profile) return;
  try {
    levelSnapshot = await levelEdge('status');
    renderLevelStatus();
  } catch {
    document.getElementById('levelHubCopy').textContent = 'Progress is temporarily unavailable.';
  }
}

function renderLevelStatus() {
  if (!levelSnapshot) return;
  const p = levelSnapshot.progress || { current_level: 1, highest_level: 0, stars: 0 };
  const d = levelSnapshot.definition;
  const complete = !!levelSnapshot.complete;
  const level = Number(p.current_level || 1);
  const stars = Number(p.stars || 0);
  document.getElementById('levelHomeLevel').textContent = complete ? 'COMPLETE' : `LV. ${String(level).padStart(2, '0')}`;
  document.getElementById('levelHomeTarget').textContent = complete ? 'ALL 20 CLEARED' : `${Number(d?.target_score || 80).toFixed(Number(d?.target_score || 80) % 1 ? 1 : 0)}+ IN 60 SEC`;
  document.getElementById('levelHomeStars').textContent = `★ ${stars}`;
  document.getElementById('levelHubStars').textContent = `★ ${stars}`;
  document.getElementById('accountProfileLevel').textContent = complete ? '20' : String(level).padStart(2, '0');
  document.getElementById('accountProfileStars').textContent = String(stars);
  document.getElementById('levelHubLevel').textContent = complete ? 'ALL LEVELS CLEARED' : `LEVEL ${String(level).padStart(2, '0')} / 20`;
  document.getElementById('levelHubTarget').textContent = complete ? '99+' : Number(d?.target_score || 80).toFixed(2);
  document.getElementById('levelHubReward').textContent = complete ? 'RUN COMPLETE' : `+${Number(d?.reward_stars || 0)} STARS`;
  document.getElementById('levelHubCopy').textContent = complete ? 'You cleared the entire progression. PERFECT HUNTER.' : 'Beat the target before the clock reaches zero. Every circle is server verified.';
  document.getElementById('levelStartButton').textContent = complete ? 'RUN COMPLETE' : levelSnapshot.activeRun ? 'RESUME RUN' : 'START 60 SEC';
  document.getElementById('levelStartButton').disabled = complete;
  const highest = Number(p.highest_level || 0);
  document.querySelectorAll('[data-level-milestone]').forEach(el => el.classList.toggle('unlocked', highest >= Number(el.dataset.levelMilestone)));
}

async function startLevelRun() {
  if (!accountReady) return toggleAccountGate(true);
  try {
    const data = await levelEdge('start');
    levelSnapshot = { ...(levelSnapshot || {}), ...data, activeRun: data.run || levelSnapshot?.activeRun };
    if (data.complete) { renderLevelStatus(); return; }
    levelRun = data.run || data.activeRun;
    if (!levelRun) throw new Error('Could not start level.');
    toggleLevelHub(false);
    toggleLevelClear(false);
    levelExpiredShown = false;
    startGame('level');
    const target = Number(levelRun.target_score);
    const level = Number(levelRun.level_no);
    els.gameModeEyebrow.textContent = '60 SEC';
    els.gameModeLabel.textContent = 'LEVEL RUN';
    els.promptIndex.textContent = `L${String(level).padStart(2, '0')}`;
    els.promptText.textContent = `Hit ${target.toFixed(2)}+ before time runs out.`;
    document.getElementById('levelHud').classList.remove('hidden');
    document.getElementById('levelHudLevel').textContent = `LV.${String(level).padStart(2, '0')}`;
    document.getElementById('levelHudTarget').textContent = `${target.toFixed(2)}+`;
    document.getElementById('levelHudBest').textContent = levelRun.best_score == null ? '—' : Number(levelRun.best_score).toFixed(2);
    startLevelClock();
  } catch (err) {
    showToast(err?.message || 'LEVEL UNAVAILABLE');
    await refreshLevelStatus();
  }
}

function levelSecondsLeft() {
  if (!levelRun?.expires_at) return 0;
  return Math.max(0, (new Date(levelRun.expires_at).getTime() - Date.now()) / 1000);
}

function formatLevelClock(sec) {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
}

function startLevelClock() {
  clearInterval(levelTimer);
  const tick = () => {
    if (!levelRun) return;
    const left = levelSecondsLeft();
    const clock = document.getElementById('levelHudClock');
    if (clock) clock.textContent = formatLevelClock(left);
    if (left <= 0 && !levelExpiredShown) {
      levelExpiredShown = true;
      clearInterval(levelTimer);
      document.getElementById('levelHud')?.classList.add('hidden');
      if (gameMode === 'level') {
        showLevelFailed();
      }
    }
  };
  tick();
  levelTimer = setInterval(tick, 100);
}

function showLevelFailed() {
  closeResult();
  const target = Number(levelRun?.target_score || 0);
  document.getElementById('levelClearKicker').textContent = 'TIME UP';
  document.getElementById('levelClearTitle').textContent = `${target.toFixed(2)}+`;
  document.getElementById('levelClearReward').textContent = 'NO STARS';
  document.getElementById('levelClearCopy').textContent = `Level ${String(levelRun?.level_no || 1).padStart(2, '0')} remains locked. Try again.`;
  document.getElementById('levelBadgeReveal').classList.add('hidden');
  document.getElementById('levelClearNext').textContent = 'RETRY LEVEL →';
  toggleLevelClear(true);
  navigator.vibrate?.([45, 40, 45]);
}

function nextLevelFromOverlay() {
  toggleLevelClear(false);
  levelRun = null;
  clearInterval(levelTimer);
  document.getElementById('levelHud')?.classList.add('hidden');
  showScreen('home');
  openLevelHub();
}

function serializeLevelStroke() {
  return serializeStrokeForServer();
}

async function submitLevelScore(a) {
  if (!levelRun?.id) throw new Error('Level run unavailable.');
  const rect = els.canvas.getBoundingClientRect();
  const r = await fetch(LEVEL_SCORE_API, {
    method: 'POST',
    headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId, installationSecret, runId: levelRun.id,
      clientScore: +a.score.toFixed(2),
      viewport: { width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 },
      stroke: serializeLevelStroke()
    })
  });
  const text = await r.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!r.ok) {
    const e = new Error(data?.error || `Level verification failed (${r.status})`);
    e.status = r.status;
    throw e;
  }
  return data;
}

function handleLevelVerified(data) {
  const l = data?.level;
  if (!l) return;
  levelRun.best_score = Math.max(Number(levelRun.best_score || 0), Number(data.score || 0));
  levelRun.attempts = Number(l.attempts || levelRun.attempts || 0);
  document.getElementById('levelHudBest').textContent = Number(levelRun.best_score).toFixed(2);
  if (l.passed) {
    clearInterval(levelTimer);
    document.getElementById('levelHud').classList.add('hidden');
    levelRun.completed_at = new Date().toISOString();
    document.getElementById('levelClearKicker').textContent = 'LEVEL CLEARED';
    document.getElementById('levelClearTitle').textContent = `${Number(data.score).toFixed(2)}%`;
    document.getElementById('levelClearReward').textContent = `+${Number(l.rewardStars || 0)} STARS`;
    document.getElementById('levelClearCopy').textContent = Number(l.currentLevel) > 20 ? 'All 20 levels cleared.' : `Level ${String(Number(l.currentLevel)).padStart(2, '0')} unlocked.`;
    const badge = document.getElementById('levelBadgeReveal');
    if (l.badge) { badge.textContent = l.badge; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
    document.getElementById('levelClearNext').textContent = Number(l.currentLevel) > 20 ? 'CONTINUE →' : 'NEXT LEVEL →';
    setTimeout(() => toggleLevelClear(true), 380);
    navigator.vibrate?.([30, 35, 65, 35, 110]);
    refreshLevelStatus();
  } else {
    const target = Number(levelRun.target_score);
    const left = levelSecondsLeft();
    els.resultRank.textContent = `NEED ${target.toFixed(2)}`;
    els.resultVerdict.textContent = `${Number(data.score).toFixed(2)} / ${target.toFixed(2)} · ${Math.ceil(left)}s left`;
    els.resultMode.textContent = 'LEVEL · VERIFIED';
    const retry = document.getElementById('retryButton');
    retry.disabled = left <= 0;
    retry.textContent = left > 0 ? 'TRY AGAIN' : 'TIME UP';
  }
}

const submitScoreV9 = submitScore;
submitScore = async function(a) {
  if (a?.mode === 'level') return submitLevelScore(a);
  return submitScoreV9(a);
};

const applyVerifiedV9 = applyVerifiedResult;
applyVerifiedResult = function(data) {
  const out = applyVerifiedV9(data);
  if (gameMode === 'level') handleLevelVerified(data);
  return out;
};

const resetRoundV9 = resetRound;
resetRound = function() {
  const out = resetRoundV9();
  if (gameMode === 'level' && levelRun) {
    const left = levelSecondsLeft();
    if (left <= 0) showLevelFailed();
    else {
      document.getElementById('levelHud')?.classList.remove('hidden');
      startLevelClock();
    }
  }
  return out;
};

const showScreenV9 = showScreen;
showScreen = function(name) {
  const out = showScreenV9(name);
  if (name !== 'game') document.getElementById('levelHud')?.classList.add('hidden');
  if (name === 'profile') {
    refreshAccountProfile();
    refreshLevelStatus();
  }
  return out;
};

ensureV9UI();
bootAccount();
})();
