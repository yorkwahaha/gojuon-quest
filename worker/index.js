import allowlist from './allowlist.json';

const VOICES = {
  jojo: {
    id: '5a8e46f1b94c4351aebb8a66b113cec5',
    prefix: '',
    prosody: { speed: 0.92, volume: 0, normalize_loudness: true },
  },
  jjk: {
    id: '827be896a6954a8199ce4b2baad6af36',
    prefix: '[shouting] ',
    prosody: { speed: 1.0, volume: 0, normalize_loudness: true },
  },
};

const ALLOWED = new Set(allowlist.map((item) => `${item.anime}\n${item.kana}`));
const inflight = new Map();
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function toKatakana(text) {
  return String(text || '').replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

async function synthesize(anime, kana, apiKey) {
  const style = VOICES[anime];
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      model: 's2.1-pro-free',
    },
    body: JSON.stringify({
      text: `${style.prefix}${kana}`,
      reference_id: style.id,
      format: 'mp3',
      language: 'ja',
      normalize: true,
      prosody: style.prosody,
    }),
  });
  if (!res.ok) throw new Error(`fish ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1000) throw new Error('fish audio too small');
  return buf;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/api/voice') {
      return new Response('not found', { status: 404, headers: CORS });
    }
    const anime = url.searchParams.get('anime');
    const kana = toKatakana(url.searchParams.get('kana'));
    if (!ALLOWED.has(`${anime}\n${kana}`)) {
      return new Response('not found', { status: 404, headers: CORS });
    }

    const cacheKey = new Request(`${url.origin}/api/voice?anime=${anime}&kana=${encodeURIComponent(kana)}`, { method: 'GET' });
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;

    const pendingKey = `${anime}\n${kana}`;
    let job = inflight.get(pendingKey);
    if (!job) {
      job = synthesize(anime, kana, env.FISH_API_KEY).finally(() => inflight.delete(pendingKey));
      inflight.set(pendingKey, job);
    }
    try {
      const buf = await job;
      const audio = new Response(buf, {
        headers: {
          ...CORS,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
      ctx.waitUntil(caches.default.put(cacheKey, audio.clone()));
      return audio;
    } catch (err) {
      return new Response('voice failed', { status: 502, headers: CORS });
    }
  },
};
