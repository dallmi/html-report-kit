/* KPI tiles, validation bar and the left-hand control panel for index2.html. */
import { $ } from '../svg.js';
import { esc } from '../../services/format.js';

export function Kpis(id, items) {
  $('#' + id).innerHTML = items.map(k =>
    `<div class="kpi${k.hl ? ' hl' : ''}"><div class="k-l">${k.l}</div><div class="k-v">${k.v}</div><div class="k-s">${k.s || ''}</div></div>`).join('');
}

export function ValBar(id, parts) {
  $('#' + id).innerHTML = parts.map(p =>
    `<span>${p.l}: <b>${p.v}</b>${p.tag && p.tagTxt !== 'none' ? `<i class="rag ${p.tag}"></i>${p.tagTxt}` : ''}</span>`).join('');
}

export const miniBar = (v, mx) => `<div class="mini"><i style="width:${(v / mx * 100).toFixed(1)}%"></i></div>`;

/* the contextual filter panel: one control per filter of the active tab */
export function ControlPanel(vm, h) {
  const host = $('#fDyn');
  host.innerHTML = vm.controls.map(f => {
    const id = 'f_' + f.ns + '_' + f.k, lab = `${esc(f.label)}${f.hint ? ` <span class="hint">(${esc(f.hint)})</span>` : ''}`;
    if (f.disabled) return `<div class="fgroup off"><label for="${id}">${lab}</label><select id="${id}" disabled><option>Not available</option></select><div class="na">${esc(f.disabled)}</div></div>`;
    if (f.type === 'search') return `<div class="fgroup"><label for="${id}">${lab}</label><input id="${id}" type="search" data-ns="${f.ns}" data-k="${f.k}" placeholder="${esc(f.ph || '')}" value="${esc(f.value)}"></div>`;
    const opts = f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(f.value) ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const blank = f.blank ? `<option value="__blank__"${f.value === '__blank__' ? ' selected' : ''}>${esc(f.blank)}</option>` : '';
    return `<div class="fgroup"><label for="${id}">${lab}</label><select id="${id}" data-ns="${f.ns}" data-k="${f.k}"><option value="all">(All)</option>${blank}${opts}</select></div>`;
  }).join('');
  host.querySelectorAll('select[data-ns]').forEach(s => s.addEventListener('change', e => h.onSelect(e.target.dataset.ns, e.target.dataset.k, e.target.value)));
  host.querySelectorAll('input[type=search]').forEach(i => i.addEventListener('input', e => {
    clearTimeout(window._sq);
    window._sq = setTimeout(() => h.onSearch(e.target.dataset.ns, e.target.dataset.k, e.target.value), 220);
  }));
  $('#fCtx').textContent = vm.title;
}
