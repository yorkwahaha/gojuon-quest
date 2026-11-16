import allowlist from './allowlist.json';
import voiceConfig from '../tools/voice-config.cjs';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' };
const ASSET_ORIGIN = 'https://yorkwahaha.github.io/gojuon-quest/';
const toKatakana = text => String(text || '').replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const fallback = entry => new Response(null, { status: 302, headers: {
  ...CORS, Location: ASSET_ORIGIN + entry.file, 'Cache-Control': 'no-store', 'X-Voice-Source': 'static-fallback',
} });

async function generate(entry, style, apiKey) {
  const controller = new AbortController();
  // Bound both the response headers and body download.
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', model: voiceConfig.model },
      body: JSON.stringify({ text: style.prefix + entry.kana, reference_id: style.id,
        format: 'mp3', language: 'ja', normalize: true, prosody: style.prosody }),
    });
    if (!res.ok || !/^audio\//i.test(res.headers.get('content-type') || '')) throw Error('provider response');
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); throw Error('audio too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (size < 1000 || !((bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51)
      || (bytes[0] === 255 && (bytes[1] & 224) === 224))) throw Error('invalid MP3');
    return bytes;
  } finally { clearTimeout(timer); }
}

export default {
  async fetch(request, env = {}, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('method not allowed', { status: 405, headers: CORS });
    if (url.pathname === '/') return new Response(
      '<!doctype html><meta charset="utf-8"><title>五十音語音</title>'
      + '<p>Fish Audio S2.1 Pro Free 優先語音服務。</p>'
      + '<p>題庫讀音依作品使用固定聲線；生成失敗改播既有音檔。免費生成截止 2026-11-30（UTC）。</p>'
      + '<p><a href="/api/voice?anime=jojo&amp;kana=%E3%82%AD%E3%83%83%E3%82%B9">試聽「キッス」</a></p>',
      { headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    const kana = toKatakana(url.searchParams.get('kana'));
    const entry = url.pathname === '/api/voice' && allowlist.find(q => q.anime === url.searchParams.get('anime') && q.kana === kana);
    if (!entry || !/^assets\/voice\/q\d+\.mp3\?v=[a-f0-9]+$/.test(entry.file)) {
      return new Response('not found', { status: 404, headers: CORS });
    }
    // HEAD probes must not create a generation. Only a finite, server-owned list
    // of readings is accepted; callers cannot choose text, model, voice or style.
    if (request.method === 'HEAD') return fallback(entry);
    const style = voiceConfig.voices[entry.anime];
    const identity = JSON.stringify({ entry, model: voiceConfig.model, style, revision: 1 });
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    const key = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    const cacheKey = new Request(url.origin + '/voice-cache/' + key);
    const cache = caches.default;
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('X-Voice-Source', 'fish-cache');
        return new Response(cached.body, { headers });
      }
    } catch (_) { /* A cache outage must not prevent playback. */ }
    // Never change to a paid model, including after the announced free window.
    const freeUntil = Date.parse(voiceConfig.freeUntil);
    if (voiceConfig.model !== 's2.1-pro-free' || !Number.isFinite(freeUntil) || Date.now() >= freeUntil
      || !env.FISH_API_KEY || !style) return fallback(entry);
    try {
      const bytes = await generate(entry, style, env.FISH_API_KEY);
      const audio = new Response(bytes, { headers: { ...CORS, 'Content-Type': 'audio/mpeg',
        'Content-Length': String(bytes.length), 'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400', 'X-Voice-Source': 'fish-generated' } });
      ctx.waitUntil(cache.put(cacheKey, audio.clone()).catch(() => {}));
      return audio;
    } catch (_) {
      // Never forward provider bodies or keys to the browser/logs.
      console.warn(JSON.stringify({ event: 'voice_fallback', anime: entry.anime, kana: entry.kana }));
      return fallback(entry);
    }
  },
};
