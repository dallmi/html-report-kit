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
| `skills/corporate-html-rebrand/SKILL.md` | Agent skill (single file) that re-brands any existing HTML page to the corporate design system without changing data or behaviour — tokens, chart rules, library recipes and the `brand_check.py` checker inline. Upload as-is to an agent platform |

The demo data includes a synthetic `DATA.prior` block (2025, same schema) and `DATA.asOf`; v3 uses them for year-on-year change and the partial-month flag, v2 ignores them. Production needs the prior-year email, article and video exports in the same schema.

```bash
python3 scripts/build_demo.py
```

## Using real data

Replace the line `<script>const DATA = /*__DATA__*/null;</script>` in `template.html` with the production `const DATA = {...}` line. The schema (`mailP` columnar with `dims`/`cols`, `arts`, `vids`, `pages`, `links`, `pgLevel`, `pgDiv`, `pgReg`, `hcGeduld`, `hcDash`, `src`) was reconstructed from the v2 source; check the browser console once after swapping.

## Colour rules applied

- Every single-series bar is Grey VI `#404040`; a second series is Bronze I `#B98E2C`. No chart is filled red.
- Corporate Red appears only as accent: active tab, primary button, first KPI marker, interpretation callout rule.
- Warm greys only; status badges use RAG colours for data-driven verdicts, Pastel I for neutral ones.
- No gridlines, 1px black baselines, no all-caps, no brand name anywhere in code.
