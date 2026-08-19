const CACHE='o-circle-v14-0';
const ASSETS=['./','./index.html','./styles.css?v=14.0','./retention.css?v=14.0','./progress.css?v=14.0','./rivals.css?v=14.0','./v7.css?v=14.0','./v8.css?v=14.0','./v9.css?v=14.0','./v10.css?v=14.0','./v11.css?v=14.0','./v12-desktop.css?v=14.0','./v12-mobile.css?v=14.0','./v13-mobile.css?v=14.0','./v13.1-sharp.css?v=14.0','./v13.2-type-dock.css?v=14.0','./v13.3-hero.css?v=14.0','./v14-live-party.css?v=14.0','./app.js?v=14.0','./app-core.js?v=14.0','./app-engine.js?v=14.0','./app-ui.js?v=14.0','./progress.js?v=14.0','./rivals.js?v=14.0','./v7.js?v=14.0','./v13.4-live-auth-bridge.js?v=14.0','./v13.5-preflight.js?v=14.0','./v8.js?v=14.0','./v9.1.js?v=14.0','./v9.2.js?v=14.0','./v10.js?v=14.0','./v11.js?v=14.0','./i18n-tr.js?v=14.0','./v11-tr-fix.js?v=14.0','./v12-desktop.js?v=14.0','./v12-mobile.js?v=14.0','./v13.5-stability.js?v=14.0','./v13.6-duel-finalizer.js?v=14.0','./v14-live-party.js?v=14.0','./config.js?v=14.0','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('o-circle-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
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