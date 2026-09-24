"""Tests for the redesign skill's script (dash_redesign.py).

The script lives inside skills/redesign/SKILL.md. Run the suite through the tool, which extracts it:

    python3 scripts/redesign_skill_tool.py test

or point REDESIGN_SCRIPT at a working copy:

    REDESIGN_SCRIPT=path/to/dash_redesign.py python3 -m unittest scripts/tests/test_redesign.py
"""
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "test-dashboards"
SCRIPT = Path(os.environ.get("REDESIGN_SCRIPT", ""))


def load():
    spec = importlib.util.spec_from_file_location("dash_redesign", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


R = load() if SCRIPT.is_file() else None


def close(a, b):
    return abs(a - b) <= max(1e-6 * max(abs(a), abs(b)), 1e-6)


@unittest.skipIf(R is None, "set REDESIGN_SCRIPT or run via scripts/redesign_skill_tool.py test")
class Inventory(unittest.TestCase):
    """Every dataset in the answer key is found with the right row count and column sums."""

    def test_answer_key(self):
        expected = json.loads((FIX / "expected.json").read_text())
        missing = []
        for fixture, sets in expected.items():
            inv = R.inventory(FIX / fixture)
            for exp in sets:
                ok = False
                for d in inv["datasets"]:
                    if d["n_rows"] != exp["rows"]:
                        continue
                    sums = list(d["sums"].values())
                    if all(any(close(v, s) for s in sums) for v in exp["sums"].values()):
                        ok = True
                        break
                if not ok:
                    missing.append("%s: %s (%d rows)" % (fixture, exp["dataset"], exp["rows"]))
        self.assertEqual(missing, [], "datasets not found:\n  " + "\n  ".join(missing))

    def test_missing_source_is_warned(self):
        inv = R.inventory(FIX / "05-events-fetch" / "index.html")
        self.assertTrue(any("feedback_raw.parquet" in w for w in inv["warnings"]), inv["warnings"])

    def test_locale_numbers(self):
        self.assertEqual(R.parse_number("69.2 %")[0], 0.692)
        self.assertEqual(R.parse_number("38'846")[0], 38846)
        self.assertEqual(R.parse_number("15.8k")[0], 15800)
        self.assertEqual(R.parse_number("1.24m")[0], 1240000)
        self.assertEqual(R.parse_number("2:41 min")[0], 161)
        self.assertEqual(R.parse_number("1.234,5")[0], 1234.5)
        self.assertIsNone(R.parse_number("–")[0])
        self.assertIsNone(R.parse_number("05 May 2026")[0])

    def test_blank_cells_stay_blank(self):
        inv = R.inventory(FIX / "04-campaign-static.html")
        camp = next(d for d in inv["datasets"] if d["n_rows"] == 12)
        video = [c["key"] for c in camp["columns"]].index("Video / Views")
        self.assertIn(None, [r[video] for r in camp["rows"]])


LAYOUT02 = Path(__file__).resolve().parent / "fixtures" / "02-layout.json"
OUT = FIX / "_out" / "tests"


def data02():
    return R.init_data(R.inventory(FIX / "02-newsletter-chartjs.html"))


def kpi(value, compare=None, **kw):
    k = {"id": kw.pop("id", "k"), "label": kw.pop("label", "Figure"), "value": value,
         "compare": compare or {"type": "none", "reason": "test"}}
    k.update(kw)
    return k


@unittest.skipIf(R is None, "set REDESIGN_SCRIPT or run via scripts/redesign_skill_tool.py test")
class Engine(unittest.TestCase):
    def setUp(self):
        self.m = R.Model(data02())
        self.ds = "dashboard_data_newsletters"

    def test_aggregations(self):
        v = lambda **r: self.m.value(dict({"dataset": self.ds}, **r), "t")
        self.assertEqual(v(column="delivered", agg="sum"), 1806212)
        self.assertEqual(v(agg="count"), 48)
        self.assertAlmostEqual(v(agg="ratio", num={"dataset": self.ds, "column": "unique_opens", "agg": "sum"},
                                 den={"dataset": self.ds, "column": "delivered", "agg": "sum"}), 1108002 / 1806212)
        self.assertEqual(v(column="delivered", agg="sum", where={"audience.segment": "EMEA"}),
                         sum(r["delivered"] for r in self.m.ds[self.ds]["rows"] if r["audience.segment"] == "EMEA"))
        self.assertIsInstance(v(column="delivered", agg="median"), (int, float))
        w = v(column="unique_opens", agg="weighted", weight="delivered")
        self.assertIsInstance(w, float)

    def test_formats(self):
        self.assertEqual(R.fmt(12345), "12.3k")
        self.assertEqual(R.fmt(1234567), "1.2M")
        self.assertEqual(R.fmt(0.618, "percent"), "61.8%")
        self.assertEqual(R.fmt(0.00016, "percent"), "0.02%")
        self.assertEqual(R.fmt(161, "seconds"), "2:41 min")
        self.assertEqual(R.fmt(None), "–")
        self.assertEqual(R.fmt_month("2026-08"), "Aug 2026")

    def test_unique_visitors_never_summed(self):
        data = R.init_data(R.inventory(FIX / "01-intranet-plotly.html"))
        cols = data["datasets"]["top_pages"]["columns"]
        self.assertEqual(next(c for c in cols if c["key"] == "unique_visitors")["metric"], "unique_visitors")
        layout = {"kpis": [kpi({"dataset": "top_pages", "column": "unique_visitors", "agg": "sum"}, id="uv")],
                  "sections": []}
        with self.assertRaisesRegex(R.LayoutError, "cannot be added up"):
            R.compute_all(data, layout)
        layout["kpis"][0]["value"]["agg"] = "max"
        R.compute_all(data, layout)

    def test_compare_rules(self):
        base = {"dataset": self.ds, "column": "delivered", "agg": "sum"}
        with self.assertRaisesRegex(R.LayoutError, "KPI 'x'.*needs a 'value'"):
            R.kpi_view(self.m, kpi(base, {"type": "prior"}, id="x"), set())
        with self.assertRaisesRegex(R.LayoutError, "needs a 'reason'"):
            R.kpi_view(self.m, kpi(base, {"type": "none"}), set())
        with self.assertRaisesRegex(R.LayoutError, "add 'compare'"):
            R.kpi_view(self.m, {"id": "y", "label": "Y", "value": base}, set())
        k = R.kpi_view(self.m, kpi(base, {"type": "target", "value": base}), set())
        self.assertEqual(k["delta"]["dir"], "flat")

    def test_placeholders(self):
        views, _ = R.compute_all(data02(), json.loads(LAYOUT02.read_text()))
        v = views[""]
        t = v["sections"][0]["title"]
        self.assertNotIn("{", t)
        self.assertIn(v["sections"][0]["chart"]["series"][0]["labels"][-1], t)
        self.assertTrue(v["sections"][1]["title"].startswith("Global"))
        layout = json.loads(LAYOUT02.read_text())
        layout["sections"][0]["title"] = "{kpi.nope} went up"
        with self.assertRaisesRegex(R.LayoutError, "no KPI with that id"):
            R.compute_all(data02(), layout)

    def test_filters_need_record_grain(self):
        layout = json.loads(LAYOUT02.read_text())
        layout["filters"] = [{"column": "category", "datasets": ["opens_and_clicks_by_weekday_data"]}]
        with self.assertRaisesRegex(R.LayoutError, "record-grain"):
            R.compute_all(data02(), layout)

    def test_filter_views(self):
        views, fmeta = R.compute_all(data02(), json.loads(LAYOUT02.read_text()))
        self.assertEqual(len(views), 1 + len(fmeta[0]["values"]))
        emea = views["EMEA"]["kpis"][0]
        self.assertLess(emea["value"], views[""]["kpis"][0]["value"])


@unittest.skipIf(R is None, "set REDESIGN_SCRIPT or run via scripts/redesign_skill_tool.py test")
class BuildAndCheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        OUT.mkdir(parents=True, exist_ok=True)
        cls.inv = OUT / "inventory.json"
        cls.inv.write_text(json.dumps(R.inventory(FIX / "02-newsletter-chartjs.html")))
        cls.data = OUT / "data.json"
        cls.data.write_text(json.dumps(data02()))
        cls.page, cls.notes, cls.views = R.build(cls.data, LAYOUT02, OUT / "02-redesigned.html")

    def tearDown(self):
        for p in OUT.glob("*-tampered*"):
            p.unlink()

    def test_page_is_self_contained(self):
        html = self.page.read_text()
        self.assertNotRegex(html, r"<script[^>]+src=")
        self.assertNotIn("https://", html.split('id="rd-data"')[0])
        for k in self.views[""]["kpis"]:
            self.assertIn(k["display"], html)
        self.assertTrue(self.notes.exists())
        self.assertIn("## What changed", self.notes.read_text())

    def test_clean_page_passes(self):
        errors, warns, info = R.check(self.page, self.inv, render=False)
        self.assertEqual(errors, [])

    def test_tampered_view_fails(self):
        html = self.page.read_text()
        bad = OUT / "02-tampered.html"
        bad.write_text(html.replace('"display":"61.3%"', '"display":"71.3%"', 1))
        errors, _, _ = R.check(bad, self.inv, render=False)
        self.assertTrue(any("does not match its own data" in e for e in errors), errors)

    def test_changed_rows_fail_reconciliation(self):
        d = json.loads(self.data.read_text())
        d["datasets"]["channelmix"]["rows"].pop()
        p = OUT / "data-tampered.json"
        p.write_text(json.dumps(d))
        page, _, _ = R.build(p, LAYOUT02, OUT / "02-tampered.html")
        errors, _, _ = R.check(page, self.inv, render=False)
        self.assertTrue(any("channelmix" in e and "rows" in e for e in errors), errors)
        d["datasets"]["channelmix"]["transform"] = "dropped the last channel for the test"
        p.write_text(json.dumps(d))
        page, _, _ = R.build(p, LAYOUT02, OUT / "02-tampered.html")
        errors, warns, _ = R.check(page, self.inv, render=False)
        self.assertEqual(errors, [])
        self.assertTrue(any("changed on purpose" in w for w in warns))

    def test_lint(self):
        layout = json.loads(LAYOUT02.read_text())
        view = R.compute_all(data02(), layout)[0][""]
        self.assertEqual(R.lint(layout, view, None)[0], [])
        many = dict(layout, kpis=layout["kpis"] + [dict(layout["kpis"][0], id="k%d" % i) for i in range(2)])
        self.assertTrue(any("at most 5" in e for e in R.lint(many, R.compute_all(data02(), many)[0][""], None)[0]))
        jar = json.loads(LAYOUT02.read_text())
        jar["kpis"][2]["label"] = "CTR"
        self.assertTrue(any("'CTR'" in e for e in R.lint(jar, R.compute_all(data02(), jar)[0][""], None)[0]))
        dn = json.loads(LAYOUT02.read_text())
        dn["sections"][1]["chart"] = {"type": "donut", "dataset": "opens_and_clicks_by_weekday_data", "x": "category", "y": "Opens", "top": 7}
        dn["sections"][1]["title"] = "Opens by weekday 2026"
        errs = R.lint(dn, R.compute_all(data02(), dn)[0][""], None)[0]
        self.assertTrue(any("donut" in e for e in errs), errs)

    def test_off_brand_colour_fails(self):
        bad = OUT / "02-tampered-colour.html"
        bad.write_text(self.page.read_text().replace(".kpi:first-child{border-top-color:var(--red)}",
                                                     ".kpi:first-child{border-top-color:#3366CC}"))
        errors, _, _ = R.check(bad, self.inv, render=False)
        self.assertTrue(any("#3366CC" in e for e in errors), errors)

    def test_forbidden_name(self):
        errors, _, _ = R.check(self.page, self.inv, forbid=["Newsletter"], render=False)
        self.assertTrue(any("Newsletter" in e for e in errors))

    def test_refuses_git_tree(self):
        with self.assertRaisesRegex(R.LayoutError, "Git repository"):
            R.build(self.data, LAYOUT02, ROOT / "scripts" / "tests" / "should-not-exist.html")
        self.assertFalse((ROOT / "scripts" / "tests" / "should-not-exist.html").exists())

    @unittest.skipUnless(R and R._find_chrome(), "no Chrome/Chromium/Edge")
    def test_renders(self):
        errors, _, info = R.check(self.page, self.inv, render=True, shot_dir=OUT)
        self.assertEqual(errors, [])
        self.assertTrue(any("rendered headless" in i for i in info), info)


@unittest.skipIf(R is None, "set REDESIGN_SCRIPT or run via scripts/redesign_skill_tool.py test")
class PartialPeriod(unittest.TestCase):
    def test_last_month_marked_when_cut_off_is_mid_month(self):
        data = data02()
        data["meta"]["asOf"] = "2026-08-20"
        v = R.compute_all(data, json.loads(LAYOUT02.read_text()))[0][""]
        ch = v["sections"][0]["chart"]
        self.assertEqual(ch["categories"][-1], "Aug 2026*")
        self.assertIn("20 Aug 2026", ch["partial"])
        self.assertIn("Aug 2026 (to 20 Aug)", v["sections"][0]["title"])

    def test_month_end_cut_off_is_not_partial(self):
        data = data02()
        data["meta"]["asOf"] = "2026-08-31"
        ch = R.compute_all(data, json.loads(LAYOUT02.read_text()))[0][""]["sections"][0]["chart"]
        self.assertNotIn("partial", ch)


@unittest.skipIf(R is None, "set REDESIGN_SCRIPT or run via scripts/redesign_skill_tool.py test")
class Options(unittest.TestCase):
    """Layout options added after the evaluation runs."""

    def setUp(self):
        self.data = data02()
        self.m = R.Model(self.data)
        self.ds = "dashboard_data_newsletters"

    def test_latest_and_previous(self):
        rows = self.m.ds[self.ds]["rows"]
        segs = sorted({r["audience.segment"] for r in rows})
        last = self.m.value({"dataset": self.ds, "column": "delivered", "agg": "sum", "where": {"audience.segment": "@last"}}, "t")
        prev = self.m.value({"dataset": self.ds, "column": "delivered", "agg": "sum", "where": {"audience.segment": "@prev"}}, "t")
        self.assertEqual(last, sum(r["delivered"] for r in rows if r["audience.segment"] == segs[-1]))
        self.assertEqual(prev, sum(r["delivered"] for r in rows if r["audience.segment"] == segs[-2]))

    def test_not_condition(self):
        rows = self.m.ds[self.ds]["rows"]
        v = self.m.value({"dataset": self.ds, "agg": "count", "where": {"audience.segment": {"not": ["Global"]}}}, "t")
        self.assertEqual(v, sum(1 for r in rows if r["audience.segment"] != "Global"))

    def test_min_n_show_n_and_zero(self):
        spec = {"type": "bar", "dataset": self.ds, "x": "audience.segment", "y": "delivered", "min_n": 7, "show_n": True}
        v = R.chart_view(self.m, spec, "t", set())
        self.assertTrue(all("(n=" in c for c in v["categories"]))
        self.assertIn("fewer than 7", v["partial"])
        self.assertTrue(v["zero"])

    def test_computed_table_column(self):
        spec = {"type": "table", "dataset": self.ds, "top": 3, "sort": {"key": "delivered", "dir": "desc"},
                "columns": [{"key": "title"}, {"label": "Open rate", "num": "unique_opens", "den": "delivered"}]}
        v = R.chart_view(self.m, spec, "t", set())
        self.assertTrue(v["rows"][0][1].endswith("%"))

    def test_month_numbers_sort_and_label(self):
        data = {"meta": {}, "datasets": {"m": {"grain": "aggregate", "columns": [{"key": "m", "type": "month"}, {"key": "v", "type": "number", "additive": True}],
                                             "rows": [[10, 1], [2, 2], [9, 3], [1, 4]]}}}
        v = R.chart_view(R.Model(data), {"type": "line", "dataset": "m", "x": "m", "y": "v"}, "t", set())
        self.assertEqual(v["categories"], ["Jan", "Feb", "Sep", "Oct"])
        n = R.Model(data).value({"dataset": "m", "column": "v", "agg": "sum", "where": {"m": {"from": 2, "to": 10}}}, "t")
        self.assertEqual(n, 1 + 2 + 3)

    def test_v2_codes_decoded_and_rates_protected(self):
        inv = R.inventory(ROOT / "dashboard" / "comms-intelligence-dashboard-demo.html")
        ids = [d["id"] for d in inv["datasets"]]
        self.assertNotIn("data_mailp_cols", ids)
        self.assertFalse(any(d["n_rows"] == 3 and "drop_off" in d["id"] for d in inv["datasets"]))
        self.assertTrue(any(v["kind"] == "chart call" for v in inv["visuals"]))
        data = R.init_data(inv)
        self.assertEqual(data["meta"]["asOf"], inv["as_of_found"][0])
        mp = data["datasets"]["data_mailp"]
        keys = [c["key"] for c in mp["columns"]]
        self.assertIsInstance(mp["rows"][0][keys.index("div")], str)
        po = next(c for c in mp["columns"] if c["key"] == "po")
        self.assertFalse(po["additive"])
        with self.assertRaisesRegex(R.LayoutError, "cannot be added up"):
            R.Model(data).value({"dataset": "data_mailp", "column": "po", "agg": "sum"}, "t")

    def test_unused_datasets_in_change_report(self):
        data = data02()
        del data["datasets"]["channelmix"]
        layout = json.loads(LAYOUT02.read_text())
        layout["sections"] = layout["sections"][:2]
        md = R.changes_md(data, layout, "x.html", "02.html")
        self.assertIn("`channelmix`", md)


def small(rows, cols, grain="record", **colopts):
    """A one-dataset data.json: cols = [(key, type, metric)]."""
    columns = []
    for k, t, m in cols:
        c = {"key": k, "type": t}
        if m:
            c["metric"] = m
        c.update(colopts.get(k, {}))
        columns.append(c)
    return {"meta": {}, "datasets": {"d": {"grain": grain, "columns": columns, "rows": rows}}}


@unittest.skipIf(R is None, "set REDESIGN_SCRIPT or run via scripts/redesign_skill_tool.py test")
class ReviewRegressions(unittest.TestCase):
    """Defects found in the independent review; each must stay fixed."""

    @classmethod
    def setUpClass(cls):
        OUT.mkdir(parents=True, exist_ok=True)
        cls.inv = OUT / "rr-inventory.json"
        cls.inv.write_text(json.dumps(R.inventory(FIX / "02-newsletter-chartjs.html")))
        cls.data = OUT / "rr-data.json"
        cls.data.write_text(json.dumps(data02()))
        cls.page = R.build(cls.data, LAYOUT02, OUT / "rr-redesigned.html")[0]

    def tampered(self, old, new, name):
        html = self.page.read_text()
        self.assertIn(old, html)
        p = OUT / ("rr-tampered-%s.html" % name)
        p.write_text(html.replace(old, new, 1))
        return R.check(p, self.inv, render=False)[0]

    def test_filter_labels_tampered(self):
        errs = self.tampered('"display":["APAC","Americas"', '"display":["Americas","APAC"', "filters")
        self.assertTrue(errs, "swapped filter labels passed")

    def test_script_tampered(self):
        errs = self.tampered("function bar(ch){", "function bar(ch){ch.series[0].labels=ch.series[0].labels.map(function(){return '1M'});", "js")
        self.assertTrue(any("differs from what this script builds" in e for e in errs), errs)

    def test_duplicate_block(self):
        errs = self.tampered('<script type="application/json" id="rd-views">', '<script type="application/json" id="rd-views">{}</script>\n<script type="application/json" id="rd-views">', "dup")
        self.assertTrue(any("more than one" in e for e in errs), errs)

    def test_rows_swapped_with_same_sums(self):
        d = json.loads(self.data.read_text())
        rows = d["datasets"]["channelmix"]["rows"]
        rows[0][2], rows[1][2] = rows[1][2], rows[0][2]
        p = OUT / "rr-data-swap.json"
        p.write_text(json.dumps(d))
        page = R.build(p, LAYOUT02, OUT / "rr-swap-redesigned.html")[0]
        errs = R.check(page, self.inv, render=False)[0]
        self.assertTrue(any("channelmix" in e and "differ from the original" in e for e in errs), errs)

    def test_renamed_column_without_source(self):
        d = json.loads(self.data.read_text())
        d["datasets"]["channelmix"]["columns"][2]["key"] = "reached"
        layout = json.loads(LAYOUT02.read_text())
        layout["sections"][2]["chart"]["y"] = "reached"
        p, lp = OUT / "rr-data-ren.json", OUT / "rr-layout-ren.json"
        p.write_text(json.dumps(d))
        lp.write_text(json.dumps(layout))
        page = R.build(p, lp, OUT / "rr-ren-redesigned.html")[0]
        errs = R.check(page, self.inv, render=False)[0]
        self.assertTrue(any("reached" in e and "source" in e for e in errs), errs)
        d["datasets"]["channelmix"]["columns"][2]["source"] = "reach"
        p.write_text(json.dumps(d))
        page = R.build(p, lp, OUT / "rr-ren-redesigned.html")[0]
        self.assertEqual(R.check(page, self.inv, render=False)[0], [])

    def test_other_respects_chart_agg(self):
        m = R.Model(small([["A", 10], ["B", 1], ["B", 3], ["C", 7], ["C", 9]], [("k", "category", None), ("v", "number", "views")]))
        v = R.chart_view(m, {"type": "bar", "dataset": "d", "x": "k", "y": "v", "agg": "mean", "top": 1}, "t", set())
        self.assertNotIn("Other", " ".join(v["categories"]))

    def test_ratio_filtered_on_one_side(self):
        data = {"meta": {}, "datasets": {
            "items": {"grain": "record", "columns": [{"key": "div", "type": "category"}, {"key": "views", "type": "number", "metric": "views"}],
                      "rows": [["A", 10], ["B", 30]]},
            "hc": {"grain": "aggregate", "columns": [{"key": "month", "type": "category"}, {"key": "hc", "type": "number", "metric": "headcount"}],
                   "rows": [["x", 100]]}}}
        layout = {"kpis": [{"id": "r", "label": "Views per employee", "unit": "score",
                            "value": {"agg": "ratio", "num": {"dataset": "items", "column": "views", "agg": "sum"},
                                      "den": {"dataset": "hc", "column": "hc", "agg": "max"}},
                            "compare": {"type": "none", "reason": "test"}}],
                  "sections": [], "filters": [{"column": "div"}]}
        views, _ = R.compute_all(data, layout)
        self.assertEqual(views["|".join([""])]["kpis"][0]["value"], 0.4)
        self.assertIsNone(views["A"]["kpis"][0]["value"])
        self.assertIn("filtered differently", views["A"]["kpis"][0]["note"])

    def test_filtered_view_without_prior(self):
        data = small([["A", "2026-07", 5], ["A", "2026-08", 6], ["B", "2026-08", 7]],
                     [("div", "category", None), ("month", "month", None), ("views", "number", "views")])
        layout = {"kpis": [{"id": "v", "metric": "views", "value": {"dataset": "d", "column": "views", "agg": "sum", "where": {"month": "@last"}},
                            "compare": {"type": "prior", "value": {"dataset": "d", "column": "views", "agg": "sum", "where": {"month": "@prev"}}}}],
                  "sections": [], "filters": [{"column": "div"}]}
        views, _ = R.compute_all(data, layout)
        self.assertEqual(views["B"]["kpis"][0]["note"], "No comparison for this selection")
        self.assertIsNotNone(views["A"]["kpis"][0]["delta"])

    def test_where_that_selects_nothing(self):
        m = R.Model(small([["A", 1]], [("k", "category", None), ("v", "number", "views")]))
        with self.assertRaisesRegex(R.LayoutError, "selects no rows"):
            m.value({"dataset": "d", "column": "v", "agg": "sum", "where": {"k": "Z"}}, "t")

    def test_percent_stored_as_0_100(self):
        with self.assertRaisesRegex(R.LayoutError, "scale"):
            R.Model(small([["A", 45.2]], [("k", "category", None), ("open_rate", "number", "open_rate")]))
        m = R.Model(small([["A", 45.2]], [("k", "category", None), ("open_rate", "number", "open_rate")], open_rate={"scale": 0.01}))
        self.assertAlmostEqual(m.value({"dataset": "d", "column": "open_rate", "agg": "max"}, "t"), 0.452)

    def test_unknown_columns_not_summed(self):
        m = R.Model(small([["A", 4.5], ["B", 3.0]], [("k", "category", None), ("engagement", "number", None)]))
        with self.assertRaisesRegex(R.LayoutError, "no catalogue metric"):
            m.value({"dataset": "d", "column": "engagement", "agg": "sum"}, "t")
        self.assertEqual(R.guess_metric("engagement_rate"), "engagement_rate")
        self.assertEqual(R.guess_metric("uv", "data_vids"), "unique_viewers")

    def test_negative_values_in_bars(self):
        m = R.Model(small([["A", -5], ["B", 3]], [("k", "category", None), ("v", "number", None)], v={"additive": True}))
        with self.assertRaisesRegex(R.LayoutError, "negative"):
            R.chart_view(m, {"type": "column", "dataset": "d", "x": "k", "y": "v"}, "t", set())

    def test_mixed_type_sort_and_range(self):
        m = R.Model(small([["A", 5], ["B", "<5"], ["C", 9]], [("k", "category", None), ("v", "category", None)]))
        t = R.chart_view(m, {"type": "table", "dataset": "d", "columns": [{"key": "k"}, {"key": "v"}], "sort": {"key": "v", "dir": "desc"}}, "t", set())
        self.assertEqual(len(t["rows"]), 3)
        self.assertEqual(len(m.rows("d", {"v": {"from": 4}})), 2)

    def test_inventory_robustness(self):
        d = OUT / "rr-inv"
        (d / "data").mkdir(parents=True, exist_ok=True)
        (d / "data" / "a.csv").write_bytes("name,views\nZürich,5\nGenève,7\n".encode("cp1252"))
        (d / "data" / "b.json").write_text("{not json")
        (d / "page.html").write_text(
            "<html><body><table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr></tr><tr><td>x</td><td>1</td></tr>"
            "<tr><td>y</td><td>2</td></tr></tbody></table><script>var s='\\u{110000}';fetch('data/a.csv');fetch('data/b.json');"
            "</script></body></html>")
        inv = R.inventory(d / "page.html")
        self.assertTrue(any(x["n_rows"] == 2 and x["sums"].get("views") == 12 for x in inv["datasets"]), inv["datasets"])
        self.assertTrue(any("not valid JSON" in w for w in inv["warnings"]))
        self.assertTrue(any("Windows-1252" in w for w in inv["warnings"]))
