---
name: redesign
description: Use when someone has an existing HTML dashboard about internal communications — intranet pages, news articles, newsletters or mailings, video, events and town halls, campaigns, click tracking — and wants it redesigned so readers understand it at a glance — "redesign this dashboard", "it's too busy / overwhelming", "make it easier to read", "simplify the dashboard", "nobody understands this page", "improve the layout", "review the design of this dashboard", "what should this dashboard show" — even if they never say "redesign". Works out which data the page holds and what each view is for, agrees a plan with the user in one checkpoint, and writes a new self-contained HTML page with the same data, every figure computed and verified. Not for a pure colour/brand repaint that keeps the layout (use corporate-html-rebrand) or for exporting the data to Excel.
---

# Redesign an internal-comms dashboard

You take a working dashboard and rebuild it around the few questions its readers actually have — *did our content reach people, did they engage, what worked* — so that a first-time reader gets the message on the first screen. You keep every number the original shows. You reorganise, relabel, prioritise and move detail one click away. You never calculate a figure yourself and never type one in: the script computes every value from the original's data, and its checker proves it.

**One sentence to keep in mind:** a redesign that shows *more* than the original has failed. Fewer numbers, each with a comparison and a plain name, beat a complete page nobody reads.

## What you need

| Input | Required | Notes |
|---|---|---|
| The dashboard `.html` | yes | The file itself, not a screenshot or PDF. If it loads local files (`fetch('data/…')`), those files next to it |
| Python 3.8+ | yes | Standard library only. Save the appendix as `dash_redesign.py` |
| Chrome, Chromium or Edge | optional | `check` renders the page headless and takes screenshots. Without it, tell the user to open the page once |
| Targets, prior period, cut-off date | if the user has them | Asked for at the checkpoint, never guessed |

## Workflow

Work in a folder of your own (the "working folder"). Steps 1–5 read; nothing is built before the user answers the checkpoint.

Read this file down to the appendix before you start. The appendix is the script: save it as `dash_redesign.py` by code, and read parts of it only when a message or a behaviour is unclear.

### 1. Inventory

```bash
python dash_redesign.py inventory DASHBOARD.html --out inventory.json
```

It lists every dataset it found — origin in the file, rows, columns, the sum of every numeric column — plus the charts, tables, KPI tiles and filters, the libraries and warnings. It reads JSON blocks, JS literals (also minified), Chart.js / Plotly / ECharts / Highcharts / Vega-Lite configs, base64 and gzip payloads, HTML tables (multi-row headers, rowspans, `38'846`, `1.234,5`, `15.8k`, `69.2 %`), SVG `data-*` attributes, KPI tiles, and local CSV/JSON the page fetches.

`WARN source file … not found` means the page loads data that is not there. Ask for the file, or record that the view it feeds cannot be rebuilt. `WARN … listed once` names a dataset that duplicates another. Coded category columns stored next to a lookup list are decoded to their labels. "Drawn by the page's own code" lists chart functions the page calls on its elements (`hBar('cOvDiv', …)`) — the charts of a page that draws everything in JavaScript; read those functions in step 2.

### 2. Read the page yourself

The script finds data; you find meaning. Open the HTML and note, for each chart, table and KPI tile:
- which dataset feeds it, and any calculation the page does on the way (a rate, a filter, a top-10 cut)
- values the page computes at runtime that no dataset holds — you will reproduce them with a `ratio`, `where` or `bucket` in the layout, not by typing the result
- filters and what they act on
- text that explains or judges (callouts, verdicts, "note:" boxes)

### 3. Classify and infer

- Give every numeric column a catalogue metric (table below). `init` guesses from column names and prints every guess; you confirm or correct. Short or coded names (`es`, `op`, `v`) are not guessed: find in the page's code what they hold. Columns whose values are all fractions between 0 and 1 are marked as rates (`unit: percent`, `additive: false`) — stored per-item rates are never summed. The metric decides the plain label, the unit and — critically — whether the figure may be added up. Position and axis columns (seconds into a video, % of a video, week number) and IDs keep `metric: null`.
- **Who made it is not who watched it.** Owner, author, channel or publisher columns describe the content side: a chart by owner answers `content` ("whose videos performed"), never `audience`. The audience question needs viewer-side data (visitor division, region, level).
- For each view, write the question it answers. Group them under the five questions.
- Decide who reads this page. Clues: depth of detail, number of filters, jargon, headings. When unclear: comms managers asking "did we reach people, did they engage, what worked?".

### 4. Audit

Check the original against the glanceability rules below. Typical findings: more than five headline numbers; numbers without comparison; three charts answering one question; a pie with twelve slices; two units on one axis; jargon (CTR, UV, CTVR); unsorted rankings; red used for data; long text blocks; filters that act on some charts and not others.

Also look for **data problems** and list them — do not resolve them silently:
- two datasets that should agree but don't (a monthly total that differs from the item table)
- records dated after the cut-off, or impossible values (unique clicks > clicks)
- figures typed into the chart code rather than coming from the data
- a metric whose definition is ambiguous (click rate on delivered or on opens? rates pooled or averaged?)
- a last period that is not complete (the cut-off falls mid-month) — the script marks it, but say so in the brief

**When datasets conflict**, propose in the brief to build from the record-grain dataset (one row per item: it can be filtered and reconciled) and to recompute the aggregate views from it, and list the conflicting aggregates under "Left out" with their totals. If the user does not decide otherwise, build that way.

### 5. Checkpoint — stop and ask

Post this brief (about one screen) and **wait for one reply**. Do not build before it.

```
Redesign plan — <dashboard title>

Audience: <who reads it, and the decision it supports>

Data found
| Dataset | Rows | What it is | Used for |
(one line each; say which ones the new page will not use and why)

The page will answer (ranked)
1. <question> — <metric, comparison>
2. …  (3–5)

Main problems in the current page
- <3–6 findings from step 4>

Proposed layout
- Headline: <KPI> vs <comparison> · <KPI> vs … (3–5)
- Sections: <question → chart type> … (≤ 5)
- One click away ("More detail"): <…>
- Left out: <element — reason>

Please confirm or correct
- <open points: cut-off date, prior period, targets, metric definitions, data conflicts — only what you really need>

Unless you say otherwise, I will
- <the default you will use for each open point, e.g. "open rate = opens ÷ emails sent (no delivered count in the data)">
```

"Go ahead" confirms the defaults. An open point without a default needs an answer before you build.

Take corrections literally. If the user adds a target or prior-period figure, it goes into `data.json` as a small manual dataset with `origin: "user, <date>"`.

### 6. `data.json`

```bash
python dash_redesign.py init inventory.json --out data.json
```

Then edit — structure only, never a figure:
- `meta`: `title`, `source` (system or export name), `asOf` (cut-off, `YYYY-MM-DD`; `init` fills it when the file holds exactly one date field such as `asOf`), `period` `{from, to}`, `original` (file name). Leave `meta.inventory` as it is: the change report uses it to list the datasets the new page does not use.
- Delete datasets the page will not use (the change report lists what was left out).
- Per numeric column: set or correct `metric`. Set `unit` only when no metric fits (`count`, `percent` as a fraction 0–1, `seconds`, `score`). A column without a metric is **not added up** unless you set `"additive": true` — decide it consciously. Percentages stored as 0–100 get `"scale": 0.01` (`init` sets it; the script refuses a percentage column above 1.5 without it).
- The catalogue definitions are defaults. When the source states its own method (completion counted from views that reached 1 %, open rate on sent), note it and give the KPI a `definition`.
- `grain`: `record` (one row per article/mailing/video — filters allowed) or `aggregate` (pre-summed chart data).
- Rows are positional lists in column order. Renaming a column's `key` is safe; add `"source": "<original key>"` so reconciliation still finds it. Never reorder columns or edit rows by hand.
- Months stored as numbers 1–12 are typed `month` by `init`; they sort as numbers and show as Jan–Dec.
- If you must change rows (drop a Total row the inventory kept, decode or split a record), do it with a small script, and write what and why in the dataset's `transform`. `check` compares every row with the original — as a set, so row order does not matter — and reports differences as warnings next to your sentence instead of errors.

### 7. `layout.json`

Write the page as the checkpoint agreed: a `summary` of 1–3 sentences, 3–5 KPIs, up to 5 sections, detail in `more`.

Write the **summary first**: the two or three things a reader must take away, as plain sentences with computed figures ("Newsletters beat their targets: {kpi.open_rate} opened and {kpi.click_rate} clicked."). In a reading test, pages that opened with such sentences were understood faster than pages with better charts and no summary. If you cannot write the summary, the page does not have a message yet — go back to the questions. Full reference below. Every value is a **reference** to data (`{"dataset", "column", "agg"}`); titles use placeholders (`{kpi.open_rate}`, `{last.trend}`) so the numbers in text are computed too.

Before building, read each title against the chart it heads: a title must be true for the whole chart ("held steady" over a line that drops 18 points is false). If you cannot phrase a true takeaway, describe what the chart shows plainly.

### 8. Build

```bash
python dash_redesign.py build data.json layout.json --out <name>-redesigned.html
```

Writes the page and `<name>-changes.md`, and prints the headline figures. `ERROR …` lines name the KPI or section and the fix (table below). The script refuses to write into a Git repository unless the folder is git-ignored, because the page embeds real data.

### 9. Check — and look

```bash
python dash_redesign.py check <name>-redesigned.html --inventory inventory.json
```

| Last line | Meaning | What you do |
|---|---|---|
| `PASSED — n warning(s)` | The page is exactly what the script builds from its embedded data, every row matches the original, lint and brand are clean, it rendered (if a browser was found) | Read every `WARN`; fix what you can; look at the screenshots |
| `FAILED — n error(s)` | Something is wrong | Fix the layout or `data.json`, rebuild, check again. Never hand over a failed page, never edit the HTML by hand |

Look at `<name>-redesigned-first-screen.png` as a first-time reader would: can you say the three main messages in ten seconds, without scrolling? If not, cut or rephrase and rebuild. Also look at `-phone.png`.

Add `--forbid "<name>"` when the page will leave the organisation or go into a repository and a name must not appear in it.

### 10. Report back

- where the page and `-changes.md` are; that `check` passed (or what it could not verify, e.g. not rendered)
- the headline figures as printed by `build`, for the user to compare with the original
- every `WARN` and every declared `transform`
- data problems from the audit that remain open

## The five questions

| Id | Question | Typical metrics | Typical chart |
|---|---|---|---|
| `reach` | Did it get to people? | views, visits, unique visitors, share of employees reached, emails delivered, open rate, video plays | line over time; bar by channel |
| `engagement` | Did they engage? | click rate, clicks per open, time on page, reactions, comments, completion rate, share watched | line over time; funnel delivered → opened → clicked |
| `content` | What worked? | top items, results by theme / format / channel, median per item | sorted bar (top 10); table with in-cell bars |
| `audience` | Who did we reach or miss? | by division, region, level; share of views vs share of headcount | sorted bar |
| `trend` | Is it getting better? | vs prior period, prior year, target | line, 2 series (this year / last year) |

## Metric catalogue

`additive = no` means the script refuses to add the figure up across rows. That is the most common error in comms dashboards: unique visitors of 30 pages summed is not the number of people.

| Metric id | Label on the page | Unit | Additive | Replaces (goes into the tooltip) |
|---|---|---|---|---|
| `views` | Views | count | yes | PV, page views, impressions, hits |
| `visits` | Visits | count | yes | sessions |
| `unique_visitors` | Unique visitors | count | **no** | UV, uniques, unique users |
| `reach_pct` | Share of employees reached | percent | no | reach rate, penetration |
| `headcount` | Employees | count | no | HC, FTE |
| `items_published` | Items published | count | yes | # articles, posts |
| `sent` / `delivered` | Emails sent / delivered | count | yes | sends, deliveries |
| `opens` | Opens | count | yes | total opens |
| `unique_opens` | People who opened | count | yes (per mailing) | unique opens |
| `open_rate` | Open rate | percent | no | OR, unique open rate |
| `clicks` | Clicks | count | yes | total clicks |
| `unique_clicks` | People who clicked | count | yes (per item) | unique clicks |
| `click_rate` | Click rate | percent | no | CTR, click-through rate |
| `click_to_open` | Clicks per open | percent | no | CTO, CTOR |
| `click_rate_per_view` | Click rate per view | percent | no | CTVR |
| `visitors_who_clicked` | Visitors who clicked | percent | no | UCTUVR |
| `unsubscribes` / `unsub_rate` | Unsubscribes / Unsubscribe rate | count / percent | yes / no | opt-outs |
| `time_on_page` | Time on page | seconds | no | avg. time on page, dwell time |
| `read_time` | Reading time | seconds | no | avg. read time |
| `scroll_depth` | Scroll depth | percent | no | scroll % |
| `bounce_rate` | Left after one page | percent | no | bounce rate |
| `returning_visitors` | Returning visitors | count | no | repeat visitors |
| `reactions` / `comments` / `shares` | Likes and reactions / Comments / Shares | count | yes | likes, kudos, reposts |
| `engagement_rate` | Engagement rate | percent | no | ER |
| `video_starts` | Video plays | count | yes | plays, starts, video views |
| `unique_viewers` | Unique viewers | count | **no** | unique plays |
| `completions` / `completion_rate` | Watched to the end / Completion rate | count / percent | yes / no | completes, VCR |
| `watch_time` / `avg_watch_time` | Watch time / Average watch time | seconds | yes / no | minutes viewed, AVD |
| `avg_pct_watched` | Average share watched | percent | no | APV |
| `retention` | Still watching | percent | no | audience retention, drop-off |
| `registrations` / `attendees` / `attendance_rate` | Registrations / Attendees / Attendance rate | count / count / percent | yes / yes / no | sign-ups, show rate |
| `replay_views` | Replay views | count | yes | on-demand views |
| `score` / `responses` | Average rating / Responses | score / count | no / yes | CSAT |
| `engagement_score` | Engagement score | score | no | engagement index (a platform's own formula) |
| `downloads` | Downloads | count | yes | file downloads |

Definitions appear in the page's tooltips and "About these figures". When the data defines a metric differently — open rate on emails *sent* because there is no delivered count, completion counted from a 1% start — keep the metric and give the KPI a `definition` that says so. Rates: prefer the **volume-weighted** rate (`ratio` of two sums) and say so in the subtitle; a simple average of per-item rates lets a list of 800 weigh as much as one of 100,000. Open rates carry the note that mail-privacy features inflate opens. Compare content by **median per item** with n shown, so one viral item cannot carry a theme.

## Glanceability rules

1. **First screen**: title with period, source and cut-off; 1–3 summary sentences that state the conclusion; 3–5 headline KPIs; the first two sections. That is all a reader should need.
2. **No bare number.** Each KPI compares with a prior period, a target or a median. Without any, use `"compare": {"type": "none", "reason": "…"}` — the tile stays neutral and says why.
3. **One question per section, one main chart per section.** A comparison that is missing for every KPI for the same reason is shown once under the KPI row, not on every tile. Everything else in that section goes into `more` (collapsed "More detail").
4. **No figure may seem to contradict another.** If the headline shows completion 44.4% for the year and a section shows September at 50.4%, the section title must say how they relate ("Completion ranged from … to …; the year stands at {kpi.completion}"), or show the trend without a single-month figure.
5. **Titles state the takeaway** with a computed figure: "Completion fell to {last.trend} in {last.trend.label}". The subtitle names the measure and its basis: "Plays watched to the end ÷ plays, per month".
6. **Chart choice**: over time → `line` (or `column` for ≤ 12 periods of counts); ranking → `bar` (sorted, top 5 on the page, rest as "Other"; a top-10 table goes into `more`); share of a whole with ≤ 5 parts → `donut`, otherwise `bar`; two measures in different units → two charts, never a dual axis; delivered → opened → clicked → `funnel`; items with several measures → `table` with an in-cell bar on the main one.
7. **Plain labels from the catalogue.** Never a column name (`unique_visitors`) or an abbreviation (CTR) as a label.
8. **Nothing disappears silently.** What moves goes into `more`; what goes is listed in `dropped` with a reason. Decorative or duplicate views may go; data the original showed may not vanish without a line in the change report.
9. **Colour** is fixed by the script: warm greys for data, bronze for a second series, one red accent (first KPI). Status colour appears only on the change arrows, and only where a comparison makes "better" or "worse" meaningful. Do not ask for red bars, red markers or coloured categories.
10. **Partial periods are marked.** When `meta.asOf` falls before a month end, the script labels that month "Sep 2026*" with a footnote, and `{last.X.label}` reads "Sep 2026 (to 24 Sep)". Never compare a partial month with full months in a title without saying so.
11. **Filters** only where they help the reader's question, at most three, and only on `record` datasets. Pre-aggregated chart data cannot be filtered honestly — show fixed views and say so in `method`.

## What goes wrong without this skill

Agents redesigning these dashboards unaided produced good-looking pages that still failed the reader:

| What they did | Why it is wrong | What you do instead |
|---|---|---|
| Put "Unique viewers 38,880" (summed over 60 videos) in the headline, with a footnote that it overcounts | A headline number that is known to be wrong | The script refuses the sum. Take the total from a dataset that holds it, show unique viewers per item (chart or table), or leave it out. The largest single value is not a total either |
| Added a summary sentence, an extra table, a "context" section and a 48-row list | More to read than before | Headline, ≤ 5 sections, detail one click away. Remove before you add |
| Coloured 35 table cells red for "missed target" and filled the top bar red | Red reads as alarm; the page becomes an error list | The comparison arrow carries the verdict; bars stay grey |
| Picked "click rate = unique clicks ÷ delivered" and "pooled rates" silently | The user's target may use another definition | Ask at the checkpoint |
| Dropped three datasets that disagreed with the item table, and invented a "format" dimension from video titles | Data decisions the user never saw | List conflicts in the brief; derive nothing the user did not confirm |
| (With an early version of this skill) correct figures and clean charts, but no sentence saying what they mean; ten-bar rankings on the first screen | Readers had to do the summarising; they rated these pages harder than busier pages that opened with two sentences | `summary` first; top 5 on the page, the rest one click away |

## `data.json` reference

```json
{
 "meta": {"title": "Newsletter performance", "original": "newsletter.html", "source": "Mailing platform export",
          "asOf": "2026-08-31", "period": {"from": "2026-01-01", "to": "2026-08-31"}},
 "datasets": {
  "newsletters": {
   "inventory_id": "dashboard_data_newsletters", "origin": "script #2 id=dashboard-data (JSON)",
   "grain": "record", "transform": null,
   "columns": [{"key": "sent", "type": "date"},
               {"key": "audience.segment", "type": "category"},
               {"key": "delivered", "type": "number", "metric": "delivered"},
               {"key": "unique_opens", "type": "number", "metric": "unique_opens"}],
   "rows": [["2026-01-11", "Global", 111325, 58406]]
  },
  "targets": {"origin": "user, 2026-09-24", "grain": "aggregate",
              "columns": [{"key": "key", "type": "category"}, {"key": "value", "type": "number", "unit": "percent"}],
              "rows": [["openRate", 0.45]]}
 }
}
```

Column `type`: `number`, `category`, `text`, `date` (`YYYY-MM-DD`), `month` (`YYYY-MM`). Optional per column: `metric`, `unit`, `source`, `additive` (override). A dataset without `inventory_id` is reported as "not reconciled with the original".

## `layout.json` reference

```json
{
 "title": "Newsletter performance 2026",
 "audience": "Internal comms team planning the newsletter programme",
 "questions": ["Did people open the newsletters?", "Which audiences get the most email?"],
 "assumptions": ["Rates are volume-weighted: totals first, then divided"],
 "summary": ["Newsletters beat their targets: {kpi.open_rate} opened and {kpi.click_rate} clicked.",
             "{top.audience} mailings carry most of the volume."],
 "kpis": [
  {"id": "open_rate", "metric": "open_rate",
   "value": {"agg": "ratio",
             "num": {"dataset": "newsletters", "column": "unique_opens", "agg": "sum"},
             "den": {"dataset": "newsletters", "column": "delivered", "agg": "sum"}},
   "compare": {"type": "target", "value": {"dataset": "targets", "column": "value", "agg": "sum", "where": {"key": "openRate"}}},
   "meaning": "Share of recipients who opened",
   "spark": {"x": "sent", "bucket": "month", "agg": "ratio", "num": "unique_opens", "den": "delivered"}},
  {"id": "delivered", "metric": "delivered",
   "value": {"dataset": "newsletters", "column": "delivered", "agg": "sum"},
   "compare": {"type": "none", "reason": "No prior period in this export"}}
 ],
 "sections": [
  {"id": "trend", "question": "engagement",
   "title": "Open rate ended at {last.trend} in {last.trend.label}, above the {kpi.open_rate.compare} target",
   "subtitle": "People who opened ÷ emails delivered, per month",
   "chart": {"type": "line", "dataset": "newsletters", "x": "sent", "bucket": "month",
             "series": [{"label": "Open rate", "agg": "ratio", "num": "unique_opens", "den": "delivered"}]},
   "more": [{"title": "Largest newsletters", "subtitle": "Top 10 by emails delivered",
             "chart": {"type": "table", "dataset": "newsletters", "sort": {"key": "delivered", "dir": "desc"}, "top": 10,
                       "columns": [{"key": "title", "label": "Newsletter"}, {"key": "delivered", "bar": true}]}}]},
  {"id": "audience", "question": "audience", "title": "{top.audience} newsletters carry most of the volume",
   "subtitle": "Emails delivered by audience segment",
   "chart": {"type": "bar", "dataset": "newsletters", "x": "audience.segment", "y": "delivered"},
   "note": "Optional one-line caveat shown under the chart."}
 ],
 "filters": [{"column": "audience.segment", "label": "Audience"}],
 "method": ["Rates add up the totals first, then divide."],
 "changes": [{"was": "No headline figures", "now": "four KPIs against their targets", "why": "The targets were in the page but never shown."}],
 "dropped": [{"element": "Channel mix chart", "reason": "Typed-in figures that contradict the mailing data; confirmed with the user"}]
}
```

**Value reference** — `{"dataset", "column", "agg", "where", "weight"}`:
- `agg`: `sum`, `mean`, `median`, `min`, `max`, `first`, `last` (by row order in the data — prefer `where` with `@last`), `count` (rows), `distinct` (distinct values of `column`), `weighted` (needs `weight` column), or `ratio` with `num` and `den` — each a full value reference (KPIs) or a column name (chart series, sparklines).
- `where`: `{"column": value}`, `{"column": [v1, v2]}`, `{"column": {"not": ["", "(No pack)"]}}`, `{"column": {"from": "2026-01", "to": "2026-06"}}` (numbers compare as numbers), or `{"column": "@last"}` / `"@prev"` for the latest and the previous value of that column — "August vs July" without typing a month: value `{"dataset": "monthly", "column": "visits", "agg": "sum", "where": {"month": "@last"}}`, compare `{"type": "prior", "label": "vs previous month", "value": {… "where": {"month": "@prev"}}}`.

A trend against last year uses one series per dataset: `"series": [{"label": "2026", "dataset": "mail", "y": "sent"}, {"label": "2025", "dataset": "mail_prior", "y": "sent"}]` with the shared `x` (e.g. `"m"`). A KPI compares with last year the same way: `"compare": {"type": "prior", "label": "vs 2025", "value": {"dataset": "mail_prior", "column": "sent", "agg": "sum"}}`.

A weighted average — for example average watch time per play from per-video averages — is `{"dataset": "videos", "column": "avg_watch_s", "agg": "weighted", "weight": "views"}`. It works for KPIs and, with column names, for chart series.

**KPI** — `id`, `value`, `compare`, and `metric` (sets label, unit, good direction, tooltip) or `label` + `unit`. Optional: `meaning` (one line, placeholders allowed), `definition` (replaces the catalogue definition in tooltip and method), `good` (`up`/`down`/`neutral`), `spark` (`x`, `y` or `agg`/`num`/`den`, `bucket`, `dataset`). If more than half the KPIs have `compare: none`, `check` warns: choose figures that can be compared, or ask for a target.
- `compare`: `{"type": "prior" | "target" | "median", "value": REF, "label": "vs 2025"}` or `{"type": "none", "reason": "…"}`. The delta shows in percentage points for rates and in % for counts.

**Section** — `id`, `question` (one of the five), `title`, `subtitle`, `chart`, optional `note`, optional `more` (list of `{title, subtitle, chart}`).

**Chart**:
| `type` | Keys |
|---|---|
| `line`, `column`, `bar`, `groupedBar`, `donut` | `dataset`, `x`, and `y` (column or list) or `series` (list of `{label, y, agg, num, den, weight, where, dataset, unit, metric}`); optional `agg` (default `sum`), `bucket` (`month`, `week`, `year` for date columns), `where`, `sort` (`desc` default for `bar` and `donut`), `top` (default 5 for `bar` and `donut`), `other` (default true: the rest as "Other"), `min_n` (hide groups with fewer rows, with a footnote), `show_n` (add "(n=…)" to each label — use it with medians), `zero` (default true: the value axis starts at 0; `false` only when small changes matter and the subtitle says the axis is cut) |
| `funnel` | `steps`: list of `{label, value: REF}` |
| `table` | `dataset`, `columns` (list of `{key, label, bar}`, or a computed rate per row `{label, num, den, unit}` such as click rate per page), `sort` `{key, dir}`, `top` (default 10; 0 = all), `where` |

**Placeholders** in titles, subtitles, notes and meanings: `{kpi.ID}`, `{kpi.ID.delta}`, `{kpi.ID.compare}`, `{top.SECTION}` (first category of that section's chart), `{top.SECTION.value}`, `{first.SECTION}` / `{last.SECTION}` (first / last value, e.g. of a time line) and `.label` for their category. A section's title may refer to its own chart (`{last.trend}` in section `trend`). `top`, `first` and `last` need a line, column, bar, groupedBar or donut chart — not a table or funnel. They insert the category as stored ("A 11-499"); if that reads badly inside a sentence, put it at the end: "Best open rate: {top.audience}".

**Summary** — `summary`: 1–3 sentences shown above the KPIs, placeholders allowed. `check` warns when it is missing and fails above 3.

**Report fields**: `audience`, `questions`, `assumptions` (what the user confirmed), `changes` (`was`, `now`, `why`), `dropped` (`element`, `reason`), `method` (lines for "About these figures").

## Errors and what they mean

| Message contains | Cause | Fix |
|---|---|---|
| `cannot be added up across n rows` | `sum` on unique visitors/viewers, a rate or a time | A dataset that already holds the total, a `ratio` of two additive columns, or show the figure per item |
| `has no catalogue metric, so it is not added up` | `sum` on a column without `metric` | Set the `metric`, or `"additive": true` if adding it up is meaningful |
| `is a percentage but holds values up to` | Rates stored as 0–100 | `"scale": 0.01` on the column |
| `selects no rows` | A `where` value that does not exist | Check the spelling against the data |
| `negative values cannot be drawn` / `the chart has no values` | Wrong chart type or wrong column | Line chart or table; check `x`, `y`, `where` |
| `add 'compare'` / `needs a 'reason'` | KPI without comparison | Add a prior/target/median reference, or `none` with a reason |
| `the comparison value is empty` | The `where` matches nothing | Check the key spelling in the dataset |
| `record-grain` | Filter on pre-aggregated data | Drop the filter or filter a record dataset |
| `filters produce n combinations` | Too many filter values | Fewer filters, or columns with fewer values |
| `no KPI with that id` / `no section` | Placeholder typo | Use the exact `id` |
| `has n rows, the original m` / `sums to` | `data.json` no longer matches the original | Restore it from `init`, or declare a `transform` (then it is a warning you report) |
| `n of m headline KPIs have no comparison` (WARN) | Most headline figures cannot be judged | Pick comparable figures (`@last` vs `@prev`, vs median) or ask for targets |
| `does not match its own data` / `differs from what this script builds` / `more than one … block` | The HTML was edited after building, or built by another version of the script | Rebuild; never edit the page |
| `row(s) differ from the original` / `not in the original — renamed columns need "source"` | `data.json` rows were edited, or a column was renamed without `source` | Restore from `init`; add `source` to renamed columns |
| `label '…' is jargon` | Label is an abbreviation or a column name | Catalogue label; the term goes into the tooltip automatically |
| `not in the corporate palette` / `brand:` | Someone added styling | Rebuild from the script; do not restyle by hand |
| `render: …` | The page failed in the browser | Report the message; usually a layout value of an unexpected type |

## Rules

- **The original is never modified.** The new page is a new file.
- **The page holds real data** (titles, sometimes names). Keep it where the original dashboard lives. Never put it, `data.json` or `inventory.json` into a Git repository, a ticket, a public tool or a chat outside the organisation. Do not paste records into the conversation — headline figures only.
- **No figure is typed by hand**, not in `layout.json`, not in the HTML, not in your report beyond what `build` printed.
- **One checkpoint, then build.** If something new turns up after the checkpoint that changes what the page says (a data conflict, a missing file), ask again before building.
- The page is English; labels follow the catalogue.

---

## Appendix — `dash_redesign.py`

Save exactly as `dash_redesign.py` (the code block below; nothing follows it). Python 3.8+, standard library only. Exit code 1 means errors.

```python
#!/usr/bin/env python3
"""Redesign an internal-comms HTML dashboard so it reads at a glance, with the same data.

    python dash_redesign.py inventory DASHBOARD.html [--out inventory.json]
    python dash_redesign.py init inventory.json [--out data.json]
    python dash_redesign.py build data.json layout.json --out NAME-redesigned.html
    python dash_redesign.py check NAME-redesigned.html [--inventory inventory.json]
                                  [--forbid NAME] [--no-render]

inventory  finds every dataset in the original page (JSON, JS literals, chart configs, tables,
           SVG data attributes, KPI tiles, local files it fetches) and lists its visual elements.
init       turns the inventory into a data.json skeleton, so no figure is ever retyped.
build      computes every figure from data.json + layout.json and writes one self-contained page
           (inline CSS and SVG renderer, no CDN) plus NAME-changes.md.
check      recomputes the page, reconciles it with the inventory, lints it for glanceability and
           brand, and renders it headless when Chrome, Chromium or Edge is installed.

Python 3.8+, standard library only. Exit code 1 = errors.
"""
import argparse
import base64
import csv
import datetime as dt
import gzip
import io
import json
import math
import re
import shutil
import statistics
import struct
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

# ============================================================== lenient JavaScript literals


class Expr:
    """A JS value that is not a literal (identifier, call, arithmetic). Kept as source text."""
    __slots__ = ("src",)

    def __init__(self, src):
        self.src = src

    def __repr__(self):
        return "Expr(%r)" % self.src[:40]


class JSParseError(Exception):
    pass


_WS = re.compile(r"(?:\s+|//[^\n]*|/\*.*?\*/)+", re.S)
_NUM = re.compile(r"[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)")
_IDENT = re.compile(r"[A-Za-z_$][\w$]*")
_KEYWORDS = {"true": True, "false": False, "null": None, "undefined": None, "NaN": None, "Infinity": None}
_ESC = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}


def _unescape(s):
    def rep(m):
        e = m.group(1)
        if e[0] == "u":
            h = e[1:].strip("{}")
            try:
                return chr(int(h, 16))
            except (ValueError, OverflowError):
                return "\ufffd"
        if e[0] == "x":
            return chr(int(e[1:], 16))
        if e[0] == "\n":
            return ""
        return _ESC.get(e, e)
    return re.sub(r"\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)", rep, s, flags=re.S)


class JSLiteral:
    """Parses JS object/array literals: unquoted keys, single quotes, trailing commas, comments,
    !0/!1, .5 — anything that is not a literal becomes an Expr with its source text."""

    def __init__(self, text):
        self.t = text
        self.n = len(text)

    def ws(self, i):
        m = _WS.match(self.t, i)
        return m.end() if m else i

    def _continues(self, j):
        """True if the literal ending at j is followed by an operator or call (so it is an expression)."""
        while j < self.n and self.t[j] in " \t":
            j += 1
        if j >= self.n:
            return False
        c = self.t[j]
        if c in ".[(?*%&|<>=+-":
            return True
        if c == "/" and not self.t.startswith(("//", "/*"), j):
            return True
        return False

    def value(self, i):
        i = self.ws(i)
        if i >= self.n:
            raise JSParseError("end of input")
        c = self.t[i]
        if c == "{":
            v, j = self.obj(i)
        elif c == "[":
            v, j = self.arr(i)
        elif c in "\"'`":
            v, j = self.string(i)
            if isinstance(v, Expr):
                return self.expr(i)
        elif c == "!" and i + 1 < self.n and self.t[i + 1] in "01":
            v, j = self.t[i + 1] == "0", i + 2
        else:
            m = _NUM.match(self.t, i)
            if m and (c.isdigit() or c in "+-."):
                s = m.group()
                if s.lower().lstrip("+-").startswith("0x"):
                    v = int(s, 16)
                elif any(ch in s for ch in ".eE"):
                    v = float(s)
                else:
                    v = int(s)
                j = m.end()
            else:
                m = _IDENT.match(self.t, i)
                if m and m.group() in _KEYWORDS:
                    v, j = _KEYWORDS[m.group()], m.end()
                else:
                    return self.expr(i)
        if self._continues(j):
            return self.expr(i)
        return v, j

    def expr(self, i):
        """Skip a non-literal expression up to the next top-level , } ] ) or ;"""
        start, depth, j = i, 0, i
        while j < self.n:
            c = self.t[j]
            if c in "\"'`":
                j = self._skip_string(j)
                continue
            if self.t.startswith("//", j):
                k = self.t.find("\n", j)
                j = self.n if k < 0 else k
                continue
            if self.t.startswith("/*", j):
                k = self.t.find("*/", j + 2)
                j = self.n if k < 0 else k + 2
                continue
            if c in "([{":
                depth += 1
            elif c in ")]}":
                if depth == 0:
                    break
                depth -= 1
            elif c in ",;" and depth == 0:
                break
            j += 1
        return Expr(self.t[start:j].strip()), j

    def _skip_string(self, i):
        q, j = self.t[i], i + 1
        while j < self.n:
            c = self.t[j]
            if c == "\\":
                j += 2
                continue
            if c == q:
                return j + 1
            if c == "\n" and q != "`":
                return j
            j += 1
        return j

    def string(self, i):
        q = self.t[i]
        j = self._skip_string(i)
        raw = self.t[i + 1:j - 1]
        if q == "`" and "${" in raw:
            return Expr(self.t[i:j]), j
        return _unescape(raw), j

    def obj(self, i):
        out, i = {}, i + 1
        while True:
            i = self.ws(i)
            if i >= self.n:
                raise JSParseError("unterminated object")
            c = self.t[i]
            if c == "}":
                return out, i + 1
            if self.t.startswith("...", i):
                _, i = self.expr(i + 3)
            else:
                if c in "\"'":
                    k, i = self.string(i)
                else:
                    m = _IDENT.match(self.t, i) or _NUM.match(self.t, i)
                    if not m:
                        raise JSParseError("bad key at %d" % i)
                    k, i = m.group(), m.end()
                i = self.ws(i)
                if i < self.n and self.t[i] == ":":
                    v, i = self.value(i + 1)
                    out[str(k)] = v
                elif i < self.n and self.t[i] in ",}":
                    out[str(k)] = Expr(str(k))
                else:
                    raise JSParseError("expected ':' at %d" % i)
            i = self.ws(i)
            if i < self.n and self.t[i] == ",":
                i += 1
                continue
            if i < self.n and self.t[i] == "}":
                return out, i + 1
            raise JSParseError("expected ',' or '}' at %d" % i)

    def arr(self, i):
        out, i = [], i + 1
        while True:
            i = self.ws(i)
            if i >= self.n:
                raise JSParseError("unterminated array")
            if self.t[i] == "]":
                return out, i + 1
            if self.t[i] == ",":
                out.append(None)
                i += 1
                continue
            if self.t.startswith("...", i):
                v, i = self.expr(i + 3)
            else:
                v, i = self.value(i)
            out.append(v)
            i = self.ws(i)
            if i < self.n and self.t[i] == ",":
                i += 1
                continue
            if i < self.n and self.t[i] == "]":
                return out, i + 1
            raise JSParseError("expected ',' or ']' at %d" % i)


_JSON = json.JSONDecoder()


def parse_literal_at(text, i):
    """Parse the literal starting at text[i]; JSON fast path first. Returns (value, end)."""
    p = JSLiteral(text)
    k = p.ws(i + 1)
    if k < len(text) and (text[k] in "\"}]" or (text[i] == "[" and (text[k] in "[{-" or text[k].isdigit()))):
        try:
            v, j = _JSON.raw_decode(text, i)
            if not p._continues(j):
                return v, j
        except ValueError:
            pass
    v, j = p.value(i)
    if isinstance(v, Expr):
        raise JSParseError("not a literal")
    return v, j


def scan_js(text):
    """Yield ('literal', start, end, value) for top-level object/array literals and
    ('string', start, end, value) for string literals, skipping comments and code blocks."""
    n, i, spans = len(text), 0, []
    prev = ""          # last significant character
    prev_word = ""     # last identifier (for 'return')
    while i < n:
        c = text[i]
        if text.startswith("//", i):
            k = text.find("\n", i)
            i = n if k < 0 else k
            continue
        if text.startswith("/*", i):
            k = text.find("*/", i + 2)
            i = n if k < 0 else k + 2
            continue
        if c in "\"'`":
            p = JSLiteral(text)
            j = p._skip_string(i)
            v, _ = p.string(i)
            if not isinstance(v, Expr):
                spans.append(("string", i, j, v))
            i, prev = j, "s"
            continue
        if c == "/" and prev and prev in "(,=:[!&|?{};":
            j = i + 1
            in_class = False
            while j < n and text[j] != "\n":
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == "[":
                    in_class = True
                elif text[j] == "]":
                    in_class = False
                elif text[j] == "/" and not in_class:
                    break
                j += 1
            i, prev = j + 1, "r"
            continue
        if c in "{[" and (prev in ("=", "(", ",", ":", "?") or prev == "[" and c == "[" or prev_word == "return"):
            if not (prev == "=" and i >= 2 and text[i - 2:i].rstrip().endswith("=>")):
                try:
                    v, j = parse_literal_at(text, i)
                    if isinstance(v, (dict, list)) and v:
                        spans.append(("literal", i, j, v))
                        i, prev, prev_word = j, "}", ""
                        continue
                except (JSParseError, RecursionError, ValueError):
                    pass
        m = _IDENT.match(text, i) if (c.isalpha() or c in "_$") else None
        if m:
            prev_word, prev, i = m.group(), "a", m.end()
            continue
        if not c.isspace():
            if c == ">" and prev == "=":
                prev = ">"
            else:
                prev = c
            prev_word = "" if c not in ".)" else prev_word
        i += 1
    return spans


def context_before(text, i):
    """Name and call around position i: ('channelMix', None), (None, 'Plotly.newPlot'), ..."""
    head = text[max(0, i - 400):i]
    stmt = re.split(r"[;}\n]\s*(?=[A-Za-z_$])", head)[-1]
    name = None
    m = re.search(r"([A-Za-z_$][\w$]*)\s*(?<![=!<>])=(?![=>])[^=;]*$", stmt)
    if m:
        name = m.group(1)
    call = None
    depth = 0
    for k in range(len(head) - 1, -1, -1):
        ch = head[k]
        if ch == ")":
            depth += 1
        elif ch == "(":
            if depth == 0:
                mm = re.search(r"((?:new\s+)?[A-Za-z_$][\w$.]*)\s*$", head[:k])
                if mm:
                    call = mm.group(1).replace("new ", "").strip()
                    args = head[k + 1:]
                    ids = re.findall(r"['\"]#?([\w-]+)['\"]", args)
                    return name, call, (ids[0] if ids else None)
                break
            depth -= 1
        elif ch in ";\n" and depth == 0 and k < len(head) - 200:
            break
    return name, call, None


# ============================================================== numbers in text

_NULLS = {"", "-", "n/a", "na", "null", "none", "nan", "—", "–", "…", "..."}


def parse_number(s, locale=None):
    """'38\\'846' -> 38846, '69.2 %' -> 0.692, '15.8k' -> 15800, '2:41 min' -> 161, '–' -> None.
    Returns (value, kind) with kind in number|percent|seconds|null, or (None, 'text')."""
    if s is None:
        return None, "null"
    t = str(s).strip().replace("\u2212", "-").replace("\xa0", " ").replace("\u202f", " ").replace("\u2009", " ")
    if t.lower() in _NULLS:
        return None, "null"
    low = t.lower()
    m = re.fullmatch(r"([+-]?)(\d{1,3}):(\d{2})(?::(\d{2}))?\s*(min|mins|h|hrs?)?", low)
    if m:
        a, b, c = int(m.group(2)), int(m.group(3)), m.group(4)
        secs = a * 3600 + b * 60 + int(c) if c else (a * 3600 + b * 60 if m.group(5) and m.group(5).startswith("h") else a * 60 + b)
        return (-secs if m.group(1) == "-" else secs), "seconds"
    kind, mult = "number", 1.0
    if low.endswith("%"):
        kind, low = "percent", low[:-1].strip()
    elif re.search(r"\s?(pp|pts?|bp)$", low):
        low = re.sub(r"\s?(pp|pts?|bp)$", "", low).strip()
    m = re.fullmatch(r"(.*?\d)\s*(k|m|mn|mio|bn|b)", low)
    if m:
        low, mult = m.group(1), {"k": 1e3, "m": 1e6, "mn": 1e6, "mio": 1e6, "bn": 1e9, "b": 1e9}[m.group(2)]
    x = low.replace("'", "").replace("\u2019", "").replace(" ", "")
    if locale == "de" and re.fullmatch(r"[+-]?\d{1,3}(\.\d{3})+(,\d+)?", x):
        x = x.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"[+-]?\d{1,3}(,\d{3})+(\.\d+)?", x):
        x = x.replace(",", "")
    elif re.fullmatch(r"[+-]?[1-9]\d{0,2}(\.\d{3}){2,}(,\d+)?|[+-]?[1-9]\d{0,2}(\.\d{3})+,\d+", x):
        x = x.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"[+-]?\d+,\d+", x):
        x = x.replace(",", ".")
    if not re.fullmatch(r"[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?", x):
        return None, "text"
    v = float(x) * mult
    if kind == "percent":
        v = v / 100
    v = round(v, 10)
    if kind == "number" and v == int(v) and abs(v) < 1e15 and "." not in x or (mult != 1 and v == int(v)):
        v = int(v)
    return v, kind


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and not (isinstance(v, float) and math.isnan(v))


# ============================================================== HTML


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.children, self.parent = tag, dict(attrs), [], parent

    def text(self):
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return re.sub(r"\s+", " ", "".join(out)).strip()

    def iter(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.iter()

    def classes(self):
        return (self.attrs.get("class") or "").split()

    def ancestor(self, *tags):
        p = self.parent
        while p is not None:
            if p.tag in tags:
                return p
            p = p.parent
        return None


class DOM(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, None)
        self.cur = self.root
        self.feed(text)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, [(k, v if v is not None else "") for k, v in attrs], self.cur)
        self.cur.children.append(node)
        if tag not in self.VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, [(k, v if v is not None else "") for k, v in attrs], self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


# ============================================================== datasets


class Found:
    """Collects datasets and warnings while scanning one page."""

    def __init__(self):
        self.datasets, self.warnings, self.visuals = [], [], []

    def add(self, name, origin, columns, rows, note=None):
        rows = [list(r) for r in rows]
        if len(rows) < 2 or not columns:
            return
        types = []
        for ci, _ in enumerate(columns):
            vals = [r[ci] for r in rows if ci < len(r) and r[ci] is not None]
            nums = [v for v in vals if is_num(v)]
            if vals and len(nums) >= 0.8 * len(vals):
                types.append("number")
            elif vals and all(isinstance(v, str) and re.fullmatch(r"\d{4}-\d{2}", v) for v in vals):
                types.append("month")
            elif vals and all(isinstance(v, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}([T ][\d:.]+Z?)?", v) for v in vals):
                types.append("date")
            else:
                types.append("category")
        if "number" not in types:
            return
        sums = {}
        for ci, c in enumerate(columns):
            if types[ci] == "number":
                sums[c] = round(sum(r[ci] for r in rows if ci < len(r) and is_num(r[ci])), 6)
        self.datasets.append({"name": name, "origin": origin, "columns": [{"key": c, "type": t} for c, t in zip(columns, types)],
                              "rows": rows, "n_rows": len(rows), "sums": sums, "note": note})


def _plain(v):
    """Decode Plotly typed arrays {'dtype','bdata'} to lists."""
    if isinstance(v, dict) and "bdata" in v and "dtype" in v:
        fmt = {"i1": "b", "u1": "B", "i2": "h", "u2": "H", "i4": "i", "u4": "I", "i8": "q", "u8": "Q", "f4": "f", "f8": "d"}.get(v["dtype"])
        if not fmt:
            return None
        raw = base64.b64decode(v["bdata"])
        n = len(raw) // struct.calcsize(fmt)
        vals = list(struct.unpack("<%d%s" % (n, fmt), raw[:n * struct.calcsize(fmt)]))
        return [round(x, 10) if isinstance(x, float) else x for x in vals]
    return v


def _scalar(v):
    return v is None or isinstance(v, (str, int, float, bool))


def _flatten(rec, prefix=""):
    out = {}
    for k, v in rec.items():
        key = prefix + str(k)
        if isinstance(v, dict) and v and all(_scalar(x) for x in v.values()) and len(v) <= 12:
            out.update(_flatten(v, key + "."))
        elif isinstance(v, list) and all(_scalar(x) and not isinstance(x, (dict, list)) for x in v):
            out[key] = "; ".join(str(x) for x in v)
        elif isinstance(v, (dict, list)):
            continue
        elif isinstance(v, Expr):
            out[key] = None
        else:
            out[key] = v
    return out


def _records(found, name, origin, recs):
    flat = [_flatten(r) for r in recs if isinstance(r, dict)]
    cols = []
    for r in flat:
        for k in r:
            if k not in cols:
                cols.append(k)
    found.add(name, origin, cols, [[r.get(c) for c in cols] for r in flat])


def _series_columns(found, name, origin, cats, series, label_key="label"):
    cols, data = ["category"], [list(cats)]
    for i, s in enumerate(series):
        d = _plain(s.get("data")) if isinstance(s, dict) else None
        if isinstance(d, list) and len(d) == len(cats) and all(is_num(x) or x is None for x in d):
            lab = s.get(label_key) or s.get("name") or "series%d" % (i + 1)
            cols.append(str(lab) if not isinstance(lab, Expr) else "series%d" % (i + 1))
            data.append(d)
    if len(cols) > 1:
        found.add(name, origin, cols, list(zip(*data)))


def derive(found, value, name, origin, depth=0):
    """Find datasets inside a parsed value: records, columnar, pandas split, key/value numbers,
    and Chart.js / Plotly / ECharts / Highcharts / Vega-Lite configurations."""
    if depth > 12:
        return
    if isinstance(value, dict):
        v = value
        if isinstance(v.get("datasets"), list) and "labels" in v:               # Chart.js data block
            found.visuals.append({"kind": "chart", "library": "Chart.js", "name": name})
            labels = v["labels"]
            if isinstance(labels, list):
                _series_columns(found, name, origin + " (Chart.js)", labels, v["datasets"])
            return
        if isinstance(v.get("datasets"), dict) and ("mark" in v or "encoding" in v or "$schema" in v):   # Vega-Lite
            found.visuals.append({"kind": "chart", "library": "Vega-Lite", "name": name})
            for dn, recs in v["datasets"].items():
                if isinstance(recs, list):
                    _records(found, name, origin + " (Vega-Lite dataset %s)" % dn, recs)
            return
        if isinstance(v.get("data"), dict) and isinstance(v["data"].get("values"), list) and ("mark" in v or "encoding" in v):
            _records(found, name, origin + " (Vega-Lite)", v["data"]["values"])
            return
        if "series" in v and isinstance(v["series"], (list, dict)):             # ECharts / Highcharts
            lib = "Highcharts" if any(k in v for k in ("chart", "plotOptions")) or isinstance(v.get("xAxis"), dict) and "categories" in v["xAxis"] else "ECharts"
            found.visuals.append({"kind": "chart", "library": lib, "name": name})
            series = v["series"] if isinstance(v["series"], list) else [v["series"]]
            cats = None
            for axis in ("xAxis", "yAxis"):
                ax = v.get(axis)
                ax = ax[0] if isinstance(ax, list) and ax else ax
                if isinstance(ax, dict):
                    c = ax.get("data") if isinstance(ax.get("data"), list) else ax.get("categories")
                    if isinstance(c, list) and c:
                        cats = [x.get("value", x.get("name")) if isinstance(x, dict) else x for x in c]
                        break
            if cats:
                _series_columns(found, name, origin + " (%s)" % lib, cats, series, "name")
            for s in series:
                d = s.get("data") if isinstance(s, dict) else None
                if isinstance(d, list) and d and all(isinstance(x, dict) for x in d):
                    _records(found, name, origin + " (%s %s)" % (lib, s.get("type") or "series"), d)
                elif isinstance(d, list) and d and all(isinstance(x, list) and len(x) == 2 for x in d):
                    found.add(name, origin + " (%s pairs)" % lib, ["x", "y"], d)
            return
        if isinstance(v.get("columns"), list) and isinstance(v.get("data"), list) and v["data"] and all(isinstance(r, list) for r in v["data"]):
            found.add(name, origin + " (columns/data)", [str(c) for c in v["columns"]], v["data"])   # pandas split
            return
        lists = {k: _plain(x) for k, x in v.items() if isinstance(_plain(x), list) and len(_plain(x)) >= 2
                 and all(_scalar(y) and not isinstance(y, (dict, list)) for y in _plain(x))}
        lens = {len(x) for x in lists.values()}
        if len(lists) >= 2 and len(lens) == 1:                                  # columnar
            n = lens.pop()
            used, note = set(lists), None
            # coded columns in a sub-object ({"cols": {"div": [0, 2, …]}}) decoded with a lookup of the same keys
            for ck, cx in v.items():
                if not isinstance(cx, dict) or not cx:
                    continue
                inner = {ik: iv for ik, iv in cx.items() if isinstance(iv, list) and len(iv) == n}
                if len(inner) != len(cx):
                    continue
                look = next((lx for lk, lx in v.items() if lk != ck and isinstance(lx, dict) and set(inner) <= set(lx)
                             and all(isinstance(lx[i], list) and all(isinstance(y, str) for y in lx[i]) for i in inner)), None)
                for ik, iv in inner.items():
                    if look is not None and all(isinstance(y, int) and not isinstance(y, bool) for y in iv if y is not None):
                        lab = look[ik]
                        lists[ik] = [lab[y] if isinstance(y, int) and 0 <= y < len(lab) else y for y in iv]
                    else:
                        lists[ik] = iv
                used.add(ck)
                if look is not None:
                    used.update(lk for lk, lx in v.items() if lx is look)
                    note = "coded columns (%s) decoded with their lookup lists" % ", ".join(inner)
            keys = list(lists)
            found.add(name, origin + " (columnar)", keys, list(zip(*[lists[k] for k in keys])), note)
            for k, x in v.items():
                if k not in used and isinstance(x, (dict, list)):
                    derive(found, x, "%s.%s" % (name, k), origin, depth + 1)
            return
        if len(v) >= 2 and all(_scalar(x) and not isinstance(x, (dict, list)) or isinstance(x, Expr) for x in v.values()):
            nums = [(k, x) for k, x in v.items() if is_num(x)]
            config = sum(1 for k in v if re.fullmatch(r"(?i)(row|label|bar|col|font|line|tick)?(w|h|width|height|size|limit|max|min|"
                                                        r"margin|padding|gap|radius|offset|step|top|left|right|bottom|x|y|dx|dy|"
                                                        r"opacity|zoom|duration|delay|decimals|digits)(w|h)?", k))
            if len(nums) >= 3 and len(nums) >= 0.6 * len(v) and config * 2 < len(v):   # key/value numbers
                found.add(name, origin + " (key/value)", ["key", "value"], nums)
            return
        for k, x in v.items():
            if isinstance(x, (dict, list)):
                derive(found, x, "%s.%s" % (name, k) if name else str(k), origin, depth + 1)
        return
    if isinstance(value, list) and value:
        dicts = [x for x in value if isinstance(x, dict)]
        if len(dicts) >= 0.8 * len(value) and dicts:
            traces = [d for d in dicts if any(k in d for k in ("x", "y", "values")) and
                      any(k in d for k in ("type", "mode", "marker", "name", "orientation", "hole"))]
            if len(traces) == len(dicts):                                        # Plotly traces
                found.visuals.append({"kind": "chart", "library": "Plotly", "name": name,
                                      "types": sorted({str(d.get("type", "scatter")) for d in dicts})})
                groups = {}
                for i, d in enumerate(dicts):
                    if "values" in d:
                        labels, vals = _plain(d.get("labels")), _plain(d.get("values"))
                        if isinstance(labels, list) and isinstance(vals, list) and len(labels) == len(vals):
                            found.add(name, origin + " (Plotly %s)" % d.get("type", "pie"), ["label", "value"], list(zip(labels, vals)))
                        continue
                    x, y = _plain(d.get("x")), _plain(d.get("y"))
                    if isinstance(x, list) and isinstance(y, list) and len(x) == len(y):
                        cat, val = (y, x) if d.get("orientation") == "h" else (x, y)
                        groups.setdefault(tuple(map(str, cat)), (cat, []))[1].append((str(d.get("name") or "trace%d" % (i + 1)), val))
                for cat, series in groups.values():
                    cols = ["category"] + [s[0] for s in series]
                    found.add(name, origin + " (Plotly)", cols, list(zip(cat, *[s[1] for s in series])))
                return
            if len(dicts) >= 2 and any(any(_scalar(x) and not isinstance(x, (dict, list)) for x in d.values()) for d in dicts):
                _records(found, name, origin, dicts)
                return
            for i, d in enumerate(dicts):
                derive(found, d, "%s[%d]" % (name, i), origin, depth + 1)
            return
        rows = [x for x in value if isinstance(x, list)]
        if len(rows) == len(value) and len(rows) >= 2 and len({len(r) for r in rows}) == 1 and len(rows[0]) >= 2 \
                and all(_scalar(y) for r in rows for y in r):
            found.add(name, origin + " (rows)", ["c%d" % i for i in range(len(rows[0]))], rows)


# ---------------------------------------------------------------- tables, SVG, KPI tiles

_TOTAL_ROW = re.compile(r"^(total|totals|sum|grand total|overall|all|gesamt|summe)\b", re.I)


def _grid(trs):
    """Expand rowspan/colspan into a rectangular grid of (tag, text)."""
    grid, pending = [], {}
    for tr in trs:
        row, col = [], 0
        cells = [c for c in tr.children if isinstance(c, Node) and c.tag in ("td", "th")]
        ci = 0
        while ci < len(cells) or col in pending:
            if col in pending:
                tag, txt, left = pending[col]
                row.append((tag, txt))
                pending[col] = (tag, txt, left - 1)
                if left - 1 <= 0:
                    del pending[col]
                col += 1
                continue
            c = cells[ci]
            ci += 1
            span = int(c.attrs.get("colspan") or 1) if str(c.attrs.get("colspan") or "1").isdigit() else 1
            rs = int(c.attrs.get("rowspan") or 1) if str(c.attrs.get("rowspan") or "1").isdigit() else 1
            for _ in range(span):
                row.append((c.tag, c.text()))
                if rs > 1:
                    pending[col] = (c.tag, c.text(), rs - 1)
                col += 1
        grid.append(row)
    return grid


def _column_locale(texts):
    """'de' when a column shows dot thousands or comma decimals unambiguously, else None."""
    for t in texts:
        t = (t or "").replace("'", "").strip()
        if re.search(r"\d\.\d{3}\.\d{3}|\d\.\d{3},\d|^[+-]?\d+,\d{1,2}(\s*%)?$", t):
            return "de"
    return None


def _cell(x, locale=None):
    v, kind = parse_number(x, locale)
    return x if kind == "text" else v


def table_dataset(found, tbl, name, origin):
    trs = [n for n in tbl.iter() if n.tag == "tr" and n.ancestor("table") is tbl]
    head = [t for t in trs if t.ancestor("thead", "tbody", "tfoot", "table").tag == "thead"]
    foot = [t for t in trs if t.ancestor("thead", "tbody", "tfoot", "table").tag == "tfoot"]
    body = [t for t in trs if t not in head and t not in foot]
    if not head:
        while body and all(isinstance(c, Node) and c.tag == "th" for c in body[0].children if isinstance(c, Node)):
            head.append(body.pop(0))
    hgrid, bgrid = _grid(head), _grid(body)
    if not bgrid:
        return
    width = max(len(r) for r in bgrid)
    cols = []
    for ci in range(width):
        parts = []
        for r in hgrid:
            if ci < len(r) and r[ci][1] and r[ci][1] not in parts:
                parts.append(r[ci][1])
        cols.append(" / ".join(parts) or "col%d" % (ci + 1))
    bgrid = [r for r in bgrid if r and any(txt for _, txt in r)]
    if not bgrid:
        return
    width = max(len(r) for r in bgrid)
    while len(cols) < width:
        cols.append("col%d" % (len(cols) + 1))
    rows, dropped = [], 0
    for r in bgrid:
        cells = [txt for _, txt in r] + [""] * (width - len(r))
        if cells and _TOTAL_ROW.match(cells[0] or ""):
            dropped += 1
            continue
        rows.append(cells)
    locales = [_column_locale([r[ci] for r in rows]) for ci in range(width)]
    rows = [[_cell(x, locales[ci]) for ci, x in enumerate(r)] for r in rows]
    # pandas index column: empty header, th cells 0..n-1
    if not rows:
        return
    if hgrid and cols and cols[0].startswith("col") and all(r[0] == i for i, r in enumerate(rows)):
        cols, rows = cols[1:], [r[1:] for r in rows]
    for r in rows:
        for ci, x in enumerate(r):
            if x is None and ci < len(r):
                r[ci] = None
    note = "%d total row(s) and the table footer left out" % (dropped + len(foot)) if dropped or foot else None
    found.add(name, origin, cols, rows, note)
    found.visuals.append({"kind": "table", "name": name, "rows": len(rows), "columns": len(cols)})


def svg_datasets(found, dom, headings):
    for si, svg in enumerate([n for n in dom.root.iter() if n.tag == "svg"]):
        groups = {}
        for el in svg.iter():
            keys = tuple(sorted(k for k in el.attrs if k.startswith("data-")))
            if keys:
                groups.setdefault((el.tag, keys), []).append(el)
        for (tag, keys), els in groups.items():
            if len(els) >= 2:
                cols = [k[5:] for k in keys]
                rows = [[parse_number(e.attrs[k])[0] if parse_number(e.attrs[k])[1] != "text" else e.attrs[k] for k in keys] for e in els]
                found.add(headings.get(id(svg)) or "svg%d" % (si + 1), "svg #%d %s[data-*]" % (si + 1, tag), cols, rows)
        marks = [n for n in svg.iter() if n.tag in ("rect", "path", "circle", "line", "polyline")]
        if len(marks) >= 3:
            found.visuals.append({"kind": "chart", "library": "inline SVG", "name": headings.get(id(svg)) or "svg%d" % (si + 1)})


def kpi_tiles(found, dom):
    tiles = []
    for n in dom.root.iter():
        cls = " ".join(n.classes()).lower()
        if re.search(r"(^|\s)(kpi|kpi-card|kpi-tile|metric|metric-card|stat|stat-card|tile|scorecard|card-kpi)(\s|$)", cls):
            parts = {}
            for d in n.iter():
                dc = " ".join(d.classes()).lower()
                for role, pat in (("label", r"label|title|name|caption|head"), ("value", r"value|num|figure|big|amount|number"),
                                  ("delta", r"delta|change|trend|diff|var|vs")):
                    if role not in parts and re.search(pat, dc):
                        parts[role] = d.text()
            if "label" in parts and "value" in parts:
                v, _ = parse_number(re.sub(r"\s*(min|sec|s|views|visits)$", "", parts["value"]))
                dv, _ = parse_number(parts.get("delta") or "")
                tiles.append([parts["label"], parts["value"], v, parts.get("delta", ""), dv])
    if tiles:
        found.datasets.append({"name": "KPI tiles", "origin": "HTML KPI tiles", "n_rows": len(tiles),
                               "columns": [{"key": k, "type": t} for k, t in (("label", "category"), ("value_text", "category"),
                                           ("value", "number"), ("delta_text", "category"), ("delta", "number"))],
                               "rows": tiles, "sums": {}, "note": "values as printed on the tiles; rounded"})
        found.visuals.append({"kind": "kpi tiles", "count": len(tiles), "labels": [t[0] for t in tiles]})


# ---------------------------------------------------------------- whole page

_LIBS = [("plotly", "Plotly"), ("chart.js", "Chart.js"), ("chart.umd", "Chart.js"), ("echarts", "ECharts"),
         ("highcharts", "Highcharts"), ("d3", "D3"), ("vega-lite", "Vega-Lite"), ("vega-embed", "Vega-Embed"),
         ("vega", "Vega"), ("pako", "pako (gzip)"), ("duckdb", "DuckDB-WASM"), ("apexcharts", "ApexCharts"),
         ("tailwind", "Tailwind"), ("bootstrap", "Bootstrap"), ("jquery", "jQuery"), ("react", "React")]
_EXTERNAL = re.compile(r"""(?:fetch|d3\.(?:csv|tsv|json)|\$\.getJSON|axios\.get|loadData)\s*\(\s*['"]([^'"]+)['"]""")
_FILE_LIT = re.compile(r"""['"]([\w./-]+\.(?:csv|tsv|json|parquet|xlsx|arrow))['"]""")


def _load_external(found, base, ref):
    p = (base / ref).resolve()
    if re.match(r"^[a-z]+://", ref):
        found.warnings.append("remote source %s is not read: its data is not in the inventory" % ref)
        return
    if not p.exists():
        found.warnings.append("source file %s not found next to the page: its data is not in the inventory" % ref)
        return
    if p.suffix in (".csv", ".tsv"):
        raw = p.read_bytes()
        try:
            txt = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            txt = raw.decode("cp1252", errors="replace")
            found.warnings.append("%s is not UTF-8; read as Windows-1252 — check special characters" % ref)
        rows = list(csv.reader(io.StringIO(txt), delimiter="\t" if p.suffix == ".tsv" else ","))
        if rows:
            locs = [_column_locale([r[ci] for r in rows[1:] if ci < len(r)]) for ci in range(len(rows[0]))]
            body = [[_cell(x, locs[ci] if ci < len(locs) else None) for ci, x in enumerate(r)] for r in rows[1:]]
            found.add(p.stem, "file %s" % ref, rows[0], body)
    elif p.suffix == ".json":
        try:
            derive(found, json.loads(p.read_text(encoding="utf-8", errors="replace")), p.stem, "file %s" % ref)
        except ValueError as e:
            found.warnings.append("source file %s is not valid JSON (%s): its data is not in the inventory" % (ref, e))
    else:
        found.warnings.append("source file %s is %s, which this script cannot read: export it as CSV or JSON "
                              "and rerun, or add it by hand as a manual dataset" % (ref, p.suffix))


def _decode_string(s):
    """JSON inside a string, base64 JSON or gzip+base64 JSON -> (value, how) or (None, None)."""
    t = s.strip()
    if t[:1] in "[{":
        try:
            return json.loads(t), "JSON string"
        except ValueError:
            try:
                return parse_literal_at(t, 0)[0], "JS string"
            except (JSParseError, RecursionError):
                return None, None
    if len(t) >= 40 and re.fullmatch(r"[A-Za-z0-9+/=\s_-]+", t):
        try:
            raw = base64.b64decode(t + "=" * (-len(t) % 4), altchars=b"-_" if "-" in t or "_" in t else None)
        except (ValueError, TypeError):
            return None, None
        how = "base64"
        if raw[:2] == b"\x1f\x8b":
            try:
                raw, how = gzip.decompress(raw), "gzip+base64"
            except OSError:
                return None, None
        try:
            txt = raw.decode("utf-8")
        except UnicodeDecodeError:
            return None, None
        if txt.strip()[:1] in "[{":
            try:
                return json.loads(txt), how + " JSON"
            except ValueError:
                return None, None
    return None, None


def inventory(path):
    path = Path(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    dom = DOM(text)
    found = Found()
    # headings before each element, for naming charts and tables
    headings, last, ids = {}, None, {}
    for n in dom.root.iter():
        if n.tag in ("h1", "h2", "h3", "h4", "caption"):
            last = n.text()
        else:
            headings[id(n)] = last
            if n.attrs.get("id"):
                ids[n.attrs["id"]] = last
    title = next((n.text() for n in dom.root.iter() if n.tag == "title"), "") or next(
        (n.text() for n in dom.root.iter() if n.tag == "h1"), path.stem)
    libs, externals = [], []
    for si, s in enumerate([n for n in dom.root.iter() if n.tag == "script"]):
        src = s.attrs.get("src")
        if src:
            low = src.lower()
            lib = next((lab for key, lab in _LIBS if key in low.rsplit("/", 1)[-1] or "/%s@" % key in low or "/%s/" % key in low), None)
            libs.append(lib or src.rsplit("/", 1)[-1])
            continue
        code = "".join(c for c in s.children if isinstance(c, str))
        typ = (s.attrs.get("type") or "").lower()
        label = "script #%d" % (si + 1) + (" id=%s" % s.attrs["id"] if s.attrs.get("id") else "")
        if "json" in typ:
            try:
                derive(found, json.loads(code), s.attrs.get("id") or "json", label + " (JSON)")
            except ValueError:
                found.warnings.append("%s: JSON block could not be parsed" % label)
            continue
        if max((len(line) for line in code.splitlines()), default=0) > 2000:
            found.visuals.append({"kind": "note", "text": "%s is minified/bundled code" % label})
        for kind, a, b, val in scan_js(code):
            name, call, elid = context_before(code, a)
            nice = name or (ids.get(elid) if elid else None) or elid or call or "literal@%d" % a
            if call and elid and ids.get(elid):
                nice = ids[elid]
            if call and kind == "literal":
                mt = re.search(r"""title['"]?\s*:\s*(?:\{\s*['"]?text['"]?\s*:\s*)?['"]([^'"]{3,80})['"]""", code[a:b + 400])
                if mt:
                    nice = mt.group(1)
            where = "%s %s" % (label, ("%s(%s)" % (call, elid or "") if call else "const " + name if name else "offset %d" % a))
            if kind == "literal":
                derive(found, val, nice, where)
            elif len(val) >= 20:
                dec, how = _decode_string(val)
                if dec is not None:
                    derive(found, dec, name or nice, "%s (%s)" % (where, how))
        externals += _EXTERNAL.findall(code)
        externals += [m.group(1) for m in _FILE_LIT.finditer(code)
                      if not re.search(r"download\s*=|\+\s*$|filename", code[max(0, m.start() - 40):m.start()])]
    elem_ids = {n.attrs["id"] for n in dom.root.iter() if n.attrs.get("id")}
    for s_node in [n for n in dom.root.iter() if n.tag == "script" and not n.attrs.get("src")]:
        code = "".join(c for c in s_node.children if isinstance(c, str))
        for fn, eid in re.findall(r"""\b([A-Za-z_$][\w$]*)\(\s*['"]#?([\w-]+)['"]""", code):
            if eid in elem_ids and fn not in ("getElementById", "querySelector", "querySelectorAll", "$", "addEventListener", "setAttribute"):
                found.visuals.append({"kind": "chart call", "function": fn, "element": eid, "heading": ids.get(eid)})
    for ref in dict.fromkeys(externals):
        _load_external(found, path.parent, ref)
    for ti, tbl in enumerate([n for n in dom.root.iter() if n.tag == "table"]):
        cap = next((c.text() for c in tbl.iter() if c.tag == "caption"), None)
        nm = cap or headings.get(id(tbl)) or tbl.attrs.get("id") or "table%d" % (ti + 1)
        if any(isinstance(c, Node) and c.tag in ("tr", "tbody", "thead") for c in tbl.children):
            table_dataset(found, tbl, nm, "table #%d%s" % (ti + 1, " id=" + tbl.attrs["id"] if tbl.attrs.get("id") else ""))
    svg_datasets(found, dom, headings)
    kpi_tiles(found, dom)
    for n in dom.root.iter():
        if n.tag == "canvas":
            found.visuals.append({"kind": "canvas", "name": headings.get(id(n)) or n.attrs.get("id")})
        if n.tag in ("select", "input") and (n.attrs.get("type") or "").lower() not in ("hidden", "submit"):
            found.visuals.append({"kind": "filter", "tag": n.tag, "name": n.attrs.get("id") or n.attrs.get("name")})
    # de-duplicate: same rows and same numeric sums = same data shown twice
    seen, unique = {}, []
    for d in found.datasets:
        key = (d["n_rows"], tuple(sorted(round(v, 4) for v in d["sums"].values())))
        if d["sums"] and key in seen:
            found.warnings.append("'%s' (%s) holds the same rows and totals as '%s' — listed once" % (d["name"], d["origin"], seen[key]))
            continue
        seen[key] = d["name"]
        unique.append(d)
    used = {}
    for d in unique:
        base = re.sub(r"[^a-z0-9]+", "_", str(d["name"]).lower()).strip("_")[:40] or "data"
        used[base] = used.get(base, 0) + 1
        d["id"] = base if used[base] == 1 else "%s_%d" % (base, used[base])
        d["grain"] = _guess_grain(d)
    heads = [n.text() for n in dom.root.iter() if n.tag in ("h1", "h2", "h3")]
    as_of = sorted(set(re.findall(r"""['"]?(?:asOf|as_of|asof|cutoff|cut_off|dataAsOf|generated|lastUpdated|refreshed)['"]?\s*[:=]\s*['"](\d{4}-\d{2}-\d{2})""", text)))
    long_text = sum(1 for n in dom.root.iter() if n.tag == "p" and len(n.text()) > 200)
    return {"file": path.name, "title": title, "as_of_found": as_of, "libraries": sorted(set(libs)), "datasets": unique,
            "visuals": found.visuals, "headings": heads, "long_text_blocks": long_text, "warnings": found.warnings}


def _guess_grain(d):
    cats = [i for i, c in enumerate(d["columns"]) if c["type"] == "category"]
    for i in cats:
        vals = [r[i] for r in d["rows"] if r[i] not in (None, "")]
        if len(vals) >= 10 and len(set(vals)) >= 0.9 * len(vals):
            return "record"
    return "record" if d["n_rows"] >= 50 else "aggregate"


def print_inventory(inv):
    print("Inventory of %s — %s" % (inv["file"], inv["title"]))
    print("Libraries: %s" % (", ".join(inv["libraries"]) or "none"))
    if inv.get("as_of_found"):
        print("Cut-off date(s) in the file: %s" % ", ".join(inv["as_of_found"]))
    print("\nDatasets (%d):" % len(inv["datasets"]))
    for d in inv["datasets"]:
        nums = ", ".join("%s=%s" % (k, _short(v)) for k, v in list(d["sums"].items())[:6])
        print("  %-28s %5d rows  %-9s %s" % (d["id"], d["n_rows"], d["grain"], d["origin"]))
        print("  %-28s columns: %s" % ("", ", ".join(c["key"] for c in d["columns"])[:110]))
        if nums:
            print("  %-28s sums: %s" % ("", nums))
        if d.get("note"):
            print("  %-28s note: %s" % ("", d["note"]))
    kinds = {}
    for v in inv["visuals"]:
        kinds[v["kind"]] = kinds.get(v["kind"], 0) + (v.get("count", 1))
    print("\nVisual elements: " + ", ".join("%s × %d" % (k, n) for k, n in kinds.items()))
    calls = [v for v in inv["visuals"] if v["kind"] == "chart call"]
    if calls:
        print("Drawn by the page's own code: " + "; ".join("%s(%s)%s" % (c["function"], c["element"], " under '%s'" % c["heading"] if c.get("heading") else "") for c in calls[:30]))
    print("Headings: " + " | ".join(inv["headings"][:14]))
    if inv["long_text_blocks"]:
        print("Long text blocks (>200 chars): %d" % inv["long_text_blocks"])
    for w in inv["warnings"]:
        print("WARN " + w)


def _short(v):
    return ("%.4g" % v) if isinstance(v, float) and v != int(v) else "{:,}".format(int(v))


# ============================================================== metric catalogue
# id: (label, unit, additive, good, jargon, definition)
# unit: count | percent (fraction 0..1) | seconds | score. additive=False: never summed across rows.

METRICS = {
    "views": ("Views", "count", True, "up", ["PV", "page views", "pageviews", "impressions", "hits"],
              "Times a page or item was opened."),
    "visits": ("Visits", "count", True, "up", ["sessions"], "Separate visits; one visit can include several views."),
    "unique_visitors": ("Unique visitors", "count", False, "up", ["UV", "uniques", "unique users", "UU"],
                        "Distinct people who opened it at least once. Cannot be added across pages, items or periods."),
    "reach_pct": ("Share of employees reached", "percent", False, "up", ["reach rate", "penetration"],
                  "Unique visitors or viewers ÷ employees in the audience."),
    "headcount": ("Employees", "count", False, "neutral", ["HC", "FTE", "headcount"], "Employees in the audience."),
    "items_published": ("Items published", "count", True, "neutral", ["# articles", "posts", "count"], "Items published in the period."),
    "sent": ("Emails sent", "count", True, "neutral", ["sends", "ES"], "Emails sent."),
    "delivered": ("Emails delivered", "count", True, "neutral", ["deliveries"], "Emails that reached an inbox."),
    "opens": ("Opens", "count", True, "up", ["total opens"], "Times emails were opened, repeat opens included."),
    "unique_opens": ("People who opened", "count", True, "up", ["unique opens", "UO"],
                     "Recipients who opened a mailing at least once, counted per mailing."),
    "open_rate": ("Open rate", "percent", False, "up", ["OR", "unique open rate", "UOR"],
                  "People who opened ÷ emails delivered. Some email apps open messages automatically, so the real rate is lower: compare it over time rather than reading the level."),
    "clicks": ("Clicks", "count", True, "up", ["total clicks"], "Clicks on links, repeat clicks included."),
    "unique_clicks": ("People who clicked", "count", True, "up", ["unique clicks", "UC"],
                      "Recipients or visitors who clicked at least once, counted per item."),
    "click_rate": ("Click rate", "percent", False, "up", ["CTR", "click-through rate", "UCTR"],
                   "People who clicked ÷ emails delivered (email) or ÷ views (pages)."),
    "click_to_open": ("Clicks per open", "percent", False, "up", ["CTO", "CTOR", "click-to-open rate"],
                      "People who clicked ÷ people who opened."),
    "click_rate_per_view": ("Click rate per view", "percent", False, "up", ["CTVR"], "Link clicks ÷ page views."),
    "visitors_who_clicked": ("Visitors who clicked", "percent", False, "up", ["UCTUVR"],
                             "Visitors who clicked a link ÷ unique visitors."),
    "unsubscribes": ("Unsubscribes", "count", True, "down", ["unsubs", "opt-outs"], "Recipients who unsubscribed."),
    "unsub_rate": ("Unsubscribe rate", "percent", False, "down", ["opt-out rate"], "Unsubscribes ÷ emails delivered."),
    "time_on_page": ("Time on page", "seconds", False, "up", ["avg. time on page", "ATOP", "dwell time"],
                     "Average time a visit spent on the page."),
    "read_time": ("Reading time", "seconds", False, "up", ["reading time", "avg. read time"], "Average reading time."),
    "scroll_depth": ("Scroll depth", "percent", False, "up", ["scroll %"], "How far down the page readers scrolled on average."),
    "bounce_rate": ("Left after one page", "percent", False, "down", ["bounce rate", "BR"],
                    "Visits that ended on the first page without another click."),
    "returning_visitors": ("Returning visitors", "count", False, "up", ["repeat visitors"], "Visitors who came back."),
    "reactions": ("Likes and reactions", "count", True, "up", ["likes", "reactions", "kudos"], "Likes and other reactions."),
    "comments": ("Comments", "count", True, "up", [], "Comments posted."),
    "shares": ("Shares", "count", True, "up", ["reposts"], "Times it was shared."),
    "engagement_rate": ("Engagement rate", "percent", False, "up", ["ER"], "(Reactions + comments + shares) ÷ views."),
    "video_starts": ("Video plays", "count", True, "up", ["plays", "starts", "video views"], "Times a video started playing."),
    "unique_viewers": ("Unique viewers", "count", False, "up", ["UV (video)", "unique plays"],
                       "Distinct people who played it. Cannot be added across videos or periods."),
    "completions": ("Watched to the end", "count", True, "up", ["completes", "C100"], "Plays watched to the end."),
    "completion_rate": ("Completion rate", "percent", False, "up", ["VCR", "completion %"],
                        "Plays watched to the end ÷ all plays (views), not ÷ unique viewers."),
    "watch_time": ("Watch time", "seconds", True, "up", ["total watch time", "minutes viewed"], "Total time watched."),
    "avg_watch_time": ("Average watch time", "seconds", False, "up", ["AWT", "avg. view duration", "AVD"],
                       "Average time watched per play."),
    "avg_pct_watched": ("Average share watched", "percent", False, "up", ["APV", "avg. % viewed"],
                        "Average share of the video watched per play."),
    "retention": ("Still watching", "percent", False, "up", ["audience retention", "drop-off"],
                  "Share of viewers still watching at that point of the video."),
    "registrations": ("Registrations", "count", True, "up", ["sign-ups", "regs"], "People who registered."),
    "attendees": ("Attendees", "count", True, "up", ["attendance", "participants"], "People who attended."),
    "attendance_rate": ("Attendance rate", "percent", False, "up", ["show rate", "show-up rate"], "Attendees ÷ registrations."),
    "replay_views": ("Replay views", "count", True, "up", ["on-demand views", "VOD views"], "Views of the recording."),
    "score": ("Average rating", "score", False, "up", ["CSAT", "satisfaction score", "rating"], "Average rating given."),
    "engagement_score": ("Engagement score", "score", False, "up", ["ES score", "engagement index"],
                         "The platform's own engagement score; its formula is the platform's, not a count."),
    "downloads": ("Downloads", "count", True, "up", ["file downloads"], "Times a linked file was downloaded."),
    "responses": ("Responses", "count", True, "neutral", ["n"], "Survey responses."),
}

# column names that point to a metric (lower case, non-alphanumerics removed)
_SYNONYMS = {
    "views": ["views", "pageviews", "pageview", "totalviews", "viewcount"],
    "visits": ["visits", "sessions"],
    "unique_visitors": ["uniquevisitors", "uv", "uniqueusers", "visitors", "users"],
    "headcount": ["headcount", "hc", "employees", "fte"],
    "sent": ["sent", "emailssent", "emailsent"],
    "delivered": ["delivered", "deliveries"],
    "opens": ["opens", "totalopens"],
    "unique_opens": ["uniqueopens", "uo"],
    "open_rate": ["openrate", "uniqueopenrate", "or"],
    "clicks": ["clicks", "totalclicks"],
    "unique_clicks": ["uniqueclicks", "uc"],
    "click_rate": ["clickrate", "ctr", "clickthroughrate"],
    "click_to_open": ["cto", "ctor", "clicktoopen", "clicktoopenrate"],
    "unsubscribes": ["unsubscribes", "unsubs", "optouts"],
    "time_on_page": ["avgtimeonpage", "timeonpage", "dwelltime"],
    "read_time": ["readingtimes", "readingtime", "readtime"],
    "bounce_rate": ["bouncerate", "bounce"],
    "reactions": ["likes", "reactions"],
    "comments": ["comments"],
    "shares": ["shares"],
    "unique_viewers": ["uniqueviewers"],
    "completions": ["completions", "completes", "c100"],
    "completion_rate": ["completionrate", "vcr"],
    "avg_watch_time": ["avgwatchs", "avgwatchtime", "averagewatchtime", "avgviewduration"],
    "retention": ["retention", "stillwatching"],
    "registrations": ["registrations", "signups"],
    "attendees": ["attendees", "attendance", "attended"],
    "replay_views": ["replayviews"],
    "score": ["score", "rating", "csat"],
    "responses": ["responses"],
    "reach_pct": ["reachpct", "reachrate", "penetration", "shareofemployeesreached"],
    "unsub_rate": ["unsubrate", "unsubscriberate", "optoutrate"],
    "engagement_rate": ["engagementrate", "er"],
    "attendance_rate": ["attendancerate", "showrate", "showuprate"],
    "scroll_depth": ["scrolldepth", "avgscrolldepth"],
    "returning_visitors": ["returningvisitors", "repeatvisitors"],
    "avg_pct_watched": ["avgpctwatched", "avgpercentwatched", "avgpctviewed", "averagepercentageviewed"],
    "video_starts": ["plays", "starts", "videoviews", "videostarts"],
    "watch_time": ["watchtime", "totalwatchtime", "minutesviewed"],
    "items_published": ["itemspublished", "published"],
    "engagement_score": ["engagementscore"],
    "downloads": ["downloads"],
    "click_rate_per_view": ["ctvr", "clickrateperview"],
    "visitors_who_clicked": ["uctuvr", "visitorswhoclicked"],
}
_SYN = {syn: mid for mid, syns in _SYNONYMS.items() for syn in syns}
_JARGON = {j.lower() for m in METRICS.values() for j in m[4] if re.fullmatch(r"[A-Z0-9]{2,6}", j)} | {"ctvr", "uctuvr", "pv", "uv"}


def guess_metric(key, context=""):
    """Metric id from a column name; the parent part ('Video / Views', 'video.uv') or the dataset name refines generic names."""
    full = str(key).lower() + " " + str(context).lower()
    k = re.sub(r"[^a-z0-9]", "", re.split(r"[./]", str(key).lower())[-1])
    m = _SYN.get(k)
    if "video" in full or re.search(r"(^|[^a-z])vids?([^a-z]|$)", full):
        m = {"views": "video_starts", "unique_visitors": "unique_viewers", "visits": "video_starts"}.get(m, m)
    return m


# ============================================================== computation


class LayoutError(Exception):
    pass


def fmt(v, unit="count"):
    """12.3k, 1.2M, 61.8%, 2:41 min, 4.2 — one format everywhere."""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "–"
    if unit == "percent":
        return (("%.2f%%" if 0 < abs(v) < 0.01 else "%.1f%%") % (v * 100)).replace("-", "\u2212")
    if unit == "seconds":
        s = int(round(v))
        if s >= 3600:
            return "%d h %02d min" % (s // 3600, s % 3600 // 60)
        return "%d:%02d min" % (s // 60, s % 60)
    if unit == "score":
        return "%.1f" % v
    a = abs(v)
    if a >= 1e6:
        out = ("%.1f" % (v / 1e6)).rstrip("0").rstrip(".") + "M"
    elif a >= 1e4:
        out = ("%.1f" % (v / 1e3)).rstrip("0").rstrip(".") + "k"
    elif v != int(v) and a < 100:
        out = "%.1f" % v
    else:
        out = "{:,}".format(int(round(v)))
    return out.replace("-", "−")


def fmt_month(v):
    if is_num(v) and v == int(v) and 1 <= v <= 12:
        return dt.date(2000, int(v), 1).strftime("%b")
    m = re.fullmatch(r"(\d{4})-(\d{2})", str(v))
    if m and 1 <= int(m.group(2)) <= 12:
        return dt.date(int(m.group(1)), int(m.group(2)), 1).strftime("%b %Y")
    return str(v)


def _sortkey(x):
    """Sort numbers before text, never compare the two."""
    return (0, x, "") if is_num(x) else (1, 0, str(x))


class Model:
    """data.json in memory. Every figure on the page comes from Model.value / Model.groups."""

    def __init__(self, data):
        self.meta = data.get("meta") or {}
        self.ds = {}
        for name, d in (data.get("datasets") or {}).items():
            cols = [c["key"] for c in d["columns"]]
            bad = [i for i, r in enumerate(d["rows"]) if len(r) != len(cols)]
            if bad:
                raise LayoutError("dataset '%s': row %d has %d values for %d columns" % (name, bad[0], len(d["rows"][bad[0]]), len(cols)))
            rows = [dict(zip(cols, r)) for r in d["rows"]]
            for c in d["columns"]:
                sc = c.get("scale")
                if sc:
                    for r in rows:
                        if is_num(r.get(c["key"])):
                            r[c["key"]] = r[c["key"]] * sc
            self.ds[name] = {"cols": cols, "meta": {c["key"]: c for c in d["columns"]}, "grain": d.get("grain", "aggregate"), "rows": rows}
            for c in d["columns"]:
                if c.get("type") == "number" and self.unit(name, c["key"]) == "percent":
                    big = max((abs(r[c["key"]]) for r in rows if is_num(r.get(c["key"]))), default=0)
                    if big > 1.5:
                        raise LayoutError("dataset '%s' column '%s' is a percentage but holds values up to %s: percentages are "
                                          "fractions 0-1 — add \"scale\": 0.01 to the column if it is stored as 0-100" % (name, c["key"], big))
        self.filters = {}     # column -> (value, set of datasets it applies to)

    # ---- columns
    def col(self, ds, key):
        if ds not in self.ds:
            raise LayoutError("unknown dataset '%s' (data.json has: %s)" % (ds, ", ".join(self.ds)))
        if key not in self.ds[ds]["meta"]:
            raise LayoutError("dataset '%s' has no column '%s' (it has: %s)" % (ds, key, ", ".join(self.ds[ds]["cols"])))
        return self.ds[ds]["meta"][key]

    def metric(self, ds, key):
        return self.col(ds, key).get("metric")

    def unit(self, ds, key):
        c = self.col(ds, key)
        if c.get("unit"):
            return c["unit"]
        m = c.get("metric")
        return METRICS[m][1] if m in METRICS else "count"

    def additive(self, ds, key):
        c = self.col(ds, key)
        if "additive" in c:
            return bool(c["additive"])
        m = c.get("metric")
        return METRICS[m][2] if m in METRICS else False

    # ---- rows
    def rows(self, ds, where=None, track=None):
        if ds not in self.ds:
            raise LayoutError("unknown dataset '%s' (data.json has: %s)" % (ds, ", ".join(self.ds)))
        rows = self.ds[ds]["rows"]
        for key, (val, dsets) in self.filters.items():
            if ds in dsets and val not in (None, ""):
                rows = [r for r in rows if str(r.get(key)) == str(val)]
                if track is not None:
                    track.add(ds)
        items = sorted((where or {}).items(), key=lambda kv: kv[1] in ("@last", "@prev"))
        for key, cond in items:
            self.col(ds, key)
            if isinstance(cond, list):
                allowed = {str(x) for x in cond}
                rows = [r for r in rows if str(r.get(key)) in allowed]
            elif isinstance(cond, dict) and "not" in cond:
                bad = cond["not"] if isinstance(cond["not"], list) else [cond["not"]]
                rows = [r for r in rows if r.get(key) not in bad]
            elif isinstance(cond, dict):
                lo, hi = cond.get("from"), cond.get("to")
                if all(is_num(b) for b in (lo, hi) if b is not None):
                    rows = [r for r in rows if is_num(r.get(key)) and (lo is None or r[key] >= lo) and (hi is None or r[key] <= hi)]
                else:
                    rows = [r for r in rows if r.get(key) not in (None, "") and (lo is None or str(r[key]) >= str(lo)) and (hi is None or str(r[key]) <= str(hi))]
            elif cond in ("@last", "@prev"):
                vals = sorted({r[key] for r in rows if r.get(key) not in (None, "")}, key=_sortkey)
                pick = vals[-1] if cond == "@last" and vals else vals[-2] if cond == "@prev" and len(vals) >= 2 else None
                rows = [r for r in rows if pick is not None and r.get(key) == pick]
            else:
                rows = [r for r in rows if r.get(key) == cond or (r.get(key) is not None and str(r.get(key)) == str(cond))]
        if where and not rows and not self.active():
            raise LayoutError("'where' %s on dataset '%s' selects no rows — check the spelling of the value" % (json.dumps(where, ensure_ascii=False), ds))
        return rows

    def active(self):
        return any(v not in (None, "") for v, _ in self.filters.values())

    def agg(self, rows, ds, spec, what):
        """Aggregate rows. spec: {column, agg, weight} or {agg:'ratio', num, den} with column names."""
        a = spec.get("agg", "sum")
        if a == "ratio":
            n = self.agg(rows, ds, {"column": spec["num"], "agg": "sum"}, what)
            d = self.agg(rows, ds, {"column": spec["den"], "agg": "sum"}, what)
            return n / d if n is not None and d else None
        if a == "count":
            return len(rows)
        col = spec.get("column")
        if col is None:
            raise LayoutError("%s: 'column' is missing" % what)
        self.col(ds, col)
        vals = [r[col] for r in rows if is_num(r.get(col))]
        if a == "distinct":
            return len({r.get(col) for r in rows if r.get(col) not in (None, "")})
        if not vals:
            return None
        if a == "sum":
            if not self.additive(ds, col) and len(vals) > 1:
                m = self.metric(ds, col)
                if m in METRICS or "additive" in self.col(ds, col):
                    raise LayoutError("%s: '%s' (%s) cannot be added up across %d rows — take the total from a dataset that "
                                      "already holds it, show the figure per item (chart or table) instead of as a total, "
                                      "or use a ratio of two additive columns" % (what, col, METRICS[m][0] if m in METRICS else "not additive", len(vals)))
                raise LayoutError("%s: column '%s' has no catalogue metric, so it is not added up — set its 'metric' in "
                                  "data.json, or \"additive\": true if adding it up is meaningful" % (what, col))
            return sum(vals)
        if a == "mean":
            return sum(vals) / len(vals)
        if a == "median":
            return statistics.median(vals)
        if a == "min":
            return min(vals)
        if a == "max":
            return max(vals)
        if a == "last":
            return vals[-1]
        if a == "first":
            return vals[0]
        if a == "weighted":
            w = spec.get("weight")
            if not w:
                raise LayoutError("%s: agg 'weighted' needs 'weight'" % what)
            self.col(ds, w)
            pairs = [(r[col], r[w]) for r in rows if is_num(r.get(col)) and is_num(r.get(w))]
            tw = sum(p[1] for p in pairs)
            return sum(p[0] * p[1] for p in pairs) / tw if tw else None
        raise LayoutError("%s: unknown agg '%s'" % (what, a))

    def value(self, ref, what, track=None):
        """A value reference: {dataset, column, agg, where, weight} or {agg:'ratio', num:REF, den:REF}."""
        if not isinstance(ref, dict):
            raise LayoutError("%s: a value must be a reference like {\"dataset\": …, \"column\": …, \"agg\": …}, not %r" % (what, ref))
        if ref.get("agg") == "ratio" and isinstance(ref.get("num"), dict):
            tn, td = set(), set()
            n = self.value(ref["num"], what + " (numerator)", tn)
            d = self.value(ref["den"], what + " (denominator)", td)
            if track is not None:
                track |= tn | td
            if self.active() and bool(tn) != bool(td):
                if track is not None:
                    track.add("~mixed")
                return None
            return n / d if n is not None and d else None
        ds = ref.get("dataset")
        rows = self.rows(ds, ref.get("where"), track)
        return self.agg(rows, ds, ref, what)

    def unit_of(self, ref, fallback="count"):
        if ref.get("agg") == "ratio":
            return "percent"
        if ref.get("agg") in ("count", "distinct"):
            return "count"
        if ref.get("dataset") and ref.get("column"):
            return self.unit(ref["dataset"], ref["column"])
        return fallback

    def groups(self, ds, x, spec, where, what, bucket=None, track=None):
        """Aggregate spec per value of column x -> list of (key, value)."""
        self.col(ds, x)
        out = {}
        for r in self.rows(ds, where, track):
            k = r.get(x)
            if k is None or k == "":
                k = "(blank)"
            if bucket:
                k = _bucket(k, bucket)
            out.setdefault(k, []).append(r)
        return [(k, self.agg(rs, ds, spec, "%s, %s = %s" % (what, x, k)), len(rs)) for k, rs in out.items()]


def _bucket(v, bucket):
    s = str(v)
    if bucket == "month":
        return s[:7]
    if bucket == "year":
        return s[:4]
    if bucket == "week":
        try:
            y, w, _ = dt.date.fromisoformat(s[:10]).isocalendar()
            return "%d-W%02d" % (y, w)
        except ValueError:
            return s
    raise LayoutError("unknown bucket '%s' (use month, week or year)" % bucket)


_TIME_TYPES = ("month", "date")


def _is_time(model, ds, x, bucket):
    return bool(bucket) or model.col(ds, x).get("type") in _TIME_TYPES or model.col(ds, x).get("type") == "week"


def chart_view(model, spec, what, track):
    t = spec.get("type")
    kinds = ("line", "column", "bar", "groupedBar", "donut", "funnel", "table")
    if t not in kinds:
        raise LayoutError("%s: chart type must be one of %s, not %r" % (what, ", ".join(kinds), t))
    if t == "funnel":
        steps = []
        for i, st in enumerate(spec.get("steps") or []):
            if "value" not in st:
                raise LayoutError("%s step %d: 'value' is missing" % (what, i + 1))
            v = model.value(st["value"], "%s step %d" % (what, i + 1), track)
            steps.append({"label": st.get("label") or "Step %d" % (i + 1), "value": v, "display": fmt(v, model.unit_of(st["value"]))})
        if len(steps) < 2:
            raise LayoutError("%s: a funnel needs at least two steps" % what)
        first = steps[0]["value"] or 0
        for st in steps:
            st["share"] = ("%.0f%% of %s" % (st["value"] / first * 100, steps[0]["label"].lower())) if first and st["value"] is not None else ""
        return {"type": t, "steps": steps}
    ds = spec.get("dataset")
    if t == "table":
        cols = spec.get("columns") or []
        if not cols:
            raise LayoutError("%s: a table needs 'columns'" % what)
        rows = model.rows(ds, spec.get("where"), track)
        for c in cols:
            if "num" in c:
                model.col(ds, c["num"])
                model.col(ds, c["den"])
                if not c.get("label"):
                    raise LayoutError("%s: computed table column %s/%s needs a 'label'" % (what, c["num"], c["den"]))
            else:
                model.col(ds, c["key"])
        sk = spec.get("sort")
        if sk:
            key, desc = sk.get("key"), sk.get("dir", "desc") == "desc"
            model.col(ds, key)
            blank = [r for r in rows if r.get(key) in (None, "")]
            rows = sorted([r for r in rows if r.get(key) not in (None, "")], key=lambda r: _sortkey(r[key]), reverse=desc) + blank
        total = len(rows)
        top = spec.get("top", 10)
        rows = rows[:top] if top else rows
        out_cols, out_rows, bars = [], [], []
        for c in cols:
            if "num" in c:
                out_cols.append({"label": c["label"], "num": True, "bar": bool(c.get("bar")), "tip": c.get("definition", "")})
                continue
            num = model.col(ds, c["key"]).get("type") == "number"
            meta_m = model.metric(ds, c["key"])
            out_cols.append({"label": c.get("label") or (METRICS[meta_m][0] if meta_m in METRICS else c["key"]),
                             "num": num, "bar": bool(c.get("bar")), "tip": _tip(meta_m)})
        for r in rows:
            cells, brow = [], []
            for c in cols:
                if "num" in c:
                    a, b = r.get(c["num"]), r.get(c["den"])
                    v = a / b if is_num(a) and is_num(b) and b else None
                    cells.append(fmt(v, c.get("unit", "percent")))
                    brow.append(v)
                    continue
                v = r.get(c["key"])
                if model.col(ds, c["key"]).get("type") == "number":
                    cells.append(fmt(v, model.unit(ds, c["key"])) if is_num(v) else "–")
                    brow.append(v if is_num(v) else None)
                else:
                    cells.append(fmt_month(v) if model.col(ds, c["key"]).get("type") == "month" else ("" if v is None else str(v)))
                    brow.append(None)
            out_rows.append(cells)
            bars.append(brow)
        return {"type": t, "columns": out_cols, "rows": out_rows, "bars": bars, "shown": len(out_rows), "total": total}
    x = spec.get("x")
    if not x:
        raise LayoutError("%s: 'x' (the category or time column) is missing" % what)
    series = spec.get("series") or [{"y": y} for y in (spec["y"] if isinstance(spec.get("y"), list) else [spec.get("y")])]
    if not series or any(s.get("y") is None and s.get("agg") not in ("ratio", "count") for s in series):
        raise LayoutError("%s: give 'y' (column or list of columns) or 'series'" % what)
    bucket = spec.get("bucket")
    time_axis = _is_time(model, ds, x, bucket)
    cats, sers = [], []
    for i, s in enumerate(series):
        sds = s.get("dataset", ds)
        agg = {"column": s.get("y"), "agg": s.get("agg", spec.get("agg", "sum")), "weight": s.get("weight"),
               "num": s.get("num"), "den": s.get("den")}
        where = dict(spec.get("where") or {}, **(s.get("where") or {}))
        g = model.groups(sds, s.get("x", x), agg, where, what, s.get("bucket", bucket), track)
        unit = s.get("unit") or ("percent" if agg["agg"] == "ratio" else "count" if agg["agg"] in ("count", "distinct") else model.unit(sds, s["y"]))
        m = s.get("metric") or (model.metric(sds, s["y"]) if s.get("y") else None)
        label = s.get("label") or (METRICS[m][0] if m in METRICS else s.get("y") or "Value")
        min_n = spec.get("min_n")
        hidden = [k for k, _, n in g if min_n and n < min_n]
        sers.append({"label": label, "unit": unit, "map": {k: v for k, v, _ in g if k not in hidden}, "tip": _tip(m),
                     "n": {k: n for k, _, n in g}, "hidden": hidden})
        for k, _, _ in g:
            if k not in cats and k not in hidden:
                cats.append(k)
    if time_axis:
        cats = sorted(cats, key=lambda c: (0, c, "") if is_num(c) else (1, 0, str(c)))
    sort = spec.get("sort", "desc" if t in ("bar", "donut") else "none")
    if sort in ("desc", "asc"):
        cats = sorted(cats, key=lambda k: (sers[0]["map"].get(k) is None, sers[0]["map"].get(k) or 0), reverse=(sort == "desc"))
        if sort == "desc":   # keep blanks last after reverse
            cats = [k for k in cats if sers[0]["map"].get(k) is not None] + [k for k in cats if sers[0]["map"].get(k) is None]
    top = spec.get("top", 5 if t in ("donut", "bar") else None)
    other = None
    if top and len(cats) > top:
        keep = cats[:top - 1] if t == "donut" else cats[:top]
        rest = [k for k in cats if k not in keep]
        if spec.get("other", True) and all(_additive_series(model, ds, s, spec) for s in series):
            other = [sum(v for v in (sr["map"].get(k) for k in rest) if is_num(v)) for sr in sers]
        cats = keep
    shown = [fmt_month(c) + (" (n=%d)" % sers[0]["n"].get(c, 0) if spec.get("show_n") else "") for c in cats]
    full = list(shown)
    partial = None
    as_of = str(model.meta.get("asOf") or "")
    if time_axis and re.fullmatch(r"\d{4}-\d{2}-\d{2}", as_of):
        d = dt.date.fromisoformat(as_of)
        if (d + dt.timedelta(days=1)).month == d.month:            # cut-off is not a month end
            for i, c in enumerate(cats):
                if str(c) == as_of[:7]:
                    shown[i] = shown[i] + "*"
                    full[i] = "%s (to %d %s)" % (fmt_month(c), d.day, d.strftime("%b"))
                    partial = "* %s runs only to %d %s (data cut-off)." % (fmt_month(c), d.day, d.strftime("%b %Y"))
    view = {"type": t, "categories": shown + (["Other (%d)" % len(rest)] if other else []),
            "full": full + (["Other (%d)" % len(rest)] if other else []), "time": time_axis, "series": []}
    if partial:
        view["partial"] = partial
    if sers[0]["hidden"]:
        view["partial"] = ((view.get("partial") or "") + " %d group(s) with fewer than %d items not shown." % (len(sers[0]["hidden"]), spec["min_n"])).strip()
    view["zero"] = spec.get("zero", True)
    for si, sr in enumerate(sers):
        vals = [sr["map"].get(k) for k in cats] + ([other[si]] if other else [])
        view["series"].append({"label": sr["label"], "unit": sr["unit"], "values": vals,
                               "labels": [fmt(v, sr["unit"]) for v in vals], "tip": sr["tip"]})
    if t in ("bar", "column", "groupedBar", "donut") and any(is_num(v) and v < 0 for s_ in view["series"] for v in s_["values"]):
        raise LayoutError("%s: negative values cannot be drawn as %s — use a line chart or a table" % (what, t))
    if not model.active() and not any(is_num(v) for s_ in view["series"] for v in s_["values"]):
        raise LayoutError("%s: the chart has no values — check 'x', 'y' and 'where'" % what)
    if t == "donut":
        tot = sum(v for v in sers[0]["map"].values() if is_num(v)) if _additive_series(model, ds, series[0], spec) else \
            sum(v for v in view["series"][0]["values"] if is_num(v))
        view["shares"] = [("%.0f%%" % (v / tot * 100)) if tot and is_num(v) else "" for v in view["series"][0]["values"]]
    return view


def _additive_series(model, ds, s, spec):
    if s.get("agg", spec.get("agg", "sum")) != "sum" or not s.get("y"):
        return False
    return model.additive(s.get("dataset", ds), s["y"])


def _tip(m):
    if m in METRICS:
        lab, _, add, _, jar, dfn = METRICS[m]
        return dfn + (" Also called: %s." % ", ".join(jar) if jar else "")
    return ""


_PH = re.compile(r"\{(kpi|top|first|last)\.([\w-]+)(?:\.(\w+))?\}")


def fill(text, kpis, sections, what):
    if not text:
        return text

    def rep(m):
        kind, key, attr = m.groups()
        if kind == "kpi":
            k = kpis.get(key)
            if not k:
                raise LayoutError("%s: {kpi.%s} — no KPI with that id" % (what, key))
            if attr in (None, "value"):
                return k["display"]
            if attr == "delta":
                if not k.get("delta"):
                    raise LayoutError("%s: {kpi.%s.delta} — that KPI has no comparison" % (what, key))
                return k["delta"]["display"]
            if attr == "compare":
                if not k.get("compare"):
                    raise LayoutError("%s: {kpi.%s.compare} — that KPI has no comparison" % (what, key))
                return k["compare"]["display"]
        if kind in ("top", "first", "last"):
            s = sections.get(key)
            if not s or not s.get("categories"):
                raise LayoutError("%s: {%s.%s} — needs section '%s' with a line, column, bar, groupedBar or donut chart "
                                  "(not a table or funnel)" % (what, kind, key, key))
            i = -1 if kind == "last" else 0
            if kind == "last":   # last point that has a value
                vals = s["series"][0]["values"]
                i = max([j for j, v in enumerate(vals) if v is not None] or [len(vals) - 1])
            if (kind == "top" and attr in (None, "label")) or (kind != "top" and attr == "label"):
                return s.get("full", s["categories"])[i]
            if (kind == "top" and attr == "value") or (kind != "top" and attr in (None, "value")):
                return s["series"][0]["labels"][i]
        raise LayoutError("%s: unknown placeholder %s" % (what, m.group(0)))
    return _PH.sub(rep, text)


def kpi_view(model, k, track):
    kid = k.get("id") or "?"
    what = "KPI '%s'" % kid
    if "value" not in k:
        raise LayoutError("%s: 'value' is missing" % what)
    v = model.value(k["value"], what, track)
    m = k.get("metric") or (model.metric(k["value"]["dataset"], k["value"]["column"]) if k["value"].get("column") and k["value"].get("dataset") else None)
    unit = k.get("unit") or (METRICS[m][1] if m in METRICS else model.unit_of(k["value"]))
    good = k.get("good") or (METRICS[m][3] if m in METRICS else "up")
    label = k.get("label") or (METRICS[m][0] if m in METRICS else None)
    if not label:
        raise LayoutError("%s: give a 'label' or a catalogue 'metric'" % what)
    out = {"id": kid, "label": label, "value": v, "display": fmt(v, unit), "unit": unit,
           "meaning": k.get("meaning") or "", "tip": k.get("definition") or _tip(m), "compare": None, "delta": None}
    c = k.get("compare")
    if not c or "type" not in c:
        raise LayoutError("%s: add 'compare' — {\"type\": \"prior\"|\"target\"|\"median\", \"value\": REF} "
                          "or {\"type\": \"none\", \"reason\": \"…\"}. A number without comparison cannot be judged." % what)
    if c["type"] == "none":
        if not c.get("reason"):
            raise LayoutError("%s: compare type 'none' needs a 'reason' (e.g. \"no prior period in the data\")" % what)
        out["note"] = c["reason"]
    elif c["type"] in ("prior", "target", "median"):
        if "value" not in c:
            raise LayoutError("%s: compare '%s' needs a 'value' reference to the %s figure in data.json" % (what, c["type"], c["type"]))
        cv = model.value(c["value"], what + " comparison", track)
        if cv is None and not model.active():
            raise LayoutError("%s: the comparison value is empty — check the reference or use type 'none' with a reason" % what)
        lab = c.get("label") or {"prior": "vs prior period", "target": "vs target", "median": "vs median"}[c["type"]]
        if cv is None:
            out["note"] = "No comparison for this selection"
        else:
            out["compare"] = {"type": c["type"], "label": lab, "value": cv, "display": fmt(cv, unit)}
        if v is not None and cv is not None:
            if unit == "percent":
                d = (v - cv) * 100
                txt = ("%+.2f pp" if abs(d) < 1 and max(abs(v), abs(cv)) < 0.01 else "%+.1f pp") % d
            elif cv:
                d = (v / cv - 1) * 100
                txt = "%+.1f%%" % d
            else:
                d, txt = 0, "n/a"
            direction = "up" if d > 0.05 else "down" if d < -0.05 else "flat"
            tone = "neutral" if good == "neutral" or direction == "flat" else ("good" if (direction == "up") == (good == "up") else "bad")
            out["delta"] = {"display": txt.replace("-", "−") + " " + lab, "dir": direction, "tone": tone}
    else:
        raise LayoutError("%s: compare type must be prior, target, median or none" % what)
    if "~mixed" in track:
        out["note"] = "Not available for this selection: its two parts are filtered differently"
    sp = k.get("spark")
    if sp:
        if not sp.get("x"):
            raise LayoutError("%s: 'spark' needs 'x' (the time column)" % what)
        agg = {"column": sp.get("y"), "agg": sp.get("agg", "sum"), "num": sp.get("num"), "den": sp.get("den"), "weight": sp.get("weight")}
        sds = sp.get("dataset") or k["value"].get("dataset") or (k["value"].get("num") or {}).get("dataset")
        g = model.groups(sds, sp["x"], agg, sp.get("where"), what + " sparkline", sp.get("bucket"), track)
        out["spark"] = [v for _, v, _n in sorted(g, key=lambda kv: (0, kv[0], "") if is_num(kv[0]) else (1, 0, str(kv[0])))]
    return out


def compute_view(model, layout):
    kp = layout.get("kpis") or []
    secs = layout.get("sections") or []
    kpis, kmap = [], {}
    for k in kp:
        tr = set()
        kv = kpi_view(model, k, tr)
        kv["filtered"] = bool(tr - {"~mixed"}) or not model.filters
        kpis.append(kv)
        kmap[kv["id"]] = kv
    sections, smap = [], {}
    for i, s in enumerate(secs):
        sid = s.get("id") or "s%d" % (i + 1)
        if "chart" not in s:
            raise LayoutError("section '%s': 'chart' is missing" % sid)
        tr = set()
        cv = chart_view(model, s["chart"], "section '%s'" % sid, tr)
        more = []
        for j, mb in enumerate(s.get("more") or []):
            if "chart" not in mb:
                raise LayoutError("section '%s' more #%d: 'chart' is missing" % (sid, j + 1))
            mv = chart_view(model, mb["chart"], "section '%s' more #%d" % (sid, j + 1), tr)
            more.append({"title": mb.get("title", ""), "subtitle": mb.get("subtitle", ""), "chart": mv})
        sv = {"id": sid, "question": s.get("question", ""), "title": s.get("title", ""), "subtitle": s.get("subtitle", ""),
              "note": s.get("note", ""), "chart": cv, "more": more, "filtered": bool(tr) or not model.filters}
        sections.append(sv)
        smap[sid] = cv
    summary = [fill(x, kmap, smap, "summary line %d" % (i + 1)) for i, x in enumerate(layout.get("summary") or [])]
    for kv in kpis:
        kv["meaning"] = fill(kv["meaning"], kmap, smap, "KPI '%s' meaning" % kv["id"])
    for sv in sections:
        for f in ("title", "subtitle", "note"):
            sv[f] = fill(sv[f], kmap, smap, "section '%s' %s" % (sv["id"], f))
        for mb in sv["more"]:
            mb["title"] = fill(mb["title"], kmap, smap, "section '%s' more title" % sv["id"])
            mb["subtitle"] = fill(mb["subtitle"], kmap, smap, "section '%s' more subtitle" % sv["id"])
    return {"summary": summary, "kpis": kpis, "sections": sections}


MAX_VIEWS = 400


def compute_all(data, layout):
    """All views: '' for no filter, 'a|b' for filter values. Returns (views, filters_meta)."""
    model = Model(data)
    filters = layout.get("filters") or []
    if len(filters) > 3:
        raise LayoutError("at most 3 filters (period plus two dimensions); the layout has %d" % len(filters))
    fmeta = []
    for f in filters:
        col = f.get("column")
        dsets = f.get("datasets") or [n for n, d in model.ds.items() if col in d["meta"]]
        if not dsets:
            raise LayoutError("filter '%s': no dataset has that column" % col)
        for n in dsets:
            model.col(n, col)
            if model.ds[n]["grain"] != "record":
                raise LayoutError("filter '%s' on dataset '%s': filters only work on record-grain data (one row per item). "
                                  "This dataset is pre-aggregated — show fixed views instead and say so in 'method'" % (col, n))
        vals = sorted({str(r[col]) for n in dsets for r in model.ds[n]["rows"] if r.get(col) not in (None, "")})
        fmeta.append({"column": col, "label": f.get("label") or col, "values": vals, "datasets": dsets,
                      "display": [fmt_month(v) for v in vals]})
    combos = [[]]
    for f in fmeta:
        combos = [c + [v] for c in combos for v in [""] + f["values"]]
    if len(combos) > MAX_VIEWS:
        raise LayoutError("filters produce %d combinations (limit %d): drop a filter or pick columns with fewer values" % (len(combos), MAX_VIEWS))
    views = {}
    for combo in combos:
        model.filters = {f["column"]: (v, set(f["datasets"])) for f, v in zip(fmeta, combo)}
        views["|".join(combo)] = compute_view(model, layout)
    model.filters = {}
    return views, fmeta


# ============================================================== page

PALETTE = {"#FFFFFF", "#000000", "#E60000", "#8A000A", "#CCCABC", "#B8B3A2", "#8E8D83", "#7A7870", "#5A5D5C",
           "#404040", "#BD000C", "#620004", "#B98E2C", "#946F29", "#6C5312", "#F7F7F5", "#ECEBE4", "#F5F0E1",
           "#F8F7F2", "#6F7A1A", "#E4A911", "#0C7EC6", "#07476F", "#FFF", "#000"}

CSS = r"""
:root{--red:#E60000;--bordeaux:#8A000A;--black:#000000;--white:#FFFFFF;--g1:#CCCABC;--g3:#8E8D83;--g4:#7A7870;
--g5:#5A5D5C;--g6:#404040;--bronze:#B98E2C;--bronze2:#946F29;--bg:#F7F7F5;--p1:#ECEBE4;--p2:#F5F0E1;
--ok:#6F7A1A;--bad:#BD000C;--link:#0C7EC6;
--font:"Frutiger 45 Light","Frutiger","Helvetica Neue",Helvetica,Arial,"Segoe UI",sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--black);font-family:var(--font);font-size:14px;line-height:1.45}
.wrap{max-width:1360px;margin:0 auto;padding:24px 32px 48px}
header.top{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;
  border-bottom:1px solid var(--black);padding-bottom:12px;margin-bottom:16px}
h1{font-size:26px;font-weight:300;margin:0 0 4px}
.sub{color:var(--g4);font-size:13px}
.filters{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end}
.filters label{display:flex;flex-direction:column;font-size:12px;color:var(--g5);gap:3px}
.filters select{font:inherit;font-size:13px;padding:4px 8px;border:1px solid var(--g1);background:var(--white);color:var(--black);border-radius:0;min-width:150px}
.filters select:focus{outline:2px solid var(--g6);outline-offset:1px}
.summary{margin:0 0 14px;padding:0;list-style:none;font-size:16px;line-height:1.5;max-width:1000px}
.summary li{margin:0 0 3px;padding-left:14px;position:relative}
.summary li:before{content:"";position:absolute;left:0;top:.62em;width:6px;height:6px;background:var(--g6)}
.kpinote{font-size:12px;color:var(--g4);margin:-8px 0 14px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px;margin:0 0 16px}
.kpi{background:var(--white);border:1px solid var(--p1);border-top:3px solid var(--g1);padding:12px 14px 10px;min-height:128px;position:relative}
.kpi:first-child{border-top-color:var(--red)}
.k-l{font-size:13px;color:var(--g5)}
.k-v{font-size:30px;font-weight:300;margin:2px 0 2px;letter-spacing:-.01em}
.k-d{font-size:12.5px;color:var(--g5)}
.k-d .arr{font-size:11px;margin-right:3px}
.good{color:var(--ok)}.bad{color:var(--bad)}.neutral{color:var(--g4)}
.k-m{font-size:12px;color:var(--g4);margin-top:4px}
.k-s{position:absolute;right:12px;top:14px;width:84px;height:26px}
.tip{cursor:help;color:var(--g4);font-size:11px;margin-left:3px;border-bottom:1px dotted var(--g3)}
.sections{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(520px,100%),1fr));gap:12px}
.card:last-child:nth-child(odd){grid-column:1/-1}
.card svg{max-width:760px;display:block}
.tw{overflow-x:auto}
.card{background:var(--white);border:1px solid var(--p1);padding:14px 16px 12px;min-width:0}
.q{font-size:12px;color:var(--g4);margin-bottom:2px}
.card h2{font-size:17px;font-weight:600;margin:0 0 2px}
.card .sub{margin-bottom:10px}
.note{background:var(--p2);border-left:3px solid var(--bronze2);padding:6px 10px;font-size:12.5px;margin-top:10px}
details{margin-top:10px;border-top:1px solid var(--p1);padding-top:8px}
summary{cursor:pointer;color:var(--link);font-size:13px}
summary:focus{outline:2px solid var(--g6);outline-offset:2px}
.more h3{font-size:14px;font-weight:600;margin:14px 0 2px}
.nf{font-size:11px;color:var(--g4);margin-left:6px}
table.t{border-collapse:collapse;width:100%;font-size:12.5px}
table.t th{text-align:left;font-weight:600;border-top:1px solid var(--black);border-bottom:1px solid var(--black);padding:5px 8px}
table.t td{padding:4px 8px;border-bottom:1px solid var(--p1)}
table.t .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.cb{display:inline-block;height:9px;background:var(--g3);vertical-align:middle;margin-right:6px}
.tcount{font-size:12px;color:var(--g4);margin-top:4px}
.legend{display:flex;gap:14px;font-size:12px;color:var(--g5);margin:0 0 4px}
.legend i{display:inline-block;width:10px;height:10px;margin-right:5px;vertical-align:-1px}
svg text{font-family:var(--font)}
.method{margin-top:16px;background:var(--white);border:1px solid var(--p1);padding:10px 16px}
.method ul{margin:6px 0 4px;padding-left:18px;color:var(--g5);font-size:12.5px}
footer{margin-top:14px;color:var(--g4);font-size:12px}
#rd-status{display:none}
@media (max-width:640px){.wrap{padding:16px}.sections{grid-template-columns:1fr}.k-s{display:none}}
@media print{body{background:var(--white)}.filters{display:none}details{display:block}}
"""

JS = r"""
(function(){
var J=function(id){return JSON.parse(document.getElementById(id).textContent)};
var st=document.getElementById('rd-status');
try{
var L=J('rd-layout'),V=J('rd-views'),F=J('rd-filters');
var C={g6:'#404040',b1:'#B98E2C',g3:'#8E8D83',g1:'#CCCABC',g4:'#7A7870',g5:'#5A5D5C',p1:'#ECEBE4',black:'#000000',white:'#FFFFFF'};
var SER=[C.g6,C.b1,C.g3,C.g1],DONUT=['#404040','#B98E2C','#8E8D83','#CCCABC','#5A5D5C'];
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function T(x,y,s,o){o=o||{};return '<text x="'+x+'" y="'+y+'" font-size="'+(o.size||11)+'" fill="'+(o.fill||C.g5)+'"'+(o.anchor?' text-anchor="'+o.anchor+'"':'')+(o.weight?' font-weight="'+o.weight+'"':'')+'>'+esc(s)+'</text>'}
function box(w,h,b,label){return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="'+esc(label||'chart')+'">'+b+'</svg>'}
function mx(a){var m=0;a.forEach(function(v){if(v!=null&&v>m)m=v});return m||1}
function short(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+'…':s}
function legend(ch){if(ch.series.length<2)return '';return '<div class="legend">'+ch.series.map(function(s,i){return '<span><i style="background:'+SER[i]+'"></i>'+esc(s.label)+'</span>'}).join('')+'</div>'}
function bar(ch){var s=ch.series[0],n=ch.categories.length,rh=24,lw=Math.min(230,8+6.3*Math.max.apply(null,ch.categories.map(function(c){return String(c).length}))),w=640,bw=w-lw-70,m=mx(s.values),b='';
  ch.categories.forEach(function(c,i){var v=s.values[i],y=i*rh+4,len=v==null?0:Math.max(1,v/m*bw);
    b+=T(lw-8,y+15,short(c,34),{anchor:'end',fill:C.black})+'<rect x="'+lw+'" y="'+(y+3)+'" width="'+len.toFixed(1)+'" height="'+(rh-8)+'" fill="'+C.g6+'"><title>'+esc(c+': '+s.labels[i])+'</title></rect>'+T(lw+len+5,y+15,s.labels[i],{fill:C.black})});
  b+='<line x1="'+lw+'" x2="'+lw+'" y1="2" y2="'+(n*rh+4)+'" stroke="'+C.black+'" stroke-width="1"/>';
  return box(w,n*rh+8,b,s.label)}
function columns(ch){var n=ch.categories.length,k=ch.series.length,w=640,h=230,top=18,bot=36,pl=6,pw=w-pl*2,gw=pw/n,bw=Math.min(46,gw*0.72/k),m=mx([].concat.apply([],ch.series.map(function(s){return s.values}))),b='',step=Math.ceil(n/14);
  ch.categories.forEach(function(c,i){var x0=pl+i*gw+(gw-bw*k)/2;
    ch.series.forEach(function(s,j){var v=s.values[i],hh=v==null?0:(v/m)*(h-top-bot),x=x0+j*bw;
      b+='<rect x="'+x.toFixed(1)+'" y="'+(h-bot-hh).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="'+SER[j]+'"><title>'+esc(c+' – '+s.label+': '+s.labels[i])+'</title></rect>';
      if(n*k<=16)b+=T(x+bw/2-1,h-bot-hh-4,s.labels[i],{anchor:'middle',size:10,fill:C.black})});
    if(i%step===0)b+=T(pl+i*gw+gw/2,h-bot+15,short(c,12),{anchor:'middle',size:10.5})});
  b+='<line x1="'+pl+'" x2="'+(w-pl)+'" y1="'+(h-bot)+'" y2="'+(h-bot)+'" stroke="'+C.black+'" stroke-width="1"/>';
  return legend(ch)+box(w,h,b,ch.series[0].label)}
function line(ch){var n=ch.categories.length,w=640,h=230,top=16,bot=34,pl=44,pr=64,all=[].concat.apply([],ch.series.map(function(s){return s.values})).filter(function(v){return v!=null}),
  lo=Math.min.apply(null,all),hi=Math.max.apply(null,all);if(ch.zero!==false&&lo>0)lo=0;if(hi===lo){hi=lo+1}
  var X=function(i){return pl+(n<2?0:i*(w-pl-pr)/(n-1))},Y=function(v){return top+(1-(v-lo)/(hi-lo))*(h-top-bot)},b='',step=Math.ceil(n/12);
  var lab=function(v){for(var j=0;j<ch.series.length;j++){var ix=ch.series[j].values.indexOf(v);if(ix>=0)return ch.series[j].labels[ix]}return ''};
  b+=T(pl-6,Y(hi)+4,lab(hi),{anchor:'end',size:10,fill:C.g4});if(lo!==0)b+=T(pl-6,Y(lo)+4,lab(lo),{anchor:'end',size:10,fill:C.g4});else b+=T(pl-6,Y(0)+4,'0',{anchor:'end',size:10,fill:C.g4});
  ch.series.forEach(function(s,j){var d='',last=-1;s.values.forEach(function(v,i){if(v==null)return;d+=(d?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1);last=i});
    b+='<path d="'+d+'" fill="none" stroke="'+SER[j]+'" stroke-width="2"/>';
    s.values.forEach(function(v,i){if(v!=null)b+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="'+SER[j]+'"><title>'+esc(ch.categories[i]+' – '+s.label+': '+s.labels[i])+'</title></circle>'});
    if(last>=0)b+=T(X(last)+7,Y(s.values[last])+4,s.labels[last],{fill:SER[j],weight:600})});
  ch.categories.forEach(function(c,i){if(i%step===0||i===n-1)b+=T(X(i),h-bot+15,short(c,10),{anchor:'middle',size:10.5})});
  b+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+(h-bot)+'" y2="'+(h-bot)+'" stroke="'+C.black+'" stroke-width="1"/>';
  return legend(ch)+box(w,h,b,ch.series[0].label)}
function donut(ch){var s=ch.series[0],tot=0;s.values.forEach(function(v){tot+=v||0});var cx=110,cy=110,r=92,ri=59,a=-Math.PI/2,b='';
  s.values.forEach(function(v,i){if(!v)return;var a2=a+v/tot*Math.PI*2,lg=(a2-a)>Math.PI?1:0,p=function(rr,ang){return (cx+rr*Math.cos(ang)).toFixed(2)+','+(cy+rr*Math.sin(ang)).toFixed(2)};
    b+='<path d="M'+p(r,a)+' A'+r+','+r+' 0 '+lg+' 1 '+p(r,a2)+' L'+p(ri,a2)+' A'+ri+','+ri+' 0 '+lg+' 0 '+p(ri,a)+' Z" fill="'+DONUT[i%5]+'" stroke="'+C.white+'" stroke-width="2"><title>'+esc(ch.categories[i]+': '+s.labels[i]+' ('+ch.shares[i]+')')+'</title></path>';a=a2});
  ch.categories.forEach(function(c,i){var y=40+i*30;b+='<rect x="250" y="'+(y-10)+'" width="11" height="11" fill="'+DONUT[i%5]+'"/>'+T(268,y,short(c,30),{fill:C.black,size:12})+T(630,y,s.labels[i]+'  ·  '+ch.shares[i],{anchor:'end',size:12,fill:C.g5})});
  return box(640,Math.max(220,ch.categories.length*30+40),b,s.label)}
function funnel(ch){var w=640,rh=34,m=mx(ch.steps.map(function(s){return s.value})),b='';
  ch.steps.forEach(function(s,i){var len=s.value==null?0:Math.max(2,s.value/m*(w-260)),y=i*rh;
    b+=T(0,y+21,s.label,{fill:C.black,size:12})+'<rect x="150" y="'+(y+6)+'" width="'+len.toFixed(1)+'" height="'+(rh-12)+'" fill="'+(i?C.g3:C.g6)+'"/>'+T(150+len+6,y+21,s.display+(i?'  ·  '+s.share:''),{fill:C.black,size:12})});
  return box(w,ch.steps.length*rh+4,b,'funnel')}
function table(ch){var mxs=ch.columns.map(function(c,j){return c.bar?mx(ch.bars.map(function(r){return r[j]})):0});
  var h='<table class="t"><thead><tr>'+ch.columns.map(function(c){return '<th'+(c.num?' class="n"':'')+(c.tip?' title="'+esc(c.tip)+'"':'')+'>'+esc(c.label)+'</th>'}).join('')+'</tr></thead><tbody>';
  ch.rows.forEach(function(r,i){h+='<tr>'+r.map(function(v,j){var c=ch.columns[j],bb='';if(c.bar&&ch.bars[i][j]!=null)bb='<span class="cb" style="width:'+Math.max(1,ch.bars[i][j]/mxs[j]*70).toFixed(0)+'px"></span>';
    return '<td'+(c.num?' class="n"':'')+'>'+bb+esc(v)+'</td>'}).join('')+'</tr>'});
  h='<div class="tw">'+h+'</tbody></table></div>';if(ch.total>ch.shown)h+='<div class="tcount">Top '+ch.shown+' of '+ch.total+'</div>';return h}
function nodata(ch){if(ch.type==='table')return !ch.rows.length;if(ch.type==='funnel')return !ch.steps.some(function(s){return s.value!=null});
  return !ch.categories.length||!ch.series.some(function(s){return s.values.some(function(v){return v!=null})})}
function chart(ch){if(nodata(ch))return '<div class="tcount">No data for this selection.</div>';return ({bar:bar,column:columns,groupedBar:columns,line:line,donut:donut,funnel:funnel,table:table})[ch.type](ch)+(ch.partial?'<div class="tcount">'+esc(ch.partial)+'</div>':'')}
function spark(v){v=(v||[]).filter(function(x){return x!=null});if(v.length<2)return '';var lo=Math.min.apply(null,v),hi=Math.max.apply(null,v);if(hi===lo)hi=lo+1;
  var d=v.map(function(x,i){return (i?'L':'M')+(i*84/(v.length-1)).toFixed(1)+','+(24-(x-lo)/(hi-lo)*22).toFixed(1)}).join('');
  return '<svg class="k-s" viewBox="0 0 84 26" aria-hidden="true"><path d="'+d+'" fill="none" stroke="'+C.g3+'" stroke-width="1.5"/></svg>'}
var ARR={up:'▲',down:'▼',flat:'▶'};
function render(key){var v=V[key];if(!v)throw new Error('no view for '+key);var nf=key.replace(/\|/g,'')!=='';
  document.getElementById('summary').innerHTML=(v.summary||[]).map(function(x){return '<li>'+esc(x)+'</li>'}).join('');
  var notes=v.kpis.filter(function(k){return !k.delta}).map(function(k){return k.note||''}),same=notes.length>1&&notes.every(function(x){return x===notes[0]});
  document.getElementById('kpinote').textContent=same?notes[0]:'';
  document.getElementById('kpis').innerHTML=v.kpis.map(function(k){
    return '<div class="kpi">'+spark(k.spark)+'<div class="k-l">'+esc(k.label)+(k.tip?'<span class="tip" title="'+esc(k.tip)+'">?</span>':'')+(nf&&!k.filtered?'<span class="nf">not filtered</span>':'')+'</div>'+
    '<div class="k-v">'+esc(k.display)+'</div>'+
    (k.delta?'<div class="k-d"><span class="arr '+k.delta.tone+'">'+ARR[k.delta.dir]+'</span>'+esc(k.delta.display)+(k.compare.type==='target'?' ('+esc(k.compare.display)+')':'')+'</div>':'<div class="k-d neutral">'+(same?'':esc(k.note||''))+'</div>')+
    (k.meaning?'<div class="k-m">'+esc(k.meaning)+'</div>':'')+'</div>'}).join('');
  document.getElementById('sections').innerHTML=v.sections.map(function(s){
    var more=s.more.length?'<details><summary>More detail</summary><div class="more">'+s.more.map(function(m){return '<h3>'+esc(m.title)+'</h3>'+(m.subtitle?'<div class="sub">'+esc(m.subtitle)+'</div>':'')+chart(m.chart)}).join('')+'</div></details>':'';
    return '<section class="card" id="sec-'+esc(s.id)+'"><div class="q">'+esc(s.question.charAt(0).toUpperCase()+s.question.slice(1))+(nf&&!s.filtered?'<span class="nf">not filtered</span>':'')+'</div><h2>'+esc(s.title)+'</h2>'+(s.subtitle?'<div class="sub">'+esc(s.subtitle)+'</div>':'')+chart(s.chart)+(s.note?'<div class="note">'+esc(s.note)+'</div>':'')+more+'</section>'}).join('');
}
var sel=[];
if(F.length){document.getElementById('filters').innerHTML=F.map(function(f,i){return '<label>'+esc(f.label)+'<select data-i="'+i+'"><option value="">All</option>'+f.values.map(function(v,j){return '<option value="'+esc(v)+'">'+esc(f.display[j])+'</option>'}).join('')+'</select></label>'}).join('');
  sel=[].slice.call(document.querySelectorAll('#filters select'));sel.forEach(function(s){s.addEventListener('change',function(){render(sel.map(function(x){return x.value}).join('|'))})})}
render(F.map(function(){return ''}).join('|'));
st.setAttribute('data-status','ok');st.textContent='ok';
}catch(e){st.setAttribute('data-status','error');st.textContent=String(e&&e.message||e);st.style.display='block';throw e}
})();
"""

PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>@@TITLE@@</title>
<meta name="generator" content="dash_redesign.py">
<style>@@CSS@@</style></head>
<body><div class="wrap">
<header class="top"><div><h1>@@TITLE@@</h1><div class="sub">@@SUBTITLE@@</div></div><div class="filters" id="filters"></div></header>
<ul class="summary" id="summary"></ul>
<div class="kpis" id="kpis"></div>
<div class="kpinote" id="kpinote"></div>
<div class="sections" id="sections"></div>
<details class="method"><summary>About these figures</summary><ul>@@METHOD@@</ul></details>
<footer>@@FOOTER@@</footer>
<div id="rd-status" data-status="pending">pending</div>
</div>
<script type="application/json" id="rd-data">@@DATA@@</script>
<script type="application/json" id="rd-layout">@@LAYOUT@@</script>
<script type="application/json" id="rd-filters">@@FILTERS@@</script>
<script type="application/json" id="rd-views">@@VIEWS@@</script>
<script>@@JS@@</script>
</body></html>
"""


def _json_script(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("<!--", "<\\!--")


def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def method_lines(model, layout, fmeta):
    lines = list(layout.get("method") or [])
    used = set()
    for k in layout.get("kpis") or []:
        ref = k.get("value") or {}
        m = k.get("metric") or (model.metric(ref["dataset"], ref["column"]) if ref.get("dataset") and ref.get("column") else None)
        if k.get("definition"):
            lines.append("%s: %s" % (k.get("label") or (METRICS[m][0] if m in METRICS else k.get("id")), k["definition"]))
        elif m in METRICS and m not in used:
            used.add(m)
            lines.append("%s: %s" % (k.get("label") or METRICS[m][0], METRICS[m][5]))
    lines.append("Changes (▲ ▼) compare with the figure named next to them. Green means better, red means worse "
                 "for that measure; grey means no change or no direction.")
    if fmeta:
        lines.append("Filters apply to %s. Items marked “not filtered” always show all data." %
                     ", ".join(sorted({f["label"] for f in fmeta})))
    else:
        lines.append("This page has no filters: the source data is pre-aggregated or small enough to show in full.")
    lines.append("Every figure is computed from the data embedded in this page; nothing is typed in by hand.")
    return lines


def git_guard(out):
    """Refuse to write real data into a Git working tree unless the target is git-ignored."""
    d = Path(out).resolve().parent
    for p in [d] + list(d.parents):
        if (p / ".git").exists():
            if shutil.which("git"):
                r = subprocess.run(["git", "-C", str(p), "check-ignore", "-q", str(Path(out).resolve())], capture_output=True)
                if r.returncode == 0:
                    return None
            return ("%s is inside the Git repository %s and not git-ignored. The page embeds the dashboard's data: "
                    "write it where the original dashboard lives, outside any repository" % (out, p))
    return None


def render_page(data, layout, built):
    """The complete page for this data and layout. build writes it; check rebuilds it and compares."""
    views, fmeta = compute_all(data, layout)
    model = Model(data)
    meta = data.get("meta") or {}
    title = layout.get("title") or meta.get("title") or "Dashboard"
    bits = []
    per = meta.get("period") or {}
    if per.get("from") or per.get("to"):
        bits.append("%s – %s" % (fmt_date(per.get("from")), fmt_date(per.get("to"))))
    if meta.get("source"):
        bits.append("Source: %s" % meta["source"])
    if meta.get("asOf"):
        bits.append("Data as of %s" % fmt_date(meta["asOf"]))
    subtitle = layout.get("subtitle") or " · ".join(bits)
    footer = " · ".join(x for x in ["Redesigned from %s" % meta["original"] if meta.get("original") else "", "built %s" % built] if x)
    parts = {"CSS": CSS, "JS": JS, "DATA": _json_script(data), "LAYOUT": _json_script(layout), "FILTERS": _json_script(fmeta),
             "VIEWS": _json_script(views), "METHOD": "".join("<li>%s</li>" % _esc(x) for x in method_lines(model, layout, fmeta)),
             "TITLE": _esc(title), "SUBTITLE": _esc(subtitle), "FOOTER": _esc(footer)}
    return re.sub(r"@@([A-Z]+)@@", lambda m: parts[m.group(1)], PAGE), views, fmeta


def build(data_path, layout_path, out_path):
    data = json.loads(Path(data_path).read_text(encoding="utf-8"))
    layout = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    err = git_guard(out_path)
    if err:
        raise LayoutError(err)
    html, views, _ = render_page(data, layout, dt.date.today().isoformat())
    out = Path(out_path)
    out.write_text(html, encoding="utf-8")
    notes = out.with_name(out.stem.replace("-redesigned", "") + "-changes.md")
    notes.write_text(changes_md(data, layout, out.name, (data.get("meta") or {}).get("original")), encoding="utf-8")
    return out, notes, views


def fmt_date(s):
    if not s:
        return "?"
    try:
        return dt.date.fromisoformat(str(s)[:10]).strftime("%-d %b %Y") if sys.platform != "win32" else dt.date.fromisoformat(str(s)[:10]).strftime("%d %b %Y")
    except ValueError:
        return fmt_month(s)


def changes_md(data, layout, page, original):
    L = ["# Redesign notes: %s" % (layout.get("title") or (data.get("meta") or {}).get("title") or page), "",
         "Original: `%s` · Redesigned: `%s` · %s" % (original or "?", page, dt.date.today().isoformat()), ""]
    if layout.get("audience"):
        L += ["Audience: %s" % layout["audience"], ""]
    if layout.get("questions"):
        L += ["## Questions the page answers", ""] + ["%d. %s" % (i + 1, q) for i, q in enumerate(layout["questions"])] + [""]
    L += ["## What changed", ""]
    L += ["- **%s** → %s. %s" % (c.get("was", "?"), c.get("now", "?"), c.get("why", "")) for c in layout.get("changes") or []] or ["- (none listed)"]
    L += ["", "## Left out", ""]
    L += ["- %s — %s" % (d.get("element", "?"), d.get("reason", "")) for d in layout.get("dropped") or []] or ["- Nothing: every dataset of the original is still shown or one click away."]
    L += ["", "## Data", "", "| Dataset | From the original | Rows | Change to the data |", "|---|---|---|---|"]
    for name, d in (data.get("datasets") or {}).items():
        L.append("| %s | %s | %d | %s |" % (name, d.get("origin", "?"), len(d.get("rows") or []), d.get("transform") or "none"))
    kept = {d.get("inventory_id") for d in (data.get("datasets") or {}).values()}
    unused = [d for d in ((data.get("meta") or {}).get("inventory") or []) if d["id"] not in kept]
    if unused:
        L += ["", "## Data in the original that the new page does not use", ""]
        L += ["- `%s` (%s, %d rows)%s" % (d["id"], d["origin"], d["rows"],
              next((" — " + x.get("reason", "") for x in layout.get("dropped") or [] if d["id"] in str(x.get("element", ""))), ""))
              for d in unused]
    if layout.get("assumptions"):
        L += ["", "## Assumptions confirmed at the checkpoint", ""] + ["- %s" % a for a in layout["assumptions"]]
    return "\n".join(L) + "\n"


# ============================================================== init


def init_data(inv):
    ds = {}
    for d in inv["datasets"]:
        cols = []
        for c in d["columns"]:
            col = {"key": c["key"], "type": c["type"]}
            if c["type"] == "number":
                m = guess_metric(c["key"], d["id"] + " " + d["name"])
                col["metric"] = m
                i = d["columns"].index(c)
                vals = [r[i] for r in d["rows"] if is_num(r[i])]
                if m in METRICS and METRICS[m][1] == "percent" and vals and 1.5 < max(vals) <= 100:
                    col["scale"] = 0.01          # stored as 0-100; the page shows it as a percentage
                if not m and vals and all(0 <= x <= 1 for x in vals) and any(x != int(x) for x in vals):
                    col["unit"], col["additive"] = "percent", False    # stored rates: never summed
                if not m and c["key"].lower() in ("m", "month", "mon", "monat") and vals and all(x == int(x) and 1 <= x <= 12 for x in vals):
                    col["type"] = "month"
            cols.append(col)
        ds[d["id"]] = {"inventory_id": d["id"], "origin": d["origin"], "grain": d["grain"], "columns": cols,
                       "rows": d["rows"], "transform": None}
    found = inv.get("as_of_found") or []
    return {"meta": {"title": inv["title"], "original": inv["file"], "source": "", "asOf": found[0] if len(found) == 1 else None,
                     "period": {"from": None, "to": None},
                     "inventory": [{"id": d["id"], "origin": d["origin"], "rows": d["n_rows"]} for d in inv["datasets"]]},
            "datasets": ds}


# ============================================================== check

_ID_SCRIPT = re.compile(r'<script type="application/json" id="(rd-[a-z]+)">(.*?)</script>', re.S)


def _find_chrome():
    import os
    if os.environ.get("CHROME") and Path(os.environ["CHROME"]).exists():
        return os.environ["CHROME"]
    for p in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
              "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"):
        if Path(p).exists():
            return p
    for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge", "microsoft-edge"):
        if shutil.which(n):
            return shutil.which(n)
    return None


def _chrome(chrome, args, wait_file, timeout=60):
    """Run headless Chrome and stop it once the result is there (Chrome may not exit on its own)."""
    import time
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "stdout.html"
        cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
               "--user-data-dir=" + str(Path(tmp) / "profile"), "--virtual-time-budget=3000"] + args
        with open(out, "wb") as fh:
            proc = subprocess.Popen(cmd, stdout=fh, stderr=subprocess.DEVNULL)
            t0, last = time.time(), -1
            while time.time() - t0 < timeout:
                time.sleep(0.5)
                if proc.poll() is not None:
                    break
                if wait_file is None and b"</html>" in out.read_bytes()[-200:]:
                    break
                if wait_file is not None and Path(wait_file).exists():
                    size = Path(wait_file).stat().st_size
                    if size and size == last:
                        break
                    last = size
            if proc.poll() is None:
                proc.kill()
                proc.wait()
        text = out.read_text(encoding="utf-8", errors="replace")
        return text if wait_file is None and "</html>" in text else ("" if wait_file else None)


def _first_diff(a, b, path="view"):
    if type(a) != type(b):
        return path
    if isinstance(a, dict):
        for k in set(a) | set(b):
            if k not in a or k not in b:
                return "%s.%s" % (path, k)
            d = _first_diff(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return path + " (length)"
        for i, (x, y) in enumerate(zip(a, b)):
            d = _first_diff(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    if isinstance(a, float) and isinstance(b, float):
        return None if abs(a - b) <= 1e-9 * max(1, abs(a)) else path
    return None if a == b else path


def check(html_path, inventory_path=None, forbid=None, render=True, shot_dir=None):
    errors, warns, info = [], [], []
    html_path = Path(html_path)
    text = html_path.read_text(encoding="utf-8")
    found_blocks = _ID_SCRIPT.findall(text)
    blocks = dict(found_blocks)
    need = ("rd-data", "rd-layout", "rd-views", "rd-filters")
    if not all(k in blocks for k in need):
        return ["not a page built by dash_redesign.py (embedded data blocks missing)"], warns, info
    dup = sorted({k for k, _ in found_blocks if sum(1 for x, _ in found_blocks if x == k) > 1})
    if dup:
        return ["the page contains more than one %s block — it was tampered with; rebuild it" % ", ".join(dup)], warns, info
    data, layout, views, fmeta = (json.loads(blocks[k].replace("<\\/", "</").replace("<\\!--", "<!--")) for k in need)
    # 1. recompute
    try:
        fresh, fresh_meta = compute_all(data, layout)
        fresh = json.loads(json.dumps(fresh))
        diff = _first_diff(fresh, views, "views")
        if diff:
            errors.append("the page does not match its own data at %s — it was edited by hand or built from other files; rebuild it" % diff)
        else:
            info.append("recomputed %d view(s): every figure matches the embedded data" % len(views))
        mb = re.search(r"built (\d{4}-\d{2}-\d{2})", text)
        rebuilt = render_page(data, layout, mb.group(1) if mb else "")[0]
        if not diff and rebuilt != text:
            pos = next((i for i, (a, b) in enumerate(zip(rebuilt, text)) if a != b), min(len(rebuilt), len(text)))
            errors.append("the page differs from what this script builds from its own data (first difference at character %d, "
                          "near %r) — it was edited or built by another version; rebuild it, never edit the page" % (pos, text[max(0, pos - 30):pos + 30]))
        elif not diff:
            info.append("the whole page is exactly what the script builds from its embedded data")
    except LayoutError as e:
        errors.append("layout: %s" % e)
        fresh = views
    # 2. reconcile with the original
    if inventory_path:
        inv = json.loads(Path(inventory_path).read_text(encoding="utf-8"))
        inv_ds = {d["id"]: d for d in inv["datasets"]}
        for name, d in (data.get("datasets") or {}).items():
            iid = d.get("inventory_id")
            if not iid:
                warns.append("dataset '%s' is not from the inventory (%s) — not reconciled with the original" % (name, d.get("origin", "no origin")))
                continue
            if iid not in inv_ds:
                errors.append("dataset '%s': inventory id '%s' not in %s" % (name, iid, inventory_path))
                continue
            src = inv_ds[iid]
            bucket = warns if d.get("transform") else errors
            if d.get("transform"):
                warns.append("dataset '%s' was changed on purpose: %s" % (name, d["transform"]))
            if len(d["rows"]) != src["n_rows"]:
                bucket.append("dataset '%s' has %d rows, the original %d%s" % (name, len(d["rows"]), src["n_rows"],
                              "" if d.get("transform") else " — declare the change in 'transform' or restore the rows"))
                continue
            src_keys = [c["key"] for c in src["columns"]]
            pairs, unknown = [], []
            for i, c in enumerate(d["columns"]):
                sk = c.get("source", c["key"])
                if sk in src_keys:
                    pairs.append((i, src_keys.index(sk)))
                else:
                    unknown.append(c["key"])
            if unknown:
                bucket.append("dataset '%s': column(s) %s are not in the original — renamed columns need \"source\": \"<original key>\"" % (name, ", ".join(unknown)))
            if pairs:
                mine = sorted(json.dumps([r[i] for i, _ in pairs]) for r in d["rows"])
                theirs = sorted(json.dumps([r[j] for _, j in pairs]) for r in src["rows"])
                if mine != theirs:
                    n_diff = sum(1 for a, b in zip(mine, theirs) if a != b)
                    bucket.append("dataset '%s': %d row(s) differ from the original (values changed or moved between rows)%s" %
                                  (name, n_diff, "" if d.get("transform") else " — restore them from init, or declare a 'transform'"))
        info.append("reconciled %d dataset(s) with %s" % (len(data.get("datasets") or {}), Path(inventory_path).name))
    else:
        warns.append("no --inventory given: the data was not reconciled with the original dashboard")
    # 3. glanceability lint
    le, lw = lint(layout, fresh.get("") or next(iter(fresh.values())), data)
    errors += le
    warns += lw
    # 4. brand
    body = _ID_SCRIPT.sub("", text)
    for h in sorted(set(x.upper() for x in re.findall(r"#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b", body))):
        if h not in PALETTE:
            errors.append("colour %s is not in the corporate palette" % h)
    for pat, msg in ((r"gradient\(", "gradients"), (r"box-shadow\s*:\s*(?!none)", "shadows"),
                     (r"text-transform\s*:\s*uppercase", "all-caps text"), (r"border-radius\s*:\s*(?:[3-9]|\d{2,})", "rounded corners")):
        if re.search(pat, body, re.I):
            errors.append("brand: %s are not allowed" % msg)
    if re.search(r"<script[^>]+src=|<link[^>]+href=\"https?:", text, re.I):
        errors.append("the page loads external files; it must be self-contained")
    for name in forbid or []:
        if re.search(r"\b%s\b" % re.escape(name), text, re.I):
            errors.append("the name '%s' appears in the page" % name)
    # 5. render
    if render:
        chrome = _find_chrome()
        if not chrome:
            warns.append("no Chrome/Chromium/Edge found: the page was not rendered. Open it once in a browser before handing it over")
        else:
            uri = html_path.resolve().as_uri()
            dom = _chrome(chrome, ["--dump-dom", uri], None)
            if dom is None:
                warns.append("render: Chrome did not answer; open the page in a browser once")
            else:
                m = re.search(r'id="rd-status" data-status="(\w+)"[^>]*>([^<]*)<', dom)
                if not m or m.group(1) != "ok":
                    errors.append("render: the page did not render (%s)" % (m.group(2) if m else "no status"))
                else:
                    v0 = fresh.get("") if "" in fresh else next(iter(fresh.values()))
                    missing = [k["display"] for k in v0["kpis"] if _esc(k["display"]) not in dom]
                    if missing:
                        errors.append("render: KPI values not on the page: %s" % ", ".join(missing))
                    else:
                        info.append("rendered headless: status ok, every KPI value on the page")
                sd = Path(shot_dir) if shot_dir else html_path.parent
                sd.mkdir(parents=True, exist_ok=True)
                for suffix, size in (("first-screen", "1440,900"), ("full", "1440,2600"), ("phone", "500,1800")):
                    png = sd / ("%s-%s.png" % (html_path.stem, suffix))
                    if png.exists():
                        png.unlink()
                    _chrome(chrome, ["--window-size=" + size, "--screenshot=" + str(png), uri], png)
                    if png.exists():
                        info.append("screenshot: %s" % png)
    return errors, warns, info


def lint(layout, view, data):
    E, W = [], []
    kpis, secs = layout.get("kpis") or [], layout.get("sections") or []
    if len(kpis) > 5:
        E.append("%d headline KPIs: at most 5 — move the rest into a section's 'More detail'" % len(kpis))
    if len(kpis) < 3:
        W.append("only %d headline KPI(s): 3 to 5 give the reader the picture at a glance" % len(kpis))
    summ = layout.get("summary") or []
    if not summ:
        W.append("no 'summary': readers take in 1-3 plain sentences that state the conclusion faster than any chart")
    elif len(summ) > 3:
        E.append("%d summary lines: at most 3 — the summary states the conclusion, the sections carry the detail" % len(summ))
    nocmp = [k.get("id") for k in kpis if (k.get("compare") or {}).get("type") == "none"]
    if kpis and len(nocmp) * 2 > len(kpis):
        W.append("%d of %d headline KPIs have no comparison (%s) — a reader cannot judge them; prefer figures that can be "
                 "compared (latest vs previous period, vs median, vs target) or ask the user for a target" % (len(nocmp), len(kpis), ", ".join(nocmp)))
    if len(secs) > 5:
        E.append("%d sections: at most 5 (one per question) — merge sections or move charts into 'More detail'" % len(secs))
    if not secs:
        E.append("no sections")
    labels = [k["label"] for k in view["kpis"]]
    for s in view["sections"]:
        for ch in [s["chart"]] + [m["chart"] for m in s["more"]]:
            labels += [x["label"] for x in ch.get("series", [])] + [c["label"] for c in ch.get("columns", [])] + \
                      [x["label"] for x in ch.get("steps", [])]
    for lab in labels:
        low = lab.strip().lower()
        if low in _JARGON or re.fullmatch(r"[a-z0-9]+(_[a-z0-9]+)+", low) or re.search(r"\b(%s)\b" % "|".join(sorted(_JARGON)), low) and len(low) <= 8:
            E.append("label '%s' is jargon or a column name — use the plain label from the catalogue (the term goes into the tooltip)" % lab)
    for s, sv in zip(secs, view["sections"]):
        for mspec, mv in zip(s.get("more") or [], sv["more"]):
            mch = mv["chart"]
            if mch["type"] == "donut" and len(mch["categories"]) > 5:
                E.append("section '%s' more: a donut with %d parts — at most 5" % (sv["id"], len(mch["categories"])))
            if mch["type"] in ("column", "line") and len(mch.get("series", [])) > 3 or mch["type"] == "groupedBar" and len(mch["series"]) > 2:
                E.append("section '%s' more: too many series in one %s chart" % (sv["id"], mch["type"]))
    for s, sv in zip(secs, view["sections"]):
        sid, ch = sv["id"], sv["chart"]
        spec = s.get("chart") or {}
        if ch["type"] == "column" and len(ch["series"]) > 3:
            E.append("section '%s': %d series in one column chart — at most 3" % (sid, len(ch["series"])))
        if ch["type"] == "donut" and len(ch["categories"]) > 5:
            E.append("section '%s': a donut with %d parts — at most 5; use a sorted bar chart" % (sid, len(ch["categories"])))
        if ch["type"] == "groupedBar" and len(ch["series"]) > 2:
            E.append("section '%s': grouped bars with %d series — at most 2; split into small charts" % (sid, len(ch["series"])))
        if ch["type"] == "line" and len(ch["series"]) > 3:
            E.append("section '%s': %d lines — at most 3" % (sid, len(ch["series"])))
        if ch["type"] in ("column", "groupedBar", "line") and len({x["unit"] for x in ch["series"]}) > 1:
            E.append("section '%s': series in different units on one axis — use two charts, never a dual axis" % sid)
        if ch["type"] == "bar" and spec.get("sort") == "none" and not ch.get("time"):
            E.append("section '%s': a ranking must be sorted (drop \"sort\": \"none\")" % sid)
        if ch["type"] in ("bar", "column") and len(ch.get("categories", [])) > 15 and not ch.get("time"):
            W.append("section '%s': %d bars — consider 'top': 10" % (sid, len(ch["categories"])))
        if not s.get("subtitle"):
            W.append("section '%s': no subtitle — name the measure and its basis" % sid)
        if s.get("title") and ch["type"] not in ("table", "funnel") and not re.search(r"\d|\{(kpi|top|first|last)\.", s["title"]):
            W.append("section '%s': the title reads like a label — state the takeaway, with a figure" % sid)
    for s in secs:
        if s.get("question") and s["question"].lower() not in ("reach", "engagement", "content", "audience", "trend"):
            W.append("section '%s': question '%s' is not one of reach, engagement, content, audience, trend" % (s.get("id"), s["question"]))
    return E, W


# ============================================================== command line


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("inventory")
    a.add_argument("html")
    a.add_argument("--out", default=None)
    b = sub.add_parser("init")
    b.add_argument("inventory")
    b.add_argument("--out", default="data.json")
    c = sub.add_parser("build")
    c.add_argument("data")
    c.add_argument("layout")
    c.add_argument("--out", required=True)
    d = sub.add_parser("check")
    d.add_argument("html")
    d.add_argument("--inventory")
    d.add_argument("--forbid", action="append", default=[])
    d.add_argument("--no-render", action="store_true")
    d.add_argument("--shots", default=None, help="folder for screenshots (default: next to the page)")
    args = ap.parse_args(argv)
    if args.cmd == "inventory":
        inv = inventory(args.html)
        out = Path(args.out or "inventory.json")
        out.write_text(json.dumps(inv, ensure_ascii=False, indent=1), encoding="utf-8")
        print_inventory(inv)
        print("\nWrote %s" % out)
        return 0
    if args.cmd == "init":
        inv = json.loads(Path(args.inventory).read_text(encoding="utf-8"))
        Path(args.out).write_text(json.dumps(init_data(inv), ensure_ascii=False, indent=1), encoding="utf-8")
        data = json.loads(Path(args.out).read_text(encoding="utf-8"))
        print("Wrote %s with %d dataset(s). Metric guesses from column names — confirm or correct each one:" % (args.out, len(inv["datasets"])))
        for name, d in data["datasets"].items():
            guesses = ["%s → %s" % (c["key"], c.get("metric") or "none") for c in d["columns"] if c["type"] == "number"]
            print("  %-30s %s" % (name, "; ".join(guesses)))
        print("Next: fill meta, drop datasets the page will not use, set 'grain'.")
        return 0
    if args.cmd == "build":
        try:
            page, notes, views = build(args.data, args.layout, args.out)
        except LayoutError as e:
            print("ERROR %s" % e)
            return 1
        print("Wrote %s (%d view%s) and %s" % (page, len(views), "" if len(views) == 1 else "s", notes))
        v = views.get("") if "" in views else next(iter(views.values()))
        for k in v["kpis"]:
            print("  %-28s %s  %s" % (k["label"], k["display"], k["delta"]["display"] if k["delta"] else "(%s)" % k.get("note", "")))
        print("Next: python dash_redesign.py check %s --inventory inventory.json" % args.out)
        return 0
    if args.cmd == "check":
        errors, warns, info = check(args.html, args.inventory, args.forbid, not args.no_render, args.shots)
        for x in info:
            print("OK   " + x)
        for x in warns:
            print("WARN " + x)
        for x in errors:
            print("ERROR " + x)
        print("\n%s" % ("PASSED — %d warning(s)" % len(warns) if not errors else "FAILED — %d error(s): do not hand this page over" % len(errors)))
        return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
```
