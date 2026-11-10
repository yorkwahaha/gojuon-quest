'use strict';
/* ============================================================
   招式名の読み上げ。Fish Audio を初回だけ呼び、mp3 を
   assets/voice-cache/ に残して、次からはそのファイルを返す。
   使い方: FISH_API_KEY を設定して node tools/voice-server.js
   ブラウザは http://127.0.0.1:8765/ を開く。
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, 'assets', 'voice-cache');
const PORT = 8765;

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

const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const { QUESTIONS, toKatakana } = vm.runInNewContext(
  `${dataSrc}\n({ QUESTIONS, toKatakana })`,
  {},
  { filename: 'js/data.js' }
);
const WAZA = QUESTIONS.filter((q) => q.type === 'waza');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const inflight = new Map();

function cacheFile(anime, kana) {
  const name = crypto.createHash('sha256').update(`${anime}\n${kana}`).digest('hex') + '.mp3';
  return path.join(CACHE_DIR, name);
}

function synthesize(q) {
  const file = cacheFile(q.anime, q.kana);
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) {
    console.log('cache', q.kana);
    return Promise.resolve(file);
  }
  const pendingKey = `${q.anime}\n${q.kana}`;
  if (inflight.has(pendingKey)) return inflight.get(pendingKey);
  const job = (async () => {
    const apiKey = process.env.FISH_API_KEY;
    if (!apiKey) throw new Error('FISH_API_KEY missing');
    const style = VOICES[q.anime];
    console.log('fish', q.kana);
    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: 's2.1-pro-free',
      },
      body: JSON.stringify({
        text: `${style.prefix}${q.kana}`,
        reference_id: style.id,
        format: 'mp3',
        language: 'ja',
        normalize: true,
        prosody: style.prosody,
      }),
    });
    if (!res.ok) throw new Error(`fish ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error('fish audio too small');
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = `${file}.part`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, file);
    return file;
  })().finally(() => inflight.delete(pendingKey));
  inflight.set(pendingKey, job);
  return job;
}

function findWaza(anime, kana) {
  const key = toKatakana(kana || '');
  return WAZA.find((q) => q.anime === anime && q.kana === key) || null;
}

function sendFile(res, file) {
  const buf = fs.readFileSync(file);
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Content-Length': buf.length,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(buf);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS' && req.url.startsWith('/api/voice')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/api/voice')) {
    const query = new URL(req.url, 'http://127.0.0.1').searchParams;
    const q = findWaza(query.get('anime'), query.get('kana'));
    if (!q) {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
      res.end('not found');
      return;
    }
    synthesize(q).then((file) => sendFile(res, file)).catch((err) => {
      console.error('voice fail', q.kana, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
        res.end();
      }
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/`);
});
server.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
