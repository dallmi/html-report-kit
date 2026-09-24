import { filterMail } from '../services/filter.js';
import { mailAgg, groupMail, monthly } from '../services/aggregate.js';
import { periodLabel, trendBlocks, sparkSeries } from '../services/period.js';
import { rate, methodLabel, dRate, dCount, dTxt, peerKey } from '../services/metrics.js';
import { fmt, full, pct, pctAx, esc, MN } from '../services/format.js';
import { mailCsv } from './csv.js';

export const SORTS = {
  bestO: ['Best opens vs peers', (x, y) => (y.dO ?? -9) - (x.dO ?? -9)],
  worstO: ['Weakest opens vs peers', (x, y) => (x.dO ?? 9) - (y.dO ?? 9)],
  bestC: ['Best clicks vs peers', (x, y) => (y.dC ?? -9) - (x.dC ?? -9)],
  size: ['Largest audience', (x, y) => y.es - x.es],
};

function verdict(a, pa, s, PY) {
  const R = (x, k) => rate(x, k, s.method), ml = methodLabel(s.method), o = R(a, 'open'), c = R(a, 'cto');
  const st = (d, t) => d == null ? null : d > t ? 1 : d < -t ? -1 : 0;
  const dO = pa && pa.n ? o - R(pa, 'open') : null, dC = pa && pa.n ? c - R(pa, 'cto') : null, sO = st(dO, 0.003), sC = st(dC, 0.003);
  let verdict, cls = '', line;
  if (sO == null || sC == null) {
    const hi = o >= 0.75, lo = o < 0.6;
    verdict = lo ? 'Attention problem' : hi ? 'Strong opens' : 'Steady'; cls = lo ? 'bad' : hi ? 'good' : '';
    line = 'no prior-year comparison available for this selection';
  } else {
    [verdict, cls, line] = {
      '1,1': ['Improving on both', 'good', 'more people opened and more of them clicked'], '1,0': ['More opens', 'good', 'attention is up, action is holding'],
      '0,1': ['More clicks', 'good', 'the content is converting better'], '0,0': ['Steady', '', 'no meaningful change on either measure'],
      '1,-1': ['Opened, not acted on', 'warn', 'more people open, but fewer click. Check the call to action'], '-1,1': ['Fewer opens, more action', 'warn', 'a smaller audience is opening, but it acts more'],
      '0,-1': ['Clicks slipping', 'warn', 'people open as before but click less'], '-1,0': ['Opens slipping', 'warn', 'fewer people open. Look at subject lines, senders and mailing frequency'],
      '-1,-1': ['Slipping on both', 'bad', 'fewer opens and fewer clicks than last year'],
    }[sO + ',' + sC];
  }
  const inTen = Math.round(o * 10), oneIn = c ? Math.round(1 / c) : 0;
  const text = `<b>${pct(o)}</b> opened${dO != null ? ` (${dTxt(dRate(o, o - dO), PY)})` : ''} and <b>${pct(c)}</b> of openers clicked${dC != null ? ` (${dTxt(dRate(c, c - dC), PY)})` : ''}: ${line}.`;
  const why = `<div class="cmp"><div><div class="m-l">Open rate</div><div class="m-v">${pct(o)}</div><div class="m-q">“Of the people we sent to, how many opened?”</div><div class="m-f">Did the message earn attention? · ${ml}</div></div>
    <div><div class="m-l">Click-to-open</div><div class="m-v">${pct(c)}</div><div class="m-q">“Of the people who opened, how many clicked?”</div><div class="m-f">Did the content earn action? · ${ml}</div></div></div>
    <ul><li><b>Read them together.</b> A mailing can succeed on one and fail on the other. Announcements and FYI mails often have low click-to-open by design.</li>
    <li><b>Judge a mailing within its class.</b> A 70% open rate to 130,000 people is a different achievement from 70% to 13. Use the peer comparison below.</li>
    <li><b>Click-through</b> (share of all recipients who clicked) is ${pct(R(a, 'ctr'), 2)}${s.method === 'w' ? ' = open rate × click-to-open' : '. Under the simple average it is averaged per mailing, so it does not equal open × click-to-open'}.</li>
    <li><b>Verdict basis:</b> same filters and months in ${PY || 'the prior year'}; changes under ±0.3 pp count as steady.</li></ul>
    <div class="rep"><b>How to report it</b>“${inTen} in 10 opened, and 1 in ${oneIn || '–'} of those clicked through${dO != null ? `, ${dO >= 0 ? 'up' : 'down'} ${Math.abs(dO * 100).toFixed(1)} points on opens versus ${PY}` : ''}.”</div>`;
  return { verdict, cls, text, why };
}

const dpp = d => d == null ? '—' : `<span class="dl ${Math.abs(d) < 0.005 ? 'flat' : d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${(d * 100).toFixed(1)} pp</span>`;

export function build(ctx, s) {
  const { CUR, PRV, PY, B, PEER } = ctx, Y = B.Y, f = s.ml, R = (a, k) => rate(a, k, s.method), ml = methodLabel(s.method);
  const opt = { period: s.period, cutoff: B.CUTOFF }, all = { ...opt, ignore: { period: 1 } };
  const rows = filterMail(CUR.ml, f, opt), a = mailAgg(rows);
  const pa = PRV ? mailAgg(filterMail(PRV.ml, f, opt)) : null;
  const allC = filterMail(CUR.ml, f, all), allP = PRV ? filterMail(PRV.ml, f, all) : null;
  const mO = monthly(allC, r => R(r, 'open'), B.MONTHS), pO = PRV ? monthly(allP, r => R(r, 'open'), B.MONTHS) : null;
  const mC = monthly(allC, r => R(r, 'cto'), B.MONTHS), pC = PRV ? monthly(allP, r => R(r, 'cto'), B.MONTHS) : null;
  const spark = (c, p) => sparkSeries(B, s.period, c, p);
  const blocks = trendBlocks(B, s.period), cats = B.MONTHS.map(m => MN[m]);
  const line = (cur, prev) => [{ name: String(Y), v: cur, cls: 'cur' }].concat(PRV ? [{ name: String(PY), v: prev, cls: 'prev' }] : []);

  /* content type chart ignores the content type filter, so the selected bar can be compared with the rest */
  const noCt = filterMail(CUR.ml, f, { ...opt, ignore: { ct: 1 } });
  const ctRows = groupMail(noCt, 'ct').filter(r => r.ms >= 10 && R(r, 'cto') != null).sort((x, y) => R(y, 'cto') - R(x, 'cto'))
    .map(r => ({ l: r.l, v: R(r, 'cto'), n: r.ms, note: `open ${pct(R(r, 'open'))} · ${fmt(r.es)} emails` }));

  /* peer table */
  let peers = rows.filter(r => r.es >= 50 && r.po != null).map(r => {
    const pr = PEER[peerKey(r)] || {};
    return { t: r.t, div: r.div, ct: r.ct, cl: r.cl, m: r.m, es: r.es, o: r.po, c: r.pc,
      dO: pr.o != null ? r.po - pr.o : null, dC: pr.c != null && r.pc != null ? r.pc - pr.c : null };
  });
  peers.sort(SORTS[s.emSort][1]);

  const noCl = { ...opt, ignore: { cl: 1 } };
  const bp = PRV ? groupMail(filterMail(PRV.ml, f, noCl), 'cl') : [];
  const bands = groupMail(filterMail(CUR.ml, f, noCl), 'cl').sort((x, y) => x.l.localeCompare(y.l)).map(r => {
    const p = bp.find(x => x.l === r.l);
    return { l: r.l, sel: f.cl === r.l, ms: full(r.ms), open: pct(R(r, 'open')), d: p ? dRate(R(r, 'open'), R(p, 'open')) : null, cto: pct(R(r, 'cto')) };
  });

  return {
    scope: periodLabel(B, s.period) + (PY ? ` · vs same period ${PY}` : ''),
    kpis: [
      { l: 'Open rate', v: pct(R(a, 'open')), d: { v: dRate(R(a, 'open'), R(pa, 'open')) }, s: ml, hl: true, spark: spark(mO, pO) },
      { l: 'Click-to-open', v: pct(R(a, 'cto')), d: { v: dRate(R(a, 'cto'), R(pa, 'cto')) }, s: ml, spark: spark(mC, pC) },
      { l: 'Emails sent', v: fmt(a.es), d: { v: dCount(a.es, pa && pa.es), o: { neutral: true } }, s: `avg ${fmt(a.ms ? a.es / a.ms : 0)} recipients per mailing` },
      { l: 'Mailings', v: full(a.ms), d: { v: dCount(a.ms, pa && pa.ms), o: { neutral: true } }, s: `${full(rows.length)} records` }],
    verdict: rows.length ? verdict(a, pa, s, PY) : { empty: 'No mailings match the current filters.' },
    trend: {
      sub: `${ml} · all months, current filters${PY ? ' · ' + Y + ' vs ' + PY : ''}`, cats,
      open: line(mO, pO), cto: line(mC, pC),
      opts: { fmt: v => pct(v), fmtAxis: pctAx, blocks, h: 190, mr: 40, minSpan: 0.1 },
    },
    legend: { cur: Y, prev: PY, hasPrev: !!PRV, partial: !!B.PARTIAL },
    byType: { rows: ctRows, opts: { fmt: v => pct(v), labelW: 190, avg: R(mailAgg(noCt), 'cto'), sel: f.ct !== 'all' ? f.ct : null }, toggle: ['ml', 'ct'] },
    peers: {
      sort: s.emSort, sorts: Object.entries(SORTS).map(([k, [l]]) => ({ k, l })), rows: peers,
      cols: [{ h: 'Mailing', cls: 't', f: r => `${esc(r.t)}<span class="s">${esc(r.div)} · ${MN[r.m]}</span>` }, { h: 'Type', f: r => `<span class="tag">${esc(r.ct)}</span>` },
        { h: 'Audience band', f: r => esc(r.cl) }, { h: 'Emails', num: 1, f: r => full(r.es) }, { h: 'Open', num: 1, f: r => pct(r.o) }, { h: 'vs peers', num: 1, f: r => dpp(r.dO) },
        { h: 'Click-to-open', num: 1, f: r => pct(r.c) }, { h: 'vs peers', num: 1, f: r => dpp(r.dC) }],
    },
    bands: { py: PY || 'PY', rows: bands, toggle: ['ml', 'cl'] },
    byPack: {
      rows: groupMail(rows, 'pk').filter(r => r.l !== '(No pack)' && r.ms >= 3 && R(r, 'cto') != null).sort((x, y) => R(y, 'cto') - R(x, 'cto')).map(r => ({ l: r.l, v: R(r, 'cto'), n: r.ms })),
      opts: { fmt: v => pct(v), labelW: 170, limit: 8, avg: R(a, 'cto') },
    },
    byDiv: {
      rows: groupMail(filterMail(CUR.ml, f, { ...opt, ignore: { div: 1 } }), 'div').sort((x, y) => y.es - x.es).map(r => ({ l: r.l, v: r.es, n: r.ms, note: `open ${pct(R(r, 'open'))}` })),
      opts: { labelW: 150, limit: 8, sel: f.div !== 'all' ? f.div : null }, toggle: ['ml', 'div'],
    },
    csv: () => mailCsv(ctx, f, 'div', 'email', opt),
  };
}
