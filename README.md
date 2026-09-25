# Comms Intelligence Dashboard

Single-file HTML dashboard for internal communications performance (mailings, articles, pages, video, click tracking), styled to the corporate design system (`Arbeit/00-design-system/`).

## Files

| Path | Purpose |
|---|---|
| `dashboard/template.html` | The dashboard. Data slot: `const DATA = /*__DATA__*/null;` |
| `scripts/build_demo.py` | Generates synthetic data in the production `DATA` schema and writes the demo build |
| `dashboard/comms-intelligence-dashboard-demo.html` | Demo build — open directly in a browser, no server needed |
| `dashboard/template-v3.html` | Redesign mockup (Summary tab, filter bar with chips, standard tab layout, method drawer, prior-year comparison). Same `DATA` slot |
| `dashboard/comms-intelligence-dashboard-v3-demo.html` | v3 demo build |
| `dashboard/compare.html` | v2 and v3 side by side with synced tabs and per-tab change notes — open this to review the redesign |
| `skills/comms-dashboard-v3-fill/SKILL.md` | Agent skill (single file) that fills `template-v3.html` with the real data of the original v2 dashboard: extracts its `DATA` block, checks every field v3 reads, adds cut-off date, source line and optional prior year, and writes the result next to the original — never into Git. Script `fill_v3.py` inline |
| `skills/comms-dashboard-to-excel/SKILL.md` | Agent skill (single file) that extracts the dashboard's `DATA` block (v2 original or filled v3) into a workbook: overview, a summary sheet per area with the dashboard's groupings, and pivot-ready data sheets. Every figure is a formula; the script recalculates the file in LibreOffice and reconciles it against `DATA` before it is handed over. Minimal corporate table style, no gridlines. Script `dashboard_to_xlsx.py` inline; output never into Git |
| `skills/html-dashboard-to-excel/SKILL.md` | Agent skill (single file) that extracts the data of any HTML dashboard into a workbook, values exactly as found: JSON/JS blocks (also minified bundles, base64/gzip payloads), chart configs (Plotly incl. binary arrays, Chart.js, ECharts, Highcharts, ApexCharts, Vega-Lite), HTML tables, KPI tiles, SVG data attributes and local files the page loads; a browser probe for data built at runtime. Overview with a coverage report; read-back check. Script `html_dashboard_to_xlsx.py` inline |
| `test-dashboards/` | Six synthetic comms dashboards, each storing its data a different way, plus `expected.json` (answer key: rows and column sums per dataset). Built by `scripts/build_test_dashboards.py`; `scripts/score_extraction.py` runs the skill's script on them (and on the v2 demo) and scores it |
| `skills/corporate-html-rebrand/SKILL.md` | Agent skill (single file) that re-brands any existing HTML page to the corporate design system without changing data or behaviour — tokens, chart rules, library recipes and the `brand_check.py` checker inline. Upload as-is to an agent platform |
| `skills/corporate-pptx-rebrand/SKILL.md` | Agent skill (single file) that re-brands any existing PowerPoint deck to the corporate design system without changing text, numbers, chart data or shape positions — role-based colour map, theme, charts (donuts, one-colour single series, no gridlines), financial-style tables, typography, contrast fixes and name removal for decks that leave the organisation. Script `pptx_brand.py` (`check` / `apply` / `render`, standard library only) inline. Upload as-is to an agent platform |
| `skills/redesign/SKILL.md` | Agent skill (single file) that redesigns any internal-comms HTML dashboard for at-a-glance reading with the same data: inventories every dataset in the page (JSON, JS literals, chart configs, tables, SVG, fetched files), agrees a plan with the user in one checkpoint, then builds a new self-contained page from `data.json` + `layout.json` in which every figure is computed, reconciled with the original and linted (≤ 5 KPIs with comparisons, one question per section, no summed unique visitors, brand palette). Script `dash_redesign.py` (`inventory` / `init` / `build` / `check`, standard library only) inline |
| `skills/redesign/redesign.txt` | Byte-identical copy of the redesign `SKILL.md` for agent builders that do not accept `.md` knowledge files. Never edit by hand: `python3 scripts/redesign_skill_tool.py embed` or `sync` writes it |
| `skills/redesign/agent-instructions.txt` | Agent-builder instructions for the redesign skill (≤ 8,000 characters): load `redesign.txt` from the knowledge base, extract the script, mandatory checkpoint, data rules |
| `scripts/redesign_skill_tool.py` | Maintains the redesign skill: `extract` the inline script, `embed` it back (and sync `redesign.txt`), `test`, `verify` (txt identical, instruction length, `--forbid NAME`) |
| `scripts/tests/` | Tests for the redesign script against the synthetic dashboards in `test-dashboards/` (answer key `expected.json`) and a fixture layout |
| `test-dashboards/`, `scripts/build_test_dashboards.py` | Synthetic comms dashboards that embed their data in the common ways (Plotly, Chart.js, ECharts, Highcharts, static tables, SVG, fetch, Vite bundle) plus the answer key. All names and figures fictional |
| `check.ps1`, `check.cmd` | File check for a hand-copied folder on a machine without git: hashes every repository file, names each one that is missing or outdated (also browser copies like `name (1).ext`) and prints its download URL. The file list is embedded in `check.ps1` |
| `scripts/check_manifest.py` | Writes that embedded list from the git index (`build`, `verify`, `install-hook`); `scripts/tests/test_check_manifest.py` fails while it is out of date |

The demo data includes a synthetic `DATA.prior` block (2025, same schema) and `DATA.asOf`; v3 uses them for year-on-year change and the partial-month flag, v2 ignores them. Production needs the prior-year email, article and video exports in the same schema.

```bash
python3 scripts/build_demo.py
```

## Hand-copying to a machine without git

Where cloning and ZIP downloads are blocked, files come down one at a time. To see whether the folder is complete and current:

1. Download `check.ps1` fresh (it carries the list of files and their hashes, so an old copy checks against an old list). `check.cmd` only needs downloading once.
2. Double-click `check.cmd` in the folder that mirrors the repository. Or run `.\check.ps1 -Only dashboard,skills` to check some folders only.
3. Download every URL it prints and save it under the path shown, replacing the old file. `-Open` opens them all in the browser. Run it again until it reports `all files current`.

A file with Windows line endings (CRLF) counts as current. Local files the repository does not have (real data, outputs) are counted but left alone, and `-ShowExtra` lists them.

On the machine that commits, run `python3 scripts/check_manifest.py install-hook` once. From then on every commit rebuilds the list in `check.ps1`.

## Using real data

Use the `comms-dashboard-v3-fill` skill for v3 (it validates the schema and reconciles against the original). By hand: replace the line `<script>const DATA = /*__DATA__*/null;</script>` in `template.html` with the production `const DATA = {...}` line. The schema (`mailP` columnar with `dims`/`cols`, `arts`, `vids`, `pages`, `links`, `pgLevel`, `pgDiv`, `pgReg`, `hcGeduld`, `hcDash`, `src`) was reconstructed from the v2 source; check the browser console once after swapping.

## Colour rules applied

- Every single-series bar is Grey VI `#404040`; a second series is Bronze I `#B98E2C`. No chart is filled red.
- Corporate Red appears only as accent: active tab, primary button, first KPI marker, interpretation callout rule.
- Warm greys only; status badges use RAG colours for data-driven verdicts, Pastel I for neutral ones.
- No gridlines, 1px black baselines, no all-caps, no brand name anywhere in code.
