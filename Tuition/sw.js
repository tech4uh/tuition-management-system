// // Service worker: lets the app open offline and install as an app.
// // Same-origin files: network first (always fresh), cache as fallback.
// // Firebase SDK scripts: cache first. Firestore / Auth requests are never touched.
// var CACHE = 'tuition-v1';

// var FILES = [
//   './',
//   'css/style.css',
//   'js/helpers.js',
//   'js/extras.js',
//   'js/icons.js',
//   'js/data.js',
//   'js/modal.js',
//   'js/dashboard.js',
//   'js/students.js',
//   'js/groups.js',
//   'js/app.js',
//   'js/cloud.js',
//   'js/reminder.js',
//   'manifest.json',
//   'icons/icon-192.png',
//   'icons/icon-512.png',
//   'icons/apple-touch-icon.png'
// ];

// var FB = [
//   'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
//   'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
//   'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
// ];

// self.addEventListener('install', function (e) {
//   e.waitUntil(
//     caches.open(CACHE).then(function (c) {
//       // one missing file must not break the install
//       var jobs = FILES.map(function (u) { return c.add(u).catch(function () {}); });
//       FB.forEach(function (u) {
//         jobs.push(
//           fetch(u, { mode: 'no-cors' })
//             .then(function (r) { return c.put(u, r); })
//             .catch(function () {})
//         );
//       });
//       return Promise.all(jobs);
//     }).then(function () { return self.skipWaiting(); })
//   );
// });

// self.addEventListener('activate', function (e) {
//   e.waitUntil(
//     caches.keys().then(function (keys) {
//       return Promise.all(keys.filter(function (k) { return k !== CACHE; })
//         .map(function (k) { return caches.delete(k); }));
//     }).then(function () { return self.clients.claim(); })
//   );
// });

// self.addEventListener('fetch', function (e) {
//   var req = e.request;
//   if (req.method !== 'GET') return;
//   var url = new URL(req.url);
//   var same = url.origin === self.location.origin;
//   var fbSdk = url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
//   if (!same && !fbSdk) return;   // Firestore, Auth etc: leave alone

//   if (fbSdk) {
//     e.respondWith(
//       caches.match(req).then(function (hit) {
//         return hit || fetch(req).then(function (res) {
//           var copy = res.clone();
//           caches.open(CACHE).then(function (c) { c.put(req, copy); });
//           return res;
//         });
//       })
//     );
//     return;
//   }

//   e.respondWith(
//     fetch(req).then(function (res) {
//       if (res.ok && !res.redirected) {
//         var copy = res.clone();
//         caches.open(CACHE).then(function (c) { c.put(req, copy); });
//       }
//       return res;
//     }).catch(function () {
//       return caches.match(req, { ignoreSearch: true }).then(function (hit) {
//         return hit || (req.mode === 'navigate' ? caches.match('./') : undefined);
//       });
//     })
//   );
// });

// Service worker: lets the app open offline and install as an app.
// Same-origin files: network first (always fresh), cache as fallback.
// Firebase SDK scripts: cache first. Firestore / Auth requests are never touched.
var CACHE = 'tuition-v3';

var FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/helpers.js',
  'js/extras.js',
  'js/icons.js',
  'js/data.js',
  'js/modal.js',
  'js/dashboard.js',
  'js/students.js',
  'js/groups.js',
  'js/app.js',
  'js/cloud.js',
  'js/reminder.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

var FB = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(FILES).then(function () {
        return Promise.all(FB.map(function (u) {
          return fetch(u, { mode: 'no-cors' })
            .then(function (r) { return c.put(u, r); })
            .catch(function (err) {
              console.warn('SW: could not cache Firebase SDK', u, err);
            });
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  var fbSdk = url.hostname === 'www.gstatic.com' &&
              url.pathname.indexOf('/firebasejs/') === 0;

  // Firestore, Auth etc: leave alone
  if (!same && !fbSdk) return;

  // Firebase SDK: cache first
  if (fbSdk) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (!res.ok && res.type !== 'opaque') return res;
          return caches.open(CACHE).then(function (c) {
            return c.put(req, res.clone()).then(function () { return res; });
          }).catch(function () { return res; });
        });
      })
    );
    return;
  }

  // Same-origin files: network first, cache fallback
  e.respondWith(
    fetch(req).then(function (res) {
      if (!res.ok || res.redirected) {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || res;
        });
      }
      return caches.open(CACHE).then(function (c) {
        return c.put(req, res.clone()).then(function () { return res; });
      }).catch(function () { return res; });
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});