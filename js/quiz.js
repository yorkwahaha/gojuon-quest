'use strict';
/* ============================================================
   五十音クエスト — クイズエンジン
   れんしゅう／ききとりチャレンジ／タイムアタック／デイリーの各モードを共通で動かします。
   ============================================================ */

const Quiz = (() => {
  const TIME_ATTACK_SECONDS = 60;
  const DAILY_QUESTION_COUNT = 5;
  const TA_STAR_THRESHOLDS = [600, 1100, 1600]; // 1★/2★/3★
  const LISTENING_HEARTS = 3;                   // ききとりチャレンジのハート数

  const state = {
    mode: 'practice',
    script: 'katakana',
    animeFilter: 'all',
    levelFilter: 0,
    pool: [],          // ランダム出題用の問題ID配列
    dailyQueue: [],    // デイリー用の出題順
    current: null,
    slots: [],         // [{char, fixed, tile}]
    tiles: [],         // [{id, char, used}]
    locked: false,     // 入力ロック中（アニメーション・答え合わせ中）
    sessionCorrect: 0,
    sessionMistakes: 0,
    sessionXP: 0,
    sessionCoins: 0,   // このセッションで獲得したコイン
    golden: false,     // いまの問題がキラキラ問題か
    questionCount: 0,  // このセッションで出題した数
    hearts: LISTENING_HEARTS,   // ききとりチャレンジの残機
    sessionCombo: 0,            // このセッションの連続正解数
    sessionMaxCombo: 0,         // このセッションの最高コンボ
    score: 0,
    timeLeft: TIME_ATTACK_SECONDS,
    timerEndsAt: 0,    // タイムアタック終了予定時刻（Date.now ベース）
    timerId: null,
    lastTickSecond: null,
  };

  const $ = (id) => document.getElementById(id);
  const pendingTimers = new Set();
  let resultView = null;

  function later(fn, ms) {
    const id = setTimeout(() => { pendingTimers.delete(id); fn(); }, ms);
    pendingTimers.add(id);
  }

  function stop() {
    stopTimer();
    pendingTimers.forEach(clearTimeout);
    pendingTimers.clear();
    state.locked = 'done';
    AudioKit.stopVoice();
    FX.stopCutin();
  }

  /* ---------- セットアップUI ---------- */
  function wireSeg(containerId, onChange) {
    const box = $(containerId);
    if (!box) return;
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn || btn.disabled) return;
      AudioKit.play('click');
      box.querySelectorAll('.seg-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
      });
      onChange(btn.dataset.value);
    });
  }

  function setSegValue(containerId, value) {
    const box = $(containerId);
    if (!box) return;
    box.querySelectorAll('.seg-btn').forEach((b) => {
      const active = b.dataset.value === String(value);
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function filterQuestions() {
    return QUESTIONS.filter((q) => {
      if (state.animeFilter !== 'all' && q.anime !== state.animeFilter) return false;
      if (state.levelFilter && q.level !== state.levelFilter) return false;
      return true;
    });
  }

  function refillPool() {
    const ids = filterQuestions().map((q) => q.id);
    state.pool = shuffleArray(ids.length ? ids : QUESTIONS.map((q) => q.id));
  }

  function drawNextQuestion() {
    if (state.mode === 'daily') {
      const id = state.dailyQueue.shift();
      return QUESTIONS.find((q) => q.id === id) || null;
    }
    if (state.pool.length === 0) refillPool();
    let id = state.pool.pop();
    // 直前と同じ問題は避けたい（プールに余裕があるとき）
    if (state.current && state.pool.length > 0 && id === state.current.id) {
      const swap = state.pool.pop();
      state.pool.push(id);
      id = swap;
    }
    return QUESTIONS.find((q) => q.id === id) || null;
  }

  /* ---------- 開始・終了 ---------- */
  function resetSession() {
    stop();
    resultView = null;
    state.current = null;
    state.slots = [];
    state.tiles = [];
    state.locked = false;
    state.sessionCorrect = 0;
    state.sessionMistakes = 0;
    state.sessionXP = 0;
    state.sessionCoins = 0;
    state.golden = false;
    state.questionCount = 0;
    state.score = 0;
    state.hearts = LISTENING_HEARTS;
    state.sessionCombo = 0;
    state.sessionMaxCombo = 0;
    state.timeLeft = TIME_ATTACK_SECONDS;
    state.lastTickSecond = null;
    $('quizHearts').hidden = true;
    $('btnKanaReplay').hidden = true;
    $('slotsWrap').classList.remove('is-shake');
  }

  /* ---------- ハート表示（ききとりチャレンジ） ---------- */
  function renderListeningHearts(popIndex) {
    const wrap = $('quizHearts');
    wrap.innerHTML = '';
    for (let i = 0; i < LISTENING_HEARTS; i++) {
      const filled = i < state.hearts;
      const heart = document.createElement('span');
      heart.className = 'heart' + (filled ? '' : ' is-lost') + (popIndex === i ? ' is-popping' : '');
      heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-heart"/></svg>';
      wrap.appendChild(heart);
    }
  }

  function configureSetupPanel() {
    setSegValue('animeChips', state.animeFilter);
    setSegValue('levelChips', state.levelFilter);
    setSegValue('scriptChips', state.script);
    const isDaily = state.mode === 'daily';
    $('dailyLockNote').hidden = !isDaily;
    ['animeChips', 'levelChips'].forEach((id) => {
      const group = $(id).closest('.setup-group');
      group.classList.toggle('is-locked', isDaily);
      group.querySelectorAll('.seg-btn').forEach((b) => { b.disabled = isDaily; });
    });
    const icon = $('setupTitleUse');
    const title = $('setupTitleText');
    if (state.mode === 'listening') {
      icon.setAttribute('href', '#i-speaker');
      title.textContent = I18N.t('mode.listening.name');
      $('startBtnText').textContent = I18N.t('setup.start');
      $('quizModeLabel').textContent = I18N.t('mode.listening.name');
      return;
    }
    const modeKey = state.mode === 'timeattack' ? 'quiz.timeattack' : state.mode === 'daily' ? 'quiz.daily' : 'quiz.practice';
    if (state.mode === 'timeattack') {
      icon.setAttribute('href', '#i-timer');
      title.textContent = I18N.t('setup.taTitle');
    } else if (state.mode === 'daily') {
      icon.setAttribute('href', '#i-star');
      title.textContent = I18N.t('setup.dailyTitle');
    } else {
      icon.setAttribute('href', '#i-sword');
      title.textContent = I18N.t('setup.title');
    }
    $('startBtnText').textContent =
      state.mode === 'timeattack' ? I18N.t('setup.taStart')
      : state.mode === 'daily' ? I18N.t('setup.dailyStart')
      : I18N.t('setup.start');
    $('quizModeLabel').textContent = I18N.t(modeKey);
  }

  function start(mode) {
    state.mode = mode || 'practice';
    resetSession();
    if (state.mode === 'daily') {
      state.dailyQueue = dailyQuestionIds(todayKey(0)).slice();
    } else {
      // ききとりは前回のフィルター設定に関係なく全問から出題
      if (state.mode === 'listening') { state.animeFilter = 'all'; state.levelFilter = 0; }
      refillPool();
    }

    const isListening = state.mode === 'listening';
    $('setupPanel').hidden = isListening;      // ききとりは設定なしで即スタート
    $('playPanel').hidden = !isListening;
    $('revealPanel').hidden = true;
    $('quizTimerChip').hidden = true;
    $('quizScoreChip').hidden = state.mode !== 'timeattack';
    $('quizHearts').hidden = !isListening;
    $('btnKanaReplay').hidden = !isListening;
    $('quizProgress').textContent = '';
    $('quizScore').textContent = '0';
    $('quizStreak').textContent = String(SaveStore.data.streak);
    $('quizFeedback').textContent = '';
    if (isListening) renderListeningHearts();
    configureSetupPanel();
    App.refreshHeader();
    if (isListening) nextQuestion();
  }

  function beginPlay() {
    if ($('setupPanel').hidden) return;
    $('setupPanel').hidden = true;
    $('playPanel').hidden = false;
    if (state.mode === 'timeattack') {
      $('quizTimerChip').hidden = false;
      updateTimerHUD();
      startTimer();
    }
    nextQuestion();
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    // 残り時間は setInterval の呼び出し回数ではなく、壁時計との差分で計算する
    // （タブがバックグラウンドでスロットリングされても 60 秒が延びないように）
    state.timerEndsAt = Date.now() + TIME_ATTACK_SECONDS * 1000;
    state.timeLeft = TIME_ATTACK_SECONDS;
    updateTimerHUD();
    state.timerId = setInterval(() => {
      state.timeLeft = Math.max(0, (state.timerEndsAt - Date.now()) / 1000);
      updateTimerHUD();
      // 残り10秒は毎秒 tick（whole が変わったときだけ鳴らす）
      const whole = Math.ceil(state.timeLeft);
      if (whole <= 10 && whole >= 1 && whole !== state.lastTickSecond) {
        state.lastTickSecond = whole;
        AudioKit.play('tick');
      }
      if (state.timeLeft <= 0) {
        stopTimer();
        finishTimeAttack();
      }
    }, 100);
  }

  function updateTimerHUD() {
    const chip = $('quizTimerChip');
    $('quizTimer').textContent = String(Math.ceil(state.timeLeft));
    chip.classList.toggle('is-danger', state.timeLeft <= 10);
  }

  function renderQuestionTexts(q) {
    // 進行表示
    $('quizProgress').textContent =
      state.mode === 'daily'
        ? I18N.t('quiz.dailyProgress', { n: state.questionCount })
        : I18N.t('quiz.question', { n: state.questionCount });

    // 出題カード
    const anime = ANIME_INFO[q.anime];
    const animeTag = $('clueTagAnime');
    animeTag.textContent = I18N.tf(anime, 'short');
    animeTag.className = `tag ${anime.cls}`;
    $('clueTagType').textContent = typeLabel(q.type);
    $('clueTagLevel').textContent = `Lv.${q.level}`;
    $('clueDesc').textContent = questionDesc(q);
    $('clueRomaji').textContent = I18N.t('play.romajiHint', { en: q.en });
    $('btnHintText').textContent = $('clueRomaji').hidden ? I18N.t('play.hintOpen') : I18N.t('play.hintClose');
    // 直前のエラー表示があれば文言だけ差し替え
    if ($('quizFeedback').classList.contains('is-error')) {
      $('quizFeedback').textContent = I18N.t('play.wrong');
    }
  }

  // ロケール切替時に、出題中の画面テキストもすべて差し替える
  function refreshLocale() {
    configureSetupPanel();
    if (state.current) renderQuestionTexts(state.current);
    if (state.current && !$('revealPanel').hidden) {
      $('revealDesc').textContent = questionDesc(state.current);
    }
    if (state.slots.length) renderSlots();
    if (state.tiles.length) renderTiles();
    const dailyDone = state.mode === 'daily' && state.questionCount >= DAILY_QUESTION_COUNT;
    $('btnNextText').textContent = dailyDone ? I18N.t('reveal.toResult') : I18N.t('reveal.next');
    if (resultView && !$('resultModal').hidden) renderResult();
  }

  function nextQuestion() {
    if (state.locked === 'done' || (state.mode === 'daily' && state.questionCount >= DAILY_QUESTION_COUNT)) return;
    FX.stopCutin();
    const q = drawNextQuestion();
    if (!q) { endSession(); return; }
    state.current = q;
    if (q.type === 'waza') FX.prepareAttack(q.id);
    state.questionCount += 1;
    state.locked = false;

    // キラキラ問題（12%）：コイン2倍・XP1.5倍
    state.golden = Math.random() < GOLDEN_RATE;
    $('goldenTag').hidden = !state.golden;
    $('clueCard').classList.toggle('is-golden', state.golden);

    // 題目テキストの描画（初回とロケール切替で共用）
    renderQuestionTexts(q);
    // 初回描画ではヒントを閉じる
    $('clueRomaji').hidden = true;
    $('btnHint').setAttribute('aria-expanded', 'false');
    $('btnHintText').textContent = I18N.t('play.hintOpen');

    // タイル生成（「・」は固定）
    const chars = Array.from(q.kana);
    const movable = chars.filter((c) => !FIXED_CHARS.has(c));
    let shuffled = shuffleArray(movable);
    // 元の並びと同じ順番になったら混ぜ直す（2文字以上の場合）
    let guard = 0;
    while (movable.length > 1 && shuffled.join('') === movable.join('') && guard < 20) {
      shuffled = shuffleArray(movable);
      guard += 1;
    }
    state.tiles = shuffled.map((ch, i) => ({ id: `t${i}`, char: ch, used: false }));
    state.slots = chars.map((ch) =>
      FIXED_CHARS.has(ch) ? { char: ch, fixed: true, tile: null } : { char: ch, fixed: false, tile: null }
    );

    $('revealPanel').hidden = true;
    $('clueCard').classList.remove('is-answered');
    $('quizFeedback').textContent = '';
    $('quizFeedback').className = 'quiz-feedback';
    renderSlots();
    renderTiles();

    // ききとりチャレンジは出題と同時に読み上げる（「なまえを きく」で何度でも聞ける）
    if (state.mode === 'listening') speakKana(q);
  }

  /* ---------- 描画 ---------- */
  function renderSlots() {
    const wrap = $('slotsWrap');
    wrap.innerHTML = '';
    state.slots.forEach((slot, idx) => {
      const el = document.createElement(slot.fixed ? 'div' : 'button');
      el.className = 'slot' + (slot.fixed ? ' is-fixed' : '') + (slot.tile ? ' is-filled' : '');
      if (slot.fixed) {
        el.textContent = slot.char;
        el.setAttribute('aria-label', I18N.t('play.fixed'));
      } else {
        el.type = 'button';
        el.textContent = slot.tile ? inScript(slot.tile.char, state.script) : '';
        el.setAttribute('aria-label', slot.tile ? I18N.t('play.slotFilled', { kana: inScript(slot.tile.char, state.script) }) : I18N.t('play.slotAria'));
        el.addEventListener('click', () => unplaceSlot(idx));
      }
      wrap.appendChild(el);
    });
  }

  function renderTiles() {
    const pool = $('tilePool');
    pool.innerHTML = '';
    state.tiles.forEach((tile) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile' + (tile.used ? ' is-used' : '') + (state.golden ? ' is-golden' : '');
      btn.textContent = inScript(tile.char, state.script);
      btn.disabled = tile.used;
      btn.setAttribute('aria-label', I18N.t('play.tileAria', { kana: inScript(tile.char, state.script) }));
      btn.addEventListener('click', () => placeTile(tile));
      pool.appendChild(btn);
    });
  }

  /* ---------- 入力処理 ---------- */
  function placeTile(tile) {
    if (state.locked || tile.used) return;
    const idx = state.slots.findIndex((s) => !s.fixed && !s.tile);
    if (idx === -1) return;
    state.slots[idx].tile = tile;
    tile.used = true;
    AudioKit.play('place');
    renderSlots();
    renderTiles();
    if (state.slots.every((s) => s.fixed || s.tile)) {
      state.locked = true;
      const judgeTarget = state.current;
      later(() => {
        // 題目が切り替わっていたら何もしない（もどる／タイムアップ等との競合防止）
        if (state.current !== judgeTarget || state.locked !== true) return;
        judge();
      }, 240);
    }
  }

  function unplaceSlot(idx) {
    if (state.locked) return;
    const slot = state.slots[idx];
    if (!slot || slot.fixed || !slot.tile) return;
    slot.tile.used = false;
    slot.tile = null;
    AudioKit.play('click');
    renderSlots();
    renderTiles();
  }

  function judge() {
    const joined = state.slots.map((s) => (s.tile ? s.tile.char : s.char)).join('');
    if (joined === state.current.kana) onCorrect();
    else onWrong();
  }

  function onCorrect() {
    const q = state.current;
    state.sessionCorrect += 1;
    state.sessionCombo += 1;
    if (state.sessionCombo > state.sessionMaxCombo) state.sessionMaxCombo = state.sessionCombo;
    const res = SaveStore.recordCorrect(q.level, q.anime, { golden: state.golden });
    state.sessionXP += res.gained;
    state.sessionCoins += res.coinsGained;
    if (state.mode === 'timeattack') {
      state.score += LEVEL_INFO[q.level].timeScore;
      $('quizScore').textContent = String(state.score);
    }
    $('quizStreak').textContent = String(SaveStore.data.streak);
    // わざ（招式）題はカットイン演出が主役なので、コンボ文字や紙吹雪は重ねない
    const isWazaCutin = q.type === 'waza';
    const compactCutin = state.mode === 'timeattack';
    if (!isWazaCutin) FX.comboSplash(SaveStore.data.streak);
    App.refreshHeader();

    AudioKit.play('correct');
    if (state.golden) AudioKit.play('coin');
    if (!isWazaCutin) {
      speakKana(q);
      FX.confetti(state.golden ? 44 : 28);
      if (state.golden) FX.coinRain(12);
    }

    // 解答スロットを正解色に
    document.querySelectorAll('#slotsWrap .slot').forEach((el) => el.classList.add('is-correct'));
    $('clueCard').classList.add('is-answered');

    // 答え合わせパネル
    const shown = inScript(q.kana, state.script);
    $('revealKana').textContent = shown;
    const labelEl = $('revealLabel');
    labelEl.textContent = q.label;          // 毎回上書き（前問の残り文字が残らないように）
    labelEl.hidden = q.label === shown;
    $('revealEn').textContent = q.en;
    $('revealDesc').textContent = questionDesc(q);
    const revealPanel = $('revealPanel');
    revealPanel.classList.toggle('is-golden', state.golden);
    $('revealXp').innerHTML =
      `+${res.gained} XP<span class="reveal-coins"><svg class="coin-icon"><use href="#i-coin"/></svg>+${res.coinsGained}</span>` +
      (res.golden ? `<span class="reveal-golden-tag">${I18N.t('reveal.goldBonus')}</span>` : '') +
      (SaveStore.data.streak >= 3 ? `<span class="reveal-streak"><svg><use href="#i-flame"/></svg> ${I18N.t('reveal.comboStreak', { n: SaveStore.data.streak })}</span>` : '');

    const isLastDaily = state.mode === 'daily' && state.questionCount >= DAILY_QUESTION_COUNT;
    $('btnNextText').textContent = isLastDaily ? I18N.t('reveal.toResult') : I18N.t('reveal.next');

    if (isWazaCutin) {
      // カットインが終わってから答え合わせパネルを表示
      $('revealPanel').hidden = !compactCutin;
      FX.wazaCutin({
        name: shown,
        label: q.label,
        en: q.en,
        questionId: q.id,
        compact: compactCutin,
        onDone: () => {
          if (state.current !== q || state.locked !== true) return;
          $('revealPanel').hidden = false;
          FX.confetti(state.golden ? 40 : 22);
          if (state.golden) FX.coinRain(12);
          if (!compactCutin) celebrateRewards();
        },
      });
    } else {
      $('revealPanel').hidden = false;
    }
    $('quizFeedback').textContent = '';

    // 新規カード解放のお知らせ
    function celebrateRewards() {
      res.newlyUnlocked.forEach((card) => {
        later(() => {
          AudioKit.play('unlock');
          FX.confetti(36);
          App.toast(I18N.t('toast.cardGet', { name: I18N.tf(card, 'name') }));
        }, 650);
      });
      if (res.rankUp) later(() => App.showLevelUp(res.rankUp), 800);
    }
    if (!isWazaCutin || compactCutin) celebrateRewards();

    // タイムアタックはテンポ重視で自動的に次へ
    if (state.mode === 'timeattack') {
      later(() => {
        if (state.current === q && state.timeLeft > 0) advanceFromReveal();
      }, 1100);
    }
  }

  function listeningResultRows() {
    return [
      [I18N.t('listening.correctCount'), I18N.t('result.correctCount', { n: state.sessionCorrect })],
      [I18N.t('listening.bestCombo'), `x${state.sessionMaxCombo}`],
      [I18N.t('result.miss'), I18N.t('result.missCount', { n: state.sessionMistakes })],
      [I18N.t('result.xp'), `+${state.sessionXP}`],
      [I18N.t('result.coins'), `+${state.sessionCoins}`],
    ];
  }

  // ききとりチャレンジ：ハートが尽きたらゲームオーバー
  function showListeningGameOver() {
    stop();
    showResult(() => ({
      title: I18N.t('listening.gameOver'),
      sub: I18N.t('listening.overSub'),
      stars: 0,
      stamp: false,
      retryLabel: 'result.retry',
      rows: listeningResultRows(),
    }));
    App.refreshHeader();
  }

  function onWrong() {
    state.sessionMistakes += 1;
    state.sessionCombo = 0;
    SaveStore.recordWrong();
    AudioKit.play('wrong');
    $('quizStreak').textContent = '0';
    if (state.mode === 'listening') {
      state.hearts -= 1;
      renderListeningHearts(state.hearts);   // 失ったハートをポップさせる
    }

    const wrap = $('slotsWrap');
    wrap.classList.add('is-shake');
    $('quizFeedback').textContent = I18N.t('play.wrong');
    $('quizFeedback').className = 'quiz-feedback is-error';

    later(() => {
      wrap.classList.remove('is-shake');
      // 愛心用完：タイルは返さずゲームオーバー結算
      if (state.mode === 'listening' && state.hearts <= 0) {
        $('quizFeedback').textContent = '';
        showListeningGameOver();
        return;
      }
      // タイルをすべてプールへ返す
      state.slots.forEach((s) => { if (!s.fixed && s.tile) { s.tile.used = false; s.tile = null; } });
      state.locked = false;
      $('quizFeedback').textContent = '';
      $('quizFeedback').className = 'quiz-feedback';
      renderSlots();
      renderTiles();
    }, 780);
  }

  function advanceFromReveal() {
    if (state.locked !== true || $('revealPanel').hidden) return;
    if (state.mode === 'daily' && state.questionCount >= DAILY_QUESTION_COUNT) {
      finishDaily();
      return;
    }
    if (state.mode === 'timeattack' && state.timeLeft <= 0) {
      finishTimeAttack();
      return;
    }
    nextQuestion();
  }

  function speakKana(q) {
    AudioKit.speak(q.kana);
  }

  /* ---------- 終了処理 ---------- */
  function perfectBonusIfAny() {
    if (state.sessionMistakes === 0 && state.sessionCorrect > 0) {
      SaveStore.addCoins(PERFECT_BONUS_COINS);
      state.sessionCoins += PERFECT_BONUS_COINS;
      return PERFECT_BONUS_COINS;
    }
    return 0;
  }

  function endSession() {
    stop();
    App.go('home');
  }

  function showResult(buildView) {
    resultView = buildView;
    const view = buildView();
    renderResult(view);
    AudioKit.play(view.stamp ? 'fanfare' : 'star');
  }

  function renderResult(view = resultView()) {
    const { title, sub, stars, rows, stamp, retryLabel } = view;
    $('resultTitle').textContent = title;
    $('resultSub').textContent = sub || '';
    $('resultStamp').hidden = !stamp;

    const starEls = document.querySelectorAll('#resultStars .result-star');
    starEls.forEach((el, i) => {
      el.classList.toggle('is-earned', i < stars);
      el.style.animationDelay = `${0.25 + i * 0.22}s`;
    });
    $('resultStars').style.visibility = stars > 0 ? 'visible' : 'hidden';

    const dl = $('resultStats');
    dl.textContent = '';
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'result-stat-row';
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      row.appendChild(term);
      row.appendChild(description);
      dl.appendChild(row);
    });
    $('btnResultRetryText').textContent = I18N.t(retryLabel);
    App.openModal('resultModal');
  }

  function finishTimeAttack() {
    if (state.locked === 'done') return;
    stop();
    const score = state.score;
    const isRecord = SaveStore.recordTimeAttack(score);
    const earnedStars = TA_STAR_THRESHOLDS.reduce((n, th) => n + (score >= th ? 1 : 0), 0);
    if (earnedStars > 0) SaveStore.addStars(earnedStars);
    const perfect = perfectBonusIfAny();
    showResult(() => ({
      title: I18N.t('result.taUp'),
      sub: isRecord ? I18N.t('result.taNewRecord') : I18N.t('result.taBest', { score: SaveStore.data.timeAttackBest }),
      stars: earnedStars,
      stamp: false,
      retryLabel: 'result.retry',
      rows: [
        [I18N.t('result.score'), `${score} pt`],
        [I18N.t('result.correct'), I18N.t('result.correctCount', { n: state.sessionCorrect })],
        [I18N.t('result.miss'), I18N.t('result.missCount', { n: state.sessionMistakes })],
        [I18N.t('result.xp'), `+${state.sessionXP}`],
        [I18N.t('result.coins'), `+${state.sessionCoins}${perfect ? I18N.t('result.perfect') : ''}`],
      ],
    }));
    App.refreshHeader();
  }

  function finishDaily() {
    if (state.locked === 'done') return;
    stop();
    const m = state.sessionMistakes;
    const grade = m === 0 ? 3 : m <= 2 ? 2 : 1;
    const clearResult = SaveStore.recordDailyClear(grade);
    const earnedStars = clearResult.already ? 0 : grade;
    const bonus = clearResult.already ? 0 : 50;
    const xpReward = bonus > 0 ? SaveStore.addXP(bonus) : null;
    if (xpReward) state.sessionCoins += xpReward.bonusCoins;
    const perfect = clearResult.already ? 0 : perfectBonusIfAny();
    FX.confetti(40);
    showResult(() => ({
      title: clearResult.already ? I18N.t('result.dailyReview') : I18N.t('result.dailyClear'),
      sub: clearResult.already
        ? I18N.t('result.dailyReviewSub')
        : I18N.t('result.dailyBonus', { n: clearResult.streak }),
      stars: earnedStars,
      stamp: true,
      retryLabel: 'result.retry',
      rows: [
        [I18N.t('result.correct'), I18N.t('result.correctOf', { n: state.sessionCorrect })],
        [I18N.t('result.miss'), I18N.t('result.missCount', { n: m })],
        [I18N.t('result.xp'), `+${state.sessionXP + bonus}`],
        [I18N.t('result.coins'), `+${state.sessionCoins}${perfect ? I18N.t('result.perfect') : ''}`],
        [I18N.t('result.dailyStreak'), I18N.t('result.dailyStreakDays', { n: clearResult.streak })],
      ],
    }));
    App.refreshHeader();
    if (xpReward && xpReward.rankUp) App.showLevelUp(xpReward.rankUp);
  }

  function quitSession() {
    const finished = state.locked === 'done';
    stop();
    if (finished || (state.sessionCorrect === 0 && state.sessionMistakes === 0)) {
      App.go('home');
      return;
    }
    const isListening = state.mode === 'listening';
    showResult(() => ({
      title: I18N.t('result.quit'),
      sub: state.mode === 'timeattack'
        ? I18N.t('result.quitTa')
        : isListening
          ? I18N.t('listening.quitSub')
          : I18N.t('result.quitPractice'),
      stars: 0,
      stamp: false,
      retryLabel: 'result.retryQuit',
      rows: isListening
        ? listeningResultRows()
        : [
            [I18N.t('result.correct'), I18N.t('result.correctCount', { n: state.sessionCorrect })],
            [I18N.t('result.miss'), I18N.t('result.missCount', { n: state.sessionMistakes })],
            [I18N.t('result.xp'), `+${state.sessionXP}`],
            [I18N.t('result.coins'), `+${state.sessionCoins}`],
          ],
    }));
  }

  /* ---------- 初期化 ---------- */
  function init() {
    wireSeg('animeChips', (v) => { state.animeFilter = v; refillPool(); });
    wireSeg('levelChips', (v) => { state.levelFilter = Number(v); refillPool(); });
    wireSeg('scriptChips', (v) => { state.script = v; });

    $('btnStartQuiz').addEventListener('click', () => { AudioKit.play('click'); beginPlay(); });
    $('quizBack').addEventListener('click', () => { AudioKit.play('click'); quitSession(); });

    $('btnHint').addEventListener('click', () => {
      const romaji = $('clueRomaji');
      const expanded = romaji.hidden;
      romaji.hidden = !expanded;
      $('btnHint').setAttribute('aria-expanded', String(expanded));
      $('btnHintText').textContent = expanded ? I18N.t('play.hintClose') : I18N.t('play.hintOpen');
      AudioKit.play('click');
    });

    $('btnSpeak').addEventListener('click', () => {
      AudioKit.play('click');
      if (state.current) AudioKit.speak(state.current.kana);
    });
    // ききとりチャレンジ：読み上げをいつでも聞き直せる
    $('btnKanaReplay').addEventListener('click', () => {
      AudioKit.play('click');
      if (state.current) AudioKit.speak(state.current.kana);
    });
    $('btnNext').addEventListener('click', () => { AudioKit.play('click'); advanceFromReveal(); });
  }

  return { init, start, stop, state, refreshLocale };
})();
