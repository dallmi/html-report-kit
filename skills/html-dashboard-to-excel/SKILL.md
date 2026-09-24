---
name: html-dashboard-to-excel
description: Use when someone wants the data out of an HTML dashboard, report page or exported chart page and into Excel — "get the data out of this dashboard", "export this HTML report to a spreadsheet", "I only have the HTML, I need the numbers", "put the chart data in an Excel", "scrape the tables from this page into xlsx" — whatever library built it (Plotly, Chart.js, ECharts, Highcharts, Vega/Altair, React build, plain tables). For the Comms Intelligence Dashboard use comms-dashboard-to-excel instead; it adds reconciled summaries.
---

# HTML dashboard to Excel

A dashboard file keeps its data in one of a few places: a JSON or JavaScript block in a `<script>`, the configuration of a chart library, an HTML table, a file it loads at runtime, or — rarely — only in the drawing. The script in the appendix looks in all of them, turns each dataset it finds into one sheet, and writes an Overview that says what it found, where, and what it could not extract and why.

You export what the dashboard holds; you do not analyse it. No calculated columns, no re-sorting, no dropped rows, no summaries of your own. The workbook is only trustworthy if every number in it can be found in the file. If the user wants analysis, that is a second step on top of this export.

## Workflow

**1. Run it.** Save the appendix as `html_dashboard_to_xlsx.py` (Python 3.8+ with `openpyxl`) and run it on the dashboard:

```bash
python html_dashboard_to_xlsx.py DASHBOARD.html
```

It prints one line per dataset (`Embedded data`, `HTML table`, `KPI tiles`, `Chart`, `SVG chart`, `External file`) and one `NOT EXTRACTED` line per gap, then writes `<name>-data.xlsx` next to the dashboard (or `--out PATH`).

**2. Close the gaps the output names.**

| Output says | Meaning | What you do |
|---|---|---|
| `chart data is computed in the browser from other data` | The chart is drawn from numbers the page calculates. Its source data is usually already exported | Run the probe (below) if the user needs the values exactly as drawn |
| `chart configuration is built at runtime` / `No data found in the file` | The page assembles its data while it runs | Run the probe |
| `content built in the browser` | Tables or text are written by script when the page opens; a column the script calculates (a rate, a share) is not in the file, though its inputs usually are | Run the probe if the user wants the page exactly as shown |
| `referenced but not found next to the dashboard` | The page loads a file (`data/…json`, `.csv`, `.parquet`) that was not handed over | Ask the user for that file, put it where the path says, run again |
| `remote data '…'` | The page loads from a server | Not fetched: it would leave the machine. The probe captures it only if the page loads it in the user's own browser |
| `needs pyarrow or duckdb` | Parquet file present | `pip install pyarrow`, run again |
| `drawn shapes without data values` | An SVG or canvas picture with no numbers behind it | Report it. Do not read values off the picture |

**The probe** (only when step 2 calls for it and you have a browser tool). It reads the chart objects, the page's global data and the rendered tables from the running page.
1. Serve the dashboard's folder: `python -m http.server 8765 --bind 127.0.0.1` in that folder, then open `http://127.0.0.1:8765/<file>`. Browsers block `fetch` on `file://`, and some browser tools cannot open `file://` at all. If a browser tool is locked by another session, use another one; do not take it over.
2. `python html_dashboard_to_xlsx.py --print-probe` prints a JavaScript expression (wrap it as `() => <expression>` if your tool wants a function). Evaluate it on the loaded page and save the returned string as `probe.json` straight to a file — most browser tools have a save-to-file option; if yours can only write inside its workspace, save it there and move it. Do not route the output through the conversation.
3. `python html_dashboard_to_xlsx.py DASHBOARD.html --probe-json probe.json`. Captured charts replace their `NOT EXTRACTED` lines; runtime tables and data are added as `Runtime (probe)`; anything identical to a static find is not repeated.
4. Stop the server, and delete `probe.json` when you are done: it holds the same data.

**3. Check it.** The last line must read `Read-back check passed`: every sheet holds exactly the extracted rows and values. Then compare two or three numbers the dashboard shows — a KPI tile, a table total, one chart bar — with the workbook: in the browser if you have one open, otherwise in the HTML source. If a dataset looks cut up or merged wrongly, say so; do not repair it by hand in Excel.

**4. Report back.** Where the file is, how many datasets, the `NOT EXTRACTED` lines in plain words, and whether you ran the probe.

## What the workbook looks like

- **Overview:** source file, page title, date, a *Datasets* table (sheet link, found as, where in the file, rows, columns, notes such as "identical: …") and a *Not extracted* table (what, where, why).
- **One sheet per dataset**, named after its chart title, table caption, nearest heading or variable name, in the order embedded data → tables → KPI tiles → charts → SVG → external files → runtime. Header in row 1, filter and frozen header: ready to pivot.
- **Values as found.** Formatted numbers become numbers (`12'345`, `1.2k`, `45.2 %`, `(1,000)`, `–` → empty), ISO and `03 Mar 2026` dates become dates, nested records get dotted column names (`audience.size`), tag lists are joined with `; `, index-coded columns are decoded when the file carries the labels. Chart series sharing their categories become one wide table.
- **Totals** shown on the page (a table's `<tfoot>` or a "Total" row) are kept apart, two rows below the data and outside the filter range, so they never add into a pivot.
- **Style:** the corporate `xlsx-report` standard, minimal variant — no gridlines, Arial, header without fill in bold 9 pt between thin black rules, no row fills, links blue, no red.

## Rules

- **The workbook holds the dashboard's data.** Keep it where the dashboard lives. Not into a Git repository (the script refuses; `--allow-git` only for git-ignored folders or synthetic data), not into tickets, chats outside the organisation or public tools. Do not paste the data into the conversation beyond a few check values.
- **Never fetch remote URLs yourself** to fill a gap, and run the probe only on pages the user can open in their own browser anyway.
- **No numbers read off pictures**, no values typed in from the screen, no guessed column meanings. A gap reported is better than a number invented.

---

## Appendix — `html_dashboard_to_xlsx.py`

Save exactly as `html_dashboard_to_xlsx.py`. Python 3.8+ with openpyxl; pyarrow or duckdb only for Parquet. Exit code 1: no data found, or the read-back check failed.

```python
#!/usr/bin/env python3
"""Extract the data of an HTML dashboard into a tidy Excel workbook — values exactly as found.

    python html_dashboard_to_xlsx.py DASHBOARD.html [--out OUT.xlsx] [--probe-json probe.json]
                                     [--print-probe] [--allow-git]

Finds data wherever dashboards usually keep it: JSON script tags, JavaScript literals (also
minified bundles and JSON.parse('...') strings), base64/gzip payloads, chart configurations
(Plotly incl. binary arrays, Chart.js, ECharts, Highcharts, ApexCharts, Vega-Lite), HTML tables
(multi-row headers, rowspan, formatted numbers, total rows), KPI tiles, SVG data attributes,
local files the page loads (fetch, d3.csv, <script src>). Data built only at runtime is caught
with --print-probe: run the printed JavaScript in a browser on the open page, save its output
and pass it back with --probe-json.

Writes one sheet per dataset plus an Overview with a coverage report (what was found, where,
and what could not be extracted and why). No calculations. The written workbook is read back
and compared with the extracted data. Needs openpyxl; pyarrow or duckdb only for Parquet.
Exit code 1 = nothing extracted, or the read-back check failed.
"""
import argparse
import base64
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import re
import struct
import sys
import zlib
from html.parser import HTMLParser
from pathlib import Path

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Alignment, Border, Font, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    raise SystemExit("openpyxl is required: pip install openpyxl")

KIND_ORDER = ["Embedded data", "HTML table", "KPI tiles", "Chart", "SVG chart", "External file", "Runtime (probe)"]
TOTAL_RE = re.compile(r"^\s*(grand\s+)?(total|totals|gesamt|summe|sum|all)\b", re.I)
PCT_HINT = re.compile(r"rate|ratio|pct|percent|share|%|ctr|bounce|completion|conversion|retention", re.I)


# ------------------------------------------------------------------ numbers and dates as shown on a page
NUM_RE = re.compile(r"^[+\-−–]?\(?[+\-−–]?(?:CHF|USD|EUR|GBP|[$€£])?\s*[\d'’  .,]*\d[\d'’  .,]*\s*"
                    r"(?:%|pp|k|K|m|M|mn|bn|B|Mio\.?|Mrd\.?|Tsd\.?)?\s*(?:CHF|USD|EUR|GBP|[$€£])?\)?$")
SUFFIX = {"k": 1e3, "K": 1e3, "Tsd": 1e3, "m": 1e6, "M": 1e6, "mn": 1e6, "Mio": 1e6, "bn": 1e9, "B": 1e9, "Mrd": 1e9}
NIL = {"", "-", "–", "—", "n/a", "na", "n.a.", "null", "none", "nan", "#n/a"}


def parse_num(text):
    """'12'345' → 12345, '45.2 %' → 0.452, '1.2k' → 1200, '(1,000)' → -1000; None if not a number."""
    if isinstance(text, (int, float)) and not isinstance(text, bool):
        return text
    s = str(text).strip()
    if not s or not NUM_RE.match(s) or not re.search(r"\d", s):
        return None
    neg = s.startswith(("-", "−", "–", "(")) or "(-" in s
    pct = s.rstrip(")").rstrip().endswith("%")
    m = re.search(r"(k|K|mn|m|M|bn|B|Mio|Mrd|Tsd)\.?\s*\)?$", s)
    mult = SUFFIX[m.group(1)] if m else 1
    core = re.sub(r"[^\d.,'’  ]", "", s).replace("'", "").replace("’", "").replace(" ", "").replace(" ", "").replace(" ", "")
    if "," in core and "." in core:
        core = core.replace(",", "") if core.rfind(".") > core.rfind(",") else core.replace(".", "").replace(",", ".")
    elif "," in core:
        core = core.replace(",", "") if re.fullmatch(r"\d{1,3}(,\d{3})+", core) else core.replace(",", ".")
    elif core.count(".") > 1:
        core = core.replace(".", "")
    try:
        v = float(core)
    except ValueError:
        return None
    v = v * mult / (100 if pct else 1) * (-1 if neg else 1)
    if not pct and mult == 1 and v == int(v) and "." not in core and abs(v) < 1e15:
        return int(v)
    return round(v, 10)


def parse_date(s):
    if not isinstance(s, str):
        return None
    s = s.strip()
    for f in ("%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%d.%m.%Y", "%b %d, %Y", "%B %d, %Y"):
        try:
            return dt.datetime.strptime(s, f).date()
        except ValueError:
            pass
    m = re.fullmatch(r"(\d{4}-\d{2}-\d{2})[T ][\d:.]+Z?", s)
    return dt.date.fromisoformat(m.group(1)) if m else None


# ------------------------------------------------------------------ lenient JavaScript literal parser
class Expr:
    """Something that is not a literal (a variable, a function call, arithmetic)."""

    def __init__(self, src):
        self.src = src.strip()

    def __repr__(self):
        return f"Expr({self.src[:40]!r})"


def literal_end(s, i):
    """Index after the bracketed literal that starts at s[i] ('[' or '{'); string-aware."""
    depth, n = 0, len(s)
    while i < n:
        c = s[i]
        if c in "\"'`":
            q, i = c, i + 1
            while i < n and s[i] != q:
                i += 2 if s[i] == "\\" else 1
        elif c in "[{(":
            depth += 1
        elif c in "]})":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return n


class JS:
    ESC = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}

    def __init__(self, s, i=0):
        self.s, self.i = s, i

    def ws(self):
        s, n = self.s, len(self.s)
        while self.i < n:
            if s[self.i].isspace():
                self.i += 1
            elif s.startswith("//", self.i):
                j = s.find("\n", self.i)
                self.i = n if j < 0 else j + 1
            elif s.startswith("/*", self.i):
                j = s.find("*/", self.i + 2)
                self.i = n if j < 0 else j + 2
            else:
                break

    def peek(self):
        self.ws()
        return self.s[self.i] if self.i < len(self.s) else ""

    def string(self):
        s, q = self.s, self.s[self.i]
        self.i += 1
        out = []
        while self.i < len(s) and s[self.i] != q:
            c = s[self.i]
            if c == "\\":
                e = s[self.i + 1]
                if e == "u":
                    if s[self.i + 2] == "{":
                        j = s.index("}", self.i)
                        out.append(chr(int(s[self.i + 3:j], 16)))
                        self.i = j + 1
                        continue
                    out.append(chr(int(s[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                    continue
                if e == "x":
                    out.append(chr(int(s[self.i + 2:self.i + 4], 16)))
                    self.i += 4
                    continue
                if e == "\n":
                    self.i += 2
                    continue
                out.append(self.ESC.get(e, e))
                self.i += 2
                continue
            if q == "`" and s.startswith("${", self.i):
                raise ValueError("template literal with substitutions")
            out.append(c)
            self.i += 1
        self.i += 1
        return "".join(out)

    def skip_expr(self, start):
        """Skip a non-literal expression up to the ',' ']' '}' ')' or ';' that ends it."""
        s, n, depth = self.s, len(self.s), 0
        self.i = start
        while self.i < n:
            c = s[self.i]
            if c in "\"'`":
                q = c
                self.i += 1
                while self.i < n and s[self.i] != q:
                    self.i += 2 if s[self.i] == "\\" else 1
            elif c in "([{":
                depth += 1
            elif c in ")]}":
                if depth == 0:
                    break
                depth -= 1
            elif depth == 0 and c in ",;":
                break
            self.i += 1
        return Expr(s[start:self.i])

    def after_literal(self, v, start):
        """A literal followed by an operator (e.g. 'a' + b, [1].map(f)) is an expression."""
        if self.peek() in ("", ",", "]", "}", ")", ";", ":"):
            return v
        return self.skip_expr(start)

    def value(self):
        c = self.peek()
        start = self.i
        if c == "{":
            return self.after_literal(self.obj(), start)
        if c == "[":
            return self.after_literal(self.arr(), start)
        if c in "\"'`":
            try:
                return self.after_literal(self.string(), start)
            except ValueError:
                return self.skip_expr(start)
        m = re.compile(r"[+\-]?(?:0[xX][0-9a-fA-F]+|(?:\d[\d_]*\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?)").match(self.s, self.i)
        if m and (c.isdigit() or c in "+-."):
            self.i = m.end()
            t = m.group(0).replace("_", "")
            v = int(t, 16) if t.lower().lstrip("+-").startswith("0x") else (float(t) if re.search(r"[.eE]", t) else int(t))
            return self.after_literal(v, start)
        m = re.compile(r"(true|false|null|undefined|NaN|Infinity|!0|!1)\b").match(self.s, self.i)
        if m:
            self.i = m.end()
            v = {"true": True, "false": False, "!0": True, "!1": False, "Infinity": float("inf")}.get(m.group(1))
            return self.after_literal(v, start)
        for fn in ("JSON.parse(", "atob("):
            if self.s.startswith(fn, self.i):
                self.i += len(fn)
                inner = self.value()
                if self.peek() == ")":
                    self.i += 1
                    if isinstance(inner, str):
                        decoded = inner if fn == "JSON.parse(" else decode_b64(inner)
                        if decoded is not None:
                            return self.after_literal(parse_text(decoded), start)
                    elif fn == "JSON.parse(" and not isinstance(inner, Expr):
                        return self.after_literal(inner, start)
                return self.skip_expr(start)
        return self.skip_expr(start)

    def arr(self):
        self.i += 1
        out = []
        while True:
            c = self.peek()
            if c == "]":
                self.i += 1
                return out
            if c == ",":  # hole or trailing comma
                self.i += 1
                continue
            if self.s.startswith("...", self.i):
                self.skip_expr(self.i)
                continue
            if not c:
                raise ValueError("unterminated array")
            out.append(self.value())
            if self.peek() == ",":
                self.i += 1

    def obj(self):
        self.i += 1
        out = {}
        while True:
            c = self.peek()
            if c == "}":
                self.i += 1
                return out
            if c == ",":
                self.i += 1
                continue
            if not c:
                raise ValueError("unterminated object")
            if self.s.startswith("...", self.i) or c == "[":
                self.skip_expr(self.i)
                if self.peek() == ":":
                    self.i += 1
                    self.value()
                continue
            if c in "\"'":
                key = self.string()
            else:
                m = re.compile(r"(?:get |set |async )?\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)").match(self.s, self.i)
                if not m:
                    raise ValueError(f"bad key at {self.i}")
                key = m.group(1)
                self.i = m.end()
            c = self.peek()
            if c == ":":
                self.i += 1
                out[key] = self.value()
            elif c == "(":  # method: skip params and body
                self.i = literal_end(self.s, self.i)
                if self.peek() == "{":
                    self.i = literal_end(self.s, self.i)
                out[key] = Expr("function")
            else:  # shorthand {a, b}
                out[key] = Expr(key)
            if self.peek() == ",":
                self.i += 1


def parse_js(s, i=0):
    """Parse the literal at s[i]; JSON fast path for big data blocks."""
    j = JS(s, i)
    c = j.peek()
    if c in "[{":
        end = literal_end(s, j.i)
        try:
            return json.loads(s[j.i:end]), end
        except (json.JSONDecodeError, RecursionError):
            pass
    v = j.value()
    return v, j.i


def decode_b64(s):
    t = re.sub(r"\s", "", s)
    if len(t) < 16 or not re.fullmatch(r"[A-Za-z0-9+/_-]+=*", t):
        return None
    try:
        raw = base64.b64decode(t + "=" * (-len(t) % 4), altchars=b"-_" if ("-" in t or "_" in t) else None)
    except Exception:
        return None
    for fn in (gzip.decompress, zlib.decompress):
        try:
            raw = fn(raw)
            break
        except Exception:
            pass
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return None


def parse_text(t):
    """JSON (or JS literal) text → object; CSV text → list of dicts; else the text itself."""
    st = t.strip()
    if st[:1] in "[{":
        try:
            return json.loads(st)
        except json.JSONDecodeError:
            try:
                return parse_js(st)[0]
            except Exception:
                return t
    rows = sniff_csv(st)
    return rows if rows is not None else t


def sniff_csv(text):
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 3:
        return None
    for d in (",", ";", "\t", "|"):
        counts = {ln.count(d) for ln in lines[:50]}
        if len(counts) == 1 and counts.pop() >= 1:
            r = list(csv.reader(io.StringIO("\n".join(lines)), delimiter=d))
            head = r[0]
            if len(set(head)) == len(head) and not any(parse_num(h) is not None for h in head):
                return [dict(zip(head, row)) for row in r[1:]]
    return None


# ------------------------------------------------------------------ datasets
class Dataset:
    def __init__(self, name, kind, where, columns, rows, totals=None, note=""):
        self.name, self.kind, self.where, self.note = name, kind, where, note
        self.columns, self.rows, self.totals = columns, rows, totals or []
        self.sheet = None

    def signature(self):
        sums = []
        for j in range(len(self.columns)):
            vals = [r[j] for r in self.rows if isinstance(r[j], (int, float)) and not isinstance(r[j], bool)]
            if vals:
                sums.append(round(sum(vals), 4))
        text = "|".join(str(r[j]) for r in self.rows[:5] for j in range(len(self.columns)) if isinstance(r[j], str))
        return (len(self.rows), tuple(sorted(sums)), hashlib.md5(text.encode()).hexdigest() if not sums else "")


def scalar(v):
    return v is None or isinstance(v, (str, int, float, bool))


def cell(v):
    if isinstance(v, Expr):
        return None
    if isinstance(v, list):
        return "; ".join("" if x is None else (json.dumps(x, ensure_ascii=False) if isinstance(x, (dict, list)) else str(x))
                         for x in v if not isinstance(x, Expr))
    if isinstance(v, dict):
        return json.dumps({k: x for k, x in v.items() if not isinstance(x, Expr)}, ensure_ascii=False)
    if isinstance(v, float) and v != v:
        return None
    return v


def flatten(rec, prefix="", depth=0):
    out = {}
    for k, v in rec.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict) and depth < 2 and all(scalar(x) or isinstance(x, (dict, list)) for x in v.values()):
            out.update(flatten(v, key + ".", depth + 1))
        else:
            out[key] = cell(v)
    return out


def records_table(recs):
    flat = [flatten(r) for r in recs if isinstance(r, dict)]
    cols = []
    for r in flat:
        for k in r:
            if k not in cols:
                cols.append(k)
    return cols, [[r.get(c) for c in cols] for r in flat]


def is_chart_config(o):
    if isinstance(o, dict):
        if "$schema" in o and "vega" in str(o.get("$schema")):
            return "vega"
        if isinstance(o.get("data"), dict) and "datasets" in o["data"]:
            return "chartjs"
        if "series" in o and any(k in o for k in ("xAxis", "yAxis", "chart", "xaxis", "legend", "tooltip", "title")):
            return "echarts_or_highcharts"
    if isinstance(o, list) and o and all(isinstance(t, dict) and "type" in t and ("x" in t or "values" in t or "y" in t)
                                         for t in o):
        return "plotly"
    return None


def find_tables(obj, name, min_rows=2):
    """Generic: every table-shaped part of a parsed object → [(name, columns, rows)]."""
    out = []
    if isinstance(obj, list):
        if len(obj) >= min_rows and sum(isinstance(x, dict) for x in obj) >= 0.8 * len(obj):
            cols, rows = records_table(obj)
            if cols:
                out.append((name, cols, rows))
        elif len(obj) >= min_rows + 1 and all(isinstance(x, list) for x in obj) and \
                all(isinstance(h, str) for h in obj[0]) and len({len(x) for x in obj}) == 1:
            out.append((name, list(obj[0]), [[cell(v) for v in r] for r in obj[1:]]))
        elif len(obj) >= min_rows and all(isinstance(x, list) for x in obj) and len({len(x) for x in obj}) == 1:
            out.append((name, [f"col{j + 1}" for j in range(len(obj[0]))], [[cell(v) for v in r] for r in obj]))
        return out
    if not isinstance(obj, dict):
        return out
    if isinstance(obj.get("columns"), list) and isinstance(obj.get("data"), list) and \
            all(isinstance(r, list) for r in obj["data"]):  # pandas orient="split"
        out.append((name, [str(c) for c in obj["columns"]], [[cell(v) for v in r] for r in obj["data"]]))
        return out
    col = columnar(obj)
    if col:
        out.append((name, *col))
        return out
    vals = list(obj.values())
    nums = sum(isinstance(v, (int, float)) and not isinstance(v, bool) for v in vals)
    if len(vals) >= 3 and all(scalar(v) for v in vals) and nums >= 2:
        out.append((name, ["key", "value"], [[k, cell(v)] for k, v in obj.items()]))
        return out
    if len(vals) >= 3 and all(isinstance(v, dict) and v and all(scalar(x) for x in v.values()) for v in vals):
        cols, rows = records_table([{"key": k, **v} for k, v in obj.items()])
        out.append((name, cols, rows))
        return out
    for k, v in obj.items():
        if isinstance(v, (dict, list)) and not is_chart_config(v):
            out += find_tables(v, f"{name}.{k}", min_rows)
    return out


def columnar(d):
    """Dict of equal-length arrays (also one nested level), decoding index columns via label lists."""
    arrays = {k: v for k, v in d.items() if isinstance(v, list)}
    nested = {k: v for k, v in d.items() if isinstance(v, dict)}
    lens = {}
    for v in list(arrays.values()) + [x for sub in nested.values() for x in sub.values() if isinstance(x, list)]:
        if len(v) >= 2:
            lens[len(v)] = lens.get(len(v), 0) + 1
    if not lens:
        return None
    n = max(lens, key=lambda k: (lens[k], k))
    if lens[n] < 2:
        return None
    cell_ok = lambda v: all(scalar(x) or (isinstance(x, list) and all(scalar(y) for y in x)) for x in v)
    cols = {k: v for k, v in arrays.items() if len(v) == n and cell_ok(v)}
    for sub in nested.values():
        subs = {k: v for k, v in sub.items() if isinstance(v, list)}
        if subs and all(len(v) == n and cell_ok(v) for v in subs.values()) and len(subs) == len(sub):
            cols.update({k: v for k, v in subs.items() if k not in cols})
    if len(cols) < 2:
        return None
    for sub in nested.values():  # label lookups: {"div": ["GWM", "IB", ...]} for integer columns
        for k, labels in sub.items():
            if k in cols and isinstance(labels, list) and len(labels) != n and \
                    all(isinstance(x, int) and 0 <= x < len(labels) for x in cols[k]):
                cols[k] = [labels[x] for x in cols[k]]
    names = list(cols)
    return names, [[cell(cols[c][i]) for c in names] for i in range(n)]


# ------------------------------------------------------------------ chart adapters
def num_array(v):
    """Plotly typed arrays {'dtype': 'f8', 'bdata': '...'} → list."""
    if isinstance(v, dict) and "bdata" in v and "dtype" in v:
        code = {"f8": "d", "f4": "f", "i4": "i", "i2": "h", "i1": "b", "u4": "I", "u2": "H", "u1": "B"}.get(v["dtype"])
        if code:
            raw = base64.b64decode(v["bdata"])
            vals = list(struct.unpack(f"<{len(raw) // struct.calcsize(code)}{code}", raw))
            return [round(x, 10) if isinstance(x, float) else x for x in vals]
    return v


def series_table(cats, series, cat_name="category"):
    """Shared categories → wide table (category + one column per series); else long (series, x, y)."""
    series = [(n, [num_array(v) if isinstance(v, dict) and "bdata" in v else v for v in vals]) for n, vals in series]
    if cats is not None and series and all(isinstance(vals, list) and len(vals) == len(cats) and
                                           all(scalar(x) for x in vals) for _, vals in series):
        names = [n or f"series {i + 1}" for i, (n, _) in enumerate(series)]
        return [cat_name] + names, [[cell(c)] + [cell(vals[i]) for _, vals in series] for i, c in enumerate(cats)]
    rows = []
    for n, vals in series:
        if not isinstance(vals, list):
            continue
        for i, v in enumerate(vals):
            if isinstance(v, dict):
                x = v.get("x", v.get("name", cats[i] if cats and i < len(cats) else i))
                y = v.get("y", v.get("value"))
            elif isinstance(v, list) and len(v) >= 2:
                x, y = v[0], v[1]
            else:
                x, y = (cats[i] if cats and i < len(cats) else i), v
            rows.append([n, cell(x), cell(y)])
    return ["series", "x", "y"], rows


def text_of(t):
    if isinstance(t, dict):
        t = t.get("text")
    return t if isinstance(t, str) and t.strip() else None


def unresolved(vals):
    return isinstance(vals, Expr) or (isinstance(vals, list) and vals and all(isinstance(x, Expr) for x in vals))


def axis_name(o, *path):
    """Title of the category axis, when the chart names it (else the column is called 'category')."""
    for key in path:
        o = o[0] if isinstance(o, list) and o else o
        o = o.get(key) if isinstance(o, dict) else None
    return o.get("text") if isinstance(o, dict) else (o if isinstance(o, str) and o.strip() else None)


def chart_tables(lib, cfg, extra=None):
    """→ (title, [(suffix, columns, rows)], problem or None)"""
    extra = extra or {}
    tabs = []
    if lib == "plotly":
        traces = cfg.get("data") if isinstance(cfg, dict) else cfg
        layout = extra.get("layout") or (cfg.get("layout") if isinstance(cfg, dict) else {}) or {}
        title = text_of(layout.get("title")) if isinstance(layout, dict) else None
        groups = {}
        for t in traces or []:
            if not isinstance(t, dict):
                continue
            if t.get("type") in ("pie", "funnelarea", "sunburst", "treemap"):
                labels, values = num_array(t.get("labels")), num_array(t.get("values"))
                if isinstance(labels, list) and isinstance(values, list):
                    tabs.append((t.get("name") or "", ["label", "value"], [[cell(a), cell(b)] for a, b in zip(labels, values)]))
                continue
            x, y = num_array(t.get("x")), num_array(t.get("y"))
            if isinstance(x, list) and isinstance(y, list):
                groups.setdefault(json.dumps(x, default=str), (x, []))[1].append((t.get("name"), y))
            elif isinstance(y, list):
                groups.setdefault("index", (list(range(len(y))), []))[1].append((t.get("name"), y))
        for x, series in groups.values():
            tabs.append(("", *series_table(x, series, axis_name(layout, "xaxis", "title") or "x")))
        return title, tabs, None
    if lib == "chartjs":
        data = cfg.get("data") if isinstance(cfg.get("data"), dict) else {}
        opts = cfg.get("options") if isinstance(cfg.get("options"), dict) else {}
        plugins = opts.get("plugins") if isinstance(opts.get("plugins"), dict) else {}
        title = text_of(plugins.get("title"))
        labels = data.get("labels")
        dsets = [d for d in data.get("datasets") or [] if isinstance(d, dict)]
        if unresolved(labels) or any(unresolved(d.get("data")) for d in dsets):
            return title, [], "chart data is computed in the browser from other data"
        tabs.append(("", *series_table(labels if isinstance(labels, list) else None,
                                       [(d.get("label"), d.get("data")) for d in dsets],
                                       axis_name(opts, "scales", "x", "title") or "category")))
        return title, tabs, None
    if lib in ("echarts", "highcharts", "apex"):
        title = text_of(cfg.get("title")[0] if isinstance(cfg.get("title"), list) and cfg.get("title") else cfg.get("title"))
        cats = None
        for axis in ("xAxis", "xaxis", "yAxis"):
            a = cfg.get(axis)
            a = a[0] if isinstance(a, list) and a else a
            if isinstance(a, dict):
                c = a.get("data", a.get("categories"))
                if isinstance(c, list) and c:
                    cats = c
                    break
        if cats is None and isinstance(cfg.get("labels"), list):
            cats = cfg["labels"]
        ds = cfg.get("dataset")
        ds = ds[0] if isinstance(ds, list) and ds else ds
        if isinstance(ds, dict) and isinstance(ds.get("source"), (list, dict)):
            for _, cols, rows in find_tables(ds["source"], "dataset", 1):
                tabs.append(("dataset", cols, rows))
        series = cfg.get("series")
        series = [series] if isinstance(series, dict) else series
        if unresolved(cats) or (isinstance(series, list) and any(isinstance(s, dict) and unresolved(s.get("data")) for s in series)):
            return title, tabs, "chart data is computed in the browser from other data"
        if isinstance(series, list) and series and all(scalar(x) for x in series):  # apex pie: series=[1,2,3]
            tabs.append(("", *series_table(cats, [("value", series)], "label")))
            return title, tabs, None
        plain = []
        for s in series or []:
            if not isinstance(s, dict) or not isinstance(s.get("data"), list):
                continue
            if s.get("type") in ("pie", "funnel", "treemap", "sunburst") or (
                    s["data"] and all(isinstance(x, dict) and "name" in x and ("value" in x or "y" in x) for x in s["data"])):
                tabs.append((s.get("name") or "", ["name", "value"],
                             [[cell(x.get("name")), cell(x.get("value", x.get("y")))] for x in s["data"] if isinstance(x, dict)]))
            else:
                plain.append((s.get("name"), s["data"]))
        if plain:
            name = axis_name(cfg, "xAxis", "name") or axis_name(cfg, "xAxis", "title") or axis_name(cfg, "xaxis", "title")
            tabs.append(("", *series_table(cats, plain, name or "category")))
        return title, tabs, None
    if lib == "vega":
        title = text_of(cfg.get("title"))
        for key, recs in (cfg.get("datasets") or {}).items():
            for _, cols, rows in find_tables(recs, key, 1):
                tabs.append((key, cols, rows))

        def walk(o):
            if isinstance(o, dict):
                d = o.get("data")
                if isinstance(d, dict) and isinstance(d.get("values"), list):
                    for _, cols, rows in find_tables(d["values"], "values", 1):
                        tabs.append(("values", cols, rows))
                for k in ("layer", "hconcat", "vconcat", "concat", "spec"):
                    for sub in (o.get(k) if isinstance(o.get(k), list) else [o.get(k)]):
                        walk(sub)
        walk(cfg)
        return title, tabs, None
    return None, [], f"unknown chart library {lib}"


CHART_CALLS = [
    (re.compile(r"\bPlotly\.(?:newPlot|react|plot)\s*\("), "plotly"),
    (re.compile(r"\bnew\s+Chart\s*\("), "chartjs"),
    (re.compile(r"\.setOption\s*\("), "echarts"),
    (re.compile(r"\bHighcharts\.(?:chart|stockChart|mapChart)\s*\("), "highcharts"),
    (re.compile(r"\bnew\s+ApexCharts\s*\("), "apex"),
    (re.compile(r"\bvegaEmbed\s*\("), "vega"),
]


def call_args(s, i):
    """Arguments of the call whose '(' ends at i."""
    j, args = JS(s, i), []
    while True:
        c = j.peek()
        if c in (")", ""):
            return args
        if c == ",":
            j.i += 1
            continue
        try:
            if c in "[{":
                v, j.i = parse_js(s, j.i)
            else:
                v = j.value()
        except Exception:
            v = j.skip_expr(j.i)
        args.append(v)


# ------------------------------------------------------------------ HTML scan
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
KPI_CLASS = re.compile(r"(^|[\s_-])(kpi|metric|stat|stats|tile|scorecard|score-card|big-number|bignumber)([\s_-]|$)", re.I)


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.headings, self.ids, self.scripts, self.tables = "", [], {}, [], []
        self.kpis, self.svgs, self.stack = [], [], []
        self._text_target, self._tables, self._svg, self._script, self._in_title, self._heading = None, [], None, None, False, None

    def pos(self):
        return self.getpos()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.setdefault(a["id"], self.pos())
        if tag == "script":
            self._script = {"pos": self.pos(), "attrs": a, "text": []}
            return
        if tag == "title" and self._svg is None:
            self._in_title = True
        if tag in ("h1", "h2", "h3", "h4", "h5"):
            self._heading = [self.pos(), []]
        if tag == "svg":
            self._svg = {"pos": self.pos(), "rows": [], "drawn": 0, "title": None, "cur": None,
                         "width": parse_num(str(a.get("width", "")).replace("px", "")) or 0}
        elif self._svg is not None:
            if tag in ("rect", "circle", "path", "line", "polyline", "polygon", "ellipse"):
                self._svg["drawn"] += 1
            data = {k[5:]: v for k, v in a.items() if k.startswith("data-")}
            if data:
                self._svg["rows"].append(data)
                self._svg["cur"] = data
            if tag == "title":
                self._svg["in_title"] = True
        if tag == "table":
            self._tables.append({"pos": self.pos(), "attrs": a, "rows": [], "caption": [], "section": "tbody", "cell": None,
                                 "in_caption": False})
        elif self._tables:
            t = self._tables[-1]
            if tag in ("thead", "tbody", "tfoot"):
                t["section"] = tag
            elif tag == "tr":
                t["rows"].append({"section": t["section"], "cells": []})
            elif tag in ("td", "th"):
                if not t["rows"]:
                    t["rows"].append({"section": t["section"], "cells": []})
                c = {"tag": tag, "text": [], "colspan": int(a.get("colspan") or 1), "rowspan": int(a.get("rowspan") or 1)}
                t["rows"][-1]["cells"].append(c)
                t["cell"] = c
            elif tag == "caption":
                t["in_caption"] = True
        if tag not in VOID:
            self.stack.append((tag, bool(KPI_CLASS.search(a.get("class", ""))), []))

    def handle_endtag(self, tag):
        if tag == "script" and self._script is not None:
            self._script["text"] = "".join(self._script["text"])
            self.scripts.append(self._script)
            self._script = None
            return
        if tag == "title":
            self._in_title = False
        if tag in ("h1", "h2", "h3", "h4", "h5") and self._heading:
            self.headings.append((self._heading[0], " ".join("".join(self._heading[1]).split())))
            self._heading = None
        if self._svg is not None:
            if tag == "title":
                self._svg["in_title"] = False
            if tag == "svg":
                self.svgs.append(self._svg)
                self._svg = None
        if self._tables:
            t = self._tables[-1]
            if tag in ("td", "th"):
                t["cell"] = None
            elif tag == "caption":
                t["in_caption"] = False
            elif tag == "table":
                self.tables.append(self._tables.pop())
        if tag in VOID:
            return
        for k in range(len(self.stack) - 1, -1, -1):
            if self.stack[k][0] == tag:
                for name, is_kpi, chunks in self.stack[k:]:
                    if is_kpi:
                        self.kpis.append((self.pos(), [c for c in chunks if c]))
                del self.stack[k:]
                break

    def handle_data(self, data):
        if self._script is not None:
            self._script["text"].append(data)
            return
        if self._in_title:
            self.title += data
        if self._heading:
            self._heading[1].append(data)
        if self._svg is not None and self._svg.get("in_title") and self._svg.get("cur") is not None:
            self._svg["cur"]["title"] = (self._svg["cur"].get("title", "") + data).strip()
        if self._tables:
            t = self._tables[-1]
            if t["cell"] is not None:
                t["cell"]["text"].append(data)
            elif t["in_caption"]:
                t["caption"].append(data)
        txt = " ".join(data.split())
        if txt:
            for _, is_kpi, chunks in self.stack:
                if is_kpi:
                    chunks.append(txt)


def heading_before(page, pos):
    best = None
    for p, text in page.headings:
        if p <= pos and text:
            best = text
    return best


ROUNDED = re.compile(r"\d\s*(k|K|m|M|mn|bn|B|Mio|Mrd|Tsd)\.?\s*\)?$")


def typed_columns(cols, rows, rounded=None):
    """Convert text cells to numbers/dates column by column where ≥80% of non-empty cells parse.
    rounded: a set that collects columns whose cells were shown abbreviated (15.8k, 1.2m)."""
    for j in range(len(cols)):
        vals = [r[j] for r in rows if r[j] not in (None, "") and not (isinstance(r[j], str) and r[j].strip().lower() in NIL)]
        if not vals or not all(isinstance(v, str) for v in vals):
            continue
        nums = [parse_num(v) for v in vals]
        if sum(x is not None for x in nums) >= 0.8 * len(vals) and not all(re.fullmatch(r"0\d+", v) for v in vals):
            if rounded is not None and any(ROUNDED.search(v) for v in vals):
                rounded.add(str(cols[j]))
            for r in rows:
                if isinstance(r[j], str):
                    p = parse_num(r[j])
                    r[j] = p if p is not None else (None if r[j].strip().lower() in NIL else r[j])
            continue
        dates = [parse_date(v) for v in vals]
        if sum(x is not None for x in dates) >= 0.8 * len(vals):
            for r in rows:
                if isinstance(r[j], str):
                    r[j] = parse_date(r[j]) or r[j]
    return rows


def table_dataset(page, t, where_prefix=""):
    grid, pending = [], {}
    for r in t["rows"]:
        row, col = [], 0
        cells = list(r["cells"])
        while cells or col in pending:
            if col in pending:
                txt, left, is_th = pending[col]
                row.append((txt, is_th))
                pending[col] = (txt, left - 1, is_th) if left > 1 else None
                if pending[col] is None:
                    del pending[col]
                col += 1
                continue
            c = cells.pop(0)
            txt = " ".join("".join(c["text"]).split())
            for _ in range(c["colspan"]):
                row.append((txt, c["tag"] == "th"))
                if c["rowspan"] > 1:
                    pending[col] = (txt, c["rowspan"] - 1, c["tag"] == "th")
                col += 1
        grid.append((r["section"], row))
    if not grid:
        return None
    width = max(len(r) for _, r in grid)
    grid = [(s, r + [("", False)] * (width - len(r))) for s, r in grid]
    head = [r for s, r in grid if s == "thead"]
    body = [(s, r) for s, r in grid if s != "thead"]
    if not head:
        while body and all(is_th for _, is_th in body[0][1]):
            head.append(body.pop(0)[1])
    if not head and len(body) > 1 and all(parse_num(x) is None for x, _ in body[0][1]) and \
            any(parse_num(x) is not None for x, _ in body[1][1]):
        head.append(body.pop(0)[1])
    cols = []
    for j in range(width):
        parts = []
        for h in head:
            if h[j][0] and h[j][0] not in parts:
                parts.append(h[j][0])
        cols.append(" · ".join(parts))
    rows = [[x for x, _ in r] for s, r in body if s != "tfoot" and not TOTAL_RE.match(r[0][0] or "")]
    totals = [[x for x, _ in r] for s, r in body if s == "tfoot" or TOTAL_RE.match(r[0][0] or "")]
    if not rows:
        return None
    if cols and not cols[0] and [r[0] for r in rows] == [str(i) for i in range(len(rows))]:  # pandas index
        cols, rows, totals = cols[1:], [r[1:] for r in rows], [r[1:] for r in totals]
    cols = [c or f"col{j + 1}" for j, c in enumerate(cols)]
    rounded = set()
    typed_columns(cols, rows, rounded)
    typed_columns(cols, totals) if totals else None
    caption = " ".join("".join(t["caption"]).split())
    name = caption or t["attrs"].get("aria-label") or heading_before(page, t["pos"]) or t["attrs"].get("id") or "Table"
    note = (f"shown abbreviated on the page and exported as shown (e.g. 15.8k → 15,800): {', '.join(sorted(rounded))}"
            if rounded else "")
    return Dataset(name, "HTML table", f"{where_prefix}line {t['pos'][0]}", cols, rows, totals, note)


# ------------------------------------------------------------------ extraction
class Extractor:
    def __init__(self, path, min_rows=2):
        self.path, self.min_rows = path, min_rows
        self.datasets, self.problems, self.symbols, self.runtime_only = [], [], {}, {}
        self.page = Page()

    def add(self, name, kind, where, cols, rows, totals=None, note=""):
        if not cols or len(rows) < (1 if kind in ("Chart", "KPI tiles") else self.min_rows):
            return
        rows = [[None if v == "" else v for v in r] + [None] * (len(cols) - len(r)) for r in rows]
        if kind in ("Embedded data", "External file", "Runtime (probe)"):
            typed_columns(cols, rows)
        if not any(v not in (None, "") for r in rows for v in r):
            return
        if re.fullmatch(r"[A-Za-z_$][\w$]{0,2}", name):  # minified variable name: name it by its columns
            note = (note + "; " if note else "") + f"variable {name}"
            name = ", ".join(map(str, cols[:3])) + (" …" if len(cols) > 3 else "")
        self.datasets.append(Dataset(name, kind, where, cols, rows, totals, note))

    def problem(self, what, where, why):
        self.problems.append((what, where, why))

    def run(self, html, probe=None):
        self.page.feed(html)
        self.page.close()
        for t in self.page.tables:
            d = table_dataset(self.page, t)
            if d:
                self.datasets.append(d)
        self.kpi_tiles()
        self.svg_charts()
        for sc in self.page.scripts:
            self.script(sc)
        renders = re.compile(r"\.(?:innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\(|createRoot\(|ReactDOM\.render|"
                             r"createApp\(|\.appendChild\(\s*document\.createElement\(\s*['\"]t[rd]")
        if not probe and any(renders.search(sc["text"]) for sc in self.page.scripts):
            self.problem("content built in the browser", "page", "part of the page (tables, text) is written by script "
                         "when it opens; anything it calculates on the way is not in the file — the probe captures the "
                         "page as shown")
        if probe:
            self.ingest_probe(probe)
        self.dedupe()
        return self

    # --- scripts
    def script(self, sc):
        a, text, line = sc["attrs"], sc["text"], sc["pos"][0]
        typ = (a.get("type") or "").lower()
        label = a.get("id") or f"script at line {line}"
        if a.get("src"):
            self.external(a["src"], f"<script src> line {line}", as_script=True)
            return
        if not text.strip() or typ in ("importmap", "speculationrules", "text/template", "text/x-template"):
            return
        if "json" in typ:
            try:
                obj = json.loads(text)
            except json.JSONDecodeError as e:
                self.problem(f"JSON script '{label}'", f"line {line}", f"not valid JSON ({e.msg})")
                return
            self.objects(obj, label, "Embedded data", f"<script type=\"{typ}\"> line {line}")
            return
        if typ in ("text/csv", "text/tab-separated-values", "text/plain"):
            rows = sniff_csv(text)
            if rows:
                self.objects(rows, label, "Embedded data", f"<script type=\"{typ}\"> line {line}")
            return
        head = text[:600].lower()
        if len(text) > 50000 and ("@license" in head or "copyright" in head or text.lstrip().startswith("/*!")):
            self.problem("inline library", f"line {line}", "skipped — library code, not data")
            return
        self.js(text, line)

    def js(self, text, line0, where_prefix="", kind="Embedded data"):
        consumed = []
        lineno = lambda i: line0 + text.count("\n", 0, i)
        inside = lambda i: any(a <= i < b for a, b in consumed)
        for rx, lib in CHART_CALLS:
            for m in rx.finditer(text):
                if inside(m.start()):
                    continue
                args = call_args(text, m.end())
                self.chart(lib, args, f"{where_prefix}line {lineno(m.start())}", text[m.start():m.start() + 300])
        assign = re.compile(r"(?:(?<![\w$.])(?:const|let|var)\s+|(?<![\w$])window\.|(?<![\w$])globalThis\.|[,;{(]\s*|^\s*)"
                            r"([A-Za-z_$][\w$]*)\s*=(?![=>])\s*(?=[\[{'\"`]|JSON\.parse\(|atob\()", re.M)
        for m in assign.finditer(text):
            if inside(m.start(1)):
                continue
            name = m.group(1)
            try:
                v, end = parse_js(text, m.end())
            except Exception:
                continue
            if isinstance(v, (dict, list)):
                consumed.append((m.end(), end))
                self.symbols[name] = v
                lib = is_chart_config(v)
                if lib:
                    self.chart({"echarts_or_highcharts": "echarts"}.get(lib, lib), [v], f"{where_prefix}line {lineno(m.start(1))}", "")
                else:
                    self.objects(v, name, kind, f"{where_prefix}line {lineno(m.start(1))}", strict=True)
        # long string payloads not covered above: JSON / CSV / base64 / gzip
        for m in re.finditer(r"(['\"`])((?:\\.|(?!\1)[^\\]){120,}?)\1", text):
            if inside(m.start()):
                continue
            try:
                s = JS(text, m.start()).string()
            except Exception:
                continue
            decoded = decode_b64(s) if re.fullmatch(r"[A-Za-z0-9+/=_\s-]+", s) else s
            if decoded is None:
                continue
            obj = parse_text(decoded)
            if isinstance(obj, (dict, list)):
                back = text[max(0, m.start() - 200):m.start()]
                nm = re.findall(r"([A-Za-z_$][\w$]*)\s*=[^;=]*$", back)
                self.objects(obj, nm[-1] if nm else f"payload at line {lineno(m.start())}", kind,
                             f"{where_prefix}line {lineno(m.start())} (encoded string)")
        for m in re.finditer(r"(?:fetch|d3\.(?:csv|tsv|json|text|dsv)|Papa\.parse|read_(?:csv|parquet|json)|loadData)"
                             r"\s*\(\s*(?:[^'\"`),]*,\s*)?['\"`]([^'\"`]+)['\"`]", text):
            self.external(m.group(1), f"{where_prefix}line {lineno(m.start())}")
        seen = set()
        for m in re.finditer(r"['\"`]([^'\"`\s]+\.(?:json|csv|tsv|parquet|arrow|xlsx|geojson))['\"`]", text):
            ref = m.group(1)
            if ref in seen or re.match(r"^(https?:)?//", ref) or text[max(0, m.start() - 12):m.start()].rstrip().endswith("$schema\":"):
                continue
            seen.add(ref)
            exists = (self.path.parent / ref.split("?")[0]).exists()
            if exists or "/" in ref or ref.endswith((".parquet", ".arrow")):  # a bare 'export.csv' is a download name
                self.external(ref, f"{where_prefix}line {lineno(m.start())}")

    def objects(self, obj, name, kind, where, strict=False):
        if is_chart_config(obj):
            self.chart({"echarts_or_highcharts": "echarts"}.get(is_chart_config(obj), is_chart_config(obj)), [obj], where, "")
            return
        for nm, cols, rows in find_tables(obj, name, self.min_rows):
            if strict and len(rows) < 20 and not any(isnum(r[j]) or (isinstance(r[j], str) and parse_num(r[j]) is not None)
                                                     for r in rows for j in range(len(cols))):
                continue  # small table without a single number in a script: UI configuration, not data
            self.add(nm, kind, where, cols, rows)

    def chart(self, lib, args, where, src, kind="Chart", title_hint=None):
        args = [self.resolve(x) for x in args]
        el = next((x for x in args if isinstance(x, str)), None)
        if el is None:
            m = re.search(r"getElementById\(\s*['\"]([^'\"]+)|querySelector\(\s*['\"]#([^'\"]+)|init\(\s*document\.getElementById\(\s*['\"]([^'\"]+)", src)
            el = next((g for g in m.groups() if g), None) if m else None
        el = el.lstrip("#") if el else None
        cfgs = [x for x in args if isinstance(x, (dict, list))]
        if not cfgs:
            self.problem(f"{lib} chart{f' #{el}' if el else ''}", where, "chart configuration is built at runtime")
            return
        want = {"vega": ("$schema", "mark", "datasets", "layer", "data"), "chartjs": ("data", "type"),
                "apex": ("series",), "highcharts": ("series",), "echarts": ("series", "dataset")}
        if lib == "plotly":
            cfg, extra = cfgs[0], {"layout": cfgs[1] if len(cfgs) > 1 and isinstance(cfgs[1], dict) else None}
        else:  # the configuration argument, not the options argument that often follows it
            cfg = next((c for c in cfgs if isinstance(c, dict) and any(k in c for k in want[lib])), cfgs[0])
            extra = {}
        if lib == "echarts" and isinstance(cfg, dict) and ("chart" in cfg or "xAxis" in cfg and isinstance(cfg.get("xAxis"), dict)
                                                         and "categories" in cfg["xAxis"]):
            lib = "highcharts"
        cfg = self.resolve_deep(cfg)
        title, tabs, problem = chart_tables(lib, cfg, extra)
        pos = self.page.ids.get(el) if el else None
        base = title or title_hint or (heading_before(self.page, pos) if pos else None) or (f"#{el}" if el else f"{lib} chart")
        if problem:
            self.problem(f"{lib} chart '{base}'", where, problem + " — its source data is exported if it is in the file; "
                                                            "the drawn values can be captured with the probe")
            if el:
                self.runtime_only[el] = self.problems[-1]
        for suffix, cols, rows in tabs:
            self.add(f"{base} · {suffix}" if suffix and len(tabs) > 1 else base, kind, where, cols, rows,
                     note=f"{lib} chart")

    def resolve(self, v):
        if isinstance(v, Expr) and re.fullmatch(r"[A-Za-z_$][\w$]*", v.src) and v.src in self.symbols:
            return self.symbols[v.src]
        return v

    def resolve_deep(self, v, depth=0):
        if depth > 6:
            return v
        if isinstance(v, dict):
            return {k: self.resolve_deep(self.resolve(x), depth + 1) for k, x in v.items()}
        if isinstance(v, list):
            return [self.resolve_deep(self.resolve(x), depth + 1) for x in v]
        return self.resolve(v)

    # --- external files
    def external(self, ref, where, as_script=False):
        if re.match(r"^(https?:)?//", ref):
            if not as_script:
                self.problem(f"remote data '{ref}'", where, "on a server — not fetched (would leave this machine); "
                                                           "capture it with the probe if needed")
            return
        if ref.startswith(("data:", "blob:", "#")):
            return
        p = (self.path.parent / ref.split("?")[0]).resolve()
        if not p.exists():
            if not as_script:
                self.problem(f"file '{ref}'", where, "referenced but not found next to the dashboard")
            else:
                self.problem(f"script '{ref}'", where, "local script not found — if it holds data, place it next to the dashboard")
            return
        if any(d.where.startswith(f"file {ref}") for d in self.datasets):
            return
        suf = p.suffix.lower()
        w = f"file {ref} ({where})"
        try:
            if as_script or suf in (".js", ".mjs"):
                if p.stat().st_size > 2_000_000 and re.search(r"\.min\.js$", p.name):
                    return
                self.js(p.read_text(encoding="utf-8", errors="replace"), 1, f"{ref} ", "External file")
            elif suf in (".json", ".geojson"):
                self.objects(json.loads(p.read_text(encoding="utf-8")), p.stem, "External file", w)
            elif suf in (".csv", ".tsv", ".txt"):
                text = p.read_text(encoding="utf-8-sig")
                d = "\t" if suf == ".tsv" else csv.Sniffer().sniff(text[:5000], delimiters=",;\t|").delimiter
                r = list(csv.reader(io.StringIO(text), delimiter=d))
                self.add(p.stem, "External file", w, r[0], r[1:])
            elif suf == ".parquet":
                cols, rows = read_parquet(p)
                self.add(p.stem, "External file", w, cols, rows)
            else:
                self.problem(f"file '{ref}'", where, f"{suf} files are not read by this script")
        except Exception as e:
            self.problem(f"file '{ref}'", where, f"could not be read: {e}")

    # --- page elements
    def kpi_tiles(self):
        rows = []
        for pos, chunks in self.page.kpis:
            if not 2 <= len(chunks) <= 5:
                continue
            nums = [c for c in chunks if parse_num(c) is not None or re.fullmatch(r"[\d:.,']+\s*\w{0,4}", c)]
            labels = [c for c in chunks if c not in nums]
            if nums and labels:
                rows.append([labels[0], parse_num(nums[0]) if parse_num(nums[0]) is not None else nums[0], nums[0],
                             " · ".join(chunks[chunks.index(nums[0]) + 1:]) or None, pos])
        seen, uniq = set(), []
        for r in rows:  # nested tile classes (kpi > kpi-value) report the same tile twice: keep the outer one
            key = (r[0], r[2])
            if key not in seen:
                seen.add(key)
                uniq.append(r[:4])
        if uniq:
            self.add("KPI tiles", "KPI tiles", "page", ["label", "value", "as shown", "note"], uniq)

    def svg_charts(self):
        for s in self.page.svgs:
            name = heading_before(self.page, s["pos"]) or f"SVG at line {s['pos'][0]}"
            rows = [r for r in s["rows"] if len(r) >= 1]
            if len(rows) >= 2:
                cols, recs = records_table(rows)
                recs = typed_columns(cols, recs)
                self.add(name, "SVG chart", f"line {s['pos'][0]}", cols, recs)
            elif s["drawn"] and (s["width"] == 0 or s["width"] > 64):  # small svgs are icons
                self.problem(f"SVG chart '{name}'", f"line {s['pos'][0]}", "drawn shapes without data values — not extractable")

    # --- runtime probe
    def ingest_probe(self, probe):
        for c in probe.get("charts", []):
            lib = c.get("lib")
            title, tabs, problem = chart_tables(lib, c.get("config") or {}, {"layout": (c.get("config") or {}).get("layout")})
            base = title or c.get("title") or (f"#{c['id']}" if c.get("id") else f"{lib} chart")
            if c.get("id") in self.runtime_only and not problem:
                title = title or self.runtime_only[c["id"]][0].split("'")[1]
                base = title
                self.problems.remove(self.runtime_only.pop(c["id"]))  # captured after all
            for suffix, cols, rows in tabs:
                self.add(f"{base} · {suffix}" if suffix and len(tabs) > 1 else base, "Runtime (probe)",
                         f"rendered page, {lib}" + (f" #{c['id']}" if c.get("id") else ""), cols, rows)
        for name, v in (probe.get("globals") or {}).items():
            self.objects(v, name, "Runtime (probe)", "rendered page, window." + name)
        for k, html in enumerate(probe.get("tables") or []):
            p = Page()
            p.feed(html)
            for t in p.tables:
                d = table_dataset(p, t, "rendered page, ")
                if d:
                    d.kind = "Runtime (probe)"
                    d.name = d.name if d.name != "Table" else f"Rendered table {k + 1}"
                    self.datasets.append(d)

    def dedupe(self):
        order = {k: i for i, k in enumerate(KIND_ORDER)}
        self.datasets.sort(key=lambda d: order.get(d.kind, 99))
        seen, keep = {}, []
        for d in self.datasets:
            sig = d.signature()
            if sig in seen and sig[1]:
                first = seen[sig]
                same = f"also shown as {d.kind.lower()} '{d.name}'" if d.kind != first.kind else f"identical: '{d.name}'"
                first.note = (first.note + "; " if first.note else "") + same
                continue
            seen[sig] = d
            keep.append(d)
        self.datasets = keep


def read_parquet(p):
    try:
        import pyarrow.parquet as pq
        t = pq.read_table(p)
        return t.column_names, [list(r.values()) for r in t.to_pylist()]
    except ImportError:
        pass
    try:
        import duckdb
        rel = duckdb.sql(f"select * from read_parquet('{p.as_posix()}')")
        return rel.columns, [list(r) for r in rel.fetchall()]
    except ImportError:
        raise RuntimeError("needs pyarrow or duckdb (pip install pyarrow)")


# ------------------------------------------------------------------ workbook (corporate xlsx-report style, minimal)
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


def isnum(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def col_format(header, vals):
    nums = [v for v in vals if isnum(v)]
    if not nums or len(nums) < 0.8 * len([v for v in vals if v is not None]):
        if any(isinstance(v, dt.date) for v in vals):
            return "date", "yyyy-mm-dd"
        return "text", None
    if all(isinstance(v, int) or float(v).is_integer() for v in nums):
        return "num", '#,##0;-#,##0;0'
    if PCT_HINT.search(str(header)) and all(-1.5 <= v <= 1.5 for v in nums):
        return "num", "0.0%"
    dec = max(min(len(repr(float(v)).split(".")[1].rstrip("0")), 3) if "e" not in repr(float(v)) else 3 for v in nums)
    return "num", "#,##0" + ("." + "0" * max(dec, 1) if dec else "")


def put(ws, r, c, v, font=F_BODY, align=A_L, fmt=None, border=None):
    x = ws.cell(r, c, v)
    if isinstance(v, str) and v.startswith("="):
        x.data_type = "s"  # data that starts with '=' stays text
    x.font, x.alignment = font, align
    if fmt:
        x.number_format = fmt
    if border:
        x.border = border
    return x


def finish(ws, fit=True):
    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape"
    if fit:
        ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True


def sheet_name(name, used):
    base = re.sub(r"[\[\]:*?/\\']", " ", str(name)).strip() or "Data"
    base = " ".join(base.split())[:31]
    n, cand = 2, base
    while cand.lower() in used:
        suffix = f" ({n})"
        cand = base[:31 - len(suffix)] + suffix
        n += 1
    used.add(cand.lower())
    return cand


def write_dataset(wb, d, used):
    d.sheet = sheet_name(d.name, used)
    ws = wb.create_sheet(d.sheet)
    kinds = []
    for j, h in enumerate(d.columns, 1):
        kind, fmt = col_format(h, [r[j - 1] for r in d.rows])
        kinds.append((kind, fmt))
        put(ws, 1, j, str(h), F_HEAD, A_HR if kind == "num" else A_HL, border=B_HEAD)
    ws.row_dimensions[1].height = 26
    for i, r in enumerate(d.rows, 2):
        for j, v in enumerate(r, 1):
            kind, fmt = kinds[j - 1]
            if d.kind == "KPI tiles" and j == 2 and isnum(v):  # each tile has its own unit
                shown = str(r[2])
                fmt = "0.0%" if "%" in shown else ("#,##0" if float(v).is_integer() else "#,##0.0##")
            elif d.columns == ["key", "value"] and j == 2 and isnum(v) and PCT_HINT.search(str(r[0])) and abs(v) <= 1.5:
                fmt = "0.0%"  # openRate: 0.45 in a key/value list
            x = put(ws, i, j, v, align=A_R if isnum(v) else A_L, fmt=fmt if isnum(v) or isinstance(v, dt.date) else None)
            if isinstance(v, str) and re.match(r"^https?://\S+$", v):
                x.hyperlink, x.font = v, F_LINK
    last = len(d.rows) + 1
    for j in range(1, len(d.columns) + 1):
        ws.cell(last, j).border = B_FOOT
    for k, t in enumerate(d.totals):
        rr = last + 2 + k
        for j, v in enumerate(t, 1):
            put(ws, rr, j, v, F_BOLD, A_R if isnum(v) else A_L, kinds[j - 1][1] if isnum(v) and j <= len(kinds) else None,
                B_TOTAL)
    if d.totals:
        put(ws, last + 2 + len(d.totals), 1, "Total row as shown in the dashboard — kept out of the data range above",
            F_SUB)
    ws.auto_filter.ref = f"A1:{get_column_letter(len(d.columns))}{last}"
    ws.freeze_panes = "B2" if len(d.columns) >= 6 and not isnum(d.rows[0][0]) else "A2"
    for j, h in enumerate(d.columns, 1):
        sample = [r[j - 1] for r in d.rows[:300]]
        w = max([len(str(v)) if not isnum(v) else len(f"{v:,.2f}") for v in sample if v is not None] + [6])
        ws.column_dimensions[get_column_letter(j)].width = min(max(w, min(len(str(h)), 18)) + 2, 60)
    finish(ws, fit=False)


def write_workbook(ex, out, source_name):
    wb = Workbook()
    ov = wb.active
    ov.title = "Overview"
    used = {"overview"}
    for d in ex.datasets:
        write_dataset(wb, d, used)
    put(ov, 1, 1, "Dashboard data extract", F_TITLE)
    put(ov, 2, 1, "Values exactly as found in the dashboard file — no calculations. Formatted numbers (1.2k, 45 %, "
                  "12'345) are converted to numbers; totals shown on the page are kept apart from the data.", F_SUB)
    r = 4
    for lab, val in (("Source file", source_name), ("Page title", " ".join(ex.page.title.split()) or "—"),
                     ("Extracted on", dt.date.today().isoformat()),
                     ("Datasets", len(ex.datasets)), ("Not extracted", len(ex.problems))):
        put(ov, r, 1, lab, F_SUB)
        put(ov, r, 2, val, align=A_L)
        r += 1
    r += 1
    put(ov, r, 1, "Datasets", F_BLOCK)
    r += 1
    heads = ["Sheet", "Found as", "Where", "Rows", "Columns", "Note"]
    for j, h in enumerate(heads, 1):
        put(ov, r, j, h, F_HEAD, A_HR if h in ("Rows", "Columns") else A_HL, border=B_HEAD)
    r += 1
    for d in ex.datasets:
        put(ov, r, 1, f'=HYPERLINK("#\'{d.sheet}\'!A1","{d.sheet.replace(chr(34), chr(39))}")', F_LINK)
        ov.cell(r, 1).data_type = "f"
        put(ov, r, 2, d.kind)
        put(ov, r, 3, d.where)
        put(ov, r, 4, len(d.rows), align=A_R, fmt="#,##0")
        put(ov, r, 5, len(d.columns), align=A_R, fmt="#,##0")
        put(ov, r, 6, " — ".join(x for x in (d.name if d.name != d.sheet else "", d.note) if x), F_SUB)
        r += 1
    for j in range(1, len(heads) + 1):
        ov.cell(r - 1, j).border = B_FOOT
    r += 2
    put(ov, r, 1, "Not extracted", F_BLOCK)
    r += 1
    if ex.problems:
        for j, h in enumerate(["What", "Where", "Why"], 1):
            put(ov, r, j, h, F_HEAD, A_HL, border=B_HEAD)
        r += 1
        for what, where, why in ex.problems:
            put(ov, r, 1, what)
            put(ov, r, 2, where)
            put(ov, r, 3, why)
            r += 1
        for j in range(1, 4):
            ov.cell(r - 1, j).border = B_FOOT
    else:
        put(ov, r, 1, "Nothing — every data source found in the file was exported.", F_SUB)
    for col, w in zip("ABCDEF", (34, 16, 34, 8, 9, 60)):
        ov.column_dimensions[col].width = w
    finish(ov)
    wb.save(out)


def read_back(out, ex):
    """Every sheet must hold exactly the extracted rows: row count, text cells, numeric sums."""
    wb = load_workbook(out)
    problems = []
    for d in ex.datasets:
        ws = wb[d.sheet]
        got = [[c.value for c in row] for row in ws.iter_rows(min_row=2, max_row=len(d.rows) + 1, max_col=len(d.columns))]
        if len(got) != len(d.rows):
            problems.append(f"{d.sheet}: {len(got)} rows, expected {len(d.rows)}")
            continue
        for j in range(len(d.columns)):
            a = sum(r[j] for r in d.rows if isnum(r[j]))
            b = sum(r[j] for r in got if isnum(r[j]))
            if abs(a - b) > 1e-6 * max(1, abs(a)):
                problems.append(f"{d.sheet} · {d.columns[j]}: sum {b} in the workbook, {a} extracted")
            ta = [str(r[j]) for r in d.rows if isinstance(r[j], str)]
            tb = [str(r[j]) for r in got if isinstance(r[j], str)]
            if ta != tb:
                problems.append(f"{d.sheet} · {d.columns[j]}: text cells differ")
    return problems


PROBE = r"""(() => {
  const safe = o => { try { return JSON.parse(JSON.stringify(o, (k, v) =>
      typeof v === 'function' || (typeof Node !== 'undefined' && v instanceof Node) ? undefined : v)); } catch (e) { return null; } };
  const out = { url: location.href, charts: [], globals: {}, tables: [] };
  try { if (window.Chart) Object.values(Chart.instances || {}).forEach(c => out.charts.push({ lib: 'chartjs',
      id: c.canvas && c.canvas.id, config: safe({ type: c.config.type, data: { labels: Array.from(c.data.labels || []),
      datasets: c.data.datasets.map(d => ({ label: d.label, data: Array.from(d.data || []) })) },
      options: { plugins: { title: { text: c.options && c.options.plugins && c.options.plugins.title
      && c.options.plugins.title.text } } } }) })); } catch (e) {}
  try { document.querySelectorAll('.js-plotly-plot').forEach(el => out.charts.push({ lib: 'plotly', id: el.id,
      config: safe({ data: el.data, layout: { title: el.layout && el.layout.title } }) })); } catch (e) {}
  try { if (window.echarts) document.querySelectorAll('[_echarts_instance_]').forEach(el => { const i = echarts.getInstanceByDom(el);
      if (i) out.charts.push({ lib: 'echarts', id: el.id, config: safe(i.getOption()) }); }); } catch (e) {}
  try { if (window.Highcharts) Highcharts.charts.filter(Boolean).forEach(c => out.charts.push({ lib: 'highcharts',
      id: c.renderTo && c.renderTo.id, config: safe({ title: { text: c.title && c.title.textStr },
      xAxis: c.xAxis.map(a => ({ categories: a.categories })), series: c.series.map(s => ({ name: s.name, type: s.type,
      data: s.options.data })) }) })); } catch (e) {}
  try { const f = document.createElement('iframe'); f.style.display = 'none'; document.body.appendChild(f);
      const base = new Set(Object.getOwnPropertyNames(f.contentWindow)); f.remove();
      for (const k of Object.getOwnPropertyNames(window)) { if (base.has(k)) continue; let v; try { v = window[k]; } catch (e) { continue; }
        if (v && typeof v === 'object' && !(v instanceof Node) && !Object.values(v).some(x => typeof x === 'function')) {
          const s = safe(v); const n = s && JSON.stringify(s).length;
          if (n > 60 && n < 50e6) out.globals[k] = s; } } } catch (e) {}
  out.tables = [...document.querySelectorAll('table')].map(t => t.outerHTML);
  return JSON.stringify(out);
})()"""


def inside_git_repo(path):
    return any((p / ".git").exists() for p in [path.resolve().parent, *path.resolve().parent.parents])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dashboard", type=Path, nargs="?", help="the dashboard .html")
    ap.add_argument("--out", type=Path, help="output .xlsx (default: next to the dashboard)")
    ap.add_argument("--probe-json", type=Path, help="output of the browser probe (see --print-probe)")
    ap.add_argument("--print-probe", action="store_true", help="print the JavaScript to run on the open page, then exit")
    ap.add_argument("--min-rows", type=int, default=2, help="smallest embedded table to export (default 2)")
    ap.add_argument("--allow-git", action="store_true", help="write even if the output folder is inside a Git repository")
    a = ap.parse_args()
    if a.print_probe:
        print(PROBE)
        return 0
    if not a.dashboard:
        ap.error("dashboard path required")
    html = a.dashboard.read_text(encoding="utf-8", errors="replace")
    probe = json.loads(a.probe_json.read_text(encoding="utf-8")) if a.probe_json else None
    if isinstance(probe, str):
        probe = json.loads(probe)
    ex = Extractor(a.dashboard, a.min_rows).run(html, probe)

    print(f"{a.dashboard.name}: {len(ex.datasets)} datasets, {len(ex.problems)} not extracted")
    for d in ex.datasets:
        print(f"  {d.kind:<16} {d.name[:50]:<50} {len(d.rows):>7,} rows × {len(d.columns):<3} {d.where}")
    for what, where, why in ex.problems:
        print(f"  NOT EXTRACTED  {what} ({where}): {why}")
    if not ex.datasets:
        print("\nNo data found in the file. If the page builds its data at runtime, use --print-probe.")
        return 1
    stem = a.dashboard.stem if a.dashboard.stem.lower() != "index" else a.dashboard.parent.name
    out = a.out or a.dashboard.with_name(f"{stem}-data.xlsx")
    if out.suffix.lower() != ".xlsx":
        raise SystemExit("--out must end in .xlsx")
    if inside_git_repo(out) and not a.allow_git:
        raise SystemExit(f"{out.parent} is inside a Git repository. The workbook holds the dashboard's data — write it "
                         "elsewhere (--out) or pass --allow-git if the folder is git-ignored or the data is synthetic.")
    write_workbook(ex, out, a.dashboard.name)
    problems = read_back(out, ex)
    if problems:
        print(f"\nREAD-BACK CHECK FAILED — {len(problems)} problem(s):")
        for p in problems[:30]:
            print(f"  {p}")
        return 1
    print(f"\nWrote {out} — {len(ex.datasets) + 1} sheets. Read-back check passed: every sheet holds exactly the "
          "extracted rows and values.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```
