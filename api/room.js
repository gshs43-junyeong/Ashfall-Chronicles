/* ===== api/room.js — Vercel 함수: 멀티플레이 방 중개(Upstash Redis REST) =====
   환경 변수는 Vercel 대시보드에서 Upstash Redis(Marketplace)를 붙이면 생긴다 — KV_REST_API_URL/TOKEN 또는 UPSTASH_REDIS_REST_URL/TOKEN.
   zip(file://)·Electron 판도 붙도록 모든 출처를 허용한다(글은 몇 분 뒤 사라지는 SDP 뿐이다). */
import { handleRoom } from './_room-core.js';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(path, cmds) {
  const r = await fetch(URL_ + path, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return r.json();
}
const one = async cmd => (await redis('/pipeline', [cmd]))[0].result;

const store = {
  async claim(k, ttl) { return (await one(['SET', k, '1', 'NX', 'EX', ttl])) === 'OK'; },
  async touch(k, ttl) { await one(['EXPIRE', k, ttl]); },
  async exists(k) { return (await one(['EXISTS', k])) === 1; },
  async del(k) { await one(['DEL', k]); },
  async push(k, v, ttl, cap) { await redis('/pipeline', [['RPUSH', k, v], ['LTRIM', k, -cap, -1], ['EXPIRE', k, ttl]]); },
  async drain(k) { const r = await redis('/multi-exec', [['LRANGE', k, 0, -1], ['DEL', k]]); return r[0].result || []; }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'no-store' });
  try {
    const q = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { status, body } = await handleRoom(store, q);
    return res.status(status).json(body);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server' });
  }
}
