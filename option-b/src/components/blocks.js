/* KPI row, verdict line, table and legend for index.html. They take view-model output and draw it. */
import { $, $$, bindTip } from './svg.js';
import { sparkSvg } from './charts.js';
import { esc, full } from '../services/format.js';
import { dUnit } from '../services/metrics.js';

/* change vs prior year; o.good='down' flips the colours, o.neutral keeps them grey */
export function dHtml(d, o = {}, PY) {
  if (!d) return `<span class="dl na">${esc(o.na || ('No ' + (PY || 'prior-year') + ' data'))}</span>`;
  const tol = d.k === 'pp' ? 0.3 : d.k === 'pts' ? 0.5 : 1, flat = Math.abs(d.v) < tol, up = d.v > 0;
  const cls = o.neutral || flat ? 'flat' : (up === (o.good !== 'down') ? 'up' : 'down');
  return `<span class="dl ${cls}">${flat ? '' : up ? '▲ ' : '▼ '}${up ? '+' : ''}${d.v.toFixed(1)}${dUnit(d)}<span class="vs"> vs ${PY}</span></span>`;
}
/* view-models describe a change as {v: delta|null, o: options}; undefined = no change line at all */
export const deltaCell = (d, PY) => d ? dHtml(d.v, d.o, PY) : '';

export function KpiRow(id, items, PY) {
  $('#' + id).innerHTML = items.map(k => `<div class="kpi${k.hl ? ' hl' : ''}"><div class="k-l">${k.l}${k.info ? ` <span class="info" data-tip="${esc(k.info)}">i</span>` : ''}</div>
  <div class="k-v">${k.v}</div><div class="k-d">${deltaCell(k.d, PY)}</div><div class="k-s">${k.s || ''}</div>${k.spark ? sparkSvg(k.spark.cur, k.spark.prev) : ''}</div>`).join('');
  $$('#' + id + ' [data-tip]').forEach(e => bindTip(e, esc(e.dataset.tip)));
}

export function VerdictLine(host, vm) {
  if (vm.empty) { $('#' + host).innerHTML = `<div class="vline"><div class="vt">${vm.empty}</div></div>`; return; }
  const { verdict, cls, text, why } = vm;
  $('#' + host).innerHTML = `<div class="vline"><div class="vh"><span class="verdict${cls ? ' ' + cls : ''}">${esc(verdict)}</span><div class="vt">${text}</div></div>
  ${why ? `<details class="why"><summary>Why, and how to report it</summary><div class="whyb">${why}</div></details>` : ''}</div>`;
}

/* top 10 by default, "show all" up to o.max */
export function Table(id, cols, rows, o = {}) {
  const lim = o.expanded ? (o.max || 100) : (o.limit || 10), shown = rows.slice(0, lim);
  $('#' + id).innerHTML = '<thead><tr>' + cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.h}</th>`).join('') + '</tr></thead><tbody>' +
    (shown.length ? shown.map(r => '<tr>' + cols.map(c => `<td class="${c.num ? 'num' : ''}${c.cls ? ' ' + c.cls : ''}">${c.f(r)}</td>`).join('') + '</tr>').join('')
      : `<tr><td colspan="${cols.length}" style="color:var(--grey-4);padding:18px 8px">Nothing matches the current filters.</td></tr>`) + '</tbody>';
  const wrap = $('#' + id + 'Wrap') || $('#' + id).parentElement; wrap.classList.toggle('scroll', !!o.expanded);
  const note = $('#' + (o.noteId || '')), more = $('#' + (o.moreId || ''));
  if (note) note.textContent = `Showing ${full(shown.length)} of ${full(rows.length)}${o.noteExtra ? ' · ' + o.noteExtra : ''}`;
  if (more) {
    more.style.display = rows.length > (o.limit || 10) ? '' : 'none';
    more.textContent = o.expanded ? 'Show top 10' : `Show all ${full(Math.min(rows.length, o.max || 100))}`;
    more.onclick = o.onToggle;
  }
}

export const Legend = (id, { cur, prev, hasPrev, partial }) => {
  $('#' + id).innerHTML = `<span><i></i>${cur}</span>${hasPrev ? `<span><i class="prev"></i>${prev}</span>` : ''}${partial ? '<span><i class="blk"></i>Partial month</span>' : ''}`;
};

export const setText = (id, t) => { $('#' + id).textContent = t; };
export const setHtml = (id, h) => { $('#' + id).innerHTML = h; };

/* CSV export: every tab's view-model provides {name, rows}; one writer for all of them */
export function toCsv({ name, rows }) {
  const blob = new Blob([rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'comms_' + name + '_export.csv'; a.click();
}
