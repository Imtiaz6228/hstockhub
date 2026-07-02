const CACHE_VERSION = 'humkt-v58';
const STATIC_CACHE = 'humkt-static-v58';
const IMG_CACHE = 'humkt-img-v1';
const OFFLINE_URL = '/offline.html';

const PRE_CACHE = [
  OFFLINE_URL,
  '/assets/templates/basic/css/icons/icon-192x192.png',
];

// ===== Install =====
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(PRE_CACHE);
    })
  );
  self.skipWaiting();
});

// ===== Activate: clean old caches =====
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) {
          return n !== STATIC_CACHE && n !== IMG_CACHE;
        }).map(function(n) {
          return caches.delete(n);
        })
      );
    }).then(function() {
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
      });
    })
  );
  self.clients.claim();
});

// ===== Fetch: smart strategy by resource type =====
self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  var url = new URL(request.url);

  // Skip API, admin, payment, and JSON endpoints
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/qaz') ||
      url.pathname.startsWith('/ipn') ||
      url.pathname.startsWith('/payment') ||
      url.pathname.endsWith('-json') ||
      url.pathname.endsWith('.json') ||
      request.headers.get('Accept') === 'application/json' ||
      request.headers.get('X-Requested-With') === 'XMLHttpRequest') return;

  // === Navigation: network-only + offline fallback (不缓存HTML，避免引用旧JS) ===
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function() {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // === Images: cache-first (separate cache, long-lived) ===
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(IMG_CACHE).then(function(cache) {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // === Vite assets (带hash的JS/CSS): 不缓存，让浏览器HTTP缓存处理 ===
  if (url.pathname.includes('/assets/vue/')) {
    return; // 不拦截，走浏览器默认行为
  }

  // === 其他CSS/JS/Fonts: stale-while-revalidate ===
  if (/\.(css|js|woff2?|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(function(cached) {
        var fetchPromise = fetch(request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(STATIC_CACHE).then(function(cache) {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(function() { return cached; });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // === Default: network-first ===
  event.respondWith(
    fetch(request).catch(function() {
      return caches.match(request);
    })
  );
});

// ===== Web Push (VAPID)：收到推送 → 显示通知 =====
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { try { data = { body: event.data && event.data.text() }; } catch (e2) {} }

  var title = data.title || '新消息';
  var options = {
    body: data.body || '',
    icon: data.icon || '/assets/templates/basic/css/icons/icon-192x192.png',
    badge: '/assets/templates/basic/css/icons/icon-192x192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    renotify: !!data.tag,
    tag: data.tag || undefined
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ===== 点击通知 → 跳转/聚焦对应页面 =====
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      // 已有打开同一 URL 的窗口 → 聚焦
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url && 'focus' in list[i]) return list[i].focus();
      }
      // 否则聚焦任意窗口并导航
      for (var j = 0; j < list.length; j++) {
        var c = list[j];
        if ('focus' in c) {
          if ('navigate' in c) { try { c.navigate(url); } catch (e) {} }
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ===== Message: allow page to trigger skip waiting =====
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
