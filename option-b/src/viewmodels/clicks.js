import { pagesF, linksF } from '../services/filter.js';
import { sum } from '../services/aggregate.js';
import { fmt, full, pct, esc, shortUrl } from '../services/format.js';

export function build(ctx, s) {
  const { D } = ctx, f = s.cl, P = pagesF(D, f), L = linksF(D, f);
  const v = sum(P, x => x.v), uv = sum(P, x => x.uv), c = sum(P, x => x.c), ucl = sum(P, x => x.ucl), cr = v ? c / v : 0, vc = uv ? ucl / uv : 0;
  let verdict;
  if (!P.length || !uv) verdict = { empty: 'No pages match the current filters.' };
  else {
    const rel = vc ? Math.abs(cr - vc) / vc : 0, per = ucl ? c / ucl : 0; let vd, text;
    if (rel < 0.1) { vd = 'Balanced'; text = `About <b>${Math.round(vc * 10)} in 10</b> visitors clicked, roughly once each: a simple, direct journey.`; }
    else if (cr > vc) { vd = 'Explorers'; text = `<b>${pct(vc, 0)}</b> of visitors clicked, but those who did clicked <b>${per.toFixed(1)} times</b> each: people are using these pages as a hub.`; }
    else { vd = 'One-time action'; text = `<b>${pct(vc, 0)}</b> of visitors clicked, mostly once: these pages serve one specific need.`; }
    verdict = { verdict: vd, text, why: `<ul><li><b>Visitors who clicked</b> shows how many people acted. <b>Click rate per view</b> shows how much clicking the page generates overall. Read them together.</li>
      <li><b>Explorers</b> (click rate well above visitors who clicked) is typical of resource hubs, release notes and download pages. <b>One-time action</b> is typical of forms, registrations and tools.</li>
      <li>This export is cumulative and has no dates, so there is no period filter or comparison.</li></ul>
      <div class="rep"><b>How to report it</b>“${Math.round(vc * 10)} in 10 visitors clicked at least once, ${per.toFixed(1)} times on average.”</div>` };
  }
  const hasD = P.some(p => p.d > 0);
  return {
    scope: 'Cumulative export without dates',
    kpis: [{ l: 'Visitors who clicked', v: pct(vc), s: `${fmt(ucl)} of ${fmt(uv)} visitors`, hl: true, info: 'Unique clickers ÷ unique visitors (formerly UCTUVR).' },
      { l: 'Click rate per view', v: pct(cr), s: `${fmt(c)} clicks on ${fmt(v)} views`, info: 'Clicks ÷ page views (formerly CTVR).' },
      { l: 'Clicks per clicker', v: (ucl ? c / ucl : 0).toFixed(1), s: 'repeat clicking' }, { l: 'Page views', v: fmt(v), s: `${full(P.length)} pages` }],
    verdict,
    /* page chart ignores the page filter; the bar's key is the page URL the filter needs */
    pages: {
      rows: pagesF(D, f, { url: 1 }).slice().sort((a, b) => b.v - a.v).map(p => ({ l: p.p, key: p.url, v: p.v, note: `${p.site} · visitors who clicked ${pct(p.uv ? p.ucl / p.uv : 0)}` })),
      opts: { labelW: 170, sel: f.url !== 'all' ? (D.clickPages.find(p => p.url === f.url) || {}).p : null }, toggle: ['cl', 'url'],
    },
    links: { rows: L.slice().sort((a, b) => b.c - a.c).map(l => ({ l: l.t, v: l.c, note: `${shortUrl(l.dest)} · ${full(l.ucl)} unique clickers · from ${l.p}` })), opts: { labelW: 190 } },
    table: {
      rows: P.slice().sort((a, b) => b.v - a.v),
      cols: [{ h: 'Page', cls: 't', f: r => `${esc(r.p)}<span class="s">${esc(r.site)}</span>` }, { h: 'Views', num: 1, f: r => full(r.v) }, { h: 'Unique visitors', num: 1, f: r => full(r.uv) },
        { h: 'Clicks', num: 1, f: r => full(r.c) }, { h: 'Click rate per view', num: 1, f: r => pct(r.v ? r.c / r.v : 0) }, { h: 'Visitors who clicked', num: 1, f: r => pct(r.uv ? r.ucl / r.uv : 0) }]
        .concat(hasD ? [{ h: 'Downloads', num: 1, f: r => full(r.d) }] : []),
    },
    csv: () => ({ name: 'clicks', rows: [['site', 'page', 'page_url', 'views', 'unique_visitors', 'clicks', 'unique_clicks', 'downloads']]
      .concat(P.map(p => [p.site, p.p, p.url, p.v, p.uv, p.c, p.ucl, p.d])) }),
  };
}
