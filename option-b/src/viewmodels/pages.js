import { pgLevelF, pgSplitF } from '../services/filter.js';
import { sum } from '../services/aggregate.js';
import { fmt, full, pct, esc, pageTitle } from '../services/format.js';

const bySplit = rows => { const g = {}; rows.forEach(p => g[p.sp] = (g[p.sp] || 0) + p.uv); return Object.entries(g).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v); };

export function build(ctx, s) {
  const { D } = ctx, f = s.pg, P = pgLevelF(D, f), uv = sum(P, x => x.uv), v = sum(P, x => x.v), vis = sum(P, x => x.vis);
  /* the division chart ignores the visitor-division filter (so the selected bar sits among the others); same for region */
  const Dv = pgSplitF(D.pgDiv, D, f, { ignore: { vdiv: 1 } }), Rg = pgSplitF(D.pgReg, D, f, { ignore: { vreg: 1 } });
  const byDiv = {}; Dv.forEach(p => byDiv[p.sp] = (byDiv[p.sp] || 0) + p.uv);
  const topP = P.slice().sort((a, b) => b.uv - a.uv)[0], dv = Object.entries(byDiv).sort((a, b) => b[1] - a[1])[0], dt = sum(Object.values(byDiv), x => x);
  const byF = k => { const g = {}; P.forEach(p => { const o = g[p[k]] = g[p[k]] || { uv: 0, n: 0 }; o.uv += p.uv; o.n++; }); return Object.entries(g).map(([l, o]) => ({ l, v: o.uv / o.n, n: o.n })).sort((a, b) => b.v - a.v); };
  return {
    scope: 'Period total · page-level export without dates',
    kpis: [{ l: 'Unique visitors', v: fmt(uv), s: 'summed per page', hl: true }, { l: 'Views', v: fmt(v), s: `${fmt(vis)} visits` },
      { l: 'Views per visitor', v: (uv ? v / uv : 0).toFixed(1), s: 'how often people come back' }, { l: 'Pages', v: full(P.length), s: `of ${full(D.pgLevel.length)} tracked` }],
    verdict: topP ? {
      verdict: 'Period total',
      text: `<b>${esc(pageTitle(topP.url))}</b> draws ${pct(uv ? topP.uv / uv : 0, 0)} of all unique visitors${dv ? `; <b>${esc(dv[0])}</b> makes up ${pct(dt ? dv[1] / dt : 0, 0)} of the audience` : ''}. On average people view each page ${(uv ? v / uv : 0).toFixed(1)} times.`,
      why: `<ul><li>This export has no dates, so there is no period filter or year-on-year comparison. Figures cover the whole export period.</li><li>Unique visitors are summed per page, so a person who visited two pages counts twice in the total.</li><li>Views per visitor above 2 means people come back to the page, typical of hubs and tool pages.</li></ul>`,
    } : { empty: 'No pages match the current filters.' },
    top: { rows: P.slice().sort((a, b) => b.uv - a.uv).map(p => ({ l: pageTitle(p.url), v: p.uv, note: `${p.site} · ${fmt(p.v)} views · ${(p.uv ? p.v / p.uv : 0).toFixed(1)} views per visitor` })), opts: { labelW: 200 } },
    byDiv: { rows: bySplit(Dv), opts: { labelW: 200, sel: f.vdiv !== 'all' ? f.vdiv : null }, toggle: ['pg', 'vdiv'] },
    byReg: { rows: bySplit(Rg), opts: { labelW: 130, sel: f.vreg !== 'all' ? f.vreg : null }, toggle: ['pg', 'vreg'] },
    byTheme: { rows: byF('th'), opts: { fmt: full, labelW: 150, limit: 8 } },
    byType: { rows: byF('ct'), opts: { fmt: full, labelW: 150, limit: 8 } },
    table: {
      rows: P.slice().sort((a, b) => b.uv - a.uv),
      cols: [{ h: 'Page', cls: 't', f: r => `${esc(pageTitle(r.url))}<span class="s">${esc(r.site)}</span>` }, { h: 'Theme', f: r => esc(r.th) }, { h: 'Content type', f: r => esc(r.ct) },
        { h: 'Unique visitors', num: 1, f: r => full(r.uv) }, { h: 'Views', num: 1, f: r => full(r.v) }, { h: 'Views per visitor', num: 1, f: r => (r.uv ? r.v / r.uv : 0).toFixed(1) + '×' }],
    },
    csv: () => ({ name: 'pages', rows: [['site', 'page', 'url', 'division_owner', 'content_type', 'theme', 'unique_visitors', 'visits', 'views', 'uv_ytd', 'views_ytd']]
      .concat(P.map(p => [p.site, pageTitle(p.url), p.url, p.div, p.ct, p.th, p.uv, p.vis, p.v, p.uvy, p.vy])) }),
  };
}
