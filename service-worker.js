const CACHE = 'calorie-tracker-v1';
const FILES = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', evt => {
  evt.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE && caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then(r => r || fetch(evt.request).then(resp => {
      return caches.open(CACHE).then(c => { c.put(evt.request, resp.clone()); return resp; });
    }).catch(() => caches.match('./index.html')))
  );
});