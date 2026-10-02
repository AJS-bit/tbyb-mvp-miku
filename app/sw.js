// Lives in the app directory, so its default (and maximum) scope is that directory only:
// pages outside it (the website at the parent path) are never controlled or cached.
// Paths are relative to this file so the same build works at /app/ locally and at
// /tbyb-mvp-miku/app/ on GitHub Pages.
const BASE = new URL('./', self.location.href);
// Cache names include the scope path: Cache Storage is shared by every project on the same
// origin (e.g. ajs-bit.github.io), so never touch caches this app did not create.
const PREFIX = 'tbyb-pwa:' + BASE.pathname + ':';
const CACHE = PREFIX + 'v13-miku-color';
const SHELL = ['./', 'index.html', 'studio/', 'studio/index.html', 'styles.css', 'identity.css', 'visuals.mjs', 'fonts/gowun-batang.woff2', 'theme.js', 'theme.css', 'ui.mjs', 'app-view.mjs', 'bridge.mjs', 'reflection.mjs', 'app-v2.css', 'model.mjs', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'brand/mark.svg', 'brand/mark-dark.svg', 'brand/mark-mono.svg', 'brand/mark-reverse.svg', 'brand/app-icon.svg', 'brand/app-icon-dark.svg', 'brand/app-icon-maskable.svg'].map(path => new URL(path, BASE).href);
const SHELL_PATHS = new Set(SHELL.map(href => new URL(href).pathname));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname) || !SHELL_PATHS.has(url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => { if (response.ok && response.type === 'basic' && !response.redirected) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; }).catch(async () => (await caches.match(event.request, {ignoreSearch: true})) || new Response('처음 연결한 뒤 오프라인으로 사용할 수 있어요.', {status: 503})));
});
