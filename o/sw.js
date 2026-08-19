const CACHE='o-circle-v13-1';
const ASSETS=['./','./index.html','./styles.css?v=13.0','./retention.css?v=13.1','./progress.css?v=13.1','./rivals.css?v=13.1','./v7.css?v=13.1','./v8.css?v=13.1','./v9.css?v=13.1','./v10.css?v=13.1','./v11.css?v=13.1','./v12-desktop.css?v=13.1','./v12-mobile.css?v=13.1','./v13-mobile.css?v=13.1','./v13.1-sharp.css?v=13.1','./app.js?v=13.0','./app.js?v=13.1','./app-core.js?v=13.1','./app-engine.js?v=13.1','./app-ui.js?v=13.1','./progress.js?v=13.1','./rivals.js?v=13.1','./v7.js?v=13.1','./v8.js?v=13.1','./v9.1.js?v=13.1','./v9.2.js?v=13.1','./v10.js?v=13.1','./v11.js?v=13.1','./i18n-tr.js?v=13.1','./v11-tr-fix.js?v=13.1','./v12-desktop.js?v=13.1','./v12-mobile.js?v=13.1','./config.js?v=13.0','./config.js?v=13.1','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();const windows=await self.clients.matchAll({type:'window'});for(const client of windows){try{await client.navigate(client.url)}catch{}}})()));
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