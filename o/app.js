(() => {
  'use strict';
  const VERSION = '13.2';
  window.O_ACCOUNT_V9 = true;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`./sw.js?v=${VERSION}`, { updateViaCache:'none' }).then(reg => reg.update()).catch(() => {});
    }, { once:true });
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    try {
      const rawUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (response.ok && rawUrl.includes('/functions/v1/o-account')) {
        const data = await response.clone().json();
        if (typeof data?.installationSecret === 'string' && data.installationSecret.length === 43) {
          localStorage.setItem('o.installationSecret', data.installationSecret);
          try { installationSecret = data.installationSecret; } catch {}
        }
        if (typeof data?.installationId === 'string' && data.installationId.length === 36) {
          localStorage.setItem('o.installationId', data.installationId);
          try { installationId = data.installationId; } catch {}
        }
      }
    } catch {}
    return response;
  };

  const legacyUsernameDialog = document.getElementById('usernameDialog');
  if (legacyUsernameDialog) {
    legacyUsernameDialog.showModal = () => {};
    legacyUsernameDialog.show = () => {};
  }

  for (const href of ['./retention.css','./progress.css','./rivals.css','./v7.css','./v8.css','./v9.css','./v10.css','./v11.css','./v12-desktop.css','./v12-mobile.css','./v13-mobile.css','./v13.1-sharp.css','./v13.2-type-dock.css']) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${href}?v=${VERSION}`;
    document.head.appendChild(css);
  }
  const parts = ['./app-core.js','./app-engine.js','./app-ui.js','./progress.js','./rivals.js','./v7.js','./v8.js','./v9.1.js','./v9.2.js','./v10.js','./v11.js','./i18n-tr.js','./v11-tr-fix.js','./v12-desktop.js','./v12-mobile.js'];
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