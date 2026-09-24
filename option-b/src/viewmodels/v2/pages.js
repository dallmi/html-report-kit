import { pgLevelF, pgSplitF } from '../../services/filter.js';
import { sum } from '../../services/aggregate.js';
import { fmt2 as fmt, full, esc, lastSegment } from '../../services/format.js';
import { miniBar } from '../../components/v2/blocks.js';

const on = v => v !== 'all';

export function build(ctx, s) {
  const { D } = ctx, f = s.pg, P = pgLevelF(D, f);
  /* v2: the visitor slicers restrict every view, including the split charts themselves */
  const Dv = pgSplitF(D.pgDiv, D, f, { sp: on(f.vdiv) ? f.vdiv : null }), Rg = pgSplitF(D.pgReg, D, f, { sp: on(f.vreg) ? f.vreg : null });
  const uv = sum(P, x => x.uv), v = sum(P, x => x.v), vis = sum(P, x => x.vis), uvy = sum(P, x => x.uvy), vy = sum(P, x => x.vy);
  const vr = on(f.vreg), vd = on(f.vdiv);
  const srcReg = vr ? D.pgReg.filter(p => p.sp === f.vreg).length : D.pgReg.length;
  const srcDiv = vd ? D.pgDiv.filter(p => p.sp === f.vdiv).length : D.pgDiv.length;
  const grp = rows => { const g = {}; rows.forEach(p => g[p.sp] = (g[p.sp] || 0) + p.uv); return Object.entries(g).map(([l, x]) => ({ l, v: x })).sort((a, b) => b.v - a.v); };
  const byF = k => { const g = {}; P.forEach(p => { const o = g[p[k]] = g[p[k]] || { uv: 0, n: 0 }; o.uv += p.uv; o.n++; }); return Object.entries(g).map(([l, o]) => ({ l, v: o.uv / o.n, note: `${o.n} pages` })).sort((a, b) => b.v - a.v); };
  const rows = P.slice().sort((a, b) => b.uv - a.uv), mx = Math.max(...rows.map(r => r.uv), 1);
  return {
    kpis: [
      { l: 'Pages in scope', v: full(P.length), s: 'page-level records', hl: true },
      { l: 'Unique visitors', v: fmt(uv), s: `${fmt(uvy)} YTD` },
      { l: 'Views', v: fmt(v), s: `${fmt(vy)} YTD` },
      { l: 'Visits', v: fmt(vis), s: `${(uv ? vis / uv : 0).toFixed(1)} per visitor` },
      { l: 'Views per visitor', v: (uv ? v / uv : 0).toFixed(1), s: 'repeat-visit intensity' }],
    val: [{ l: 'Pages in scope', v: `${full(P.length)} / ${full(D.pgLevel.length)}` },
      { l: 'Regional split rows', v: `${full(Rg.length)} / ${full(srcReg)}`, tag: Rg.length === srcReg ? 'ok' : 'warn', tagTxt: Rg.length === srcReg ? 'matches source' : 'filtered further' },
      { l: 'Divisional split rows', v: `${full(Dv.length)} / ${full(srcDiv)}`, tag: Dv.length === srcDiv ? 'ok' : 'warn', tagTxt: Dv.length === srcDiv ? 'matches source' : 'filtered further' },
      { l: 'Visitor slicers', v: vr || vd ? 'restricting all views' : 'not applied' }],
    top: P.slice().sort((a, b) => b.uv - a.uv).map(p => ({ l: lastSegment(p.url), v: p.uv, note: `${p.th} · ${fmt(p.v)} views` })),
    intensity: P.filter(p => p.uv >= 50).map(p => ({ l: lastSegment(p.url), v: p.v / p.uv, note: `${fmt(p.uv)} UV · ${fmt(p.v)} views` })).sort((a, b) => b.v - a.v),
    byDiv: grp(Dv), byReg: grp(Rg), byTheme: byF('th'), byType: byF('ct'),
    table: '<thead><tr><th>Page</th><th>Division owner</th><th>Theme</th><th>Content type</th><th>Target region</th><th class="num">Unique</th><th class="num">Visits</th><th class="num">Views</th><th class="num">Views/UV</th><th class="num">UV YTD</th><th class="num">Views YTD</th></tr></thead><tbody>' +
      rows.map(r => `<tr><td class="t" title="${esc(r.url)}">${esc(lastSegment(r.url))}${miniBar(r.uv, mx)}</td><td>${esc(r.div)}</td><td>${esc(r.th)}</td><td>${esc(r.ct)}</td><td>${esc(r.rg)}</td>
    <td class="num">${full(r.uv)}</td><td class="num">${full(r.vis)}</td><td class="num">${full(r.v)}</td><td class="num">${(r.uv ? r.v / r.uv : 0).toFixed(1)}×</td>
    <td class="num">${full(r.uvy)}</td><td class="num">${full(r.vy)}</td></tr>`).join('') + '</tbody>',
    csv: () => ({ name: 'pages', rows: [['site', 'division_owner', 'page_url', 'content_type', 'overtitle', 'theme', 'topic_tags', 'target_org', 'target_region', 'unique_visitors', 'visits', 'views', 'views_per_uv', 'uv_ytd', 'views_ytd', 'likes', 'comments']]
      .concat(P.map(p => [p.site, p.div, p.url, p.ct, p.ov, p.th, p.tp.join('; '), p.org, p.rg, p.uv, p.vis, p.v, (p.uv ? p.v / p.uv : 0).toFixed(2), p.uvy, p.vy, p.li, p.co])) }),
  };
}
