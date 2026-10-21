// Terjemahan Indonesia <-> Batak Toba lewat Google Cloud Translation API.
// Kunci API disimpan di Netlify (Environment variables) dengan nama GOOGLE_TRANSLATE_KEY,
// tidak pernah dikirim ke peramban pengunjung.
// Pemakaian dibatasi per hari dan per bulan supaya tidak melewati kuota gratis Google.
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { jakartaParts, update } from '../lib/stats.mjs';

const MAKS_HURUF = 1000;                                   // per permintaan
const env = (k, d) => (globalThis.Netlify?.env?.get(k) ?? process.env[k]) || d;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export default async (req) => {
  if(req.method !== 'POST') return json({ galat: 'Metode tidak didukung.' }, 405);

  // hanya dari situs sendiri
  const asal = req.headers.get('origin') || req.headers.get('referer') || '';
  const host = new URL(req.url).host;
  if(asal && (() => { try{ return new URL(asal).host !== host; }catch(e){ return true; } })())
    return json({ galat: 'Permintaan ditolak.' }, 403);

  const kunci = env('GOOGLE_TRANSLATE_KEY');
  if(!kunci) return json({ galat: 'Layanan terjemahan belum diatur.', kode: 'belum-diatur' }, 503);

  let body = {};
  try{ body = await req.json(); }catch(e){}
  const teks = String(body.teks || '').trim();
  const [source, target] = body.dari === 'bbc' ? ['bbc', 'id'] : ['id', 'bbc'];
  if(!teks) return json({ galat: 'Teks masih kosong.' }, 400);
  if(teks.length > MAKS_HURUF) return json({ galat: `Teks terlalu panjang. Maksimal ${MAKS_HURUF} huruf sekali terjemah.` }, 400);

  const store = getStore({ name: 'terjemah', consistency: 'strong' });

  // terjemahan yang sama tidak perlu ditanyakan ulang ke Google
  const id = createHash('sha256').update(source + '>' + target + '\n' + teks).digest('hex').slice(0, 32);
  try{
    const ada = await store.get('simpan/' + id, { type: 'json' });
    if(ada && ada.hasil) return json({ hasil: ada.hasil, dari: source, ke: target });
  }catch(e){}

  // batas pemakaian
  const { day } = jakartaParts(Date.now());
  const bulan = day.slice(0, 7);
  const batasBulan = +env('TERJEMAH_BATAS_BULANAN', 450000);
  const batasHari = +env('TERJEMAH_BATAS_HARIAN', 30000);
  let lewat = false;
  try{
    const pakai = await update(store, 'pakai/' + bulan, () => ({ bulan: 0, hari: {} }), v => {
      const h = v.hari[day] || 0;
      if(v.bulan + teks.length > batasBulan || h + teks.length > batasHari){ lewat = true; return; }
      v.bulan += teks.length; v.hari[day] = h + teks.length;
    });
    if(!pakai) return json({ galat: 'Server sedang sibuk. Coba lagi sebentar.' }, 503);
  }catch(e){ console.error(e); }
  if(lewat) return json({ galat: 'Kuota terjemahan untuk hari ini sudah habis. Coba lagi besok.', kode: 'kuota' }, 429);

  // panggil Google
  let r, data;
  try{
    r = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(kunci), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: teks, source, target, format: 'text' })
    });
    data = await r.json();
  }catch(e){
    console.error(e);
    return json({ galat: 'Google Translate tidak bisa dihubungi. Coba lagi nanti.' }, 502);
  }
  if(!r.ok){
    console.error('Google Translate', r.status, JSON.stringify(data).slice(0, 500));
    return json({ galat: 'Google Translate menolak permintaan (' + r.status + '). Periksa kunci API di Netlify.', kode: 'google' }, 502);
  }
  const hasil = data?.data?.translations?.[0]?.translatedText || '';
  if(hasil) try{ await store.setJSON('simpan/' + id, { hasil }); }catch(e){}
  return json({ hasil, dari: source, ke: target });
};

export const config = { path: '/api/terjemah' };
