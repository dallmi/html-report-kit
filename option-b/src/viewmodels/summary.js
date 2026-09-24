import { filterMail } from '../services/filter.js';
import { mailAgg, groupMail, monthly, sum, median } from '../services/aggregate.js';
import { inPer, periodLabel, trendBlocks, sparkSeries } from '../services/period.js';
import { rate, methodLabel, dRate, dCount, dTxt, peerKey } from '../services/metrics.js';
import { fmt, full, pct, pctAx, esc, MN } from '../services/format.js';
import { ML0 } from './filters.js';
import { mailCsv } from './csv.js';

export function build(ctx, s) {
  const { D, CUR, PRV, PY, B, PEER } = ctx, Y = B.Y, R = (a, k) => rate(a, k, s.method), ml = methodLabel(s.method);
  const opt = { period: s.period, cutoff: B.CUTOFF }, all = { ...opt, ignore: { period: 1 } };
  const rows = filterMail(CUR.ml, ML0, opt), a = mailAgg(rows);
  const prow = PRV ? filterMail(PRV.ml, ML0, opt) : null, pa = PRV ? mailAgg(prow) : null;
  const allC = filterMail(CUR.ml, ML0, all), allP = PRV ? filterMail(PRV.ml, ML0, all) : null;
  const byMail = (X, fn) => X ? monthly(X, fn, B.MONTHS) : null;
  const mO = byMail(allC, r => R(r, 'open')), pO = byMail(allP, r => R(r, 'open'));
  const mC = byMail(allC, r => R(r, 'cto')), pC = byMail(allP, r => R(r, 'cto'));
  const mE = byMail(allC, r => r.es), pE = byMail(allP, r => r.es);
  const per = m => inPer(m, s.period, B.CUTOFF);
  const A = CUR.arts.filter(x => per(x.m)), PA = PRV ? PRV.arts.filter(x => per(x.m)) : null;
  const V = CUR.vids.filter(x => per(x.m)), PV = PRV ? PRV.vids.filter(x => per(x.m)) : null;
  const comp = X => { const c1 = sum(X, x => x.c1); return c1 ? sum(X, x => x.c100) / c1 : null; };
  const byM = (X, f) => B.MONTHS.map(m => { const q = X.filter(x => x.m === m); return q.length ? f(q) : null; });
  const spark = (c, p) => sparkSeries(B, s.period, c, p);

  const kpis = [
    { l: 'Email open rate', v: pct(R(a, 'open')), d: { v: dRate(R(a, 'open'), R(pa, 'open')) }, s: `${ml} · ${full(a.ms)} mailings`, hl: true, spark: spark(mO, pO) },
    { l: 'Click-to-open', v: pct(R(a, 'cto')), d: { v: dRate(R(a, 'cto'), R(pa, 'cto')) }, s: 'of openers clicked a link', spark: spark(mC, pC) },
    { l: 'Emails sent', v: fmt(a.es), d: { v: dCount(a.es, pa && pa.es), o: { neutral: true } }, s: 'volume, not a success measure', spark: spark(mE, pE) },
    { l: 'Article views', v: fmt(sum(A, x => x.v)), d: { v: dCount(sum(A, x => x.v), PA && sum(PA, x => x.v)) }, s: `${full(A.length)} articles published`,
      spark: spark(byM(CUR.arts, q => sum(q, x => x.v)), PRV ? byM(PRV.arts, q => sum(q, x => x.v)) : null) },
    { l: 'Video completion', v: pct(comp(V)), d: { v: dRate(comp(V), PV && comp(PV)) }, s: 'of started views reached the end',
      spark: spark(byM(CUR.vids, comp), PRV ? byM(PRV.vids, comp) : null) }];

  /* what changed: each signal names the tab (and filter) that explains it */
  const sig = [];
  if (PRV) {
    const gc = groupMail(rows, 'ct'), gp = groupMail(prow, 'ct');
    const mv = gc.filter(r => r.ms >= 25).map(r => { const p = gp.find(x => x.l === r.l); return p && p.ms >= 25 ? { l: r.l, c: R(r, 'cto'), d: R(r, 'cto') - R(p, 'cto'), n: r.ms } : null; })
      .filter(Boolean).sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
    if (mv && Math.abs(mv.d) >= 0.003) sig.push({ k: 'Email', t: `<b>${esc(mv.l)}</b> click-to-open ${mv.d > 0 ? 'rose' : 'fell'} ${Math.abs(mv.d * 100).toFixed(1)} pp to ${pct(mv.c)} (${full(mv.n)} mailings). The largest change of any content type.`,
      go: { tab: 'email', patch: { ml: { ...ML0, ct: mv.l } } }, cta: 'See in Email' });
    const bc = groupMail(rows, 'cl'), bp = groupMail(prow, 'cl');
    const bm = bc.filter(r => r.ms >= 25).map(r => { const p = bp.find(x => x.l === r.l); return p && p.ms >= 25 ? { l: r.l, o: R(r, 'open'), d: R(r, 'open') - R(p, 'open'), n: r.ms } : null; })
      .filter(Boolean).sort((x, y) => x.d - y.d)[0];
    if (bm && bm.d < -0.003) sig.push({ k: 'Email', t: `Audiences of <b>${esc(bm.l.replace(/^[A-E] /, ''))}</b> people opened ${Math.abs(bm.d * 100).toFixed(1)} pp less than in ${PY} (${pct(bm.o)}). The weakest audience band this year.`,
      go: { tab: 'email', patch: { ml: { ...ML0, cl: bm.l } } }, cta: 'See in Email' });
  }
  {
    let best = null;
    rows.forEach(r => {
      if (r.es < 500 || r.po == null) return;
      const pr = PEER[peerKey(r)]; if (!pr || pr.n < 10) return;
      const d = r.po - pr.o; if (!best || d > best.d) best = { r, d };
    });
    if (best) {
      const r = best.r;
      sig.push({ k: 'Email', t: `Best against its peers: <b>${esc(r.t)}</b> opened at ${pct(r.po)}, ${(best.d * 100).toFixed(1)} pp above similar ${esc(r.ct.toLowerCase())} mailings to the same audience size.`,
        go: { tab: 'email', patch: { ml: { ...ML0 }, emSort: 'bestO' } }, cta: 'See in Email' });
    }
  }
  if (V.length) {
    const st = [['start', sum(V, x => x.c1)], ['25%', sum(V, x => x.c25)], ['50%', sum(V, x => x.c50)], ['75%', sum(V, x => x.c75)], ['end', sum(V, x => x.c100)]];
    const c1 = st[0][1] || 1; let big = null;
    for (let i = 1; i < st.length; i++) { const d = (st[i - 1][1] - st[i][1]) / c1; if (!big || d > big.d) big = { d, from: st[i - 1][0], to: st[i][0] }; }
    const dc = PV ? dRate(comp(V), comp(PV)) : null;
    sig.push({ k: 'Video', t: `${pct(big.d, 0)} of viewers leave between the ${big.from} and the ${big.to} mark, the steepest drop in the curve. Completion is ${pct(comp(V))}${dc ? ` (${dTxt(dc, PY)})` : ''}.`, go: { tab: 'video' }, cta: 'See in Video' });
  }

  /* channels: one metric each, no cross-channel bars */
  const P = D.pgLevel, C = D.clickPages, uv = sum(C, x => x.uv), ucl = sum(C, x => x.ucl);
  const channels = [
    { n: 'Email', m: 'Click-to-open', v: pct(R(a, 'cto')), d: { v: dRate(R(a, 'cto'), R(pa, 'cto')) }, t: 'email' },
    { n: 'Articles', m: 'Median views per article', v: full(median(A.map(x => x.v)) || 0), d: { v: dCount(median(A.map(x => x.v)), PA && median(PA.map(x => x.v))) }, t: 'articles' },
    { n: 'Pages', m: 'Unique visitors (period total)', v: fmt(sum(P, x => x.uv)), d: { v: null, o: { na: 'Not dated — no comparison' } }, t: 'pages' },
    { n: 'Video', m: 'Completion rate', v: pct(comp(V)), d: { v: dRate(comp(V), PV && comp(PV)) }, t: 'video' },
    { n: 'Link clicks', m: 'Visitors who clicked', v: pct(uv ? ucl / uv : 0), d: { v: null, o: { na: 'Cumulative — no comparison' } }, t: 'clicks' }];

  return {
    scope: `${periodLabel(B, s.period)}${PY ? ' · compared with the same period ' + PY : ''}`,
    kpis, signals: sig.slice(0, 4), channels,
    trend: {
      sub: `${ml} · all months ${Y}${PY ? ' vs ' + PY : ''}`,
      cats: B.MONTHS.map(m => MN[m]),
      series: [{ name: String(Y), v: mO, cls: 'cur' }].concat(PRV ? [{ name: String(PY), v: pO, cls: 'prev' }] : []),
      opts: { fmt: v => pct(v), fmtAxis: pctAx, blocks: trendBlocks(B, s.period), h: 220, minSpan: 0.1 },
    },
    legend: { cur: Y, prev: PY, hasPrev: !!PRV, partial: !!B.PARTIAL },
    csv: () => mailCsv(ctx, ML0, 'div', 'summary', opt),
  };
}
