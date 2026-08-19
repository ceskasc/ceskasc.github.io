(() => {
  'use strict';
  const VERSION = '8.1';
  for (const href of ['./retention.css','./progress.css','./rivals.css','./v7.css','./v8.css']) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${href}?v=${VERSION}`;
    document.head.appendChild(css);
  }
  const parts = ['./app-core.js','./app-engine.js','./app-ui.js','./progress.js','./rivals.js','./v7.js','./v8.js'];
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
