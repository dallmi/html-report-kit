import { inPer } from './period.js';

/* Filtered selections are cached by filter signature, per source array. Results are frozen:
   callers sort copies, never the cached array. */
const CACHE = new WeakMap();
function memo(rows, key, fn) {
  let m = CACHE.get(rows);
  if (!m) { m = new Map(); CACHE.set(rows, m); }
  if (m.has(key)) return m.get(key);
  if (m.size > 300) m.clear();
  const r = Object.freeze(fn());
  m.set(key, r);
  return r;
}
const sig = (...a) => JSON.stringify(a);
const on = (f, k) => f[k] != null && f[k] !== 'all' && f[k] !== '';
/* '__blank__' selects rows without a value (no pack, no tracking ID) */
const match = (want, have) => want === '__blank__' ? !have : have === want;

/* o.period: null = no period filter (v2), otherwise 'ytd' | 'qN' | 'mN' with o.cutoff.
   o.ignore: filters to leave out, e.g. {ct:1} for a chart that shows every content type. */
export function filterMail(rows, f, o = {}) {
  const ig = o.ignore || {}, per = o.period ?? null, cut = o.cutoff ?? null;
  return memo(rows, 'ml' + sig(f, per, cut, ig), () => {
    const tq = (f.tid || '').toLowerCase();
    return rows.filter(r =>
      (per == null || ig.period || inPer(r.m, per, cut)) &&
      (!on(f, 'q') || r.q == +f.q) && (!on(f, 'm') || r.m == +f.m) &&
      (!on(f, 'cc') || r.cc === f.cc) && (ig.div || !on(f, 'div') || r.div === f.div) &&
      (ig.ct || !on(f, 'ct') || r.ct === f.ct) && (!on(f, 'th') || r.th.includes(f.th)) &&
      (!on(f, 'tp') || r.tp.includes(f.tp)) && (!on(f, 'tm') || r.tm === f.tm) &&
      (ig.cl || !on(f, 'cl') || r.cl === f.cl) && (!on(f, 'pk') || match(f.pk, r.pk)) &&
      (!on(f, 'tcl') || match(f.tcl, r.tcl)) && (!tq || String(r.tid || '').toLowerCase().includes(tq)));
  });
}

export function filterArts(rows, f, o = {}) {
  const ig = o.ignore || {}, per = o.period ?? null, cut = o.cutoff ?? null;
  return memo(rows, 'ar' + sig(f, per, cut, ig), () => rows.filter(a =>
    (per == null || inPer(a.m, per, cut)) &&
    (!on(f, 'q') || a.q == +f.q) && (!on(f, 'm') || a.m == +f.m) &&
    (!on(f, 'name') || a.t === f.name) && (!on(f, 'au') || a.au === f.au) && (!on(f, 'ov') || a.ov === f.ov) &&
    (ig.th || !on(f, 'th') || a.th === f.th) && (!on(f, 'tp') || a.tp.includes(f.tp)) &&
    (!on(f, 'ts') || a.ts === f.ts) && (!on(f, 'rg') || a.rg === f.rg) && (!on(f, 'ch') || a.ch === f.ch) &&
    (!on(f, 'pk') || match(f.pk, a.pk)) && (!on(f, 'tcl') || match(f.tcl, a.tcl))));
}

export function filterVids(rows, f, o = {}) {
  const ig = o.ignore || {}, per = o.period ?? null, cut = o.cutoff ?? null;
  return memo(rows, 'vd' + sig(f, per, cut, ig), () => {
    const q = (f.name || '').toLowerCase();
    return rows.filter(v =>
      (per == null || inPer(v.m, per, cut)) &&
      (!on(f, 'q') || v.q == +f.q) && (!on(f, 'm') || v.m == +f.m) &&
      (ig.div || !on(f, 'div') || v.div === f.div) && (!on(f, 'lang') || v.lang === f.lang) &&
      (!q || v.t.toLowerCase().includes(q)));
  });
}

/* ---- page-level export: visitor division / region restrict the page set everywhere ---- */
export const pgAttr = (p, f) => (!on(f, 'site') || p.site === f.site) && (!on(f, 'div') || p.div === f.div) &&
  (!on(f, 'ct') || p.ct === f.ct) && (!on(f, 'th') || p.th === f.th) && (!on(f, 'tp') || p.tp.includes(f.tp)) &&
  (!on(f, 'org') || p.org === f.org) && (!on(f, 'rg') || p.rg === f.rg);

export function pgAllowed(D, f, ig = {}) {
  let set = null;
  if (!ig.vdiv && on(f, 'vdiv')) set = new Set(D.pgDiv.filter(p => p.sp === f.vdiv).map(p => p.url));
  if (!ig.vreg && on(f, 'vreg')) {
    const r = new Set(D.pgReg.filter(p => p.sp === f.vreg).map(p => p.url));
    set = set ? new Set([...set].filter(u => r.has(u))) : r;
  }
  return set;
}

export const pgLevelF = (D, f, ig = {}) => memo(D.pgLevel, 'pl' + sig(f, ig), () => {
  const a = pgAllowed(D, f, ig);
  return D.pgLevel.filter(p => pgAttr(p, f) && (!a || a.has(p.url)));
});

/* rows: D.pgDiv or D.pgReg. sp: keep only that split value (null = all splits). */
export const pgSplitF = (rows, D, f, { ignore = {}, sp = null } = {}) => memo(rows, 'ps' + sig(f, ignore, sp), () => {
  const a = pgAllowed(D, f, ignore);
  return rows.filter(p => pgAttr(p, f) && (!a || a.has(p.url)) && (sp == null || p.sp === sp));
});

/* ---- click tracking: cumulative export, no dates ---- */
export function linksF(D, f) {
  return memo(D.links, 'lk' + sig(f), () => {
    const lq = (f.link || '').toLowerCase(), dq = (f.dest || '').toLowerCase();
    const sp = new Set(D.clickPages.filter(p => !on(f, 'site') || p.site === f.site).map(p => p.url));
    return D.links.filter(l => sp.has(l.url) && (!on(f, 'url') || l.url === f.url) &&
      (!lq || l.t.toLowerCase().includes(lq)) && (!dq || l.dest.toLowerCase().includes(dq)));
  });
}

export function pagesF(D, f, ig = {}) {
  return memo(D.clickPages, 'cp' + sig(f, ig), () => {
    let P = D.clickPages.filter(p => (!on(f, 'site') || p.site === f.site) && (ig.url || !on(f, 'url') || p.url === f.url));
    if (f.link || f.dest) { const ok = new Set(linksF(D, f).map(l => l.url)); P = P.filter(p => ok.has(p.url)); }
    return P;
  });
}
