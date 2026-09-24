---
name: comms-dashboard-to-excel
description: Use when someone has the Comms Intelligence Dashboard (a single .html with mailings, articles, pages, video and click tracking) and wants its data as an Excel workbook — "extract the data into Excel", "give me the numbers as a spreadsheet", "export the dashboard to xlsx", "I need the data behind the dashboard to filter or pivot", "put the dashboard figures in a workbook" — even if they never say "DATA", "openpyxl" or "template". Works on the original (v2) and on a filled v3 build.
---

# Comms dashboard to Excel

The dashboard is one HTML file. It fetches nothing: all its data sits in one line, `const DATA = {...};`. The script in the appendix reads that block and writes a finished workbook in a fixed layout. It checks the fields first, writes every figure as a formula on the data sheets, recalculates the file in LibreOffice and reconciles it before you hand it over.

You are moving numbers, not producing them. Never edit, round, filter or "fix" a value, and do not restyle or re-arrange the workbook by hand. The same layout every month is the point: people compare this month's file with last month's. If the layout needs to change, change the script.

## What you need

| Input | Required | Notes |
|---|---|---|
| Dashboard `.html` with data | yes | The file itself, not a screenshot or PDF. Original (v2) or a filled v3 build |
| Data cut-off date (`YYYY-MM-DD`) | if not in the file | Shown on the Overview and in the file name. v3 builds carry it; for a v2 original, ask. Never guess it from a file name or from the header's "reach reference month". Without it the file is written as `…-undated.xlsx` — rerun once you have the date |
| Python 3.8+ with `openpyxl` | yes | `pip install openpyxl` if missing |
| LibreOffice (`soffice`) | recommended | Without it the file is not recalculated or reconciled — see step 3 |

## Workflow

**1. Check.** Save the appendix as `dashboard_to_xlsx.py` and run it in check mode. It writes nothing.

```bash
python dashboard_to_xlsx.py DASHBOARD.html --as-of 2026-08-31 --check
```

**2. Resolve errors — never by editing numbers.**
- *A field is missing but exists under another name* (e.g. `arts: field 'uv' missing in 291 of 291 records`, and the records carry `unique_visitors`): look in the dashboard's JavaScript at how the tab reads it. Map it only if it is the same measure: `--rename arts.unique_visitors=uv` (repeatable; `old=new` for a top-level key). If the dashboard's code reads the name the records do *not* carry, the dashboard itself shows blanks for that measure: tell the user, and leave that measure out of the step 4 comparison.
- *A field is missing and has no counterpart*: stop. Tell the user which sheet would be empty and that the dashboard's owner has to add it to the export.
- *`DATA is a JavaScript literal`*: the script reads it with Node. Without Node, open the dashboard in a browser, run `copy(JSON.stringify(DATA))` in the console, save it as `data.json` and add `--data-json data.json`.
- *`no const DATA found`*: not the dashboard file. Ask for the `.html`.
- `WARN` lines are facts about the data (records after the cut-off, labels that differ only in case). They go on the Overview's notes automatically; mention them in your report.

**3. Write.**

```bash
python dashboard_to_xlsx.py DASHBOARD.html --as-of 2026-08-31
```

The file lands next to the dashboard as `comms-intelligence-data-<cut-off>.xlsx` (or `--out PATH`). Read the last line:

| Last line | Meaning | What you do |
|---|---|---|
| `Recalculated with LibreOffice: 0 formula errors, overview matches, every table adds up to its total.` | Passed | Step 4 |
| `RECONCILIATION FAILED — n problem(s)` | Exit 1. A formula disagrees with the figures computed from `DATA` | Do not hand the file over. Report the listed problems; they point to a script bug or odd data, not something to patch in Excel |
| `LibreOffice not found` | Written, not verified. Formulas compute when opened in Excel | Say so plainly. Give the user the printed headline figures to compare after opening |

**4. Compare with the dashboard.** The script prints headline figures. Open the dashboard with all filters on **(All)** and compare every printed figure the dashboard shows — at least mailings in scope, emails sent, open rate and click-to-open (simple average in both; the weighted rates have no counterpart on the dashboard's Overview), article views and video completion. They must match. If you cannot open a browser, hand the user the printed figures as a checklist. Delete any rendered copy of the dashboard you made; it holds the same data.

**5. Report back.** Where the file is, that it passed (or what did not), every `WARN`, any `--rename` and why.

## What the workbook contains

| Sheet | Contents |
|---|---|
| Overview | Source, year, cut-off, headline figures with their basis (prior-year column if the file has one), sheet index with links, notes |
| Mail / Article / Video / Page / Click summary | Stacked tables by month, division, content type, audience size, pack, theme and so on — the groupings of the dashboard's tabs. Each has a Total row, except any-match tag tables |
| Mail / Article / Video / Page data, Page visitors, Click pages, Click links | One row per record, header in row 1, filter and frozen header: ready for pivots. Codes decoded to labels, tags joined with `; ` |
| Headcount | Internal headcount by month — the reach denominator |
| … data PY | Prior-year records, only if the file carries `DATA.prior` |

Method, as in the dashboard: rates are the simple average of the per-mailing rates with blanks skipped, and the volume-weighted rate sits next to it. Article unique visitors are never added up. Theme and topic tables are any-match. Fields the script does not know are kept as extra columns at the end of their data sheet.

Style (the corporate `xlsx-report` standard, minimal variant): no gridlines, Arial, header without fill in bold 9 pt between thin black rules, no row fills, Total rows bold between 1 pt rules, links blue, no red. Summaries print one page wide.

## Rules

- **The workbook holds real data**, including author names. Keep it where the dashboard lives. Never put it, the dashboard or the extracted `DATA` into a Git repository, a ticket, a chat outside the organisation or a public tool. The script refuses Git folders; `--allow-git` is only for git-ignored folders.
- **Do not paste `DATA` into the conversation** beyond the headline figures. Titles, names and per-record figures stay in the file.
- **Do not hand over a file that failed reconciliation**, and do not "fix" a failing figure in Excel.
- For a new month, run the script again on the new dashboard. Never edit last month's workbook.

---

## Appendix — `dashboard_to_xlsx.py`

Save exactly as `dashboard_to_xlsx.py`. Python 3.8+ with openpyxl. Exit code 1 means errors: nothing was written, or the written file failed reconciliation.

```python
#!/usr/bin/env python3
"""Extract the data of the Comms Intelligence dashboard into a formatted Excel workbook.

    python dashboard_to_xlsx.py DASHBOARD.html [--out OUT.xlsx] [--year YYYY] [--as-of YYYY-MM-DD]
                                [--rename dataset.old=new ...] [--data-json data.json]
                                [--check] [--no-recalc] [--allow-git]

Reads the `const DATA = {...}` block the dashboard carries, checks every field, and writes one
workbook: an overview, a summary sheet per area (mailings, articles, videos, pages, click
tracking) and the records behind each. Every figure on the overview and summary sheets is a
formula on the data sheets. With LibreOffice installed the workbook is recalculated, scanned
for formula errors and reconciled against figures computed here, and the recalculated file
(values cached, so previews show numbers) is the one delivered.

Needs openpyxl. Node.js is used only when DATA is a JavaScript literal rather than JSON.
Exit code 1 = errors found; nothing written, or the written file failed reconciliation.
"""
import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import unquote

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Alignment, Border, Font, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.workbook.defined_name import DefinedName
except ImportError:
    raise SystemExit("openpyxl is required: pip install openpyxl")

# ------------------------------------------------------------------ schema
# (key, column header, kind[, formula]). A formula uses {key} for that column's letter and {row}.
MAIL_COLS = [
    ("t", "Title", "text"), ("m", "Month", "month"), ("q", "Quarter", "quarter"),
    ("div", "Division (KPI reporting)", "text"), ("cc", "Corp Comms scope", "text"),
    ("map", "Corp Comms new mapping", "text"), ("team", "Corp Comms team", "text"),
    ("ct", "Content type", "text"), ("tm", "Template", "text"), ("cl", "Audience size", "text"),
    ("tid", "Tracking ID", "text"), ("pk", "Tracking ID pack", "text"), ("tcl", "Tracking ID cluster", "text"),
    ("th", "Themes", "tags"), ("tp", "Topics", "tags"),
    ("es", "Emails sent", "int"), ("op", "Opens", "int"), ("uc", "Unique clicks", "int"),
    ("ms", "Mailings sent", "int"), ("po", "Open rate", "pct"), ("pc", "Click-to-open", "pct"),
    ("pu", "Click-through", "pct2"),
]
MAIL_DIMS = ["cc", "div", "map", "team", "ct", "tm", "cl", "pk", "tcl", "tid"]
MAIL_ARRAYS = ["q", "m", "t", "es", "op", "uc", "ms", "po", "pc", "pu", "th", "tp"]
ART_COLS = [
    ("t", "Title", "text"), ("ds", "Published", "date"), ("m", "Month", "month"), ("q", "Quarter", "quarter"),
    ("au", "Author", "text"), ("ov", "Overtitle", "text"), ("th", "Theme", "text"), ("tp", "Topic tags", "tags"),
    ("ts", "Top story", "text"), ("rg", "Region (personalization)", "text"), ("ch", "News channel", "text"),
    ("tid", "Tracking ID", "text"), ("pk", "Tracking ID pack", "text"), ("tcl", "Tracking ID cluster", "text"),
    ("v", "Views", "int"), ("uv", "Unique visitors", "int"),
    ("reach", "Reach (UV ÷ headcount of month)", "pct2", 'IFERROR({uv}{row}/VLOOKUP({m}{row},hc_table,2,FALSE),"")'),
    ("li", "Likes", "int"), ("co", "Comments", "int"),
]
VID_COLS = [
    ("t", "Video", "text"), ("div", "Business division owner", "text"), ("m", "Month", "month"),
    ("q", "Quarter", "quarter"), ("lang", "Language", "text"), ("v", "Views", "int"), ("uv", "Unique visitors", "int"),
    ("c1", "Started (1%)", "int"), ("c25", "25% watched", "int"), ("c50", "50% watched", "int"),
    ("c75", "75% watched", "int"), ("c100", "Completed", "int"),
    ("comp", "Completion rate", "pct", 'IFERROR({c100}{row}/{c1}{row},"")'), ("eng", "Engagement score", "dec"),
]
PG_COLS = [
    ("site", "Site", "text"), ("page", "Page", "text"), ("url", "Page URL", "url"),
    ("div", "Business division owner", "text"), ("ct", "Content type tag", "text"), ("ov", "Overtitle", "text"),
    ("th", "Theme tag", "text"), ("tp", "Topic tags", "tags"), ("org", "Target organization", "text"),
    ("rg", "Target region", "text"), ("uv", "Unique visitors", "int"), ("vis", "Visits", "int"), ("v", "Views", "int"),
    ("vpv", "Views per visitor", "mult", 'IFERROR({v}{row}/{uv}{row},"")'),
    ("uvy", "Unique visitors YTD", "int"), ("vy", "Views YTD", "int"), ("li", "Likes", "int"), ("co", "Comments", "int"),
]
PV_COLS = [("split", "Split", "text"), ("sp", "Visitor segment", "text"), ("site", "Site", "text"),
           ("page", "Page", "text"), ("url", "Page URL", "url"), ("uv", "Unique visitors", "int")]
CLK_COLS = [
    ("site", "Site", "text"), ("p", "Page", "text"), ("url", "Page URL", "url"), ("v", "Views", "int"),
    ("uv", "Unique visitors", "int"), ("c", "Clicks", "int"), ("ucl", "Unique clicks", "int"), ("d", "Downloads", "int"),
    ("ctvr", "CTVR", "pct", 'IFERROR({c}{row}/{v}{row},"")'), ("uctuvr", "UCTUVR", "pct", 'IFERROR({ucl}{row}/{uv}{row},"")'),
]
LNK_COLS = [("t", "Link title", "text"), ("site", "Site", "text"), ("p", "Page", "text"), ("url", "Page URL", "url"),
            ("dest", "Destination URL", "url"), ("c", "Clicks", "int"), ("ucl", "Unique clicks", "int"),
            ("d", "Downloads", "int")]
HC_COLS = [("m", "Month", "month"), ("hc", "Internal headcount (Geduld)", "int"), ("hcd", "Headcount (Dashboard)", "int")]

# Fields read from DATA (derived columns such as page, site, reach are not required).
RECORDS = {
    "arts": [c[0] for c in ART_COLS if len(c) == 3],
    "vids": [c[0] for c in VID_COLS if len(c) == 3],
    "pages": ["site", "p", "url", "v", "uv", "c", "ucl", "d"],
    "links": ["t", "p", "url", "dest", "c", "ucl", "d"],
    "pgLevel": [c[0] for c in PG_COLS if len(c) == 3 and c[0] != "page"],
    "pgDiv": ["site", "url", "sp", "uv"],
    "pgReg": ["site", "url", "sp", "uv"],
}
KNOWN_TOP = {"mailP", "hcGeduld", "hcDash", "src", "year", "asOf", "prior", "source", *RECORDS}
NUMERIC = {"int", "pct", "pct2", "dec", "mult", "month", "date"}
FMT = {"int": '#,##0;(#,##0);"–"', "pct": '0.0%;(0.0%);"–"', "pct2": '0.00%;(0.00%);"–"',
       "dec": '0.0;(0.0);"–"', "mult": '0.0"×";(0.0"×");"–"', "month": "mmm yyyy", "date": "dd mmm yyyy"}

# ------------------------------------------------------------------ style (corporate xlsx-report, section 7)
BLACK, GREY, LINK = "FF000000", "FF7A7870", "FF0C7EC6"
F_TITLE = Font(name="Arial", size=14, color=BLACK)
F_SUB = Font(name="Arial", size=9, color=GREY)
F_BLOCK = Font(name="Arial", size=10, bold=True, color=BLACK)
F_HEAD = Font(name="Arial", size=9, bold=True, color=BLACK)
F_BODY = Font(name="Arial", size=10, color=BLACK)
F_BOLD = Font(name="Arial", size=10, bold=True, color=BLACK)
F_LINK = Font(name="Arial", size=10, color=LINK, underline="single")
THIN, MED = Side(style="thin", color=BLACK), Side(style="medium", color=BLACK)
B_HEAD, B_FOOT, B_TOTAL = Border(top=THIN, bottom=THIN), Border(bottom=THIN), Border(top=MED, bottom=MED)
A_L = Alignment(horizontal="left", vertical="top")
A_R = Alignment(horizontal="right", vertical="top")
A_HL = Alignment(horizontal="left", vertical="top", wrap_text=True)
A_HR = Alignment(horizontal="right", vertical="top", wrap_text=True)
A_IND = Alignment(horizontal="left", vertical="top", indent=2)


class Report:
    def __init__(self):
        self.errors, self.warnings, self.notes = [], [], []

    def err(self, m): self.errors.append(m)
    def warn(self, m): self.warnings.append(m)
    def note(self, m): self.notes.append(m)

    def print(self):
        for tag, items in (("ERROR", self.errors), ("WARN ", self.warnings), ("note ", self.notes)):
            for m in items:
                print(f"  {tag}  {m}")


# ------------------------------------------------------------------ extraction
def _skip_ws_comments(s, i):
    while i < len(s):
        if s[i].isspace():
            i += 1
        elif s.startswith("/*", i):
            j = s.find("*/", i + 2)
            i = len(s) if j < 0 else j + 2
        elif s.startswith("//", i):
            j = s.find("\n", i)
            i = len(s) if j < 0 else j + 1
        else:
            break
    return i


def _expression_end(s, i):
    """Index of the ';' (or '</script>') that ends the expression starting at i; string- and bracket-aware."""
    depth, n = 0, len(s)
    while i < n:
        c = s[i]
        if c in "\"'`":
            q, i = c, i + 1
            while i < n and s[i] != q:
                i += 2 if s[i] == "\\" else 1
        elif c in "{[(":
            depth += 1
        elif c in "}])":
            depth -= 1
        elif depth == 0 and (c == ";" or s.startswith("</script", i)):
            return i
        i += 1
    return n


def extract_data(html, label):
    m = re.search(r"\b(?:const|let|var)\s+DATA\s*=", html)
    if not m:
        raise SystemExit(f"{label}: no `const DATA = ...` found. Is this the dashboard file (not a screenshot/PDF export)?")
    start = _skip_ws_comments(html, m.end())
    expr = html[start:_expression_end(html, start)].strip()
    if expr in ("", "null"):
        raise SystemExit(f"{label}: DATA is empty (null) — this is an unfilled template, not a dashboard with data.")
    try:
        return json.loads(expr), "json"
    except json.JSONDecodeError:
        pass
    node = shutil.which("node")
    if not node:
        raise SystemExit(f"{label}: DATA is a JavaScript literal, not JSON, and Node.js is not installed to read it. "
                         "Open the dashboard in a browser, run copy(JSON.stringify(DATA)) in the developer console, "
                         "paste into data.json and pass --data-json data.json.")
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write("const DATA = (" + expr + ");\nprocess.stdout.write(JSON.stringify(DATA));\n")
        tmp = f.name
    try:
        out = subprocess.run([node, tmp], capture_output=True, text=True, encoding="utf-8", timeout=120)
    finally:
        Path(tmp).unlink(missing_ok=True)
    if out.returncode != 0:
        raise SystemExit(f"{label}: Node could not evaluate DATA:\n{out.stderr[:800]}")
    return json.loads(out.stdout), "js-literal via node"


def source_from_original(html):
    txt = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", html)
    txt = re.sub(r"&middot;", "·", re.sub(r"&amp;", "&", re.sub(r"(?s)<[^>]+>", "\n", txt)))
    parts = []
    for lab in ("Source", "Pack names"):
        m = re.search(rf"{lab}:\s*([^\n]+)", txt)
        if m and m.group(1).strip():
            parts.append(("" if lab == "Source" else f"{lab}: ") + m.group(1).strip())
    return " · ".join(parts) or None


def apply_renames(data, renames, rep):
    for r in renames:
        m = re.fullmatch(r"(?:([A-Za-z]+)\.)?([A-Za-z0-9_]+)=([A-Za-z0-9_]+)", r)
        if not m:
            raise SystemExit(f"--rename {r!r}: use dataset.old=new (e.g. arts.views=v) or old=new for a top-level key")
        ds, old, new = m.groups()
        if ds is None:
            if old in data:
                data[new] = data.pop(old)
                rep.note(f"renamed top-level {old} -> {new}")
            else:
                rep.err(f"--rename {r}: top-level key {old!r} not found")
            continue
        target = data.get(ds)
        if ds == "mailP" and isinstance(target, dict):
            hit = False
            for d in (target, target.get("cols", {}), target.get("dims", {})):
                if old in d:
                    d[new] = d.pop(old)
                    hit = True
            (rep.note if hit else rep.err)(f"--rename {r}: " + ("done" if hit else f"{old!r} not in mailP"))
        elif isinstance(target, list):
            n = sum(1 for x in target if isinstance(x, dict) and old in x)
            for x in target:
                if isinstance(x, dict) and old in x:
                    x[new] = x.pop(old)
            (rep.note if n else rep.err)(f"--rename {r}: {n} of {len(target)} records")
        else:
            rep.err(f"--rename {r}: dataset {ds!r} not found")


def infer_year(data):
    years = Counter()
    for k in (data.get("hcGeduld") or {}):
        if re.match(r"\d{4}-\d{2}$", str(k)):
            years[int(k[:4])] += 1
    for a in data.get("arts") or []:
        m = re.search(r"\b(20\d\d)\b", str(a.get("ds", "")) if isinstance(a, dict) else "")
        if m:
            years[int(m.group(1))] += 1
    return years.most_common(1)[0][0] if years else None


# ------------------------------------------------------------------ checks
def check_mail(P, rep, where="mailP"):
    if not isinstance(P, dict):
        rep.err(f"{where} missing or not an object")
        return
    n = len(P.get("es") or [])
    for k in MAIL_ARRAYS:
        if k not in P:
            rep.err(f"{where}.{k} missing")
        elif not isinstance(P[k], list) or len(P[k]) != n:
            rep.err(f"{where}.{k} has {len(P[k]) if isinstance(P[k], list) else 'no'} entries, expected {n} (length of es)")
    cols, dims = P.get("cols") or {}, P.get("dims") or {}
    for k in MAIL_DIMS:
        if k not in cols or k not in dims:
            rep.err(f"{where}.cols/dims.{k} missing")
            continue
        if len(cols[k]) != n:
            rep.err(f"{where}.cols.{k} has {len(cols[k])} entries, expected {n}")
        bad = sum(1 for x in cols[k] if not isinstance(x, int) or not 0 <= x < len(dims[k]))
        if bad:
            rep.err(f"{where}.cols.{k}: {bad} index values point outside dims.{k} ({len(dims[k])} labels)")
    for k in ("es", "op", "uc", "ms"):
        bad = sum(1 for x in P.get(k) or [] if not isinstance(x, (int, float)))
        if bad:
            rep.err(f"{where}.{k}: {bad} non-numeric values")
    bad = sum(1 for x in P.get("m") or [] if not (isinstance(x, int) and 1 <= x <= 12))
    if bad:
        rep.warn(f"{where}.m: {bad} records without a valid month — they are in the totals but in no month row")


def check_records(data, rep, names, where=""):
    for ds in names:
        recs = data.get(ds)
        if not isinstance(recs, list):
            rep.err(f"{where}{ds} missing or not a list")
            continue
        if not recs:
            rep.warn(f"{where}{ds} is empty — its sheet will have headers only")
            continue
        missing = Counter(f for r in recs for f in RECORDS[ds] if not isinstance(r, dict) or f not in r)
        for f, c in missing.items():
            rep.err(f"{where}{ds}: field {f!r} missing in {c} of {len(recs)} records")


def check_all(data, rep):
    check_mail(data.get("mailP"), rep)
    check_records(data, rep, RECORDS)
    if not isinstance(data.get("hcGeduld"), dict) or not data.get("hcGeduld"):
        rep.err("hcGeduld (internal headcount by month) missing — article reach cannot be calculated")
    if "src" not in data:
        rep.warn("src missing — the overview cannot show 'rows of rows in the source export'")
    extra = sorted(set(data) - KNOWN_TOP)
    if extra:
        rep.warn(f"top-level keys not exported (unknown to this script): {', '.join(extra)}")


def late(data, cut, year, rep):
    """Records dated after the cut-off: kept (the dashboard shows them too), but worth a mention."""
    after = lambda m: isinstance(m, int) and (year > cut.year or (year == cut.year and m > cut.month))
    n_mail = sum(1 for m in data["mailP"]["m"] if after(m))
    n_art = sum(1 for a in data["arts"] if isinstance(parse_date(a.get("ds")), dt.date) and parse_date(a["ds"]) > cut)
    n_vid = sum(1 for v in data["vids"] if after(v.get("m")))
    for n, what in ((n_mail, "mailings in a month"), (n_art, "articles published"), (n_vid, "videos in a month")):
        if n:
            rep.warn(f"{n} {what} after the cut-off {cut.isoformat()} — included, as in the dashboard")


def case_collisions(values):
    seen = defaultdict(set)
    for v in values:
        if isinstance(v, str):
            seen[v.casefold()].add(v)
    return [sorted(s) for s in seen.values() if len(s) > 1]


# ------------------------------------------------------------------ records
def parse_date(s):
    if not isinstance(s, str) or not s.strip():
        return None
    for f in ("%d %b %Y", "%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%b %d, %Y", "%d %B %Y"):
        try:
            return dt.datetime.strptime(s.strip(), f).date()
        except ValueError:
            pass
    return s


def conv(v, kind, year):
    if kind == "tags":
        if isinstance(v, list):
            return "; ".join(str(x) for x in v if x not in (None, "")) or None
        return v or None
    if v is None or v == "":
        return None
    if kind == "month":
        return dt.date(year, v, 1) if isinstance(v, int) and 1 <= v <= 12 else v
    if kind == "quarter":
        return f"Q{v}" if isinstance(v, int) else v
    if kind == "date":
        return parse_date(v)
    if isinstance(v, (list, dict)):
        return "; ".join(map(str, v)) if isinstance(v, list) else json.dumps(v, ensure_ascii=False)
    return v


def short(u):
    s = re.sub(r"^https?://", "", str(u or "")).rstrip("/")
    p = s.split("/")
    return unquote(p[-1] or (p[-2] if len(p) > 1 else s)) if s else None


def mail_records(P):
    n, dims, cols = len(P["es"]), P["dims"], P["cols"]
    extra_arr = [k for k, v in P.items() if k not in MAIL_ARRAYS + ["cols", "dims"] and isinstance(v, list) and len(v) == n]
    extra_dim = [k for k in cols if k not in MAIL_DIMS and k in dims]
    recs = []
    for i in range(n):
        r = {k: P[k][i] for k in MAIL_ARRAYS}
        r.update({k: dims[k][cols[k][i]] for k in MAIL_DIMS + extra_dim})
        r.update({f"x_{k}": P[k][i] for k in extra_arr})
        recs.append(r)
    return recs, [(f"x_{k}", k) for k in extra_arr] + [(k, k) for k in extra_dim]


def with_extras(cols, recs, known):
    extra = sorted({k for r in recs[:500] if isinstance(r, dict) for k in r} - set(known))
    return cols + [(k, k, "raw") for k in extra], extra


# ------------------------------------------------------------------ workbook helpers
def finish(ws, landscape=True, fit=True):
    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    if fit:  # summaries print one page wide; wide data sheets print across pages at full size
        ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True


def put(ws, r, c, v, kind="text", font=F_BODY, border=None, literal=False):
    cell = ws.cell(r, c, v)
    if literal and isinstance(v, str) and v.startswith("="):
        cell.data_type = "s"  # data that happens to start with '=' stays text, never becomes a formula
    cell.font = font
    cell.alignment = A_R if kind in NUMERIC else A_L
    if kind in FMT:
        cell.number_format = FMT[kind]
    if border:
        cell.border = border
    return cell


def define(wb, name, sheet, col, n):
    wb.defined_names[name] = DefinedName(name, attr_text=f"'{sheet}'!${col}$2:${col}${max(2, n + 1)}")


def data_sheet(wb, title, prefix, cols, recs, year):
    """One record per row, header in row 1 (filter- and pivot-ready). Names prefix_key cover each column."""
    ws = wb.create_sheet(title)
    letters = {c[0]: get_column_letter(i) for i, c in enumerate(cols, 1)}
    for i, c in enumerate(cols, 1):
        cell = put(ws, 1, i, c[1], font=F_HEAD, border=B_HEAD)
        cell.alignment = A_HR if c[2] in NUMERIC else A_HL
    ws.row_dimensions[1].height = 26
    for row, rec in enumerate(recs, 2):
        for i, c in enumerate(cols, 1):
            key, kind = c[0], c[2]
            formula = len(c) > 3
            v = "=" + c[3].format_map(dict(letters, row=row)) if formula else conv(rec.get(key), kind, year)
            cell = put(ws, row, i, v, kind, literal=not formula)
            if kind == "url" and isinstance(v, str) and v.startswith("http"):
                cell.hyperlink, cell.font = v, F_LINK
    n = len(recs)
    if n:
        for i in range(1, len(cols) + 1):
            ws.cell(n + 1, i).border = B_FOOT
    for key, col in letters.items():
        if re.fullmatch(r"[A-Za-z0-9]+", key):
            define(wb, f"{prefix}_{key}", title, col, n)
    ws.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{max(1, n + 1)}"
    ws.freeze_panes = "B2"
    ws.print_title_rows = "1:1"
    for i, c in enumerate(cols, 1):
        sample = [ws.cell(r, i).value for r in range(2, min(n, 300) + 2)]
        w = max([len(str(v)) for v in sample if v is not None and not str(v).startswith("=")] + [8])
        if c[2] == "month":
            w = 9
        elif c[2] == "date":
            w = 11
        elif c[2] in NUMERIC:
            w = max(10, min(w, 14))
        ws.column_dimensions[get_column_letter(i)].width = min(max(w, min(len(c[1]), 16)) + 2, 60)
    finish(ws, fit=False)
    return ws


def lit(v):
    """Criteria literal for COUNTIFS/SUMIFS: exact match, wildcards escaped, blank matches empty cells."""
    if v is None or v == "":
        return '"="'
    if isinstance(v, dt.date):
        return f"DATE({v.year},{v.month},{v.day})"
    s = str(v).replace("~", "~~").replace("*", "~*").replace("?", "~?").replace('"', '""')
    return f'"={s}"'


class Match:
    """Formula fragments that select one group of records: a single-valued column, a tag list, or all.

    COUNTIFS/SUMIFS/AVERAGEIFS where possible (readable). Tag lists ("; "-joined) and columns whose labels
    differ only in case (Excel criteria ignore case) use SUMPRODUCT with FIND/EXACT, which match exactly.
    """
    exact = set()  # range names with case-only label differences, filled in build()

    def __init__(self, rng=None, value=None, tag=False, base=()):
        self.rng, self.value, self.tag, self.base = rng, value, tag, list(base)
        self.array = tag or (rng in Match.exact)

    def _crit(self):
        pairs = [(a, lit(v)) for a, v in self.base] + ([(self.rng, lit(self.value))] if self.rng else [])
        return ",".join(f"{a},{b}" for a, b in pairs)

    def _terms(self):
        q = lambda v: str(v).replace('"', '""')
        terms = [f'--({a}="{q(v)}")' for a, v in self.base]
        if self.value is None:
            terms.append(f'--({self.rng}="")')
        elif self.tag:
            terms.append(f'--ISNUMBER(FIND("; {q(self.value)}; ","; "&{self.rng}&"; "))')
        else:
            terms.append(f'--EXACT({self.rng},"{q(self.value)}")')
        return ",".join(terms)

    def count(self, any_col):
        if self.array:
            return f"=SUMPRODUCT({self._terms()})"
        return f"=COUNTIFS({self._crit()})" if self._crit() else f"=COUNT({any_col})"

    def sum(self, x):
        if self.array:
            return f"=SUMPRODUCT({self._terms()},{x})"
        return f"=SUMIFS({x},{self._crit()})" if self._crit() else f"=SUM({x})"

    def avg(self, x):
        """Mean of the non-blank values — the dashboard's simple average."""
        if self.array:
            t = self._terms()
            return f'=IFERROR(SUMPRODUCT({t},{x})/SUMPRODUCT({t},--ISNUMBER({x})),"")'
        return f'=IFERROR(AVERAGEIFS({x},{self._crit()}),"")' if self._crit() else f'=IFERROR(AVERAGE({x}),"")'


ALL = Match()


class Summary:
    """A sheet of stacked, titled tables. Records which columns must add up to the Total row."""

    def __init__(self, wb, title, heading, subtitle, spec, label_width=38, ncols=12):
        self.ws, self.sums, self.cells, self.r = wb.create_sheet(title), spec["sums"], spec["cells"], 4
        self.label_width = label_width
        put(self.ws, 1, 1, heading, font=F_TITLE)
        put(self.ws, 2, 1, subtitle, font=F_SUB)
        self.ws.column_dimensions["A"].width = label_width
        for i in range(2, ncols + 2):
            self.ws.column_dimensions[get_column_letter(i)].width = 13
        finish(self.ws)

    def block(self, title, headers, kinds, rows, total=None, note=None, additive=(), expect=None):
        """rows: [(label, build)] with build(row_number) -> list of cell values/formulas for columns B..
        expect: values column B must show (checked after recalculation) — used where no Total row exists."""
        ws = self.ws
        put(ws, self.r, 1, title, font=F_BLOCK)
        self.r += 1
        for i, h in enumerate(headers, 1):
            put(ws, self.r, i, h, font=F_HEAD, border=B_HEAD).alignment = A_HR if i > 1 and kinds[i - 1] in NUMERIC else A_HL
        widths = [self.label_width] + [13] * (len(headers) - 1)
        lines = max(-(-len(h) // int(w * 1.15)) for h, w in zip(headers, widths))  # wrapped header lines
        ws.row_dimensions[self.r].height = 12 * max(1, lines) + 4
        self.r += 1
        first = self.r
        for n, (label, build) in enumerate(rows):
            if expect is not None:
                self.cells.append((ws.title, f"B{self.r}", f"{title} · {label}", expect[n]))
            for i, v in enumerate([label] + build(self.r), 1):
                put(ws, self.r, i, v, kinds[i - 1], literal=i == 1).alignment = A_L if i == 1 else A_R
            self.r += 1
        last = self.r - 1
        if total:
            for i, v in enumerate(["Total"] + total(self.r), 1):
                put(ws, self.r, i, v, "text" if i == 1 else kinds[i - 1], font=F_BOLD, border=B_TOTAL)
            if additive and rows:
                self.sums.append((ws.title, title, [get_column_letter(c) for c in additive], first, last, self.r))
            self.r += 1
        elif rows:
            for i in range(1, len(headers) + 1):
                ws.cell(last, i).border = B_FOOT
        if note:
            put(ws, self.r, 1, note, font=F_SUB)
            self.r += 1
        self.r += 2


def tag_count(recs, key, v):
    return sum(1 for r in recs if (v in (r.get(key) or []) if v is not None else not r.get(key)))


def grouped(recs, key, weight, blank_label, order="weight", tag=False):
    """(value, label) pairs present in the data, ordered for reading; blanks last."""
    w = defaultdict(float)
    for r in recs:
        vals = r.get(key)
        vals = (vals or [None]) if tag else [vals if vals not in ("", None) else None]
        for v in vals:
            w[v] += r.get(weight) or 0
    keys = [k for k in w if k is not None]
    if order == "weight":
        keys.sort(key=lambda k: (-w[k], str(k)))
    else:
        keys.sort(key=lambda k: (str(type(k)), k))
    out = [(k, k) for k in keys]
    if None in w:
        out.append((None, blank_label))
    return out


# ------------------------------------------------------------------ build
def build(data, year, meta, rep):
    wb = Workbook()
    ov = wb.active
    ov.title = "Overview"
    spec, P = {"sums": [], "cells": []}, data["mailP"]
    mrecs, mextra = mail_records(P)
    for _, k in mextra:
        rep.note(f"mailP.{k}: not a known field — exported as an extra column on 'Mail data'")
    mcols = MAIL_COLS + [(key, head, "raw") for key, head in mextra]
    mrecs.sort(key=lambda r: (r["m"] if isinstance(r["m"], int) else 99, -(r["es"] or 0)))

    arts = sorted(data["arts"], key=lambda a: (a.get("m") if isinstance(a.get("m"), int) else 99, -(a.get("v") or 0)))
    acols, aextra = with_extras(ART_COLS, arts, RECORDS["arts"] + ["reach"])
    vids = sorted(data["vids"], key=lambda v: (v.get("m") if isinstance(v.get("m"), int) else 99, -(v.get("v") or 0)))
    vcols, vextra = with_extras(VID_COLS, vids, RECORDS["vids"] + ["comp"])
    pgl = sorted(({**p, "page": short(p.get("url"))} for p in data["pgLevel"]), key=lambda p: -(p.get("uv") or 0))
    gcols, gextra = with_extras(PG_COLS, pgl, RECORDS["pgLevel"] + ["page", "vpv"])
    pv = [{"split": "Visitor division", **p, "page": short(p.get("url"))} for p in data["pgDiv"]] + \
         [{"split": "Visitor region", **p, "page": short(p.get("url"))} for p in data["pgReg"]]
    pv.sort(key=lambda p: (p["split"], str(p.get("sp")), -(p.get("uv") or 0)))
    clk = sorted(data["pages"], key=lambda p: -(p.get("v") or 0))
    ccols, cextra = with_extras(CLK_COLS, clk, RECORDS["pages"] + ["ctvr", "uctuvr"])
    site_of = {p.get("url"): p.get("site") for p in data["pages"]}
    lnk = sorted(({**l, "site": site_of.get(l.get("url"))} for l in data["links"]),
                 key=lambda l: (str(l.get("site")), str(l.get("p")), -(l.get("c") or 0)))
    lcols, lextra = with_extras(LNK_COLS, lnk, RECORDS["links"] + ["site"])
    for ds, ex in (("arts", aextra), ("vids", vextra), ("pgLevel", gextra), ("pages", cextra), ("links", lextra)):
        if ex:
            rep.note(f"{ds}: fields not known to this script, exported as extra columns: {', '.join(ex)}")
    unmatched = sum(1 for l in lnk if l["site"] is None)
    if unmatched:
        rep.warn(f"links: {unmatched} links point to a page URL not in the click-tracking pages — no site assigned")
    hcg, hcd = data.get("hcGeduld") or {}, data.get("hcDash") or {}
    hc = []
    for k in sorted(set(hcg) | set(hcd)):
        mm = re.fullmatch(r"(\d{4})-(\d{2})", str(k))
        if mm:
            hc.append({"m": int(mm.group(2)), "y": int(mm.group(1)), "hc": hcg.get(k), "hcd": hcd.get(k)})

    Match.exact = set()
    for prefix, recs in (("mail", mrecs), ("art", arts), ("vid", vids), ("pg", pgl), ("pv", pv), ("clk", clk), ("lnk", lnk)):
        for key in {k for r in recs[:1] for k in r}:
            for c in case_collisions(r.get(key) for r in recs):
                Match.exact.add(f"{prefix}_{key}")
                rep.note(f"{prefix} {key}: labels differ only in case ({' / '.join(c)}) — kept apart, matched exactly")

    # ---- summary sheets first (tab order), data sheets after
    mail_sum = Summary(wb, "Mail summary", "Mailings",
                       "Formulas on 'Mail data'. Open rate, click-to-open and click-through: simple average of the "
                       "per-mailing rates, blanks skipped — the dashboard's method. Weighted: Σ opens ÷ Σ emails sent, "
                       "Σ unique clicks ÷ Σ opens.", spec)
    mh = ["", "Records", "Mailings sent", "Emails sent", "Avg audience", "Opens", "Unique clicks", "Open rate",
          "Click-to-open", "Click-through", "Open rate (weighted)", "Click-to-open (weighted)"]
    mk = ["text", "int", "int", "int", "int", "int", "int", "pct", "pct", "pct2", "pct", "pct"]

    def mail_row(M):
        return lambda r: [M.count("mail_es"), M.sum("mail_ms"), M.sum("mail_es"), f'=IFERROR(D{r}/C{r},"")',
                          M.sum("mail_op"), M.sum("mail_uc"), M.avg("mail_po"), M.avg("mail_pc"), M.avg("mail_pu"),
                          f'=IFERROR(F{r}/D{r},"")', f'=IFERROR(G{r}/F{r},"")']

    mail_blocks = [("m", "By month", "Month", "(No month)", "time"), ("q", "By quarter", "Quarter", "(No quarter)", "time"),
                   ("div", "By division (KPI reporting)", "Division", "(Blank)", "weight"),
                   ("cc", "By Corp Comms scope", "Corp Comms scope", "(Blank)", "weight"),
                   ("map", "By Corp Comms new mapping", "Mapping", "(Blank)", "weight"),
                   ("team", "By Corp Comms team", "Team", "(Blank)", "weight"),
                   ("ct", "By content type", "Content type", "(Blank)", "weight"),
                   ("tm", "By template", "Template", "(Blank)", "weight"),
                   ("cl", "By audience size", "Audience size (recipients per mailing)", "(Blank)", "label"),
                   ("pk", "By tracking ID pack", "Tracking ID pack", "(No pack)", "weight"),
                   ("tcl", "By tracking ID cluster", "Tracking ID cluster", "(No tracking ID)", "weight")]
    mview = [{**r, "m": conv(r["m"], "month", year), "q": conv(r["q"], "quarter", year)} for r in mrecs]
    for key, title, head, blank, order in mail_blocks:
        groups = grouped(mview, key, "es", blank, "label" if order in ("time", "label") else "weight")
        kinds = (["month"] if key == "m" else ["text"]) + mk[1:]
        mail_sum.block(title, [head] + mh[1:], kinds,
                       [(lab, mail_row(Match(f"mail_{key}", v))) for v, lab in groups],
                       total=mail_row(ALL), additive=(2, 3, 4, 6, 7))
    for key, title, head in (("th", "By theme (any match)", "Theme"), ("tp", "By topic (any match)", "Topic")):
        groups = grouped(mrecs, key, "es", "(Untagged)", tag=True)
        mail_sum.block(title, [head] + mh[1:], mk, [(lab, mail_row(Match(f"mail_{key}", v, tag=True))) for v, lab in groups],
                       expect=[tag_count(mrecs, key, v) for v, _ in groups],
                       note="Any match: a mailing with several tags counts under each, so these rows add up to more "
                            "than the total.")

    art_sum = Summary(wb, "Article summary", "Articles",
                      "Formulas on 'Article data'. Unique visitors are per article and are never added up — the same "
                      "person reading three articles would count three times. Reach = unique visitors ÷ internal "
                      "headcount (Geduld) of the publishing month.", spec)
    ah = ["", "Articles", "Views", "Avg views per article", "Avg unique visitors per article", "Likes", "Comments"]
    ak = ["text", "int", "int", "int", "int", "int", "int"]

    def art_row(M):
        return lambda r: [M.count("art_v"), M.sum("art_v"), f'=IFERROR(C{r}/B{r},"")', M.avg("art_uv"),
                          M.sum("art_li"), M.sum("art_co")]

    def art_month(v):
        d = lit(v)
        return lambda r: [f"=COUNTIFS(art_m,{d})", f"=SUMIFS(art_v,art_m,{d})", f'=IFERROR(C{r}/B{r},"")',
                          f'=IFERROR(AVERAGEIFS(art_uv,art_m,{d}),"")', f'=IFERROR(VLOOKUP({d},hc_table,2,FALSE),"")',
                          f'=IFERROR(E{r}/F{r},"")', f'=IFERROR(SUMPRODUCT(MAX((art_m={d})*art_uv))/F{r},"")']

    aview = [{**a, "m": conv(a.get("m"), "month", year)} for a in arts]
    months = [(v, lab) for v, lab in grouped(aview, "m", "v", "(No month)", "label") if v is not None]
    art_sum.block("By month", ["Month", "Articles", "Views", "Avg views per article", "Avg unique visitors per article",
                               "Internal headcount", "Average article reach", "Best article reach"],
                  ["month", "int", "int", "int", "int", "int", "pct2", "pct2"], [(v, art_month(v)) for v, _ in months],
                  total=lambda r: ["=COUNT(art_v)", "=SUM(art_v)", f'=IFERROR(C{r}/B{r},"")',
                                   '=IFERROR(AVERAGE(art_uv),"")', "", "", ""], additive=(2, 3))
    for key, title, head in (("th", "By theme", "Theme"), ("ch", "By news channel", "News channel"),
                             ("au", "By author", "Author"), ("ov", "By overtitle", "Overtitle"),
                             ("rg", "By region (personalization)", "Region"), ("ts", "By top story", "Top story"),
                             ("pk", "By tracking ID pack", "Tracking ID pack"),
                             ("tcl", "By tracking ID cluster", "Tracking ID cluster")):
        blank = {"pk": "(No pack)", "tcl": "(No tracking ID)", "ts": "(Not a top story)"}.get(key, "(Blank)")
        art_sum.block(title, [head] + ah[1:], ak,
                      [(lab, art_row(Match(f"art_{key}", v))) for v, lab in grouped(arts, key, "v", blank)],
                      total=art_row(ALL), additive=(2, 3, 6, 7))
    tgroups = grouped(arts, "tp", "v", "(Untagged)", tag=True)
    art_sum.block("By topic tag (any match)", ["Topic"] + ah[1:], ak,
                  [(lab, art_row(Match("art_tp", v, tag=True))) for v, lab in tgroups],
                  expect=[tag_count(arts, "tp", v) for v, _ in tgroups],
                  note="Any match: an article with several topic tags counts under each.")

    vid_sum = Summary(wb, "Video summary", "Videos",
                      "Formulas on 'Video data'. Completion rate = completed ÷ started views (views reaching 1%), "
                      "the workbook's definition. Engagement score: simple average across videos.", spec)
    vid_sum.block("Watch funnel", ["Stage", "Views", "Share of started"], ["text", "int", "pct"],
                  [(lab, (lambda c: lambda r: [f"=SUM(vid_{c})", f'=IFERROR(B{r}/SUM(vid_c1),"")'])(c))
                   for c, lab in (("c1", "Started (1%)"), ("c25", "25% watched"), ("c50", "50% watched"),
                                  ("c75", "75% watched"), ("c100", "Completed"))])
    vh = ["", "Videos", "Views", "Unique visitors", "Started", "Completed", "Completion rate", "Avg engagement score"]
    vk = ["text", "int", "int", "int", "int", "int", "pct", "dec"]

    def vid_row(M):
        return lambda r: [M.count("vid_v"), M.sum("vid_v"), M.sum("vid_uv"), M.sum("vid_c1"), M.sum("vid_c100"),
                          f'=IFERROR(F{r}/E{r},"")', M.avg("vid_eng")]

    vview = [{**v, "m": conv(v.get("m"), "month", year)} for v in vids]
    for key, title, head, order in (("m", "By month", "Month", "label"), ("div", "By business division owner", "Owner", "weight"),
                                    ("lang", "By language", "Language", "weight")):
        vid_sum.block(title, [head] + vh[1:], (["month"] if key == "m" else ["text"]) + vk[1:],
                      [(lab, vid_row(Match(f"vid_{key}", v))) for v, lab in grouped(vview, key, "v", "(Blank)", order)],
                      total=vid_row(ALL), additive=(2, 3, 4, 5, 6))

    pg_sum = Summary(wb, "Page summary", "Pages",
                     "Formulas on 'Page data' and 'Page visitors'. Visitor splits come from the page-level export "
                     "split by visitor division and region.", spec)
    for split, title, head, src in (("Visitor division", "Unique visitors by visitor division", "Visitor division", "pgDiv"),
                                    ("Visitor region", "Unique visitors by visitor region", "Visitor region", "pgReg")):
        base = [("pv_split", split)]
        pg_sum.block(title, [head, "Pages with these visitors", "Unique visitors"], ["text", "int", "int"],
                     [(lab, (lambda M: lambda r: [M.count("pv_uv"), M.sum("pv_uv")])(Match("pv_sp", v, base=base)))
                      for v, lab in grouped(data[src], "sp", "uv", "(Blank)")],
                     total=(lambda M: lambda r: ["", M.sum("pv_uv")])(Match(base=base)), additive=(3,))
    gh = ["", "Pages", "Unique visitors", "Avg unique visitors per page", "Visits", "Views", "Views per visitor"]
    gk = ["text", "int", "int", "int", "int", "int", "mult"]

    def pg_row(M):
        return lambda r: [M.count("pg_uv"), M.sum("pg_uv"), f'=IFERROR(C{r}/B{r},"")', M.sum("pg_vis"), M.sum("pg_v"),
                          f'=IFERROR(F{r}/C{r},"")']

    for key, title, head in (("site", "By site", "Site"), ("th", "By theme tag", "Theme tag"),
                             ("ct", "By content type tag", "Content type tag"),
                             ("div", "By business division owner", "Division owner"),
                             ("rg", "By target region", "Target region"), ("org", "By target organization", "Target organization")):
        pg_sum.block(title, [head] + gh[1:], gk,
                     [(lab, pg_row(Match(f"pg_{key}", v))) for v, lab in grouped(pgl, key, "uv", "(Blank)")],
                     total=pg_row(ALL), additive=(2, 3, 5, 6))

    clk_sum = Summary(wb, "Click summary", "Click tracking",
                      "Formulas on 'Click pages' and 'Click links'. Cumulative export without a date dimension. "
                      "CTVR = clicks ÷ views; UCTUVR = unique clicks ÷ unique visitors.", spec)

    def clk_row(M, L):
        return lambda r: [M.count("clk_v"), M.sum("clk_v"), M.sum("clk_uv"), M.sum("clk_c"), M.sum("clk_ucl"),
                          M.sum("clk_d"), f'=IFERROR(E{r}/C{r},"")', f'=IFERROR(F{r}/D{r},"")', L.count("lnk_c"),
                          L.sum("lnk_c")]

    clk_sum.block("By site", ["Site", "Pages", "Views", "Unique visitors", "Clicks", "Unique clicks", "Downloads", "CTVR",
                              "UCTUVR", "Tracked links", "Link clicks"],
                  ["text", "int", "int", "int", "int", "int", "int", "pct", "pct", "int", "int"],
                  [(lab, clk_row(Match("clk_site", v), Match("lnk_site", v))) for v, lab in grouped(clk, "site", "v", "(Blank)")],
                  total=clk_row(ALL, ALL), additive=(2, 3, 4, 5, 6, 7))

    data_sheet(wb, "Mail data", "mail", mcols, mrecs, year)
    data_sheet(wb, "Article data", "art", acols, arts, year)
    data_sheet(wb, "Video data", "vid", vcols, vids, year)
    data_sheet(wb, "Page data", "pg", gcols, pgl, year)
    data_sheet(wb, "Page visitors", "pv", PV_COLS, pv, year)
    data_sheet(wb, "Click pages", "clk", ccols, clk, year)
    data_sheet(wb, "Click links", "lnk", lcols, lnk, year)
    hws = data_sheet(wb, "Headcount", "hc", HC_COLS, [], year)
    for row, h in enumerate(hc, 2):
        put(hws, row, 1, dt.date(h["y"], h["m"], 1), "month")
        put(hws, row, 2, h["hc"], "int")
        put(hws, row, 3, h["hcd"], "int")
    for i in range(1, 4):
        hws.cell(len(hc) + 1, i).border = B_FOOT
    hws.auto_filter.ref = f"A1:C{len(hc) + 1}"
    for key, col in (("m", "A"), ("hc", "B"), ("hcd", "C")):
        define(wb, f"hc_{key}", "Headcount", col, len(hc))
    wb.defined_names["hc_table"] = DefinedName("hc_table", attr_text=f"'Headcount'!$A$2:$C${max(2, len(hc) + 1)}")

    prior = data.get("prior") if isinstance(data.get("prior"), dict) else None
    if prior:
        py = int(prior.get("year") or year - 1)
        pm, _ = mail_records(prior["mailP"])
        data_sheet(wb, "Mail data PY", "pmail", MAIL_COLS, pm, py)
        data_sheet(wb, "Article data PY", "part", ART_COLS[:16] + ART_COLS[17:], prior.get("arts") or [], py)
        data_sheet(wb, "Video data PY", "pvid", VID_COLS, prior.get("vids") or [], py)

    expected = overview(wb, ov, data, meta, prior, year)
    wb.calculation.fullCalcOnLoad = True
    spec["overview"] = expected
    return wb, spec


def overview(wb, ws, data, meta, prior, year):
    """Header, headline figures (formulas) with the values computed here for reconciliation, sheet guide, notes."""
    P, src = data["mailP"], data.get("src") or {}
    mean = lambda xs: sum(xs) / len(xs) if xs else None
    div = lambda a, b: a / b if b else None
    arts, vids, pgl, clk = data["arts"], data["vids"], data["pgLevel"], data["pages"]
    S = lambda recs, k: sum(r.get(k) or 0 for r in recs)
    nn = lambda xs: [x for x in xs if x is not None]
    of = lambda n, k: f"{n:,} of {src[k]:,} rows in the source export" if isinstance(src.get(k), (int, float)) else f"{n:,} rows"
    rows = [
        ("Mailings", None, None, None, None),
        ("Mailing records", "=COUNT(mail_es)", len(P["es"]), "int", of(len(P["es"]), "mail")),
        ("Mailings sent (incl. resends)", "=SUM(mail_ms)", sum(P["ms"]), "int", "Σ mailings sent"),
        ("Emails sent", "=SUM(mail_es)", sum(P["es"]), "int", "Σ emails sent"),
        ("Open rate", '=IFERROR(AVERAGE(mail_po),"")', mean(nn(P["po"])), "pct",
         f"Simple average of {len(nn(P['po'])):,} per-mailing rates, blanks skipped — as in the dashboard"),
        ("Click-to-open", '=IFERROR(AVERAGE(mail_pc),"")', mean(nn(P["pc"])), "pct",
         f"Simple average of {len(nn(P['pc'])):,} per-mailing rates, blanks skipped"),
        ("Click-through", '=IFERROR(AVERAGE(mail_pu),"")', mean(nn(P["pu"])), "pct2",
         f"Simple average of {len(nn(P['pu'])):,} per-mailing rates, blanks skipped"),
        ("Open rate (weighted)", '=IFERROR(SUM(mail_op)/SUM(mail_es),"")', div(sum(P["op"]), sum(P["es"])), "pct",
         "Σ opens ÷ Σ emails sent"),
        ("Click-to-open (weighted)", '=IFERROR(SUM(mail_uc)/SUM(mail_op),"")', div(sum(P["uc"]), sum(P["op"])), "pct",
         "Σ unique clicks ÷ Σ opens"),
        ("Unique clicks", "=SUM(mail_uc)", sum(P["uc"]), "int", "Σ unique clicks"),
        ("Articles and videos", None, None, None, None),
        ("Articles", "=COUNT(art_v)", len(arts), "int", of(len(arts), "arts")),
        ("Article views", "=SUM(art_v)", S(arts, "v"), "int", "Σ views"),
        ("Videos", "=COUNT(vid_v)", len(vids), "int", of(len(vids), "vids")),
        ("Video views", "=SUM(vid_v)", S(vids, "v"), "int", "Σ views"),
        ("Video completion", '=IFERROR(SUM(vid_c100)/SUM(vid_c1),"")', div(S(vids, "c100"), S(vids, "c1")), "pct",
         "Σ completed ÷ Σ started (views reaching 1%)"),
        ("Pages and click tracking", None, None, None, None),
        ("Pages (page-level export)", "=COUNT(pg_uv)", len(pgl), "int", of(len(pgl), "pgLevel")),
        ("Page unique visitors", "=SUM(pg_uv)", S(pgl, "uv"), "int", "Σ unique visitors across pages, as in the dashboard"),
        ("Page views", "=SUM(pg_v)", S(pgl, "v"), "int", "Σ views"),
        ("Click-tracked pages", "=COUNT(clk_v)", len(clk), "int", of(len(clk), "pages")),
        ("Click-tracked page views", "=SUM(clk_v)", S(clk, "v"), "int", "Σ views"),
        ("CTVR", '=IFERROR(SUM(clk_c)/SUM(clk_v),"")', div(S(clk, "c"), S(clk, "v")), "pct", "Σ clicks ÷ Σ views"),
        ("UCTUVR", '=IFERROR(SUM(clk_ucl)/SUM(clk_uv),"")', div(S(clk, "ucl"), S(clk, "uv")), "pct",
         "Σ unique clicks ÷ Σ unique visitors"),
        ("Tracked links", "=COUNT(lnk_c)", len(data["links"]), "int", of(len(data["links"]), "links")),
    ]
    prior_f = {"Mailing records": "=COUNT(pmail_es)", "Mailings sent (incl. resends)": "=SUM(pmail_ms)",
               "Emails sent": "=SUM(pmail_es)", "Open rate": '=IFERROR(AVERAGE(pmail_po),"")',
               "Click-to-open": '=IFERROR(AVERAGE(pmail_pc),"")', "Click-through": '=IFERROR(AVERAGE(pmail_pu),"")',
               "Open rate (weighted)": '=IFERROR(SUM(pmail_op)/SUM(pmail_es),"")',
               "Click-to-open (weighted)": '=IFERROR(SUM(pmail_uc)/SUM(pmail_op),"")', "Unique clicks": "=SUM(pmail_uc)",
               "Articles": "=COUNT(part_v)", "Article views": "=SUM(part_v)", "Videos": "=COUNT(pvid_v)",
               "Video views": "=SUM(pvid_v)", "Video completion": '=IFERROR(SUM(pvid_c100)/SUM(pvid_c1),"")'}

    put(ws, 1, 1, "Comms Intelligence — data extract", font=F_TITLE)
    put(ws, 2, 1, "Internal · contains names and unpublished performance figures", font=F_SUB)
    r = 4
    for lab, val in (("Source", meta["source"] or "not stated in the dashboard"), ("Reporting year", year),
                     ("Data to", meta["as_of"] or "not stated"), ("Extracted from", meta["file"]),
                     ("Extracted on", dt.date.today().isoformat())):
        put(ws, r, 1, lab, font=F_SUB)
        put(ws, r, 2, val, literal=True)
        r += 1
    r += 1
    put(ws, r, 1, "Headline figures", font=F_BLOCK)
    r += 1
    heads = ["Measure", f"{year}"] + ([f"{prior.get('year') or year - 1}"] if prior else []) + ["Basis"]
    for i, h in enumerate(heads, 1):
        put(ws, r, i, h, font=F_HEAD, border=B_HEAD).alignment = A_HR if h[:1].isdigit() else A_HL
    r += 1
    bcol = len(heads)
    ws.cell(r - 1, bcol).alignment = A_IND
    expected = []
    for lab, f, exp, kind, basis in rows:
        if f is None:
            put(ws, r, 1, lab, font=F_BOLD)
        else:
            put(ws, r, 1, lab)
            put(ws, r, 2, f, kind)
            if prior and lab in prior_f:
                put(ws, r, 3, prior_f[lab], kind)
            put(ws, r, bcol, basis, font=F_SUB).alignment = A_IND
            expected.append((f"B{r}", lab, exp, kind))
        r += 1
    for i in range(1, bcol + 1):
        ws.cell(r - 1, i).border = B_FOOT
    r += 2
    put(ws, r, 1, "Sheets", font=F_BLOCK)
    r += 1
    guide = [("Mail summary", "Mailings by month, quarter, division, scope, mapping, team, content type, template, "
                              "audience size, pack, cluster, theme and topic"),
             ("Article summary", "Articles by month (with reach), theme, channel, author, overtitle, region, top story, "
                                 "pack, cluster and topic"),
             ("Video summary", "Watch funnel; videos by month, owner and language"),
             ("Page summary", "Unique visitors by visitor division and region; pages by site, theme, content type, "
                              "owner, target region and organisation"),
             ("Click summary", "Click tracking by site"),
             ("Mail data", "One row per mailing record"), ("Article data", "One row per article, with reach"),
             ("Video data", "One row per video"), ("Page data", "One row per page (page-level export)"),
             ("Page visitors", "Unique visitors per page and visitor division / region"),
             ("Click pages", "One row per click-tracked page"), ("Click links", "One row per tracked link"),
             ("Headcount", "Internal headcount by month — the reach denominator")]
    if prior:
        guide += [(f"{s} PY", f"Prior year {prior.get('year') or year - 1}, same layout") for s in
                  ("Mail data", "Article data", "Video data")]
    for name, desc in guide:
        put(ws, r, 1, f'=HYPERLINK("#\'{name}\'!A1","{name}")', font=F_LINK)  # survives the LibreOffice round trip
        put(ws, r, 2, desc)
        r += 1
    r += 1
    put(ws, r, 1, "Notes", font=F_BLOCK)
    r += 1
    notes = ["Every figure on this sheet and the summary sheets is a formula on the data sheets — filter or pivot "
             "those to go deeper.",
             "Rates marked 'simple average' are the mean of the per-mailing rates in the export, blanks skipped — the "
             "dashboard's method. Weighted rates are shown alongside.",
             "Article unique visitors are per article and never added up.",
             "Theme and topic tables are any-match: a record with several tags counts under each.",
             "Click tracking is a cumulative export without a date dimension."] + [f"Data check: {w}" for w in meta["warnings"]]
    for n in notes:
        put(ws, r, 1, n, font=F_SUB)
        r += 1
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 16
    if prior:
        ws.column_dimensions["C"].width = 16
    ws.column_dimensions[get_column_letter(bcol)].width = 70
    finish(ws, landscape=False)
    return expected


# ------------------------------------------------------------------ recalculate and reconcile
def soffice_path():
    for p in (shutil.which("soffice"), shutil.which("libreoffice"), "/Applications/LibreOffice.app/Contents/MacOS/soffice"):
        if p and Path(p).exists():
            return p
    return None


def recalc(path):
    """LibreOffice headless round trip: returns a recalculated copy (values cached) or None."""
    exe = soffice_path()
    if not exe:
        return None
    work = Path(tempfile.mkdtemp())
    (work / "in").mkdir()
    src = work / "in" / path.name
    shutil.copy(path, src)
    cmd = [exe, f"-env:UserInstallation={(work / 'profile').as_uri()}", "--headless", "--calc",
           "--convert-to", "xlsx", "--outdir", str(work), str(src)]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    out = work / path.name
    if not out.exists():
        raise SystemExit(f"LibreOffice recalculation failed:\n{res.stdout[-600:]}\n{res.stderr[-600:]}")
    return out


ERR = re.compile(r"^(#DIV/0!|#NAME\?|#VALUE!|#REF!|#N/A|#NUM!|#NULL!|Err:\d+)")


def reconcile(recalced, spec):
    wb = load_workbook(recalced, data_only=True)
    problems = []
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and ERR.match(c.value):
                    problems.append(f"{ws.title}!{c.coordinate}: {c.value}")
    ov = wb["Overview"]
    for coord, lab, exp, _ in spec["overview"]:
        got = ov[coord].value
        got = None if got == "" else got
        if (exp is None) != (got is None) or (exp is not None and abs(float(got) - exp) > 1e-9 * max(1, abs(exp))):
            problems.append(f"Overview {lab}: workbook {got!r}, expected {exp!r}")
    for sheet, coord, lab, exp in spec["cells"]:
        got = wb[sheet][coord].value
        if got != exp:
            problems.append(f"{sheet} · {lab}: workbook {got!r}, expected {exp!r}")
    for sheet, block, cols, first, last, total in spec["sums"]:
        ws = wb[sheet]
        for col in cols:
            s = sum(ws[f"{col}{r}"].value or 0 for r in range(first, last + 1))
            t = ws[f"{col}{total}"].value or 0
            if abs(s - t) > 1e-6 * max(1, abs(t)):
                head = ws[f"{col}{first - 1}"].value
                problems.append(f"{sheet} · {block} · {head}: rows add up to {s:,.0f}, total is {t:,.0f}")
    return problems


def inside_git_repo(path):
    return any((p / ".git").exists() for p in [path.resolve().parent, *path.resolve().parent.parents])


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("original", type=Path, help="dashboard HTML with real data (original v2, or a filled v3)")
    ap.add_argument("--out", type=Path, help="output .xlsx (default: next to the dashboard)")
    ap.add_argument("--year", type=int, help="reporting year, if it cannot be inferred")
    ap.add_argument("--as-of", help="data cut-off date for the overview, YYYY-MM-DD")
    ap.add_argument("--rename", action="append", default=[], help="field mapping, dataset.old=new (repeatable)")
    ap.add_argument("--data-json", type=Path, help="read DATA from this JSON file instead of the dashboard's script")
    ap.add_argument("--check", action="store_true", help="validate only, write nothing")
    ap.add_argument("--no-recalc", action="store_true", help="skip the LibreOffice recalculation and reconciliation")
    ap.add_argument("--allow-git", action="store_true", help="write even if the output folder is inside a Git repository")
    a = ap.parse_args()

    rep = Report()
    html = a.original.read_text(encoding="utf-8")
    if a.data_json:
        data, how = json.loads(a.data_json.read_text(encoding="utf-8")), "json file"
    else:
        data, how = extract_data(html, a.original.name)
    if not isinstance(data, dict):
        raise SystemExit("DATA is not an object")
    print(f"Read DATA from {a.original.name} ({how}): {len(json.dumps(data)) // 1024:,} KB, keys: {', '.join(data)}")
    apply_renames(data, a.rename, rep)
    year = a.year or data.get("year") or infer_year(data)
    if not year:
        rep.err("reporting year unknown — pass --year")
    elif not (a.year or data.get("year")):
        rep.note(f"year inferred from the data: {year}")
    check_all(data, rep)
    if isinstance(data.get("prior"), dict):
        prep = Report()
        check_mail(data["prior"].get("mailP"), prep, "prior.mailP")
        check_records(data["prior"], prep, ["arts", "vids"], "prior.")
        rep.errors += prep.errors
        rep.warnings += prep.warnings
    as_of = a.as_of or data.get("asOf")
    if as_of:
        try:
            dt.date.fromisoformat(as_of)
        except ValueError:
            raise SystemExit(f"--as-of {as_of!r}: use YYYY-MM-DD")
        if year and not rep.errors:
            late(data, dt.date.fromisoformat(as_of), int(year), rep)
    source = data.get("source") or source_from_original(html)

    print("\nChecks:")
    rep.print() if (rep.errors or rep.warnings or rep.notes) else print("  all fields present")
    if rep.errors:
        print(f"\n{len(rep.errors)} error(s) — nothing written. Fix with --rename, or ask the owner of the dashboard.")
        return 1
    if a.check:
        print("\n--check: nothing written.")
        return 0

    out = a.out or a.original.with_name(f"comms-intelligence-data-{as_of or 'undated'}.xlsx")
    if out.suffix.lower() != ".xlsx":
        raise SystemExit("--out must end in .xlsx")
    if out.resolve() == a.original.resolve():
        raise SystemExit("refusing to overwrite the dashboard")
    if inside_git_repo(out) and not a.allow_git:
        raise SystemExit(f"{out.parent} is inside a Git repository. The workbook holds real data and must not be "
                         "committed — write it elsewhere (--out) or pass --allow-git if the folder is git-ignored.")

    meta = {"source": source, "as_of": as_of, "file": a.original.name, "warnings": list(rep.warnings)}
    nw, nn = len(rep.warnings), len(rep.notes)
    wb, spec = build(data, int(year), meta, rep)
    for m in rep.warnings[nw:] + rep.notes[nn:]:
        print(f"  build  {m}")
    wb.save(out)
    print(f"\nWrote {out}  ({out.stat().st_size // 1024:,} KB, {len(wb.sheetnames)} sheets: {', '.join(wb.sheetnames)})")

    print("\nHeadline figures (compare with the dashboard's Overview, all filters on (All)):")
    for _, lab, exp, kind in spec["overview"]:
        s = "n/a" if exp is None else {"pct": f"{exp:.1%}", "pct2": f"{exp:.2%}"}.get(kind, f"{exp:,.0f}")
        print(f"  {lab:<32} {s}")

    if a.no_recalc:
        print("\n--no-recalc: formulas compute when the file is opened in Excel. Not reconciled.")
        return 0
    rc = recalc(out)
    if rc is None:
        print("\nLibreOffice not found: formulas compute when the file is opened in Excel. Not reconciled — open it "
              "and compare the Overview with the headline figures above.")
        return 0
    problems = reconcile(rc, spec)
    if problems:
        print(f"\nRECONCILIATION FAILED — {len(problems)} problem(s). Do not hand the file over:")
        for p in problems[:40]:
            print(f"  {p}")
        return 1
    shutil.copy(rc, out)
    print("\nRecalculated with LibreOffice: 0 formula errors, overview matches, every table adds up to its total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```
