# Design: `redesign` skill — make an internal-comms dashboard readable at a glance

Date: 2026-09-24 · Status: approved 2026-09-24, implemented

## Goal

An agent skill that takes an existing internal-communications HTML dashboard, works out which data it uses and what each view is meant to answer, and writes a **new** HTML dashboard with the same data, restructured so a first-time reader gets the key messages at a glance without being overwhelmed.

Domain: reach and engagement of internal content — views, visits, unique visitors, email opens and clicks, video plays and completion, content performance, audience coverage.

### Non-goals

- Changing, rounding, filtering or "fixing" any number or calculation.
- Adding metrics the original does not have (a derived ratio of two existing figures is allowed, and it is declared).
- Brand repaint of a page whose structure should stay. That is `corporate-html-rebrand`.
- Pouring every dashboard into one fixed tab template.

## Deliverables

| File | Purpose |
|---|---|
| `skills/redesign/SKILL.md` | The skill: workflow, comms metric catalogue, glanceability rules, `layout.json` reference, and the script `dash_redesign.py` inline in an appendix. One self-contained file |
| `skills/redesign/redesign.txt` | Byte-identical copy of `SKILL.md` for agent builders that do not accept `.md` knowledge files. Never edited by hand; regenerated with `cp` whenever `SKILL.md` changes and checked with `cmp` |
| `skills/redesign/agent-instructions.txt` | Instructions for the agent builder, **at most 8,000 characters**. They tell the agent to open `redesign.txt` from its knowledge base, read it in full and follow it |
| `README.md` | One row per new file in the Files table |
| `test-dashboards/`, `scripts/build_test_dashboards.py` | Existing synthetic test set, committed with this work |

Execution environment on the agent platform (confirmed): the agent can run Python and return files, and it sees the whole knowledge file.

## Workflow

### Phase 1 — Read and brief (writes only to a working folder)

1. **Inventory.** `python dash_redesign.py inventory DASHBOARD.html` writes `inventory.json` and prints a summary:
   - datasets found, each with origin (where in the file), row count, columns and the sum of every numeric column
   - visual elements: KPI tiles, charts by type, tables, filters and controls, long text blocks
   - libraries loaded

   Recognised embeddings: JSON `<script>` tags, JS object and array literals (JSON directly, otherwise a lenient literal parser), Chart.js / Plotly / ECharts / Highcharts configs, HTML tables, base64 and gzip payloads, local files loaded with `fetch()`. What the script cannot see (computed values, minified bundles) the agent completes by reading the code and records as a manual dataset with its origin.
2. **Classify metrics** against the catalogue (below): every numeric column gets a catalogue id or `null`, which fixes its label, definition and adding-up rule.
3. **Infer purpose.** For each view: the question it answers. For the page: the audience (inferred from depth, filters and jargon). Default audience when unclear: comms managers asking "did we reach people, did they engage, what worked?".
4. **Audit** against the glanceability rules and list findings.

**Checkpoint brief** — the agent stops and posts this, about one screen, then waits for one reply:

```
Audience: …
Data found: table — dataset · rows · columns · grain (record / aggregate)
Questions this page should answer (ranked): 1–5
Top findings: 3–6 bullets
Proposed layout: headline KPIs (≤5, each with its comparison) · sections in order ·
  what moves behind "More detail" · what is dropped and why
Open points: cut-off date, prior period, targets — only what is missing
```

The user confirms or corrects. The agent never builds before that reply.

### Phase 2 — Build

5. The agent writes `data.json` (extracted data) and `layout.json` (page description) in the working folder.
6. `python dash_redesign.py build data.json layout.json --out NAME-redesigned.html` renders the page. Default output is next to the original; the original is never overwritten.
7. `python dash_redesign.py check NAME-redesigned.html --inventory inventory.json` verifies (see Verification). A failing check blocks hand-over.
8. **Report:** the build also writes `NAME-changes.md` from `layout.changes` and `layout.dropped`. The agent summarises it in chat: file location, check result, every declared transformation, and assumptions.

## Comms knowledge built into the skill

### The five questions (default section order)

| Id | Question | Typical metrics |
|---|---|---|
| `reach` | Did it get to people? | views, visits/sessions, unique visitors, reach % (unique visitors ÷ headcount), emails delivered, open rate, video starts, unique viewers |
| `engagement` | Did they engage? | click rate, click-to-open, time on page / read time, scroll depth, likes/comments/shares, video completion, average % watched, drop-off, returning visitors, bounce rate |
| `content` | What worked? | top items, results by theme / format / channel, median per item |
| `audience` | Who did we reach or miss? | by division, region, level; share of views vs share of headcount |
| `trend` | Is it getting better? | vs prior period, prior year, target |

### Metric catalogue

One entry per metric: `id`, plain label, definition, jargon it replaces (shown in the tooltip), `additive` (true/false), preferred aggregation, and `good` direction (up/down). Entries cover at least: views, visits, unique visitors, reach %, emails sent/delivered, open rate, click rate (CTR), click-to-open (CTO), click rate per view, unsubscribes, time on page, read time, scroll depth, bounce rate, returning visitors, reactions, comments, shares, video starts, unique viewers, watch time, average % watched, completion rate, drop-off, items published.

Fixed traps:
- Unique visitors and unique viewers are never summed across periods, pages or items.
- A rate states whether it is volume-weighted or a simple average of per-item rates.
- Open rate carries the note that mail-privacy features inflate opens.
- Content comparisons use the median per item, with n shown.

### Glanceability rules

1. **First screen**: header (what, period, source, cut-off), 3–5 headline KPIs, at most two sections. Everything else is below or collapsed.
2. **No bare numbers.** Every KPI has a comparison (prior period, target or median) and a one-line meaning. Without a comparison the KPI stays neutral and the layout states why.
3. **One main chart per section.** The title states the takeaway, with computed numbers ("Video completion fell to {kpi.completion} in August"); the subtitle names the metric and its basis.
4. **Chart choice**: time → line; ranking → sorted horizontal bars, top 10 + "Other"; share of a whole, ≤5 parts → donut, otherwise bars; two units → two small charts, never a dual axis; delivered → opened → clicked → funnel.
5. **Plain language.** Labels come from the catalogue. The original term goes into the tooltip.
6. **Nothing disappears silently.** Detail moves into "More detail". Anything dropped is listed with a reason.
7. **Number formats**: 12.3k, 1.2M, percentages with one decimal, months as "Aug 2026".
8. **Status colours** (RAG) only where a comparison supports a verdict. Everything else follows the corporate design system (the same rules as `corporate-html-rebrand`: warm greys carry the page and the charts, red is a small accent, no gradients, shadows, rounded corners or all-caps).

## Script `dash_redesign.py`

Python 3.8+, standard library only (a lenient JS-literal parser replaces Node). Four commands: `inventory`, `init` (inventory → `data.json` skeleton, so no figure is retyped), `build`, `check`.

### `data.json`

```json
{
  "meta": {"title": "…", "source": "…", "asOf": "2026-08-31",
           "period": {"from": "2026-01-01", "to": "2026-08-31"},
           "prior": {"from": "2025-01-01", "to": "2025-08-31"},
           "headcount": null},
  "datasets": {
    "pages": {
      "origin": "table#top-pages",
      "grain": "record",
      "columns": [{"key": "title", "type": "category"},
                  {"key": "views", "type": "number", "metric": "views"},
                  {"key": "uv", "type": "number", "metric": "unique_visitors"}],
      "rows": [["Home", 1200, 800]],
      "transform": null
    }
  }
}
```

`type`: `date | month | category | text | number`. `grain`: `record` (one row per item) or `aggregate` (pre-summed chart data). `transform`: `null` or a sentence describing a deliberate change (e.g. "dropped the Total row"); it must also appear in `layout.changes`.

### `layout.json`

```json
{
  "audience": "Comms managers",
  "kpis": [{"id": "views", "label": "Page views", "metric": "views",
            "value": {"dataset": "pages", "column": "views", "agg": "sum"},
            "compare": {"type": "prior"},
            "meaning": "How often intranet pages were opened"}],
  "sections": [{"id": "reach", "question": "reach",
                "title": "Views rose to {kpi.views} this year",
                "subtitle": "Page views per month, 2026 vs 2025",
                "chart": {"type": "line", "dataset": "monthly", "x": "month", "y": ["views"]},
                "more": []}],
  "filters": [],
  "method": ["Unique visitors are counted per page and are not added up."],
  "changes": [{"was": "11 KPI tiles", "now": "4 headline KPIs", "why": "…"}],
  "dropped": [{"element": "3D pie of browsers", "reason": "Not a comms question"}]
}
```

- `agg`: `sum | mean | median | weighted | min | max | last | count | ratio` (`ratio` takes `num` and `den` value refs; `weighted` takes a `weight` column). An optional `where` filters rows.
- `compare.type`: `prior | target | median | none`. `none` requires `reason`.
- Chart `type`: `line | column | bar | groupedBar | donut | funnel | table`. Bars accept `sort` and `top` (default 10, remainder as "Other").
- `more`: further chart or table blocks, rendered collapsed.
- `filters`: at most 3 (period plus two dimensions). Allowed only on `record`-grain datasets. When the original's filters worked on aggregates only, the page shows fixed views and the method panel says so.
- Placeholders `{kpi.<id>}`, `{kpi.<id>.delta}`, `{kpi.<id>.compare}`, `{top.<section>}`, `{first.<section>}`, `{last.<section>}` (+ `.label`/`.value`) in titles are filled with computed, formatted values. The agent never types a figure into `layout.json`.
- Filters are rendered as precomputed views (one per filter combination, at most 400): all figures come from one Python engine; the page's JavaScript only draws.

### `build`

Writes one self-contained HTML: corporate CSS tokens inline, the data, layout and precomputed views embedded as JSON blocks, and a small inline JS renderer (inline SVG; no CDN, works offline). Building blocks: KPI tile with delta arrow and sparkline, line, column, bar, grouped bar (2 series), donut, funnel, table with in-cell bars, collapsed "More detail" (`<details>`), method panel, footer with source and cut-off. The renderer writes render errors into a hidden status element so `check` can read them.

Also writes `NAME-changes.md`.

Refuses to write into a Git working tree unless the target is git-ignored.

### `check`

Fails (exit 1) on any of:

1. **Reconciliation.** The page is rebuilt from its embedded data and layout and must match byte for byte (build date excepted) — this covers views, filters, script and styling. Every dataset matches the inventory row by row (as a set; renamed columns need `source`). A declared `transform` turns mismatches into warnings.
2. **Glanceability lint.** More than 5 KPIs or 5 sections; a KPI without comparison and without reason; more than one main chart per section; donut with more than 5 parts; ranking not sorted; a label that is catalogue jargon only; `sum` on a non-additive metric; filters on an aggregate dataset.
3. **Brand.** Colours outside the palette; gradients, shadows, border radius, `text-transform: uppercase`. Optional `--forbid NAME`.
4. **Render.** If Chrome/Chromium is found: headless `--dump-dom` (status element must read OK) and a screenshot for the agent to look at. Otherwise the report says the page was not rendered.

## Agent instructions (`agent-instructions.txt`, ≤ 8,000 characters)

Content outline: role and scope (redesign internal-comms dashboards, English); "open `redesign.txt` in your knowledge base and read it in full before the first step — it is the procedure, these instructions only frame it"; save the appendix script and run it with the code interpreter; the checkpoint is mandatory; never change a number, never paste record-level data into the chat; deliver the new HTML and the change report as files; if `redesign.txt` cannot be read in full or Python is unavailable, stop and say so instead of improvising. The character count is checked when the file is written.

## Rules carried by the skill

- Real data stays where the dashboard lives: never in a Git repository, a ticket or a public tool; nothing beyond headline figures in the chat.
- The original file is never modified.
- No brand name in the skill, the script or the test material.

## Testing

- **Extraction:** `inventory` on all six dashboards in `test-dashboards/` must find every dataset in `expected.json` with the right row count and column sums.
- **Baseline (without skill):** a subagent redesigns 2–3 test dashboards without the skill. Record failures: changed numbers, summed unique visitors, lost data, overloaded first screen.
- **With skill:** the same dashboards plus the v2 demo dashboard. `check` must pass; a fresh subagent reads each result as a first-time reader and must state the three main takeaways correctly. Rules are sharpened until it does.
- `cmp SKILL.md redesign.txt` and `wc -m agent-instructions.txt` (≤ 8,000) as part of the final verification.
- Test outputs go to a git-ignored folder; screenshots to `pictures/`.

## Changes after evaluation (2026-09-24)

Evaluation runs (three agents on four dashboards, a fresh-reader test and an independent code review) added: `summary` sentences above the KPIs (readers understood pages with a stated conclusion faster); top 5 bars by default; zero baseline for lines; shared "no comparison" note; partial last month marked; unknown numeric columns not additive by default; `scale` for 0–100 percentages; `@last`/`@prev`, `not`, `min_n`, `show_n`, computed table columns, KPI `definition`; decoding of coded columns with lookup lists; JS-drawn chart detection; byte-for-byte page check and row-level reconciliation.
