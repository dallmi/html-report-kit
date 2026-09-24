import { normalise } from './decode.js';

const SCHEMA_MAJOR = '1';
/* how many rows each file really holds, to compare with what the manifest announces */
const COUNT = {
  mailings: d => d.cols.y.length,
  articles: d => d.length,
  videos: d => d.length,
  pages: d => d.pages.length,
  clicks: d => d.links.length,
  packs: d => d.length,
};

async function getJson(base, file) {
  /* no-cache = revalidate: a refreshed file is picked up on the next reload, an unchanged one costs a 304 */
  const res = await fetch(new URL(file, base), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

async function fetchAll(base) {
  const manifest = await getJson(base, 'manifest.json');
  if (String(manifest.schema_version || '').split('.')[0] !== SCHEMA_MAJOR) {
    throw new Error(`manifest schema ${manifest.schema_version}; this dashboard reads ${SCHEMA_MAJOR}.x`);
  }
  const raw = {}, bad = [];
  await Promise.all(Object.entries(manifest.datasets).map(async ([k, d]) => { raw[k] = await getJson(base, d.file); }));
  for (const [k, d] of Object.entries(manifest.datasets)) {
    if (!COUNT[k]) continue;
    const n = COUNT[k](raw[k]);
    if (n !== d.rows) bad.push(`${d.file}: ${n} rows, manifest says ${d.rows}`);
  }
  for (const k of Object.keys(COUNT)) if (!raw[k]) bad.push(`manifest lists no ${k} dataset`);
  return { manifest, raw, bad };
}

let loading = null;

/* Loads manifest + datasets once per page. A mismatch between manifest and files usually means
   a refresh is being copied in right now: wait a moment and read again before giving up. */
export function loadData(base) {
  if (!loading) loading = (async () => {
    let r = await fetchAll(base);
    if (r.bad.length) {
      await new Promise(ok => setTimeout(ok, 1500));
      r = await fetchAll(base);
      if (r.bad.length) throw new Error('data files do not match manifest.json: ' + r.bad.join('; '));
    }
    return normalise(r.manifest, r.raw);
  })();
  return loading;
}
