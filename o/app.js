(() => {
  'use strict';
  const VERSION = '5.0';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = `./retention.css?v=${VERSION}`;
  document.head.appendChild(css);
  const parts = ['./app-core.js','./app-engine.js','./app-ui.js'];
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
