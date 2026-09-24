# `redesign` skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-file agent skill that redesigns an internal-comms HTML dashboard for at-a-glance reading, with the same data, and verifies the result.

**Architecture:** One Python script (`dash_redesign.py`, standard library only) with three commands — `inventory` (find every dataset in the original), `build` (render a new page from `data.json` + `layout.json` on a fixed skeleton with an inline SVG renderer), `check` (reconcile, lint, brand, render). The script lives only inside `SKILL.md`'s appendix; a repo tool extracts it for testing and syncs `redesign.txt`.

**Tech Stack:** Python 3.8+ stdlib (lenient JS-literal parser, no Node); vanilla JS + inline SVG in the output page; headless Chrome (optional) for render checks.

**Spec:** `docs/superpowers/specs/2026-09-24-redesign-skill-design.md`

## Global Constraints

- Output page: one self-contained HTML, no CDN, no external requests.
- Never write into the original file; never write into a Git working tree unless the target is git-ignored.
- No brand name anywhere in committed files; no absolute paths in committed files.
- Colours only from the corporate palette (`Arbeit/00-design-system/corporate-design-system.css`); no gradients, shadows, border radius, all-caps.
- ≤ 5 KPIs, ≤ 5 sections, one main chart per section, ≤ 3 filters (record-grain only).
- `agent-instructions.txt` ≤ 8,000 characters. `redesign.txt` byte-identical to `SKILL.md`.
- English throughout.

## Review Focus

1. A dataset the extractor cannot parse (minified bundle, missing fetched file) — expected: listed as a WARN with origin, never silently skipped.
2. Percent and locale formats in HTML tables (`38'846`, `69.2 %`, `15.8k`, `–`) — expected: parsed to numbers/fractions; blanks stay null, not 0.
3. Summing unique visitors across rows — expected: `check` fails with a named error.
4. A hand-edited redesigned HTML whose embedded view no longer matches its data — expected: `check` fails reconciliation.
5. A layout without prior-period data but with `compare: prior` — expected: build error naming the KPI, not a blank tile.

Tests for all five are in the tasks below.

---

### Task 1: Repo tooling and test harness

**Files:**
- Create: `scripts/redesign_skill_tool.py` — `extract` (SKILL.md appendix → `.py`), `embed` (`.py` → SKILL.md appendix, then copy to `redesign.txt`), `test` (run the test suite against the script extracted from SKILL.md), `verify` (`cmp`, character limit).
- Create: `scripts/tests/test_redesign.py` — unittest suite, loads the script module from a path given in `REDESIGN_SCRIPT`.
- Modify: `.gitignore` — add `test-dashboards/_out/`.

**Interfaces:** Produces `python3 scripts/redesign_skill_tool.py test` as the one test entry point.

- [x] Write the tool and an empty suite; `test` runs and reports 0 tests.

### Task 2: `inventory`

**Produces:** `inventory(path) -> dict` with `datasets: [{id, origin, grain, columns: [{key, type}], rows, n_rows, sums}]`, `visuals: [...]`, `libraries: [...]`, `warnings: [...]`; CLI writes `inventory.json` and prints a summary.

Components: lenient JS-literal parser (unquoted keys, single quotes, trailing commas, comments, `!0/!1`, `.5`, non-literal values kept as expression markers); decoders (base64 JSON, gzip+base64, Plotly `bdata` typed arrays); shape detectors (list of records, columnar dict, pandas split, key/value numbers, Chart.js / Plotly / ECharts / Highcharts / Vega-Lite configs); HTML tables (multi-row headers, rowspan/colspan, tfoot excluded, locale numbers, percentages as fractions); SVG `data-*` attributes; KPI tiles; local `fetch`/`d3.csv`/`d3.json` files; missing sources → WARN; de-duplication by rows + sums.

- [x] Test: for every fixture in `test-dashboards/expected.json`, every expected dataset is matched by an inventory dataset with the same row count and each expected sum equal to some column sum (tolerance 1e-6 relative). Run → FAIL.
- [x] Test: `05-events-fetch` reports a WARN for `feedback_raw.parquet`.
- [x] Test: `04-campaign-static` parses `69.2 %` as 0.692 and `–` as null.
- [x] Implement until green.

### Task 3: Catalogue and computation engine

**Produces:** `METRICS` (id → label, definition, jargon, additive, unit, good); `compute_view(data, layout) -> view` (KPI values, comparisons, deltas, chart series, tables, filled titles); `fmt(value, unit)`; errors raised as `LayoutError(msg)`.

- [x] Tests: sum/mean/median/weighted/ratio/count/last with `where`; delta for count (%) and percent (pp); `fmt` (12.3k, 1.2M, 61.8%, 2:41 min); placeholder filling; `sum` of `unique_visitors` over >1 row raises; `compare: prior` without a value raises naming the KPI; `compare: none` without `reason` raises.
- [x] Implement until green.

### Task 4: `build`

**Produces:** `build(data_path, layout_path, out_path)` → HTML with `DATA`, `LAYOUT`, `VIEW` embedded, inline CSS and JS renderer (KPI tile + sparkline, line, column, bar, groupedBar, donut, funnel, table, `<details>` more, method panel, filters for record grain, JS self-test comparing its own aggregation with `VIEW` and writing `#render-status`); `NAME-changes.md`; git guard.

- [x] Tests: build a fixture layout for `02-newsletter` → file exists, contains no `http` script/link, contains every KPI value string from `VIEW`; building into this repo outside an ignored folder exits 1.
- [x] Implement until green.

### Task 5: `check`

**Produces:** `check(html_path, inventory_path=None, forbid=None) -> (errors, warnings)`; exit 1 on errors.

- [x] Tests: clean build passes; tampering one number in embedded `VIEW` fails reconciliation; a dataset whose row count differs from the inventory without `transform` fails; lint errors for 6 KPIs, donut with 7 parts, jargon-only label `CTR`; a `#3366CC` colour fails brand; render via Chrome when present (status ok).
- [x] Implement until green.

### Task 6: `SKILL.md`, `redesign.txt`, `agent-instructions.txt`

- [x] Write `skills/redesign/SKILL.md`: frontmatter (name, trigger description), workflow with checkpoint brief template, metric catalogue table, glanceability rules, `data.json`/`layout.json` reference with a complete example, error table, rules; appendix = script.
- [x] `embed` → `redesign.txt`; write `agent-instructions.txt`; `verify` passes (`cmp` equal, ≤ 8,000 chars).

### Task 7: Evaluation with subagents

- [x] Baseline (no skill) on `02` and `03`: record failures.
- [x] With skill on `02`, `03`, `04` (fresh subagents given only `redesign.txt`): `check` passes; a fresh reader subagent states the three takeaways from a screenshot/DOM; compare with baseline.
- [x] Sharpen SKILL.md where agents went wrong; re-run the failing case.

### Task 8: Docs and commit

- [ ] README rows for the three files and the tool; final `verify`, full test run, `git grep` brand check.
- [ ] Commit skill, tool, tests, spec, plan, `test-dashboards/`, `scripts/build_test_dashboards.py`.
