// ─── Cache names ────────────────────────────────────────────────────────────
const CACHE_STATIC = 'cc-static-v2';   // /_next/static/* — immutable
const CACHE_IMAGES = 'cc-images-v2';   // icons, webp, svg, png — cache-first LRU
const CACHE_PAGES  = 'cc-pages-v2';    // HTML navigation — stale-while-revalidate
const CACHE_API    = 'cc-api-v2';      // /api/universities + /api/fields — SWR 5 min
const ALL_CACHES   = [CACHE_STATIC, CACHE_IMAGES, CACHE_PAGES, CACHE_API];

const OFFLINE_URL       = '/offline';
const IMAGES_MAX        = 60;
const API_MAX_AGE_MS    = 5 * 60 * 1000;

// Endpoints whose POST requests are queued offline (Task 2 adds the handler)
const QUEUED_ENDPOINTS  = ['/api/study-plans/update', '/api/schedule'];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES)
      .then((cache) =>
        cache.addAll([OFFLINE_URL, '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'])
      )
      .then(() => self.skipWaiting())
  );
});

// ─── Activate — evict old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Queue offline writes (handler added in Task 2)
  if (request.method === 'POST' && QUEUED_ENDPOINTS.some((ep) => url.pathname.startsWith(ep))) {
    event.respondWith(handleOfflineWrite(request));
    return;
  }

  // Skip non-GET after write check
  if (request.method !== 'GET') return;

  // 1. Static assets — cache-first (immutable content-hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 2. Images — cache-first with LRU eviction
  if (url.pathname.startsWith('/icons/') || /\.(webp|svg|png|jpe?g)$/.test(url.pathname)) {
    event.respondWith(cacheFirstImages(request));
    return;
  }

  // 3. Public reference API — stale-while-revalidate with 5 min TTL
  if (url.pathname === '/api/universities' || url.pathname === '/api/fields') {
    event.respondWith(staleWhileRevalidateApi(request));
    return;
  }

  // 4. Other API — network-only
  if (url.pathname.startsWith('/api/')) return;

  // 5. HTML navigation — stale-while-revalidate
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidatePages(request, event));
    return;
  }
});

// ─── Strategy helpers ────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function cacheFirstImages(request) {
  const cache = await caches.open(CACHE_IMAGES);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (!response.ok) return response;
    const keys = await cache.keys();
    if (keys.length >= IMAGES_MAX) cache.delete(keys[0]); // evict oldest
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function staleWhileRevalidateApi(request) {
  const cache = await caches.open(CACHE_API);
  const cached = await cache.match(request);
  if (cached) {
    const age = Date.now() - Number(cached.headers.get('sw-cached-at') || 0);
    if (age < API_MAX_AGE_MS) {
      // Still fresh — revalidate in background
      fetch(request).then((res) => {
        if (res.ok) putWithTimestamp(cache, request, res);
      }).catch(() => {});
      return cached;
    }
  }
  try {
    const response = await fetch(request);
    if (response.ok) putWithTimestamp(cache, request, response.clone());
    return response;
  } catch {
    return cached || new Response('', { status: 503 });
  }
}

async function staleWhileRevalidatePages(request, event) {
  const cache = await caches.open(CACHE_PAGES);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      const cc = res.headers.get('cache-control') || '';
      if (res.ok && !cc.includes('no-store')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(networkPromise);  // keep background revalidation alive
    return cached;
  }
  const response = await networkPromise;
  if (response) return response;
  return (await cache.match(OFFLINE_URL)) || new Response('Offline', { status: 503 });
}

function putWithTimestamp(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  cache.put(request, new Response(response.body, { status: response.status, statusText: response.statusText, headers }));
}

// ─── IndexedDB queue ─────────────────────────────────────────────────────────
const DB_NAME    = 'cc-offline-queue';
const DB_VERSION = 1;
const STORE      = 'sync-queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('url', 'url', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueWrite(url, method, body) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    // Deduplicate study-plan updates by planId
    if (url.includes('/api/study-plans/update') && body.planId) {
      const idx = store.index('url').getAll(url);
      idx.onsuccess = () => {
        const dup = idx.result.find((e) => {
          try { return JSON.parse(e.body).planId === body.planId; } catch { return false; }
        });
        if (dup) store.delete(dup.id);
        store.add({ url, method, body: JSON.stringify(body), timestamp: Date.now(), retries: 0, failed: false });
      };
    } else {
      store.add({ url, method, body: JSON.stringify(body), timestamp: Date.now(), retries: 0, failed: false });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function drainQueue() {
  const db = await openDB();
  const entries = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve(req.result.filter((e) => !e.failed).sort((a, b) => a.timestamp - b.timestamp));
    req.onerror = () => reject(req.error);
  });

  let remaining = entries.length;

  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: { 'Content-Type': 'application/json' },
        body: entry.body,
      });
      // 2xx or 4xx (bad request — won't succeed on retry) → remove
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await dbDelete(db, entry.id);
        remaining--;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      const retries = entry.retries + 1;
      await dbPut(db, { ...entry, retries, failed: retries >= 3 });
    }
    broadcast({ type: 'SYNC_PROGRESS', remaining });
  }

  broadcast({ type: 'SYNC_COMPLETE' });
}

function dbDelete(db, id) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = res;
    tx.onerror = rej;
  });
}

function dbPut(db, entry) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = res;
    tx.onerror = rej;
  });
}

async function broadcast(msg) {
  const clients = await self.clients.matchAll();
  clients.forEach((c) => c.postMessage(msg));
}

async function getPendingCount() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.filter((e) => !e.failed).length);
    req.onerror = () => resolve(0);
  });
}

// ─── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-writes') event.waitUntil(drainQueue());
});

// ─── Online fallback (posted by OfflineIndicator) ────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ONLINE') event.waitUntil(drainQueue());
});

// ─── Offline write handler (full implementation) ─────────────────────────────
async function handleOfflineWrite(request) {
  const clone = request.clone();
  let body = {};
  try { body = await clone.json(); } catch { /* non-JSON body */ }

  try {
    return await fetch(request);
  } catch {
    await queueWrite(new URL(request.url).pathname, request.method, body);
    try { await self.registration.sync.register('offline-writes'); } catch { /* not supported */ }
    const pending = await getPendingCount();
    broadcast({ type: 'QUEUED', pending });
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
