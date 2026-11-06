'use strict';
/* ============================================================
   五十音クエスト — コレクション（ごほうびカード）
   ============================================================ */

const Collection = (() => {
  const $ = (id) => document.getElementById(id);

  // カードアイコン（線画SVG・currentColor）
  const ICONS = {
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15 9.2 13.2 13.2 9.2 15 11 10.8z"/>',
    ripple:  '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.4"/><circle cx="12" cy="12" r="9.4"/>',
    spark:   '<path d="M12 2.5l2.3 6.3 6.3 2.3-6.3 2.3L12 19.7l-2.3-6.3-6.3-2.3 6.3-2.3z"/><circle cx="19" cy="5" r="1.1"/><circle cx="5" cy="19" r="1.1"/>',
    bolt:    '<path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"/>',
    talisman:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10.2 8h3.6M10.2 12h3.6M10.2 16h2.2"/>',
    speed:   '<path d="M3 5l6 7-6 7M9.2 5l6 7-6 7M15.4 5l5.6 7-5.6 7"/>',
    mandala: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.6"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
    clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
    infinity:'<path d="M6.2 12c0-2.3 1.9-4.1 4.1-4.1 3.2 0 4.4 8.2 7.6 8.2 2.2 0 4-1.9 4-4.1s-1.8-4.1-4-4.1c-3.2 0-4.4 8.2-7.6 8.2-2.2 0-4.1-1.9-4.1-4.1z"/>',
    arrow:   '<path d="M4.5 19.5 19.5 4.5M19.5 4.5h-6.2M19.5 4.5v6.2"/>',
    medal:   '<circle cx="12" cy="9" r="5.2"/><path d="M9.2 13.3 6.6 21l5.4-2.5L17.4 21l-2.6-7.7"/>',
    crown:   '<path d="M4 17.5 5.6 8.5 11 13l1-6 1 6 5.4-4.5L20 17.5z"/><path d="M4 20.5h16"/>',
  };

  function iconMarkup(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`;
  }

  function isUnlocked(card) {
    return SaveStore.data.unlocked.includes(card.id);
  }

  function refresh() {
    const grid = $('collectionGrid');
    const d = SaveStore.data;
    const unlockedCount = CARDS.filter(isUnlocked).length;

    $('collectionCount').textContent = String(unlockedCount);
    $('collectionFill').style.width = `${(unlockedCount / CARDS.length) * 100}%`;

    const locked = CARDS.filter((c) => !isUnlocked(c)).sort((a, b) => a.need - b.need);
    $('collectionNext').textContent = locked.length
      ? I18N.t('collection.next', { name: I18N.tf(locked[0], 'name'), n: Math.max(0, locked[0].need - d.correct) })
      : I18N.t('collection.complete');

    grid.innerHTML = '';
    CARDS.forEach((card) => {
      const unlocked = isUnlocked(card);
      const name = I18N.tf(card, 'name');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `collect-card ${RARITY_STYLE[card.rarity].cls}${unlocked ? '' : ' is-locked'}`;
      btn.style.setProperty('--hue', card.hue);
      btn.setAttribute('aria-label', unlocked ? `${I18N.get() === 'zh' ? '卡片' : 'カード'}：${name}` : (I18N.get() === 'zh' ? '隱藏卡片' : 'かくされたカード'));
      btn.innerHTML = `
        <span class="collect-rarity">${card.rarity}</span>
        <span class="collect-icon">${unlocked ? iconMarkup(card.icon) : '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-lock"/></svg>'}</span>
        <span class="collect-name">${unlocked ? name : I18N.t('collection.locked')}</span>
        <span class="collect-need">${unlocked ? I18N.t('collection.get') : I18N.t('collection.need', { n: card.need })}</span>`;
      btn.addEventListener('click', () => {
        AudioKit.play('click');
        openDetail(card, unlocked);
      });
      grid.appendChild(btn);
    });
  }

  function openDetail(card, unlocked) {
    const frame = $('cardDetailFrame');
    frame.className = `modal-card card-detail-card ${RARITY_STYLE[card.rarity].cls}${unlocked ? '' : ' is-locked'}`;
    frame.style.setProperty('--hue', card.hue);
    $('cardModalRarity').textContent = card.rarity;
    $('cardModalIcon').innerHTML = unlocked ? iconMarkup(card.icon) : '<svg viewBox="0 0 24 24"><use href="#i-lock"/></svg>';
    const name = I18N.tf(card, 'name');
    $('cardModalName').textContent = unlocked ? name : I18N.t('collection.locked');
    $('cardModalDesc').textContent = unlocked ? I18N.tf(card, 'desc') : I18N.t('collection.hiddenDesc');
    $('cardModalCondition').textContent = unlocked
      ? I18N.t('collection.detailGot', { n: card.need })
      : I18N.t('collection.detailLocked', { n: card.need, m: SaveStore.data.correct });
    App.openModal('cardModal');
  }

  function closeDetail() {
    App.closeModal('cardModal');
  }

  function init() {
    $('btnCloseCard').addEventListener('click', closeDetail);
    $('cardModal').addEventListener('click', (e) => {
      if (e.target.closest('[data-close-card]')) closeDetail();
    });
    refresh();
  }

  return { init, refresh, iconMarkup };
})();
