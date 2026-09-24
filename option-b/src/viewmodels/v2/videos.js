import { filterVids } from '../../services/filter.js';
import { uniq, sum } from '../../services/aggregate.js';
import { fmt2 as fmt, pct2 as pct, full, esc, MN } from '../../services/format.js';
import { miniBar } from '../../components/v2/blocks.js';
import { interpVideo } from './interpret.js';

export function build(ctx, s) {
  const { CUR } = ctx, V = filterVids(CUR.vids, s.vd), v = sum(V, x => x.v), uv = sum(V, x => x.uv);
  const c100 = sum(V, x => x.c100), c1 = sum(V, x => x.c1), eng = V.length ? sum(V, x => x.eng) / V.length : 0;
  const gc1 = sum(CUR.vids, x => x.c1), gc100 = sum(CUR.vids, x => x.c100);
  const months = uniq(V.map(x => x.m)), base = c1 || 1;
  const d = {}; V.forEach(x => { const o = d[x.div] = d[x.div] || { c1: 0, c: 0, n: 0, e: 0 }; o.c1 += x.c1; o.c += x.c100; o.n++; o.e += x.eng; });
  const rows = V.slice().sort((a, b) => b.v - a.v).slice(0, 30), mx = Math.max(...rows.map(r => r.v), 1);
  return {
    kpis: [
      { l: 'Videos in scope', v: full(V.length), s: 'assets', hl: true },
      { l: 'Video views', v: fmt(v), s: `${fmt(uv)} unique visitors` },
      { l: 'Started views', v: fmt(c1), s: 'views reaching 1%' },
      { l: 'Completions', v: fmt(c100), s: 'views at 100%' },
      { l: 'Completion rate', v: pct(c1 ? c100 / c1 : 0), s: 'of started views' },
      { l: 'Avg engagement score', v: eng.toFixed(1), s: 'platform metric' }],
    val: [{ l: 'Rows in scope', v: `${full(V.length)} / ${full(CUR.vids.length)}` },
      { l: 'Completion basis', v: 'views at 1% (started)', tag: 'ok', tagTxt: 'matches workbook' },
      { l: 'Group benchmark', v: pct(gc1 ? gc100 / gc1 : 0) }],
    interp: interpVideo(V, CUR.vids),
    trend: { cats: months.map(m => MN[m]), A: months.map(m => sum(V.filter(x => x.m === m), x => x.v)), B: months.map(m => sum(V.filter(x => x.m === m), x => x.c100)), opts: { labelA: 'Views', labelB: 'Completions' } },
    funnel: [['Started (1%)', c1], ['25% watched', sum(V, x => x.c25)], ['50% watched', sum(V, x => x.c50)], ['75% watched', sum(V, x => x.c75)], ['Completed', c100]]
      .map(([l, x]) => ({ l, v: x / base, note: `${fmt(x)} views` })),
    byOwner: Object.entries(d).filter(([, o]) => o.n >= 5).map(([l, o]) => ({ l, v: o.c1 ? o.c / o.c1 : 0, note: `${o.n} videos · ${fmt(o.c1)} started` })).sort((a, b) => b.v - a.v),
    engByOwner: Object.entries(d).filter(([, o]) => o.n >= 5).map(([l, o]) => ({ l, v: o.e / o.n, note: `${o.n} videos` })).sort((a, b) => b.v - a.v),
    table: '<thead><tr><th>Video</th><th>Owner</th><th>Lang</th><th>Month</th><th class="num">Views</th><th class="num">Started</th><th class="num">Completion</th><th class="num">Engagement</th></tr></thead><tbody>' +
      rows.map(r => `<tr><td class="t">${esc(r.t)}${miniBar(r.v, mx)}</td><td>${esc(r.div)}</td><td>${esc(r.lang)}</td><td>${MN[r.m]}</td>
    <td class="num">${full(r.v)}</td><td class="num">${full(r.c1)}</td><td class="num">${pct(r.c1 ? r.c100 / r.c1 : 0, 0)}</td><td class="num">${(r.eng || 0).toFixed(1)}</td></tr>`).join('') + '</tbody>',
    csv: () => ({ name: 'videos', rows: [['video', 'owner', 'language', 'month', 'views', 'started_views', 'completions', 'completion_rate_of_started_pct', 'engagement']]
      .concat(V.map(x => [x.t, x.div, x.lang, MN[x.m], x.v, x.c1, x.c100, (x.c1 ? x.c100 / x.c1 * 100 : 0).toFixed(2), (x.eng || 0).toFixed(2)])) }),
  };
}
