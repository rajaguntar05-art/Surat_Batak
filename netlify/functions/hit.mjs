import { getStore } from '@netlify/blobs';
import { recordHit, recordTab } from '../lib/stats.mjs';

export default async (req) => {
  if(req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  let body = {};
  try{ body = await req.json(); }catch(e){}
  const ua = req.headers.get('user-agent') || '';
  if(/bot|crawl|spider|preview|headless/i.test(ua)) return new Response(null, { status: 204 });
  const store = getStore({ name: 'statistik', consistency: 'strong' });
  try{
    if(body.type === 'tab') await recordTab(store, body.tab);
    else await recordHit(store, body);
  }catch(e){ console.error(e); }
  return new Response(null, { status: 204 });
};
export const config = { path: '/api/hit' };
