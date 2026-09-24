import { filterMail } from '../services/filter.js';
import { mailAgg, groupMail, TAGDIM } from '../services/aggregate.js';
import { rate, methodLabel } from '../services/metrics.js';
import { fmt, full, pct, esc, trunc, MN } from '../services/format.js';
import { mailCsv } from './csv.js';

export const DIMS = [['div', 'Division (KPI reporting)'], ['map', 'Corp Comms new mapping'], ['team', 'Corp Comms team'], ['ct', 'Content type'],
  ['th', 'Theme (any match)'], ['tp', 'Topic (any match)'], ['tm', 'Template'], ['cl', 'Audience size'], ['cc', 'Corp Comms scope'], ['month', 'Month'],
  ['pk', 'Tracking ID pack'], ['tcl', 'Tracking ID cluster']];
export const METRICS = [['cto', 'Click-to-open'], ['open', 'Open rate'], ['ctr', 'Click-through'], ['es', 'Emails sent'], ['ms', 'Mailings sent'], ['uc', 'Unique clicks']];

export function build(ctx, s) {
  const { CUR, B } = ctx, { dim, metric, top, min } = s.ex, opt = { period: s.period, cutoff: B.CUTOFF };
  const rows = filterMail(CUR.ml, s.ml, opt), g = groupMail(rows, dim).filter(r => r.ms >= min), isRate = ['open', 'cto', 'ctr'].includes(metric);
  const R = (a, k) => rate(a, k, s.method), val = r => isRate ? R(r, metric) : r[metric];
  const label = r => dim === 'month' ? MN[+r.l] : r.l;
  const ranked = g.filter(r => val(r) != null).sort((a, b) => dim === 'month' ? (+a.l) - (+b.l) : val(b) - val(a)).slice(0, top);
  return {
    chart: {
      rows: ranked.map(r => ({ l: label(r), v: val(r), n: r.ms, note: `${fmt(r.es)} emails` })),
      opts: { limit: top, fmt: isRate ? (v => pct(v)) : fmt, rowH: 24, labelW: 250, avg: isRate ? R(mailAgg(rows), metric) : null },
    },
    note: (TAGDIM[dim] ? `Any-match: a mailing with several ${dim === 'th' ? 'themes' : 'topics'} counts under each, so rows add up to more than ${full(rows.length)} mailings. ` : '') +
      (dim === 'div' ? 'Division uses Corp Comms KPI reporting; rows without a KPI value split into “Non Corp Comms” and “Corp Comms – unmapped”. ' : '') +
      (isRate ? `Rates are ${methodLabel(s.method)}. ` : '') + (min > 1 ? `Groups with fewer than ${min} mailings are hidden.` : ''),
    table: `<thead><tr><th>${esc(DIMS.find(d => d[0] === dim)[1])}</th><th class="num">Mailings</th><th class="num">Emails</th><th class="num">Avg audience</th><th class="num">Open</th><th class="num">Click-to-open</th><th class="num">Click-through</th><th class="num">Unique clicks</th></tr></thead><tbody>` +
      g.slice().sort((a, b) => dim === 'month' ? (+a.l) - (+b.l) : b.es - a.es).map(r => `<tr><td class="t" title="${esc(r.l)}">${esc(trunc(label(r), 52))}</td><td class="num">${full(r.ms)}</td><td class="num">${full(r.es)}</td>
    <td class="num">${fmt(r.ms ? r.es / r.ms : 0)}</td><td class="num">${pct(R(r, 'open'))}</td><td class="num">${pct(R(r, 'cto'))}</td><td class="num">${pct(R(r, 'ctr'), 2)}</td><td class="num">${full(r.uc)}</td></tr>`).join('') + '</tbody>',
    csv: () => mailCsv(ctx, s.ml, dim, 'explore', opt),
  };
}
