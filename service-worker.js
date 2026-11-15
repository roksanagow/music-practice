const CACHE='cadence-app-v1';
const OFFLINE_FILES=['./','./index.html','./styles.css','./manifest.webmanifest','./public/icon.svg','./public/icon-192.png','./public/icon-512.png','./src/app.js','./src/storage.js','./src/theory.js','./src/backup.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(OFFLINE_FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(req,clone));}return response;})));
});
