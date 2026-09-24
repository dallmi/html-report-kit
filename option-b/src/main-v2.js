/* index2.html bootstrap: load -> normalise -> render, with the original control-panel layout. */
import { loadData } from './data/loader.js';
import { createStore, setFilter } from './state/store.js';
import { splitYears } from './services/period.js';
import { $, $$ } from './components/svg.js';
import { toCsv } from './components/blocks.js';
import { ControlPanel } from './components/v2/blocks.js';
import { panelSpec, panel, resetPatch, scopeLabel, rowCount } from './viewmodels/v2/panel.js';
import { makeViews, initBreakdownControls } from './views/v2/tabs.js';
import { showBootError, dataBase } from './boot.js';

async function boot() {
  const D = await loadData(dataBase());
  const M = D.manifest, Y = M.reporting_year;
  /* v2 shows the whole reporting year as exported (no cut-off, no prior-year comparison) */
  const { CUR } = splitYears(D, Y);
  const ctx = { D, M, Y, CUR };
  const SPEC = panelSpec(ctx);

  const refs = Object.keys(M.headcount.dashboard).filter(k => M.headcount.geduld[k]).sort();
  const ref = refs.includes(M.reach_reference_month) ? M.reach_reference_month : refs[refs.length - 1] || M.reach_reference_month;

  const store = createStore({
    tab: 'overview', ref,
    ml: { q: 'all', m: 'all', cc: 'all', div: 'all', ct: 'all', th: 'all', tp: 'all', tm: 'all', cl: 'all', pk: 'all', tcl: 'all', tid: '' },
    ar: { q: 'all', m: 'all', name: 'all', au: 'all', ov: 'all', th: 'all', tp: 'all', ts: 'all', rg: 'all', ch: 'all', pk: 'all', tcl: 'all' },
    vd: { div: 'all', q: 'all', m: 'all', lang: 'all', name: '' },
    cl: { site: 'all', url: 'all', dest: '', link: '' },
    pg: { site: 'all', div: 'all', ct: 'all', th: 'all', tp: 'all', org: 'all', rg: 'all', vdiv: 'all', vreg: 'all' },
    mlSort: { k: 'es', dir: -1 }, ex: { dim: 'div', metric: 'es', top: 15 },
  });

  const act = {
    sort: k => { const cur = store.get().mlSort; store.set({ mlSort: { k, dir: cur.k === k ? -cur.dir : -1 } }, 'table'); },
  };
  const views = makeViews(ctx, act);
  let lastVm = null;

  const buildPanel = s => ControlPanel(panel(SPEC, s), {
    onSelect: (ns, k, v) => setFilter(store, ns, k, v, 'filter'),
    onSearch: (ns, k, v) => setFilter(store, ns, k, v, 'filter'),
  });
  const render = s => {
    const scope = scopeLabel(SPEC, s, Y);
    $('#fCount').textContent = rowCount(ctx, s); $('#hScope').textContent = scope; $('#hRef').textContent = s.ref;
    lastVm = views[s.tab](s, scope);
  };
  const setTopH = () => document.documentElement.style.setProperty('--topH', $('.topbar').offsetHeight + 'px');

  store.subscribe((s, why) => {
    if (why === 'tab') {
      $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.p === s.tab));
      $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'p-' + s.tab));
      buildPanel(s); render(s);
    } else if (why === 'panel') { buildPanel(s); render(s); }
    else if (why === 'table') views.mailTable(s);
    else render(s);
  });

  /* ---- header and reference month from the manifest ---- */
  $('#hSrc').textContent = M.sources.bridge || 'not stated';
  $('#fRef').innerHTML = refs.map(k => `<option value="${k}"${k === ref ? ' selected' : ''}>${k}</option>`).join('');
  $('#fRef').addEventListener('change', e => store.set({ ref: e.target.value }, 'view'));
  initBreakdownControls(store.get(), ex => store.set({ ex }, 'view'));
  $('#bReset').addEventListener('click', () => store.set(resetPatch(SPEC, store.get()), 'panel'));
  $('#bCsv').addEventListener('click', () => toCsv(lastVm.csv()));
  $$('.tab').forEach(t => t.addEventListener('click', () => store.set({ tab: t.dataset.p }, 'tab')));
  window.addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(() => { setTopH(); render(store.get()); }, 200); });
  window.addEventListener('message', e => { const b = e.data && e.data.tab && document.querySelector(`.tab[data-p="${e.data.tab}"]`); if (b) b.click(); });

  $('#boot').remove();
  setTopH();
  store.set({}, 'tab');
}

boot().catch(showBootError);
