// Service Worker: speichert die App beim ersten Öffnen, danach läuft sie offline.
// Bei Änderungen an der App die Versionsnummer erhöhen, damit Handys die neue Fassung laden.
// Andere Apps auf kenecky.github.io (z. B. F1 Race Control) teilen sich den Cache-Speicher.
// Deshalb beim Aufräumen nur eigene alte Versionen (gleiches Präfix) löschen.
var PREFIX = 'reiseausgaben-v';
var CACHE = PREFIX + '133';
// Feste Bibliotheken (Erkennung, Karte, Video) mit Versionsnummer in der Adresse: einmal laden, dann dauerhaft offline
var LIB_CACHE = 'reiseausgaben-lib-1';
var LIB_MUSTER = [/^https:\/\/cdn\.jsdelivr\.net\/npm\/@techstark\/opencv-js@/, /^https:\/\/unpkg\.com\/(leaflet|mp4-muxer|webm-muxer)@/];
var DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './kurz-neu.png', './kurz-bargeld.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(DATEIEN); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.filter(function (n) { return n.indexOf(PREFIX) === 0 && n !== CACHE; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Zuerst Netz (frische Version), bei fehlendem Internet aus dem Cache.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (LIB_MUSTER.some(function (m) { return m.test(e.request.url); })) {
    e.respondWith(caches.open(LIB_CACHE).then(function (c) {
      return c.match(e.request.url).then(function (t) {
        return t || fetch(e.request).then(function (a) { if (a && (a.ok || a.type === 'opaque')) c.put(e.request.url, a.clone()); return a; });
      });
    }));
    return;
  }
  if (new URL(e.request.url).origin !== self.location.origin) return; // z. B. Kurs-Abfragen nicht zwischenspeichern
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
