/* Filter bar, chips and the "More filters" drawer: which controls each tab shows and their options. */
import { uniq, uniqTags } from '../services/aggregate.js';
import { periodOptions } from '../services/period.js';
import { pageTitle, trunc } from '../services/format.js';

export const ML0 = { cc: 'all', div: 'all', ct: 'all', th: 'all', tp: 'all', tm: 'all', cl: 'all', pk: 'all', tcl: 'all', tid: '' };

export const NAMES = { summary: 'Summary', email: 'Email', articles: 'Articles', pages: 'Pages', video: 'Video', clicks: 'Link clicks', explore: 'Explore' };

/* per tab: namespace, up to three primary filters in the bar, the rest in the drawer */
export const FSPEC = {
  summary: { ns: null, p: [], m: [] },
  email: { ns: 'ml', p: ['div', 'ct', 'cl'], m: ['cc', 'th', 'tp', 'tm', 'pk', 'tcl', 'tid'] },
  explore: { ns: 'ml', p: ['div', 'ct', 'cl'], m: ['cc', 'th', 'tp', 'tm', 'pk', 'tcl', 'tid'] },
  articles: { ns: 'ar', p: ['th', 'ch', 'ts'], m: ['au', 'ov', 'tp', 'rg', 'pk', 'tcl', 'name'] },
  video: { ns: 'vd', p: ['div', 'lang'], m: ['name'] },
  pages: { ns: 'pg', p: ['site', 'vdiv', 'vreg'], m: ['div', 'ct', 'th', 'tp', 'org', 'rg'] },
  clicks: { ns: 'cl', p: ['site', 'url'], m: ['dest', 'link'] },
};
/* tabs whose data has dates; Pages and Link clicks are undated exports */
export const DATED = { summary: 1, email: 1, explore: 1, articles: 1, video: 1 };

const vv = v => [v, v];
export function filterDefs({ D, CUR }) {
  const ml = CUR.ml, arts = CUR.arts, vids = CUR.vids, col = k => ml.map(r => r[k]);
  return {
    'ml.cc': { l: 'Corp Comms scope', o: () => uniq(col('cc')).map(vv) },
    'ml.div': { l: 'Division', o: () => uniq(col('div')).map(vv) },
    'ml.ct': { l: 'Content type', o: () => uniq(col('ct')).map(vv) },
    'ml.cl': { l: 'Audience size', o: () => uniq(col('cl')).map(vv) },
    'ml.th': { l: 'Theme', hint: 'any match', o: () => uniqTags(col('th')).map(vv) },
    'ml.tp': { l: 'Topic', hint: 'any match', o: () => uniqTags(col('tp')).map(vv) },
    'ml.tm': { l: 'Template', o: () => uniq(col('tm')).map(vv) },
    'ml.pk': { l: 'Pack', o: () => uniq(col('pk')).map(vv), blank: '(No pack)' },
    'ml.tcl': { l: 'Tracking ID cluster', o: () => uniq(col('tcl')).map(vv), blank: '(No tracking ID)' },
    'ml.tid': { l: 'Tracking ID', search: 'Search tracking ID…' },
    'ar.th': { l: 'Theme', o: () => uniq(arts.map(a => a.th)).map(vv) },
    'ar.ch': { l: 'News channel', o: () => uniq(arts.map(a => a.ch)).map(vv) },
    'ar.ts': { l: 'Top story', o: () => [['Yes', 'Top stories only']] },
    'ar.au': { l: 'Author', o: () => uniq(arts.map(a => a.au)).map(vv) },
    'ar.ov': { l: 'Overtitle', o: () => uniq(arts.map(a => a.ov)).map(vv) },
    'ar.tp': { l: 'Topic tag', hint: 'any match', o: () => uniqTags(arts.map(a => a.tp)).map(vv) },
    'ar.rg': { l: 'Region (personalisation)', o: () => uniq(arts.map(a => a.rg)).map(vv) },
    'ar.pk': { l: 'Pack', o: () => uniq(arts.map(a => a.pk)).map(vv), blank: '(No pack)' },
    'ar.tcl': { l: 'Tracking ID cluster', o: () => uniq(arts.map(a => a.tcl)).map(vv), blank: '(No tracking ID)' },
    'ar.name': { l: 'Article', o: () => uniq(arts.map(a => a.t)).map(vv) },
    'vd.div': { l: 'Owner', o: () => uniq(vids.map(v => v.div)).map(vv) },
    'vd.lang': { l: 'Language', o: () => uniq(vids.map(v => v.lang)).map(vv) },
    'vd.name': { l: 'Video name', search: 'Search video name…' },
    'pg.site': { l: 'Site', o: () => uniq(D.pgLevel.map(p => p.site)).map(vv) },
    'pg.vdiv': { l: 'Visitor division', o: () => uniq(D.pgDiv.map(p => p.sp)).map(vv) },
    'pg.vreg': { l: 'Visitor region', o: () => uniq(D.pgReg.map(p => p.sp)).map(vv) },
    'pg.div': { l: 'Owning division', o: () => uniq(D.pgLevel.map(p => p.div)).map(vv) },
    'pg.ct': { l: 'Content type', o: () => uniq(D.pgLevel.map(p => p.ct)).map(vv) },
    'pg.th': { l: 'Theme', o: () => uniq(D.pgLevel.map(p => p.th)).map(vv) },
    'pg.tp': { l: 'Topic tag', hint: 'any match', o: () => uniqTags(D.pgLevel.map(p => p.tp)).map(vv) },
    'pg.org': { l: 'Target organisation', o: () => uniq(D.pgLevel.map(p => p.org)).map(vv) },
    'pg.rg': { l: 'Target region', o: () => uniq(D.pgLevel.map(p => p.rg)).map(vv) },
    'cl.site': { l: 'Site', o: () => uniq(D.clickPages.map(p => p.site)).map(vv) },
    'cl.url': { l: 'Page', o: () => D.clickPages.slice().sort((a, b) => a.p.localeCompare(b.p)).map(p => [p.url, p.p]) },
    'cl.dest': { l: 'Destination contains', search: 'e.g. learning…' },
    'cl.link': { l: 'Link title contains', search: 'Search link title…' },
  };
}

export const isOn = (s, ns, k) => { const v = s[ns][k]; return v != null && v !== '' && v !== 'all'; };
export const resetValue = (defs, ns, k) => defs[ns + '.' + k].search ? '' : 'all';

const control = (defs, s, ns, k) => {
  const d = defs[ns + '.' + k];
  return { ns, k, label: d.l, hint: d.hint, search: d.search, blank: d.blank, value: s[ns][k], options: d.search ? null : d.o() };
};

export function filterBar(ctx, defs, s) {
  const sp = FSPEC[s.tab], dated = !!DATED[s.tab];
  return {
    period: { value: s.period, disabled: !dated, options: periodOptions(ctx.B).map(([v, l]) => [v, `${l} ${ctx.B.Y}`]) },
    note: dated ? (ctx.PY ? `Compared with the same period ${ctx.PY}` : 'No prior-year data loaded') : 'This export has no dates &mdash; figures are period totals',
    controls: sp.ns ? sp.p.map(k => control(defs, s, sp.ns, k)) : [],
    more: sp.ns && sp.m.length ? { count: sp.m.filter(k => isOn(s, sp.ns, k)).length } : null,
  };
}

export function chips(defs, s) {
  const sp = FSPEC[s.tab];
  if (!sp.ns) return { ns: null, items: [] };
  return {
    ns: sp.ns, all: [...sp.p, ...sp.m],
    items: [...sp.p, ...sp.m].filter(k => isOn(s, sp.ns, k)).map(k => {
      const d = defs[sp.ns + '.' + k], v = s[sp.ns][k];
      const txt = v === '__blank__' ? d.blank : (d.search ? `“${v}”` : (k === 'url' ? pageTitle(v) : v));
      return { k, label: d.l, text: trunc(txt, 40) };
    }),
  };
}

export function drawerFilters(defs, s) {
  const sp = FSPEC[s.tab];
  return { tab: NAMES[s.tab], controls: sp.ns ? sp.m.map(k => control(defs, s, sp.ns, k)) : [] };
}
