/* Grouping and summing. Pure functions over record arrays. */

export const uniq = a => [...new Set(a)].filter(x => x != null && x !== '')
  .sort((x, y) => String(x).localeCompare(String(y), undefined, { numeric: true }));
export const uniqTags = l => [...new Set(l.flat())].filter(Boolean).sort((a, b) => a.localeCompare(b));
export const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
export const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
export const median = a => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/* Both rate methods side by side: simple average of the per-mailing % columns (blanks skipped)
   and volume-weighted totals. Which one is shown is decided in metrics.rate(). */
export function aggOf(o) {
  return {
    ...o, n: o.n, open: mean(o.po), cto: mean(o.pc), ctr: mean(o.pu),
    nOpen: o.po.length, nCto: o.pc.length, nCtr: o.pu.length,
    wOpen: o.es ? o.op / o.es : 0, wCto: o.op ? o.uc / o.op : 0, wCtr: o.es ? o.uc / o.es : 0,
  };
}

const blank = () => ({ es: 0, op: 0, uc: 0, ms: 0, n: 0, po: [], pc: [], pu: [] });
function add(o, r) {
  o.es += r.es; o.op += r.op; o.uc += r.uc; o.ms += r.ms; o.n++;
  if (r.po != null) o.po.push(r.po);
  if (r.pc != null) o.pc.push(r.pc);
  if (r.pu != null) o.pu.push(r.pu);
}

export function mailAgg(rows) {
  const o = blank();
  rows.forEach(r => add(o, r));
  o.n = rows.length;
  return aggOf(o);
}

export const TAGDIM = { th: 1, tp: 1 };

/* Theme and topic are any-match: a mailing counts under every tag it carries.
   monthKey decides the month label (v3 groups by number, v2 by name). */
export function groupMail(rows, dim, { monthKey = m => m } = {}) {
  const g = {};
  const put = (k, r) => add(g[k] = g[k] || blank(), r);
  rows.forEach(r => {
    if (dim === 'month') return put(monthKey(r.m), r);
    if (TAGDIM[dim]) { const l = r[dim]; if (!l.length) put('(Untagged)', r); else l.forEach(t => put(t, r)); return; }
    let k = r[dim];
    if (!k && dim === 'pk') k = '(No pack)';
    if (!k && (dim === 'tcl' || dim === 'tid')) k = '(No tracking ID)';
    put(k, r);
  });
  return Object.entries(g).map(([l, v]) => ({ l, ...aggOf(v) }));
}

/* one value per month of the reporting year, null where a month has no mailings */
export function monthly(rows, fn, months) {
  const g = groupMail(rows, 'month');
  return months.map(m => { const r = g.find(x => +x.l === m); return r ? fn(r) : null; });
}
