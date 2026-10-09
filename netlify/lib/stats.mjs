// Pencatatan kunjungan Surat Batak. Tidak menyimpan IP atau data pribadi:
// hanya angka per hari dan per jam (WIB).
export const TZ_OFFSET_H = 7; // Asia/Jakarta

export function jakartaParts(ms){
  const d = new Date(ms + TZ_OFFSET_H * 3600e3);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}
const emptyDay = () => ({ v: 0, u: 0, n: 0, h: Array(24).fill(0), t: {} });
const emptyTotal = () => ({ v: 0, n: 0, since: null });

// Tulis dengan penguncian optimistis (ETag) supaya kunjungan yang datang bersamaan tidak saling menimpa.
export async function update(store, key, init, fn, tries = 6){
  for(let i = 0; i < tries; i++){
    const cur = await store.getWithMetadata(key, { type: 'json' });
    const val = cur ? cur.data : init();
    fn(val);
    const opts = cur && cur.etag ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
    const res = await store.setJSON(key, val, opts);
    if(!res || res.modified !== false) return val;
    await new Promise(r => setTimeout(r, 20 + Math.random() * 60 * (i + 1)));
  }
  return null;
}

const TABS = new Set(['convert','gambar','bibel','artikel','file','learn','say','quiz','profil','stats']);
export async function recordHit(store, body, now = Date.now()){
  const { day, hour } = jakartaParts(now);
  const newToday = !!body.newToday, newDevice = !!body.newDevice;
  const tab = TABS.has(body.tab) ? body.tab : null;
  await update(store, 'day/' + day, emptyDay, d => {
    d.v++; d.h[hour]++;
    if(newToday) d.u++;
    if(newDevice) d.n++;
    if(tab){ d.t = d.t || {}; d.t[tab] = (d.t[tab] || 0) + 1; }
  });
  await update(store, 'total', emptyTotal, t => { t.v++; if(newDevice) t.n++; if(!t.since) t.since = day; });
}
export async function recordTab(store, tab, now = Date.now()){
  if(!TABS.has(tab)) return;
  const { day } = jakartaParts(now);
  await update(store, 'day/' + day, emptyDay, d => { d.t = d.t || {}; d.t[tab] = (d.t[tab] || 0) + 1; });
}

export async function readStats(store, days = 30, now = Date.now()){
  const keys = [];
  for(let i = days - 1; i >= 0; i--) keys.push(jakartaParts(now - i * 86400e3).day);
  const docs = await Promise.all(keys.map(k => store.get('day/' + k, { type: 'json' })));
  const total = (await store.get('total', { type: 'json' })) || emptyTotal();
  const hours = Array(24).fill(0), weekdays = Array(7).fill(0), tabs = {};
  const daily = keys.map((k, i) => {
    const d = docs[i] || emptyDay();
    d.h.forEach((x, j) => hours[j] += x);
    weekdays[new Date(k + 'T00:00:00Z').getUTCDay()] += d.v;
    Object.entries(d.t || {}).forEach(([t, x]) => tabs[t] = (tabs[t] || 0) + x);
    return { day: k, visits: d.v, visitors: d.u };
  });
  return { total, daily, hours, weekdays, tabs, today: daily[daily.length - 1], generated: new Date(now).toISOString() };
}
