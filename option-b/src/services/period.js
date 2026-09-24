import { uniq } from './aggregate.js';
import { MN } from './format.js';

/* Everything time-related derives from manifest.cutoff_date and manifest.reporting_year.
   CUR and PRV are selections of the same datasets, not separate payloads. */
export function splitYears(D, Y) {
  const pick = (rows, y) => rows.filter(r => r.y === y);
  const CUR = { ml: pick(D.mail, Y), arts: pick(D.arts, Y), vids: pick(D.vids, Y) };
  const pm = pick(D.mail, Y - 1);
  const PRV = pm.length ? { ml: pm, arts: pick(D.arts, Y - 1), vids: pick(D.vids, Y - 1) } : null;
  return { CUR, PRV, PY: PRV ? Y - 1 : null };
}

export function timeBasis(manifest, curMail) {
  const Y = manifest.reporting_year;
  const AS_OF = manifest.cutoff_date ? new Date(manifest.cutoff_date + 'T00:00:00') : null;
  const PARTIAL = AS_OF && AS_OF.getDate() < new Date(AS_OF.getFullYear(), AS_OF.getMonth() + 1, 0).getDate()
    ? AS_OF.getMonth() + 1 : null;
  const MONTHS = uniq(curMail.map(r => r.m)).map(Number);
  /* one cut-off for every dataset, so tabs never disagree (a later export must not add months the others lack) */
  const CUTOFF = AS_OF ? AS_OF.getMonth() + 1 : Math.max(...MONTHS);
  return { Y, AS_OF, PARTIAL, MONTHS, CUTOFF };
}

/* period: 'ytd' | 'q1'..'q4' | 'm1'..'m12' */
export function inPer(m, p, cutoff) {
  if (cutoff != null && m > cutoff) return false;
  if (p === 'ytd') return true;
  if (p[0] === 'q') return Math.ceil(m / 3) === +p.slice(1);
  return m === +p.slice(1);
}

export const perMonths = (B, p) => B.MONTHS.filter(m => inPer(m, p, B.CUTOFF));

export function periodLabel(B, p) {
  const asof = B.AS_OF ? `${B.AS_OF.getDate()} ${MN[B.AS_OF.getMonth() + 1]}` : '';
  if (p === 'ytd') return `Year to date ${B.Y}${asof ? ' (to ' + asof + ')' : ''}`;
  if (p[0] === 'q') {
    const q = +p.slice(1), ms = B.MONTHS.filter(m => Math.ceil(m / 3) === q);
    return `Q${q} ${B.Y}${ms.includes(B.PARTIAL) ? ' (to ' + asof + ')' : ''}`;
  }
  const m = +p.slice(1);
  return `${MN[m]} ${B.Y}${m === B.PARTIAL ? ' (to ' + asof + ', partial)' : ''}`;
}

export function periodOptions(B) {
  return [['ytd', 'Year to date']]
    .concat(uniq(B.MONTHS.map(m => Math.ceil(m / 3))).map(q => ['q' + q, `Q${q}`]))
    .concat(B.MONTHS.map(m => ['m' + m, `${MN[m]}${m === B.PARTIAL ? ' (partial)' : ''}`]));
}

/* shaded blocks on monthly charts: the selected period and the partial month */
export function trendBlocks(B, p) {
  const b = [], pm = perMonths(B, p);
  if (p !== 'ytd' && pm.length) b.push({ i0: B.MONTHS.indexOf(pm[0]), i1: B.MONTHS.indexOf(pm[pm.length - 1]), label: 'Selected' });
  if (B.PARTIAL && B.MONTHS.includes(B.PARTIAL) && !(p !== 'ytd' && pm.includes(B.PARTIAL))) {
    b.push({ i0: B.MONTHS.indexOf(B.PARTIAL), i1: B.MONTHS.indexOf(B.PARTIAL), label: 'Partial' });
  }
  return b;
}

/* sparkline points: the selected months without the partial one, only when there are at least three */
export function sparkSeries(B, p, curByM, prevByM) {
  const sm = perMonths(B, p).filter(m => m !== B.PARTIAL);
  if (sm.length < 3) return null;
  const pick = a => sm.map(m => a ? a[B.MONTHS.indexOf(m)] : null);
  return { cur: pick(curByM), prev: prevByM ? pick(prevByM) : null };
}
