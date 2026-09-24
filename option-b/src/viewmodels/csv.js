/* CSV rows for the mailing tabs (Summary, Email, Explore): one row per group of the chosen dimension. */
import { filterMail } from '../services/filter.js';
import { groupMail } from '../services/aggregate.js';

export function mailCsv(ctx, f, dim, name, opt) {
  return {
    name,
    rows: [['dimension', 'mailings', 'emails_sent', 'opens', 'unique_clicks', 'open_rate_weighted_pct', 'cto_weighted_pct', 'open_rate_simple_avg_pct', 'cto_simple_avg_pct']]
      .concat(groupMail(filterMail(ctx.CUR.ml, f, opt), dim).map(r => [r.l, r.ms, r.es, r.op, r.uc, (r.wOpen * 100).toFixed(2), (r.wCto * 100).toFixed(2),
        r.open == null ? '' : (r.open * 100).toFixed(2), r.cto == null ? '' : (r.cto * 100).toFixed(2)])),
  };
}
