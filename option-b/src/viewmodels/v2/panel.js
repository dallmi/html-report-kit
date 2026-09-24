/* index2.html control panel: every tab exposes the slicers that belong to its dataset. */
import { uniq, uniqTags } from '../../services/aggregate.js';
import { filterMail, filterArts, filterVids, pagesF, pgLevelF } from '../../services/filter.js';
import { full, trunc, MN } from '../../services/format.js';

export const NAMES = { overview: 'Overview', mailings: 'Mailings · iMEP', articles: 'Articles · Intranet', pages: 'Pages', videos: 'Videos', clicks: 'Click tracking', breakdown: 'Mailings breakdown' };
const NA_VID = 'Not captured in the video export', NA_CLK = 'Not captured in the click-tracking export';
const vv = v => [v, v];

export function panelSpec({ D, CUR, Y }) {
  const ml = CUR.ml, arts = CUR.arts, vids = CUR.vids, col = k => ml.map(r => r[k]);
  const PK_ML = uniq(col('pk').filter(p => p)), PK_AR = uniq(arts.map(a => a.pk).filter(p => p));
  const TCL_ML = uniq(col('tcl').filter(p => p)), TCL_AR = uniq(arts.map(a => a.tcl).filter(p => p));
  const month = v => [v, MN[v] + ' ' + Y], quarter = v => [v, 'Q' + v];
  const SPEC = {
    overview: [
      { ns: 'ml', k: 'q', label: 'Quarter', opts: () => uniq(col('q')).map(quarter) },
      { ns: 'ml', k: 'm', label: 'Month', opts: () => uniq(col('m')).map(month) },
      { ns: 'ml', k: 'cc', label: 'Corp Comms scope', opts: () => uniq(col('cc')).map(vv) },
      { ns: 'ml', k: 'div', label: 'Division', hint: 'KPI reporting', opts: () => uniq(col('div')).map(vv) },
      { ns: 'ml', k: 'tcl', label: 'Tracking ID cluster', opts: () => TCL_ML.map(vv), blank: '(No tracking ID)' },
      { ns: 'ml', k: 'pk', label: 'Tracking ID pack', opts: () => PK_ML.map(vv), blank: '(No pack)' },
      { ns: 'ml', k: 'cl', label: 'Audience size', opts: () => uniq(col('cl')).map(vv) }],
    mailings: [
      { ns: 'ml', k: 'q', label: 'Quarter', opts: () => uniq(col('q')).map(quarter) },
      { ns: 'ml', k: 'm', label: 'Month', opts: () => uniq(col('m')).map(month) },
      { ns: 'ml', k: 'cc', label: 'Corp Comms scope', opts: () => uniq(col('cc')).map(vv) },
      { ns: 'ml', k: 'div', label: 'Division', hint: 'KPI reporting', opts: () => uniq(col('div')).map(vv) },
      { ns: 'ml', k: 'ct', label: 'Content type', opts: () => uniq(col('ct')).map(vv) },
      { ns: 'ml', k: 'th', label: 'Theme', hint: 'any match', opts: () => uniqTags(col('th')).map(vv) },
      { ns: 'ml', k: 'tp', label: 'Topic', hint: 'any match', opts: () => uniqTags(col('tp')).map(vv) },
      { ns: 'ml', k: 'tm', label: 'Template', opts: () => uniq(col('tm')).map(vv) },
      { ns: 'ml', k: 'cl', label: 'Audience size', hint: 'recipients per mailing', opts: () => uniq(col('cl')).map(vv) },
      { ns: 'ml', k: 'tcl', label: 'Tracking ID cluster', opts: () => TCL_ML.map(vv), blank: '(No tracking ID)' },
      { ns: 'ml', k: 'pk', label: 'Tracking ID pack', opts: () => PK_ML.map(vv), blank: '(No pack)' },
      { ns: 'ml', k: 'tid', label: 'Tracking ID', type: 'search', ph: 'Search tracking ID…' }],
    articles: [
      { ns: 'ar', k: 'name', label: 'Article name', opts: () => uniq(arts.map(a => a.t)).map(vv) },
      { ns: 'ar', k: 'au', label: 'Author', opts: () => uniq(arts.map(a => a.au)).map(vv) },
      { ns: 'ar', k: 'q', label: 'Quarter', opts: () => uniq(arts.map(a => a.q)).map(quarter) },
      { ns: 'ar', k: 'm', label: 'Month (published)', opts: () => uniq(arts.map(a => a.m)).map(month) },
      { ns: 'ar', k: 'ov', label: 'Overtitle', opts: () => uniq(arts.map(a => a.ov)).map(vv) },
      { ns: 'ar', k: 'th', label: 'Theme tag', opts: () => uniq(arts.map(a => a.th)).map(vv) },
      { ns: 'ar', k: 'tp', label: 'Topic tag', hint: 'any match', opts: () => uniqTags(arts.map(a => a.tp)).map(vv) },
      { ns: 'ar', k: 'ts', label: 'Top story', opts: () => uniq(arts.map(a => a.ts)).map(vv) },
      { ns: 'ar', k: 'rg', label: 'Region (personalization)', opts: () => uniq(arts.map(a => a.rg)).map(vv) },
      { ns: 'ar', k: 'ch', label: 'News channel', opts: () => uniq(arts.map(a => a.ch)).map(vv) },
      { ns: 'ar', k: 'tcl', label: 'Tracking ID cluster', opts: () => TCL_AR.map(vv), blank: '(No tracking ID)' },
      { ns: 'ar', k: 'pk', label: 'Tracking ID pack', opts: () => PK_AR.map(vv), blank: '(No pack)' }],
    pages: [
      { ns: 'pg', k: 'site', label: 'Site name', opts: () => uniq(D.pgLevel.map(p => p.site)).map(vv) },
      { ns: 'pg', k: 'div', label: 'Business division owner', opts: () => uniq(D.pgLevel.map(p => p.div)).map(vv) },
      { ns: 'pg', k: 'ct', label: 'Content type tag', opts: () => uniq(D.pgLevel.map(p => p.ct)).map(vv) },
      { ns: 'pg', k: 'th', label: 'Theme tag', opts: () => uniq(D.pgLevel.map(p => p.th)).map(vv) },
      { ns: 'pg', k: 'tp', label: 'Topic tag', hint: 'any match', opts: () => uniqTags(D.pgLevel.map(p => p.tp)).map(vv) },
      { ns: 'pg', k: 'org', label: 'Target organization', opts: () => uniq(D.pgLevel.map(p => p.org)).map(vv) },
      { ns: 'pg', k: 'rg', label: 'Target region', opts: () => uniq(D.pgLevel.map(p => p.rg)).map(vv) },
      { ns: 'pg', k: 'vdiv', label: 'Visitor division', hint: 'restricts all views', opts: () => uniq(D.pgDiv.map(p => p.sp)).map(vv) },
      { ns: 'pg', k: 'vreg', label: 'Visitor region', hint: 'restricts all views', opts: () => uniq(D.pgReg.map(p => p.sp)).map(vv) }],
    videos: [
      { ns: 'vd', k: 'div', label: 'Business division owner', opts: () => uniq(vids.map(v => v.div)).map(vv) },
      { ns: 'vd', k: 'q', label: 'Quarter', opts: () => uniq(vids.map(v => v.q)).map(quarter) },
      { ns: 'vd', k: 'm', label: 'Month (published)', opts: () => uniq(vids.map(v => v.m)).map(month) },
      { ns: 'vd', k: 'lang', label: 'Language', opts: () => uniq(vids.map(v => v.lang)).map(vv) },
      { ns: 'vd', k: 'name', label: 'Video name', type: 'search', ph: 'Search video name…' },
      { ns: 'vd', k: 'tcl', label: 'Tracking ID cluster', disabled: NA_VID },
      { ns: 'vd', k: 'pk', label: 'Tracking ID pack', disabled: NA_VID }],
    clicks: [
      { ns: 'cl', k: 'site', label: 'Site name', opts: () => uniq(D.clickPages.map(p => p.site)).map(vv) },
      { ns: 'cl', k: 'url', label: 'Page URL', opts: () => uniq(D.clickPages.map(p => p.url)).map(vv) },
      { ns: 'cl', k: 'dest', label: 'Destination URL', type: 'search', ph: 'Search destination URL…' },
      { ns: 'cl', k: 'link', label: 'Link title', type: 'search', ph: 'Search link title…' },
      { ns: 'cl', k: 'tcl', label: 'Tracking ID cluster', disabled: NA_CLK },
      { ns: 'cl', k: 'pk', label: 'Tracking ID pack', disabled: NA_CLK }],
  };
  SPEC.breakdown = SPEC.mailings;
  return SPEC;
}

export function panel(SPEC, s) {
  return {
    title: NAMES[s.tab] || s.tab,
    controls: (SPEC[s.tab] || []).map(f => ({ ...f, value: f.disabled ? null : s[f.ns][f.k], options: f.opts && !f.disabled ? f.opts() : null })),
  };
}

/* reset only the current tab's slicers */
export function resetPatch(SPEC, s) {
  const out = {};
  (SPEC[s.tab] || []).forEach(f => {
    if (f.disabled) return;
    out[f.ns] = out[f.ns] || { ...s[f.ns] };
    out[f.ns][f.k] = f.type === 'search' ? '' : 'all';
  });
  return out;
}

export function scopeLabel(SPEC, s, Y) {
  const b = [];
  (SPEC[s.tab] || []).forEach(f => {
    if (f.disabled) return; const v = s[f.ns][f.k]; if (!v || v === 'all') return;
    if (f.k === 'q') b.push('Q' + v); else if (f.k === 'm') b.push(MN[+v] + ' ' + Y);
    else if (v === '__blank__') b.push(f.blank || '(blank)');
    else if (f.type === 'search') b.push(`${f.label}: “${v}”`);
    else if (f.k === 'name') b.push(trunc(v, 46));
    else if (['ts', 'rg', 'lang', 'cc', 'vdiv', 'vreg', 'org', 'au'].includes(f.k)) b.push(`${f.label}: ${v}`);
    else b.push(v);
  });
  return b.length ? b.join(' · ') : `${Y} YTD · all segments`;
}

export function rowCount(ctx, s) {
  const { D, CUR } = ctx;
  if (s.tab === 'articles') return full(filterArts(CUR.arts, s.ar).length) + ' / ' + full(CUR.arts.length) + ' articles';
  if (s.tab === 'videos') return full(filterVids(CUR.vids, s.vd).length) + ' / ' + full(CUR.vids.length) + ' videos';
  if (s.tab === 'clicks') return full(pagesF(D, s.cl).length) + ' / ' + full(D.clickPages.length) + ' pages';
  if (s.tab === 'pages') return full(pgLevelF(D, s.pg).length) + ' / ' + full(D.pgLevel.length) + ' pages';
  return full(filterMail(CUR.ml, s.ml).length) + ' / ' + full(CUR.ml.length) + ' mailings';
}
