'use strict';
/* ============================================================
   五十音クエスト — ごじゅうおん表
   タップすると音声が鳴る・濁音と拗音までカバー
   ============================================================ */

const Chart = (() => {
  let script = 'hiragana';

  const $ = (id) => document.getElementById(id);

  function render() {
    const container = $('chartContainer');
    container.innerHTML = '';

    CHART_SECTIONS.forEach((section) => {
      const block = document.createElement('section');
      block.className = 'chart-block panel';
      const heading = document.createElement('h3');
      heading.className = 'chart-block-title';
      heading.textContent = I18N.tf(section, 'title');
      block.appendChild(heading);

      section.rows.forEach((row) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'chart-row';

        const label = document.createElement('div');
        label.className = 'chart-row-label';
        label.textContent = row.label;
        rowEl.appendChild(label);

        const cells = document.createElement('div');
        cells.className = 'chart-cells';

        row.cells.forEach((cell) => {
          if (!cell) {
            const spacer = document.createElement('span');
            spacer.className = 'chart-cell is-empty';
            spacer.setAttribute('aria-hidden', 'true');
            cells.appendChild(spacer);
            return;
          }
          const [kana, romaji] = cell;
          const shown = script === 'hiragana' ? kana : toKatakana(kana);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'chart-cell';
          btn.setAttribute('aria-label', I18N.t('chart.cellAria', { kana: shown }));
          btn.innerHTML = `<span class="chart-kana">${shown}</span><span class="chart-romaji">${romaji}</span>`;
          btn.addEventListener('click', () => {
            AudioKit.play('click');
            AudioKit.speak(shown);
            btn.classList.remove('is-ping');
            // アニメーションを再生し直す
            void btn.offsetWidth;
            btn.classList.add('is-ping');
          });
          cells.appendChild(btn);
        });

        rowEl.appendChild(cells);
        block.appendChild(rowEl);
      });

      container.appendChild(block);
    });
  }

  function setScript(next) {
    script = next === 'katakana' ? 'katakana' : 'hiragana';
    $('chartTabHiragana').classList.toggle('is-active', script === 'hiragana');
    $('chartTabKatakana').classList.toggle('is-active', script === 'katakana');
    $('chartTabHiragana').setAttribute('aria-selected', String(script === 'hiragana'));
    $('chartTabKatakana').setAttribute('aria-selected', String(script === 'katakana'));
    render();
  }

  function init() {
    $('chartTabHiragana').addEventListener('click', () => setScript('hiragana'));
    $('chartTabKatakana').addEventListener('click', () => setScript('katakana'));
    render();
  }

  return { init, refresh: render };
})();
