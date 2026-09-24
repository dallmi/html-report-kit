import { filterMail, filterArts, filterVids } from '../../services/filter.js';
import { mailAgg, groupMail, uniq, sum } from '../../services/aggregate.js';
import { fmt2 as fmt, pct2 as pct, full, esc, dayLabel, MN } from '../../services/format.js';
import { mailCsv2 } from './csv.js';

export function build(ctx, s) {
  const { D, CUR } = ctx, f = s.ml, rows = filterMail(CUR.ml, f), a = mailAgg(rows);
  /* the overview's article and video figures follow the mailing period and pack filters */
  const A = filterArts(CUR.arts, { q: f.q, m: f.m, pk: f.pk, tcl: f.tcl }), V = filterVids(CUR.vids, { q: f.q, m: f.m });
  const av = sum(A, x => x.v), vViews = sum(V, x => x.v), vc1 = sum(V, x => x.c1), vc = sum(V, x => x.c100), pv = sum(D.clickPages, x => x.v);
  const byM = groupMail(rows, 'month', { monthKey: m => MN[m] }), order = uniq(CUR.ml.map(r => r.m)).map(m => MN[m]);
  const trend = order.map(l => byM.find(r => r.l === l) || { l, es: 0, open: null });
  const mixTot = a.op + av + vViews + pv || 1;

  const ct = groupMail(rows, 'ct').filter(r => r.ms >= 25 && r.cto != null);
  const best = ct.slice().sort((x, y) => y.cto - x.cto)[0], worst = ct.slice().sort((x, y) => x.cto - y.cto)[0];
  const cl = groupMail(rows, 'cl').filter(r => r.ms >= 20 && r.open != null).sort((x, y) => y.open - x.open);
  const pks = groupMail(rows, 'pk').filter(r => r.l !== '(No pack)' && r.ms >= 3 && r.cto != null).sort((x, y) => y.cto - x.cto);
  const topArt = A.slice().sort((x, y) => y.v - x.v)[0], li = [];
  if (best && worst && worst.cto > 0 && best !== worst) li.push(`<b>${esc(best.l)}</b> converts best at ${pct(best.cto)} click-to-open, against <b>${esc(worst.l)}</b> at ${pct(worst.cto)} &mdash; a ${(best.cto / worst.cto).toFixed(1)}× gap on comparable volume.`);
  if (cl.length > 1) li.push(`Smaller audiences hold attention: <b>${esc(cl[0].l)}</b> opens at ${pct(cl[0].open)} versus ${pct(cl[cl.length - 1].open)} for <b>${esc(cl[cl.length - 1].l)}</b>.`);
  if (pks.length) li.push(`Best-converting pack: <b>${esc(pks[0].l)}</b> at ${pct(pks[0].cto)} click-to-open across ${full(pks[0].ms)} mailings.`);
  if (topArt) li.push(`Best-read article: <b>${esc(topArt.t)}</b> &mdash; ${fmt(topArt.v)} views, published ${esc(dayLabel(topArt.date))}.`);
  if (V.length) li.push(`Video completion is ${pct(vc1 ? vc / vc1 : 0)} of started views across ${full(V.length)} assets.`);

  return {
    kpis: [
      { l: 'Emails sent', v: fmt(a.es), s: `${full(a.ms)} mailings`, hl: true },
      { l: 'Open rate', v: pct(a.open), s: `simple avg · ${full(a.nOpen)} mailings` },
      { l: 'Click-to-open', v: pct(a.cto), s: `simple avg · ${full(a.nCto)} mailings` },
      { l: 'Unique clicks', v: fmt(a.uc), s: 'mailing data' },
      { l: 'Article views', v: fmt(av), s: `${full(A.length)} articles` },
      { l: 'Video completion', v: pct(vc1 ? vc / vc1 : 0), s: `${fmt(vViews)} views` }],
    val: [{ l: 'Mailings in scope', v: `${full(rows.length)} / ${full(CUR.ml.length)}` },
      { l: 'Articles', v: `${full(A.length)} / ${full(CUR.arts.length)}` }, { l: 'Videos', v: `${full(V.length)} / ${full(CUR.vids.length)}` },
      { l: 'Method', v: 'Simple average', tag: 'ok', tagTxt: 'reconcilable by hand' }],
    trend: { cats: trend.map(r => r.l), bars: trend.map(r => r.es), line: trend.map(r => r.open), opts: { barLabel: 'Emails sent', lineLabel: 'Open rate' } },
    mix: [{ l: 'Email opens', v: a.op, note: pct(a.op / mixTot, 1) + ' of touchpoints' },
      { l: 'Click-tracked page views', v: pv, note: pct(pv / mixTot, 1) + ' of touchpoints' },
      { l: 'Article views', v: av, note: pct(av / mixTot, 1) + ' of touchpoints' },
      { l: 'Video views', v: vViews, note: pct(vViews / mixTot, 1) + ' of touchpoints' }].sort((x, y) => y.v - x.v),
    byDiv: groupMail(rows, 'div').sort((x, y) => y.es - x.es).map(r => ({ l: r.l, v: r.es })),
    byCto: groupMail(rows, 'ct').filter(r => r.ms >= 20 && r.cto != null).sort((x, y) => y.cto - x.cto).map(r => ({ l: r.l, v: r.cto, note: `${full(r.ms)} mailings` })),
    byPack: groupMail(rows, 'pk').filter(r => r.l !== '(No pack)').sort((x, y) => y.es - x.es).map(r => ({ l: r.l, v: r.es, note: `${full(r.ms)} mailings · open ${pct(r.open)}` })),
    insights: li.length ? '<ul style="margin:6px 0 0;padding-left:18px">' + li.map(x => `<li style="margin-bottom:7px">${x}</li>`).join('') + '</ul>' : '<div class="note">No signals in the current scope.</div>',
    csv: () => mailCsv2(ctx, f, 'div', 'overview'),
  };
}
