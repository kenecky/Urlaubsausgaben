// Service Worker: speichert die App beim ersten Öffnen, danach läuft sie offline.
// Bei Änderungen an der App die Versionsnummer erhöhen, damit Handys die neue Fassung laden.
var CACHE = 'reiseausgaben-v7';
var DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(DATEIEN); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.filter(function (n) { return n !== CACHE; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Zuerst Netz (frische Version), bei fehlendem Internet aus dem Cache.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (antwort) {
      var kopie = antwort.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, kopie); });
      return antwort;
    }).catch(function () {
      return caches.match(e.request).then(function (treffer) {
        return treffer || caches.match('./index.html');
      });
    })
  );
});
