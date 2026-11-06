'use strict';
/* ============================================================
   五十音クエスト — ミッション（ごほうびタスク）
   ============================================================ */

const Missions = (() => {
  const $ = (id) => document.getElementById(id);
  let filter = 'all'; // all | claimable | done

  // アイコンは index.html の <symbol> を単一ソースで再利用する
  function iconMarkup(name) {
    const allowed = ['flag', 'check', 'sword', 'crown', 'flame', 'star', 'bolt', 'timer', 'cards'];
    const id = allowed.includes(name) ? name : 'star';
    return `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  }

  function missionState(m) {
    const d = SaveStore.data;
    const progress = missionProgress(d, m);
    const claimed = d.missionsClaimed.includes(m.id);
    const complete = progress >= m.need;
    return { progress: Math.min(progress, m.need), claimed, complete };
  }

  function filteredMissions() {
    return MISSIONS.filter((m) => {
      const s = missionState(m);
      if (filter === 'claimable') return s.complete && !s.claimed;
      if (filter === 'done') return s.claimed;
      return true;
    });
  }

  function refreshBadge() {
    const badge = $('missionBadge');
    if (!badge) return;
    const n = missionClaimableCount(SaveStore.data);
    badge.textContent = String(n);
    badge.hidden = n === 0;
    // ホームのミッション・ストリップも更新（表示されていれば）
    const stripText = $('missionStripText');
    if (stripText) {
      stripText.textContent = n > 0
        ? I18N.t('strip.claimable', { n })
        : I18N.t('strip.default');
      $('missionStrip').classList.toggle('has-claimable', n > 0);
    }
  }

  function render() {
    refreshBadge();
    const list = $('missionList');
    const items = filteredMissions();
    list.innerHTML = '';

    if (items.length === 0) {
      list.innerHTML = `<div class="mission-empty panel"><p>${I18N.t('mission.empty')}</p></div>`;
      return;
    }

    // 受け取り可能なものを先に表示
    const sorted = items.slice().sort((a, b) => {
      const sa = missionState(a), sb = missionState(b);
      const rank = (s) => (s.complete && !s.claimed ? 0 : s.claimed ? 2 : 1);
      return rank(sa) - rank(sb);
    });

    sorted.forEach((m) => {
      const s = missionState(m);
      const pct = Math.round((s.progress / m.need) * 100);
      const title = I18N.tf(m, 'title');
      const desc = I18N.tf(m, 'desc');
      const row = document.createElement('div');
      row.className = 'mission-item panel' + (s.claimed ? ' is-claimed' : '') + (s.complete && !s.claimed ? ' is-claimable' : '');
      row.innerHTML = `
        <div class="mission-icon">${iconMarkup(m.icon)}</div>
        <div class="mission-body">
          <div class="mission-top">
            <span class="mission-title">${title}</span>
            <span class="mission-reward"><svg class="coin-icon"><use href="#i-coin"/></svg>+${m.rewardCoins}</span>
          </div>
          <p class="mission-desc">${desc}</p>
          <div class="mission-progress"><span class="mission-progress-fill" style="width:${pct}%"></span></div>
          <div class="mission-progress-text">${s.progress} / ${m.need}</div>
        </div>
        <div class="mission-action">${
          s.claimed
            ? `<span class="mission-claimed"><svg><use href="#i-check"/></svg>${I18N.t('mission.claimed')}</span>`
            : s.complete
              ? `<button type="button" class="btn btn-gold btn-small mission-claim-btn" data-mission-id="${m.id}">${I18N.t('mission.claim')}</button>`
              : `<span class="mission-locked-label">${I18N.t('mission.inProgress')}</span>`
        }</div>`;
      list.appendChild(row);
    });

    // 受け取りボタン
    list.querySelectorAll('.mission-claim-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const result = SaveStore.claimMission(btn.dataset.missionId);
        if (!result) return;
        AudioKit.play('claim');
        FX.coinRain(14);
        App.toast(I18N.t('mission.clearToast', { n: result.coins }));
        App.refreshHeader();
        render();
      });
    });
  }

  function setFilter(next) {
    filter = next;
    document.querySelectorAll('#missionTabs .seg-btn').forEach((b) => {
      const active = b.dataset.filter === filter;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
      if (active) $('missionList').setAttribute('aria-labelledby', b.id);
    });
    render();
  }

  function init() {
    $('missionTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      AudioKit.play('click');
      setFilter(btn.dataset.filter);
    });
    $('missionTabs').addEventListener('keydown', (event) => {
      const btn = event.target.closest('.seg-btn');
      if (!btn || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from($('missionTabs').querySelectorAll('.seg-btn'));
      const current = tabs.indexOf(btn);
      const offset = event.key === 'ArrowLeft' ? -1 : 1;
      let index = (current + offset + tabs.length) % tabs.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = tabs.length - 1;
      event.preventDefault();
      setFilter(tabs[index].dataset.filter);
      tabs[index].focus();
    });
    refreshBadge();
  }

  return { init, render, refreshBadge };
})();
