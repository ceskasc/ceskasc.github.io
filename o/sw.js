const CACHE='o-circle-v9-0';
const ASSETS=['./','./index.html','./styles.css?v=9.0','./retention.css?v=9.0','./progress.css?v=9.0','./rivals.css?v=9.0','./v7.css?v=9.0','./v8.css?v=9.0','./v9.css?v=9.0','./app.js?v=9.0','./app-core.js?v=9.0','./app-engine.js?v=9.0','./app-ui.js?v=9.0','./progress.js?v=9.0','./rivals.js?v=9.0','./v7.js?v=9.0','./v8.js?v=9.0','./v9.js?v=9.0','./config.js?v=9.0','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('supabase.co')||u.hostname==='esm.sh')return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return res;}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;})));
});
