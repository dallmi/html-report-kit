/* Data files -> in-memory records. Decoding only: every formula (reach, inclusion,
   date conversion) already ran in the build step. */

/* dims/cols dictionary encoding: a column with an entry in `dims` holds indexes into it,
   every other column holds values. */
export function decodeColumns({ dims = {}, cols }) {
  const keys = Object.keys(cols);
  const n = keys.length ? cols[keys[0]].length : 0;
  for (const k of keys) {
    if (cols[k].length !== n) throw new Error(`column ${k} has ${cols[k].length} rows, expected ${n}`);
  }
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = {};
    for (const k of keys) {
      const v = cols[k][i];
      if (dims[k]) {
        if (v == null || v < 0 || v >= dims[k].length) throw new Error(`column ${k} row ${i}: index ${v} outside dims.${k}`);
        r[k] = dims[k][v];
      } else r[k] = v;
    }
    out[i] = r;
  }
  return out;
}

const withQuarter = r => { r.q = Math.ceil(r.m / 3); return r; };

/* Visitor splits ship as url + split + their figures (uv, and whatever else the export has);
   the page attributes are joined back here. */
function joinPages(rows, byUrl, name) {
  return rows.map(r => {
    const p = byUrl.get(r.url);
    if (!p) throw new Error(`pages.${name}: ${r.url} is not a page`);
    const { url, sp, uv, ...rest } = r;
    return { site: p.site, url: p.url, div: p.div, ct: p.ct, ov: p.ov, th: p.th, tp: p.tp, org: p.org, rg: p.rg, sp, uv, ...rest };
  });
}

export function normalise(manifest, raw) {
  const pg = raw.pages, byUrl = new Map(pg.pages.map(p => [p.url, p]));
  return {
    manifest,
    mail: decodeColumns(raw.mailings).map(withQuarter),
    arts: raw.articles.map(withQuarter),
    vids: raw.videos.map(withQuarter),
    pgLevel: pg.pages,
    pgDiv: joinPages(pg.visitor_division, byUrl, 'visitor_division'),
    pgReg: joinPages(pg.visitor_region, byUrl, 'visitor_region'),
    clickPages: raw.clicks.pages,
    links: raw.clicks.links,
    packs: raw.packs,
  };
}
