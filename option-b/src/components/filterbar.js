/* Filter bar (period + primary filters), active-filter chips and the drawer's filter controls. */
import { $, $$ } from './svg.js';
import { esc } from '../services/format.js';

export function ctlHtml(c, compact) {
  const id = `f_${c.ns}_${c.k}`, cls = compact ? 'fctl' : 'fgroup';
  const lab = `${esc(c.label)}${c.hint && !compact ? ` <span style="font-weight:400;color:var(--grey-4)">(${esc(c.hint)})</span>` : ''}`;
  if (c.search) return `<div class="${cls}"><label for="${id}">${lab}</label><input type="search" id="${id}" data-ns="${c.ns}" data-k="${c.k}" placeholder="${esc(c.search)}" value="${esc(c.value)}"></div>`;
  const opts = c.options.map(([a, b]) => `<option value="${esc(a)}"${String(a) === String(c.value) ? ' selected' : ''}>${esc(b)}</option>`).join('');
  return `<div class="${cls}"><label for="${id}">${lab}</label><select id="${id}" data-ns="${c.ns}" data-k="${c.k}"><option value="all">All</option>${c.blank ? `<option value="__blank__"${c.value === '__blank__' ? ' selected' : ''}>${esc(c.blank)}</option>` : ''}${opts}</select></div>`;
}

/* selects apply at once; search boxes after a pause, without redrawing the box being typed in */
export function wireControls(root, { onSelect, onSearch }) {
  root.querySelectorAll('select[data-ns]').forEach(s => s.addEventListener('change', e => onSelect(e.target.dataset.ns, e.target.dataset.k, e.target.value)));
  root.querySelectorAll('input[data-ns]').forEach(i => i.addEventListener('input', e => {
    clearTimeout(window._sq);
    window._sq = setTimeout(() => onSearch(e.target.dataset.ns, e.target.dataset.k, e.target.value), 250);
  }));
}

export function FilterBar(vm, h) {
  let html = `<div class="fctl per"><label for="fPer">Period</label><select id="fPer"${vm.period.disabled ? ' disabled' : ''}>${vm.period.options.map(([v, l]) => `<option value="${v}"${v === vm.period.value ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
  html += `<div class="fctl"><div class="cmpnote">${vm.note}</div></div>`;
  html += vm.controls.map(c => ctlHtml(c, true)).join('');
  html += '<div class="fsp"></div>';
  if (vm.more) html += `<button class="btn" id="bMore">More filters${vm.more.count ? `<b>${vm.more.count}</b>` : ''}</button>`;
  $('#fbar').innerHTML = html;
  $('#fPer').addEventListener('change', e => h.onPeriod(e.target.value));
  wireControls($('#fbar'), h);
  if ($('#bMore')) $('#bMore').addEventListener('click', h.onMore);
}

export function Chips(vm, h) {
  if (!vm.items.length) { $('#chips').innerHTML = ''; return; }
  $('#chips').innerHTML = 'Filtered by ' + vm.items.map(c => `<span class="chip">${esc(c.label)}: <b>${esc(c.text)}</b><button data-k="${c.k}" aria-label="Remove filter">&times;</button></span>`).join('') +
    ' <button class="lnk" id="bClear">Clear all</button>';
  $$('#chips .chip button').forEach(b => b.addEventListener('click', () => h.onRemove(b.dataset.k)));
  $('#bClear').addEventListener('click', h.onClear);
}
