'use strict';
/* ============================================================
   五十音クエスト — 画面遷移・ホーム描画・設定・トースト
   ============================================================ */

const App = (() => {
  const $ = (id) => document.getElementById(id);
  let currentScreen = 'screen-home';
  const modalStack = [];
  const modalReturnFocus = new Map();

  function focusScreen() {
    const target = $(currentScreen).querySelector('button');
    if (target) target.focus();
  }

  function modalTargets(modal) {
    return Array.from(modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
      .filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0);
  }

  function openModal(id) {
    const modal = $(id);
    if (!modal.hidden) return;
    modalReturnFocus.set(id, document.activeElement);
    modal.hidden = false;
    modalStack.push(id);
    modal.tabIndex = -1;
    (modalTargets(modal)[0] || modal).focus();
  }

  function closeModal(id) {
    const modal = $(id);
    if (modal.hidden) return;
    const wasTop = modalStack[modalStack.length - 1] === id;
    modal.hidden = true;
    const index = modalStack.indexOf(id);
    if (index !== -1) modalStack.splice(index, 1);
    const previous = modalReturnFocus.get(id);
    modalReturnFocus.delete(id);
    if (!wasTop) return;
    if (previous && previous.isConnected && !previous.disabled && previous.getClientRects().length > 0) {
      previous.focus();
    } else if (modalStack.length) {
      const top = $(modalStack[modalStack.length - 1]);
      (modalTargets(top)[0] || top).focus();
    } else {
      focusScreen();
    }
  }

  /* ---------- 画面遷移 ---------- */
  function showScreen(screenId) {
    if (currentScreen === 'screen-quiz' && screenId !== 'screen-quiz') Quiz.stop();
    document.querySelectorAll('.screen').forEach((el) => {
      el.classList.toggle('active', el.id === screenId);
    });
    currentScreen = screenId;
    window.scrollTo(0, 0);
    if (screenId === 'screen-collection') Collection.refresh();
    if (screenId === 'screen-home') renderHome();
    if (!modalStack.length) focusScreen();
  }

  function go(target) {
    AudioKit.play('click');
    switch (target) {
      case 'home':
        showScreen('screen-home');
        break;
      case 'chart':
        showScreen('screen-chart');
        break;
      case 'collection':
        showScreen('screen-collection');
        break;
      case 'missions':
        showScreen('screen-missions');
        Missions.render();
        break;
      case 'listening':
      case 'practice':
      case 'timeattack':
      case 'daily':
        Quiz.start(target);
        showScreen('screen-quiz');
        break;
      default:
        showScreen('screen-home');
    }
  }

  /* ---------- ヘッダー ---------- */
  function refreshHeader() {
    const d = SaveStore.data;
    const rank = rankForXP(d.xp);
    $('hdrRankName').textContent = I18N.tf(rank.current, 'name');
    $('hdrXpFill').style.width = `${Math.round(rank.progress * 100)}%`;
    $('hdrCoins').textContent = String(d.coins);
    $('hdrStars').textContent = String(d.stars);
    $('hdrCorrect').textContent = String(d.correct);
    const missionsCoins = $('missionsCoins');
    if (missionsCoins) missionsCoins.textContent = String(d.coins);
    Missions.refreshBadge();
  }

  /* ---------- ホーム描画 ---------- */
  function renderHome() {
    const d = SaveStore.data;
    const rank = rankForXP(d.xp);
    const feature = $('heroFeat1');
    if (feature) feature.textContent = I18N.t('hero.feat1', { count: QUESTIONS.length });

    $('homePlayerName').textContent = d.playerName;
    $('homeRankName').textContent = I18N.tf(rank.current, 'name');
    $('homeXpFill').style.width = `${Math.round(rank.progress * 100)}%`;
    $('homeXpText').textContent = rank.next
      ? I18N.t('profile.nextRank', { xp: rank.next.xp - d.xp, name: I18N.tf(rank.next, 'name') })
      : I18N.t('profile.maxRank');

    $('homeCorrect').textContent = String(d.correct);
    $('homeBestStreak').textContent = String(d.bestStreak);
    $('homeStars').textContent = String(d.stars);
    $('homeCards').textContent = `${d.unlocked.length}/${CARDS.length}`;

    $('taBestChip').textContent = String(d.timeAttackBest);
    $('collectionChip').textContent = String(d.unlocked.length);

    // デイリーバナーの状態
    const cleared = d.lastDaily === todayKey(0);
    const banner = $('dailyBanner');
    banner.classList.toggle('is-cleared', cleared);
    $('dailyTitle').textContent = cleared ? I18N.t('daily.clearedTitle') : I18N.t('daily.title');
    $('dailyDesc').textContent = cleared ? I18N.t('daily.clearedDesc') : I18N.t('daily.desc');
    $('dailyCta').innerHTML =
      `${cleared ? I18N.t('daily.clearedCta') : I18N.t('daily.cta')}<svg><use href="#i-arrow-right"/></svg>`;
    $('dailyStreakText').innerHTML =
      `<svg><use href="#i-flame"/></svg>${I18N.t('daily.streak', { n: d.dailyStreak })}`;
  }

  /* ---------- トースト ---------- */
  let toastTimer = null;
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  /* ---------- ランクアップ祝典 ---------- */
  function showLevelUp(rankUp) {
    const rank = RANKS[rankUp && rankUp.index] || RANKS[0];
    $('levelupRank').textContent = I18N.tf(rank, 'name');
    openModal('levelupModal');
    AudioKit.play('levelup');
    FX.confetti(50);
    FX.coinRain(16);
  }

  /* ---------- モーダル共通 ---------- */
  function closeModals() {
    const hadResult = !$('resultModal').hidden;
    Gacha.close();
    modalStack.slice().reverse().forEach(closeModal);
    if (hadResult) go('home');
  }

  /* ---------- 初期化 ---------- */
  function applyLocale() {
    Quiz.refreshLocale();
    renderHome();
    Missions.refreshBadge();
    Missions.render();
    Collection.refresh();
    Chart.refresh();
    refreshHeader();
  }

  function init() {
    SaveStore.load();
    // ロケール初期化（保存値優先、なければブラウザ言語）
    I18N.init();
    I18N.onLocaleChange(applyLocale);

    // [data-nav] を持つすべてのボタンを画面遷移に接続
    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => go(el.dataset.nav));
    });
    $('logoHome').addEventListener('click', () => go('home'));
    $('btnMissions').addEventListener('click', () => go('missions'));
    $('missionsBack').addEventListener('click', () => { AudioKit.play('click'); go('home'); });

    // 言語トグル（ヘッダー）
    $('btnLangToggle').addEventListener('click', () => {
      AudioKit.play('click');
      I18N.setLocale(I18N.get() === 'zh' ? 'ja' : 'zh');
    });
    // 言語スイッチ（設定モーダル）
    document.querySelectorAll('.lang-switch-btn').forEach((b) => {
      b.addEventListener('click', () => { AudioKit.play('click'); I18N.setLocale(b.dataset.locale); });
    });

    // 名前編集
    const nameForm = $('nameEditForm');
    $('btnEditName').addEventListener('click', () => {
      AudioKit.play('click');
      $('nameInput').value = SaveStore.data.playerName;
      nameForm.hidden = !nameForm.hidden;
      if (!nameForm.hidden) $('nameInput').focus();
    });
    nameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = $('nameInput').value.trim();
      SaveStore.data.playerName = value || 'クエスター';
      SaveStore.save();
      nameForm.hidden = true;
      AudioKit.play('correct');
      renderHome();
    });

    // 設定モーダル
    const settingsModal = $('settingsModal');
    $('btnSettings').addEventListener('click', () => {
      AudioKit.play('click');
      $('toggleSound').checked = SaveStore.data.sound;
      $('toggleVoice').checked = SaveStore.data.voice;
      openModal('settingsModal');
    });
    settingsModal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-settings]')) closeModal('settingsModal');
    });
    $('toggleSound').addEventListener('change', (e) => {
      SaveStore.data.sound = e.target.checked;
      SaveStore.save();
      if (e.target.checked) AudioKit.play('correct');
    });
    $('toggleVoice').addEventListener('change', (e) => {
      SaveStore.data.voice = e.target.checked;
      SaveStore.save();
      if (e.target.checked) AudioKit.speak('こんにちは');
      else AudioKit.stopVoice();
    });

    // セーブリセット（二段階確認）
    const resetBtn = $('btnResetSave');
    let armed = false;
    let armTimer = null;
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        resetBtn.textContent = I18N.t('settings.resetArmed');
        resetBtn.classList.add('is-armed');
        armTimer = setTimeout(() => {
          armed = false;
          resetBtn.textContent = I18N.t('settings.reset');
          resetBtn.classList.remove('is-armed');
        }, 3000);
        return;
      }
      clearTimeout(armTimer);
      SaveStore.reset();
      location.reload();
    });

    // 結果モーダル
    const resultModal = $('resultModal');
    resultModal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-result]')) { closeModal('resultModal'); go('home'); }
    });
    $('btnResultHome').addEventListener('click', () => {
      closeModal('resultModal');
      go('home');
    });
    $('btnResultRetry').addEventListener('click', () => {
      closeModal('resultModal');
      Quiz.start(Quiz.state.mode);
      showScreen('screen-quiz');
    });

    // Esc でモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
      const cutin = $('wazaCutin');
      if (e.key === 'Tab' && !cutin.hidden && !cutin.classList.contains('is-compact')) {
        e.preventDefault();
        $('wazaCutinSkip').focus();
        return;
      }
      if (e.key !== 'Tab' || !modalStack.length) return;
      const modal = $(modalStack[modalStack.length - 1]);
      const targets = modalTargets(modal);
      const first = targets[0] || modal;
      const last = targets[targets.length - 1] || modal;
      const outside = !modal.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    });

    // ランクアップ祝典モーダル
    const levelupModal = $('levelupModal');
    levelupModal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-levelup]')) closeModal('levelupModal');
    });
    $('btnLevelupOk').addEventListener('click', () => {
      AudioKit.play('click');
      closeModal('levelupModal');
    });

    // 各モジュール初期化
    Chart.init();
    Collection.init();
    Missions.init();
    Gacha.init();
    Quiz.init();

    refreshHeader();
    renderHome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { go, refreshHeader, toast, renderHome, showLevelUp, openModal, closeModal };
})();
