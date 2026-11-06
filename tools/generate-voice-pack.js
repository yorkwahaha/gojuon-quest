'use strict';
/* ============================================================
   五十音クエスト — 音声パック生成ツール（開発用）
   Fish Audio API（s2.1-pro-free モデル）で、QUESTIONS のかな読みを
   作品（JOJO／呪術廻戦）ごとの音色で MP3 出力し、
   js/voice-manifest.js（ゲームが読むマニフェスト）も自動生成します。

   使い方:
     1) 環境変数 FISH_API_KEY に Fish Audio の API キーを設定
     2) node tools/generate-voice-pack.js
     3) 既存ファイルはスキップされます（全部作り直すなら assets/voice/ を消す）
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'voice');

// 作品別の音色（reference_id）
const VOICES = {
  jojo: '5a8e46f1b94c4351aebb8a66b113cec5',
  jjk: '827be896a6954a8199ce4b2baad6af36',
};

// 作品別の読み上げスタイル（S2 の方向タグ＋話速）
// ※呪術廻戦は「叫ぶような技のかけ声」の雰囲気にするため [shouting] を付ける
const VOICE_STYLE = {
  jojo: { prefix: '', prosody: { speed: 0.92, volume: 0, normalize_loudness: true } },
  jjk:  { prefix: '[shouting] ', prosody: { speed: 1.0, volume: 0, normalize_loudness: true } },
};

// CLI引数: --only=jojo|jjk（その作品だけ生成）  --force（既存ファイルも作り直す）
const cliArgs = process.argv.slice(2);
const onlyArg = (cliArgs.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
const force = cliArgs.includes('--force');
if (onlyArg && !VOICES[onlyArg]) {
  console.error(`--only の値は jojo / jjk のどちらかにしてください（受け取った値: ${onlyArg}）`);
  process.exit(1);
}

// data.js から QUESTIONS を評価して取り出す（ローカルの信頼できるファイルのみ）
const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const QUESTIONS = vm.runInNewContext(`${dataSrc}\nQUESTIONS`, {}, { filename: 'js/data.js' });

const apiKey = process.env.FISH_API_KEY;
if (!apiKey) {
  console.error('環境変数 FISH_API_KEY が設定されていません。');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const manifest = {};
  let ok = 0, skipped = 0, failed = 0;

  for (const q of QUESTIONS) {
    const rel = `assets/voice/${q.id}.mp3`;
    if (manifest[q.kana]) continue;
    manifest[q.kana] = rel;
    if (onlyArg && q.anime !== onlyArg) continue;

    const target = path.join(OUT_DIR, `${q.id}.mp3`);
    if (!force && fs.existsSync(target) && fs.statSync(target).size > 1000) {
      console.log('skip', q.id, '(既存ファイルあり)');
      skipped += 1;
      continue;
    }

    const voiceId = VOICES[q.anime];
    if (!voiceId) { console.error('FAIL', q.id, 'unknown anime', q.anime); failed += 1; continue; }
    const style = VOICE_STYLE[q.anime] || VOICE_STYLE.jojo;

    const body = {
      text: `${style.prefix}${q.kana}`,
      reference_id: voiceId,
      format: 'mp3',
      language: 'ja',
      normalize: true,
      prosody: style.prosody,
    };

    try {
      const res = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          model: 's2.1-pro-free',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('FAIL', q.id, res.status, t);
        failed += 1;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(target, buf);
      console.log('ok', q.id, q.kana, `${buf.length} bytes`);
      ok += 1;
      await sleep(150); // レート制限への配慮
    } catch (e) {
      console.error('FAIL', q.id, String(e));
      failed += 1;
    }
  }

  const js =
    '\'use strict\';\n' +
    '/* Fish Audio で生成した読み上げ音声のマニフェスト（tools/generate-voice-pack.js が自動生成） */\n' +
    `const VOICE_PACK = ${JSON.stringify(manifest, null, 1)};\n`;
  fs.writeFileSync(path.join(ROOT, 'js', 'voice-manifest.js'), js);

  console.log(`\n完了: 新規 ${ok} 件 / スキップ ${skipped} 件 / 失敗 ${failed} 件`);
  console.log('js/voice-manifest.js を出力しました。');
  if (failed > 0) process.exitCode = 1;
})();
