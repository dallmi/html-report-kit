/* Charts for index2.html (branded original): greys carry data, one colour per series. */
import { $, el, svgBox, empty, bindTip } from '../svg.js';
import { fmt2 as fmt, pct2 as pct, full, esc, trunc, isDim } from '../../services/format.js';

export function hBar(id, rows, o = {}) {
  const host = $('#' + id); if (!host) return; rows = rows.slice(0, o.limit || 10);
  const rowH = o.rowH || 26, pad = 4, h = Math.max(60, rows.length * rowH + pad * 2); const { s, w } = svgBox(host, h);
  if (!rows.length) return empty(s);
  const labelW = Math.min(o.labelW || 170, w * 0.44), valW = 62, max = Math.max(...rows.map(r => Math.abs(r.v))) || 1;
  const f = o.fmt || fmt;
  rows.forEach((r, i) => {
    const y = pad + i * rowH, maxCh = Math.max(8, Math.floor(labelW / 6.4));
    const t = el('text', { x: 0, y: y + rowH / 2 + 4, class: 'g-lbl' }, s); t.textContent = trunc(r.l, maxCh);
    bindTip(t, `<b>${esc(r.l)}</b>${r.note ? '<br>' + esc(r.note) : ''}`);
    const bw = Math.max(1, (Math.abs(r.v) / max) * (w - labelW - valW));
    const b = el('rect', { x: labelW, y: y + 5, width: bw, height: rowH - 11, class: 'bar' + (isDim(r.l) ? ' dim' : '') }, s);
    bindTip(b, `<b>${esc(r.l)}</b><br>${f(r.v)}${r.note ? '<br>' + esc(r.note) : ''}`);
    el('text', { x: labelW + bw + 6, y: y + rowH / 2 + 4, class: 'g-val' }, s).textContent = f(r.v);
  });
}

export function comboChart(id, cats, bars, line, o = {}) {
  const host = $('#' + id); if (!host) return; const h = o.h || 240; const { s, w } = svgBox(host, h);
  if (!cats.length) return empty(s);
  const ml = 4, mr = 4, mb = 24, lineBand = line ? 52 : 0, mt = line ? 20 : 4, barTop = mt + lineBand + (line ? 36 : 18), iw = w - ml - mr, ih = h - mb - barTop;
  const bmax = Math.max(...bars) || 1, slot = iw / cats.length, bw = Math.min(44, slot * 0.58);
  cats.forEach((c, i) => {
    const cx = ml + slot * i + slot / 2, bh = (bars[i] || 0) / bmax * ih;
    const r = el('rect', { x: cx - bw / 2, y: h - mb - bh, width: bw, height: bh, class: 'bar' }, s);
    bindTip(r, `<b>${esc(c)}</b><br>${esc(o.barLabel || 'Value')}: ${full(bars[i])}${line && line[i] != null ? '<br>' + esc(o.lineLabel || 'Rate') + ': ' + pct(line[i]) : ''}`);
    el('text', { x: cx, y: h - mb - bh - 5, class: 'g-val', 'text-anchor': 'middle' }, s).textContent = fmt(bars[i]);
    el('text', { x: cx, y: h - 7, class: 'g-ax', 'text-anchor': 'middle' }, s).textContent = c;
  });
  el('line', { x1: ml, x2: ml + iw, y1: h - mb, y2: h - mb, class: 'axis' }, s);
  if (line) {
    const vals = line.filter(v => v != null); if (!vals.length) return;
    const lo = Math.min(...vals), hi = Math.max(...vals), rng = (hi - lo) || 0.01;
    const X = i => ml + slot * i + slot / 2, Y = v => mt + lineBand - ((v - lo) / rng) * lineBand; let d = '';
    line.forEach((v, i) => { if (v == null) return; d += (d ? 'L' : 'M') + X(i) + ' ' + Y(v); });
    el('path', { d, class: 'lineHalo' }, s); el('path', { d, class: 'lineS' }, s);
    line.forEach((v, i) => {
      if (v == null) return; const c = el('circle', { cx: X(i), cy: Y(v), r: 3.5, class: 'dot' }, s);
      bindTip(c, `<b>${esc(cats[i])}</b><br>${esc(o.lineLabel || 'Rate')}: ${pct(v)}`);
      /* label on the outside of the bend so it never sits on the line */
      const nb = [line[i - 1], line[i + 1]].filter(x => x != null), below = nb.length && v < Math.min(...nb);
      el('text', { x: X(i), y: below ? Y(v) + 15 : Y(v) - 8, class: 'g-ax', 'text-anchor': 'middle' }, s).textContent = pct(v, 1);
    });
  }
}

export function groupCols(id, cats, A, B, o = {}) {
  const host = $('#' + id); if (!host) return; const h = o.h || 230; const { s, w } = svgBox(host, h);
  if (!cats.length) return empty(s);
  const ml = 44, mr = 8, mt = 12, mb = 24, iw = w - ml - mr, ih = h - mt - mb;
  const max = Math.max(...A.filter(x => x != null), ...B.filter(x => x != null)) || 1;
  [0, .5, 1].forEach(f => el('text', { x: ml - 8, y: mt + ih - f * ih + 4, class: 'g-ax', 'text-anchor': 'end' }, s).textContent = o.fmtAxis ? o.fmtAxis(max * f) : fmt(max * f));
  const slot = iw / cats.length, bw = Math.max(3, Math.min(20, slot * 0.32));
  cats.forEach((c, i) => {
    const x0 = ml + i * slot + slot / 2;
    [[A[i], 'bar', -bw - 1, o.labelA || 'A'], [B[i], 'bar s2', 1, o.labelB || 'B']].forEach(([v, cls, off, lab]) => {
      if (v == null) return;
      const bh = v / max * ih; const r = el('rect', { x: x0 + off, y: mt + ih - bh, width: bw, height: Math.max(v ? 1 : 0, bh), class: cls }, s);
      bindTip(r, `<b>${esc(c)}</b> · ${esc(lab)}<br>${o.fmtTip ? o.fmtTip(v) : full(v)}`);
    });
    el('text', { x: x0, y: h - 7, class: 'g-ax', 'text-anchor': 'middle' }, s).textContent = c;
  });
  el('line', { x1: ml, x2: ml + iw, y1: mt + ih, y2: mt + ih, class: 'axis' }, s);
}

export function pairBar(id, rows, o = {}) {
  const host = $('#' + id); if (!host) return; rows = rows.slice(0, o.limit || 10);
  const rowH = o.rowH || 34, pad = 4, h = Math.max(60, rows.length * rowH + pad * 2); const { s, w } = svgBox(host, h);
  if (!rows.length) return empty(s);
  const labelW = Math.min(o.labelW || 190, w * 0.42), valW = 80, max = Math.max(...rows.flatMap(r => [r.a, r.b])) || 1;
  rows.forEach((r, i) => {
    const y = pad + i * rowH, maxCh = Math.max(8, Math.floor(labelW / 6.4));
    const t = el('text', { x: 0, y: y + rowH / 2 + 4, class: 'g-lbl' }, s); t.textContent = trunc(r.l, maxCh); bindTip(t, `<b>${esc(r.l)}</b>`);
    const bh = (rowH - 12) / 2;
    [[r.a, 'bar', 0, o.labA || 'A'], [r.b, 'bar s2', bh + 2, o.labB || 'B']].forEach(([v, cls, off, lab]) => {
      const bw = Math.max(1, (v / max) * (w - labelW - valW));
      bindTip(el('rect', { x: labelW, y: y + 5 + off, width: bw, height: bh, class: cls }, s), `<b>${esc(r.l)}</b><br>${esc(lab)}: ${pct(v)}`);
    });
    el('text', { x: w - valW + 10, y: y + rowH / 2 + 4, class: 'g-val' }, s).textContent = pct(r.a, 0) + ' / ' + pct(r.b, 0);
  });
}

export function bubbles(id, pts, o = {}) {
  const host = $('#' + id); if (!host) return; const h = o.h || 250; const { s, w } = svgBox(host, h);
  if (!pts.length) return empty(s);
  const ml = 44, mr = 16, mt = 24, mb = 34, iw = w - ml - mr, ih = h - mt - mb;
  /* log x-scale: audience bands span 10 to 100,000+ recipients */
  const lx = pts.map(p => Math.log10(Math.max(1, p.x))), xlo = Math.min(...lx), xhi = Math.max(...lx), xr = (xhi - xlo) || 1;
  const ys = pts.map(p => p.y), ylo = Math.max(0, Math.floor((Math.min(...ys) - 0.1) * 10) / 10), yhi = Math.min(1, Math.max(...ys) + 0.05), yr = (yhi - ylo) || 1;
  const rmax = Math.max(...pts.map(p => p.r)) || 1;
  [0, .5, 1].forEach(f => el('text', { x: ml - 8, y: mt + ih - f * ih + 4, class: 'g-ax', 'text-anchor': 'end' }, s).textContent = pct(ylo + yr * f, 0));
  el('line', { x1: ml, x2: ml + iw, y1: mt + ih, y2: mt + ih, class: 'axis' }, s);
  const P = pts.map((p, i) => ({ ...p, cx: ml + 30 + ((lx[i] - xlo) / xr) * (iw - 90), cy: mt + ih - ((p.y - ylo) / yr) * ih, rr: 6 + Math.sqrt(p.r / rmax) * 16 }));
  P.slice().sort((a, b) => b.rr - a.rr).forEach(p => bindTip(el('circle', { cx: p.cx, cy: p.cy, r: p.rr, class: 'bub' }, s),
    `<b>${esc(p.l)}</b><br>Avg audience: ${full(p.x)}<br>Open rate: ${pct(p.y)}<br>Mailings: ${full(p.r)}`));
  P.forEach(p => { const t = el('text', { x: p.cx, y: p.cy - p.rr - 5, class: 'g-lbl', 'text-anchor': 'middle' }, s); t.textContent = trunc(p.l, 16); });
  P.forEach(p => el('text', { x: p.cx, y: mt + ih + 14, class: 'g-ax', 'text-anchor': 'middle' }, s).textContent = fmt(p.x));
  el('text', { x: ml + iw / 2, y: h - 4, class: 'g-ax', 'text-anchor': 'middle' }, s).textContent = (o.xLabel || 'Average audience per mailing') + ' (log scale)';
}
