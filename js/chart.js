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
          const [kana, romaji, example] = cell;
          const shown = script === 'hiragana' ? kana : toKatakana(kana);
          const spoken = example ? inScript(example, script) : shown;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'chart-cell';
          btn.setAttribute('aria-label', I18N.t(example ? 'chart.cellExample' : 'chart.cellAria', { kana: shown, example: spoken }));
          btn.innerHTML = `<span class="chart-kana">${shown}</span><span class="chart-romaji">${romaji}</span>`;
          btn.addEventListener('click', () => {
            AudioKit.play('click');
            AudioKit.speak(spoken);
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
    $('chartTabHiragana').tabIndex = script === 'hiragana' ? 0 : -1;
    $('chartTabKatakana').tabIndex = script === 'katakana' ? 0 : -1;
    $('chartContainer').setAttribute('aria-labelledby', script === 'hiragana' ? 'chartTabHiragana' : 'chartTabKatakana');
    render();
  }

  function init() {
    $('chartTabHiragana').addEventListener('click', () => setScript('hiragana'));
    $('chartTabKatakana').addEventListener('click', () => setScript('katakana'));
    for (const id of ['chartTabHiragana', 'chartTabKatakana']) $(id).addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'hiragana' : event.key === 'End' ? 'katakana' : script === 'hiragana' ? 'katakana' : 'hiragana';
      setScript(next);
      $(next === 'hiragana' ? 'chartTabHiragana' : 'chartTabKatakana').focus();
    });
    render();
  }

  return { init, refresh: render };
})();
