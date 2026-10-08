// Membangun situs Surat Batak: menyalin aplikasi (public/) ke dist/,
// lalu membuat halaman artikel, RSS, sitemap, dan data profil dari folder content/.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const require = createRequire(import.meta.url);
const BT = require('../lib/batak.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public'), OUT = path.join(ROOT, 'dist'), CONTENT = path.join(ROOT, 'content');
const SITE = (process.env.URL || process.env.SITE_URL || '').replace(/\/$/, '');
const NAMA_SITUS = 'Surat Batak';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uni = t => BT.latinToBatak(String(t || '')).uni;
const abs = p => (p && /^https?:/.test(p)) ? p : (SITE + (p || ''));
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const tglTeks = d => d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });

// ---------- salin aplikasi ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });
write('admin/batak.js', fs.readFileSync(path.join(ROOT, 'lib/batak.cjs')));

// ---------- profil penulis ----------
let profil = {};
try { profil = JSON.parse(fs.readFileSync(path.join(CONTENT, 'profil.json'), 'utf8')); } catch (e) { profil = {}; }
profil = { nama: profil.nama || '', peran: profil.peran || '', foto: profil.foto || '', bio: profil.bio || '', sosmed: Array.isArray(profil.sosmed) ? profil.sosmed : [] };
write('data/profil.json', JSON.stringify(profil));
const inisial = n => (n || NAMA_SITUS).split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
const avatar = () => profil.foto ? `<span class="ava"><img src="${esc(profil.foto)}" alt=""></span>` : `<span class="ava" aria-hidden="true">${esc(inisial(profil.nama))}</span>`;

// ---------- artikel ----------
function renderMd(md) {
  const blok = t => `\n\n<figure class="aksara"><span class="bt" lang="bbc">${esc(uni(t))}</span><figcaption>${esc(t)}</figcaption></figure>\n\n`;
  md = md.replace(/^[ \t]*\{\{\s*aksara:\s*([\s\S]+?)\s*\}\}[ \t]*$/gm, (_, t) => blok(t));
  md = md.replace(/\{\{\s*aksara:\s*([\s\S]+?)\s*\}\}/g, (_, t) => `<span class="aksara-in" lang="bbc" title="${esc(t)}">${esc(uni(t))}</span>`);
  return marked.parse(md);
}
const dir = path.join(CONTENT, 'artikel');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')) : [];
const artikel = [];
for (const f of files) {
  const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (data.draft === true) continue;
  const judul = String(data.title || data.judul || '').trim();
  if (!judul) { console.warn('Lewati (tanpa judul):', f); continue; }
  const tanggal = data.date ? new Date(data.date) : fs.statSync(path.join(dir, f)).mtime;
  const html = renderMd(content);
  const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const ringkasan = String(data.ringkasan || data.description || '').trim() || (teks.length > 170 ? teks.slice(0, 167).replace(/\s+\S*$/, '') + '…' : teks);
  artikel.push({
    slug: f.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
    judul, aksara: uni(judul), kategori: String(data.kategori || 'Kabar'), tanggal, ringkasan,
    gambar: data.gambar || '', keteranganGambar: data.keterangan_gambar || '',
    menit: Math.max(1, Math.round(teks.split(' ').length / 200)), html
  });
}
artikel.sort((a, b) => b.tanggal - a.tanggal);

// ---------- kerangka halaman ----------
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..800,100;1,9..144,400,100&family=Alegreya+Sans:wght@400;500;700&display=swap" rel="stylesheet">';
const HIT = `<script>(function(){var live=/^https?:$/.test(location.protocol)&&!/^(localhost|127\\.)/.test(location.hostname);if(!live||navigator.webdriver)return;
function g(s,k){try{return s.getItem(k)}catch(e){return null}}function p(s,k,v){try{s.setItem(k,v)}catch(e){}}
var S=window.sessionStorage,L=window.localStorage,b;if(!g(S,'sb-hit')){p(S,'sb-hit','1');var t=new Date(Date.now()+252e5).toISOString().slice(0,10);
b={newDevice:!g(L,'sb-dev'),newToday:g(L,'sb-day')!==t,tab:'artikel'};p(L,'sb-dev','1');p(L,'sb-day',t);}else if(!g(S,'sb-tab-artikel'))b={type:'tab',tab:'artikel'};
if(!b)return;p(S,'sb-tab-artikel','1');fetch('/api/hit',{method:'POST',body:JSON.stringify(b),keepalive:true,headers:{'content-type':'application/json'}}).catch(function(){});})();</script>`;

function page({ title, desc, url, image, type = 'website', current, body, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#141010">
<link rel="canonical" href="${esc(abs(url))}">
<meta property="og:site_name" content="${NAMA_SITUS}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(abs(url))}">
<meta property="og:image" content="${esc(abs(image || '/icons/icon-512.png'))}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="Artikel ${NAMA_SITUS}" href="/artikel/feed.xml">
${FONTS}
<link rel="stylesheet" href="/assets/artikel.css">
${extraHead}
</head>
<body>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="/"><b>Surat <em>Batak</em></b><span lang="bbc" aria-hidden="true">${esc(uni('surat batak'))}</span></a>
    <nav aria-label="Menu utama">
      <a href="/">Alih aksara</a>
      <a href="/#bibel">Bibel</a>
      <a href="/artikel/"${current === 'artikel' ? ' aria-current="page"' : ''}>Artikel</a>
      <a href="/#say">Umpasa</a>
      <a href="/#profil">Profil</a>
    </nav>
  </div>
  <div class="ipon" aria-hidden="true"></div>
</header>
${body}
<div class="foot-band" aria-hidden="true"></div>
<footer class="site wrap">${NAMA_SITUS}: belajar dan alih aksara Batak Toba. <a href="/artikel/feed.xml">RSS artikel</a></footer>
${HIT}
<script>if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(function(){});</script>
</body>
</html>`;
}
const media = (a, cls = '') => a.gambar
  ? `<div class="media ${cls}"><img src="${esc(a.gambar)}" alt="" loading="lazy"></div>`
  : `<div class="media ph ${cls}" aria-hidden="true"><span class="glyph" lang="bbc">${esc(uni(a.judul.split(/\s+/).slice(0, 2).join(' ')))}</span></div>`;
const metaTeks = a => `${tglTeks(a.tanggal)} · ${a.menit} menit baca`;
const kartu = a => `<a class="card" href="/artikel/${a.slug}/" data-kat="${esc(a.kategori)}" data-q="${esc((a.judul + ' ' + a.ringkasan + ' ' + a.kategori).toLowerCase())}">
  ${media(a)}<div class="txt"><span class="kat">${esc(a.kategori)}</span><h3>${esc(a.judul)}</h3><span class="tbt" lang="bbc" aria-hidden="true">${esc(a.aksara)}</span><p class="sum">${esc(a.ringkasan)}</p><span class="meta">${metaTeks(a)}</span></div></a>`;

// ---------- halaman per artikel ----------
for (const a of artikel) {
  const url = `/artikel/${a.slug}/`;
  const lain = [...artikel.filter(x => x !== a && x.kategori === a.kategori), ...artikel.filter(x => x !== a && x.kategori !== a.kategori)].slice(0, 3);
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.judul, description: a.ringkasan, datePublished: a.tanggal.toISOString(),
    inLanguage: 'id', author: { '@type': 'Person', name: profil.nama || NAMA_SITUS }, image: a.gambar ? abs(a.gambar) : undefined, mainEntityOfPage: abs(url) };
  const share = encodeURIComponent(abs(url)), shareT = encodeURIComponent(a.judul);
  const body = `<main class="wrap narrow art">
  <div class="crumb"><a href="/artikel/">Artikel</a> / ${esc(a.kategori)}</div>
  <span class="kat">${esc(a.kategori)}</span>
  <h1>${esc(a.judul)}</h1>
  <div class="tbt" lang="bbc" aria-hidden="true">${esc(a.aksara)}</div>
  ${a.ringkasan ? `<p class="sum">${esc(a.ringkasan)}</p>` : ''}
  <div class="byline">${avatar()}<div><b>${esc(profil.nama || NAMA_SITUS)}</b><br>${metaTeks(a)}</div></div>
  ${a.gambar ? `<figure class="hero-img"><img src="${esc(a.gambar)}" alt="">${a.keteranganGambar ? `<figcaption>${esc(a.keteranganGambar)}</figcaption>` : ''}</figure>` : ''}
  <article class="body">${a.html}</article>
  <div class="share"><span>Bagikan</span>
    <a href="https://wa.me/?text=${shareT}%20${share}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${share}" target="_blank" rel="noopener">Facebook</a>
    <a href="https://t.me/share/url?url=${share}&text=${shareT}" target="_blank" rel="noopener">Telegram</a>
    <a href="https://twitter.com/intent/tweet?url=${share}&text=${shareT}" target="_blank" rel="noopener">X</a>
    <button type="button" id="copyLink">Salin tautan</button>
  </div>
  ${profil.nama ? `<aside class="author">${avatar()}<div><b>${esc(profil.nama)}</b>${profil.peran ? `<p>${esc(profil.peran)}</p>` : ''}<p><a href="/#profil">Lihat profil lengkap</a></p></div></aside>` : ''}
</main>
${lain.length ? `<section class="wrap more"><h2>Artikel lainnya</h2><div class="grid">${lain.map(kartu).join('')}</div></section>` : ''}
<script>(function(){var b=document.getElementById('copyLink');b.onclick=function(){var u=location.href;(navigator.share?navigator.share({title:document.title,url:u}):navigator.clipboard.writeText(u).then(function(){b.textContent='Tautan tersalin';setTimeout(function(){b.textContent='Salin tautan'},1500)})).catch(function(){});};if(navigator.share)b.textContent='Bagikan lewat…';})();</script>`;
  write(`artikel/${a.slug}/index.html`, page({ title: `${a.judul} | ${NAMA_SITUS}`, desc: a.ringkasan, url, image: a.gambar, type: 'article', current: 'artikel', body,
    extraHead: `<meta property="article:published_time" content="${a.tanggal.toISOString()}"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` }));
}

// ---------- daftar artikel ----------
const kategori = [...new Set(artikel.map(a => a.kategori))];
const [utama, ...sisa] = artikel;
const daftar = `<main class="wrap">
  <div class="lead"><span class="bt" lang="bbc" aria-hidden="true">${esc(uni('artikel'))}</span><h1>Artikel</h1>
  <p>Tulisan tentang aksara, adat, dan budaya Batak Toba.</p></div>
  ${artikel.length ? `
  <div class="bar"><div class="chips" id="chips" role="group" aria-label="Saring kategori">
    <button type="button" data-k="" aria-pressed="true">Semua</button>${kategori.map(k => `<button type="button" data-k="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}
  </div><input type="search" id="q" placeholder="Cari artikel" aria-label="Cari artikel"></div>
  <a class="feat" id="feat" href="/artikel/${utama.slug}/" data-kat="${esc(utama.kategori)}" data-q="${esc((utama.judul + ' ' + utama.ringkasan + ' ' + utama.kategori).toLowerCase())}">
    ${media(utama)}<div class="txt"><span class="kat">${esc(utama.kategori)}</span><h2>${esc(utama.judul)}</h2><span class="tbt" lang="bbc" aria-hidden="true">${esc(utama.aksara)}</span><p class="sum">${esc(utama.ringkasan)}</p><span class="meta">${metaTeks(utama)}</span></div></a>
  <div class="grid" id="grid">${sisa.map(kartu).join('')}</div>
  <p class="empty" id="none" hidden>Tidak ada artikel yang cocok.</p>` : '<p class="empty">Belum ada artikel. Tulisan pertama segera hadir.</p>'}
</main>
<script>(function(){var q=document.getElementById('q');if(!q)return;var k='',items=[document.getElementById('feat')].concat([].slice.call(document.querySelectorAll('#grid .card')));
function f(){var s=q.value.trim().toLowerCase(),n=0;items.forEach(function(el){var ok=(!k||el.dataset.kat===k)&&(!s||el.dataset.q.indexOf(s)>-1);el.hidden=!ok;if(ok)n++;});document.getElementById('none').hidden=n>0;}
q.addEventListener('input',f);document.getElementById('chips').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;k=b.dataset.k;
[].forEach.call(this.querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',x===b)});f();});})();</script>`;
write('artikel/index.html', page({ title: `Artikel | ${NAMA_SITUS}`, desc: 'Tulisan tentang aksara, adat, dan budaya Batak Toba.', url: '/artikel/', current: 'artikel', body: daftar }));

// ---------- data untuk tab Artikel di aplikasi ----------
write('artikel/index.json', JSON.stringify(artikel.slice(0, 12).map(a => ({ slug: a.slug, judul: a.judul, aksara: a.aksara, kategori: a.kategori,
  tanggal: a.tanggal.toISOString(), tanggalTeks: tglTeks(a.tanggal), menit: a.menit, ringkasan: a.ringkasan, gambar: a.gambar }))));

// ---------- RSS, sitemap, robots, 404 ----------
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Artikel ${NAMA_SITUS}</title><link>${esc(abs('/artikel/'))}</link><description>Tulisan tentang aksara, adat, dan budaya Batak Toba.</description><language>id</language>
${artikel.slice(0, 30).map(a => `<item><title>${esc(a.judul)}</title><link>${esc(abs(`/artikel/${a.slug}/`))}</link><guid>${esc(abs(`/artikel/${a.slug}/`))}</guid><pubDate>${a.tanggal.toUTCString()}</pubDate><category>${esc(a.kategori)}</category><description>${esc(a.ringkasan)}</description></item>`).join('\n')}
</channel></rss>`;
write('artikel/feed.xml', rss);
const urls = ['/', '/artikel/', ...artikel.map(a => `/artikel/${a.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${esc(abs(u))}</loc></url>`).join('\n')}\n</urlset>`);
write('robots.txt', `User-agent: *\nDisallow: /admin/\n${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ''}`);
write('404.html', page({ title: `Halaman tidak ditemukan | ${NAMA_SITUS}`, desc: 'Halaman tidak ditemukan.', url: '/404.html',
  body: `<main class="wrap narrow art"><h1>Halaman tidak ditemukan</h1><p class="sum">Alamat ini tidak ada atau sudah dipindahkan. Buka <a href="/">aplikasi Surat Batak</a> atau <a href="/artikel/">daftar artikel</a>.</p></main>` }));

console.log(`Selesai: ${artikel.length} artikel, profil ${profil.nama ? 'terisi' : 'kosong'}.`);
