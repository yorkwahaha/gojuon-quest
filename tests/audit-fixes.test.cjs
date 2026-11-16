'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
// Reuse the same controlled environment without registering the other suite.
const harness = fs.readFileSync(path.join(__dirname,'regression.test.cjs'),'utf8').split("test('rank celebration")[0];
const { boot, begin, answer } = vm.runInNewContext(harness+'\n({boot,begin,answer})', {require,__dirname,console});
function select(e, mode, id) {
  e.run(`App.go('${mode}'); Quiz.state.pool=['${id}']`); e.get('btnStartQuiz').fire();
}
function fill(e) {
  const s=e.run('Quiz.state'), available=[...s.tiles];
  for (const char of s.current.kana) {
    if(e.run('FIXED_CHARS').has(char))continue;
    const tile=available.splice(available.findIndex(t=>t.char===char),1)[0];
    e.get('tilePool').children[s.tiles.indexOf(tile)].fire();
  }
}

test('a stale second tab cannot overwrite answer earnings by changing a preference',()=>{
  const storage=new Map(), a=boot({storage}), b=boot({storage});
  a.run("SaveStore.recordCorrect(1,'jojo')");
  b.run('SaveStore.data.sound=false'); assert.equal(b.run('SaveStore.save()'),false);
  assert.equal(JSON.parse(storage.get(a.run('SAVE_KEY'))).correct,1);
  assert.equal(b.run('SaveStore.status'),'conflict');
  assert.equal(b.get('saveWarning').hidden,false);
});
test('an occupied browser writer lock blocks all reward and purchase entry points',async()=>{
  const e=boot();
  e.run("window.addEventListener=()=>{}; navigator.locks={request:async(name,opts,fn)=>fn(null)}; SaveStore.load()");
  await Promise.resolve();
  assert.equal(e.run('SaveStore.status'),'readonly');
  assert.equal(e.run("SaveStore.recordCorrect(1,'jojo')"),null);
  assert.equal(e.run('SaveStore.drawGacha().type'),'blocked');
});
test('failed storage writes show a persistent warning and failed reset does not reload',()=>{
  const e=boot();e.run('console.warn=()=>{}; localStorage.setItem=()=>{throw Error("full")}; localStorage.removeItem=()=>{throw Error("denied")}; location.reload=()=>{window.reloaded=true}');
  assert.equal(e.run('SaveStore.save()'),false);
  assert.equal(e.get('saveWarning').hidden,false);
  e.get('btnResetSave').fire();e.get('btnResetSave').fire();
  assert.equal(e.run('window.reloaded'),undefined);
});
test('a timed answer completed at 59.9 seconds counts before settlement',()=>{
  const e=boot();select(e,'timeattack','q01');e.tick(59900);fill(e);
  assert.equal(e.run('Quiz.state.score'),100);e.tick(100);
  assert.equal(e.run('SaveStore.data.correct'),1);
  assert.equal(e.run('SaveStore.data.timeAttackPlays'),1);
});
test('a delayed timer cannot allow input past the real deadline',()=>{
  const e=boot();select(e,'timeattack','q01');e.jump(60001);fill(e);
  assert.equal(e.run('SaveStore.data.correct'),0);
  assert.equal(e.run('Quiz.state.locked'),'done');
});
test('rank celebration never blocks an active timed round',()=>{
  const e=boot();select(e,'timeattack','q01');e.run('SaveStore.data.xp=99');answer(e);e.tick(800);
  assert.equal(e.get('levelupModal').hidden,true);e.tick(60000);
  assert.equal(e.get('levelupModal').hidden,false);
  assert.equal(e.run('SaveStore.data.timeAttackPlays'),1);
});
test('cross-midnight daily completion is credited to its original question date',()=>{
  const e=boot();begin(e,'daily');const date=e.run('Quiz.state.dailyDate');
  for(let i=0;i<5;i++){answer(e);if(i<4)e.get('btnNext').fire();}
  e.run("todayKey=()=> '2099-01-02'");e.get('btnNext').fire();
  assert.equal(e.run('SaveStore.data.lastDaily'),date);
  assert.equal(e.run("SaveStore.recordDailyClear(3,'2099-01-02').already"),false);
});
test('older daily sessions cannot roll the last clear date backward or claim twice',()=>{
  const e=boot();e.run("SaveStore.recordDailyClear(3,'2026-11-17')");
  assert.equal(e.run("SaveStore.recordDailyClear(3,'2026-11-16').already"),true);
  assert.equal(e.run('SaveStore.data.lastDaily'),'2026-11-17');
});
test('pending pack playback falls back once and ignores a late rejection',async()=>{
  const e=boot({audio:true});e.run("AudioKit.speak('ザ・ワールド')");const clip=e.packs[0];e.tick(4000);
  assert.deepEqual(Array.from(e.spoken),['ザ・ワールド']);clip.reject(Error('late'));await Promise.resolve();await Promise.resolve();
  assert.deepEqual(Array.from(e.spoken),['ザ・ワールド']);assert.equal(clip.paused,true);
});
test('an autoplay rejection reaches TTS without waiting for an error event',async()=>{
  const e=boot({audio:true});e.run("AudioKit.shout('ザ・ワールド')");
  const err=Error('gesture');err.name='NotAllowedError';e.packs[0].reject(err);
  await Promise.resolve();await Promise.resolve();assert.deepEqual(Array.from(e.spoken),['ザ・ワールド']);
});
test('a broken comic image cannot suppress answer pronunciation',()=>{
  const e=boot({audio:true,effects:true});select(e,'practice','q12');answer(e);
  e.get('wazaAttackImage').fire('error');
  assert.ok(e.packs.some(p=>p.file.startsWith('assets/voice/q12.mp3')));
  assert.equal(e.get('revealPanel').hidden,false);
});
test('navigation and hidden pages cancel voice and pending fallback',async()=>{
  const e=boot({audio:true});e.run("App.go('chart'); AudioKit.speak('ジョジョ')");
  const clip=e.packs.at(-1);e.run("App.go('home')");assert.equal(clip.paused,true);
  e.run("AudioKit.speak('ジョジョ')");const second=e.packs.at(-1);
  e.document.hidden=true;e.document.fire('visibilitychange');second.reject(Error('late'));
  await Promise.resolve();await Promise.resolve();assert.equal(second.paused,true);assert.deepEqual(Array.from(e.spoken),[]);
});
test('language changes rerender golden rewards and retain the correct slot state',()=>{
  const e=boot();select(e,'practice','q01');e.run("I18N.setLocale('ja'); Quiz.state.golden=true");answer(e);
  const coins=e.run('SaveStore.data.coins');e.run("I18N.setLocale('zh')");
  assert.match(e.get('revealXp').innerHTML,/閃閃/);
  assert.ok(e.get('slotsWrap').children.every(el=>el.classList.contains('is-correct')));
  assert.equal(e.run('SaveStore.data.coins'),coins);
});
test('open card and gacha views update locale without spending again',()=>{
  const e=boot();e.run("I18N.setLocale('ja'); SaveStore.data.unlocked=['c01']; Collection.refresh()");
  e.get('collectionGrid').children[0].fire();e.run("I18N.setLocale('zh')");
  assert.equal(e.get('cardModalName').textContent,'五十音冒險者');
  assert.doesNotMatch(e.get('cardModalCondition').textContent,/答對/);
  e.run("App.closeModal('cardModal'); SaveStore.data.coins=240; Gacha.open()");e.get('btnGachaPull').fire();e.tick(1200);
  const coins=e.run('SaveStore.data.coins');e.run("I18N.setLocale('ja')");
  assert.equal(e.get('gachaRewardKind').textContent,e.run("I18N.t('gacha.cardGet')"));
  assert.equal(e.run('SaveStore.data.coins'),coins);
});
test('completed collection at max rank cannot spend more coins on useless XP',()=>{
  const e=boot();e.run('SaveStore.data.coins=120; SaveStore.data.unlocked=CARDS.map(c=>c.id); SaveStore.data.xp=1000');
  assert.equal(e.run('SaveStore.drawGacha().type'),'complete');
  assert.equal(e.run('SaveStore.data.coins'),120);
});
test('keyboard focus moves to a usable tile and the answer next button',()=>{
  const e=boot();select(e,'practice','q01');const btn=e.get('tilePool').children[0];btn.focus();btn.fire();
  assert.ok(e.get('tilePool').children.includes(e.document.activeElement));
  assert.equal(e.document.activeElement.disabled,false);
});
test('chart keyboard tabs expose their current controlled panel and heart counts are numeric',()=>{
  const e=boot();e.get('chartTabHiragana').fire('keydown',{key:'ArrowRight'});
  assert.equal(e.get('chartTabKatakana').attrs['aria-selected'],'true');
  assert.equal(e.get('chartContainer').attrs['aria-labelledby'],'chartTabKatakana');
  select(e,'listening','q01');assert.match(e.get('quizHearts').attrs['aria-label'],/3/);
});
test('all question kana have a faithful romanization distinct from foreign names',()=>{
  const e=boot();for(const q of e.run('QUESTIONS'))assert.ok(e.run(`kanaRomaji(${JSON.stringify(q.kana)})`));
  assert.equal(e.run("kanaRomaji('ザ・ワールド')"),'za · waarudo');
  assert.equal(e.run("kanaRomaji('キッス')"),'kissu');
  assert.equal(e.run("kanaRomaji('ムリョウクウショ')"),'muryoukuusho');
});
test('corrected names, character facts and difficulty remain consistent',()=>{
  const e=boot();const q=Object.fromEntries(e.run('QUESTIONS').map(q=>[q.id,q]));
  for(const [id,kana] of Object.entries({q99:'キッス',q82:'ジョディオ・ジョースター',q110:'ノーヴェンバー・レイン',q111:'スムース・オペレイターズ',q106:'ディー・フォー・シー'}))assert.equal(q[id].kana,kana);
  assert.match(q.q36.desc,/一級/);assert.match(q.q48.desc,/三年/);assert.equal(q.q35.label,'夏油');
  for(const item of Object.values(q)){const len=[...item.kana].filter(c=>!e.run('FIXED_CHARS').has(c)).length;assert.equal(item.level,len<=4?1:len<=7?2:3,item.id);}
});
test('all published audio mappings are versioned, exist and match the current content metadata',()=>{
  const e=boot(),meta=require('../tools/voice-pack-metadata.json'),{fingerprint,hash,validateAudio}=require('../tools/voice-pack.cjs');
  for(const q of e.run('QUESTIONS')){
    const url=e.run('VOICE_PACK')[q.kana];assert.match(url,/\?v=[a-f0-9]{12}$/);
    const file=url.split('?')[0],buf=fs.readFileSync(path.join(root,file));validateAudio(buf);
    const id=path.basename(file,'.mp3');assert.equal(meta[id].fingerprint,fingerprint(q));
    assert.equal(url.split('?v=')[1],hash(buf).slice(0,12));
  }
});
test('generator rejects corrupt payloads and stale kana fingerprints',()=>{
  const {validateAudio,fingerprint}=require('../tools/voice-pack.cjs');
  assert.throws(()=>validateAudio(Buffer.from('bad')),/MP3/);
  assert.notEqual(fingerprint({anime:'jojo',kana:'キス'}),fingerprint({anime:'jojo',kana:'キッス'}));
});
test('pack synchronization completes without calling a paid API',()=>{
  const out=execFileSync(process.execPath,['tools/generate-voice-pack.js','--sync-only'],{cwd:root,encoding:'utf8',env:{...process.env,FISH_API_KEY:''}});
  assert.match(out,/"generated":0,"failed":0/);
});
for(const failure of ['provider failure','corrupt successful response'])test('generator preserves the previous files after '+failure,async()=>{
  const target=path.join(root,'assets/voice/q99.mp3'),metadataFile=path.join(root,'tools/voice-pack-metadata.json');
  const pack=require('../tools/voice-pack.cjs'),writes=[];
  const old=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(1200)]);
  const fakeFs={
    existsSync:file=>[target,metadataFile].includes(file),
    readFileSync:file=>file===metadataFile?JSON.stringify({q99:{fingerprint:'old'}}):file===target?old:"const QUESTIONS=[{id:'q99',anime:'jojo',type:'waza',kana:'キッス'}];",
  };
  const proc={argv:['node','generate-voice-pack.js'],env:{FISH_API_KEY:'mock-only'}};
  const source=fs.readFileSync(path.join(root,'tools/generate-voice-pack.js'),'utf8');
  await vm.runInNewContext(source,{
    require:name=>name==='node:fs'?fakeFs:name==='./voice-pack.cjs'?{...pack,atomicWrite:(...args)=>writes.push(args)}:name==='node:child_process'?{spawnSync:()=>({status:0})}:require(name),
    __dirname:path.join(root,'tools'),process:proc,console:{log(){},error(){}},Buffer,AbortSignal,
    fetch:async()=>failure==='provider failure'?{ok:false,status:502}:{ok:true,headers:{get:()=> 'audio/mpeg'},arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer},
  });
  assert.equal(proc.exitCode,1);assert.equal(writes.length,0);
});
const {handler}=require('../tools/voice-server.js');
function request(url,method='GET'){
  const res={status:0,headers:{},writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};
  handler({url,method},res);return res;
}
for(const url of ['/.env','/.git/config','/tools/voice-pack-metadata.json','/..%5cgojuon-quest-other%5cprobe.txt','/%2e%2e/js/data.js','/assets/%2e%2e/.env']){
  test('local preview blocks private or escaping path '+url,()=>assert.equal(request(url).status,404));
}
test('malformed URLs return 400 while valid requests remain available',()=>{
  assert.equal(request('/%').status,400);assert.equal(request('/').status,200);
  assert.equal(request('/api/voice?anime=jojo&kana='+encodeURIComponent('キッス')).status,200);
  assert.equal(request('/api/voiceevil?anime=jojo&kana=キッス').status,404);
});
test('without a secret the public Worker redirects only known versioned static audio',async()=>{
  let source=fs.readFileSync(path.join(root,'worker/index.js'),'utf8').replace("import allowlist from './allowlist.json';",'const allowlist='+JSON.stringify(require('../worker/allowlist.json'))+';')
    .replace("import voiceConfig from '../tools/voice-config.cjs';",'const voiceConfig='+JSON.stringify(require('../tools/voice-config.cjs'))+';').replace('export default {','const worker={');
  let calls=0;
  const worker=vm.runInNewContext(source+'\nworker',{Request,Response,URL,Headers,TextEncoder,crypto:require('node:crypto').webcrypto,
    caches:{default:{match:async()=>null}},fetch:()=>{calls++;throw Error('network forbidden');}});
  for(let i=0;i<2;i++){
    const res=await worker.fetch(new Request('https://example.test/api/voice?anime=jojo&kana='+encodeURIComponent('キッス')));
    assert.equal(res.status,302);assert.match(res.headers.get('location'),/^https:\/\/yorkwahaha.github.io\/gojuon-quest\/assets\/voice\/q99.mp3\?v=/);
  }
  assert.equal(calls,0);
  assert.equal((await worker.fetch(new Request('https://example.test/api/voice?anime=jojo&kana=not-allowed'))).status,404);
});
