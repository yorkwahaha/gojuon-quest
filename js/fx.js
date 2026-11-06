'use strict';
/* ============================================================
   五十音クエスト — 画面演出（紙吹雪・コイン雨・大字スプラッシュ）
   ============================================================ */

const FX = (() => {
  const $ = (id) => document.getElementById(id);

  /* ---------- 紙吹雪 ---------- */
  function confetti(count) {
    const layer = $('confettiLayer');
    if (!layer) return;
    const n = count || 28;
    const colors = ['#ffd23f', '#ff4d5e', '#38e1ff', '#8b5cf6', '#3ddc97', '#ff9f1c'];
    for (let i = 0; i < n; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.35}s`;
      piece.style.animationDuration = `${0.9 + Math.random() * 0.7}s`;
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${10 + Math.random() * 10}px`;
      piece.addEventListener('animationend', () => piece.remove(), { once: true });
      layer.appendChild(piece);
    }
  }

  /* ---------- コイン雨（獲得コイン演出） ---------- */
  function coinRain(count) {
    const layer = $('confettiLayer');
    if (!layer) return;
    const n = Math.max(6, Math.min(count || 14, 26));
    for (let i = 0; i < n; i++) {
      const coin = document.createElement('span');
      coin.className = 'coin-piece';
      coin.style.left = `${8 + Math.random() * 84}%`;
      coin.style.animationDelay = `${Math.random() * 0.5}s`;
      coin.style.animationDuration = `${1 + Math.random() * 0.8}s`;
      coin.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ffd23f" stroke="#a16207" stroke-width="1.6"/><path d="M12 7.4l1.35 2.75 3 .42-2.2 2.1.52 2.97L12 16.3l-2.67 1.44.52-2.97-2.2-2.1 3-.42z" fill="#a16207"/></svg>';
      coin.addEventListener('animationend', () => coin.remove(), { once: true });
      layer.appendChild(coin);
    }
  }

  /* ---------- 大字スプラッシュ（コンボ達成など） ---------- */
  let splashTimer = null;
  function splash(text, sub) {
    const el = $('fxSplash');
    if (!el) return;
    $('fxSplashText').textContent = text;
    $('fxSplashSub').textContent = sub || '';
    el.hidden = false;
    // アニメーションを再生し直す
    el.classList.remove('is-show');
    void el.offsetWidth;
    el.classList.add('is-show');
    if (splashTimer) clearTimeout(splashTimer);
    splashTimer = setTimeout(() => { el.hidden = true; el.classList.remove('is-show'); }, 1600);
  }

  const COMBO_PRAISE = {
    ja: { 5: 'すごい！！', 10: 'てんさいだ！！', 15: 'かみさまレベル！', 20: 'でんせつ！！' },
    zh: { 5: '太棒了！！', 10: '天才！！',     15: '神之領域！',   20: '傳說！！' },
  };

  // れんさ数に応じた演出（閾値を超えたときだけ発火）
  function comboSplash(streak) {
    const lang = I18N.get() === 'zh' ? 'zh' : 'ja';
    const praise = COMBO_PRAISE[lang];
    let key = null;
    if (streak === 5) key = 5;
    else if (streak === 10) key = 10;
    else if (streak === 15) key = 15;
    else if (streak === 20 || streak % 10 === 0) key = 20;
    if (!key) return false;
    splash(
      lang === 'zh' ? `${streak}連勝!!` : `${streak}れんさ!!`,
      praise[key] || praise[20]
    );
    confetti(34);
    AudioKit.play('levelup');
    return true;
  }

  /* ---------- わざ発動カットイン（招式題答對時的全画面演出） ---------- */
  let cutinTimer = null;
  let cancelCutin = null;
  function stopCutin() {
    if (cancelCutin) cancelCutin();
  }
  const ATTACK_SCENES = {
    q37: 'black-flash',
    q51: 'domain', q54: 'domain', q55: 'domain', q56: 'domain',
    q57: 'purple-blast',
  };

  function prepareAttack(questionId) {
    $('wazaAttackImage').src = `assets/comic/${ATTACK_SCENES[questionId] || 'stand-rush'}.webp`;
  }

  function wazaCutin({ name, label, en, questionId, compact = false, onDone }) {
    stopCutin();
    const el = $('wazaCutin');
    if (!el) { if (onDone) onDone(); return; }
    $('wazaCutinName').textContent = name;
    const labelEl = $('wazaCutinLabel');
    labelEl.textContent = label || '';
    labelEl.hidden = !label || label === name;
    $('wazaCutinEn').textContent = en ? String(en).toUpperCase() : '';
    const image = $('wazaAttackImage');
    const skip = $('wazaCutinSkip');
    const previousFocus = document.activeElement;
    el.hidden = false;
    image.hidden = true;
    el.classList.toggle('is-compact', compact);
    el.classList.add('is-loading');
    el.classList.remove('is-show');
    if (!compact) skip.focus();
    const cleanup = () => {
      if (cutinTimer) { clearTimeout(cutinTimer); cutinTimer = null; }
      image.onload = null;
      image.onerror = null;
      el.removeEventListener('click', finish);
      skip.removeEventListener('keydown', onKey);
      el.classList.remove('is-show');
      el.hidden = true;
      cancelCutin = null;
      if (document.activeElement === skip && previousFocus && previousFocus.isConnected) previousFocus.focus();
    };
    const finish = () => {
      cleanup();
      if (onDone) onDone();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
    };
    const show = () => {
      if (cancelCutin !== cleanup) return;
      image.onload = null;
      image.onerror = null;
      clearTimeout(cutinTimer);
      image.hidden = false;
      el.classList.remove('is-loading');
      void el.offsetWidth;
      el.classList.add('is-show');
      AudioKit.play('cutin');
      AudioKit.shout(name);
      cutinTimer = compact ? setTimeout(finish, 850) : null;
    };
    cancelCutin = cleanup;
    el.addEventListener('click', finish);
    skip.addEventListener('keydown', onKey);
    image.onload = show;
    image.onerror = finish;
    cutinTimer = setTimeout(finish, 3000);
    prepareAttack(questionId);
    if (image.complete && image.naturalWidth > 0) show();
  }

  return { confetti, coinRain, comboSplash, prepareAttack, wazaCutin, stopCutin };
})();
