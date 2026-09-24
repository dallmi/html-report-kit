import { filterVids } from '../services/filter.js';
import { sum, mean } from '../services/aggregate.js';
import { periodLabel, trendBlocks, sparkSeries } from '../services/period.js';
import { dRate, dCount, dPts, dTxt } from '../services/metrics.js';
import { fmt, full, pct, esc, trunc, MN } from '../services/format.js';

const compOf = q => { const a = sum(q, x => x.c1); return a ? sum(q, x => x.c100) / a : null; };

export function build(ctx, s) {
  const { CUR, PRV, PY, B } = ctx, Y = B.Y, f = s.vd, opt = { period: s.period, cutoff: B.CUTOFF }, ytd = { period: 'ytd', cutoff: B.CUTOFF };
  const V = filterVids(CUR.vids, f, opt), PV = PRV ? filterVids(PRV.vids, f, opt) : null;
  const c1 = sum(V, x => x.c1), c100 = sum(V, x => x.c100), comp = c1 ? c100 / c1 : null, pc1 = PV ? sum(PV, x => x.c1) : 0, pcomp = pc1 ? sum(PV, x => x.c100) / pc1 : null;
  const eng = V.length ? mean(V.map(x => x.eng)) : null, peng = PV && PV.length ? mean(PV.map(x => x.eng)) : null, views = sum(V, x => x.v), pviews = PV ? sum(PV, x => x.v) : null;
  const byM = (X, fn) => B.MONTHS.map(m => { const q = X.filter(x => x.m === m); return q.length ? fn(q) : null; });
  const VA = filterVids(CUR.vids, f, ytd), PVA = PRV ? filterVids(PRV.vids, f, ytd) : null;

  let verdict;
  if (!V.length) verdict = { empty: 'No videos match the current filters.' };
  else {
    const st = [['start', c1], ['25%', sum(V, x => x.c25)], ['50%', sum(V, x => x.c50)], ['75%', sum(V, x => x.c75)], ['end', c100]];
    let big = null;
    for (let i = 1; i < st.length; i++) { const d = (st[i - 1][1] - st[i][1]) / (c1 || 1); if (!big || d > big.d) big = { d, from: st[i - 1][0], to: st[i][0] }; }
    const dc = dRate(comp, pcomp), sg = dc ? (dc.v > 0.3 ? 1 : dc.v < -0.3 ? -1 : 0) : null, best = V.slice().sort((a, b) => b.eng - a.eng)[0];
    verdict = {
      verdict: sg == null ? 'No comparison' : sg > 0 ? 'Holding attention better' : sg < 0 ? 'Losing viewers earlier' : 'Steady', cls: sg > 0 ? 'good' : sg < 0 ? 'warn' : '',
      text: `<b>${pct(comp)}</b> of started views reached the end${dc ? ` (${dTxt(dc, PY)})` : ''}. The steepest drop is between the ${big.from} and the ${big.to} mark: <b>${pct(big.d, 0)}</b> of viewers leave there.`,
      why: `<ul><li><b>Completion</b> is measured against started views (views reaching 1%), matching the workbook.</li>
        <li><b>What to do:</b> if most viewers leave early, put the key message in the opening seconds. If they leave late, the video is probably too long.</li>
        <li><b>Engagement score</b> (${eng.toFixed(1)}) is the platform's composite of watch depth and completion. Use it to compare videos, not channels.</li></ul>
        ${best ? `<div class="rep"><b>Best performer in scope</b>${esc(trunc(best.t, 90))}: score ${best.eng.toFixed(1)}, ${pct(best.c1 ? best.c100 / best.c1 : 0, 0)} completion</div>` : ''}`,
    };
  }
  const base = c1 || 1;
  const Vn = filterVids(CUR.vids, f, { ...opt, ignore: { div: 1 } }), d = {};
  Vn.forEach(x => { const o = d[x.div] = d[x.div] || { c1: 0, c: 0, n: 0, e: 0 }; o.c1 += x.c1; o.c += x.c100; o.n++; o.e += x.eng; });
  const ow = Object.entries(d).filter(([, o]) => o.n >= 5);
  return {
    scope: periodLabel(B, s.period) + (PY ? ` · vs same period ${PY}` : ''),
    kpis: [
      { l: 'Completion rate', v: pct(comp), d: { v: dRate(comp, pcomp) }, s: 'of started views reached the end', hl: true, spark: sparkSeries(B, s.period, byM(VA, compOf), PVA ? byM(PVA, compOf) : null) },
      { l: 'Views', v: fmt(views), d: { v: dCount(views, pviews) }, s: `${full(V.length)} videos`, spark: sparkSeries(B, s.period, byM(VA, q => sum(q, x => x.v)), PVA ? byM(PVA, q => sum(q, x => x.v)) : null) },
      { l: 'Engagement score', v: eng == null ? 'n/a' : eng.toFixed(1), d: { v: dPts(eng, peng) }, s: 'platform score, higher is better', info: 'The platform\'s composite of watch depth and completion. Not a percentage. Compare videos with each other, not with other channels.' },
      { l: 'Videos published', v: full(V.length), d: { v: dCount(V.length, PV && PV.length), o: { neutral: true } }, s: 'in scope' }],
    verdict,
    funnel: {
      rows: [['Started', c1], ['25% watched', sum(V, x => x.c25)], ['50% watched', sum(V, x => x.c50)], ['75% watched', sum(V, x => x.c75)], ['Completed', c100]]
        .map(([l, x]) => ({ l, v: x / base, note: `${fmt(x)} views` })), opts: { fmt: x => pct(x, 0), rowH: 30, labelW: 120 },
    },
    trend: {
      sub: `Views of videos published each month · all months, current filters${PY ? ' · ' + Y + ' vs ' + PY : ''}`,
      cats: B.MONTHS.map(m => MN[m]),
      series: [{ name: String(Y), v: byM(VA, q => sum(q, x => x.v)), cls: 'cur' }].concat(PVA ? [{ name: String(PY), v: byM(PVA, q => sum(q, x => x.v)), cls: 'prev' }] : []),
      opts: { zero: true, blocks: trendBlocks(B, s.period), h: 190 },
    },
    legend: { cur: Y, prev: PY, hasPrev: !!PRV, partial: !!B.PARTIAL },
    table: {
      rows: V.slice().sort((a, b) => b.v - a.v),
      cols: [{ h: 'Video', cls: 't', f: r => `${esc(r.t)}<span class="s">${esc(r.div)} · ${esc(r.lang)}</span>` }, { h: 'Published', f: r => MN[r.m] },
        { h: 'Views', num: 1, f: r => full(r.v) }, { h: 'Started', num: 1, f: r => full(r.c1) }, { h: 'Completion', num: 1, f: r => pct(r.c1 ? r.c100 / r.c1 : 0, 0) }, { h: 'Engagement', num: 1, f: r => (r.eng || 0).toFixed(1) }],
    },
    byOwner: { rows: ow.map(([l, o]) => ({ l, v: o.c1 ? o.c / o.c1 : 0, n: o.n })).sort((a, b) => b.v - a.v), opts: { fmt: x => pct(x, 0), labelW: 190, sel: f.div !== 'all' ? f.div : null }, toggle: ['vd', 'div'] },
    engByOwner: { rows: ow.map(([l, o]) => ({ l, v: o.e / o.n, n: o.n })).sort((a, b) => b.v - a.v), opts: { fmt: x => x.toFixed(1), labelW: 190 } },
    csv: () => ({ name: 'video', rows: [['video', 'owner', 'language', 'month', 'views', 'started_views', 'completions', 'engagement']]
      .concat(V.map(v => [v.t, v.div, v.lang, MN[v.m], v.v, v.c1, v.c100, v.eng])) }),
  };
}
