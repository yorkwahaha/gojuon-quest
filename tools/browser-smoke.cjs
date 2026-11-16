'use strict';
// Optional real-browser QA. Supply PLAYWRIGHT_MODULE when using a shared runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { handler } = require('./voice-server.js');
async function main() {
  const server = http.createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:'+server.address().port;
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({locale:'zh-TW',viewport:{width:1280,height:900}});
    const page = await context.newPage(); const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(()=>SaveStore.status==='ready');
    const other=await context.newPage();await other.goto(origin);
    await other.waitForFunction(()=>SaveStore.status==='readonly');
    assert.equal(await other.locator('#saveWarning').isVisible(),true);await other.close();
    await page.locator('[data-nav="practice"]').click();
    await page.evaluate(()=>{Quiz.state.pool=['q01'];});
    await page.locator('#btnStartQuiz').click();
    const chars=await page.evaluate(()=>[...Quiz.state.current.kana].filter(c=>!FIXED_CHARS.has(c)));
    for(const char of chars){
      const index=await page.evaluate(c=>Quiz.state.tiles.findIndex(t=>!t.used&&t.char===c),char);
      await page.locator('#tilePool button').nth(index).press('Enter');
      if(char!==chars.at(-1)) assert.match(await page.evaluate(()=>document.activeElement.className),/tile/);
    }
    await page.locator('#revealPanel').waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>document.activeElement.id),'btnNext');
    await page.locator('#btnLangToggle').click();
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
    console.log(JSON.stringify({browser:'Chromium',checks:['single-writer tabs','keyboard answer focus','localized correct slots','settings Escape','chart keyboard tabs','unblocked timed rank','timer contrast','desktop/tablet/phone overflow'],pageErrors:errors}));
    await context.close();
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
