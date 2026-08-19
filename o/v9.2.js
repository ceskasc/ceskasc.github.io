(() => {
  'use strict';

  const ACCOUNT_API_V92 = `${config.supabaseUrl || ''}/functions/v1/o-account`;
  let resetAvailable = false;
  let resetEditing = false;

  async function accountHotfix(action, payload = {}) {
    const r = await fetch(ACCOUNT_API_V92, {
      method: 'POST',
      headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, installationId, installationSecret, ...payload })
    });
    const text = await r.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch {} }
    if (!r.ok) {
      const e = new Error(data?.error || `Account request failed (${r.status})`);
      e.status = r.status;
      throw e;
    }
    return data;
  }

  function errorEl() { return document.getElementById('accountError'); }
  function setError(text = '') { const el = errorEl(); if (el) el.textContent = text; }

  function ensureResetButton() {
    const form = document.getElementById('accountForm');
    const submit = document.getElementById('accountSubmit');
    if (!form || !submit || document.getElementById('accountResetPassword')) return;
    submit.insertAdjacentHTML('afterend', `
      <button class="account-reset-password hidden" id="accountResetPassword" type="button">SET / RESET PASSWORD</button>
    `);
    document.getElementById('accountResetPassword').addEventListener('click', handleResetButton);
    const style = document.createElement('style');
    style.textContent = `.account-reset-password{height:44px;border:1px solid rgba(212,244,93,.34);background:transparent;color:#d4f45d;font-size:7px;font-weight:900;letter-spacing:.14em}.account-reset-password.hidden{display:none}.account-reset-password.primary{height:52px;background:#d4f45d;color:#0b0b09;border-color:#d4f45d}.account-reset-password:disabled{opacity:.45}`;
    document.head.appendChild(style);
  }

  function isLoginScreen() {
    const tabs = document.getElementById('accountTabs');
    const login = document.querySelector('[data-auth-tab="login"]');
    return !!tabs && !tabs.classList.contains('hidden') && !!login?.classList.contains('active');
  }

  function renderResetAvailability() {
    ensureResetButton();
    const button = document.getElementById('accountResetPassword');
    if (!button) return;
    button.classList.toggle('hidden', !(resetAvailable && isLoginScreen()));
    if (!isLoginScreen() && resetEditing) exitResetMode();
  }

  function enterResetMode() {
    resetEditing = true;
    setError('');
    const confirm = document.getElementById('accountConfirmLabel');
    const submit = document.getElementById('accountSubmit');
    const reset = document.getElementById('accountResetPassword');
    const password = document.getElementById('accountPassword');
    if (confirm) confirm.classList.remove('hidden');
    if (submit) submit.classList.add('hidden');
    if (reset) { reset.textContent = 'SAVE NEW PASSWORD'; reset.classList.add('primary'); }
    if (password) { password.value = ''; password.autocomplete = 'new-password'; password.placeholder = 'new password · 8+ characters'; password.focus(); }
    const confirmInput = document.getElementById('accountConfirm');
    if (confirmInput) confirmInput.value = '';
    const kicker = document.getElementById('accountKicker');
    const title = document.getElementById('accountTitle');
    const copy = document.getElementById('accountCopy');
    if (kicker) kicker.textContent = 'TRUSTED DEVICE';
    if (title) title.textContent = 'Set a new password.';
    if (copy) copy.textContent = 'This device already owns the profile. Choose a new password without losing scores, CROWNS or progress.';
  }

  function exitResetMode() {
    resetEditing = false;
    const confirm = document.getElementById('accountConfirmLabel');
    const submit = document.getElementById('accountSubmit');
    const reset = document.getElementById('accountResetPassword');
    const password = document.getElementById('accountPassword');
    if (confirm) confirm.classList.add('hidden');
    if (submit) submit.classList.remove('hidden');
    if (reset) { reset.textContent = 'SET / RESET PASSWORD'; reset.classList.remove('primary'); reset.disabled = false; }
    if (password) { password.autocomplete = 'current-password'; password.placeholder = '8+ characters'; }
    const kicker = document.getElementById('accountKicker');
    const title = document.getElementById('accountTitle');
    const copy = document.getElementById('accountCopy');
    if (kicker) kicker.textContent = 'WELCOME BACK';
    if (title) title.textContent = 'Enter O.';
    if (copy) copy.textContent = 'Sign in with your username and password.';
  }

  async function handleResetButton() {
    if (!resetEditing) { enterResetMode(); return; }
    const password = document.getElementById('accountPassword')?.value || '';
    const confirm = document.getElementById('accountConfirm')?.value || '';
    const button = document.getElementById('accountResetPassword');
    if (password.length < 8 || password.length > 72) return setError('Password must be 8–72 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setError('');
    if (button) { button.disabled = true; button.textContent = 'SECURING…'; }
    try {
      await accountHotfix('set_password', { password });
      showToast('PASSWORD UPDATED');
      exitResetMode();
      // V9.1 owns the password-login/session flow. Submit the same new password
      // through that existing handler after the server has repaired the account.
      setTimeout(() => document.getElementById('accountSubmit')?.click(), 80);
    } catch (err) {
      setError(err?.message || 'Could not update password.');
      if (button) { button.disabled = false; button.textContent = 'SAVE NEW PASSWORD'; }
    }
  }

  async function detectTrustedProfile() {
    try {
      const status = await accountHotfix('status');
      resetAvailable = !!(status?.exists && status?.canResetPassword && !status?.needsPassword);
    } catch {
      resetAvailable = false;
    }
    renderResetAvailability();
  }

  function bootHotfix() {
    ensureResetButton();
    detectTrustedProfile();
    const gate = document.getElementById('accountGate');
    const tabs = document.getElementById('accountTabs');
    const observer = new MutationObserver(renderResetAvailability);
    if (gate) observer.observe(gate, { attributes: true, attributeFilter: ['class'] });
    if (tabs) observer.observe(tabs, { attributes: true, subtree: true, attributeFilter: ['class'] });
    document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => setTimeout(renderResetAvailability, 0)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(bootHotfix, 0), { once: true });
  else setTimeout(bootHotfix, 0);
})();
