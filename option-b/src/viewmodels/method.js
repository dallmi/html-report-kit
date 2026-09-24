/* "Method & data quality" drawer: definitions and scope checks for the active tab. */
import { filterMail, filterArts, filterVids, pgLevelF, pgSplitF, pagesF, linksF } from '../services/filter.js';
import { mailAgg, sum } from '../services/aggregate.js';
import { periodLabel } from '../services/period.js';
import { fmt, full, pct, esc, MN } from '../services/format.js';
import { ML0, NAMES, DATED } from './filters.js';

const chk = rows => `<div class="chk">${rows.map(([l, v, ok]) => `<div><span>${ok != null ? `<i class="rag ${ok ? 'ok' : 'warn'}"></i>` : ''}${l}</span><b>${v}</b></div>`).join('')}</div>`;

export function build(ctx, s) {
  const { D, CUR, PRV, PY, B, PEER } = ctx, t = s.tab, opt = { period: s.period, cutoff: B.CUTOFF };
  let h = `<div class="ds" style="border-top:0;padding-top:0"><p>Tab: <b>${esc(NAMES[t])}</b> &middot; ${esc(DATED[t] ? periodLabel(B, s.period) : 'undated export')}</p></div>`;
  if (t === 'summary' || t === 'email' || t === 'explore') {
    const rows = filterMail(CUR.ml, t === 'summary' ? ML0 : s.ml, opt), a = mailAgg(rows);
    h += `<div class="ds"><h5>Rate method</h5><div class="radio">
      <label><input type="radio" name="meth" value="w"${s.method === 'w' ? ' checked' : ''}><span><b>Volume-weighted</b> (recommended) &mdash; all opens &divide; all emails sent. The share of the audience that actually opened. Matches the workbook's Dashboard sheet.</span></label>
      <label><input type="radio" name="meth" value="s"${s.method === 's' ? ' checked' : ''}><span><b>Simple average</b> &mdash; mean of the per-mailing % columns. Reconciles row by row with the file, but many tiny mailings can push it up.</span></label></div>
      <div class="mrow"><div><div class="t1">Weighted</div><div class="v1">${pct(a.wOpen)} open &middot; ${pct(a.wCto)} CTO</div></div><div><div class="t1">Simple average</div><div class="v1">${pct(a.open)} open &middot; ${pct(a.cto)} CTO</div></div></div>
      <p>Click-through (share of all recipients who clicked): weighted ${pct(a.wCtr, 2)} = open rate &times; click-to-open exactly. The simple-average click-through (${pct(a.ctr, 2)}) is averaged per mailing, so it does <b>not</b> equal ${pct(a.open)} &times; ${pct(a.cto)}.</p></div>
      <div class="ds"><h5>Scope checks</h5>${chk([['Mailings in scope', `${full(rows.length)} / ${full(CUR.ml.length)}`],
      ['Blank open % (skipped in simple average)', full(a.n - a.nOpen), a.n === a.nOpen], ['Blank CTO % (skipped in simple average)', full(a.n - a.nCto), a.n === a.nCto],
      ['Prior-year mailings loaded', PRV ? full(PRV.ml.length) : 'none', !!PRV]])}</div>
      <div class="ds"><h5>Benchmarks</h5><p><b>vs ${PY || 'prior year'}</b>: same filters, same months of the prior year. Changes under ±0.3 pp count as steady.</p>
      <p><b>vs peers</b>: each mailing against the median of mailings with the same content type and audience size band this year (${Object.keys(PEER).length} peer groups).</p></div>`;
  }
  if (t === 'articles') {
    const A = filterArts(CUR.arts, s.ar, opt);
    h += `<div class="ds"><h5>Why there is no total for unique visitors</h5><p>Unique visitors can't be added across articles: someone who reads three articles would count three times. They're shown per article and used for reach, never summed. A de-duplicated total would have to come from the source platform.</p></div>
      <div class="ds"><h5>Reach</h5><p>Reach = unique visitors &divide; internal headcount (Geduld) of the <b>publishing month</b>, computed once in the build step. Articles without a headcount for their month show “—”.</p>
<p>v2 measured the “best reach” KPI against a separately chosen reference month, so the same article could show two different reach figures on one screen. v3 always uses the publishing month.</p></div>
      <div class="ds"><h5>Scope checks</h5>${chk([['Articles in scope', `${full(A.length)} / ${full(CUR.arts.length)}`], ['Sum of unique visitors', 'suppressed — not additive', false], ['Prior-year articles loaded', PRV ? full(PRV.arts.length) : 'none', !!PRV]])}</div>`;
  }
  if (t === 'video') {
    const V = filterVids(CUR.vids, s.vd, opt);
    h += `<div class="ds"><h5>Definitions</h5><p><b>Completion rate</b> = views reaching 100% &divide; started views (views reaching 1%), matching the workbook.</p>
      <p><b>Engagement score</b> is the platform's composite of watch depth and completion. Higher is better; it isn't a percentage. Compare videos with each other, not with other channels.</p></div>
      <div class="ds"><h5>Scope checks</h5>${chk([['Videos in scope', `${full(V.length)} / ${full(CUR.vids.length)}`], ['Tracking ID / pack', 'not in the video export', false], ['Published after the data cut-off (excluded)', full(CUR.vids.filter(x => x.m > B.CUTOFF).length), !CUR.vids.some(x => x.m > B.CUTOFF)], ['Prior-year videos loaded', PRV ? full(PRV.vids.length) : 'none', !!PRV]])}</div>`;
  }
  if (t === 'pages') {
    const P = pgLevelF(D, s.pg), pv = sum(P, x => x.v), cv = sum(D.clickPages, x => x.v);
    h += `<div class="ds"><h5>Period basis</h5><p>The page-level export is a period total without dates, so the period filter and year-on-year comparison don't apply. YTD columns are kept in the CSV export.</p>
      <p>Visitor division and region filters restrict every view on the tab to pages visited by that audience.</p></div>
      <div class="ds"><h5>Reconciliation with Link clicks</h5><p>Pages uses the page-level export (${full(D.pgLevel.length)} pages, ${fmt(sum(D.pgLevel, x => x.v))} views). Link clicks uses the click-tracking export (${full(D.clickPages.length)} pages, ${fmt(cv)} views). They cover different page sets, so totals differ by design.</p></div>
      <div class="ds"><h5>Scope checks</h5>${chk([['Pages in scope', `${full(P.length)} / ${full(D.pgLevel.length)}`], ['Views in scope', fmt(pv)], ['Division split rows', full(pgSplitF(D.pgDiv, D, s.pg, { ignore: { vdiv: 1 } }).length)], ['Region split rows', full(pgSplitF(D.pgReg, D, s.pg, { ignore: { vreg: 1 } }).length)]])}</div>`;
  }
  if (t === 'clicks') {
    const P = pagesF(D, s.cl), L = linksF(D, s.cl);
    h += `<div class="ds"><h5>Definitions (formerly CTVR / UCTUVR)</h5><p><b>Click rate per view</b> = clicks &divide; page views (was CTVR). How much clicking the page generates overall.</p>
      <p><b>Visitors who clicked</b> = unique clickers &divide; unique visitors (was UCTUVR). The share of people who acted at least once.</p>
      <p>When clicks per view is far above visitors who clicked, a smaller group is clicking repeatedly.</p></div>
      <div class="ds"><h5>Period basis</h5><p>Click tracking is a cumulative export with no date dimension, so the period filter and year-on-year comparison don't apply.</p></div>
      <div class="ds"><h5>Scope checks</h5>${chk([['Pages in scope', `${full(P.length)} / ${full(D.clickPages.length)}`], ['Links in scope', `${full(L.length)} / ${full(D.links.length)}`], ['Downloads on destination links', sum(L, x => x.d) ? full(sum(L, x => x.d)) : 'all zero — column hidden', !!sum(L, x => x.d)]])}</div>`;
  }
  if (t === 'summary') h += `<div class="ds"><h5>Comparison basis</h5><p>Every change is against the same months of ${PY || 'the prior year'}. ${B.PARTIAL ? `${MN[B.PARTIAL]} is a partial month (data to ${B.AS_OF.getDate()} ${MN[B.PARTIAL]}); monthly charts shade it and sparklines leave it out.` : ''}</p>
    <p><b>Data files:</b> ${esc(ctx.M.sources.bridge)}${ctx.M.sources.packs ? ' &middot; packs: ' + esc(ctx.M.sources.packs) : ''}, generated ${esc(ctx.M.generated_at)}. Production needs the ${PY || 'prior-year'} email, article and video exports in the same schema.</p>
    <p>Pages and Link clicks exports have no dates, so the Summary shows them without a comparison.</p></div>`;
  h += `<div class="ds"><h5>Export</h5><p>Download the rows behind this tab with the current filters.</p><button class="btn" id="bCsv">Export CSV</button></div>`;
  return h;
}
