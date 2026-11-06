'use strict';
/* ============================================================
   五十音クエスト — おたからボックス（ガチャ）
   120コインで1回。未入手のカードがランダムで1枚出ます。
   ============================================================ */

const Gacha = (() => {
  const $ = (id) => document.getElementById(id);
  const PULL_TIMERS = [];
  let cracking = false;

  function clearTimers() {
    while (PULL_TIMERS.length) clearTimeout(PULL_TIMERS.pop());
    cracking = false;
  }
  function later(fn, ms) { PULL_TIMERS.push(setTimeout(fn, ms)); }

  function refreshBalance() {
    const coins = SaveStore.data.coins;
    $('gachaCoins').textContent = String(coins);
    const canPull = coins >= GACHA_COST;
    $('btnGachaPull').classList.toggle('is-disabled', !canPull);
    $('btnGachaPull').setAttribute('aria-disabled', String(!canPull));
    $('gachaPullNote').textContent = canPull
      ? I18N.t('gacha.sub')
      : I18N.t('gacha.noCoins', { n: GACHA_COST - coins });
  }

  function resetStage() {
    clearTimers();
    $('gachaStage').hidden = false;
    $('gachaReward').hidden = true;
    $('gachaAgainRow').hidden = true;
    $('btnGachaPull').hidden = false;
    $('gachaBox').className = 'gacha-box';
    refreshBalance();
  }

  function open() {
    AudioKit.play('click');
    resetStage();
    App.openModal('gachaModal');
  }

  function close() {
    clearTimers();
    App.closeModal('gachaModal');
  }

  function pull() {
    if (cracking) return;
    const coins = SaveStore.data.coins;
    if (coins < GACHA_COST) {
      AudioKit.play('wrong');
      App.toast(I18N.t('gacha.notEnoughToast', { n: GACHA_COST - coins }));
      // ボックスをゆさぶってアピール
      const box = $('gachaBox');
      box.classList.remove('is-shake');
      void box.offsetWidth;
      box.classList.add('is-shake');
      refreshBalance();
      return;
    }
    cracking = true;
    $('btnGachaPull').hidden = true;
    const box = $('gachaBox');

    // 3段階のひび割れ演出
    AudioKit.play('crack');
    box.classList.add('stage-1');
    later(() => {
      AudioKit.play('crack');
      box.classList.remove('stage-1');
      box.classList.add('stage-2');
    }, 380);
    later(() => {
      AudioKit.play('crack');
      box.classList.remove('stage-2');
      box.classList.add('stage-3');
    }, 760);
    later(reveal, 1150);
  }

  function reveal() {
    // 報酬を確定させてから表示（閉じても損しないよう、この時点で確定）
    const result = SaveStore.drawGacha();
    cracking = false;

    $('gachaStage').hidden = true;
    $('gachaReward').hidden = false;
    $('gachaAgainRow').hidden = false;

    const isCard = result.type === 'card';
    if (isCard) {
      const card = result.card;
      const name = I18N.tf(card, 'name');
      $('gachaRewardIcon').innerHTML = Collection.iconMarkup(card.icon);
      $('gachaRewardIcon').style.setProperty('--hue', card.hue);
      $('gachaRewardName').textContent = name;
      const rarityEl = $('gachaRewardRarity');
      rarityEl.textContent = card.rarity;
      rarityEl.className = `gacha-reward-rarity ${RARITY_STYLE[card.rarity].cls}`;
      $('gachaRewardKind').textContent = I18N.t('gacha.cardGet');
      if (card.rarity === 'SSR') {
        AudioKit.play('legendary');
        FX.confetti(60);
        FX.coinRain(20);
      } else {
        AudioKit.play('unlock');
        FX.confetti(36);
      }
      App.toast(I18N.t('toast.cardGet', { name }));
    } else {
      // XPパック（全カード収集済み）
      $('gachaRewardIcon').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"/></svg>';
      $('gachaRewardIcon').style.setProperty('--hue', 50);
      $('gachaRewardName').textContent = I18N.t('gacha.xpPack');
      const rarityEl = $('gachaRewardRarity');
      rarityEl.textContent = I18N.t('gacha.bonusLabel');
      rarityEl.className = 'gacha-reward-rarity rarity-rare';
      $('gachaRewardKind').textContent = I18N.t('gacha.xpPackKind', { n: result.amount });
      AudioKit.play('unlock');
      FX.confetti(30);
      if (result.rankUp) App.showLevelUp(result.rankUp);
    }

    // 「もう一回」ボタンの状態を更新
    refreshBalance();
    $('btnGachaAgain').classList.toggle('is-disabled', SaveStore.data.coins < GACHA_COST);
    $('btnGachaAgain').setAttribute('aria-disabled', String(SaveStore.data.coins < GACHA_COST));
    $('btnGachaAgain').innerHTML = `${I18N.t('gacha.again')}<svg class="coin-icon"><use href="#i-coin"/></svg>${GACHA_COST}`;

    Collection.refresh();
    App.refreshHeader();
  }

  function init() {
    $('btnGacha').addEventListener('click', open);
    $('btnGachaPull').addEventListener('click', pull);
    $('btnGachaAgain').addEventListener('click', () => {
      if (SaveStore.data.coins < GACHA_COST) { refreshBalance(); return; }
      AudioKit.play('click');
      resetStage();
    });
    $('btnGachaCollection').addEventListener('click', () => { close(); App.go('collection'); });
    $('btnGachaClose').addEventListener('click', close);
    $('gachaModal').addEventListener('click', (e) => {
      if (e.target.closest('[data-close-gacha]')) close();
    });
  }

  return { init, open, close };
})();
