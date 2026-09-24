/* Tab layouts for index.html: build the view-model, hand each part to a component.
   No arithmetic here; `act` carries the user's clicks back to the store. */
import { $, $$ } from '../components/svg.js';
import { hBar, lineChart } from '../components/charts.js';
import { KpiRow, VerdictLine, Table, Legend, setText, setHtml, dHtml, deltaCell } from '../components/blocks.js';
import { esc } from '../services/format.js';
import * as Summary from '../viewmodels/summary.js';
import * as Email from '../viewmodels/email.js';
import * as Articles from '../viewmodels/articles.js';
import * as Pages from '../viewmodels/pages.js';
import * as Video from '../viewmodels/video.js';
import * as Clicks from '../viewmodels/clicks.js';
import * as Explore from '../viewmodels/explore.js';

export function makeViews(ctx, act) {
  const PY = ctx.PY;
  const bars = (id, sec) => hBar(id, sec.rows, sec.toggle ? { ...sec.opts, onClick: r => act.toggle(sec.toggle[0], sec.toggle[1], r.key ?? r.l) } : sec.opts);
  const table = (s, id, sec, noteId, moreId) => Table(id, sec.cols, sec.rows, { noteId, moreId, expanded: !!s.more[id], onToggle: () => act.toggleMore(id) });

  return {
    summary(s) {
      const vm = Summary.build(ctx, s);
      setText('smScope', vm.scope);
      KpiRow('smKpi', vm.kpis, PY);
      setHtml('smSig', vm.signals.map((x, i) => `<li><span class="k">${x.k}</span><span>${x.t}</span><button class="lnk" data-i="${i}">${x.cta} &rarr;</button></li>`).join('') || '<li>No notable changes in this period.</li>');
      $$('#smSig .lnk').forEach(b => b.addEventListener('click', () => act.go(vm.signals[+b.dataset.i].go)));
      setText('smTrendSub', vm.trend.sub);
      lineChart('cSmTrend', vm.trend.cats, vm.trend.series, vm.trend.opts);
      Legend('smLeg', vm.legend);
      setHtml('smChan', vm.channels.map(c => `<div><div class="cn">${c.n}</div><div class="cm">${c.m}</div><div class="cv">${c.v}</div><div class="cd">${deltaCell(c.d, PY)}</div><button class="lnk" data-t="${c.t}">Open ${c.n} &rarr;</button></div>`).join(''));
      $$('#smChan .lnk').forEach(b => b.addEventListener('click', () => act.go({ tab: b.dataset.t })));
      return vm;
    },

    email(s) {
      const vm = Email.build(ctx, s);
      setText('emScope', vm.scope);
      KpiRow('emKpi', vm.kpis, PY);
      VerdictLine('emVerdict', vm.verdict);
      setText('emTrendSub', vm.trend.sub);
      lineChart('cEmOpen', vm.trend.cats, vm.trend.open, vm.trend.opts);
      lineChart('cEmCto', vm.trend.cats, vm.trend.cto, vm.trend.opts);
      Legend('emLeg', vm.legend);
      bars('cEmCt', vm.byType);
      setHtml('emSeg', vm.peers.sorts.map(({ k, l }) => `<button class="${k === vm.peers.sort ? 'on' : ''}" data-k="${k}">${l}</button>`).join(''));
      $$('#emSeg button').forEach(b => b.addEventListener('click', () => act.set({ emSort: b.dataset.k })));
      table(s, 'tEm', vm.peers, 'emTblNote', 'emMore');
      setHtml('tEmBand', '<thead><tr><th>Band</th><th class="num">Mailings</th><th class="num">Open</th><th class="num">vs ' + vm.bands.py + '</th><th class="num">CTO</th></tr></thead><tbody>' +
        vm.bands.rows.map(r => `<tr style="cursor:pointer" data-l="${esc(r.l)}"><td>${r.sel ? '<b>' : ''}${esc(r.l)}${r.sel ? '</b>' : ''}</td><td class="num">${r.ms}</td><td class="num">${r.open}</td><td class="num">${r.d ? dHtml(r.d, {}, PY).replace(/<span class="vs">.*?<\/span>/, '') : '—'}</td><td class="num">${r.cto}</td></tr>`).join('') + '</tbody>');
      $$('#tEmBand tbody tr').forEach(tr => tr.addEventListener('click', () => act.toggle(vm.bands.toggle[0], vm.bands.toggle[1], tr.dataset.l)));
      bars('cEmPack', vm.byPack);
      bars('cEmDiv', vm.byDiv);
      return vm;
    },

    articles(s) {
      const vm = Articles.build(ctx, s);
      setText('arScope', vm.scope);
      KpiRow('arKpi', vm.kpis, PY);
      VerdictLine('arVerdict', vm.verdict);
      setText('arTrendSub', vm.trend.sub);
      lineChart('cArTrend', vm.trend.cats, vm.trend.series, vm.trend.opts);
      Legend('arLeg', vm.legend);
      bars('cArTheme', vm.byTheme);
      table(s, 'tAr', vm.table, 'arTblNote', 'arMore');
      bars('cArTopic', vm.byTopic);
      bars('cArChan', vm.byChannel);
      bars('cArAuthor', vm.byAuthor);
      return vm;
    },

    pages(s) {
      const vm = Pages.build(ctx, s);
      setText('pgScope', vm.scope);
      KpiRow('pgKpi', vm.kpis, PY);
      VerdictLine('pgVerdict', vm.verdict);
      bars('cPgTop', vm.top);
      bars('cPgDiv', vm.byDiv);
      bars('cPgReg', vm.byReg);
      bars('cPgTheme', vm.byTheme);
      bars('cPgCt', vm.byType);
      table(s, 'tPg', vm.table, 'pgTblNote', 'pgMore');
      return vm;
    },

    video(s) {
      const vm = Video.build(ctx, s);
      setText('vdScope', vm.scope);
      KpiRow('vdKpi', vm.kpis, PY);
      VerdictLine('vdVerdict', vm.verdict);
      bars('cVdFunnel', vm.funnel);
      setText('vdTrendSub', vm.trend.sub);
      lineChart('cVdTrend', vm.trend.cats, vm.trend.series, vm.trend.opts);
      Legend('vdLeg', vm.legend);
      table(s, 'tVd', vm.table, 'vdTblNote', 'vdMore');
      bars('cVdDiv', vm.byOwner);
      bars('cVdEng', vm.engByOwner);
      return vm;
    },

    clicks(s) {
      const vm = Clicks.build(ctx, s);
      setText('clScope', vm.scope);
      KpiRow('clKpi', vm.kpis, PY);
      VerdictLine('clVerdict', vm.verdict);
      bars('cClPages', vm.pages);
      bars('cClLinks', vm.links);
      table(s, 'tCl', vm.table, 'clTblNote', 'clMore');
      return vm;
    },

    explore(s) {
      const vm = Explore.build(ctx, s);
      hBar('cEx', vm.chart.rows, vm.chart.opts);
      setHtml('exNote', vm.note);
      setHtml('tEx', vm.table);
      return vm;
    },
  };
}

/* the Explore selects are static markup; fill them once from the view-model's option lists */
export function initExploreControls(s, onChange) {
  $('#exDim').innerHTML = Explore.DIMS.map(([v, l]) => `<option value="${v}"${v === s.ex.dim ? ' selected' : ''}>${l}</option>`).join('');
  $('#exMetric').innerHTML = Explore.METRICS.map(([v, l]) => `<option value="${v}"${v === s.ex.metric ? ' selected' : ''}>${l}</option>`).join('');
  $('#exTop').value = String(s.ex.top); $('#exMin').value = String(s.ex.min);
  const read = () => onChange({ dim: $('#exDim').value, metric: $('#exMetric').value, top: +$('#exTop').value, min: +$('#exMin').value });
  ['#exDim', '#exMetric', '#exTop', '#exMin'].forEach(sel => $(sel).addEventListener('change', read));
}
