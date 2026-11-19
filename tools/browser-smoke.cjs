'use strict';
// Optional real-browser QA. Supply PLAYWRIGHT_MODULE when using a shared runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { handler } = require('./voice-server.js');
async function main() {
  const browser = await chromium.launch({headless:true, executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
  const server = http.createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:'+server.address().port;
  try {
    const context = await browser.newContext({locale:'zh-TW',viewport:{width:1280,height:900}});
    const assets = ['assets/bgm/jojo.mp3', 'assets/bgm/jjk.mp3'];
    const manifest = fs.readFileSync(path.join(__dirname,'../js/voice-manifest.js'),'utf8');
    await context.route('**/js/voice-manifest.js*', route => route.fulfill({
      contentType:'text/javascript', body:manifest + assets.map(file => 'OPTIONAL_MEDIA.add(' + JSON.stringify(file) + ');').join('\n'),
    }));
    await context.route('**/assets/bgm/*.mp3', route => route.fulfill({
      contentType:'audio/mpeg', path:path.join(__dirname,'../assets/voice/q99.mp3'),
    }));
    const page = await context.newPage(); const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(()=>SaveStore.status==='ready');
    const other=await context.newPage();await other.goto(origin);
    await other.waitForFunction(()=>SaveStore.status==='readonly');
    assert.equal(await other.locator('#saveWarning').isVisible(),true);await other.close();
    await page.locator('#btnSettings').click();
    await page.locator('label:has(#toggleVoice)').click();
    assert.equal(await page.locator('#toggleVoice').isChecked(),false);
    await page.keyboard.press('Escape');
    await page.locator('[data-nav="listening"]').first().click();
    assert.equal(await page.locator('#btnStartQuiz').isDisabled(),true);
    await page.getByRole('button',{name:'開啟發音',exact:true}).click();
    assert.equal(await page.locator('#btnStartQuiz').isEnabled(),true);
    await page.locator('#logoHome').click();
    await page.locator('[data-nav="practice"]').click();
    await Promise.all([
      page.waitForRequest('**/assets/bgm/jojo.mp3'),
      page.locator('#animeChips [data-value="jojo"]').click(),
    ]);
    await Promise.all([
      page.waitForRequest('**/assets/bgm/jjk.mp3'),
      page.locator('#animeChips [data-value="jjk"]').click(),
    ]);
    await page.locator('#animeChips [data-value="all"]').click();
    await page.evaluate(()=>{Quiz.state.pool=['q01']; Math.random=()=>0.01;});
    await page.locator('#btnStartQuiz').click();
    assert.equal(await page.locator('#goldenTag').textContent(),'金色加碼題');
    const chars=await page.evaluate(()=>[...Quiz.state.current.kana].filter(c=>!FIXED_CHARS.has(c)));
    for(const char of chars){
      const index=await page.evaluate(c=>Quiz.state.tiles.findIndex(t=>!t.used&&t.char===c),char);
      await page.locator('#tilePool button').nth(index).press('Enter');
      if(char!==chars.at(-1)) assert.match(await page.evaluate(()=>document.activeElement.className),/tile/);
    }
    await page.locator('#revealPanel').waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>document.activeElement.id),'btnNext');
    await page.locator('#btnLangToggle').click();
    assert.equal(await page.locator('#goldenTag').textContent(),'キラキラ問題');
    assert.ok(await page.locator('#slotsWrap .is-correct').count()>0);
    await page.locator('#logoHome').click();
    await page.locator('#btnMissions').click();
    await page.locator('.mission-claim-btn').first().focus();
    await page.keyboard.press('Enter');
    assert.match(await page.evaluate(()=>document.activeElement.className),/mission-claim-btn|seg-btn/);
    await page.locator('#logoHome').click();
    await page.locator('#btnSettings').click();
    assert.ok(await page.locator('#settingsModal').isVisible());
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#settingsModal').isVisible(),false);
    await page.locator('[data-nav="chart"]').first().click();
    await page.locator('#chartTabHiragana').press('ArrowRight');
    assert.equal(await page.locator('#chartTabKatakana').getAttribute('aria-selected'),'true');
    await page.locator('#logoHome').click();
    await page.locator('[data-nav="timeattack"]').click();
    await page.evaluate(()=>{Quiz.state.pool=['q01'];SaveStore.data.xp=99;});
    await page.locator('#btnStartQuiz').click();
    await page.evaluate(()=>{for(const c of Quiz.state.current.kana){const i=Quiz.state.tiles.findIndex(t=>!t.used&&t.char===c);document.querySelectorAll('#tilePool button')[i].click();}});
    await page.waitForFunction(()=>Quiz.state.questionCount===2);
    assert.equal(await page.evaluate(()=>document.activeElement === document.querySelector('#tilePool button')),true);
    assert.equal(await page.locator('#levelupModal').isVisible(),false);
    const chipColor=await page.locator('#quizTimer').evaluate(el=>getComputedStyle(el).color);
    assert.equal(chipColor,'rgb(250, 246, 235)');
    await page.locator('#logoHome').click();
    for(const viewport of [{width:1280,height:900},{width:834,height:1194},{width:390,height:844}]){
      await page.setViewportSize(viewport);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,'gojuon-'+viewport.width+'.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({browser:'Chromium',checks:['single-writer tabs','listening voice requirement','series BGM request routing','keyboard answer and timed next focus','localized correct slots','settings Escape','chart keyboard tabs','unblocked timed rank','timer contrast','desktop/tablet/phone overflow'],pageErrors:errors}));
    await context.close();
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
