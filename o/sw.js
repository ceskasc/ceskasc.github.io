const CACHE='o-circle-v6-0';
const ASSETS=['./','./index.html','./styles.css?v=5.0','./retention.css?v=6.0','./progress.css?v=6.0','./app.js?v=5.0','./app-core.js?v=6.0','./app-engine.js?v=6.0','./app-ui.js?v=6.0','./progress.js?v=6.0','./config.js?v=5.0','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET')return; const u=new URL(e.request.url); if(u.hostname.endsWith('supabase.co'))return; e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}))); });
