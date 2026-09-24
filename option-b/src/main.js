/* index.html bootstrap: load -> normalise -> render. */
import { loadData } from './data/loader.js';
import { createStore, setFilter } from './state/store.js';
import { splitYears, timeBasis } from './services/period.js';
import { buildPeers } from './services/metrics.js';
import { MN } from './services/format.js';
import { $, $$ } from './components/svg.js';
import { FilterBar, Chips } from './components/filterbar.js';
import { Drawer } from './components/drawer.js';
import { toCsv } from './components/blocks.js';
import { ML0, FSPEC, filterDefs, filterBar, chips, drawerFilters, resetValue } from './viewmodels/filters.js';
import * as Method from './viewmodels/method.js';
import { makeViews, initExploreControls } from './views/tabs.js';
import { showBootError, dataBase } from './boot.js';

async function boot() {
  const D = await loadData(dataBase());
  const M = D.manifest, { CUR, PRV, PY } = splitYears(D, M.reporting_year);
  const B = timeBasis(M, CUR.ml);
  const ctx = { D, M, B, CUR, PRV, PY, PEER: buildPeers(CUR.ml) };
  const defs = filterDefs(ctx);

  const store = createStore({
    period: 'ytd', method: 'w', tab: 'summary', drawer: null,
    ml: { ...ML0 },
    ar: { name: 'all', au: 'all', ov: 'all', th: 'all', tp: 'all', ts: 'all', rg: 'all', ch: 'all', pk: 'all', tcl: 'all' },
    vd: { div: 'all', lang: 'all', name: '' },
    pg: { site: 'all', div: 'all', ct: 'all', th: 'all', tp: 'all', org: 'all', rg: 'all', vdiv: 'all', vreg: 'all' },
    cl: { site: 'all', url: 'all', dest: '', link: '' },
    more: {}, emSort: 'bestO', ex: { dim: 'div', metric: 'cto', top: 15, min: 5 },
  });

  /* ---- user actions -> state ---- */
  const act = {
    set: patch => store.set(patch, 'view'),
    toggle: (ns, k, v) => setFilter(store, ns, k, store.get()[ns][k] === v ? 'all' : v, 'filter', { more: {} }),
    toggleMore: id => { const m = store.get().more; store.set({ more: { ...m, [id]: !m[id] } }, 'view'); },
    /* jump to a tab, optionally with filters (Summary signals) */
    go: ({ tab, patch = {} }) => {
      const s = store.get(), next = {};
      for (const k in patch) next[k] = patch[k] && typeof patch[k] === 'object' ? { ...s[k], ...patch[k] } : patch[k];
      store.set({ ...next, tab, more: {}, drawer: s.drawer === 'filters' ? null : s.drawer }, 'tab');
    },
    drawer: mode => store.set({ drawer: mode }, 'drawer'),
    csv: () => toCsv(lastVm.csv()),
  };
  const ctl = {
    onSelect: (ns, k, v) => setFilter(store, ns, k, v, 'filter', { more: {} }),
    onSearch: (ns, k, v) => setFilter(store, ns, k, v, 'search'),
  };
  const views = makeViews(ctx, act);

  /* ---- state -> page ---- */
  const renderChips = s => Chips(chips(defs, s), {
    onRemove: k => { const ns = FSPEC[s.tab].ns; setFilter(store, ns, k, resetValue(defs, ns, k), 'filter', { more: {} }); },
    onClear: () => {
      const sp = FSPEC[s.tab], v = { ...s[sp.ns] };
      [...sp.p, ...sp.m].forEach(k => v[k] = resetValue(defs, sp.ns, k));
      store.set({ [sp.ns]: v, more: {} }, 'filter');
    },
  });
  const renderBar = s => {
    FilterBar(filterBar(ctx, defs, s), { ...ctl, onPeriod: p => store.set({ period: p, more: {} }, 'filter'), onMore: () => act.drawer('filters') });
    renderChips(s);
  };
  const renderDrawer = s => Drawer(s.drawer, s.drawer === 'filters' ? drawerFilters(defs, s) : s.drawer ? Method.build(ctx, s) : null, {
    ...ctl, onClose: () => act.drawer(null), onMethod: m => store.set({ method: m }, 'method'), onCsv: act.csv,
  });
  let lastVm = null;
  const render = s => { lastVm = views[s.tab](s); if (s.drawer === 'method') renderDrawer(s); };

  store.subscribe((s, why) => {
    if (why === 'tab') {
      $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.p === s.tab));
      $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'p-' + s.tab));
      renderDrawer(s); renderBar(s); render(s); window.scrollTo(0, 0);
    } else if (why === 'filter') { renderBar(s); if (s.drawer) renderDrawer(s); render(s); }
    else if (why === 'search') { renderChips(s); render(s); }
    else if (why === 'drawer') renderDrawer(s);
    else render(s);
  });

  /* ---- header from the manifest, not from hardcoded strings ---- */
  $('#hAsOf').textContent = B.AS_OF ? `${B.AS_OF.getDate()} ${MN[B.AS_OF.getMonth() + 1]} ${B.AS_OF.getFullYear()}` : '—';
  $('#hPy').textContent = PY || '—';
  $('#hSrc').textContent = M.sources.bridge || 'not stated';

  initExploreControls(store.get(), ex => store.set({ ex }, 'view'));
  $('#bMethod').addEventListener('click', () => act.drawer(store.get().drawer === 'method' ? null : 'method'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && store.get().drawer) act.drawer(null); });
  $$('.tab').forEach(t => t.addEventListener('click', () => act.go({ tab: t.dataset.p })));
  window.addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(() => render(store.get()), 200); });
  /* #tab in the URL selects a tab; a parent frame can too, via postMessage */
  window.addEventListener('message', e => { if (e.data && e.data.tab && views[e.data.tab]) act.go({ tab: e.data.tab }); });

  $('#boot').remove();
  const h = location.hash.slice(1);
  act.go({ tab: views[h] ? h : 'summary' });
}

boot().catch(showBootError);
