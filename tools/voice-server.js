'use strict';
// Local preview and compatibility voice endpoint. Playback never generates audio.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/voice-manifest.js'), 'utf8'), context);
const { QUESTIONS, VOICE_PACK, toKatakana } = vm.runInContext('({QUESTIONS,VOICE_PACK,toKatakana})', context);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function staticFile(rawPath) {
  const decoded = decodeURIComponent(rawPath);
  if (decoded.includes('\\') || decoded.includes('\0')) return null;
  const parts = decoded.split('/').filter(Boolean);
  if (parts.some(p => p.startsWith('.'))) return null;
  const relative = parts.length ? parts.join('/') : 'index.html';
  if (relative !== 'index.html' && !/^(?:css|js|assets)\//.test(relative)) return null;
  if (!Object.hasOwn(TYPES, path.extname(relative))) return null;
  const file = path.resolve(ROOT, relative);
  const inside = target => {
    const rel = path.relative(ROOT, target);
    return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
  };
  if (!inside(file) || !fs.existsSync(file) || !inside(fs.realpathSync(file)) || !fs.statSync(file).isFile()) return null;
  return file;
}
function handler(req, res) {
  const send = (status, body = '') => { res.writeHead(status, { 'Cache-Control': 'no-store' }); res.end(body); };
  try {
    const rawPath = req.url.split('?')[0];
    decodeURIComponent(rawPath);
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'OPTIONS' && url.pathname === '/api/voice') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' });
      res.end(); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { send(405); return; }
    let file;
    if (url.pathname === '/api/voice') {
      const kana = toKatakana(url.searchParams.get('kana') || '');
      const anime = url.searchParams.get('anime');
      const q = QUESTIONS.find(q => q.type === 'waza' && q.anime === anime && q.kana === kana);
      const asset = q && VOICE_PACK[kana];
      file = asset ? staticFile('/' + asset.split('?')[0]) : null;
    } else file = staticFile(rawPath);
    if (!file) { send(404); return; }
    const buf = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'Content-Length': buf.length,
      'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' });
    res.end(req.method === 'HEAD' ? undefined : buf);
  } catch (error) {
    if (!res.headersSent) send(error instanceof URIError || error instanceof TypeError ? 400 : 500);
    else res.end();
  }
}
module.exports = { handler, staticFile };
if (require.main === module) {
  const server = http.createServer(handler);
  server.listen(8765, '127.0.0.1', () => console.log('http://127.0.0.1:8765/'));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
