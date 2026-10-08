import { getStore } from '@netlify/blobs';
import { readStats } from '../lib/stats.mjs';

export default async (req) => {
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const store = getStore({ name: 'statistik', consistency: 'strong' });
  const data = await readStats(store, days);
  return new Response(JSON.stringify(data), { headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=0, must-revalidate',
    'netlify-cdn-cache-control': 'public, s-maxage=60, stale-while-revalidate=120'
  }});
};
export const config = { path: '/api/stats' };
