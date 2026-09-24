---
name: corporate-html-rebrand
description: Re-brands an existing HTML page — dashboard, report, KPI page, one-pager, generated analytics view — so it complies with the corporate design system (warm greys carry the page and the charts, Corporate Red is a small accent, Frutiger, no gradients/shadows/rounded shapes/all-caps), without changing data, calculations or behaviour. Use this whenever someone shares or points to an .html file and says the colours, branding, look or styling are off, "not compliant", "not on brand", "make it look corporate / like our house style", "fix the colours", "restyle", "clean up the design", or wants a dashboard built by an agent, Copilot, ChatGPT, Tailwind, Bootstrap, Chart.js, Plotly, ECharts or D3 brought in line with the corporate look — even if they never say the word "brand". Also use it to audit an HTML file for brand compliance before it is shared or committed.
---

# Corporate HTML re-brand

You are taking a working HTML page and making it look like it came from the organisation — while keeping every number, filter, chart and interaction exactly as it was. Think of it as a repaint, not a rebuild.

The most common failure is a *token swap*: someone replaces a few hex values in `:root`, and the page still screams "off-brand" because the real colour lives in chart JavaScript, SVG attributes, library defaults, framework classes and badge styles. The second most common failure is over-correcting — rewriting layout, renaming ids, or "improving" logic, which breaks the page. This skill guards against both.

## The one principle that decides everything

**White dominates → warm greys carry the layout and the charts → Corporate Red and Bronze are small accents.**

When a specific rule below seems to conflict with this, the principle wins. A page where every bar is red looks like an alarm, not like data; a page where red appears in four small places (active tab, primary button, one KPI marker, one callout rule) looks corporate.

## Workflow

### 1. Keep the original, then inventory

- Never overwrite the only copy. Write the result as a new file (e.g. `<name>-branded.html`) unless the user explicitly asks for in-place editing — then save the original next to it first (`<name>.orig.html`).
- Save the checker script from the appendix as `brand_check.py` and run it on the original:
  ```bash
  python brand_check.py <file>.html
  ```
  The report lists every off-palette colour with its line and the **nearest palette colour** — use that as a starting point for the mapping, then apply judgement by role (step 2).
  Add `--forbid "<name>"` only when a name must not appear in the file — typically because the file is going into a Git repository or leaving the internal environment (see step 6). Don't ask for a company name otherwise; a page used internally may carry it.
- Also read the page yourself. Find **every** place colour or style is decided, because the checker cannot see intent:
  - CSS custom properties and every rule that uses them
  - hard-coded colours in CSS, inline `style=""`, SVG attributes (`fill=`, `stroke=`)
  - JavaScript: chart configs, colour arrays/maps, `createLinearGradient`, D3 scales, strings like `'#E8E8E8'` for gridlines, `rgba(...)` fills
  - library defaults you never see in the code: Chart.js default blue palette and gridlines, Plotly `colorway` and grid, ECharts default palette, Bootstrap `bg-primary`/`btn-primary`/`table-dark`, Tailwind `bg-blue-500`, `rounded-xl`, `shadow-lg`
  - status/verdict badges, callouts, tooltips, focus rings, hover states, table striping, "top story" tags, in-cell data bars

### 2. Map by role, not by hue

Do not replace "red with red" and "blue with the nearest palette colour". Decide what each colour is *for*, then give it the colour for that role:

| Role in the page | Brand colour |
|---|---|
| Page background | `#F7F7F5` (near-white warm) — or white |
| Cards, panels, table background | White `#FFFFFF` |
| Card / panel borders, dividers | Pastel I `#ECEBE4` |
| Input borders, table rules inside body | Grey I `#CCCABC` |
| Body text, headings, KPI values | Black `#000000` |
| Secondary text, labels | Grey V `#5A5D5C` |
| Subtitles, captions, footnotes, axis tick labels | Grey IV `#7A7870` |
| Primary action button, active tab underline, one "highlight" KPI marker, one callout rule | Corporate Red `#E60000` (hover/active: Bordeaux II `#8A000A`) |
| Links, interactive text | Lake50 `#0C7EC6` (hover `#07476F`) — blue is reserved for this |
| Highlight/fill boxes, tags, neutral badges | Pastel I `#ECEBE4` with black text |
| Notes / caveat boxes | Pastel II `#F5F0E1` with a 3px Bronze II `#946F29` left rule |
| Data-driven status (on track / watch / problem) | RAG: green `#6F7A1A` (white text), amber `#E4A911` (black text), red `#BD000C` (white text) |
| Change indicators on KPIs ("▲ 8% vs Q2", "▼ 1.2 pts") | Text stays black (or Grey V). **Only the arrow** is coloured: RAG green `#6F7A1A` when the change is good, RAG red `#BD000C` when it is bad, Grey IV when neutral. Colour by *meaning*, not direction — attrition ▲ is red, cost ▼ is green. |
| Tooltip | Grey VI `#404040` background, white text |
| Focus ring | 2px solid Grey VI `#404040` |

RAG colours are only for data-driven status. A badge that *describes* a pattern ("Depth — power users", "Balanced") is neutral Pastel I, not red. A badge that *judges* ("Attention problem", "Low engagement") may carry RAG.

### 3. Charts — the decision table

Pick the lowest row that fits. This is where most of the brand lives, so audit every chart individually.

| # | Situation | Colour |
|---|---|---|
| 1 | Single series (bars, columns, rankings, timelines, funnels) | **one** flat Grey VI `#404040` for all bars. Never per-bar colours — the axis labels already separate categories. |
| 2 | Two series compared (A vs B, views vs completions, this vs last year) | series 1 Grey VI `#404040`, series 2 Bronze I `#B98E2C` |
| 3 | Three series | add Grey III `#8E8D83` |
| 4 | Categorical donut / stacked parts (≤ ~9) | `['#404040','#B98E2C','#8E8D83','#CCCABC','#5A5D5C','#946F29','#B8B3A2','#7A7870','#6C5312']` |
| 5 | Known business entities (divisions, regions) in multi-colour charts | fixed greys by name, so the same entity is the same colour everywhere; "Unknown/Other/(Untagged)" in Grey I `#CCCABC` |
| 6 | Data-driven status or direction | RAG colours |
| 7 | Genuinely complex, >10 equal-weight hard-to-separate series | the 20-colour complex palette (appendix) — the exception, not a default |

Chart form rules:
- **No chart is filled Corporate Red or Bordeaux.** Red fills read as "alert".
- 2D only. No gradients (including area fills made with `createLinearGradient`), no shadows, no 3D, no rounded bar corners (`borderRadius: 0`).
- **No gridlines.** One 1px black baseline. Remove the y-axis when bars carry data labels; keep minimal tick labels (no gridlines) when they don't.
- Pie → **donut** (thin ring, ~64% cutout, 2px white separators between segments).
- Lines: 2px solid. A dashed line means "average" or "target" only — Grey V `#5A5D5C`, dashed, labelled inline (e.g. `Average = 1,050`). A real metric line is never dashed.
- Bubbles: fill Pastel I `#ECEBE4`, outline Grey VI 0.75px; no transparency. If they cluster at one end because the x values span orders of magnitude, use a log x-scale and say so in the axis label.
- Legends: square swatches, text to the right; one shared legend if several charts share series.
- Data labels: black (white on dark segments), same font size as the rest of the page.
- Keep label collisions in check: a label must never sit on top of a line or another label — move it to the outside of the bend or below the point.

Library recipes are in the appendix (Chart.js, Plotly, ECharts, D3/hand-drawn SVG, Bootstrap, Tailwind).

### 4. Typography and components

- Font stack: `"Frutiger 45 Light","Frutiger","Helvetica Neue",Helvetica,Arial,"Segoe UI",Roboto,system-ui,sans-serif`. Remove Google-font imports (Inter, Roboto, Poppins…).
- **No ALL CAPS anywhere** — remove `text-transform: uppercase` and `text-uppercase`, rewrite hard-coded caps in labels to sentence case ("TOTAL" → "Total", "EMAILS SENT" → "Emails sent"). Keep genuine acronyms (KPI, CTO, CTVR, YTD).
- No underlines, no justified text, left-aligned by default. Numbers right-aligned in tables; text left-aligned. No centred layouts unless centring is the only way to communicate.
- Emphasis: bold *or* italics, never both, never coloured text (the only exception: a single Corporate Red highlight on white is allowed, but prefer none). Change figures follow the same rule — the number is black, only the ▲/▼ symbol carries a RAG colour (see the role table). Wrap the arrow in its own element, e.g. `<span class="delta"><i class="up good">▲</i> 8% vs Q2</span>`.
- Page title: light (weight 300), black, ~28px in dashboards. Section/chart headings: 15–18px, weight 600, black. KPI values: ~28px, weight 300, black.
- Geometry: `border-radius` max 2px (pills and `rounded-*` go), no `box-shadow`, no gradients, no decorative shapes, no background images behind text.
- Tables (financial style): white header, **no dark header band**, 1px black rule on top and bottom of the table and under the header row, thin Pastel I row dividers, no vertical lines; header row one size smaller than the body; "Total" row bold with 1px black rules above and below; negatives in parentheses `(180)` rather than red text.
- KPI tiles: white, thin Pastel I separators, one tile may carry a 3px Corporate Red top rule as the page's highlight.
- Callouts/interpretation boxes: white, Pastel I border, 3px left rule — Corporate Red for the one primary callout on a view, Grey VI for method/explanation boxes.
- Header: white, black title, grey subtitle, thin Grey I bottom rule. Tabs: inactive Grey V, active black + 3px Corporate Red underline. Header and tabs may stick together at the top.
- Logos: never recreate the logo in CSS/text as a badge. If a logo is needed, it is the official file on white, bottom-left, with clear space — otherwise leave it out. Headings carry no logo and no colour.

### 5. What you must not change

- Data, numbers, formulas, aggregation logic, filter logic, sort order, text meaning.
- Element ids, `data-*` attributes, function names and anything JavaScript looks up — re-branding must not break a single interaction.
- Chart types, except pie → donut and 3D → 2D.
- If you notice a genuine bug or leftover (e.g. an AI assistant's chat sentence baked into the UI, a leftover debug label), **report it**, and fix it only if it is clearly cosmetic or brand-related. Anything that changes behaviour: ask first.

### 6. Naming and hygiene

- Always: rename CSS variables and classes that carry a brand or company name to generic tokens (`--acme-red` → `--primary`, `.acme-card` → `.card`). Generic token names make the page reusable and keep the palette in one place.
- Visible text is a separate question. A page used inside the organisation may name it in the title, header or footer — leave that as it is. Remove the name from `<title>`, comments, export filenames and demo text **only** when the user says the file goes into a Git repository, is shared outside, or asks for it; then use generic words ("the organisation", "internal platform") and run the checker with `--forbid`. Internal division/region names are fine either way — they are the vocabulary of the data.
- Put all colours into one `:root` token block (appendix) and use `var(--…)` everywhere in CSS. In JavaScript, SVG presentation attributes can't resolve `var()` reliably — prefer CSS classes on SVG elements, or a single JS constant object mirroring the tokens.
- No absolute local paths (`C:\Users\…`, `/Users/…`) in the file.

### 7. Verify — the job isn't done until this passes

1. Re-run `brand_check.py` on the result. Target: **zero errors**. Every remaining warning needs a reason you can state (e.g. "complex palette used for 14 equal-weight series").
2. If a name was to be removed (step 6), search the result for it once more yourself (title, CSS, JS, comments, filenames).
3. Open the page in a browser if you can (Playwright, a headless browser, or ask the user). Check: no console errors; **every** tab/view renders; filters, sorting, exports still work; nothing overlaps; no horizontal scrolling at ~900px width on **every** tab (wide tables are the usual culprit — grid columns that hold them need `minmax(0,1fr)`, not `1fr`). If you cannot open a browser, say so explicitly and give the user a 5-point checklist to click through.
   - Screenshot tip: chart libraries animate and some pages draw charts only when they scroll into view. Wait ~2 seconds before capturing, and prefer viewport screenshots over full-page ones — an empty chart in a full-page capture is usually a capture artefact, not a bug. Confirm by checking the chart instance exists before concluding anything.
4. Look at every chart type as rendered. A token grep will not catch a blue donut segment or a red bar coming from a library default.
5. Diff the non-style parts: the list of element ids and JS function names in the original and the result should match (apart from brand-name renames).

### 8. Report back

Give the user, briefly:
- where the new file is and how to open it
- the checker result before → after (error/warning counts)
- a short table of what changed, grouped: palette/tokens, charts, typography, components, naming
- judgement calls you made (e.g. "bars grey instead of red — principle over literal rule; switch via `--s1`")
- anything you noticed but deliberately did not change

---

## Appendix A — Token block

Paste this as the page's `:root` and build everything on it.

```css
:root{
  /* Primary */
  --primary:#E60000;      /* Corporate Red — small accents, CTAs, active tab */
  --primary-dark:#8A000A; /* Bordeaux II — hover/active */
  --white:#FFFFFF; --black:#000000;
  /* Warm greys I–VI — never cool/neutral greys */
  --grey-1:#CCCABC; --grey-2:#B8B3A2; --grey-3:#8E8D83; --grey-4:#7A7870; --grey-5:#5A5D5C; --grey-6:#404040;
  /* Bordeaux I–III */
  --bordeaux-1:#BD000C; --bordeaux-2:#8A000A; --bordeaux-3:#620004;
  /* Bronze I–III — small accents in charts and diagrams */
  --bronze-1:#B98E2C; --bronze-2:#946F29; --bronze-3:#6C5312;
  /* Surfaces */
  --bg:#F7F7F5; --surface:#ECEBE4; /* Pastel I */ --surface-alt:#F5F0E1; /* Pastel II */ --row-alt:#F8F7F2;
  /* RAG — data-driven status only */
  --success:#6F7A1A; --warning:#E4A911; --danger:#BD000C;
  /* Links / interactive only */
  --info:#0C7EC6;
  --radius:2px;
  --font-sans:"Frutiger 45 Light","Frutiger","Helvetica Neue",Helvetica,Arial,"Segoe UI",Roboto,system-ui,sans-serif;
  /* Chart roles */
  --s1:var(--grey-6); --s2:var(--bronze-1); --s3:var(--grey-3);
}
```

Complex-chart palette (exception only, row 7), in this order:
`#AF8626 #00759E #879420 #4B2D58 #9F8865 #2E476B #469A6C #AD3E4A #8489BD #0C7EC6 #654D16 #804C95 #45999C #4972AC #CC707A #295B40 #545A9C #785E4A #07476F #620004`

## Appendix B — Library recipes

**Chart.js**
```js
Chart.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue('--font-sans');
Chart.defaults.color = '#404040';
Chart.defaults.plugins.legend.labels.boxWidth = 10;          // square swatches
Chart.defaults.plugins.tooltip.backgroundColor = '#404040';
Chart.defaults.elements.bar.borderRadius = 0;
// per chart:
scales: { x: { grid: { display: false }, border: { color: '#000' } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: '#7A7870' } } }
// single series: backgroundColor: '#404040' (one string, not an array)
// pie -> type: 'doughnut', cutout: '64%', borderColor: '#fff', borderWidth: 2
// area fill: fill: false (no gradients); line: borderWidth: 2, tension: 0
```

**Plotly**
```js
const layout = { font: { family: '"Frutiger","Helvetica Neue",Arial,sans-serif', color: '#404040' },
  colorway: ['#404040','#B98E2C','#8E8D83','#CCCABC','#5A5D5C','#946F29'],
  paper_bgcolor: '#fff', plot_bgcolor: '#fff',
  xaxis: { showgrid: false, zeroline: false, linecolor: '#000' },
  yaxis: { showgrid: false, zeroline: false, showline: false } };
// pie -> hole: 0.64, marker: { line: { color: '#fff', width: 2 } }
// config: { displaylogo: false }
```

**ECharts**: `color: [...]` as above; `splitLine: { show: false }`; `axisLine: { lineStyle: { color: '#000' } }`; `itemStyle: { borderRadius: 0 }`; pie → `radius: ['52%','80%']`.

**D3 / hand-drawn SVG**: give marks classes (`.bar`, `.bar.s2`, `.axis`) and colour them in CSS with the tokens. Remove gridline `<line>`s. Replace `rgba(...)` fills with solid palette colours.

**Bootstrap**: override rather than fight it — in your own `<style>` after the Bootstrap link: `.bg-primary`, `.btn-primary`, `.table-dark`, `.text-primary`, `.badge.bg-*`, `.rounded-*`, `.shadow*`, `.text-uppercase`, `.navbar-dark`. Or remove the classes from the markup. Status badges map to RAG colours; table becomes financial style (appendix rules in step 4).

**Tailwind**: replace colour utilities (`bg-blue-500`, `text-gray-500`, `from-*`/`to-*` gradients) with the palette via a small set of your own classes; remove `rounded-*`, `shadow-*`, `uppercase`, `tracking-*`.

## Appendix C — `brand_check.py`

Save exactly as `brand_check.py`, run with Python 3.8+ (standard library only).
`python brand_check.py page.html [--forbid "Name" ...]` — exit code 1 if errors remain. `--forbid` is optional; use it only when a name must not appear in the file (step 6).

```python
#!/usr/bin/env python3
"""Brand compliance checker for single-file HTML pages.

Flags off-palette colours (with the nearest palette colour), transparency tints,
gradients, all-caps, pie charts, gridline colours, shadows, rounded corners,
framework colour classes, non-brand fonts, absolute paths and forbidden names.
"""
import argparse, re, sys

PALETTE = {
    "E60000": "Corporate Red", "8A000A": "Bordeaux II", "BD000C": "Bordeaux I / RAG red", "620004": "Bordeaux III",
    "000000": "Black", "FFFFFF": "White",
    "CCCABC": "Grey I", "B8B3A2": "Grey II", "8E8D83": "Grey III", "7A7870": "Grey IV", "5A5D5C": "Grey V", "404040": "Grey VI",
    "B98E2C": "Bronze I", "946F29": "Bronze II", "6C5312": "Bronze III",
    "ECEBE4": "Pastel I", "F5F0E1": "Pastel II", "F7F7F5": "Page background", "F8F7F2": "Row alt",
    "6F7A1A": "RAG green", "E4A911": "RAG amber",
    "0C7EC6": "Lake50 (links)", "07476F": "Lake90 (link hover)", "00759E": "Lagoon60 (links)",
}
COMPLEX = {"AF8626", "879420", "4B2D58", "9F8865", "2E476B", "469A6C", "AD3E4A", "8489BD", "654D16", "804C95",
           "45999C", "4972AC", "CC707A", "295B40", "545A9C", "785E4A"}
TRADING = {"498100", "C81219"}
NAMED = ("red|blue|green|orange|purple|yellow|pink|navy|teal|cyan|magenta|lime|gold|violet|indigo|crimson|maroon|olive|"
         "gray|grey|lightgray|lightgrey|darkgray|darkgrey|silver|whitesmoke|gainsboro|steelblue|royalblue|dodgerblue|tomato|coral")

def hex6(h):
    h = h.upper()
    if len(h) in (3, 4): h = "".join(c * 2 for c in h[:3])
    return h[:6]

def nearest(h):
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    best = min(PALETTE, key=lambda p: (int(p[0:2], 16) - r) ** 2 + (int(p[2:4], 16) - g) ** 2 + (int(p[4:6], 16) - b) ** 2)
    return f"#{best} {PALETTE[best]}"

RULES = [  # (severity, key, regex, message)
    ("ERROR", "gradient", r"(linear|radial|conic)-gradient\(|create(Linear|Radial)Gradient", "gradient — solid colours only"),
    ("ERROR", "uppercase", r"text-transform\s*:\s*uppercase|\btext-uppercase\b|\buppercase\b(?=[^\n]*class)", "all caps — use sentence case"),
    ("ERROR", "justify", r"text-align\s*:\s*justify", "justified text — left-align"),
    ("ERROR", "abs-path", r"[A-Za-z]:\\\\?Users\\\\?|/Users/[A-Za-z]|/home/[a-z]", "absolute local path"),
    ("WARN", "shadow", r"box-shadow\s*:\s*(?!none|inset)|\bshadow(-sm|-lg|-md|-xl|-2xl)?\b(?=[^\n]*class=)", "shadow — flat design, remove"),
    ("WARN", "radius", r"border-radius\s*:(?!\s*(0\b|0px|1px|2px|var\())|borderRadius\s*:\s*[1-9]|\brounded(-[a-z0-9]+)?\b(?=[^\n]*class=)", "rounded corners — max 2px"),
    ("WARN", "gridlines", r"showgrid\s*:\s*true|splitLine\s*:\s*\{\s*show\s*:\s*true|grid\s*:\s*\{\s*display\s*:\s*true", "gridlines — remove"),
    ("WARN", "bootstrap-colour", r"\b(bg|text|border|btn|table|badge|navbar)-(primary|info|success|danger|warning|secondary|dark|light)\b",
     "Bootstrap default colour class — override or map to palette"),
    ("WARN", "tailwind-colour", r"\b(bg|text|border|from|to|via|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b",
     "Tailwind default colour class — map to palette"),
    ("WARN", "font", r"fonts\.googleapis\.com|font-family\s*:\s*['\"]?(Inter|Roboto|Poppins|Open Sans|Lato|Montserrat)", "non-brand font — use the Frutiger stack"),
    ("WARN", "center", r"text-align\s*:\s*center|\btext-center\b", "centred text — left-align unless centring is essential"),
]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file"); ap.add_argument("--forbid", action="append", default=[])
    ap.add_argument("--max", type=int, default=12, help="max lines shown per finding")
    a = ap.parse_args()
    text = open(a.file, encoding="utf-8", errors="replace").read()
    lines = text.splitlines()
    uses_bootstrap = re.search(r"bootstrap(\.min)?\.(css|js)", text, re.I) is not None  # else .btn-primary is just a class name
    found = {}  # (sev, key, msg) -> [(lineno, snippet)]
    def add(sev, key, msg, n, snip):
        found.setdefault((sev, key, msg), []).append((n, snip.strip()[:140]))
    skipped = []
    for n, line in enumerate(lines, 1):
        for term in a.forbid:
            for m in re.finditer(r"(?i)(?<![A-Za-z])" + re.escape(term) + r"(?![A-Za-z])", line):
                add("ERROR", "forbidden", f"forbidden name '{term}'", n, line[max(0, m.start() - 40):m.end() + 40])
        if len(line) > 5000:
            skipped.append(n); continue  # data blob — colours inside data are not styling
        for m in re.finditer(r"(?<![&\w])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b", line):
            h = hex6(m.group(1))
            if h in PALETTE: continue
            if h in COMPLEX: add("INFO", "complex", "complex-chart palette colour — only for >10 equal-weight series", n, line); continue
            if h in TRADING: add("INFO", "trading", "trading colour — data only, check regional convention", n, line); continue
            add("ERROR", "colour", f"off-palette #{h} → nearest {nearest(h)}", n, line)
        for m in re.finditer(r"(rgba?|hsla?)\(([^)]*)\)", line):
            fn, args = m.group(1), [x.strip() for x in re.split(r"[,/ ]+", m.group(2)) if x.strip()]
            if fn.startswith("hsl"):
                add("ERROR", "colour", "hsl() colour — use palette hex", n, line); continue
            try:
                r, g, b = (int(float(x)) for x in args[:3])
            except ValueError:
                continue
            h = f"{r:02X}{g:02X}{b:02X}"
            alpha = float(args[3]) if len(args) > 3 and re.match(r"^[\d.]+$", args[3]) else 1.0
            if alpha < 1 and h not in ("000000", "FFFFFF"):
                add("ERROR", "tint", f"transparent colour rgba(#{h}, {alpha}) — tints are not allowed, use a solid palette colour", n, line)
            elif alpha < 1:
                add("WARN", "tint", "transparent black/white — usually a shadow or overlay; remove", n, line)
            elif h not in PALETTE:
                add("ERROR", "colour", f"off-palette rgb #{h} → nearest {nearest(h)}", n, line)
        for m in re.finditer(r"(?:(?:color|background|fill|stroke|border[a-z-]*)\s*:\s*|['\"])(" + NAMED + r")['\";\s}]", line, re.I):
            add("ERROR", "named", f"named colour '{m.group(1)}' — use palette hex", n, line)
        for sev, key, rx, msg in RULES:
            if key == "bootstrap-colour" and not uses_bootstrap: continue
            if re.search(rx, line, re.I if key not in ("abs-path",) else 0):
                add(sev, key, msg, n, line)
    # pie charts: a Plotly donut is type 'pie' + hole, a Chart.js donut may keep 'pie' + cutout — look ahead for either
    for m in re.finditer(r"type\s*:\s*['\"]pie['\"]", text):
        if re.search(r"hole\s*:\s*0?\.[1-9]|cutout", text[m.end():m.end() + 400]): continue
        add("ERROR", "pie", "pie chart — use a donut (cutout ~64%)", text.count("\n", 0, m.start()) + 1, text[m.start():m.start() + 80])
    order = {"ERROR": 0, "WARN": 1, "INFO": 2}
    counts = {"ERROR": 0, "WARN": 0, "INFO": 0}
    print(f"brand_check: {a.file}\n")
    for (sev, key, msg), hits in sorted(found.items(), key=lambda kv: (order[kv[0][0]], kv[0][1], kv[0][2])):
        counts[sev] += len(hits)
        print(f"[{sev}] {msg}  ({len(hits)}x)")
        for ln, snip in hits[: a.max]:
            print(f"    L{ln}: {snip}")
        if len(hits) > a.max: print(f"    … {len(hits) - a.max} more")
    if skipped: print(f"\n(skipped {len(skipped)} very long line(s) as data: {skipped[:5]})")
    print(f"\nSummary: {counts['ERROR']} errors, {counts['WARN']} warnings, {counts['INFO']} info")
    sys.exit(1 if counts["ERROR"] else 0)

if __name__ == "__main__":
    main()
```
