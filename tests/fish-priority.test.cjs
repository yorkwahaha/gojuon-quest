'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const harness = fs.readFileSync(path.join(__dirname, 'regression.test.cjs'), 'utf8').split("test('rank celebration")[0];
const { boot } = vm.runInNewContext(harness + '\n({boot})', { require, __dirname, console });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test('ordinary names and move shouts use the correct online work and normalized kana', () => {
  const e = boot({ audio: true, online: true });
  for (const anime of ['jojo', 'jjk']) {
    const q = e.run(`QUESTIONS.find(q => q.anime === '${anime}' && q.type !== 'waza')`);
    e.run(`AudioKit.speak(toHiragana(${JSON.stringify(q.kana)}))`);
    const url = new URL(e.packs.at(-1).file);
    assert.equal(url.searchParams.get('anime'), anime);
    assert.equal(url.searchParams.get('kana'), q.kana);
  }
  assert.equal(e.packs[0].paused, true);
  assert.deepEqual(Array.from(e.spoken), []);
});

test('successful online playback never also starts a pack or TTS', async () => {
  const e = boot({ audio: true, online: true }); e.run("AudioKit.speak('ジョジョ')");
  e.packs[0].resolve(); await flush(); e.tick(14000);
  assert.equal(e.packs.length, 1); assert.deepEqual(Array.from(e.spoken), []);
});

test('online error falls back to a versioned pack and pack error falls back to TTS once', async () => {
  const e = boot({ audio: true, online: true }); e.run("AudioKit.shout('ザ・ワールド')");
  const remote = e.packs[0]; remote.reject(Error('offline')); await flush();
  assert.match(e.packs[1].file, /^assets\/voice\/q12\.mp3\?v=/);
  e.packs[1].reject(Error('missing')); await flush(); remote.fire('error'); e.tick(20000);
  assert.deepEqual(Array.from(e.spoken), ['ザ・ワールド']); assert.equal(e.packs.length, 2);
});

test('online startup timeout uses the pack and stale callbacks cannot change its timeout', async () => {
  const e = boot({ audio: true, online: true }); e.run("AudioKit.speak('ジョジョ')");
  const remote = e.packs[0]; e.tick(8999); assert.equal(e.packs.length, 1);
  e.tick(1); assert.equal(e.packs.length, 2); assert.equal(remote.paused, true);
  remote.resolve(); await flush(); remote.fire('error');
  e.tick(3999); assert.deepEqual(Array.from(e.spoken), []); e.tick(1);
  assert.deepEqual(Array.from(e.spoken), ['ジョジョ']);
});

for (const cancel of ["AudioKit.speak('テスト')", "App.go('home')", "document.hidden=true; AudioKit.syncSettings()",
  "document.getElementById('toggleVoice').checked=false; document.getElementById('toggleVoice').fire('change')"]) {
  test('cancelled online audio cannot trigger fallback after ' + cancel, async () => {
    const e = boot({ audio: true, online: true }); e.run("App.go('chart'); AudioKit.speak('ジョジョ')");
    const remote = e.packs.at(-1); e.run(cancel); remote.reject(Error('stale')); await flush(); e.tick(14000);
    assert.equal(remote.paused, true);
    assert.equal(e.packs.filter(p => p.file.startsWith('https:') || p.file.startsWith('assets/voice/')).length, 1);
    assert.deepEqual(Array.from(e.spoken), cancel.includes('テスト') ? ['テスト'] : []);
  });
}

test('chart-only syllables and unknown text never call the generation endpoint', () => {
  const e = boot({ audio: true, online: true }); e.run("AudioKit.speak('きゃ')");
  assert.equal(e.packs.length, 0); assert.deepEqual(Array.from(e.spoken), ['キャ']);
});

const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(1500)]);
function workerHarness({ date = '2026-11-16T12:00:00Z', config, provider, cacheError = false, timers } = {}) {
  const voiceConfig = config || require('../tools/voice-config.cjs');
  const source = fs.readFileSync(path.join(root, 'worker/index.js'), 'utf8')
    .replace("import allowlist from './allowlist.json';", 'const allowlist=' + JSON.stringify(require('../worker/allowlist.json')) + ';')
    .replace("import voiceConfig from '../tools/voice-config.cjs';", 'const voiceConfig=' + JSON.stringify(voiceConfig) + ';')
    .replace('export default {', 'const worker={');
  const records = new Map(), calls = [], pending = [], logs = [];
  const worker = vm.runInNewContext(source + '\nworker', {
    Request, Response, URL, Headers, TextEncoder, AbortController, Uint8Array,
    crypto: require('node:crypto').webcrypto,
    Date: class extends Date { static now() { return Date.parse(date); } },
    setTimeout: timers?.setTimeout || setTimeout, clearTimeout: timers?.clearTimeout || clearTimeout,
    console: { warn: message => logs.push(message) },
    caches: { default: {
      match: async key => { if (cacheError) throw Error('cache down'); return records.get(key.url)?.clone(); },
      put: async (key, value) => { if (cacheError) throw Error('cache down'); records.set(key.url, value.clone()); },
    } },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return provider ? provider(options) : new Response(mp3, { headers: { 'Content-Type': 'audio/mpeg' } });
    },
  });
  const request = async (kana = 'キッス', anime = 'jojo', method = 'GET', extra = '') => {
    const res = await worker.fetch(new Request('https://voice.test/api/voice?anime=' + anime + '&kana=' + encodeURIComponent(kana) + extra,
      { method }), { FISH_API_KEY: 'test-secret-never-public' }, { waitUntil: p => pending.push(p) });
    await Promise.all(pending); return res;
  };
  return { request, calls, logs, records };
}

test('Worker generates the recorded JOJO voice with only the free model then serves cache', async () => {
  const h = workerHarness(); const first = await h.request();
  assert.equal(first.status, 200); assert.equal(first.headers.get('X-Voice-Source'), 'fish-generated');
  assert.deepEqual(Buffer.from(await first.arrayBuffer()), mp3);
  const { url, options } = h.calls[0];
  assert.equal(url, 'https://api.fish.audio/v1/tts'); assert.equal(options.method, 'POST');
  assert.equal(options.headers.model, 's2.1-pro-free');
  const body = JSON.parse(options.body);
  assert.equal(body.reference_id, '5a8e46f1b94c4351aebb8a66b113cec5');
  assert.equal(body.text, 'キッス'); assert.equal(body.prosody.speed, 0.92);
  const second = await h.request('きっす');
  assert.equal(second.headers.get('X-Voice-Source'), 'fish-cache'); assert.equal(h.calls.length, 1);
});

test('Worker preserves the JJK shouting prefix and recorded voice, ignoring caller overrides', async () => {
  const h = workerHarness(); const q = require('../worker/allowlist.json').find(q => q.anime === 'jjk');
  assert.equal((await h.request(q.kana, 'jjk', 'GET', '&model=paid&reference_id=other&text=arbitrary')).status, 200);
  const { options } = h.calls[0], body = JSON.parse(options.body);
  assert.equal(options.headers.model, 's2.1-pro-free');
  assert.equal(body.reference_id, '827be896a6954a8199ce4b2baad6af36');
  assert.equal(body.text, '[shouting] ' + q.kana); assert.equal(body.prosody.speed, 1);
});

test('unknown readings, invalid work, HEAD and disallowed methods never generate', async () => {
  const h = workerHarness();
  assert.equal((await h.request('arbitrary')).status, 404);
  assert.equal((await h.request('キッス', 'jjk')).status, 404);
  assert.equal((await h.request('キッス', 'jojo', 'POST')).status, 405);
  assert.equal((await h.request('キッス', 'jojo', 'HEAD')).status, 302);
  assert.equal((await h.request('キッス', 'jojo', 'OPTIONS')).status, 204);
  assert.equal(h.calls.length, 0);
});

for (const provider of [
  async () => new Response('secret provider detail', { status: 402 }),
  async () => new Response('ID3' + 'x'.repeat(1500), { headers: { 'Content-Type': 'text/html' } }),
  async () => new Response('invalid'.repeat(200), { headers: { 'Content-Type': 'audio/mpeg' } }),
  async () => new Response(mp3.subarray(0, 10), { headers: { 'Content-Type': 'audio/mpeg' } }),
  async () => new Response(Buffer.alloc(1024 * 1024 + 1), { headers: { 'Content-Type': 'audio/mpeg' } }),
]) {
  test('unusable upstream audio redirects to the static pack without caching or exposing secrets', async () => {
    const h = workerHarness({ provider }); const res = await h.request();
    assert.equal(res.status, 302); assert.match(res.headers.get('Location'), /assets\/voice\/q99.mp3\?v=/);
    assert.equal(h.records.size, 0); assert.doesNotMatch(await res.text() + h.logs.join(), /test-secret|secret provider detail/);
  });
}

test('upstream timeout cancels generation and falls back', async () => {
  let cancel, cleared = false;
  const h = workerHarness({
    timers: { setTimeout: fn => { cancel = fn; return 1; }, clearTimeout: () => { cleared = true; } },
    provider: options => new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => reject(Error('aborted'))); cancel();
    }),
  });
  assert.equal((await h.request()).status, 302); assert.equal(cleared, true);
});

test('cache failures still allow valid generated audio', async () => {
  const h = workerHarness({ cacheError: true }); assert.equal((await h.request()).status, 200);
});

test('expiry and a changed paid model cannot create new generations', async () => {
  for (const options of [{ date: '2026-12-01T00:00:00Z' },
    { config: { ...require('../tools/voice-config.cjs'), model: 's2.1-pro' } }]) {
    const h = workerHarness(options); assert.equal((await h.request()).status, 302); assert.equal(h.calls.length, 0);
  }
});

test('changing the voice style invalidates generated cache', async () => {
  const h = workerHarness(); await h.request();
  const other = workerHarness({ config: { ...require('../tools/voice-config.cjs'), voices: {
    ...require('../tools/voice-config.cjs').voices,
    jojo: { ...require('../tools/voice-config.cjs').voices.jojo, prefix: '[shouting] ' },
  } } });
  await other.request();
  assert.notEqual([...h.records.keys()][0], [...other.records.keys()][0]);
});

