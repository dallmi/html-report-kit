import { filterMail } from '../../services/filter.js';
import { mailAgg, groupMail, uniq } from '../../services/aggregate.js';
import { fmt2 as fmt, pct2 as pct, full, esc, trunc, MN } from '../../services/format.js';
import { miniBar } from '../../components/v2/blocks.js';
import { interpMail, methodBox } from './interpret.js';
import { mailCsv2 } from './csv.js';

export function build(ctx, s) {
  const { CUR } = ctx, rows = filterMail(CUR.ml, s.ml), a = mailAgg(rows);
  const byM = groupMail(rows, 'month', { monthKey: m => MN[m] }), order = uniq(CUR.ml.map(r => r.m)).map(m => MN[m]);
  const trend = order.map(l => byM.find(r => r.l === l) || { l, open: null, cto: null });
  return {
    kpis: [
      { l: 'Mailings sent', v: full(a.ms), s: `${full(rows.length)} records`, hl: true },
      { l: 'Emails sent', v: fmt(a.es), s: `avg ${full(a.ms ? a.es / a.ms : 0)} per mailing` },
      { l: 'Open rate', v: pct(a.open), s: `simple avg of ${full(a.nOpen)} mailings` },
      { l: 'Click-to-open', v: pct(a.cto), s: `simple avg of ${full(a.nCto)} mailings` },
      { l: 'Click-through', v: pct(a.ctr, 2), s: `simple avg of ${full(a.nCtr)} mailings` },
      { l: 'Unique clicks', v: fmt(a.uc), s: 'sum of #unique clicks' }],
    val: [{ l: 'Rows in scope', v: `${full(rows.length)} / ${full(CUR.ml.length)}` },
      { l: 'Blank open %', v: full(a.n - a.nOpen), tag: a.n - a.nOpen ? 'warn' : 'ok', tagTxt: a.n - a.nOpen ? 'excluded from average' : 'none' },
      { l: 'Blank CTO %', v: full(a.n - a.nCto), tag: a.n - a.nCto ? 'warn' : 'ok', tagTxt: a.n - a.nCto ? 'excluded from average' : 'none' },
      { l: 'Method', v: 'Simple average' }],
    interp: interpMail(a), method: methodBox(a),
    rates: { cats: trend.map(r => r.l), A: trend.map(r => r.open), B: trend.map(r => r.cto), opts: { fmtAxis: v => pct(v, 0), fmtTip: v => pct(v), labelA: 'Open rate', labelB: 'Click-to-open' } },
    bands: groupMail(rows, 'cl').filter(r => r.ms >= 5 && r.open != null).sort((x, y) => (x.es / x.ms) - (y.es / y.ms)).map(r => ({ l: r.l, x: r.ms ? r.es / r.ms : 0, y: r.open, r: r.ms })),
    byType: groupMail(rows, 'ct').filter(r => r.ms >= 10 && r.open != null).sort((x, y) => y.open - x.open)
      .map(r => ({ l: r.l, v: r.open, note: `${fmt(r.es)} emails · avg of ${full(r.po.length)} mailings` })),
    byPack: groupMail(rows, 'pk').filter(r => r.l !== '(No pack)' && r.ms >= 2 && r.cto != null).sort((x, y) => y.cto - x.cto)
      .map(r => ({ l: r.l, v: r.cto, note: `${full(r.ms)} mailings · ${fmt(r.es)} emails · open ${pct(r.open)}` })),
    table: table(ctx, s),
    csv: () => mailCsv2(ctx, s.ml, 'div', 'mailings'),
  };
}

/* league table: top 40 of the scope, sorted by the clicked column (s.mlSort) */
export function table(ctx, s) {
  const srt = s.mlSort;
  let rows = filterMail(ctx.CUR.ml, s.ml).map(r => ({ t: r.t, div: r.div, ct: r.ct, m: r.m, pk: r.pk || '—', tcl: r.tcl || '—', es: r.es, uc: r.uc, open: r.po, cto: r.pc }));
  rows.sort((x, y) => { const A = x[srt.k], B = y[srt.k]; if (A == null) return 1; if (B == null) return -1; return (A > B ? 1 : A < B ? -1 : 0) * srt.dir; });
  rows = rows.slice(0, 40); const mx = Math.max(...rows.map(r => r.es), 1);
  const cols = [['t', 'Title'], ['div', 'Division'], ['ct', 'Type'], ['pk', 'Pack'], ['tcl', 'Cluster'], ['m', 'Month'],
    ['es', 'Emails', 'num'], ['open', 'Open', 'num'], ['cto', 'CTO', 'num'], ['uc', 'Unique clicks', 'num']];
  return '<thead><tr>' + cols.map(c => `<th class="sortable ${c[2] || ''}" data-k="${c[0]}">${c[1]}${srt.k === c[0] ? (srt.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map(r => `<tr><td class="t">${esc(r.t)}${miniBar(r.es, mx)}</td><td>${esc(r.div)}</td><td><span class="tag">${esc(r.ct)}</span></td>
    <td class="t" title="${esc(r.pk)}">${esc(trunc(r.pk, 34))}</td><td class="t" title="${esc(r.tcl)}">${esc(trunc(r.tcl, 22))}</td><td>${MN[r.m]}</td>
    <td class="num">${full(r.es)}</td><td class="num">${pct(r.open)}</td><td class="num">${pct(r.cto)}</td><td class="num">${full(r.uc)}</td></tr>`).join('') + '</tbody>';
}
