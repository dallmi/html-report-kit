/* Tab layouts for index2.html: view-model in, components out. Chart options stay as in the original. */
import { $, $$ } from '../../components/svg.js';
import { hBar, comboChart, groupCols, pairBar, bubbles } from '../../components/v2/charts.js';
import { Kpis, ValBar } from '../../components/v2/blocks.js';
import { setText, setHtml } from '../../components/blocks.js';
import { pct2 as pct, full } from '../../services/format.js';
import * as Overview from '../../viewmodels/v2/overview.js';
import * as Mailings from '../../viewmodels/v2/mailings.js';
import * as Articles from '../../viewmodels/v2/articles.js';
import * as Pages from '../../viewmodels/v2/pages.js';
import * as Videos from '../../viewmodels/v2/videos.js';
import * as Clicks from '../../viewmodels/v2/clicks.js';
import * as Breakdown from '../../viewmodels/v2/breakdown.js';

export function makeViews(ctx, act) {
  const mailTable = s => {
    setHtml('tMl', Mailings.table(ctx, s));
    $$('#tMl th').forEach(th => th.addEventListener('click', () => act.sort(th.dataset.k)));
  };
  return {
    mailTable,
    overview(s, scope) {
      const vm = Overview.build(ctx, s);
      Kpis('ovKpi', vm.kpis); setText('ovScope', scope); ValBar('ovVal', vm.val);
      comboChart('cOvTrend', vm.trend.cats, vm.trend.bars, vm.trend.line, vm.trend.opts);
      hBar('cOvMix', vm.mix, { rowH: 34, labelW: 170 });
      hBar('cOvDiv', vm.byDiv, { limit: 8, labelW: 150 });
      hBar('cOvCto', vm.byCto, { limit: 8, fmt: v => pct(v), labelW: 150 });
      hBar('cOvPack', vm.byPack, { limit: 8, labelW: 150 });
      setHtml('ovInsights', vm.insights);
      return vm;
    },
    mailings(s, scope) {
      const vm = Mailings.build(ctx, s);
      setText('mlScope', scope); Kpis('mlKpi', vm.kpis); ValBar('mlVal', vm.val);
      setHtml('mlInterp', vm.interp); setHtml('mlMethod', vm.method);
      groupCols('cMlRates', vm.rates.cats, vm.rates.A, vm.rates.B, vm.rates.opts);
      bubbles('cMlCluster', vm.bands);
      hBar('cMlCT', vm.byType, { limit: 9, fmt: v => pct(v), labelW: 200 });
      hBar('cMlPack', vm.byPack, { limit: 9, fmt: v => pct(v), labelW: 230 });
      mailTable(s);
      return vm;
    },
    articles(s, scope) {
      const vm = Articles.build(ctx, s);
      setText('arScope', scope); Kpis('arKpi', vm.kpis);
      setHtml('arFlag', vm.flag); ValBar('arVal', vm.val); setHtml('arSel', vm.selected);
      comboChart('cArTrend', vm.trend.cats, vm.trend.bars, null, vm.trend.opts);
      groupCols('cArReach', vm.reach.cats, vm.reach.A, vm.reach.B, vm.reach.opts);
      hBar('cArTheme', vm.byTheme, { limit: 8, fmt: x => full(x), labelW: 180 });
      hBar('cArTopic', vm.byTopic, { limit: 8, fmt: x => full(x), labelW: 210 });
      hBar('cArAuthor', vm.byAuthor, { limit: 8, fmt: x => full(x), labelW: 180 });
      hBar('cArChan', vm.byChannel, { limit: 8, fmt: x => full(x), labelW: 230 });
      setHtml('tAr', vm.table);
      return vm;
    },
    pages(s, scope) {
      const vm = Pages.build(ctx, s);
      setText('pgScope', scope); Kpis('pgKpi', vm.kpis); ValBar('pgVal', vm.val);
      hBar('cPgTop', vm.top, { limit: 10, labelW: 210 });
      hBar('cPgInt', vm.intensity, { limit: 10, fmt: x => x.toFixed(1) + '×', labelW: 210 });
      hBar('cPgDiv', vm.byDiv, { limit: 8, labelW: 200 }); hBar('cPgReg', vm.byReg, { limit: 8, labelW: 180 });
      hBar('cPgTheme', vm.byTheme, { limit: 8, fmt: x => full(x), labelW: 190 });
      hBar('cPgCt', vm.byType, { limit: 8, fmt: x => full(x), labelW: 190 });
      setHtml('tPg', vm.table);
      return vm;
    },
    videos(s, scope) {
      const vm = Videos.build(ctx, s);
      setText('vdScope', scope); Kpis('vdKpi', vm.kpis); ValBar('vdVal', vm.val); setHtml('vdInterp', vm.interp);
      groupCols('cVdTrend', vm.trend.cats, vm.trend.A, vm.trend.B, vm.trend.opts);
      hBar('cVdFunnel', vm.funnel, { fmt: x => pct(x, 1), rowH: 30, limit: 5, labelW: 130 });
      hBar('cVdDiv', vm.byOwner, { limit: 8, fmt: x => pct(x, 0), labelW: 180 });
      hBar('cVdEng', vm.engByOwner, { limit: 8, fmt: x => x.toFixed(1), labelW: 180 });
      setHtml('tVd', vm.table);
      return vm;
    },
    clicks(s, scope) {
      const vm = Clicks.build(ctx, s, scope);
      setText('clScope', vm.scope); Kpis('clKpi', vm.kpis); ValBar('clVal', vm.val); setHtml('clInterp', vm.interp);
      hBar('cClPages', vm.pages, { limit: 10, labelW: 190 });
      pairBar('cClCtr', vm.ratios, { limit: 9, labA: 'CTVR', labB: 'UCTUVR', labelW: 200 });
      setHtml('tCl', vm.table); setHtml('tLk', vm.links);
      return vm;
    },
    breakdown(s) {
      const vm = Breakdown.build(ctx, s);
      hBar('cEx', vm.chart, vm.opts); setHtml('exNote', vm.note); setHtml('tEx', vm.table);
      return vm;
    },
  };
}

export function initBreakdownControls(s, onChange) {
  $('#exDim').innerHTML = Breakdown.DIMS.map(([v, l]) => `<option value="${v}"${v === s.ex.dim ? ' selected' : ''}>${l}</option>`).join('');
  $('#exMetric').innerHTML = Breakdown.METRICS.map(([v, l]) => `<option value="${v}"${v === s.ex.metric ? ' selected' : ''}>${l}</option>`).join('');
  $('#exTop').value = String(s.ex.top);
  const read = () => onChange({ dim: $('#exDim').value, metric: $('#exMetric').value, top: +$('#exTop').value });
  ['#exDim', '#exMetric', '#exTop'].forEach(sel => $(sel).addEventListener('change', read));
}
