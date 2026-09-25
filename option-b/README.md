# Comms Intelligence Dashboard: Option B (data separated from presentation)

The single-file dashboards from `../dashboard/` rebuilt so that a data refresh never needs a code change, a merge request or a redeploy. Figures live in `data/*.json`; the page is a static shell that loads them.

| Page | What it is |
|---|---|
| `index.html` | The redesigned dashboard (v3 from `../dashboard/template-v3.html`): Summary tab, filter bar with chips, prior-year comparison, method drawer |
| `index2.html` | The branded original (v2 from `../dashboard/template.html`): left-hand control panel with every filter, not redesigned |

Both read the same `data/` files and share the data, state and service layers. They show exactly what their single-file originals show (see [Verification](#verification)).

## Run it

Every block below is one line: copy it, paste it into the terminal, press Enter. Only Python is needed, no packages. On Windows, type `python` instead of `python3` (the Windows blocks already do).

**1. Go to this folder.** Open the terminal in the repository folder, then:

```
cd option-b
```

**2. Build the data** from the real dashboard. Save it as `dashboard/clarity.html` (the `dashboard/` folder next to `option-b/`; Git ignores this file, so real figures stay out of the repository). Then:

Windows:

```powershell
python scripts/build_clarity_data.py --from-html ../dashboard/clarity.html
```

macOS / Linux:

```bash
python3 scripts/build_clarity_data.py --from-html ../dashboard/clarity.html
```

It worked if the output ends with `verified … checks against the source DATA: identical` and `wrote .../data`. The original dashboard hardcodes its year in the page, not in its data. The build therefore takes the year from the headcount months and article dates and prints it (`reporting year 2026 (inferred …)`). If that line shows the wrong year, or the build stops with `reporting year unknown`, add `--year 2026` to the command. The files land in `option-b/data/`, which Git ignores too. Run the same command again whenever `clarity.html` is replaced with a newer version.

If the build stops, look at the structure of the dashboard's data first. This shows every dataset with its row count and field names, and which fields the build does not know or misses. It shows names and counts, never values, and writes nothing:

```
python scripts/build_clarity_data.py --from-html ../dashboard/clarity.html --inspect
```

Fields the build does not know are carried over unchanged. The one exception is extra mailing columns, which the build names in a `note:` line.

**From the bridge workbook instead** (the long-term source). Save the bridge workbook as `dashboard/bridge.xlsx` and the pack list as `dashboard/packs.xlsx` (Git ignores every `.xlsx` in `dashboard/`). Open the bridge workbook in Excel and save it once first: the build reads the values Excel last calculated, not the formulas. Then, with the cut-off date of the data:

```
python scripts/build_clarity_data.py --bridge ../dashboard/bridge.xlsx --packs ../dashboard/packs.xlsx --cutoff 2026-09-19
```

It worked if the output ends with `verified … checks against the workbook: identical`. Read the `note:` lines: they name what the build decided on its own (a missing column, a headcount row whose Key disagrees with its Year and Month, tracking IDs whose pack is not in the pack list). If the build stops, check the workbook's structure first. This shows, per sheet, the header row, the row count, the columns the build misses and the ones it does not use; names and counts only, never values:

```
python scripts/build_clarity_data.py --bridge ../dashboard/bridge.xlsx --packs ../dashboard/packs.xlsx --inspect
```

Without the real dashboard, the demo data in this repository works instead (`--demo` stands for the demo dashboard and its reach reference month 2026-06):

```
python scripts/build_clarity_data.py --demo
```

**3. Start the local web server** (ES modules and `fetch()` do not work from `file://`, so double-clicking the HTML file is not enough). Leave this terminal window open:

Windows:

```powershell
python scripts/serve.py
```

macOS / Linux:

```bash
python3 scripts/serve.py
```

Use this rather than `python -m http.server`. That server accepts only 5 waiting connections, but the page loads about 30 files at once, so some are refused and the page can hang on "Loading data".

**4. Open in the browser:**

- v2: http://localhost:8000/index2.html
- v3: http://localhost:8000/

**5. Stop the server:** press `Ctrl+C` in the terminal.

Opened straight from disk, the page shows a notice explaining this instead of a blank screen. If port 8000 is taken, add `8001` to the command in step 3 (`python scripts/serve.py 8001`) and use it in the URLs.

**`data/` is never in Git** (`.gitignore`). The repository holds the structure (this script and the [data contract](#data-contract)), not the figures: demo and production data are built into the same folder by the same command, so the page never changes and real figures cannot be committed by accident. The demo build is reproducible: the command above writes the files byte for byte as they were last committed, apart from `generated_at`. A fresh checkout shows the load-error notice until step 1 has run.

## Structure

```
option-b/
├── index.html, index2.html   # markup shells only: no data, no logic
├── assets/
│   ├── tokens.css            # design tokens (shared)
│   ├── styles.css            # index.html components
│   ├── styles-v2.css         # index2.html components
│   └── vendor/               # empty: charts are hand-drawn SVG, no chart library
├── src/
│   ├── main.js, main-v2.js   # bootstrap: load -> normalise -> render
│   ├── boot.js               # data location (<meta name="data-base">), load-error notice
│   ├── state/store.js        # replaces the global S; subscribers hear what changed and why
│   ├── data/loader.js        # fetch manifest + datasets, check row counts
│   ├── data/decode.js        # dims/cols -> records; joins visitor splits to pages
│   ├── services/period.js    # cut-off, inPer, period labels, CUR/PRV as year selections
│   ├── services/filter.js    # mail/article/video/page/click filters, cached by filter signature
│   ├── services/aggregate.js # mailAgg, groupMail, monthly, sum/mean/median
│   ├── services/metrics.js   # rate method, change vs prior year, peer benchmark, headcount
│   ├── services/format.js    # number, date and URL formatting
│   ├── viewmodels/           # one per tab (v3), v2/ for index2: numbers in, display values out
│   ├── views/                # tab layouts: which component gets which part of the view-model
│   └── components/           # KPI row, charts, tables, filter bar, drawer (v2/ for index2)
├── data/                     # the only thing that changes on refresh; not in Git, built by step 1
│   ├── manifest.json
│   └── mailings.json, articles.json, videos.json, pages.json, clicks.json, packs.json
├── overrides.yaml            # manual rows the exports miss, reviewed in Git
└── scripts/
    ├── build_clarity_data.py # replaces the Excel control panel; --inspect shows the source structure
    ├── serve.py              # local web server for the page (longer connection queue than http.server)
    ├── parity_check.cjs      # cut-over check against the single-file original
    └── tests/test_bridge.py  # --bridge against a workbook written from the demo data
```

Deploy boundary: everything except `data/` is the container image and goes through the merge request and pipeline. `data/` is a mounted volume or object-store prefix and is replaced on its own. To read data from somewhere else, change `<meta name="data-base" content="data/">` in the two shells.

## Data contract

`manifest.json` carries what used to be hardcoded in the page: `schema_version`, `generated_at`, `reporting_year`, `reach_reference_month`, `cutoff_date`, `sources` (bridge, packs), `headcount` (Geduld and dashboard, per month), and per dataset its file and row count (split by year where it has one). The page renders its header from it.

| File | Content |
|---|---|
| `mailings.json` | Dictionary-encoded: `dims` holds the value lists, `cols` one array per column (indexes for dimension columns, values otherwise). Both years in one block, column `y` |
| `articles.json` | One row per article, both years; `date` ISO, `reach` = unique visitors ÷ Geduld headcount of the publishing month (from the build) |
| `videos.json` | One row per video, both years |
| `pages.json` | `pages` (page-level export, with `reach` = views × 0.8 ÷ dashboard headcount of the reference month), `visitor_division` and `visitor_region` as url + split + unique visitors |
| `clicks.json` | `pages` and `links` of the click-tracking export (cumulative, no dates) |
| `packs.json` | Pack list, sheet `07-packs`, only rows with `in_report` |

The loader compares every file with the row count the manifest announces. If they differ (a refresh being copied in), it waits 1.5 s, reads again and otherwise shows the error instead of wrong figures. The build writes each file atomically and the manifest last.

## Build step

`scripts/build_clarity_data.py` does, once and before anything reaches the page:

1. **Inclusion**: packs without `in_report` are dropped (`--packs`); a pack list without that column puts every pack in, with a note. The bridge workbook's `Include` column is a formula on its control-panel filters, not a rule, so every row is read.
2. **Date conversion**: Excel serials and "05 Mar 2026" strings become ISO dates; month and quarter are checked against the date.
3. **Derived metrics**: article reach and intranet reach, from `manifest.headcount`.
4. **Overrides**: rows from `overrides.yaml` (videos and articles; needs PyYAML once the file has entries), each with a `reason`.
5. **Check**: in `--from-html` mode, rebuilds the legacy `DATA` from the written files and fails on any difference.

**Refresh through the Excel agent.** The `comms-dashboard-to-excel` skill (`../skills/comms-dashboard-to-excel/`) writes the same seven files next to its workbook, in the folder `comms-intelligence-data-<cut-off>-json/`, byte-identical to this script's output for the same dashboard (overrides and pack list aside). For the workplace agent builder: `comms-dashboard-to-excel.txt` is the knowledge file, `agent-instructions.txt` the prompt. Its JSON section mirrors this script: change both together.

`--bridge` reads the bridge workbook directly: `read_bridge()` returns the same dictionary as `read_inline_data()`, so everything after it is shared. Replacing the workbook with a Fabric feed later only changes that function. Columns are found by their header text (case and spacing do not matter), so moving or adding columns changes nothing; each sheet's columns are listed in `MAIL_SHEET`, `ART_SHEET` and the constants after them.

| Sheet | Becomes | Rules |
|---|---|---|
| `Data_Mailings` | `mailings.json` | Reporting year = latest `Year`; the year before is the prior-year block when the sheet has rows for it. Blank `Corp Comms KPI reporting` → "Non Corp Comms" (sender Not Corp Comms) or "Corp Comms – unmapped"; blank `Corp Comms new mapping` → "Not mapped". Blank counts are 0, blank rates stay empty and are left out of averages. `Theme` and `Topic` hold one value each |
| `Data_Articles` | `articles.json` | Year from `publishing date`; `UV_total` is the visitor count; `author` keeps the address, `aus` is the display name built from it (first.last@… → First Last); `topic tag` is comma-separated |
| `Data_Videos` | `videos.json` | Year from `created date`, which must fall in `_Month` |
| `Data_Pages_level`, `…_Divisional_Split`, `…_Regional_Split` | `pages.json` | The splits keep URL, segment and unique visitors (and YTD where present); page attributes come from the page level. The two `Target …` columns are organisation and region, in that order; `Topic Tag` is comma-separated |
| `Data_Clicks_Pages`, `Data_Clicks_Links` | `clicks.json` | CTVR and UCTUVR are left out: the page computes them |
| `Ref_Headcount` | `manifest.headcount` | One table per denominator under a title naming Geduld or Dashboard; the month comes from `Year` and `Month`; only `Status` = Internal counts. A month where Internal ≠ Active + Paid leave + Unpaid leave gets a note. Without a Dashboard table, intranet reach uses the Geduld headcount (with a note) |
| pack list, sheet `07-packs` | pack and cluster names | A tracking ID reads `PREFIX-NNNNNNN-…`: `PREFIX-NNNNNNN` is the `Pack ID`, `PREFIX` the `Cluster prefix`; `0000000` means no pack. A prefix is named by the `Cluster` its filled rows carry. `CCCCC` is a placeholder: `CCCCC-0000000-…` counts as no tracking ID, and it names no cluster |

`scripts/tests/test_bridge.py` writes a bridge workbook and a pack list in this layout from the demo data, reads them back and compares every record with the demo dashboard (`python3 -m unittest discover -s option-b/scripts/tests`, from the repository root; needs openpyxl).

## Verification

As built on 24.09.2026 against the synthetic demo data:

- **Build check:** 15 checks, generated files identical to the inline `DATA`. Broken inputs (date vs month, split attributes, column lengths, `src` counts, empty template, unknown reference month) stop the build with a message.
- **Parity:** `scripts/parity_check.cjs` runs 67 scenarios on `index.html` and 51 on `index2.html` (every tab, periods, filters, bar and row clicks, chips, drawers, sort, method switch, search boxes). It compares all visible text, chart labels included, with the original. Result: v2 51/51 identical; v3 65/67. The two v3 differences are intended wording in the method drawer (reach "computed once in the build step"; provenance from the manifest instead of a hardcoded demo note).
- **Screenshots:** full-page screenshots of every tab are byte-identical for v3. For v2, the only difference is a 6×8 px patch in the header "Source" line, which is now a separate text run.
- **CSV exports:** identical on all 14 tabs.
- **Failure paths:** manifest/file mismatch shows the error on both pages, and opening from disk shows the HTTP notice.

```bash
NODE_PATH=<folder containing node_modules/playwright> node scripts/parity_check.cjs \
  http://localhost:8000/dashboard/comms-intelligence-dashboard-v3-demo.html http://localhost:8000/option-b/index.html v3
```
(serve the project root for this, so both the original and `option-b/` are reachable)

## Deliberate differences from the plan and the originals

- `manifest.headcount` holds one value per month, not one number: reach uses the publishing month's headcount, and v2 lets the user pick the reference month.
- `index2.html` keeps v2 behaviour: whole reporting year without the cut-off (videos published after `cutoff_date` count), no prior-year comparison, simple-average rates. `index.html` applies the cut-off to every dataset.
- Intranet reach is computed in the build but neither page shows it yet.
- `packs.json` is loaded but not yet shown. Pack names reach the mailings through the tracking ID as before.
- `index.html` and `index2.html` load about 25 small modules each. That is fine behind a normal web server; bundle them if the platform charges per request.

## Open items (from the plan)

- Confirm the two headcount denominators and who owns them.
- Decide where `data/` is served from (mounted volume vs object store) with the platform owner.
- Name the person accountable for running the refresh before go-live.
- Run `--bridge` on the real workbook once and compare the result with the original dashboard, then point `data/` at the mounted volume. Real exports never go into Git.
- Bridge workbook: where the Dashboard headcount table is, and the Key of January 2026 in the Geduld table (it reads 2025-01).
