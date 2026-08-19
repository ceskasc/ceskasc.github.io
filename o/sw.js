const CACHE='o-circle-v8-1';
const ASSETS=['./','./index.html','./styles.css?v=8.0','./retention.css?v=8.1','./progress.css?v=8.1','./rivals.css?v=8.1','./v7.css?v=8.1','./v8.css?v=8.1','./app.js?v=8.0','./app-core.js?v=8.1','./app-engine.js?v=8.1','./app-ui.js?v=8.1','./progress.js?v=8.1','./rivals.js?v=8.1','./v7.js?v=8.1','./v8.js?v=8.1','./config.js?v=8.0','./manifest.webmanifest','./icon.svg'];
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
