/* CSV rows for index2.html's mailing tabs (Overview, Mailings, Breakdown): simple average first, as the tab shows it. */
import { filterMail } from '../../services/filter.js';
import { groupMail } from '../../services/aggregate.js';
import { MN } from '../../services/format.js';

export function mailCsv2(ctx, f, dim, name) {
  return {
    name,
    rows: [['dimension', 'mailings', 'emails_sent', 'opens', 'unique_clicks', 'open_rate_simple_avg_pct', 'click_to_open_simple_avg_pct', 'click_through_simple_avg_pct', 'open_rate_weighted_pct', 'cto_weighted_pct']]
      .concat(groupMail(filterMail(ctx.CUR.ml, f), dim, { monthKey: m => MN[m] }).map(r => [r.l, r.ms, r.es, r.op, r.uc, r.open == null ? '' : (r.open * 100).toFixed(2), r.cto == null ? '' : (r.cto * 100).toFixed(2),
        r.ctr == null ? '' : (r.ctr * 100).toFixed(2), (r.wOpen * 100).toFixed(2), (r.wCto * 100).toFixed(2)])),
  };
}
