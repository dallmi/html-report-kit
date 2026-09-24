---
name: comms-dashboard-v3-fill
description: Fills the redesigned (v3) Comms Intelligence Dashboard with real data taken from the original (v2) dashboard HTML — extracts the embedded DATA block, checks every field v3 reads, adds reporting year, data cut-off date, source line and optional prior-year data, and writes a new v3 file next to the original. Use this whenever someone has the original Comms Intelligence Dashboard (an .html with mailings, articles, pages, video and click tracking) and wants the new/v3/redesigned dashboard populated, refreshed or updated with its numbers — "fill v3 with the real data", "move the data into the new dashboard", "update the new dashboard", "take the data points from the original", "refresh v3 with this month's file" — even if they never say "DATA" or "template".
---

# Comms dashboard: fill v3 from the original

The original Comms Intelligence Dashboard (v2) is a single HTML file. It fetches nothing: all its data sits in one line, `const DATA = {...};`, written into the file when it was built from the source Excel exports. The v3 template has the same `DATA` schema and an empty slot, `const DATA = /*__DATA__*/null;`. Filling v3 means moving that one block across — **unchanged** — and adding the few fields v3 uses that v2 never had.

You are moving numbers, not producing them. Never edit, recompute, round, filter or "fix" a value in `DATA`. If the data looks wrong, report it; the owner of the original fixes it at the source.

The risk this skill guards against is silent: v3 does not crash on a missing or renamed field, it shows `0` or `n/a`. A page that looks fine can be wrong. That is why the script checks every field v3 reads before it writes anything, and why step 4 reconciles against the original.

## What you need

| Input | Required | Notes |
|---|---|---|
| Original dashboard `.html` (v2, with data) | yes | The file itself, not a screenshot or PDF. Usually in the user's Downloads |
| `template-v3.html` (empty) | yes | Must contain `/*__DATA__*/null`. A filled v3 build will not work as template |
| Data cut-off date (`YYYY-MM-DD`) | recommended | Last day the export covers. Drives "Data to …" in the header and the partial-month flag. Without it the header shows "—" |
| Prior-year original `.html` | optional | Same dashboard built from last year's exports. Switches on the year-on-year comparison |

Ask for the missing items **in one question**. Do not guess the cut-off date from a file name — a pack-list date is not the data cut-off.

## Workflow

### 1. Save the script, run a check first

Save the script from the appendix as `fill_v3.py` (Python 3.8+, standard library only) and run it in check mode — it writes nothing:

```bash
python fill_v3.py ORIGINAL.html template-v3.html --as-of 2026-08-31 --check
```

It prints what it read, then a list of `ERROR` / `WARN` / `note` lines, then reference figures.

### 2. Resolve errors — never by editing numbers

- **All clean** → step 3.
- **A field is missing but exists under another name** (e.g. `arts: field 'uv' missing in 291 of 291 records` and the original's records carry `unique_visitors`): confirm in the original's JavaScript how it reads that field (search the original for the render function of that tab), then map it:
  ```bash
  python fill_v3.py ORIGINAL.html template-v3.html --rename arts.unique_visitors=uv --check
  ```
  `--rename` is repeatable: `dataset.old=new` for record fields and `mailP` columns, `old=new` for a top-level key. Only map a field when the original's code shows it is the same measure. Never map two different measures onto each other to make an error go away.
- **A field is missing and has no counterpart** → stop. Tell the user which tab would show zeros and that the original's owner needs to add it to the export. Do not fill it with zeros or placeholders.
- **`DATA is a JavaScript literal`** → the script evaluates it with Node automatically. Without Node: open the original in a browser, run `copy(JSON.stringify(DATA))` in the developer console, paste into `data.json`, and add `--data-json data.json`.
- **`no const DATA found`** → the file is not the dashboard (a saved-as page, a PDF, an email export). Ask for the original `.html`.
- **`WARN` lines** are judgement calls — read each one and mention it in the report. `note` lines are informational.

### 3. Write the file

```bash
python fill_v3.py ORIGINAL.html template-v3.html --as-of 2026-08-31 [--prior ORIGINAL_2025.html]
```

The result is written next to the original as `comms-intelligence-dashboard-v3-<cut-off>.html` (or `--out PATH`). The script:
- copies every value in `DATA` unchanged (it only adds `year`, `asOf`, `prior`, `source`)
- reads the source line (`Source: …`, `Pack names: …`) from the original's header and shows it in the v3 header; pass `--source "…"` if it cannot find it
- infers the reporting year from the data; pass `--year` if it cannot
- escapes `</` so a title containing `</script>` cannot break the page
- refuses to overwrite the original or the template, and refuses to write into a Git repository (see Rules)

### 4. Reconcile against the original — the job isn't done until this passes

Open the original and the new file side by side, all filters on **(All)**, and compare with the reference figures the script printed:

| Original (v2) Overview | v3 | Must |
|---|---|---|
| Mailings in scope `x / y` | Row counts | match exactly |
| Emails sent, and "n mailings" under it | Summary → Emails sent | match exactly |
| Open rate / Click-to-open (simple avg) | v3 defaults to **volume-weighted**. Open *Method & data quality* in the header, switch to **Simple average**, then compare | match to 0.1 pp |
| Article views, video views, video completion | Articles / Video tabs | match |

Also click every v3 tab once: no tab may show `NaN`, `undefined`, or "No data in scope" where the original has data. Check the browser console for errors.

If v3 figures differ from the original while the script's reference figures match the original, the difference is in the v3 template, not the data — report it; do not adjust the data to hide it. If you cannot open a browser, say so and hand the user this table as a checklist.

### 5. Report back

Briefly:
- where the file is and that it opens by double-click (no server needed)
- the reference figures and whether they matched the original
- any `--rename` mapping used and why, every `WARN`, and what is switched off (no cut-off date → no partial-month flag; no prior-year file → no year-on-year comparison)

## Rules

- **The output contains real data.** Keep it where the original lives. Never put it, the original, or the extracted `DATA` into a Git repository, a ticket, a chat outside the organisation, or a public tool. The script blocks Git folders; `--allow-git` exists only for folders that are git-ignored.
- **Do not edit `template-v3.html`** to make data fit. If the template needs a change, that is a separate task.
- **Do not print or paste `DATA` contents** into the conversation beyond the aggregate reference figures — names, titles and per-mailing figures stay in the file.
- When re-running for a new month, start again from the empty `template-v3.html`, never from last month's filled file.

---

## Appendix — `fill_v3.py`

Save exactly as `fill_v3.py`. Run with Python 3.8+ (standard library only). Exit code 1 means errors were found and nothing was written.

```python
#!/usr/bin/env python3
"""Move the DATA block of the original (v2) Comms Intelligence dashboard into the v3 template.

    python fill_v3.py ORIGINAL.html TEMPLATE_V3.html [--as-of YYYY-MM-DD] [--prior ORIGINAL_PRIOR_YEAR.html]
                      [--year YYYY] [--source "text"] [--rename dataset.old=new ...] [--out OUT.html] [--check]

Standard library only. Node.js is used only as a fallback when the original's DATA is a
JavaScript literal rather than JSON. Exit code 1 = nothing was written.
"""
import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

MARKER = "/*__DATA__*/null"

# Fields the v3 template reads. A missing one does not crash the page — it shows 0 or n/a — so it is an error here.
MAIL_ARRAYS = ["q", "m", "t", "es", "op", "uc", "ms", "po", "pc", "pu", "th", "tp"]
MAIL_DIMS = ["cc", "div", "map", "team", "ct", "tm", "cl", "pk", "tcl", "tid"]
PG_ATTRS = ["site", "url", "div", "ct", "ov", "th", "tp", "org", "rg"]
RECORDS = {
    "arts": ["t", "ds", "m", "q", "au", "ov", "th", "tp", "ts", "rg", "ch", "pk", "tcl", "tid", "v", "uv", "li", "co"],
    "vids": ["t", "div", "m", "q", "lang", "v", "uv", "c1", "c25", "c50", "c75", "c100", "eng"],
    "pages": ["site", "p", "url", "v", "uv", "c", "ucl", "d"],
    "links": ["t", "p", "url", "dest", "c", "ucl", "d"],
    "pgLevel": PG_ATTRS + ["uv", "vis", "v", "uvy", "vy", "li", "co"],
    "pgDiv": PG_ATTRS + ["sp", "uv"],
    "pgReg": PG_ATTRS + ["sp", "uv"],
}
SRC_KEYS = {"mail": "mailP", "arts": "arts", "vids": "vids", "pages": "pages", "links": "links", "pgLevel": "pgLevel"}
REQUIRED_TOP = ["mailP", "hcGeduld", "hcDash", "src"] + list(RECORDS)


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
            if j < 0:
                return len(s)
            # keep the v2/v3 marker comment out of the way, it is not part of the value
            i = j + 2
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
    end = _expression_end(html, start)
    expr = html[start:end].strip()
    if expr in ("", "null"):
        raise SystemExit(f"{label}: DATA is empty (null) — this is an unfilled template, not a dashboard with data.")
    try:
        return json.loads(expr), "json"
    except json.JSONDecodeError:
        pass
    node = shutil.which("node")
    if not node:
        raise SystemExit(f"{label}: DATA is a JavaScript literal, not JSON, and Node.js is not installed to read it. "
                         "Install Node, or open the original in a browser, run copy(JSON.stringify(DATA)) in the "
                         "console, paste into data.json and pass --data-json data.json.")
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


def visible_text(html):
    html = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", html)
    html = re.sub(r"(?s)<[^>]+>", "\n", html)
    return re.sub(r"&middot;", "·", re.sub(r"&amp;", "&", html))


def source_from_original(html):
    txt = visible_text(html)
    parts = []
    for lab in ("Source", "Pack names"):
        m = re.search(rf"{lab}:\s*([^\n]+)", txt)
        if m and m.group(1).strip():
            parts.append(("" if lab == "Source" else f"{lab}: ") + m.group(1).strip())
    return " · ".join(parts) or None


# ------------------------------------------------------------------ fixes and checks
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


def check_mail(P, rep, where="mailP"):
    if not isinstance(P, dict):
        rep.err(f"{where} is not an object")
        return 0
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
        c, d = cols[k], dims[k]
        if len(c) != n:
            rep.err(f"{where}.cols.{k} has {len(c)} entries, expected {n}")
        bad = sum(1 for x in c if not isinstance(x, int) or not 0 <= x < len(d))
        if bad:
            rep.err(f"{where}.cols.{k}: {bad} index values point outside dims.{k} ({len(d)} labels)")
    for k in ("es", "op", "uc"):
        bad = sum(1 for x in P.get(k) or [] if not isinstance(x, (int, float)))
        if bad:
            rep.err(f"{where}.{k}: {bad} non-numeric values")
    return n


def check_records(data, rep, names=RECORDS, where=""):
    for ds in names:
        recs = data.get(ds)
        if not isinstance(recs, list):
            rep.err(f"{where}{ds} missing or not a list")
            continue
        if not recs:
            rep.warn(f"{where}{ds} is empty — its tab will show 'No data in scope'")
            continue
        missing = Counter(f for r in recs for f in RECORDS[ds] if not isinstance(r, dict) or f not in r)
        for f, c in missing.items():
            rep.err(f"{where}{ds}: field {f!r} missing in {c} of {len(recs)} records")
        extra = sorted({k for r in recs[:200] if isinstance(r, dict) for k in r} - set(RECORDS[ds]))
        if extra:
            rep.note(f"{where}{ds}: fields not used by v3 (ignored): {', '.join(extra)}")


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


def check_all(data, rep, year):
    for k in REQUIRED_TOP:
        if k not in data:
            rep.err(f"top-level key {k!r} missing")
    n = check_mail(data.get("mailP"), rep)
    check_records(data, rep)
    src = data.get("src") or {}
    for k, ds in SRC_KEYS.items():
        have = n if ds == "mailP" else len(data.get(ds) or [])
        if k not in src:
            rep.err(f"src.{k} missing (denominator for the 'x / y' row counts)")
        elif isinstance(src[k], (int, float)) and src[k] < have:
            rep.warn(f"src.{k} = {src[k]} is smaller than the {have} rows present")
    for hc in ("hcGeduld", "hcDash"):
        keys = [k for k in (data.get(hc) or {}) if str(k).startswith(f"{year}-")]
        if hc in data and not keys:
            rep.err(f"{hc} has no {year}-MM entries — article reach would be empty")
    extra = sorted(set(data) - set(REQUIRED_TOP) - {"year", "asOf", "prior", "source"})
    if extra:
        rep.note(f"top-level keys not used by v3 (kept, ignored): {', '.join(extra)}")


def reference_figures(data):
    P = data["mailP"]
    mean = lambda xs: (sum(xs) / len(xs)) if xs else None
    po = [x for x in P["po"] if x is not None]
    pc = [x for x in P["pc"] if x is not None]
    vids = data.get("vids") or []
    c1, c100 = sum(v.get("c1", 0) for v in vids), sum(v.get("c100", 0) for v in vids)
    pct = lambda x: "n/a" if x is None else f"{x * 100:.1f}%"
    return [
        ("Mailing rows in scope / source", f"{len(P['es']):,} / {(data.get('src') or {}).get('mail', '?'):,}"),
        ("Emails sent", f"{sum(P['es']):,}  ({sum(x or 0 for x in P['ms']):,} mailings incl. resends)"),
        ("Open rate, simple average", f"{pct(mean(po))}  ({len(po):,} mailings)"),
        ("Click-to-open, simple average", f"{pct(mean(pc))}  ({len(pc):,} mailings)"),
        ("Unique clicks", f"{sum(P['uc']):,}"),
        ("Articles / article views", f"{len(data['arts']):,} / {sum(a.get('v', 0) for a in data['arts']):,}"),
        ("Videos / video views", f"{len(vids):,} / {sum(v.get('v', 0) for v in vids):,}"),
        ("Video completion (100% / started)", pct(c100 / c1 if c1 else None)),
    ]


def inside_git_repo(path):
    return any((p / ".git").exists() for p in [path.resolve().parent, *path.resolve().parent.parents])


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("original", type=Path, help="original (v2) dashboard HTML with real data")
    ap.add_argument("template", type=Path, help="empty v3 template (contains /*__DATA__*/null)")
    ap.add_argument("--as-of", help="last day covered by the data, YYYY-MM-DD (header + partial-month flag)")
    ap.add_argument("--prior", type=Path, help="original dashboard HTML of the prior year, for year-on-year comparison")
    ap.add_argument("--year", type=int, help="reporting year, if it cannot be inferred")
    ap.add_argument("--source", help="source line for the header, if the original's header cannot be read")
    ap.add_argument("--rename", action="append", default=[], help="field mapping, dataset.old=new (repeatable)")
    ap.add_argument("--data-json", type=Path, help="read DATA from this JSON file instead of the original's script")
    ap.add_argument("--out", type=Path, help="output file (default: next to the original)")
    ap.add_argument("--check", action="store_true", help="validate only, write nothing")
    ap.add_argument("--allow-git", action="store_true", help="write even if the output folder is inside a Git repository")
    a = ap.parse_args()

    rep = Report()
    orig_html = a.original.read_text(encoding="utf-8")
    tpl = a.template.read_text(encoding="utf-8")
    if MARKER not in tpl:
        raise SystemExit(f"{a.template}: marker {MARKER} not found — pass the empty template-v3.html, not a filled build.")
    if 'id="hSrc"' not in tpl:
        rep.warn("template has no #hSrc element — the source line will not show in the header (older template?)")

    if a.data_json:
        data, how = json.loads(a.data_json.read_text(encoding="utf-8")), "json file"
    else:
        data, how = extract_data(orig_html, a.original.name)
    if not isinstance(data, dict):
        raise SystemExit("DATA is not an object")
    print(f"Read DATA from {a.original.name} ({how}): {len(json.dumps(data)) // 1024:,} KB, keys: {', '.join(data)}")

    apply_renames(data, a.rename, rep)

    year = a.year or data.get("year") or infer_year(data)
    if not year:
        rep.err("reporting year unknown — pass --year")
    else:
        if not (a.year or data.get("year")):
            rep.note(f"year inferred from the data: {year}")
        data["year"] = int(year)
        check_all(data, rep, int(year))

    if a.as_of:
        try:
            d = dt.date.fromisoformat(a.as_of)
        except ValueError:
            raise SystemExit(f"--as-of {a.as_of!r}: use YYYY-MM-DD")
        if year and d.year != int(year):
            rep.warn(f"--as-of {a.as_of} is not in reporting year {year}")
        months = [m for m in (data.get("mailP") or {}).get("m", []) if isinstance(m, int)]
        if months and max(months) > d.month and year and d.year == int(year):
            rep.warn(f"data contains mailings in month {max(months)}, after --as-of {a.as_of}")
        data["asOf"] = a.as_of
    elif "asOf" not in data:
        rep.warn("no --as-of: header shows 'Data to —' and the partial-month flag is off")

    if a.prior:
        pdata, phow = extract_data(a.prior.read_text(encoding="utf-8"), a.prior.name)
        pyear = pdata.get("year") or infer_year(pdata)
        prep = Report()
        check_mail(pdata.get("mailP"), prep, "prior.mailP")
        check_records(pdata, prep, ["arts", "vids"], "prior.")
        rep.errors += prep.errors
        rep.warnings += prep.warnings
        if not pyear:
            rep.err(f"{a.prior.name}: year unknown")
        elif year and int(pyear) != int(year) - 1:
            rep.warn(f"prior file is {pyear}, reporting year is {year}")
        data["prior"] = {"year": int(pyear or 0), "mailP": pdata.get("mailP"), "arts": pdata.get("arts", []),
                         "vids": pdata.get("vids", [])}
        rep.note(f"prior year {pyear} from {a.prior.name} ({phow})")
    elif "prior" not in data:
        rep.note("no --prior: year-on-year comparison stays off")

    source = a.source or data.get("source") or source_from_original(orig_html)
    if source:
        data["source"] = source
    else:
        rep.warn("source not found in the original's header — header shows 'not stated'; pass --source")

    print("\nChecks:")
    if rep.errors or rep.warnings or rep.notes:
        rep.print()
    else:
        print("  all fields present")
    if not rep.errors:
        print("\nReference figures (compare with the original's Overview, all filters on (All)):")
        for k, v in reference_figures(data):
            print(f"  {k:<36} {v}")

    if rep.errors:
        print(f"\n{len(rep.errors)} error(s) — nothing written. Fix with --rename, or ask the owner of the original.")
        return 1
    if a.check:
        print("\n--check: nothing written.")
        return 0

    out = a.out or a.original.with_name(f"comms-intelligence-dashboard-v3-{data.get('asOf') or dt.date.today().isoformat()}.html")
    if out.resolve() in (a.original.resolve(), a.template.resolve()):
        raise SystemExit("refusing to overwrite the original or the template — choose another --out")
    if inside_git_repo(out) and not a.allow_git:
        raise SystemExit(f"{out.parent} is inside a Git repository. The output holds real data and must not be "
                         "committed — write it elsewhere (--out) or pass --allow-git if the folder is git-ignored.")
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    out.write_text(tpl.replace(MARKER, payload, 1), encoding="utf-8")
    print(f"\nWrote {out}  ({out.stat().st_size // 1024:,} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```
