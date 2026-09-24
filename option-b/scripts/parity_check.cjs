/* Parity check for the cut-over (migration step 4): drives the original single-file dashboard
   and the refactored page through the same clicks and compares every visible text, chart labels
   included, after each step. Exit code 1 on any difference.

   Needs Playwright with Chromium (dev tool, not part of the page):
     NODE_PATH=<dir with node_modules/playwright> node scripts/parity_check.cjs \
       http://localhost:8000/dashboard/comms-intelligence-dashboard-v3-demo.html http://localhost:8000/option-b/index.html v3
     ... comms-intelligence-dashboard-demo.html ... option-b/index2.html v2
*/
const { chromium } = require('playwright');

const [, , OLD, NEW, KIND = 'v3'] = process.argv;
if (!OLD || !NEW) { console.error('usage: parity_check.cjs OLD_URL NEW_URL [v3|v2]'); process.exit(2); }

/* ---- page actions (same DOM ids in both versions) ---- */
const sel = (id, v) => async p => { await p.selectOption('#' + id, String(v)); await p.waitForTimeout(60); };
const type = (id, v) => async p => { await p.fill('#' + id, v); await p.waitForTimeout(450); };
const click = css => async p => { await p.click(css); await p.waitForTimeout(60); };
const tab = t => click(`.tab[data-p="${t}"]`);
/* nth clickable bar row of a chart */
const bar = (id, n) => async p => { await p.locator(`#${id} g.row.click`).nth(n).click({ force: true }); await p.waitForTimeout(60); };

async function snapshot(p) {
  return p.evaluate(() => {
    const txt = el => el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
    const panel = document.querySelector('.panel.active');
    const svgs = panel ? [...panel.querySelectorAll('svg')].map(s => [...s.querySelectorAll('text')].map(t => t.textContent).join('|')) : [];
    const selects = [...document.querySelectorAll('select')].filter(s => s.offsetParent || s.closest('.drawer.open'))
      .map(s => s.id + '=' + (s.selectedOptions[0] ? s.selectedOptions[0].text : ''));
    const drawer = document.querySelector('.drawer.open');
    return {
      header: txt(document.querySelector('.hmeta')),
      bar: txt(document.querySelector('#fbar')) + ' // ' + txt(document.querySelector('#chips')),
      aside: txt(document.querySelector('aside:not(.drawer)')),
      panel: txt(panel), charts: svgs, selects, drawer: txt(drawer),
    };
  });
}

const V3 = [
  ['summary default', []],
  ['email default', [tab('email')]],
  ['articles default', [tab('articles')]],
  ['pages default', [tab('pages')]],
  ['video default', [tab('video')]],
  ['clicks default', [tab('clicks')]],
  ['explore default', [tab('explore')]],
  ['summary Q2', [sel('fPer', 'q2')]],
  ['summary Aug partial', [sel('fPer', 'm8')]],
  ['summary Q3', [sel('fPer', 'q3')]],
  ['email Q1', [tab('email'), sel('fPer', 'q1')]],
  ['email ct filter', [tab('email'), sel('f_ml_ct', 'Newsletter')]],
  ['email div + band', [tab('email'), sel('f_ml_div', 'Non Corp Comms'), sel('f_ml_cl', 'B 500-1999')]],
  ['email seg worst', [tab('email'), click('#emSeg button[data-k="worstO"]')]],
  ['email seg bestC + show all', [tab('email'), click('#emSeg button[data-k="bestC"]'), click('#emMore')]],
  ['email seg size', [tab('email'), click('#emSeg button[data-k="size"]')]],
  ['email ct bar click', [tab('email'), bar('cEmCt', 1)]],
  ['email ct bar click twice', [tab('email'), bar('cEmCt', 1), bar('cEmCt', 1)]],
  ['email band row click', [tab('email'), click('details.more summary'), click('#tEmBand tbody tr:nth-child(3)')]],
  ['email div bar click', [tab('email'), click('details.more summary'), bar('cEmDiv', 2)]],
  ['email method simple', [tab('email'), click('#bMethod'), click('#drawer input[value="s"]')]],
  ['email simple + Q2', [tab('email'), click('#bMethod'), click('#drawer input[value="s"]'), sel('fPer', 'q2')]],
  ['email more filters theme', [tab('email'), click('#bMore'), sel('f_ml_th', 'Culture')]],
  ['email more filters pack blank', [tab('email'), click('#bMore'), sel('f_ml_pk', '__blank__')]],
  ['email more filters pack', [tab('email'), click('#bMore'), sel('f_ml_pk', 'Promotions 2026')]],
  ['email tid search', [tab('email'), click('#bMore'), type('f_ml_tid', 'TRK-2026-01')]],
  ['email chip remove', [tab('email'), sel('f_ml_ct', 'Survey'), sel('f_ml_div', 'GIC'), click('#chips .chip button[data-k="ct"]')]],
  ['email clear all', [tab('email'), sel('f_ml_ct', 'Survey'), sel('f_ml_div', 'GIC'), click('#bClear')]],
  ['email empty scope', [tab('email'), sel('f_ml_div', 'GSI'), sel('f_ml_ct', 'Survey'), sel('f_ml_cl', 'E >60000')]],
  ['articles Q1', [tab('articles'), sel('fPer', 'q1')]],
  ['articles theme', [tab('articles'), sel('f_ar_th', 'Careers')]],
  ['articles theme bar', [tab('articles'), bar('cArTheme', 2)]],
  ['articles top story', [tab('articles'), sel('f_ar_ts', 'Yes')]],
  ['articles channel + more', [tab('articles'), sel('f_ar_ch', 'Group news'), click('#arMore')]],
  ['articles drawer author', [tab('articles'), click('#bMore'), sel('f_ar_au', 'Clara Weiss')]],
  ['articles drawer topic', [tab('articles'), click('#bMore'), sel('f_ar_tp', 'Wellbeing')]],
  ['articles drawer pack', [tab('articles'), click('#bMore'), sel('f_ar_pk', '__blank__')]],
  ['articles method drawer', [tab('articles'), click('#bMethod')]],
  ['pages vdiv', [tab('pages'), sel('f_pg_vdiv', 'Investment Bank')]],
  ['pages vreg', [tab('pages'), sel('f_pg_vreg', 'APAC')]],
  ['pages site', [tab('pages'), sel('f_pg_site', 'Careers portal')]],
  ['pages div bar', [tab('pages'), bar('cPgDiv', 1)]],
  ['pages drawer theme + method', [tab('pages'), click('#bMore'), sel('f_pg_th', 'Technology'), click('#dX'), click('#bMethod')]],
  ['pages show all', [tab('pages'), click('#pgMore')]],
  ['video Q3', [tab('video'), sel('fPer', 'q3')]],
  ['video Jul', [tab('video'), sel('fPer', 'm7')]],
  ['video owner', [tab('video'), sel('f_vd_div', 'Investment Bank')]],
  ['video lang', [tab('video'), sel('f_vd_lang', 'DE')]],
  ['video owner bar', [tab('video'), click('details.more summary'), bar('cVdDiv', 0)]],
  ['video search', [tab('video'), click('#bMore'), type('f_vd_name', 'town hall')]],
  ['video method', [tab('video'), click('#bMethod')]],
  ['clicks site', [tab('clicks'), sel('f_cl_site', 'Learning hub')]],
  ['clicks url', [tab('clicks'), sel('f_cl_url', '/sites/ai-at-work/SitePages/use-cases.aspx')]],
  ['clicks page bar', [tab('clicks'), bar('cClPages', 3)]],
  ['clicks dest search', [tab('clicks'), click('#bMore'), type('f_cl_dest', 'mentoring')]],
  ['clicks link search + method', [tab('clicks'), click('#bMore'), type('f_cl_link', 'resource 3'), click('#dX'), click('#bMethod')]],
  ['explore dims', [tab('explore'), sel('exDim', 'th')]],
  ['explore month', [tab('explore'), sel('exDim', 'month'), sel('exMetric', 'es')]],
  ['explore pack min 1', [tab('explore'), sel('exDim', 'pk'), sel('exMin', '1'), sel('exTop', '999')]],
  ['explore cluster open', [tab('explore'), sel('exDim', 'tcl'), sel('exMetric', 'open'), sel('exMin', '20')]],
  ['explore team ctr simple', [tab('explore'), sel('exDim', 'team'), sel('exMetric', 'ctr'), click('#bMethod'), click('#drawer input[value="s"]')]],
  ['explore with email filter', [tab('email'), sel('f_ml_ct', 'Reminder'), tab('explore'), sel('exDim', 'cl')]],
  ['summary signal 1', [click('#smSig li:nth-child(1) .lnk')]],
  ['summary signal 2', [click('#smSig li:nth-child(2) .lnk')]],
  ['summary signal 3', [click('#smSig li:nth-child(3) .lnk')]],
  ['summary channel', [click('#smChan .lnk[data-t="clicks"]')]],
  ['summary method', [click('#bMethod'), click('#drawer input[value="s"]')]],
];

const V2 = [
  ['overview default', []],
  ['mailings default', [tab('mailings')]],
  ['articles default', [tab('articles')]],
  ['pages default', [tab('pages')]],
  ['videos default', [tab('videos')]],
  ['clicks default', [tab('clicks')]],
  ['breakdown default', [tab('breakdown')]],
  ['overview quarter', [sel('f_ml_q', '2')]],
  ['overview month', [sel('f_ml_m', '8')]],
  ['overview division', [sel('f_ml_div', 'Non Corp Comms')]],
  ['overview pack blank', [sel('f_ml_pk', '__blank__')]],
  ['overview pack + cluster', [sel('f_ml_pk', 'Town hall series'), sel('f_ml_tcl', 'Learning')]],
  ['overview audience', [sel('f_ml_cl', 'A 11-499')]],
  ['overview ref month', [sel('fRef', '2026-03')]],
  ['mailings quarter', [tab('mailings'), sel('f_ml_q', '1')]],
  ['mailings content type', [tab('mailings'), sel('f_ml_ct', 'Survey')]],
  ['mailings theme + topic', [tab('mailings'), sel('f_ml_th', 'Careers'), sel('f_ml_tp', 'CEO')]],
  ['mailings template + cc', [tab('mailings'), sel('f_ml_tm', 'Plain text'), sel('f_ml_cc', 'Corp Comms')]],
  ['mailings tid search', [tab('mailings'), type('f_ml_tid', 'TRK-2026-02')]],
  ['mailings sort', [tab('mailings'), click('#tMl th[data-k="open"]')]],
  ['mailings sort twice', [tab('mailings'), click('#tMl th[data-k="cto"]'), click('#tMl th[data-k="cto"]')]],
  ['mailings sort title', [tab('mailings'), click('#tMl th[data-k="t"]')]],
  ['mailings empty', [tab('mailings'), sel('f_ml_div', 'GSI'), sel('f_ml_ct', 'Survey'), sel('f_ml_cl', 'E >60000')]],
  ['mailings reset', [tab('mailings'), sel('f_ml_ct', 'Survey'), click('#bReset')]],
  ['articles quarter', [tab('articles'), sel('f_ar_q', '2')]],
  ['articles one article', [tab('articles'), sel('f_ar_name', 'Promotions 2026')]],
  ['articles author', [tab('articles'), sel('f_ar_au', 'Clara Weiss')]],
  ['articles top story + region', [tab('articles'), sel('f_ar_ts', 'Yes'), sel('f_ar_rg', 'Global')]],
  ['articles pack blank', [tab('articles'), sel('f_ar_pk', '__blank__')]],
  ['articles ref month', [tab('articles'), sel('fRef', '2026-02')]],
  ['articles topic', [tab('articles'), sel('f_ar_tp', 'Wellbeing')]],
  ['pages visitor division', [tab('pages'), sel('f_pg_vdiv', 'Investment Bank')]],
  ['pages visitor region', [tab('pages'), sel('f_pg_vreg', 'APAC')]],
  ['pages both visitor', [tab('pages'), sel('f_pg_vdiv', 'Group Functions'), sel('f_pg_vreg', 'EMEA')]],
  ['pages site + theme', [tab('pages'), sel('f_pg_site', 'AI at work'), sel('f_pg_th', 'Technology')]],
  ['pages org + topic', [tab('pages'), sel('f_pg_org', 'Division'), sel('f_pg_tp', 'Wellbeing')]],
  ['videos owner', [tab('videos'), sel('f_vd_div', 'Investment Bank')]],
  ['videos quarter', [tab('videos'), sel('f_vd_q', '3')]],
  ['videos month + lang', [tab('videos'), sel('f_vd_m', '7'), sel('f_vd_lang', 'EN')]],
  ['videos search', [tab('videos'), type('f_vd_name', 'client story')]],
  ['clicks site', [tab('clicks'), sel('f_cl_site', 'Learning hub')]],
  ['clicks url', [tab('clicks'), sel('f_cl_url', '/sites/ai-at-work/SitePages/use-cases.aspx')]],
  ['clicks dest', [tab('clicks'), type('f_cl_dest', 'mentoring')]],
  ['clicks link', [tab('clicks'), type('f_cl_link', 'resource 1')]],
  ['clicks no match', [tab('clicks'), type('f_cl_link', 'zzz')]],
  ['breakdown dims', [tab('breakdown'), sel('exDim', 'th')]],
  ['breakdown month', [tab('breakdown'), sel('exDim', 'month'), sel('exMetric', 'open')]],
  ['breakdown pack all', [tab('breakdown'), sel('exDim', 'pk'), sel('exTop', '999'), sel('exMetric', 'cto')]],
  ['breakdown map ctr', [tab('breakdown'), sel('exDim', 'map'), sel('exMetric', 'ctr')]],
  ['breakdown filtered', [tab('breakdown'), sel('f_ml_ct', 'Newsletter'), sel('exDim', 'cl'), sel('exMetric', 'uc')]],
  ['filters carry across tabs', [sel('f_ml_q', '3'), tab('mailings'), tab('breakdown'), tab('overview')]],
];

(async () => {
  const browser = await chromium.launch();
  const steps = KIND === 'v2' ? V2 : V3;
  let bad = 0;
  const errors = [];
  const open = async url => {
    const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    p.on('pageerror', e => errors.push(`${url}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error') errors.push(`${url}: ${m.text()}`); });
    for (let attempt = 1; ; attempt++) {
      try {
        await p.goto(url, { waitUntil: 'networkidle' });
        await p.waitForSelector('.panel.active .kpi', { timeout: 15000 });
        return p;
      } catch (e) { if (attempt === 2) throw new Error(`${url} did not render: ${e.message.split('\n')[0]}`); }
    }
  };
  for (const [name, acts] of steps) {
    const shots = [];
    for (const url of [OLD, NEW]) {
      const p = await open(url);
      try { for (const a of acts) await a(p); shots.push(await snapshot(p)); }
      catch (e) { shots.push({ error: e.message.split('\n')[0] }); }
      await p.close();
    }
    const [a, b] = shots, diffs = [];
    for (const k of Object.keys({ ...a, ...b })) {
      const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
      if (x === y) continue;
      if (Array.isArray(a[k]) && Array.isArray(b[k])) {
        const i = a[k].findIndex((v, j) => v !== b[k][j]);
        diffs.push(`${k}[${i}]\n      old: ${String(a[k][i]).slice(0, 400)}\n      new: ${String(b[k][i]).slice(0, 400)}`);
      } else {
        const s = String(a[k] ?? ''), t = String(b[k] ?? ''); let i = 0; while (i < s.length && s[i] === t[i]) i++;
        diffs.push(`${k} @${i}\n      old: …${s.slice(Math.max(0, i - 80), i + 160)}\n      new: …${t.slice(Math.max(0, i - 80), i + 160)}`);
      }
    }
    if (diffs.length) { bad++; console.log(`DIFF  ${name}\n    ` + diffs.join('\n    ')); }
    else console.log(`same  ${name}`);
  }
  await browser.close();
  if (errors.length) console.log('\nconsole errors:\n  ' + [...new Set(errors)].join('\n  '));
  console.log(`\n${steps.length - bad}/${steps.length} scenarios identical`);
  process.exit(bad || errors.length ? 1 : 0);
})();
