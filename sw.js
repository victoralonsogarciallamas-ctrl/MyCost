/* MyCost service worker: the app shell is cached so the app opens without connection.
   The ticket and Excel readers (vendor/) and the fonts are cached the first time they are used. */
const VERSION = 'mycost-1.7.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/apple-touch-icon.png'];
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'mycost-runtime').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cacheFirst = () => e.respondWith(caches.open('mycost-runtime').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
  if (url.origin === location.origin && url.pathname.includes('/vendor/')) return cacheFirst();
  if (FONTS.test(req.url)) return cacheFirst();
  if (url.origin === location.origin){
    // Network first for the page so updates arrive; no-cache skips the 10 minute HTTP cache of GitHub Pages.
    e.respondWith(fetch(req, {cache: 'no-cache'}).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  }
});
