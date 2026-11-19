'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const harness = fs.readFileSync(path.join(__dirname, 'regression.test.cjs'), 'utf8').split("test('rank celebration")[0];
const { boot } = vm.runInNewContext(harness + '\n({boot})', { require, __dirname, console });
const allowlist = require('../worker/allowlist.json');

test('successful pack playback never also starts browser TTS', async () => {
  const e = boot({ audio: true });
  e.run("AudioKit.speak('きっす')");
  const clip = e.packs[0];
  assert.match(clip.file, /^assets\/voice\/q99\.mp3\?v=/);
  clip.resolve();
  await Promise.resolve();
  e.tick(5000);
  assert.equal(e.packs.length, 1);
  assert.deepEqual(Array.from(e.spoken), []);
});

test('chart-only syllables use browser TTS without a network request', () => {
  const e = boot({ audio: true });
  e.run("AudioKit.speak('きゃ')");
  assert.equal(e.packs.length, 0);
  assert.deepEqual(Array.from(e.spoken), ['キャ']);
});

test('the public Worker only redirects known readings, including with a configured provider credential', async () => {
  const source = fs.readFileSync(path.join(root, 'worker/index.js'), 'utf8')
    .replace("import allowlist from './allowlist.json';", 'const allowlist = ' + JSON.stringify(allowlist) + ';')
    .replace('export default {', 'const worker = {');
  let calls = 0;
  const worker = vm.runInNewContext(source + '\nworker', {
    Request, Response, URL,
    fetch: () => { calls++; throw Error('unexpected upstream request'); },
  });
  const request = (reading, anime, method = 'GET', env = {}) =>
    worker.fetch(new Request('https://voice.test/api/voice?anime=' + anime + '&kana=' + encodeURIComponent(reading), { method }), env);
  for (const env of [{}, { FISH_API_KEY: 'test-secret' }]) {
    for (const entry of allowlist) {
      const res = await request(entry.kana, entry.anime, 'GET', env);
      assert.equal(res.status, 302, entry.kana);
      assert.equal(res.headers.get('Location'), 'https://yorkwahaha.github.io/gojuon-quest/' + entry.file);
    }
  }
  assert.equal((await request('きっす', 'jojo')).status, 302);
  assert.equal((await request('arbitrary', 'jojo')).status, 404);
  assert.equal((await request('キッス', 'jjk')).status, 404);
  assert.equal((await request('キッス', 'jojo', 'HEAD')).status, 302);
  assert.equal((await request('キッス', 'jojo', 'OPTIONS')).status, 204);
  assert.equal((await request('キッス', 'jojo', 'POST')).status, 405);
  assert.equal(calls, 0);
});

test('recorded JOJO voices select the correct faction and announce Stands and battle cries', () => {
  const { styleFor } = require('../tools/voice-pack.cjs');
  const examples = [
    ['クウジョウジョウタロウ', 'hero', false], ['ディオ', 'villain', false],
    ['スタープラチナ', 'hero', true], ['ザ・ワールド', 'villain', true],
    ['オラオラ', 'hero', true], ['ムダムダ', 'villain', true],
    ['ハモン', 'neutral', false], ['スタンド', 'neutral', false],
  ];
  for (const [kana, side, shout] of examples) {
    const style = styleFor(allowlist.find(q => q.anime === 'jojo' && q.kana === kana));
    assert.equal(style.id, side === 'hero' ? '4359ff0bb0ad45139c35f4b664ae3f87' : '5a8e46f1b94c4351aebb8a66b113cec5', kana);
    assert.equal(style.prefix, shout ? '[shouting] ' : '', kana);
  }
  const jjk = styleFor(allowlist.find(q => q.anime === 'jjk'));
  assert.equal(jjk.prefix, '[shouting] ');
  assert.equal(jjk.prosody.speed, 1);
});

test('all JOJO entries have an explicit voice side and a matching owner/Stand side', () => {
  const e = boot(), byId = Object.fromEntries(e.run('QUESTIONS').map(q => [q.id, q]));
  for (const q of Object.values(byId).filter(q => q.anime === 'jojo')) {
    assert.ok(['hero', 'villain', 'neutral'].includes(q.voiceSide), q.id);
    if (q.type !== 'term') assert.notEqual(q.voiceSide, 'neutral', q.id);
  }
  const pairs = [['q24','q13'],['q25','q85'],['q63','q84'],['q64','q86'],['q23','q87'],['q65','q88'],
    ['q66','q89'],['q67','q90'],['q15','q91'],['q16','q92'],['q68','q93'],['q05','q94'],['q17','q95'],
    ['q06','q96'],['q18','q97'],['q07','q30'],['q07','q98'],['q71','q99'],['q73','q100'],['q70','q32'],
    ['q70','q33'],['q70','q101'],['q74','q102'],['q76','q103'],['q77','q104'],['q78','q105'],
    ['q79','q106'],['q80','q108'],['q81','q109'],['q82','q110'],['q83','q111'],['q02','q12'],
    ['q02','q34'],['q26','q14'],['q69','q31'],['q27','q29'],['q28','q21'],['q24','q10'],['q02','q11']];
  for (const [owner, stand] of pairs) assert.equal(byId[owner].voiceSide, byId[stand].voiceSide, owner + '/' + stand);
  for (const id of ['q02','q03','q04','q26','q62','q69','q70','q78','q79','q81']) assert.equal(byId[id].voiceSide, 'villain', id);
  for (const id of ['q06','q15','q25','q27','q64','q67','q82','q83']) assert.equal(byId[id].voiceSide, 'hero', id);
});

test('voice pack fingerprints include faction, model and shout style', () => {
  const { fingerprint, styleFor, model, hash } = require('../tools/voice-pack.cjs');
  const e = boot();
  for (const q of e.run('QUESTIONS')) {
    assert.equal(fingerprint(q), hash(JSON.stringify({ kana: q.kana, model, style: styleFor(q) })));
    if (q.anime === 'jojo' && q.type === 'waza') assert.equal(styleFor(q).prefix, '[shouting] ');
  }
  const q = { anime: 'jojo', type: 'char', kana: 'ジョジョ', voiceSide: 'hero' };
  assert.notEqual(fingerprint(q), fingerprint({ ...q, voiceSide: 'villain' }));
  assert.notEqual(fingerprint(q), fingerprint({ ...q, type: 'waza' }));
});
