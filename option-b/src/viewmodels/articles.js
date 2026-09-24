import { filterArts } from '../services/filter.js';
import { sum, median } from '../services/aggregate.js';
import { periodLabel, trendBlocks, sparkSeries } from '../services/period.js';
import { dCount, dTxt } from '../services/metrics.js';
import { fmt, full, pct, esc, trunc, dayLabel, MN } from '../services/format.js';

/* median unique visitors by a field; list fields (topic tags) count under every tag */
const medBy = (X, key, min = 1) => {
  const g = {};
  X.forEach(a => (Array.isArray(a[key]) ? (a[key].length ? a[key] : ['(Untagged)']) : [a[key]]).forEach(k => (g[k] = g[k] || []).push(a.uv)));
  return Object.entries(g).filter(([, l]) => l.length >= min).map(([l, a]) => ({ l, v: median(a), n: a.length })).sort((x, y) => y.v - x.v);
};

export function build(ctx, s) {
  const { CUR, PRV, PY, B } = ctx, Y = B.Y, f = s.ar, opt = { period: s.period, cutoff: B.CUTOFF }, ytd = { period: 'ytd', cutoff: B.CUTOFF };
  const A = filterArts(CUR.arts, f, opt), PA = PRV ? filterArts(PRV.arts, f, opt) : null, v = sum(A, x => x.v), pv = PA ? sum(PA, x => x.v) : null;
  const med = median(A.map(x => x.v)), pmed = PA ? median(PA.map(x => x.v)) : null;
  /* reach comes from the build: unique visitors / headcount of the publishing month */
  const best = A.filter(a => a.reach != null).sort((x, y) => y.reach - x.reach)[0];
  const byM = (X, fn) => B.MONTHS.map(m => { const q = X.filter(x => x.m === m); return q.length ? fn(q) : null; });
  const cM = byM(filterArts(CUR.arts, f, ytd), q => sum(q, x => x.v)), pM = PRV ? byM(filterArts(PRV.arts, f, ytd), q => sum(q, x => x.v)) : null;

  let verdict;
  if (!A.length) verdict = { empty: 'No articles match the current filters.' };
  else {
    const d = dCount(v, pv), dm = dCount(med, pmed), top = A.slice().sort((x, y) => y.v - x.v)[0];
    const sv = dm ? (dm.v > 5 ? 1 : dm.v < -5 ? -1 : 0) : null;
    verdict = {
      verdict: sv == null ? 'No comparison' : sv > 0 ? 'More reach per article' : sv < 0 ? 'Less reach per article' : 'Steady', cls: sv > 0 ? 'good' : sv < 0 ? 'warn' : '',
      text: `<b>${fmt(v)}</b> views from ${full(A.length)} articles${d ? ` (${dTxt(d, PY)})` : ''}. The typical article drew <b>${full(med)}</b> views${dm ? ` (${dTxt(dm, PY)})` : ''}. Most read: <b>${esc(trunc(top.t, 60))}</b> with ${fmt(top.v)} views, reaching ${top.reach != null ? pct(top.reach) : 'n/a'} of headcount.`,
      why: `<ul><li><b>Total views</b> rise with the number of articles published. <b>Median views per article</b> shows whether each article works harder, so the verdict uses the median.</li>
        <li><b>Reach</b> = unique visitors ÷ internal headcount of the publishing month. Unique visitors are never added up across articles; see Method &amp; data quality.</li>
        <li>Themes are ranked by the median, so one viral article can't carry a whole theme.</li></ul>
        <div class="rep"><b>How to report it</b>“The typical article reached ${full(med)} readers${dm ? `, ${dm.v >= 0 ? 'up' : 'down'} ${Math.abs(dm.v).toFixed(0)}% on ${PY}` : ''}; the top story reached ${top.reach != null ? pct(top.reach, 0) : 'n/a'} of all employees.”</div>`,
    };
  }
  const An = filterArts(CUR.arts, f, { ...opt, ignore: { th: 1 } });
  return {
    scope: periodLabel(B, s.period) + (PY ? ` · vs same period ${PY}` : ''),
    kpis: [
      { l: 'Article views', v: fmt(v), d: { v: dCount(v, pv) }, s: 'all articles in scope', hl: true, spark: sparkSeries(B, s.period, cM, pM) },
      { l: 'Median views per article', v: full(med || 0), d: { v: dCount(med, pmed) }, s: 'the typical article, not the average' },
      { l: 'Articles published', v: full(A.length), d: { v: dCount(A.length, PA && PA.length), o: { neutral: true } }, s: 'in scope' },
      { l: 'Best reach', v: best ? pct(best.reach, 1) : 'n/a', s: best ? trunc(best.t, 34) : '—', info: 'Unique visitors of the best-reaching article ÷ internal headcount of its publishing month.' }],
    verdict,
    trend: {
      sub: `Total views of articles published each month · all months, current filters${PY ? ' · ' + Y + ' vs ' + PY : ''}`,
      cats: B.MONTHS.map(m => MN[m]),
      series: [{ name: String(Y), v: cM, cls: 'cur' }].concat(PRV ? [{ name: String(PY), v: pM, cls: 'prev' }] : []),
      opts: { zero: true, blocks: trendBlocks(B, s.period), h: 210 },
    },
    legend: { cur: Y, prev: PY, hasPrev: !!PRV, partial: !!B.PARTIAL },
    byTheme: { rows: medBy(An, 'th'), opts: { fmt: full, labelW: 170, avg: median(An.map(x => x.uv)), sel: f.th !== 'all' ? f.th : null }, toggle: ['ar', 'th'] },
    table: {
      rows: A.slice().sort((x, y) => y.v - x.v),
      cols: [{ h: 'Article', cls: 't', f: r => `${esc(r.t)}${r.ts === 'Yes' ? ' <span class="tag top">Top story</span>' : ''}<span class="s">${esc(r.ch)}</span>` },
        { h: 'Published', f: r => esc(dayLabel(r.date)) }, { h: 'Theme', f: r => esc(r.th) }, { h: 'Views', num: 1, f: r => full(r.v) }, { h: 'Unique visitors', num: 1, f: r => full(r.uv) },
        { h: 'Reach', num: 1, f: r => r.reach != null ? pct(r.reach, 1) : '—' }, { h: 'Reactions', num: 1, f: r => full(r.li + r.co) }],
    },
    byTopic: { rows: medBy(A, 'tp', 2), opts: { fmt: full, labelW: 190, limit: 8 } },
    byChannel: { rows: medBy(A, 'ch', 3), opts: { fmt: full, labelW: 200, limit: 8 } },
    byAuthor: { rows: medBy(A, 'au', 3), opts: { fmt: full, labelW: 150, limit: 8 } },
    csv: () => ({ name: 'articles', rows: [['article', 'published', 'author', 'theme', 'topic_tags', 'channel', 'pack', 'views', 'unique_visitors', 'likes', 'comments']]
      .concat(A.map(a => [a.t, dayLabel(a.date), a.au, a.th, a.tp.join('; '), a.ch, a.pk, a.v, a.uv, a.li, a.co])) }),
  };
}
