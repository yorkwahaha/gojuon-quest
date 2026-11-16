import allowlist from './allowlist.json';
// Compatibility for old clients. No public request can spend generation credits.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' };
const ASSET_ORIGIN = 'https://yorkwahaha.github.io/gojuon-quest/';
const toKatakana = text => String(text || '').replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('method not allowed', { status: 405, headers: CORS });
    if (url.pathname === '/') return new Response(
      '<!doctype html><meta charset="utf-8"><title>五十音語音</title>'
      + '<p>五十音クエスト的預先生成語音服務正在運作。</p>'
      + '<p>直接開啟首頁不會發音。播放既有音檔不會觸發付費生成。</p>'
      + '<p><a href="/api/voice?anime=jojo&amp;kana=%E3%82%AD%E3%83%83%E3%82%B9">試聽「キッス」</a></p>',
      { headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    const kana = toKatakana(url.searchParams.get('kana'));
    const entry = url.pathname === '/api/voice' && allowlist.find(q => q.anime === url.searchParams.get('anime') && q.kana === kana);
    if (!entry || !/^assets\/voice\/q\d+\.mp3\?v=[a-f0-9]+$/.test(entry.file)) {
      return new Response('not found', { status: 404, headers: CORS });
    }
    return new Response(null, { status: 302, headers: { ...CORS, Location: ASSET_ORIGIN + entry.file, 'Cache-Control': 'no-store' } });
  },
};
