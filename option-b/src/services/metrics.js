import { median } from './aggregate.js';

/* ---- rate method: volume-weighted (w) or simple average of the per-mailing % columns (s) ---- */
export const rate = (a, k, method) => !a || !a.n ? null
  : (method === 'w' ? { open: a.wOpen, cto: a.wCto, ctr: a.wCtr } : { open: a.open, cto: a.cto, ctr: a.ctr })[k];
export const methodLabel = method => method === 'w' ? 'weighted' : 'simple average';

/* ---- change vs prior year: percentage points for rates, % for counts, points for scores ---- */
export const dRate = (c, p) => c == null || p == null ? null : { v: (c - p) * 100, k: 'pp' };
export const dCount = (c, p) => !p ? null : { v: (c / p - 1) * 100, k: '%' };
export const dPts = (c, p) => c == null || p == null ? null : { v: c - p, k: 'pts' };
export const dUnit = d => d.k === 'pp' ? ' pp' : d.k === 'pts' ? ' pts' : '%';
export const dTxt = (d, PY) => !d ? '' : `${d.v > 0 ? '+' : ''}${d.v.toFixed(1)}${dUnit(d)} vs ${PY}`;

/* ---- peer benchmark: median open / click-to-open of the same content type x audience band ----
   Computed once at load from all mailings of the reporting year. */
export const peerKey = r => r.ct + '|' + r.cl;
export function buildPeers(rows) {
  const g = {};
  rows.forEach(r => {
    const o = g[peerKey(r)] = g[peerKey(r)] || { o: [], c: [] };
    if (r.po != null) o.o.push(r.po);
    if (r.pc != null) o.c.push(r.pc);
  });
  const out = {};
  for (const k in g) out[k] = { o: median(g[k].o), c: median(g[k].c), n: g[k].o.length };
  return out;
}

/* ---- headcount from the manifest (reach denominators; the per-article reach itself comes from the build) ---- */
export const headcount = (manifest, kind, y, m) =>
  (manifest.headcount[kind] || {})[`${y}-${String(m).padStart(2, '0')}`] || 0;
