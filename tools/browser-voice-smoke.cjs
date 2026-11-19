'use strict';
// Isolated real-media playback using the published pack and a controlled failure.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { handler } = require('./voice-server.js');
const http = require('node:http');
const assert = require('node:assert/strict');
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const context = await browser.newContext();
    let mode = 'success', calls = 0;
    await context.route('https://gojuon-voice.yorkwahaha.workers.dev/api/voice**', async route => {
      calls++;
      await route.abort('failed');
    });
    await context.route('**/assets/voice/q99.mp3?*', async route => {
      if (mode === 'error') return route.abort('failed');
      if (mode === 'slow') await new Promise(resolve => setTimeout(resolve, 1350));
      await route.continue();
    });
    await context.addInitScript(() => {
      const NativeAudio = window.Audio;
      window.__qaVoices = [];
      window.__qaSpoken = [];
      window.speechSynthesis.speak = utterance => window.__qaSpoken.push(utterance.text);
      window.Audio = function(src) {
        const clip = new NativeAudio(src);
        if (src.includes('assets/voice/')) window.__qaVoices.push(clip);
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
    assert.match(await page.evaluate(() => window.__qaVoices[0].src), /\/assets\/voice\/q99\.mp3\?v=/);
    mode = 'error';
    await page.locator('#btnKanaReplay').click();
    await page.waitForFunction(() => window.__qaSpoken.includes('キッス'));
    await page.locator('#logoHome').click();
    mode = 'slow';
    await page.locator('[data-nav="timeattack"]').click();
    await page.evaluate(() => { Quiz.state.pool = ['q01', 'q99']; });
    await page.locator('#btnStartQuiz').click();
    await page.evaluate(() => {
      for (const char of Quiz.state.current.kana) {
        const index = Quiz.state.tiles.findIndex(tile => !tile.used && tile.char === char);
        document.querySelectorAll('#tilePool button')[index].click();
      }
    });
    await page.waitForFunction(() => Quiz.state.questionCount === 2);
    await page.waitForFunction(() => window.__qaVoices.at(-1).currentTime > 0);
    await page.locator('#logoHome').click();
    assert.equal(await page.evaluate(() => window.__qaVoices.every(clip => clip.paused)), true);
    assert.equal(calls, 0); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: 'Chromium', checks: ['real recorded MP3 playback', 'pack error to browser TTS',
      'timed shout survives automatic advance', 'navigation stops all speech'], providerRequests: calls, pageErrors: errors }));
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
