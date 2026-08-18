(() => {
  'use strict';
  const parts = ['./app-core.js','./app-engine.js','./app-ui.js'];
  const load = (src) => new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
  (async () => {
    try { for (const part of parts) await load(part); }
    catch (error) { console.error('[O.] boot failed', error); }
  })();
})();
