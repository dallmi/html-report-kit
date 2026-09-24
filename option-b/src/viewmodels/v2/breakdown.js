import { filterMail } from '../../services/filter.js';
import { groupMail, TAGDIM } from '../../services/aggregate.js';
import { fmt2 as fmt, pct2 as pct, full, esc, trunc, MN } from '../../services/format.js';
import { mailCsv2 } from './csv.js';

export const DIMS = [['div', 'Division (KPI reporting)'], ['map', 'Corp Comms new mapping'], ['team', 'Corp Comms team'], ['ct', 'Content type'],
  ['th', 'Theme (any match)'], ['tp', 'Topic (any match)'], ['tm', 'Template'], ['cl', 'Audience size'], ['cc', 'Corp Comms scope'], ['month', 'Month'],
  ['pk', 'Tracking ID pack'], ['tcl', 'Tracking ID cluster']];
export const METRICS = [['es', 'Emails sent'], ['ms', 'Mailings sent'], ['open', 'Open rate (simple avg)'],
  ['cto', 'Click-to-open (simple avg)'], ['ctr', 'Click-through (simple avg)'], ['uc', 'Unique clicks']];

export function build(ctx, s) {
  const { dim, metric, top } = s.ex, rows = filterMail(ctx.CUR.ml, s.ml), g = groupMail(rows, dim, { monthKey: m => MN[m] });
  const isRate = ['open', 'cto', 'ctr'].includes(metric);
  return {
    chart: g.filter(r => r[metric] != null).sort((a, b) => b[metric] - a[metric]).slice(0, top).map(r => ({ l: r.l, v: r[metric], note: `${full(r.ms)} mailings · ${fmt(r.es)} emails` })),
    opts: { limit: top, fmt: isRate ? (v => pct(v)) : (v => fmt(v)), rowH: 24, labelW: 250 },
    note: TAGDIM[dim]
      ? `Any-match: a mailing carrying several ${dim === 'th' ? 'themes' : 'topics'} counts under each one, so rows sum to more than the ${full(rows.length)} mailings in scope.`
      : (dim === 'div' ? 'Division uses <b>Corp Comms KPI reporting</b>. Rows with no KPI value split into “Non Corp Comms” and “Corp Comms – unmapped”.'
        : (dim === 'pk' || dim === 'tcl' ? 'Pack and cluster names come from the long-term plan pack list, joined on tracking ID.' : '')),
    table: `<thead><tr><th>${esc(DIMS.find(d => d[0] === dim)[1])}</th><th class="num">Mailings</th><th class="num">Emails</th><th class="num">Avg audience</th><th class="num">Open</th><th class="num">CTO</th><th class="num">CTR</th><th class="num">Unique clicks</th></tr></thead><tbody>` +
      g.slice().sort((a, b) => b.es - a.es).map(r => `<tr><td class="t" title="${esc(r.l)}">${esc(trunc(r.l, 52))}</td><td class="num">${full(r.ms)}</td><td class="num">${full(r.es)}</td>
    <td class="num">${fmt(r.ms ? r.es / r.ms : 0)}</td><td class="num">${pct(r.open)}</td><td class="num">${pct(r.cto)}</td><td class="num">${pct(r.ctr, 2)}</td><td class="num">${full(r.uc)}</td></tr>`).join('') + '</tbody>',
    csv: () => mailCsv2(ctx, s.ml, dim, 'breakdown'),
  };
}
