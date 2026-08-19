(() => {
  'use strict';
  const VERSION = '9.0';
  window.O_ACCOUNT_V9 = true;

  // V9 replaces the legacy username-only modal with a real account gate.
  // Keep the element for backwards-compatible listeners, but never surface it.
  const legacyUsernameDialog = document.getElementById('usernameDialog');
  if (legacyUsernameDialog) {
    legacyUsernameDialog.showModal = () => {};
    legacyUsernameDialog.show = () => {};
  }

  for (const href of ['./retention.css','./progress.css','./rivals.css','./v7.css','./v8.css','./v9.css']) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${href}?v=${VERSION}`;
    document.head.appendChild(css);
  }
  const parts = ['./app-core.js','./app-engine.js','./app-ui.js','./progress.js','./rivals.js','./v7.js','./v8.js','./v9.js'];
  const load = (src) => new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = `${src}?v=${VERSION}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
  (async () => {
    try { for (const part of parts) await load(part); }
    catch (error) { console.error('[O.] boot failed', error); }
  })();
})();
