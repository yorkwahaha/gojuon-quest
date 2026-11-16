'use strict';
// Isolated real-media playback checks. Provider responses are controlled fixtures.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { handler } = require('./voice-server.js');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
async function main() {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const bytes = fs.readFileSync(path.join(__dirname, '../assets/voice/q99.mp3'));
    let mode = 'success', calls = 0;
    await context.route('https://gojuon-voice.yorkwahaha.workers.dev/api/voice**', async route => {
      calls++;
      if (mode === 'error') return route.abort('failed');
      await route.fulfill({ status: 200, headers: { 'content-type': 'audio/mpeg', 'access-control-allow-origin': '*',
        'cache-control': 'no-store' }, body: bytes });
    });
    await context.addInitScript(() => {
      const NativeAudio = window.Audio;
      window.__qaVoices = [];
      window.Audio = function(src) {
        const clip = new NativeAudio(src);
        if (src.includes('/api/voice') || src.includes('assets/voice/')) window.__qaVoices.push(clip);
        return clip;
      };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => SaveStore.status === 'ready');
    await page.evaluate(() => { SaveStore.data.sound = false; SaveStore.data.bgm = false; });
    await page.locator('[data-nav="listening"]').first().click();
    await page.evaluate(() => { Quiz.state.pool = ['q99']; });
    await page.locator('#btnStartQuiz').click();
    await page.waitForFunction(() => window.__qaVoices[0]?.currentTime > 0);
    assert.equal(await page.evaluate(() => window.__qaVoices.length), 1);
    assert.match(await page.evaluate(() => window.__qaVoices[0].src), /\/api\/voice\?anime=jojo/);
    mode = 'error';
    await page.locator('#btnKanaReplay').click();
    await page.waitForFunction(() => window.__qaVoices.some(clip => clip.src.includes('/assets/voice/q99.mp3') && clip.currentTime > 0));
    await page.locator('#logoHome').click();
    assert.equal(await page.evaluate(() => window.__qaVoices.every(clip => clip.paused)), true);
    assert.ok(calls >= 2); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: 'Chromium', checks: ['real online MP3 playback', 'network failure to local MP3',
      'navigation stops all speech'], providerRequests: calls, pageErrors: errors }));
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
