'use strict';
// Dependency-free controlled DOM/clock tests; these do not replace browser QA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function boot({ audio = false, effects = false } = {}) {
  const elements = new Map(), jobs = new Map(), spoken = [], packs = [];
  let now = Date.now(), timerId = 0;
  class Element {
    constructor() {
      this.children = []; this.dataset = {}; this.attrs = {}; this.events = {};
      this.hidden = false; this.disabled = false; this.className = ''; this.textContent = '';
      this.style = { setProperty() {} };
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        toggle: (name, force = !this.classList.contains(name)) => {
          const names = new Set(this.className.split(/\s+/).filter(Boolean));
          if (force) names.add(name); else names.delete(name);
          this.className = [...names].join(' ');
        },
        add: name => this.classList.toggle(name, true),
        remove: name => this.classList.toggle(name, false),
      };
    }
    set innerHTML(value) { this.html = value; this.children = []; }
    get innerHTML() { return this.html || ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    hasAttribute(k) { return Object.hasOwn(this.attrs, k); }
    appendChild(el) { el.parent = this; this.children.push(el); return el; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    removeEventListener(type, fn) { this.events[type] = (this.events[type] || []).filter(f => f !== fn); }
    fire(type = 'click', extra = {}) {
      if (type === 'click' && this.disabled) return;
      const event = { target: this, preventDefault() {}, ...extra };
      if (this['on' + type]) this['on' + type](event);
      for (const fn of this.events[type] || []) fn(event);
    }
    closest(selector) { return this.classList.contains(selector.slice(1)) ? this : this.parent?.closest(selector); }
    querySelectorAll(selector) {
      return this.children.flatMap(el => [el, ...el.querySelectorAll('*')])
        .filter(el => selector === '*' || el.classList.contains(selector.slice(1)));
    }
    focus() {}
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(el => el !== this); }
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const el = new Element(), tag = match[0];
    el.id = match[1]; el.className = tag.match(/class="([^"]*)"/)?.[1] || '';
    el.hidden = /\shidden(?:\s|>)/.test(tag); elements.set(el.id, el);
  }
  const get = id => { assert.ok(elements.has(id), `Unknown HTML id: ${id}`); return elements.get(id); };
  for (const id of ['animeChips', 'levelChips', 'scriptChips']) {
    const group = new Element(); group.className = 'setup-group'; group.appendChild(get(id));
    const content = html.slice(html.indexOf(`id="${id}"`)).split('</div>')[0];
    for (const match of content.matchAll(/<button[^>]*>/g)) {
      const el = new Element(); el.className = match[0].match(/class="([^"]*)"/)[1];
      el.dataset.value = match[0].match(/data-value="([^"]*)"/)[1];
      get(id).appendChild(el);
    }
  }
  const document = new Element();
  document.readyState = 'loading'; document.documentElement = new Element();
  document.getElementById = get; document.createElement = () => new Element();
  document.querySelectorAll = selector => {
    if (selector.startsWith('#')) {
      const [id, rest] = selector.slice(1).split(' '); return get(id).querySelectorAll(rest);
    }
    return [...elements.values()].filter(el => selector.startsWith('.')
      ? el.classList.contains(selector.slice(1)) : false);
  };
  const schedule = (fn, ms, repeat = false) => {
    const id = ++timerId; jobs.set(id, { fn, at: now + ms, ms, repeat }); return id;
  };
  class MockAudio {
    constructor(file) { this.file = file; this.paused = false; packs.push(this); }
    play() { return new Promise((_, reject) => { this.reject = reject; }); }
    pause() { this.paused = true; }
  }
  const context = vm.createContext({
    console, document, navigator: { language: 'zh-TW' },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    location: { reload() {} },
    window: { scrollTo() {}, speechSynthesis: { cancel() {}, speak: u => spoken.push(u.text), getVoices: () => [] } },
    Audio: MockAudio, SpeechSynthesisUtterance: function(text) { this.text = text; },
    Date: class extends Date { static now() { return now; } },
    setTimeout: (fn, ms) => schedule(fn, ms), clearTimeout: id => jobs.delete(id),
    setInterval: (fn, ms) => schedule(fn, ms, true), clearInterval: id => jobs.delete(id),
  });
  const run = code => vm.runInContext(code, context);
  const load = file => {
    const filename = path.join(root, 'js', file + '.js');
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  };
  for (const name of ['i18n', 'data', 'store', 'voice-manifest']) load(name);
  if (audio) load('audio'); else run('const AudioKit = { play() {}, speak() {}, stopVoice() {}, shout() {} };');
  if (effects) load('fx');
  else run('const FX = { confetti() {}, coinRain() {}, comboSplash() {}, prepareAttack() {}, stopCutin() {}, wazaCutin({onDone}) { onDone(); } };');
  for (const name of ['quiz', 'chart', 'collection', 'missions', 'gacha', 'app']) load(name);
  document.fire('DOMContentLoaded');
  const tick = ms => {
    const end = now + ms;
    for (;;) {
      const due = [...jobs].filter(([, j]) => j.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, job] = due; now = job.at;
      if (job.repeat) job.at += job.ms; else jobs.delete(id);
      job.fn();
    }
    now = end;
  };
  return { run, get, tick, spoken, packs, document };
}

function begin(env, mode = 'practice') {
  env.run(`App.go('${mode}')`);
  if (mode !== 'listening') env.get('btnStartQuiz').fire();
}
function answer(env, wrong = false) {
  const state = env.run('Quiz.state');
  const available = [...state.tiles];
  let order = [...state.current.kana].filter(c => c !== '・').map(c => {
    const i = available.findIndex(t => t.char === c); return available.splice(i, 1)[0];
  });
  if (wrong) {
    const i = order.findIndex(t => t.char !== order[0].char);
    assert.ok(i > 0); [order[0], order[i]] = [order[i], order[0]];
  }
  for (const tile of order) env.get('tilePool').children[state.tiles.indexOf(tile)].fire();
  env.tick(240);
}
test('rank celebration shows the earned rank, not rank zero', () => {
  const e = boot(); begin(e); e.run('SaveStore.data.xp = RANKS[1].xp - 1');
  answer(e); e.tick(3000);
  assert.equal(e.get('levelupRank').textContent, e.run("I18N.tf(rankForXP(SaveStore.data.xp).current, 'name')"));
});
test('leaving a timed quiz stops its countdown and settlement', () => {
  const e = boot(); begin(e, 'timeattack'); e.run("App.go('missions')"); e.tick(61000);
  assert.equal(e.run('SaveStore.data.timeAttackPlays'), 0);
  assert.equal(e.get('resultModal').hidden, true);
});
test('leaving during the 240ms judge delay cannot award an answer', () => {
  const e = boot(); begin(e); answerWithoutJudge(e); e.run("App.go('home')"); e.tick(300);
  assert.equal(e.run('SaveStore.data.correct'), 0);
});
function answerWithoutJudge(e) {
  const s = e.run('Quiz.state'), tiles = [...s.tiles];
  for (const ch of s.current.kana) {
    if (ch === '・') continue;
    const i = tiles.findIndex(t => t.char === ch), tile = tiles.splice(i, 1)[0];
    e.get('tilePool').children[s.tiles.indexOf(tile)].fire();
  }
}
test('an old wrong-answer reset cannot unlock a completed timed quiz', () => {
  const e = boot(); begin(e, 'timeattack'); e.tick(59600); answer(e, true); e.tick(1000);
  assert.equal(e.run('Quiz.state.locked'), 'done');
});
test('an old auto-next callback cannot skip a question after manual next', () => {
  const e = boot(); begin(e, 'timeattack'); answer(e); e.get('btnNext').fire();
  const count = e.run('Quiz.state.questionCount'); e.tick(1100);
  assert.equal(e.run('Quiz.state.questionCount'), count);
});
test('settlement cannot award the perfect bonus twice', () => {
  const e = boot(); begin(e); answer(e); e.get('quizBack').fire();
  const coins = e.run('SaveStore.data.coins'); e.get('quizBack').fire();
  assert.equal(e.run('SaveStore.data.coins'), coins);
});
test('daily settlement is idempotent even if next is activated again', () => {
  const e = boot(); begin(e, 'daily');
  for (let i = 0; i < 5; i++) { answer(e); e.get('btnNext').fire(); }
  const rewards = e.run('JSON.stringify([SaveStore.data.stars, SaveStore.data.coins, SaveStore.data.xp])');
  e.get('btnNext').fire();
  assert.equal(e.run('JSON.stringify([SaveStore.data.stars, SaveStore.data.coins, SaveStore.data.xp])'), rewards);
});
test('filter buttons reflect the actual pool after listening resets filters', () => {
  const e = boot(); e.run("App.go('practice')");
  for (const [id, value] of [['animeChips', 'jojo'], ['levelChips', '3']]) {
    const box = e.get(id); box.fire('click', { target: box.children.find(el => el.dataset.value === value) });
  }
  begin(e, 'listening'); e.run("App.go('practice')");
  assert.equal(e.get('animeChips').children.find(el => el.classList.contains('is-active')).dataset.value, 'all');
  assert.equal(e.get('levelChips').children.find(el => el.classList.contains('is-active')).dataset.value, '0');
});
test('gacha reward exposes the again/collection actions', () => {
  const e = boot(); e.run('SaveStore.data.coins = 240; Gacha.open()'); e.get('btnGachaPull').fire(); e.tick(1200);
  assert.equal(e.get('gachaAgainRow').hidden, false);
  assert.equal(e.run('SaveStore.data.coins'), 120);
});
test('Escape cancels an unfinished gacha without charging coins', () => {
  const e = boot(); e.run('SaveStore.data.coins = 240; Gacha.open()'); e.get('btnGachaPull').fire();
  e.document.fire('keydown', { key: 'Escape' }); e.tick(1200);
  assert.equal(e.run('SaveStore.data.coins'), 240);
  assert.equal(e.run('SaveStore.data.gachaPulls'), 0);
});
test('replacement speech pauses the old pack; stale rejection cannot start TTS', async () => {
  const e = boot({ audio: true }); e.run("AudioKit.speak('ジョジョ'); AudioKit.speak('テスト')");
  assert.equal(e.packs[0].paused, true); e.packs[0].reject(new Error('interrupted')); await Promise.resolve();
  assert.deepEqual(e.spoken, ['テスト']);
});
test('muting voice stops playback and suppresses pending TTS fallback', async () => {
  const e = boot({ audio: true }); e.run("AudioKit.speak('ジョジョ')");
  e.get('toggleVoice').checked = false; e.get('toggleVoice').fire('change');
  assert.equal(e.packs[0].paused, true); e.packs[0].reject(new Error('interrupted')); await Promise.resolve();
  assert.deepEqual(e.spoken, []);
});
test('daily question selection remains deterministic without call-stack overflow in 2050', () => {
  const e = boot(); const ids = e.run("JSON.stringify(dailyQuestionIds('2050-01-01'))");
  assert.equal(ids, e.run("JSON.stringify(dailyQuestionIds('2050-01-01'))"));
  assert.equal(new Set(JSON.parse(ids)).size, 5);
});
test('question hints and kana agree with the official JOJO identities', () => {
  const e = boot(); assert.match(e.run("QUESTIONS.find(q => q.id === 'q17').desc"), /エアロスミス/);
});
test('幽波紋 uses the official reading and an existing matching voice pack', () => {
  const e = boot();
  assert.equal(e.run("QUESTIONS.find(q => q.id === 'q19').kana"), 'スタンド');
  assert.equal(e.run("VOICE_PACK[QUESTIONS.find(q => q.id === 'q19').kana]"), 'assets/voice/q09.mp3');
});
test('a partial save retains default coins; invalid numbers cannot propagate', () => {
  const e = boot(); assert.equal(e.run('sanitizeSave({}).coins'), 30);
  assert.equal(e.run('sanitizeSave({ coins: -1, xp: Infinity }).coins'), 30);
  assert.equal(e.run('sanitizeSave({ coins: 0 }).coins'), 0);
});
test('the basic kana chart places wo in the o column and n on a separate row', () => {
  const e = boot(); assert.equal(e.run("CHART_SECTIONS[0].rows.find(r => r.label === 'わ行').cells[4][0]"), 'を');
  assert.ok(e.run("CHART_SECTIONS[0].rows.some(r => r.label === 'ん' && r.cells[0][0] === 'ん')"));
});
test('all XP sources award rank bonuses, including a completed-collection gacha', () => {
  const e = boot();
  e.run('SaveStore.data.xp = RANKS[1].xp - 1; SaveStore.addXP(1)');
  assert.equal(e.run('SaveStore.data.stars'), 1);
  assert.equal(e.run('SaveStore.data.coins'), e.run('30 + RANKUP_COINS'));
  e.run('SaveStore.data.unlocked = CARDS.map(c => c.id); SaveStore.data.coins = 120; SaveStore.data.xp = RANKS[2].xp - 1; SaveStore.drawGacha()');
  assert.equal(e.run('SaveStore.data.stars'), 2);
  assert.equal(e.run('SaveStore.data.coins'), e.run('RANKUP_COINS'));
});
test('switching locale updates the revealed answer description', () => {
  const e = boot(); begin(e); e.run("I18N.setLocale('ja')"); answer(e); e.run("I18N.setLocale('zh')");
  assert.equal(e.get('revealDesc').textContent, e.run('questionDesc(Quiz.state.current)'));
});
test('closing the result with Escape returns to a playable home screen', () => {
  const e = boot(); begin(e); answer(e); e.get('quizBack').fire(); e.document.fire('keydown', { key: 'Escape' });
  assert.equal(e.get('screen-home').classList.contains('active'), true);
  assert.equal(e.get('resultModal').hidden, true);
});
test('locale changes rerender result statistics without awarding rewards again', () => {
  const e = boot(); begin(e); e.run("I18N.setLocale('ja')"); answer(e); e.get('quizBack').fire();
  const coins = e.run('SaveStore.data.coins'); e.run("I18N.setLocale('zh')");
  assert.equal(e.get('resultTitle').textContent, e.run("I18N.t('result.quit')"));
  assert.match(e.get('resultStats').innerHTML, /金幣/);
  assert.equal(e.run('SaveStore.data.coins'), coins);
});
test('a completed confetti animation removes only its own particle', () => {
  const e = boot({ effects: true }); e.run('FX.confetti(2); FX.coinRain(6)');
  const layer = e.get('confettiLayer'); layer.children[0].fire('animationend');
  assert.equal(layer.children.length, 7);
  assert.equal(layer.children.filter(el => el.className === 'coin-piece').length, 6);
});
test('leaving the quiz cancels the skill overlay as well as delayed callbacks', () => {
  const e = boot({ effects: true }); begin(e); e.run("FX.wazaCutin({name:'テスト'}); App.go('home')");
  assert.equal(e.get('wazaCutin').hidden, true);
});
test('attack panels select the corresponding full-color illustration', () => {
  const e = boot({ effects: true });
  const image = e.get('wazaAttackImage'); image.complete = true; image.naturalWidth = 1672;
  for (const [id, scene] of [['q10', 'stand-rush'], ['q37', 'black-flash'], ['q54', 'domain'], ['q57', 'purple-blast']]) {
    e.run(`FX.wazaCutin({name:'テスト', questionId:'${id}'})`);
    assert.equal(image.src, `assets/comic/${scene}.webp`);
  }
});
test('an attack panel waits for its image and cancellation ignores a stale load', () => {
  const e = boot({ effects: true }); e.run("let attackDone = 0; FX.wazaCutin({name:'テスト',questionId:'q57',onDone:()=>attackDone++})");
  e.tick(2100); assert.equal(e.run('attackDone'), 0);
  const staleLoad = e.get('wazaAttackImage').onload;
  e.run('FX.stopCutin()'); staleLoad(); e.tick(4000);
  assert.equal(e.get('wazaCutin').hidden, true);
  assert.equal(e.run('attackDone'), 0);
});
test('a timed skill answer displays a compact attack without blocking auto-next', () => {
  const e = boot({ effects: true }); e.run("App.go('timeattack'); Quiz.state.pool = ['q37']");
  e.get('wazaAttackImage').complete = true; e.get('wazaAttackImage').naturalWidth = 1672;
  e.get('btnStartQuiz').fire(); answer(e);
  assert.equal(e.get('wazaCutin').classList.contains('is-compact'), true);
  assert.equal(e.get('revealPanel').hidden, false);
  e.tick(1100); assert.equal(e.run('Quiz.state.questionCount'), 2);
});
test('the full comic panel remains readable until the player continues', () => {
  const e = boot({ effects: true });
  e.get('wazaAttackImage').complete = true; e.get('wazaAttackImage').naturalWidth = 1672;
  e.run("let comicFinished = 0; FX.wazaCutin({name:'テスト',questionId:'q37',onDone:()=>comicFinished++})");
  e.tick(10000); assert.equal(e.get('wazaCutin').hidden, false);
  e.get('wazaCutin').fire(); assert.equal(e.run('comicFinished'), 1);
});
