import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Précache de production : aucune dépendance ni CDN à l'exécution.
function horsLigne() {
  return {
    name: 'vertige-hors-ligne',
    generateBundle(_, bundle) {
      const fichiers = Object.keys(bundle).filter((nom) => !nom.endsWith('.map'));
      const hash = createHash('sha256');
      for (const nom of fichiers.sort()) hash.update(nom).update(bundle[nom].code ?? bundle[nom].source ?? '');
      for (const nom of ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']) hash.update(readFileSync(new URL('./public/' + nom, import.meta.url)));
      const version = hash.digest('hex').slice(0, 16);
      const precache = [...new Set(['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', ...fichiers.map((f) => './' + f)])];
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const PREFIX = 'vertige:' + self.registration.scope + ':';
const CACHE = PREFIX + '${version}';
const URLS = ${JSON.stringify(precache)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
});
// Pas de skipWaiting : une partie ouverte conserve sa version jusqu'à fermeture.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(event.request, { ignoreVary: true });
    if (saved) return saved;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return cache.match('./index.html');
      throw error;
    }
  }));
});
` });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [horsLigne()],
  server: { port: 5174, host: true },
  build: { target: 'es2020', outDir: 'dist', sourcemap: true },
});
