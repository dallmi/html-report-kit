---
name: corporate-pptx-rebrand
description: Re-brands an existing PowerPoint deck (.pptx) — a Copilot/ChatGPT-generated deck, a consultant's slides, an old template, a dark "keynote" deck — so it complies with the corporate design system (white slides, warm greys carry shapes and charts, Corporate Red only as a small accent, Frutiger, no gradients/shadows/3D/rounded shapes/all caps, financial-style tables, donuts instead of pies), without changing text, numbers, chart data or slide layout. Use this whenever someone shares or points to a .pptx and says the colours, branding, look or template are off, "not compliant", "not on brand", "make it look corporate / like our house style", "fix the colours", "restyle the deck", "clean up the slides", or wants a deck made by someone else brought in line with the corporate look — even if they never say "brand". Also use it to audit a deck for brand compliance before it is sent, presented or shared outside, and to strip a company name from a deck that leaves the organisation. Not for building new decks.
---

# Corporate PPTX re-brand

You are taking a finished PowerPoint deck and making it look like it came from the organisation — while every word, number, chart value and slide position stays exactly as it was. Think of it as a repaint, not a rebuild. The deck must stay a normal, editable .pptx: charts stay native charts, tables stay tables.

The most common failure is a *theme swap*: someone changes the six theme colours and the deck still looks off-brand, because most colour in real decks is hard-coded — in shape fills, text runs, chart series, table cells, gradient stops and shadows. The second most common failure is over-correcting: rebuilding slides in python-pptx or pptxgenjs, moving shapes, rewriting text, pasting charts as pictures. That loses editability and breaks the author's work. This skill guards against both. The bundled script does the mechanical part deterministically; your job is the judgement (which colour plays which role) and the visual check.

## The one principle that decides everything

**White dominates → warm greys carry shapes, tables and charts → Corporate Red and Bronze are small accents.**

When a rule below seems to conflict with this, the principle wins. A slide where every card is red looks like an alarm; a slide where red appears once (one key figure, one thin rule) looks corporate.

## Workflow

### 1. Keep the original, inventory, look

- Never overwrite the only copy. Write the result as a new file (`<name>-branded.pptx`) next to the original unless the user asks otherwise.
- Save the script from Appendix C as `pptx_brand.py` (Python 3.8+, standard library only — no python-pptx needed) and run:
  ```bash
  python pptx_brand.py check deck.pptx --suggest-map map.json
  ```
  The report shows every colour **as it really renders** (theme colours and tints resolved), grouped by **role** — `theme`, `background`, `fill` (shapes), `text`, `line`, `chart` (series and data points), `table` (cell fills) — with counts, the largest area a fill covers, example locations (`s3 "Rounded Rectangle 4"` = slide 3, shape name) and the palette name or nearest palette colour. Below that: gradients, transparency, shadows/3D, all caps, underlines, justified text, pie/3D charts, gridlines, rounded shapes, fonts, low-contrast text, large red or coloured areas, dark/image backgrounds, built-in table styles, margins, page numbers, pictures.
  `--suggest-map` writes a **draft** colour map. It is a starting point built from simple heuristics — it does not know what a colour *means*. Review every line (step 2).
  Add `--forbid "<name>"` only when a name must not appear in the file — the deck is going outside the organisation or into a Git repository (see step 6). Don't ask for a company name otherwise.
- Look at the deck before you change it. If LibreOffice is available:
  ```bash
  python pptx_brand.py render deck.pptx before/
  ```
  This writes a PDF and, when a rasteriser is present, one PNG per slide — read them. If LibreOffice is missing, say so and rely on the report plus the user's eyes at the end.

### 2. Map by role, not by hue

Don't replace "blue with the nearest palette colour". Decide what each colour is *for*, then give it the colour for that role. The same hex can play different roles — navy as a full-slide title background becomes white, navy as heading text becomes black — which is why the map is organised by role.

| Role in the deck | Brand colour |
|---|---|
| Slide background, full-slide rectangles, large bands (≥ ~25% of the slide) | White `#FFFFFF` |
| Cards, callout boxes, KPI tiles, highlight blocks | Pastel I `#ECEBE4` (text on it black) — or white with a thin Pastel I / Grey I outline |
| Shape outlines, dividers | Grey I `#CCCABC` or Grey III `#8E8D83`; rule lines black |
| Titles, body text, KPI values, table text | Black `#000000` |
| Subtitles, captions, sources, footers, axis labels | Grey IV `#7A7870` |
| One key figure or one thin accent rule on a slide | Corporate Red `#E60000` — at most one or two small places per slide |
| Links | Lake50 `#0C7EC6` |
| Data-driven status (on track / watch / at risk) — in tables, KPI tiles, status dots | RAG: green `#6F7A1A`, amber `#E4A911`, red `#BD000C` |
| Negative numbers shown in red | Black — the parentheses carry the sign |
| KPI change text ("▲ 7% vs Q2") coloured green/red | Only the arrow carries RAG, the text is black. Put the author's arrow colours in the `arrows` map (green → `6F7A1A`, red → `BD000C`); `apply` splits the run so the arrow keeps its meaning and the text turns black. The author's colour already encodes good/bad (attrition ▲ is red), so keep it |
| Semi-transparent overlays, decorative blobs | Solid palette colour or white; transparency is not allowed |

RAG colours are only for data-driven status. A label that *describes* ("Internal", "New") is neutral Pastel I, not coloured.

**The map file** (JSON; keys are the *old* colours as the report shows them):

```json
{
 "theme": {"dk1":"000000","lt1":"FFFFFF","dk2":"404040","lt2":"ECEBE4","accent1":"404040","accent2":"B98E2C",
           "accent3":"8E8D83","accent4":"CCCABC","accent5":"5A5D5C","accent6":"946F29","hlink":"0C7EC6","folHlink":"07476F"},
 "background": {"*": "FFFFFF"},
 "fill":  {"1F3864": "FFFFFF", "DEEAF6": "ECEBE4", "ED7D31": "E60000"},
 "text":  {"1F3864": "000000", "595959": "7A7870", "FF0000": "000000"},
 "line":  {"4F81BD": "CCCABC"},
 "chart": {"7030A0": "404040", "ED7D31": "B98E2C", "CDB4DB": "8E8D83"},
 "table": {"5B2C6F": "FFFFFF", "F3E5F5": "ECEBE4", "00B050": "6F7A1A", "FFC000": "E4A911", "FF0000": "BD000C"},
 "any":   {},
 "arrows": {"00B050": "6F7A1A", "FF0000": "BD000C"},
 "shapes": [{"slide": 6, "shape": "TextBox 3", "role": "text", "to": "E60000"}],
 "text_replace": {"KEY HIGHLIGHTS": "Key highlights", "TOTAL": "Total"},
 "text_substitute": {}
}
```

- `theme` — keep the corporate theme above. Theme accents are what charts, SmartArt and default shapes use when nothing is hard-coded, so this is where the chart sequence lives.
- A role map may contain `"*"` = every off-palette colour of that role not listed otherwise. `any` applies to all roles after the role-specific map.
- `arrows` — colours of runs that start with ▲ ▼ ↑ ↓ (KPI deltas), mapped to RAG. Only the arrow keeps the colour.
- `shapes` — per-shape exceptions (slide number + shape name from the report), e.g. the one key figure that should be red, or one card that keeps a Bordeaux fill.
- `text_replace` — whole text runs to retype (all caps → sentence case). The draft proposes them; fix proper nouns and acronyms ("Vendor B", "KPI", "EMEA"). This is the only way text changes, so keep it to casing.
- `text_substitute` — substring replacements for names (step 6). Leave it empty for internal decks.
- Colours not in the map stay as they are (and `check` will flag them). Palette colours can stay.

You don't have to fix text contrast by hand: after mapping, `apply` checks every text run against the colour it actually sits on (its own shape, the shape underneath, or the slide background) and switches failing text to black or white — which is why a navy card mapped to Pastel I gets black text automatically.

### 3. Apply

```bash
python pptx_brand.py apply deck.pptx deck-branded.pptx --map map.json --font "Frutiger 45 Light"
```

In one pass it:
- recolours through the map and sets the theme colours; fixes text contrast per shape
- makes backgrounds white (`--keep-backgrounds` to skip — only if the user wants a photo title slide kept)
- flattens gradients to their first stop's colour, removes shadows/glow/reflection/soft edges and 3D, removes transparency from coloured fills (black/white overlays are kept and reported)
- turns rounded rectangles square; removes `cap="all"`, underlines and justified alignment; applies `text_replace`
- typography: text of 24pt and more is set light (not bold) — page titles and big figures are light in the brand; centred text becomes left-aligned; KPI arrows split per the `arrows` map
- sets one font everywhere (theme + explicit runs; symbol fonts like Wingdings stay)
- charts: removes gridlines, turns pies into donuts (hole 64%) with white separators between segments, sets data labels white on segments too dark for black text, gives single-series charts one colour
- tables: financial style (step 5) — `--keep-tables` to skip

It prints what it changed, with counts. Keep that output for the report.

**Font:** Frutiger 45 Light is the brand font. Use its exact name as installed in the organisation; if the deck already uses a Frutiger variant, keep that exact name. If the deck will be opened on machines without Frutiger (sent outside, partner systems), use `--font Arial` — PowerPoint silently substitutes a missing font with something random.

### 4. Charts — the decision table

Most of the brand lives in the charts, so look at each one. The theme accents give the default sequence; the `chart` map handles hard-coded series and point colours.

| # | Situation | Colour |
|---|---|---|
| 1 | Single series (bars, columns, rankings) | one colour for all bars: Grey VI `#404040`. `apply` removes per-category colouring |
| 2 | Two or three series | Grey VI `#404040` → Bronze I `#B98E2C` → Grey III `#8E8D83` |
| 3 | Donut / stacked parts (≤ ~9) | `404040, B98E2C, 8E8D83, CCCABC, 5A5D5C, 946F29, B8B3A2, 7A7870, 6C5312` |
| 4 | Known business entities (divisions, regions) across several charts | the same colour for the same entity everywhere; "Other/Unknown" in Grey I `#CCCABC` |
| 5 | Data-driven status or direction | RAG colours |
| 6 | Genuinely complex, >10 equal-weight series | the 20-colour complex palette (Appendix B) — the exception |

**No chart is filled Corporate Red or Bordeaux** — red bars read as an alert. (The design system's print guide allows Bordeaux for single-series bars; the principle wins here, as it does in the HTML dashboards, so decks and dashboards look the same.) Charts are 2D, no gridlines, no shadows. Chart text (axis labels, legend) is black or Grey IV — `apply` fixes chart text that would be invisible on white.

What `apply` does not do, and what you report instead of hand-editing: 3D chart types (tell the user to switch the chart type in PowerPoint), removing the y-axis when data labels are present, an automatic chart title that just repeats the series name ("Share"), data labels inside dark bars of stacked charts, average lines (1.25pt Grey V dashed), charts pasted as pictures (cannot be recoloured — say which slide).

### 5. Tables

`apply` restyles every table to the financial style: built-in banded style replaced by "No Style, No Grid", 0.75pt black rule above and below the header row and under the last row, "Total" row bold between 1pt black rules, no vertical lines, columns that hold only numbers right-aligned (header included). Cell fills go through the `table` map: map header bands to white (the default financial table is black and white), alternating-row fills to Pastel I `#ECEBE4` (or white), status cells to RAG. A Bordeaux II `#8A000A` group header is allowed. Cell text is set to black or white for contrast, including RAG cells (white on green and red, black on amber — white on amber is unreadable), and is not bold on any coloured fill except Pastel I.

### 6. Names and hygiene

- Internal decks may name the organisation in titles and footers — leave that. Remove a company name **only** when the user says the deck goes outside the organisation or into a Git repository, or asks for it. Then:
  - run `check --forbid "<name>"` to find every occurrence (slides, notes, charts, document properties, embedded chart workbooks)
  - add **whole phrases** to `text_substitute`, longest first is automatic: `{"Northwind Bank": "the organisation", "people-team@northwind.example": "the people team"}`. Substituting the bare word inside a longer phrase produces nonsense ("the organisation Bank"), so read every hit in context and choose the replacement that reads naturally — sometimes deleting the phrase is right.
  - add `--clear-author` to blank author, last-modified-by, company and manager in the document properties
  - names left inside an embedded chart workbook are reported by `check`; tell the user to open "Edit data" in PowerPoint if that matters
- Internal division and region names ("Global Wealth Management", "EMEA") are the vocabulary of the data — keep them.
- The logo is never recreated, recoloured or moved. Pictures are not touched.

### 7. What you must not change

- Words, numbers, chart data, slide order, speaker notes, animations, hyperlinks (except `text_replace` casing and `text_substitute` names).
- Shape positions and sizes. Layout issues — shapes too close to the edge, missing page numbers, logo placement, header rows not one size smaller — are **reported**, not fixed. (Text alignment inside its box is typography, not layout: `apply` left-aligns it.) Fixing layout by moving shapes breaks author intent and alignment between slides.
- Chart types, except pie → donut. Don't replace native charts or tables with pictures, and don't rebuild slides with another library.
- If you notice a genuine content problem (a wrong total, a leftover "[insert chart]"), report it; don't fix it silently.

### 8. Verify — the job isn't done until this passes

1. `python pptx_brand.py check deck-branded.pptx` (with `--forbid` if names were removed). Target: **zero errors**. Every remaining warning needs a reason you can state ("footer 0.2\" from the edge — author's layout, reported").
2. Render the result and **look at every slide** (`render deck-branded.pptx after/`). Check: no invisible or low-contrast text, charts readable (axis labels, legend), tables legible, nothing that was white-on-dark now white-on-white, red used only as a small accent. The script checks contrast for text it can resolve; text that inherits colour from a master placeholder can still slip through — only the render shows it.
3. Confirm the deck is intact: same number of slides, charts, tables and pictures as the original (the first line of `check` shows them), same text apart from your `text_replace`/`text_substitute`. LibreOffice converting it without error is a good sign the file opens in PowerPoint.
4. If you could not render, say so plainly and give the user a short checklist to click through in PowerPoint.

### 9. Report back

Give the user, briefly:
- where the new file is
- the check result before → after (errors / warnings)
- what changed, grouped: colours by role, charts, tables, typography, backgrounds/effects (from the `apply` output)
- judgement calls (e.g. "bars grey instead of Bordeaux — principle over the print rule"; "one red highlight kept on the attrition figure")
- what you found but deliberately did not change: layout findings (margins, page numbers, logo), pictures that can't be recoloured, 3D charts, anything in embedded workbooks

---

## Appendix A — Roles at a glance

`#FFFFFF` backgrounds, large areas · `#ECEBE4` Pastel I cards, alternate rows · `#F5F0E1` Pastel II column highlights · `#000000` text, rules · `#7A7870` Grey IV secondary text · `#CCCABC` Grey I outlines · `#404040 #B98E2C #8E8D83 #CCCABC #5A5D5C #946F29` chart sequence · `#E60000` one small accent · `#8A000A` Bordeaux II table group header · `#6F7A1A #E4A911 #BD000C` RAG (status only) · `#0C7EC6` links.

Text on colour: black on White, Grey I–III, Bronze I, Pastel I/II, RAG amber; white on Corporate Red, Black, Grey IV–VI, Bordeaux I–III, Bronze II/III, RAG green/red.

## Appendix B — Complex-chart palette

Only for >10 equal-weight series, in this order:
`#AF8626 #00759E #879420 #4B2D58 #9F8865 #2E476B #469A6C #AD3E4A #8489BD #0C7EC6 #654D16 #804C95 #45999C #4972AC #CC707A #295B40 #545A9C #785E4A #07476F #620004`

## Appendix C — `pptx_brand.py`

Save exactly as `pptx_brand.py`; Python 3.8+, standard library only. `render` additionally needs LibreOffice (`soffice`); PNGs come from `pdftoppm` or PyMuPDF when present, otherwise read the PDF.
Exit code of `check` is 1 while errors remain.

```python
#!/usr/bin/env python3
"""Brand compliance toolkit for PowerPoint decks (.pptx). Python 3.8+, standard library only.

  check  deck.pptx [--forbid NAME ...] [--suggest-map map.json]
  apply  deck.pptx out.pptx --map map.json [--font NAME] [--keep-tables] [--keep-backgrounds]
         [--clear-author]
  render deck.pptx outdir [--dpi 60]   (LibreOffice -> PDF; PNGs via pdftoppm or PyMuPDF if present)

check  lists every colour by role (theme, background, fill, text, line, chart, table) as it
       really renders (theme + tints resolved), with palette name or nearest palette colour,
       plus gradients, transparency, shadows/3D, all caps, underlines, justified text, pie and
       3D charts, gridlines, rounded shapes, fonts, low-contrast text, large red or coloured
       areas, dark/image backgrounds, table styles, edge margins, absolute paths, forbidden names.
apply  recolours through a role map, fixes text contrast per shape, then flattens gradients,
       effects and 3D, squares rounded shapes, drops caps/underline/justify, removes chart
       gridlines, turns pies into donuts, sets one font, restyles tables to the financial style
       and whitens backgrounds. Text, numbers, positions and chart data stay untouched (except
       the map's text_replace / text_substitute entries).
Works on the XML text directly and keeps every byte it does not change.
"""
import argparse, colorsys, html, io, json, os, posixpath, re, shutil, subprocess, sys, tempfile, zipfile
from collections import defaultdict

# ---------------------------------------------------------------- palette
PALETTE = {
    "E60000": "Corporate Red", "8A000A": "Bordeaux II", "BD000C": "Bordeaux I / RAG red", "620004": "Bordeaux III",
    "000000": "Black", "FFFFFF": "White",
    "CCCABC": "Grey I", "B8B3A2": "Grey II", "8E8D83": "Grey III", "7A7870": "Grey IV", "5A5D5C": "Grey V", "404040": "Grey VI",
    "B98E2C": "Bronze I", "946F29": "Bronze II", "6C5312": "Bronze III",
    "ECEBE4": "Pastel I", "F5F0E1": "Pastel II", "F7F7F5": "Page background", "F8F7F2": "Row alt",
    "6F7A1A": "RAG green", "E4A911": "RAG amber",
    "0C7EC6": "Lake50 (links)", "07476F": "Lake90 (link hover)", "00759E": "Lagoon60 (links)", "BEBEBE": "Silver",
}
COMPLEX = {"AF8626", "879420", "4B2D58", "9F8865", "2E476B", "469A6C", "AD3E4A", "8489BD", "654D16", "804C95",
           "45999C", "4972AC", "CC707A", "295B40", "545A9C", "785E4A"}
TRADING = {"498100", "C81219"}
REDS = {"E60000", "BD000C", "8A000A", "620004"}
LIGHT_GROUNDS = {"FFFFFF", "F7F7F5", "F8F7F2", "ECEBE4", "F5F0E1"}
BLACK_TEXT_ON = {"FFFFFF", "F7F7F5", "F8F7F2", "ECEBE4", "F5F0E1", "CCCABC", "B8B3A2", "8E8D83", "B98E2C", "E4A911", "BEBEBE"}
CHART_SEQ = ["404040", "B98E2C", "8E8D83", "CCCABC", "5A5D5C", "946F29", "B8B3A2", "7A7870", "6C5312"]
SLOTS = ("dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink")
THEME = dict(zip(SLOTS, ("000000", "FFFFFF", "404040", "ECEBE4", "404040", "B98E2C", "8E8D83", "CCCABC", "5A5D5C",
                         "946F29", "0C7EC6", "07476F")))
NO_STYLE_TABLE = "{2D5ABB26-0587-4C30-8999-92F81FD0307C}"          # "No Style, No Grid"
PLAIN_TABLES = {NO_STYLE_TABLE, "{5940675A-B579-460E-94D1-54222C63F5DA}"}  # + "No Style, Table Grid"
SYMBOL_FONT = re.compile(r"wingdings|webdings|symbol|emoji|marlett|zapf", re.I)
PRST = {"black": "000000", "white": "FFFFFF", "red": "FF0000", "green": "008000", "blue": "0000FF", "yellow": "FFFF00",
        "gray": "808080", "grey": "808080", "orange": "FFA500", "navy": "000080", "silver": "C0C0C0"}
EMU_IN = 914400
ARROW_RUN = re.compile(r"<a:r>(<a:rPr\b[^>]*?(?:/>|>(?:(?!</a:rPr>|<a:r>).)*</a:rPr>))<a:t>([▲▼△▽↑↓⬆⬇➚➘])([^<]*)</a:t></a:r>", re.S)
RUN_CLR = re.compile(r'<a:solidFill>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"')
NUMERIC = re.compile(r"^[(\-–−+]?\s*[A-Z]{0,3}\s*[\d][\d.,'’ ]*\s*(%|pts?|x|m|bn|k)?\)?$", re.I)
VARY_ON = re.compile(r'<c:varyColors(?:\s+val="(?:1|true)")?\s*/>')

def on_palette(h): return h in PALETTE
def rgb(h): return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def hexs(r, g, b): return "%02X%02X%02X" % tuple(max(0, min(255, round(c * 255))) for c in (r, g, b))
def lum(h):
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def contrast(a, b):
    x, y = sorted((lum(a), lum(b)), reverse=True); return (x + 0.05) / (y + 0.05)
def sat(h): c = rgb(h); return max(c) - min(c)
def hue(h): return colorsys.rgb_to_hls(*rgb(h))[0] * 360
def nearest(h, pool=None):
    pool = pool or PALETTE; r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return min(pool, key=lambda p: (int(p[0:2], 16) - r) ** 2 + (int(p[2:4], 16) - g) ** 2 + (int(p[4:6], 16) - b) ** 2)
def text_on(fill):
    if fill in PALETTE: return "000000" if fill in BLACK_TEXT_ON else "FFFFFF"
    return "000000" if lum(fill) > 0.3 else "FFFFFF"
def attr(s, name):
    m = re.search(r'(?:^|\s)' + name + r'="([^"]*)"', s or ""); return m.group(1) if m else None

# ---------------------------------------------------------------- colour resolution
COLOUR_KINDS = ("srgbClr", "schemeClr", "sysClr", "prstClr", "scrgbClr", "hslClr")
MOD_RE = re.compile(r'<a:(\w+)\s+val="(-?\d+)"\s*/>')

def apply_mods(h, mods):
    r, g, b = rgb(h)
    for name, v in mods:
        v /= 100000
        if name in ("lumMod", "lumOff", "satMod", "satOff"):
            hh, l, s = colorsys.rgb_to_hls(r, g, b)
            if name == "lumMod": l *= v
            elif name == "lumOff": l += v
            elif name == "satMod": s *= v
            else: s += v
            r, g, b = colorsys.hls_to_rgb(hh, max(0, min(1, l)), max(0, min(1, s)))
        elif name == "tint": r, g, b = (c + (1 - c) * (1 - v) for c in (r, g, b))
        elif name == "shade": r, g, b = (c * v for c in (r, g, b))
    return hexs(r, g, b)

def resolve(kind, attrs, inner, theme, clrmap):
    """-> (effective hex or None, base label, mods, alpha)"""
    base, label = None, None
    if kind == "srgbClr": base = (attr(attrs, "val") or "").upper() or None
    elif kind == "schemeClr":
        v = attr(attrs, "val"); label = v
        if v and v != "phClr": base = theme.get(clrmap.get(v, v))
    elif kind == "sysClr": base = (attr(attrs, "lastClr") or ("000000" if attr(attrs, "val") == "windowText" else "FFFFFF")).upper()
    elif kind == "prstClr": base = PRST.get(attr(attrs, "val") or "")
    elif kind == "scrgbClr":
        enc = lambda c: 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        try: base = hexs(*(enc(int(attr(attrs, k)) / 100000) for k in ("r", "g", "b")))
        except (TypeError, ValueError): base = None
    elif kind == "hslClr":
        try: base = hexs(*colorsys.hls_to_rgb(int(attr(attrs, "hue")) / 21600000, int(attr(attrs, "lum")) / 100000, int(attr(attrs, "sat")) / 100000))
        except (TypeError, ValueError): base = None
    if base is None or not re.fullmatch(r"[0-9A-F]{6}", base): return None, label, [], 1.0
    mods, alpha = [], 1.0
    for n, v in MOD_RE.findall(inner or ""):
        if n == "alpha": alpha = int(v) / 100000
        elif n in ("lumMod", "lumOff", "satMod", "satOff", "tint", "shade"): mods.append((n, int(v)))
    return (apply_mods(base, mods) if mods else base), label, mods, alpha

# ---------------------------------------------------------------- package
class Package:
    def __init__(self, path):
        self.path = path
        with zipfile.ZipFile(path) as z:
            self.infos = z.infolist(); self.data = {i.filename: z.read(i.filename) for i in self.infos}
        self.texts = {}
    def names(self): return [i.filename for i in self.infos]
    def text(self, name):
        if name not in self.texts: self.texts[name] = self.data[name].decode("utf-8", errors="replace")
        return self.texts[name]
    def rels(self, part):
        d, f = posixpath.split(part); rp = posixpath.join(d, "_rels", f + ".rels")
        if rp not in self.data: return []
        out = []
        for m in re.finditer(r"<Relationship\b([^>]*)>", self.text(rp)):
            a = m.group(1); t = attr(a, "Target") or ""; ext = attr(a, "TargetMode") == "External"
            tgt = t if ext else (t.lstrip("/") if t.startswith("/") else posixpath.normpath(posixpath.join(d, t)))
            out.append((attr(a, "Id"), (attr(a, "Type") or "").rsplit("/", 1)[-1], tgt, ext))
        return out
    def write(self, out, changed):
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            for i in self.infos:
                data = changed[i.filename].encode("utf-8") if i.filename in changed else self.data[i.filename]
                zi = zipfile.ZipInfo(i.filename, i.date_time); zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = i.external_attr; z.writestr(zi, data)

def part_kind(n):
    if not n.endswith(".xml"): return None
    if n.startswith("ppt/slides/slide"): return "slide"
    if n.startswith("ppt/slideLayouts/slideLayout"): return "layout"
    if n.startswith("ppt/slideMasters/slideMaster"): return "master"
    if n.startswith("ppt/theme/theme"): return "theme"
    if re.match(r"ppt/charts/chart\d*\.xml$", n): return "chart"
    if re.match(r"ppt/diagrams/(data|drawing)\d*\.xml$", n): return "diagram"
    if n.startswith(("ppt/notesSlides/", "ppt/comments/", "docProps/")) or n.startswith("ppt/commentAuthors"): return "meta"
    return None

class Context:
    """Relationships: slide order, owner slide of charts/diagrams, theme + clrMap per part."""
    def __init__(self, pkg):
        self.pkg = pkg; names = pkg.names()
        self.slide_no, self.owner, self.layout_of, self.master_of, self.theme_part = {}, {}, {}, {}, {}
        pres = pkg.text("ppt/presentation.xml") if "ppt/presentation.xml" in pkg.data else ""
        prels = {r[0]: r[2] for r in pkg.rels("ppt/presentation.xml")}
        for i, rid in enumerate(re.findall(r'<p:sldId\b[^>]*r:id="([^"]+)"', pres), 1):
            if rid in prels: self.slide_no[prels[rid]] = i
        m = re.search(r'<p:sldSz\b([^>]*)>', pres)
        self.sld = (int(attr(m.group(1), "cx")), int(attr(m.group(1), "cy"))) if m else (12192000, 6858000)
        for n in names:
            k = part_kind(n)
            if k not in ("slide", "layout", "master"): continue
            for _, typ, tgt, ext in pkg.rels(n):
                if ext: continue
                if typ == "slideLayout" and k == "slide": self.layout_of[n] = tgt
                elif typ == "slideMaster" and k == "layout": self.master_of[n] = tgt
                elif typ == "theme": self.theme_part[n] = tgt
                elif k == "slide" and part_kind(tgt) in ("chart", "diagram"): self.owner[tgt] = n
        self.themes = {n: self.read_theme(pkg.text(n)) for n in names if part_kind(n) == "theme"}
        self.clrmaps = {}
        for n in names:
            if part_kind(n) == "master":
                m = re.search(r"<p:clrMap\b([^>]*)/?>", pkg.text(n))
                self.clrmaps[n] = dict(re.findall(r'(\w+)="(\w+)"', m.group(1))) if m else {}
        self.first_theme = sorted(self.themes)[0] if self.themes else None

    @staticmethod
    def read_theme(t):
        out = {}
        cs = re.search(r"<a:clrScheme\b.*?</a:clrScheme>", t, re.S)
        for s in SLOTS:
            m = re.search(r"<a:%s>\s*<a:(\w+)\b([^>]*?)(/>|>(.*?)</a:\1>)" % s, cs.group(0) if cs else "", re.S)
            if m: out[s] = resolve(m.group(1), m.group(2), m.group(4), {}, {})[0]
        return out

    def master(self, part):
        k = part_kind(part)
        if k in ("chart", "diagram"): part = self.owner.get(part, part); k = part_kind(part)
        if k == "slide": part = self.layout_of.get(part, part); k = part_kind(part)
        if k == "layout": part = self.master_of.get(part, part)
        return part if part_kind(part) == "master" else None

    def theme_for(self, part, themes=None):
        themes = themes or self.themes; m = self.master(part)
        return themes.get(self.theme_part.get(m, self.first_theme), {}) if themes else {}

    def clrmap_for(self, part):
        return self.clrmaps.get(self.master(part), {})

    def label(self, part, shape=None):
        k = part_kind(part); base = posixpath.basename(part)[:-4]
        if k == "slide": s = "s%d" % self.slide_no.get(part, 0)
        elif k in ("chart", "diagram"):
            o = self.owner.get(part); s = ("s%d " % self.slide_no.get(o, 0) if o else "") + ("chart" if k == "chart" else "SmartArt")
        else: s = base
        return s + (' "%s"' % shape if shape else "")

# ---------------------------------------------------------------- XML walk
TAG_RE = re.compile(r"<(/?)(?:([\w.-]+):)?([\w.-]+)((?:\s[^>]*?)?)(/?)>")
SHAPE_TAGS = {"sp", "pic", "cxnSp", "graphicFrame", "tc"}
LINE_TAGS = {"ln", "lnRef", "lnL", "lnR", "lnT", "lnB", "lnTlToBr", "lnBlToTr", "uLn", "uFill", "linClrLst"}
TEXT_TAGS = {"rPr", "defRPr", "endParaRPr", "fontRef", "buClr", "txFillClrLst", "highlight"}

def role_of(anc, kind):
    A = set(anc)
    if kind == "theme": return "theme" if "clrScheme" in A else "themefmt"
    if A & {"effectLst", "effectRef", "effectDag", "effectStyle"}: return "effect"
    if "bg" in A: return "background"
    if A & TEXT_TAGS: return "text"
    if kind == "chart" and A & {"ser", "dPt"}: return "chart"
    if A & LINE_TAGS: return "line"
    if "tcPr" in A: return "table"
    return "fill"

def walk(xml, kind):
    occs, shapes, stack, sstack, pos = [], [], [], [], 0
    bg_image = False
    while True:
        m = TAG_RE.search(xml, pos)
        if not m: break
        closing, pre, local, attrs, selfc = m.group(1), m.group(2) or "", m.group(3), m.group(4) or "", m.group(5)
        pos = m.end()
        if closing:
            for k in range(len(stack) - 1, -1, -1):
                if stack[k] == local: del stack[k:]; break
            if local in SHAPE_TAGS and sstack and shapes[sstack[-1]]["tag"] == local:
                shapes[sstack.pop()]["end"] = m.end()
            continue
        if pre == "a" and local in COLOUR_KINDS:
            if selfc: end, inner = m.end(), ""
            else:
                c = xml.find("</a:%s>" % local, m.end()); end = c + len(local) + 5; inner = xml[m.end():c]
            occs.append(dict(start=m.start(), end=end, kind=local, attrs=attrs, inner=inner, anc=tuple(stack),
                             role=role_of(stack, kind), shape=sstack[-1] if sstack else None))
            pos = end; continue
        if local in SHAPE_TAGS and not selfc:
            shapes.append(dict(tag=local, start=m.start(), end=None, name=None, off=None, ext=None, ph=None,
                               nofill=False, style=False, text=False, parent=sstack[-1] if sstack else None))
            sstack.append(len(shapes) - 1)
        elif sstack:
            sh = shapes[sstack[-1]]
            if local == "cNvPr" and sh["name"] is None: sh["name"] = html.unescape(attr(attrs, "name") or "")
            elif local == "ph": sh["ph"] = attr(attrs, "type") or "body"
            elif local in ("off", "ext") and stack and stack[-1] == "xfrm" and sh[local] is None:
                try: sh[local] = tuple(int(attr(attrs, k)) for k in (("x", "y") if local == "off" else ("cx", "cy")))
                except (TypeError, ValueError): pass
            elif local == "noFill" and stack and stack[-1] in ("spPr", "tcPr"): sh["nofill"] = True
            elif local == "style" and stack and stack[-1] in ("sp", "cxnSp"): sh["style"] = True
            elif local == "t" and pre == "a": sh["text"] = True
        if local == "blipFill" and "bgPr" in stack: bg_image = True
        if not selfc: stack.append(local)
    return occs, shapes, bg_image

def shape_fill_occ(occs, idx):
    """The occurrence that decides a shape's fill: explicit spPr/tcPr fill first, else style fillRef."""
    explicit = [o for o in occs if o["shape"] == idx and o["role"] in ("fill", "table") and
                ({"spPr", "tcPr"} & set(o["anc"])) and not (LINE_TAGS & set(o["anc"]))]
    if explicit: return explicit[0]
    ref = [o for o in occs if o["shape"] == idx and "fillRef" in o["anc"]]
    return ref[0] if ref else None

def area(sh, sld):
    return (sh["ext"][0] * sh["ext"][1]) / float(sld[0] * sld[1]) if sh.get("ext") else 0.0

def ground_of(shapes, idx, fill_hex, bg, occs, final):
    """Colour a shape's text sits on: its own fill, else the topmost filled shape underneath, else the background."""
    sh = shapes[idx]
    if fill_hex: return fill_hex
    if sh["tag"] == "tc": return None
    if not (sh["off"] and sh["ext"]): return bg
    cx, cy = sh["off"][0] + sh["ext"][0] / 2, sh["off"][1] + sh["ext"][1] / 2
    for j in range(idx - 1, -1, -1):
        o = shapes[j]
        if o["tag"] not in ("sp", "pic") or o["parent"] is not None and o["parent"] == idx: continue
        if not (o["off"] and o["ext"]): continue
        if o["off"][0] <= cx <= o["off"][0] + o["ext"][0] and o["off"][1] <= cy <= o["off"][1] + o["ext"][1]:
            if o["tag"] == "pic": return None
            if o["nofill"]: continue
            fo = shape_fill_occ(occs, j)
            if fo is not None and final(fo): return final(fo)
    return bg

def part_bg(ctx, part, texts, themes, bg_white):
    if bg_white: return "FFFFFF"
    chain, p = [part], part
    while p in ctx.layout_of or p in ctx.master_of:
        p = ctx.layout_of.get(p) or ctx.master_of.get(p); chain.append(p)
    for p in chain:
        t = texts.get(p) if p in texts else (ctx.pkg.text(p) if p in ctx.pkg.data else "")
        m = re.search(r"<p:bg>(.*?)</p:bg>", t, re.S)
        if not m: continue
        if "<a:blipFill" in m.group(1): return None
        c = re.search(r"<a:(%s)\b([^>]*?)(/>|>(.*?)</a:\1>)" % "|".join(COLOUR_KINDS), m.group(1), re.S)
        if c: return resolve(c.group(1), c.group(2), c.group(4), ctx.theme_for(part, themes), ctx.clrmap_for(part))[0]
    return "FFFFFF"

# ---------------------------------------------------------------- findings
class Findings:
    def __init__(self): self.items = {}
    def add(self, sev, key, msg, loc):
        self.items.setdefault((sev, key, msg), []).append(loc)
    def counts(self):
        c = {"ERROR": 0, "WARN": 0, "INFO": 0}
        for (sev, _, _), locs in self.items.items(): c[sev] += len(locs)
        return c

def caps_text(s):
    words = re.findall(r"[^\W\d_]+", s)
    if not words or any(w != w.upper() for w in words): return False
    return any(len(w) >= 5 for w in words) or sum(len(w) >= 3 for w in words) >= 2

SMALL = {"A", "AN", "AND", "ARE", "AS", "AT", "BY", "FOR", "FROM", "IN", "IS", "OF", "ON", "OR", "OUR", "PER", "THE",
         "TO", "VS", "WE", "WITH", "ALL", "NEW", "KEY", "TOP", "NEXT", "YEAR", "PLAN", "RISK", "TEAM", "HOW", "WHY",
         "WHAT", "NOT", "NOW", "OUT", "UP", "OUR", "YOUR", "DER", "DIE", "DAS", "UND", "MIT", "FÜR", "VON", "ZUR"}
def sentence_case(s):
    out, first = [], True
    for tok in re.split(r"(\W+)", s):
        if not re.search(r"[^\W\d_]", tok): out.append(tok); continue
        keep = re.fullmatch(r"[^\W\d_]{1,4}", tok) and tok not in SMALL or re.search(r"\d", tok)
        w = tok if keep else tok.lower()
        if first and not keep: w = w[:1].upper() + w[1:]
        first = False; out.append(w)
    return "".join(out)

def suggest(role, h, maxarea, hint=None):
    L, s, hu = lum(h), sat(h), hue(h)
    red = s > 0.35 and (hu < 15 or hu > 340)
    def rag():
        if s < 0.3: return None
        if 70 <= hu <= 170: return "6F7A1A"
        if 30 <= hu < 70: return "E4A911"
        if hu < 15 or hu > 340: return "BD000C"
    if role == "background": return "FFFFFF"
    if role == "text":
        if s < 0.12 and L > 0.08 or L > 0.55: return "7A7870"
        return "000000"
    if role == "line":
        if red: return "E60000"
        return "CCCABC" if L > 0.5 else "8E8D83" if L > 0.15 else "000000"
    if role == "table":
        return rag() or ("ECEBE4" if L > 0.6 else "FFFFFF")
    if role == "chart": return hint
    if maxarea >= 0.25: return "FFFFFF"
    if L > 0.85: return "FFFFFF"
    if L > 0.5: return "ECEBE4"
    if red: return "E60000" if maxarea < 0.02 else "ECEBE4"
    return "404040" if maxarea < 0.01 else "ECEBE4"

def scan_part(ctx, part, t, kind, theme, clrmap, bg, F, usage, texts_seen):
    occs, shapes, bg_img = walk(t, kind)
    sld = ctx.sld
    def final(o):
        return resolve(o["kind"], o["attrs"], o["inner"], theme, clrmap)[0]
    for o in occs:
        if o["role"] in ("effect", "themefmt"): continue
        h, label, mods, alpha = resolve(o["kind"], o["attrs"], o["inner"], theme, clrmap)
        if h is None: continue
        sh = shapes[o["shape"]] if o["shape"] is not None else None
        loc = ctx.label(part, sh["name"] if sh and sh["tag"] != "tc" else ("table cell" if sh else None))
        u = usage[(o["role"], h)]; u["n"] += 1
        if len(u["locs"]) < 6 and loc not in u["locs"]: u["locs"].append(loc)
        if sh and o["role"] == "fill": u["maxarea"] = max(u["maxarea"], area(sh, sld))
        if mods: u["tint"] = label or "colour"
        if alpha < 1:
            if h in ("000000", "FFFFFF"): F.add("WARN", "alpha", "transparent black/white — usually an overlay; check it is needed", loc)
            else: F.add("ERROR", "alpha", "transparency — solid palette colours only", loc)
    # contrast + large areas
    for i, sh in enumerate(shapes):
        fo = shape_fill_occ(occs, i)
        fill = final(fo) if (fo is not None and not sh["nofill"]) else None
        loc = ctx.label(part, sh["name"])
        if kind == "slide" and fill and sh["tag"] == "sp":
            a = area(sh, sld)
            if fill in REDS and a > 0.04: F.add("WARN", "red-area", "large red fill (%d%% of slide) — red is a small accent only" % round(a * 100), loc)
            elif fill not in LIGHT_GROUNDS and a > 0.25: F.add("WARN", "big-fill", "large coloured area — white should dominate", loc)
        ground = ground_of(shapes, i, fill, bg, occs, final)
        if not ground or not sh["text"]: continue
        for o in occs:
            if o["shape"] == i and o["role"] == "text":
                h = final(o)
                if h and contrast(h, ground) < 3:
                    F.add("ERROR", "contrast", "low-contrast text #%s on #%s" % (h, ground), loc if sh["tag"] != "tc" else ctx.label(part, "table cell"))
    if kind == "chart":
        for o in occs:
            if o["role"] == "text" and not {"dLbls", "dLbl"} & set(o["anc"]):
                h = final(o)
                if h and contrast(h, "FFFFFF") < 3: F.add("ERROR", "contrast", "low-contrast chart text #%s on white" % h, ctx.label(part))
    if kind == "master" and bg:
        for o in occs:
            if o["shape"] is None and o["role"] == "text" and "txStyles" in o["anc"]:
                h = final(o)
                if h and contrast(h, bg) < 3: F.add("ERROR", "contrast", "master text style #%s on background #%s" % (h, bg), ctx.label(part))
    if kind == "slide":
        if bg_img or bg is None: F.add("ERROR", "bg", "image background — backgrounds are white", ctx.label(part))
        elif bg not in ("FFFFFF", "F7F7F5"): F.add("ERROR", "bg", "coloured background #%s — backgrounds are white" % bg, ctx.label(part))
        edge = int(0.25 * EMU_IN); close = []
        for sh in shapes:
            if sh["parent"] is not None or not (sh["off"] and sh["ext"]) or sh["tag"] == "tc" or area(sh, sld) > 0.8: continue
            x, y = sh["off"]; w, h = sh["ext"]
            if x < edge or y < edge or x + w > sld[0] - edge or y + h > sld[1] - edge: close.append(sh["name"])
        for n in close: F.add("WARN", "margin", "shape within 0.25\" of the slide edge — keep generous margins", ctx.label(part, n))
        if not any(sh["ph"] == "sldNum" for sh in shapes) and ctx.slide_no.get(part, 1) > 1:
            F.add("INFO", "pagenum", "no page-number placeholder (bottom-right)", ctx.label(part))
        pics = [sh["name"] for sh in shapes if sh["tag"] == "pic"]
        for n in pics: F.add("INFO", "picture", "picture — cannot be recoloured; check logos and pasted charts by eye", ctx.label(part, n))
    if kind == "chart":
        fills = [final(o) for o in occs if o["role"] == "chart" and "spPr" in o["anc"] and not (LINE_TAGS & set(o["anc"]))]
        if fills and all(f in REDS for f in fills if f): F.add("WARN", "chart-red", "chart series filled red — use greys (red reads as alert)", ctx.label(part))
    # structural patterns
    lab = ctx.label(part)
    pats = [
        ("ERROR", "gradient", r"<a:gradFill\b", "gradient — solid colours only"),
        ("WARN", "effect", r"<a:(outerShdw|innerShdw|prstShdw|glow|reflection|softEdge)\b", "shadow/glow/reflection — flat design"),
        ("WARN", "3d", r"<a:sp3d\b|<a:scene3d\b", "3D shape effect — flat design"),
        ("WARN", "rounded", r'<a:prstGeom prst="(roundRect|round1Rect|round2SameRect|round2DiagRect|snipRoundRect|flowChartAlternateProcess|plaque)"', "rounded shape — square corners"),
        ("ERROR", "caps", r'<a:(rPr|defRPr|endParaRPr)\b[^>]*\scap="(all|small)"', "all caps formatting — sentence case"),
        ("ERROR", "underline", r'<a:(rPr|defRPr|endParaRPr)\b[^>]*\su="(?!none)[^"]+"', "underline — no underlines"),
        ("ERROR", "justify", r'<a:(pPr|lvl\dpPr|defPPr)\b[^>]*\salgn="(just|dist|justLow|thaiDist)"', "justified text — left-align"),
        ("WARN", "bold-italic", r'<a:(rPr|defRPr)\b(?=[^>]*\sb="1")(?=[^>]*\si="1")', "bold and italic together — use one"),
    ]
    if kind == "slide": pats.append(("WARN", "center", r'<a:pPr\b[^>]*\salgn="ctr"', "centred text — left-align unless centring is essential"))
    if kind == "chart":
        pats += [("ERROR", "pie", r"<c:(pieChart|ofPieChart)>", "pie chart — use a donut (hole ~64%)"),
                 ("ERROR", "3dchart", r"<c:\w+3DChart>", "3D chart — charts are 2D"),
                 ("WARN", "gridlines", r"<c:(major|minor)Gridlines\b", "chart gridlines — remove")]
        for m in re.finditer(r"<c:(barChart|lineChart|areaChart)>.*?</c:\1>", t, re.S):
            if m.group(0).count("<c:ser>") == 1 and VARY_ON.search(m.group(0)):
                F.add("WARN", "vary", "single-series chart coloured per category — one colour for all bars", lab)
    if kind == "slide":
        for sid in re.findall(r"<a:tableStyleId>([^<]+)</a:tableStyleId>", t):
            if sid not in PLAIN_TABLES: F.add("WARN", "tablestyle", "built-in table style %s (banded/coloured) — financial style" % sid, lab)
    for sev, key, rx, msg in pats:
        for _ in re.finditer(rx, t): F.add(sev, key, msg, lab)
    if kind == "slide":
        for m in ARROW_RUN.finditer(t):
            c = RUN_CLR.search(m.group(1))
            if c and c.group(1).upper() not in ("000000", "404040", "5A5D5C", "7A7870"):
                texts_seen.setdefault("\0arrows", {})[c.group(1).upper()] = None
                if m.group(3).strip(): F.add("WARN", "arrow", "change text coloured together with its arrow — colour only the arrow (map 'arrows')", "%s: %s%s" % (lab, m.group(2), m.group(3)[:30]))
    if kind in ("slide", "chart", "diagram"):
        for raw in re.findall(r"<a:t(?:\s[^>]*)?>([^<]*)</a:t>", t):
            s = html.unescape(raw).strip()
            if s and caps_text(s):
                F.add("WARN", "caps-text", "text typed in capitals — sentence case (keep acronyms)", "%s: %s" % (lab, s[:60]))
                texts_seen.setdefault(s, sentence_case(s))
    for tf in re.findall(r'<a:latin\b[^>]*\stypeface="([^"+][^"]*)"', t):
        if not SYMBOL_FONT.search(tf): usage[("font", tf)]["n"] += 1

def cmd_check(a):
    pkg = Package(a.deck); ctx = Context(pkg); F = Findings(); usage = defaultdict(lambda: dict(n=0, locs=[], maxarea=0.0, tint=None))
    caps = {}
    for n in pkg.names():
        k = part_kind(n)
        if k in ("slide", "layout", "master", "chart", "diagram"):
            bg = part_bg(ctx, n, {}, None, False) if k in ("slide", "layout", "master") else "FFFFFF"
            scan_part(ctx, n, pkg.text(n), k, ctx.theme_for(n), ctx.clrmap_for(n), bg, F, usage, caps)
        elif k == "theme":
            used = any(ctx.theme_part.get(m) == n for m in ctx.clrmaps)
            if not used: continue
            for s, h in ctx.themes[n].items():
                if h and not on_palette(h): F.add("ERROR", "theme", "theme %s #%s off-palette — default shapes, charts and SmartArt use it" % (s, h), posixpath.basename(n))
            t = pkg.text(n)
            if re.search(r"<a:(outerShdw|reflection|glow)\b", t): F.add("INFO", "theme-fx", "theme effect styles carry shadows (apply flattens them)", posixpath.basename(n))
            for tf in re.findall(r'<a:(?:major|minor)Font>\s*<a:latin typeface="([^"]*)"', t): usage[("font", tf)]["n"] += 1
    # names, paths, properties — every XML part, plus embedded chart workbooks
    blobs = [(n, pkg.text(n)) for n in pkg.names() if n.endswith((".xml", ".rels"))]
    for n in pkg.names():
        if n.startswith("ppt/embeddings/") and n.endswith(".xlsx"):
            try:
                with zipfile.ZipFile(io.BytesIO(pkg.data[n])) as z:
                    blobs += [(n + ":" + e, z.read(e).decode("utf-8", "replace")) for e in z.namelist() if e.endswith(".xml")]
            except zipfile.BadZipFile: pass
    for n, t in blobs:
        for m in re.finditer(r"file:///|[A-Za-z]:\\\\?Users\\|/Users/[A-Za-z]|/home/[a-z]", t):
            F.add("ERROR", "abs-path", "absolute local path", "%s: …%s…" % (n, t[max(0, m.start() - 30):m.end() + 30].replace("\n", " ")))
        for term in a.forbid:
            for m in re.finditer(r"(?i)(?<![^\W\d_])" + re.escape(term) + r"(?![^\W\d_])", t):
                F.add("ERROR", "forbidden", "forbidden name '%s'" % term, "%s: …%s…" % (n, re.sub(r"<[^>]*>", " ", t[max(0, m.start() - 40):m.end() + 40])))
    props = []
    for n, tags in (("docProps/core.xml", ("dc:creator", "cp:lastModifiedBy", "dc:title")), ("docProps/app.xml", ("Company", "Manager"))):
        if n in pkg.data:
            for tg in tags:
                m = re.search(r"<%s>([^<]+)</%s>" % (tg, tg), pkg.text(n))
                if m: props.append("%s=%s" % (tg.split(":")[-1], m.group(1)))
    # ---- report
    sev_order = {"ERROR": 0, "WARN": 1, "INFO": 2}
    print("pptx_brand check: %s" % a.deck)
    print("slides %d · charts %d · tables %d · pictures %d · masters %d · layouts %d" % (
        len(ctx.slide_no), sum(part_kind(n) == "chart" for n in pkg.names()),
        sum(pkg.text(n).count("<a:tbl>") for n in pkg.names() if part_kind(n) == "slide"),
        sum(len(re.findall(r"<p:pic>", pkg.text(n))) for n in pkg.names() if part_kind(n) == "slide"),
        len(ctx.clrmaps), sum(part_kind(n) == "layout" for n in pkg.names())))
    if props: print("document properties: " + " · ".join(props))
    fonts = sorted(((k[1], v["n"]) for k, v in usage.items() if k[0] == "font"), key=lambda x: -x[1])
    print("fonts: " + (", ".join("%s (%d)" % f for f in fonts) or "theme default"))
    for f, _ in fonts:
        if "frutiger" in f.lower(): continue
        if f.lower() in ("arial", "helvetica", "helvetica neue"): F.add("INFO", "font", "fallback font '%s' — Frutiger where installed" % f, "deck")
        else: F.add("WARN", "font", "non-brand font '%s' — Frutiger (Arial as fallback)" % f, "deck")
    roles = ("theme", "background", "fill", "text", "line", "chart", "table")
    print("\nColours by role (as rendered; * = off-palette → nearest palette colour)")
    for role in roles:
        rows = sorted(((k[1], v) for k, v in usage.items() if k[0] == role), key=lambda x: -x[1]["n"])
        for h, v in rows:
            name = PALETTE.get(h) or ("complex-chart colour" if h in COMPLEX else "trading colour" if h in TRADING else None)
            tag = (" %s" % name) if name else ("*→ #%s %s" % (nearest(h), PALETTE[nearest(h)]))
            extra = (" · tint of %s" % v["tint"]) if v["tint"] else ""
            extra += (" · max %d%% of slide" % round(v["maxarea"] * 100)) if role == "fill" and v["maxarea"] >= 0.01 else ""
            print("  %-10s #%s %4dx %s%s   %s" % (role, h, v["n"], tag, extra, ", ".join(v["locs"][:4])))
            if not name:
                msg = "off-palette %s colour #%s%s → nearest #%s %s" % (role, h, " (tint of %s)" % v["tint"] if v["tint"] else "", nearest(h), PALETTE[nearest(h)])
                for l in v["locs"] or [role]: F.add("ERROR", "colour", msg, l)
            elif h in COMPLEX: F.add("INFO", "complex", "complex-chart colour #%s — only for >10 equal-weight series" % h, role)
    print()
    for (sev, key, msg), locs in sorted(F.items.items(), key=lambda kv: (sev_order[kv[0][0]], kv[0][1], kv[0][2])):
        print("[%s] %s  (%dx)" % (sev, msg, len(locs)))
        for l in locs[: a.max]: print("    " + l)
        if len(locs) > a.max: print("    … %d more" % (len(locs) - a.max))
    c = F.counts()
    print("\nSummary: %d errors, %d warnings, %d info" % (c["ERROR"], c["WARN"], c["INFO"]))
    if a.suggest_map:
        mp = {"_note": "DRAFT from pptx_brand check — review every line by role before apply",
              "theme": dict(THEME)}
        chart_rows = sorted(((k[1], v) for k, v in usage.items() if k[0] == "chart" and not on_palette(k[1])), key=lambda x: -x[1]["n"])
        used = {k[1] for k in usage if k[0] == "chart" and on_palette(k[1])}
        seq = [c for c in CHART_SEQ if c not in used] or CHART_SEQ
        for i, (h, _) in enumerate(chart_rows): mp.setdefault("chart", {})[h] = seq[i % len(seq)]
        for (role, h), v in usage.items():
            if role in ("background", "fill", "text", "line", "table") and not on_palette(h) and h not in COMPLEX:
                mp.setdefault(role, {})[h] = suggest(role, h, v["maxarea"])
        mp["background"] = dict(mp.get("background", {}), **{"*": "FFFFFF"})
        mp["shapes"] = []
        arrows = caps.pop("\0arrows", {})
        def rag_arrow(h):
            hu, sa = hue(h), sat(h)
            if sa < 0.25: return "7A7870"
            return "6F7A1A" if 70 <= hu <= 170 else "E4A911" if 30 <= hu < 70 else "BD000C"
        mp["arrows"] = {h: rag_arrow(h) for h in arrows}
        mp["text_replace"] = caps
        mp["text_substitute"] = {t: "the organisation" for t in a.forbid}
        with open(a.suggest_map, "w", encoding="utf-8") as f: json.dump(mp, f, indent=1, ensure_ascii=False)
        print("draft map written to %s" % a.suggest_map)
    sys.exit(1 if c["ERROR"] else 0)

# ---------------------------------------------------------------- apply
def norm_map(mp):
    out = {}
    for k, v in mp.items():
        if isinstance(v, dict) and k not in ("text_replace", "text_substitute"):
            out[k] = {(kk if kk == "*" or k == "theme" else kk.lstrip("#").upper()): str(vv).lstrip("#").upper() for kk, vv in v.items()}
        else: out[k] = v
    return out

def lookup(mp, role, old, slide, shape):
    for ov in mp.get("shapes", []):
        if ov.get("slide") == slide and ov.get("shape") == shape and ov.get("role", role) == role and \
           (not ov.get("from") or ov["from"].lstrip("#").upper() == old):
            return ov["to"].lstrip("#").upper()
    for key in (role, "any"):
        d = mp.get(key, {})
        if old in d: return d[old]
    for key in (role, "any"):
        d = mp.get(key, {})
        if "*" in d and not on_palette(old): return d["*"]
    return None

def srgb(h): return '<a:srgbClr val="%s"/>' % h

def recolour(ctx, part, t, kind, mp, old_theme, new_theme, clrmap, bg_of, st, tables_on):
    occs, shapes, _ = walk(t, kind)
    slide = ctx.slide_no.get(ctx.owner.get(part, part))
    target = {}
    for i, o in enumerate(occs):
        if o["role"] in ("effect", "themefmt", "theme"): continue
        old = resolve(o["kind"], o["attrs"], o["inner"], old_theme, clrmap)[0]
        if old is None: continue
        sh = shapes[o["shape"]]["name"] if o["shape"] is not None else None
        to = lookup(mp, o["role"], old, slide, sh)
        if to and (to != old or o["kind"] != "srgbClr" or o["inner"]): target[i] = to
    def final_i(i):
        if i in target: return target[i]
        o = occs[i]; return resolve(o["kind"], o["attrs"], o["inner"], new_theme, clrmap)[0]
    index = {id(o): i for i, o in enumerate(occs)}
    final = lambda o: final_i(index[id(o)])
    bg = bg_of(occs, final)
    for si, sh in enumerate(shapes):
        if sh["tag"] == "tc" and tables_on: continue
        fo = shape_fill_occ(occs, si)
        fill = final(fo) if (fo is not None and not sh["nofill"]) else None
        ground = ground_of(shapes, si, fill, bg, occs, final)
        if not ground or not sh["text"]: continue
        for i, o in enumerate(occs):
            if o["shape"] == si and o["role"] == "text":
                h = final_i(i)
                if h and contrast(h, ground) < 3:
                    target[i] = text_on(ground); st["contrast fixes"] += 1
    if kind in ("chart", "diagram"):
        for i, o in enumerate(occs):
            if o["role"] == "text" and not {"dLbls", "dLbl"} & set(o["anc"]):
                h = final_i(i)
                if h and contrast(h, "FFFFFF") < 3: target[i] = text_on("FFFFFF"); st["contrast fixes"] += 1
    if kind == "master" and bg:
        for i, o in enumerate(occs):
            if o["shape"] is None and o["role"] == "text" and "txStyles" in o["anc"]:
                h = final_i(i)
                if h and contrast(h, bg) < 3: target[i] = text_on(bg); st["contrast fixes"] += 1
    out, last = [], 0
    for i in sorted(target, key=lambda i: occs[i]["start"]):
        o = occs[i]; out.append(t[last:o["start"]]); out.append(srgb(target[i])); last = o["end"]
        st["colours remapped (%s)" % o["role"]] += 1
    out.append(t[last:])
    return "".join(out)

def first_stop(m, strip):
    c = re.search(r"<a:gs\b[^>]*>\s*(<a:(\w+)\b[^>]*?(?:/>|>.*?</a:\2>))", m.group(0), re.S)
    if not c: return "<a:noFill/>"
    col = c.group(1)
    if strip: col = re.sub(r"<a:(\w+)\b([^>]*?)(?:/>|>.*?</a:\1>)", lambda x: "<a:%s%s/>" % (x.group(1), x.group(2)), col, count=1, flags=re.S)
    return "<a:solidFill>%s</a:solidFill>" % col

def flatten(t, st, theme=False):
    t, n = re.subn(r"<a:gradFill\b[^>]*>.*?</a:gradFill>", lambda m: first_stop(m, theme), t, flags=re.S); st["gradients → solid"] += n
    t, n = re.subn(r"<a:effectLst>(?:(?!</a:effectLst>).)+</a:effectLst>", "<a:effectLst/>", t, flags=re.S); st["effects removed"] += n
    t, n = re.subn(r"<a:scene3d>.*?</a:scene3d>|<a:sp3d\b[^>]*/>|<a:sp3d\b[^>]*>.*?</a:sp3d>", "", t, flags=re.S); st["3D removed"] += n
    if not theme:
        def de_alpha(m):
            col = m.group(0)
            if re.search(r'val="(000000|FFFFFF|ffffff)"|val="(bg1|lt1|tx1|dk1)"', col.split(">")[0]): return col
            return re.sub(r'<a:alpha\s+val="\d+"\s*/>', "", col)
        t2 = re.sub(r"<a:(srgbClr|schemeClr)\b[^>]*>(?:(?!</a:\1>).)*<a:alpha\b.*?</a:\1>", de_alpha, t, flags=re.S)
        if t2 != t: st["transparency removed"] += 1
        t = t2
    return t

def light_and_left(t, st):
    """Page titles and big figures are light, not bold; text is left-aligned."""
    def unbold(m):
        tag = m.group(0); sz = attr(tag, "sz")
        if sz and sz.isdigit() and int(sz) >= 2400 and re.search(r'\sb="1"', tag):
            st["large text → light (not bold)"] += 1; return re.sub(r'\sb="1"', ' b="0"', tag)
        return tag
    t = re.sub(r"<a:(?:rPr|defRPr|endParaRPr)\b[^>]*>", unbold, t)
    t, n = re.subn(r'(<a:(?:pPr|lvl\dpPr|defPPr)\b[^>]*?\salgn=")ctr"', r'\1l"', t); st["centred → left"] += n
    return t

def typography(t, st, font):
    t, n = re.subn(r'(<a:(?:rPr|defRPr|endParaRPr)\b[^>]*?)\s+cap="(?:all|small)"', r"\1", t); st["caps removed"] += n
    t, n = re.subn(r'(<a:(?:rPr|defRPr|endParaRPr)\b[^>]*?)\s+u="(?!none)[^"]+"', r"\1", t); st["underlines removed"] += n
    t, n = re.subn(r'(<a:(?:pPr|lvl\dpPr|defPPr)\b[^>]*?\salgn=")(?:just|dist|justLow|thaiDist)"', r'\1l"', t); st["justified → left"] += n
    t, n = re.subn(r'<a:prstGeom prst="(?:roundRect|round1Rect|round2SameRect|round2DiagRect|snipRoundRect|flowChartAlternateProcess|plaque)"\s*(?:/>|>.*?</a:prstGeom>)',
                   '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>', t, flags=re.S); st["rounded → square"] += n
    if font:
        def f(m):
            tf = m.group(1)
            if tf.startswith("+") or SYMBOL_FONT.search(tf) or tf == font: return m.group(0)
            st["fonts set"] += 1; return '<a:latin typeface="%s"/>' % html.escape(font, quote=True)
        t = re.sub(r'<a:latin\b[^>]*?\stypeface="([^"]*)"[^>]*?(?:/>|>\s*</a:latin>)', f, t)
    return t

WHITE_LN = '<a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln>'
def donut_style(body, theme, st):
    """White separators between segments; data labels white where a segment is too dark for black text."""
    tail_at = body.rfind("</c:ser>") + len("</c:ser>")
    group = re.search(r"<c:dLbls>(.*?)</c:dLbls>", body[tail_at:], re.S)
    def ser(m):
        s = m.group(0)
        if "<c:spPr>" in s.split("<c:dPt>")[0]:
            head, rest = s.split("<c:dPt>", 1) if "<c:dPt>" in s else (s, None)
            if "<a:ln" not in re.search(r"<c:spPr>.*?</c:spPr>", head, re.S).group(0):
                head = re.sub(r"(<c:spPr>.*?)(<a:effectLst|</c:spPr>)", lambda x: x.group(1) + WHITE_LN + x.group(2), head, count=1, flags=re.S)
                st["donut separators"] += 1
            s = head + ("<c:dPt>" + rest if rest is not None else "")
        else:
            s = re.sub(r"(</c:tx>|<c:order val=\"\d+\"/>)", lambda x: x.group(1) + "<c:spPr>%s</c:spPr>" % WHITE_LN, s, count=1); st["donut separators"] += 1
        if not group or "<c:dLbls>" in s or not re.search(r'<c:show(Val|Percent) val="1"', group.group(1)): return s
        n = re.search(r'<c:val>.*?<c:ptCount val="(\d+)"', s, re.S)
        if not n: return s
        fills = {}
        for d in re.findall(r"<c:dPt>.*?</c:dPt>", s, re.S):
            i, c = re.search(r'<c:idx val="(\d+)"', d), re.search(r'<a:srgbClr val="(\w{6})"', d)
            if i and c: fills[int(i.group(1))] = c.group(1).upper()
        dark = [i for i in range(int(n.group(1))) if contrast("000000", fills.get(i) or theme.get("accent%d" % (i % 6 + 1), "FFFFFF")) < 4.5]
        if not dark: return s
        flags = re.sub(r"<c:(showLeaderLines|leaderLines|extLst)\b.*?(?:/>|</c:\1>)", "", group.group(1), flags=re.S)
        white = '<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>'
        wflags = re.sub(r"<c:txPr>.*?</c:txPr>", "", flags, flags=re.S)
        wflags = re.sub(r"^((?:<c:numFmt\b[^>]*/>)?(?:<c:spPr>.*?</c:spPr>)?)", lambda x: x.group(1) + white, wflags, count=1, flags=re.S)
        lbls = "".join('<c:dLbl><c:idx val="%d"/>%s</c:dLbl>' % (i, wflags) for i in dark)
        st["donut labels → white on dark segments"] += len(dark)
        return re.sub(r"(<c:cat>|<c:val>)", lambda x: "<c:dLbls>%s%s</c:dLbls>" % (lbls, flags) + x.group(1), s, count=1)
    return body[:tail_at].replace(body[:tail_at], re.sub(r"<c:ser>.*?</c:ser>", ser, body[:tail_at], flags=re.S)) + body[tail_at:]

def chart_fix(t, st, theme=None):
    theme = theme or {}
    t, n = re.subn(r"<c:(major|minor)Gridlines\s*/>|<c:(major|minor)Gridlines>.*?</c:\2Gridlines>", "", t, flags=re.S); st["gridlines removed"] += n
    def donut(m):
        body = m.group(1); st["pies → donuts"] += 1
        if "<c:holeSize" not in body:
            if "<c:firstSliceAng" in body: body = re.sub(r"(<c:firstSliceAng\b[^>]*/>)", r'\1<c:holeSize val="64"/>', body, count=1)
            else:
                tail = re.search(r"(<c:extLst>(?:(?!<c:ser>).)*</c:extLst>)\s*$", body, re.S)
                ins = '<c:firstSliceAng val="0"/><c:holeSize val="64"/>'
                body = body[:tail.start()] + ins + body[tail.start():] if tail else body + ins
        return "<c:doughnutChart>%s</c:doughnutChart>" % body
    t = re.sub(r"<c:pieChart>(.*?)</c:pieChart>", donut, t, flags=re.S)
    t = re.sub(r"<c:doughnutChart>.*?</c:doughnutChart>", lambda m: donut_style(m.group(0), theme, st), t, flags=re.S)
    def one_colour(m):
        body = m.group(0)
        if body.count("<c:ser>") == 1 and VARY_ON.search(body):
            st["single-series charts → one colour"] += 1; return VARY_ON.sub('<c:varyColors val="0"/>', body)
        return body
    return re.sub(r"<c:(barChart|lineChart|areaChart)>.*?</c:\1>", one_colour, t, flags=re.S)

def set_run_colour(tc_body, ground, st, bold=None):
    """Explicit run colours that fail contrast on the cell ground -> black/white; add colour where none is set."""
    need = text_on(ground)
    def fix_rpr(m):
        rpr = m.group(0)
        if bold is not None:
            head = re.match(r"<a:\w+\b[^>]*?(?=/?>)", rpr).group(0)
            rpr = re.sub(r'\s+b="[01]"', "", head) + ' b="%d"' % bold + rpr[len(head):]
        c = re.search(r'<a:solidFill>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"', rpr)
        if c:
            if contrast(c.group(1).upper(), ground) < 3:
                st["contrast fixes"] += 1; rpr = rpr.replace(c.group(0), '<a:solidFill><a:srgbClr val="%s"' % need, 1)
            return rpr
        if re.search(r"<a:solidFill>", rpr): return rpr
        if need == "000000": return rpr
        st["contrast fixes"] += 1
        if rpr.endswith("/>"): return rpr[:-2] + "><a:solidFill>%s</a:solidFill></a:%s>" % (srgb(need), m.group(2))
        return re.sub(r"^(<a:%s\b[^>]*>)(\s*<a:ln\b.*?</a:ln>)?" % m.group(2), lambda x: x.group(0) + "<a:solidFill>%s</a:solidFill>" % srgb(need), rpr, count=1, flags=re.S)
    tc_body = re.sub(r'<a:r>(?!\s*<a:rPr)', '<a:r><a:rPr/>', tc_body)
    return re.sub(r"(<a:(rPr|endParaRPr)\b[^>]*?)(?:/>|>.*?</a:\2>)", fix_rpr, tc_body, flags=re.S)

def align_numbers(tb, st):
    """Columns whose body cells are all numbers are right-aligned, header included (skipped for merged cells)."""
    if re.search(r'<a:tc\b[^>]*(gridSpan|hMerge|rowSpan|vMerge)=', tb): return tb
    rows = [re.findall(r"<a:tc\b.*?</a:tc>", r, re.S) for r in re.findall(r"<a:tr\b.*?</a:tr>", tb, re.S)]
    if len(rows) < 2: return tb
    text = lambda tc: "".join(html.unescape(x) for x in re.findall(r"<a:t>([^<]*)</a:t>", tc)).strip()
    right = {j for j in range(len(rows[0])) if all(j < len(r) for r in rows) and
             [text(r[j]) for r in rows[1:] if text(r[j])] and all(NUMERIC.match(text(r[j])) for r in rows[1:] if text(r[j]))}
    if not right: return tb
    def para_r(tc):
        tc = re.sub(r'(<a:pPr\b[^>]*?)\salgn="\w+"', r"\1", tc)
        tc = re.sub(r"<a:pPr\b", '<a:pPr algn="r"', tc)
        return re.sub(r"<a:p>(?!<a:pPr)", '<a:p><a:pPr algn="r"/>', tc)
    for r in rows:
        for j in right:
            if j < len(r): tb = tb.replace(r[j], para_r(r[j]), 1)
    st["table number columns → right"] += len(right)
    return tb

def table_fix(t, st, theme, clrmap):
    def cell_fill(tcpr):
        body = re.sub(r"<a:ln\w*\b[^>]*>.*?</a:ln\w*>", "", tcpr, flags=re.S)
        m = re.search(r"<a:solidFill>\s*<a:(\w+)\b([^>]*?)(/>|>(.*?)</a:\1>)", body, re.S)
        return resolve(m.group(1), m.group(2), m.group(4), theme, clrmap)[0] if m else None
    def line(tag, w): return '<a:%s w="%d" cap="flat" cmpd="sng"><a:solidFill>%s</a:solidFill><a:prstDash val="solid"/></a:%s>' % (tag, w, srgb("000000"), tag)
    def table(m):
        tb = m.group(0); st["tables → financial style"] += 1
        if "<a:tableStyleId>" in tb: tb = re.sub(r"<a:tableStyleId>[^<]*</a:tableStyleId>", "<a:tableStyleId>%s</a:tableStyleId>" % NO_STYLE_TABLE, tb)
        else: tb = re.sub(r"<a:tblPr\b([^>]*?)(/>|>)", lambda x: "<a:tblPr%s><a:tableStyleId>%s</a:tableStyleId>%s" % (x.group(1), NO_STYLE_TABLE, "</a:tblPr>" if x.group(2) == "/>" else ""), tb, count=1)
        rows = list(re.finditer(r"<a:tr\b[^>]*>.*?</a:tr>", tb, re.S))
        out, last = [], 0
        for ri, rm in enumerate(rows):
            row = rm.group(0)
            first_txt = "".join(re.findall(r"<a:t>([^<]*)</a:t>", (re.search(r"<a:tc\b.*?</a:tc>", row, re.S) or rm).group(0))).strip()
            total = bool(re.match(r"(?i)(grand\s+)?(total|gesamt|summe)\b", first_txt))
            def cell(cm):
                tc_open, body = cm.group(1), cm.group(2)
                pm = re.search(r"<a:tcPr\b([^>]*?)(/>|>.*?</a:tcPr>)", body, re.S)
                attrs = pm.group(1) if pm else ""
                f = cell_fill(pm.group(0)) if pm else None
                keep = f if (f and f != "FFFFFF") else None
                lines = ""
                if ri == 0: lines += line("lnT", 9525)
                if total: lines = line("lnT", 12700)
                if ri == 0 or ri == len(rows) - 1 or total: lines += line("lnB", 12700 if total else 9525)
                new_pr = "<a:tcPr%s>%s%s</a:tcPr>" % (attrs, lines, "<a:solidFill>%s</a:solidFill>" % srgb(keep) if keep else "<a:noFill/>")
                txt = body[:pm.start()] + body[pm.end():] if pm else body
                bold = 1 if total else (0 if keep and keep != "ECEBE4" else None)   # bold on a coloured fill only on Pastel I
                txt = set_run_colour(txt, keep or "FFFFFF", st, bold)
                return tc_open + txt + new_pr + "</a:tc>"
            row = re.sub(r"(<a:tc\b[^>]*>)(.*?)</a:tc>", cell, row, flags=re.S)
            out.append(tb[last:rm.start()]); out.append(row); last = rm.end()
        out.append(tb[last:])
        return align_numbers("".join(out), st)
    return re.sub(r"<a:tbl>.*?</a:tbl>", table, t, flags=re.S)

def split_arrows(t, arrows, st):
    """'▲ 7% vs Q2' in one coloured run -> the arrow keeps a RAG colour, the text turns black. Text is unchanged."""
    if not arrows: return t
    def f(m):
        rpr, arrow, rest = m.group(1), m.group(2), m.group(3)
        c = RUN_CLR.search(rpr)
        if not c or c.group(1).upper() not in arrows: return m.group(0)
        st["arrows coloured (text black)"] += 1
        col = lambda h: rpr.replace(c.group(0), '<a:solidFill><a:srgbClr val="%s"' % h, 1)
        out = "<a:r>%s<a:t>%s</a:t></a:r>" % (col(arrows[c.group(1).upper()]), arrow)
        return out + ("<a:r>%s<a:t>%s</a:t></a:r>" % (col("000000"), rest) if rest else "")
    return ARROW_RUN.sub(f, t)

def text_edits(t, mp, st):
    rep, sub = mp.get("text_replace") or {}, mp.get("text_substitute") or {}
    if not rep and not sub: return t
    def f(m):
        raw = html.unescape(m.group(2)); new = raw; key = raw.strip()
        if key in rep: new = raw.replace(key, rep[key]); st["text replaced"] += 1
        for k, v in sorted(sub.items(), key=lambda kv: -len(kv[0])):
            new2 = re.sub(r"(?i)(?<![^\W\d_])" + re.escape(k) + r"(?![^\W\d_])", v, new)
            if new2 != new: st["text substituted"] += 1; new = new2
        return m.group(1) + html.escape(new, quote=False) + m.group(3) if new != raw else m.group(0)
    return re.sub(r"(<a:t(?:\s[^>]*)?>|<c:v>)([^<]*)(</a:t>|</c:v>)", f, t)

def cmd_apply(a):
    if os.path.abspath(a.deck) == os.path.abspath(a.out): sys.exit("refusing to overwrite the input — write to a new file")
    with open(a.map, encoding="utf-8") as f: mp = norm_map(json.load(f))
    pkg = Package(a.deck); ctx = Context(pkg); st = defaultdict(int); changed = {}
    new_themes = {}
    for n, th in ctx.themes.items():
        new_themes[n] = {s: mp.get("theme", {}).get(s, h) for s, h in th.items()}
    order = sorted((n for n in pkg.names() if part_kind(n)), key=lambda n: ["theme", "master", "layout", "slide", "chart", "diagram", "meta"].index(part_kind(n)))
    bg_white = not a.keep_backgrounds
    for n in order:
        k = part_kind(n); t = pkg.text(n)
        if k == "theme":
            for s, h in new_themes[n].items():
                if h and h != ctx.themes[n].get(s):
                    t, c = re.subn(r"(<a:%s>).*?(</a:%s>)" % (s, s), r"\g<1>%s\g<2>" % srgb(h), t, count=1, flags=re.S); st["theme colours set"] += c
            t = flatten(t, st, theme=True)
            if a.font:
                t, c = re.subn(r'(<a:(?:major|minor)Font>\s*)<a:latin\b[^>]*/>', r'\1<a:latin typeface="%s"/>' % html.escape(a.font, quote=True), t); st["fonts set"] += c
        elif k in ("master", "layout", "slide", "chart", "diagram"):
            if bg_white and k in ("master", "layout", "slide"):
                t, c = re.subn(r"<p:bg>.*?</p:bg>", "<p:bg><p:bgPr><a:solidFill>%s</a:solidFill><a:effectLst/></p:bgPr></p:bg>" % srgb("FFFFFF"), t, flags=re.S)
                st["backgrounds → white"] += c
            old_th, new_th, cm = ctx.theme_for(n), ctx.theme_for(n, new_themes), ctx.clrmap_for(n)
            def bg_of(occs, final, n=n, k=k):
                if k in ("chart", "diagram"): return "FFFFFF"
                if bg_white: return "FFFFFF"
                own = [o for o in occs if o["role"] == "background"]
                if own: return final(own[0])
                return part_bg(ctx, ctx.layout_of.get(n) or ctx.master_of.get(n) or n, changed, new_themes, False)
            if k == "slide": t = split_arrows(t, mp.get("arrows") or {}, st)
            t = recolour(ctx, n, t, k, mp, old_th, new_th, cm, bg_of, st, not a.keep_tables)
            t = flatten(t, st); t = typography(t, st, a.font)
            if k in ("slide", "layout", "master"): t = light_and_left(t, st)
            if k == "chart": t = chart_fix(t, st, new_th)
            if k == "slide" and not a.keep_tables: t = table_fix(t, st, new_th, cm)
            t = text_edits(t, mp, st)
        elif k == "meta":
            t = text_edits(t, {"text_substitute": mp.get("text_substitute")}, st) if n.startswith("ppt/") else t
            if n.startswith("docProps/"):
                for kk, v in sorted((mp.get("text_substitute") or {}).items(), key=lambda kv: -len(kv[0])):
                    t2 = re.sub(r"(?i)(?<![^\W\d_])" + re.escape(kk) + r"(?![^\W\d_])", v, t)
                    if t2 != t: st["document properties edited"] += 1; t = t2
                if a.clear_author:
                    t, c = re.subn(r"<(dc:creator|cp:lastModifiedBy|Company|Manager)>[^<]*</\1>", r"<\1></\1>", t); st["author/company cleared"] += c
        if t != pkg.text(n): changed[n] = t
    pkg.write(a.out, changed)
    print("pptx_brand apply: %s -> %s" % (a.deck, a.out))
    for k2 in sorted(st): print("  %-38s %d" % (k2, st[k2]))
    print("parts changed: %d. Now run: check %s" % (len(changed), a.out))

# ---------------------------------------------------------------- render
def cmd_render(a):
    soffice = shutil.which("soffice") or shutil.which("libreoffice") or next(
        (p for p in ("/Applications/LibreOffice.app/Contents/MacOS/soffice", r"C:\Program Files\LibreOffice\program\soffice.exe") if os.path.exists(p)), None)
    if not soffice: sys.exit("LibreOffice (soffice) not found — render the deck in PowerPoint and check it by eye instead")
    os.makedirs(a.outdir, exist_ok=True)
    with tempfile.TemporaryDirectory() as prof:
        subprocess.run([soffice, "-env:UserInstallation=file://" + prof.replace("\\", "/"), "--headless", "--convert-to", "pdf", "--outdir", a.outdir, a.deck],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)
    pdf = os.path.join(a.outdir, os.path.splitext(os.path.basename(a.deck))[0] + ".pdf")
    if not os.path.exists(pdf): sys.exit("LibreOffice could not convert the deck — it may be damaged; open it in PowerPoint")
    pngs = False
    try:
        subprocess.run(["pdftoppm", "-png", "-r", str(a.dpi), pdf, os.path.join(a.outdir, "slide")], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); pngs = True
    except (OSError, subprocess.CalledProcessError):
        try:
            import pymupdf
            for i, page in enumerate(pymupdf.open(pdf), 1): page.get_pixmap(dpi=a.dpi).save(os.path.join(a.outdir, "slide-%02d.png" % i))
            pngs = True
        except Exception: pass
    print(pdf)
    if pngs: print("\n".join(sorted(os.path.join(a.outdir, f) for f in os.listdir(a.outdir) if f.endswith(".png"))))
    else: print("(no PDF rasteriser found — look at the PDF directly)")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    c = sp.add_parser("check"); c.add_argument("deck"); c.add_argument("--forbid", action="append", default=[])
    c.add_argument("--suggest-map"); c.add_argument("--max", type=int, default=8)
    p = sp.add_parser("apply"); p.add_argument("deck"); p.add_argument("out"); p.add_argument("--map", required=True)
    p.add_argument("--font"); p.add_argument("--keep-tables", action="store_true"); p.add_argument("--keep-backgrounds", action="store_true")
    p.add_argument("--clear-author", action="store_true")
    r = sp.add_parser("render"); r.add_argument("deck"); r.add_argument("outdir"); r.add_argument("--dpi", type=int, default=60)
    a = ap.parse_args()
    {"check": cmd_check, "apply": cmd_apply, "render": cmd_render}[a.cmd](a)

if __name__ == "__main__":
    main()
```
