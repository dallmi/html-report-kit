import { pagesF, linksF } from '../../services/filter.js';
import { sum } from '../../services/aggregate.js';
import { fmt2 as fmt, pct2 as pct, full, esc } from '../../services/format.js';
import { interpClicks } from './interpret.js';

export function build(ctx, s, scope) {
  const { D } = ctx, P = pagesF(D, s.cl), L = linksF(D, s.cl);
  const v = sum(P, x => x.v), uv = sum(P, x => x.uv), c = sum(P, x => x.c), ucl = sum(P, x => x.ucl), d = sum(P, x => x.d);
  const ctvr = v ? c / v : 0, uctuvr = uv ? ucl / uv : 0, single = s.cl.url !== 'all' || P.length === 1;
  const rows = P.slice().sort((a, b) => b.v - a.v), LT = L.slice().sort((a, b) => b.c - a.c).slice(0, 25);
  return {
    scope: scope + ' · cumulative export, no date dimension',
    kpis: [
      { l: 'Page views', v: fmt(v), s: `${full(P.length)} pages`, hl: true },
      { l: 'Unique visitors', v: fmt(uv), s: `${(uv ? v / uv : 0).toFixed(1)} views each` },
      { l: 'CTVR', v: pct(ctvr), s: `${fmt(c)} clicks / ${fmt(v)} views` },
      { l: 'UCTUVR', v: pct(uctuvr), s: `${fmt(ucl)} unique clicks / ${fmt(uv)} UV` },
      { l: 'Downloads', v: fmt(d), s: 'documents pulled' },
      { l: 'Tracked links', v: full(L.length), s: `${fmt(sum(L, x => x.c))} clicks` }],
    val: [{ l: 'Pages in scope', v: `${full(P.length)} / ${full(D.clickPages.length)}` },
      { l: 'Links in scope', v: `${full(L.length)} / ${full(D.links.length)}` },
      { l: 'Reach', v: 'not applied', tag: 'ok', tagTxt: 'no date dimension' }],
    interp: P.length ? interpClicks(ctvr, uctuvr, single ? P[0].p : '', v, c, uv, ucl) : '<div class="interp"><div class="lead">No pages match the current filters.</div></div>',
    pages: P.slice().sort((a, b) => b.v - a.v).map(p => ({ l: p.p, v: p.v, note: p.site })),
    ratios: P.filter(p => p.uv >= 500).map(p => ({ l: p.p, a: p.v ? p.c / p.v : 0, b: p.uv ? p.ucl / p.uv : 0 })).sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b)),
    table: '<thead><tr><th>Site</th><th>Page</th><th>Page URL</th><th class="num">Views</th><th class="num">Unique</th><th class="num">Clicks</th><th class="num">Unique clicks</th><th class="num">Downloads</th><th class="num">CTVR</th><th class="num">UCTUVR</th></tr></thead><tbody>' +
      rows.map(r => `<tr><td>${esc(r.site)}</td><td>${esc(r.p)}</td><td class="u">${esc(r.url)}</td>
    <td class="num">${full(r.v)}</td><td class="num">${full(r.uv)}</td><td class="num">${full(r.c)}</td><td class="num">${full(r.ucl)}</td><td class="num">${full(r.d)}</td>
    <td class="num">${pct(r.v ? r.c / r.v : 0)}</td><td class="num">${pct(r.uv ? r.ucl / r.uv : 0)}</td></tr>`).join('') + '</tbody>',
    links: '<thead><tr><th>Link title</th><th>Page</th><th>Destination URL</th><th class="num">Clicks</th><th class="num">Unique</th><th class="num">Downloads</th></tr></thead><tbody>' +
      (LT.length ? LT.map(r => `<tr><td class="t">${esc(r.t)}</td><td>${esc(r.p)}</td><td class="u">${esc(r.dest)}</td>
    <td class="num">${full(r.c)}</td><td class="num">${full(r.ucl)}</td><td class="num">${full(r.d)}</td></tr>`).join('')
        : '<tr><td colspan="6" style="color:var(--grey-4);padding:20px">No links match the current filters.</td></tr>') + '</tbody>',
    csv: () => ({ name: 'clicks', rows: [['site', 'page', 'page_url', 'views', 'unique_visitors', 'clicks', 'unique_clicks', 'downloads', 'ctvr_pct', 'uctuvr_pct']]
      .concat(P.map(p => [p.site, p.p, p.url, p.v, p.uv, p.c, p.ucl, p.d, (p.v ? p.c / p.v * 100 : 0).toFixed(2), (p.uv ? p.ucl / p.uv * 100 : 0).toFixed(2)])) }),
  };
}
