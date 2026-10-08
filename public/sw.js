// Surat Batak: simpan aplikasi di perangkat supaya bisa dibuka tanpa internet.
const VERSION = 'surat-batak-v7';
const SHELL = ['/', '/index.html', '/manifest.json', '/fonts/NotoSansBatak-Regular.ttf', '/assets/artikel.css', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const cdn = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host);
  if(!same && !cdn) return;
  // statistik dan halaman admin selalu langsung dari server
  if(same && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin'))) return;
  // halaman, artikel, dan profil: ambil versi terbaru dulu, pakai salinan tersimpan bila luring
  const fresh = same && (req.mode === 'navigate' || url.pathname.startsWith('/artikel/') || url.pathname === '/data/profil.json' || url.pathname.endsWith('.xml'));
  if(fresh){
    e.respondWith(fetch(req).then(r => {
      if(r.ok){ const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    }).catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('/') : Response.error())));
    return;
  }
  // berkas lain (font, ikon, data kitab, gambar): salinan tersimpan dulu
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if(r.ok || r.type === 'opaque'){ const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
