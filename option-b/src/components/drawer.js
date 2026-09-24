/* Right-hand drawer: "More filters" or "Method & data quality". */
import { $, $$ } from './svg.js';
import { esc } from '../services/format.js';
import { ctlHtml, wireControls } from './filterbar.js';

export function Drawer(mode, content, h) {
  const d = $('#drawer');
  d.classList.toggle('open', !!mode);
  d.setAttribute('aria-hidden', mode ? 'false' : 'true');
  if (!mode) return;
  if (mode === 'filters') {
    d.innerHTML = `<div class="dh"><h2>More filters</h2><button id="dX" aria-label="Close">&times;</button></div>
      <div class="ds" style="border-top:0;padding-top:0"><p>${esc(content.tab)} &middot; applied as you choose. Active filters show as chips under the filter bar.</p></div>
      <div class="ds">${content.controls.length ? content.controls.map(c => ctlHtml(c, false)).join('') : '<p>No further filters on this tab.</p>'}</div>`;
    wireControls(d, h);
  } else {
    d.innerHTML = `<div class="dh"><h2>Method &amp; data quality</h2><button id="dX" aria-label="Close">&times;</button></div>${content}`;
    $$('#drawer input[name=meth]').forEach(r => r.addEventListener('change', e => h.onMethod(e.target.value)));
    if ($('#bCsv')) $('#bCsv').addEventListener('click', h.onCsv);
  }
  $('#dX').addEventListener('click', h.onClose);
}
