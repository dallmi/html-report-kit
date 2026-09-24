/* Charts for index.html: greys carry the data, current year solid, prior year dashed. */
import { $, el, svgBox, empty, bindTip, hideTip } from './svg.js';
import { fmt, full, esc, trunc, isDim } from '../services/format.js';

function niceStep(r) { const e = Math.pow(10, Math.floor(Math.log10(r || 1))), f = r / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function niceScale(lo, hi, n = 4) {
  if (hi === lo) hi = lo + (Math.abs(lo) || 1) * 0.1;
  const st = niceStep((hi - lo) / n), a = Math.floor(lo / st) * st, b = Math.ceil(hi / st) * st, t = [];
  for (let v = a; v <= b + st / 2; v += st) t.push(+v.toFixed(10));
  return { lo: a, hi: b, ticks: t };
}

/* ranked bars: n next to every value, dashed average line, selected bar dark / others context grey, click to filter */
export function hBar(id, rows, o = {}) {
  const host = $('#' + id); if (!host) return; rows = rows.slice(0, o.limit || 10);
  const rowH = o.rowH || 26, pad = 4, top = o.avg != null ? 18 : 0, h = Math.max(60, top + rows.length * rowH + pad * 2);
  const { s, w } = svgBox(host, h);
  if (!rows.length) return empty(s);
  const f = o.fmt || fmt, hasN = rows.some(r => r.n != null), labelW = Math.min(o.labelW || 170, w * 0.42), valW = hasN ? 104 : 64;
  const max = Math.max(...rows.map(r => Math.abs(r.v)), o.avg || 0) || 1, bw0 = w - labelW - valW;
  if (o.avg != null) {
    const x = labelW + (o.avg / max) * bw0;
    el('line', { x1: x, x2: x, y1: top - 3, y2: h - pad, class: 'avgline' }, s);
    const anc = x > w - 90 ? 'end' : x < labelW + 60 ? 'start' : 'middle';
    el('text', { x, y: 11, class: 'g-ax', 'text-anchor': anc }, s).textContent = `Average = ${f(o.avg)}`;
  }
  rows.forEach((r, i) => {
    const y = top + pad + i * rowH, g = el('g', { class: 'row' + (o.onClick ? ' click' : '') }, s), maxCh = Math.max(8, Math.floor(labelW / 6.3));
    const t = el('text', { x: 0, y: y + rowH / 2 + 4, class: 'g-lbl' }, g); t.textContent = trunc(r.l, maxCh);
    const bw = Math.max(1, (Math.abs(r.v) / max) * bw0);
    el('rect', { x: labelW, y: y + 5, width: bw, height: rowH - 11, class: 'bar' + (isDim(r.l) ? ' dim' : (o.sel && o.sel !== r.l ? ' ctx' : '')) }, g);
    const vt = el('text', { x: labelW + bw + 6, y: y + rowH / 2 + 4, class: 'g-val' }, g); vt.textContent = f(r.v);
    if (r.n != null) { const n = el('tspan', { class: 'g-n', dx: 5 }, vt); n.textContent = 'n=' + full(r.n); }
    el('rect', { x: 0, y, width: w, height: rowH, fill: 'transparent' }, g);
    bindTip(g, `<b>${esc(r.l)}</b><br>${f(r.v)}${r.n != null ? ' · n = ' + full(r.n) : ''}${r.note ? '<br>' + esc(r.note) : ''}${o.onClick ? '<br><i>Click to ' + (o.sel === r.l ? 'clear filter' : 'filter') + '</i>' : ''}`);
    if (o.onClick) g.addEventListener('click', () => { hideTip(); o.onClick(r); });
  });
}

/* line chart: this year solid, prior year dashed, partial month shaded, labelled end value */
export function lineChart(id, cats, series, o = {}) {
  const host = $('#' + id); if (!host) return; const h = o.h || 210; const { s, w } = svgBox(host, h);
  const vals = series.flatMap(x => x.v).filter(v => v != null); if (!cats.length || !vals.length) return empty(s);
  const f = o.fmt || fmt, ml = o.ml || 42, mr = o.mr || 46, mt = 18, mb = 22, iw = w - ml - mr, ih = h - mt - mb;
  /* minSpan keeps small wobbles from looking dramatic (rates: at least 10 points on the axis) */
  let vlo = o.zero ? 0 : Math.min(...vals), vhi = Math.max(...vals);
  if (o.minSpan && vhi - vlo < o.minSpan) { const c = (vhi + vlo) / 2; vlo = Math.max(0, c - o.minSpan / 2); vhi = vlo + o.minSpan; }
  const sc = niceScale(vlo, vhi, o.ticks || 4), lo = sc.lo, hi = sc.hi;
  const step = cats.length > 1 ? iw / (cats.length - 1) : iw, X = i => ml + (cats.length > 1 ? i * step : iw / 2), Yp = v => mt + ih - (v - lo) / ((hi - lo) || 1) * ih;
  (o.blocks || []).forEach(b => {
    if (b.i0 == null || b.i0 < 0) return;
    const x0 = Math.max(ml - 6, X(b.i0) - step / 2), x1 = Math.min(ml + iw + mr - 8, X(b.i1) + step / 2);
    el('rect', { x: x0, y: mt - 4, width: Math.max(8, x1 - x0), height: ih + 4, class: 'blk' }, s);
    el('text', { x: (x0 + x1) / 2, y: mt - 7, class: 'g-ax', 'text-anchor': 'middle' }, s).textContent = b.label;
  });
  sc.ticks.forEach(t => el('text', { x: ml - 8, y: Yp(t) + 4, class: 'g-ax', 'text-anchor': 'end' }, s).textContent = (o.fmtAxis || f)(t));
  el('line', { x1: ml, x2: ml + iw, y1: mt + ih, y2: mt + ih, class: 'axis' }, s);
  cats.forEach((c, i) => el('text', { x: X(i), y: h - 5, class: 'g-ax', 'text-anchor': 'middle' }, s).textContent = c);
  series.slice().reverse().forEach(sr => {
    let d = ''; sr.v.forEach((v, i) => { if (v == null) return; d += (d && sr.v[i - 1] != null ? 'L' : 'M') + X(i) + ' ' + Yp(v); });
    if (d) el('path', { d, class: 'ln ' + sr.cls }, s);
    if (sr.cls === 'cur') {
      sr.v.forEach((v, i) => { if (v != null) el('circle', { cx: X(i), cy: Yp(v), r: 3, class: 'dot' }, s); });
      let li = -1; sr.v.forEach((v, i) => { if (v != null) li = i; });
      if (li >= 0) el('text', { x: X(li) + 7, y: Yp(sr.v[li]) + 4, class: 'g-val' }, s).textContent = f(sr.v[li]);
    }
  });
  cats.forEach((c, i) => {
    const r = el('rect', { x: X(i) - step / 2, y: mt, width: Math.max(10, step), height: ih, class: 'hov' }, s);
    bindTip(r, `<b>${esc(c)}</b>` + series.map(sr => `<br>${esc(sr.name)}: ${sr.v[i] == null ? '—' : f(sr.v[i])}`).join('') + (o.tipExtra ? o.tipExtra(i) : ''));
  });
}

export function sparkSvg(cur, prev) {
  const all = [...cur, ...(prev || [])].filter(v => v != null); if (all.length < 3) return '';
  const lo = Math.min(...all), hi = Math.max(...all), r = (hi - lo) || 1, n = cur.length, X = i => n > 1 ? i / (n - 1) * 100 : 50, Yp = v => 22 - ((v - lo) / r) * 20;
  const pts = a => a.map((v, i) => v == null ? null : X(i).toFixed(1) + ',' + Yp(v).toFixed(1)).filter(Boolean).join(' ');
  return `<svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none">${prev ? `<polyline points="${pts(prev)}" class="sp-prev" vector-effect="non-scaling-stroke"/>` : ''}<polyline points="${pts(cur)}" class="sp-cur" vector-effect="non-scaling-stroke"/></svg>`;
}
