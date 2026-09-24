import { filterArts } from '../../services/filter.js';
import { uniq, sum } from '../../services/aggregate.js';
import { headcount } from '../../services/metrics.js';
import { fmt2 as fmt, pct2 as pct, full, esc, trunc, dayLabel, MN } from '../../services/format.js';
import { miniBar } from '../../components/v2/blocks.js';

const FLAG = '<b>Unique visitors is not shown as a total.</b> Unique visitors cannot be summed across articles &mdash; the same person reading three articles would be counted three times, overstating audience. It is shown per article in the table and used for per-article reach, but never aggregated. A de-duplicated figure would have to come from the source platform.';

export function build(ctx, s) {
  const { M, CUR, Y } = ctx, A = filterArts(CUR.arts, s.ar);
  const v = sum(A, x => x.v), li = sum(A, x => x.li), co = sum(A, x => x.co);
  /* "best article reach" is measured against the chosen reference month's headcount (a v2 feature);
     per-article reach (publishing month) comes from the build */
  const hc = M.headcount.geduld[s.ref] || 0, one = A.length === 1 ? A[0] : null;
  const hcOne = one ? headcount(M, 'geduld', Y, one.m) : 0;
  const months = uniq(A.map(a => a.m)), inMonth = m => A.filter(a => a.m === m);
  const avgR = [], bestR = [];
  months.forEach(m => {
    const h = headcount(M, 'geduld', Y, m), set = inMonth(m);
    avgR.push(h && set.length ? set.reduce((t, x) => t + x.uv, 0) / set.length / h : 0);
    bestR.push(h && set.length ? Math.max(...set.map(x => x.uv)) / h : 0);
  });
  const byF = (k, min = 1) => {
    const g = {}; A.forEach(a => { const o = g[a[k]] = g[a[k]] || { uv: 0, n: 0 }; o.uv += a.uv; o.n++; });
    return Object.entries(g).filter(([, o]) => o.n >= min).map(([l, o]) => ({ l, v: o.uv / o.n, note: `${o.n} articles` })).sort((x, y) => y.v - x.v);
  };
  const byTag = (min = 1) => {
    const g = {}; A.forEach(a => (a.tp.length ? a.tp : ['(Untagged)']).forEach(t => { const o = g[t] = g[t] || { uv: 0, n: 0 }; o.uv += a.uv; o.n++; }));
    return Object.entries(g).filter(([, o]) => o.n >= min).map(([l, o]) => ({ l, v: o.uv / o.n, note: `${o.n} articles` })).sort((x, y) => y.v - x.v);
  };
  const rows = A.slice().sort((a, b) => b.v - a.v).slice(0, 30), mx = Math.max(...rows.map(r => r.v), 1);
  return {
    kpis: [
      { l: 'Articles published', v: full(A.length), s: 'in scope', hl: true },
      { l: 'Article views', v: fmt(v), s: `avg ${full(A.length ? v / A.length : 0)} per article` },
      { l: 'Avg views / article', v: full(A.length ? v / A.length : 0), s: 'mean across scope' },
      { l: one ? 'Reach (this article)' : 'Best article reach',
        v: one ? (one.reach != null ? pct(one.reach, 2) : 'n/a') : (hc && A.length ? pct(Math.max(...A.map(x => x.uv)) / hc, 2) : 'n/a'),
        s: one ? `UV / HC of ${MN[one.m]} ${Y}` : `vs HC of ${s.ref}` },
      { l: 'Likes', v: full(li), s: 'total reactions' },
      { l: 'Comments', v: full(co), s: 'total replies' }],
    flag: FLAG,
    val: [{ l: 'Rows in scope', v: `${full(A.length)} / ${full(CUR.arts.length)}` },
      { l: 'Reach basis', v: one ? `${MN[one.m]} ${Y} headcount` : `${s.ref} headcount` },
      { l: 'Sum of UV', v: 'suppressed', tag: 'warn', tagTxt: 'not additive' }],
    selected: one ? `<div class="methodbox"><h4>${esc(one.t)}</h4>
    <div class="mrow"><div><div class="t1">Published</div><div class="v1">${esc(dayLabel(one.date))}</div>
      <div class="d1">Reach below uses the Geduld internal headcount for <b>${MN[one.m]} ${Y}</b> (${fmt(hcOne)}), matching the publishing month.</div></div>
    <div><div class="t1">Author</div><div class="v1" style="font-size:15px">${esc(one.au)}</div><div class="d1">${esc(one.th)}${one.pk ? ' · pack: ' + esc(one.pk) : ''}</div></div></div>
    <p style="margin-bottom:0"><b>${fmt(one.v)}</b> views · <b>${fmt(one.uv)}</b> unique visitors · reach <b>${one.reach != null ? pct(one.reach, 2) : 'n/a'}</b> of internal headcount · ${full(one.li)} likes, ${full(one.co)} comments.</p></div>` : '',
    trend: { cats: months.map(m => MN[m]), bars: months.map(m => inMonth(m).reduce((t, x) => t + x.v, 0)), opts: { barLabel: 'Views' } },
    reach: { cats: months.map(m => MN[m]), A: avgR, B: bestR, opts: { fmtAxis: x => pct(x, 0), fmtTip: x => pct(x, 2), labelA: 'Average article', labelB: 'Best article' } },
    byTheme: byF('th'), byTopic: byTag(2), byAuthor: byF('au', 3), byChannel: byF('ch', 3),
    table: '<thead><tr><th>Article</th><th>Published</th><th>Author</th><th>Theme</th><th>Topic tags</th><th>Pack</th><th class="num">Views</th><th class="num">Unique (per article)</th><th class="num">Reach</th><th class="num">Reactions</th></tr></thead><tbody>' +
      rows.map(r => `<tr><td class="t">${esc(r.t)}${r.ts === 'Yes' ? ' <span class="tag top">Top story</span>' : ''}${miniBar(r.v, mx)}</td>
      <td>${esc(dayLabel(r.date))}</td><td>${esc(r.au)}</td><td>${esc(r.th)}</td>
      <td class="t">${r.tp.length ? r.tp.map(t => `<span class="tag">${esc(t)}</span>`).join('') : '—'}</td><td class="t">${esc(trunc(r.pk || '—', 28))}</td>
      <td class="num">${full(r.v)}</td><td class="num">${full(r.uv)}</td><td class="num">${r.reach != null ? pct(r.reach, 2) : '—'}</td><td class="num">${full(r.li + r.co)}</td></tr>`).join('') + '</tbody>',
    csv: () => ({ name: 'articles', rows: [['article', 'published', 'author', 'overtitle', 'theme', 'topic_tags', 'top_story', 'region', 'channel', 'pack', 'cluster', 'tracking_id', 'views', 'unique_visitors_per_article', 'likes', 'comments']]
      .concat(A.map(a => [a.t, dayLabel(a.date), a.au, a.ov, a.th, a.tp.join('; '), a.ts, a.rg, a.ch, a.pk, a.tcl, a.tid, a.v, a.uv, a.li, a.co])) }),
  };
}
