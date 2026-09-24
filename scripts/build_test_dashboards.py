"""Build synthetic internal-comms dashboards that embed their data in the common ways.

Test material for the html-dashboard-to-excel skill. Each dashboard stores its data
differently (chart-library configs, JSON script tags, JS literals, base64/gzip payloads,
HTML tables, SVG data attributes, runtime fetches, a minified single-file build). All
names, titles and figures are fictional.

Also writes test-dashboards/expected.json: for every dataset a correct extraction must
find, its row count and the sums of its numeric columns (name-independent answer key).

    python3 scripts/build_test_dashboards.py
"""
import base64
import csv
import gzip
import io
import json
import math
import random
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "test-dashboards"
rnd = random.Random(20260925)

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
DIVS = ["Group Functions", "Global Wealth Management", "Personal & Corporate Banking", "Investment Bank",
        "Asset Management", "Non-Core and Legacy"]
SITES = ["News hub", "AI at work", "Careers portal", "Learning hub", "HR services"]
PAGES = ["Home", "Latest news", "Town hall recap", "Hybrid working", "AI use cases", "Promotions 2026",
         "Learning catalogue", "Mentoring", "Benefits", "Wellbeing week", "Leadership forum", "Office moves",
         "Travel policy", "Volunteering", "Graduate programme", "Pay and reward", "Internal mobility",
         "Tech hub opening", "Operating model", "Quarterly results"]
EXPECTED = {}
LN = lambda mu, s: math.exp(rnd.gauss(mu, s))


def expect(fixture, name, rows):
    """rows: list of dicts. Records row count and the sum of every numeric column."""
    sums = {}
    for k in rows[0]:
        vals = [r[k] for r in rows if isinstance(r.get(k), (int, float)) and not isinstance(r.get(k), bool)]
        if vals and len(vals) >= len(rows) * 0.8:
            sums[k] = round(sum(vals), 6)
    EXPECTED.setdefault(fixture, []).append({"dataset": name, "rows": len(rows), "sums": sums})


def page(title, body, head=""):
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{title}</title>{head}
<style>body{{font-family:Arial,sans-serif;margin:32px;color:#000;background:#fff}}h1{{font-weight:400}}
table{{border-collapse:collapse;font-size:13px}}th,td{{padding:4px 10px;text-align:right}}th:first-child,td:first-child{{text-align:left}}
thead th{{border-top:1px solid #000;border-bottom:1px solid #000}}.kpis{{display:flex;gap:32px;margin:16px 0}}
.kpi-label{{color:#7A7870;font-size:12px}}.kpi-value{{font-size:28px}}.chart{{width:720px;height:320px;margin:12px 0 28px}}</style>
</head><body>
{body}
</body></html>
"""


# ---------------------------------------------------------------- 01 Plotly export (Python notebook style)
def plotly_dashboard():
    views = [int(LN(11.4, 0.15)) for _ in MONTHS]
    visits = [int(v * rnd.uniform(0.45, 0.6)) for v in views]
    weeks = [f"2026-W{w:02d}" for w in range(1, 37)]
    uv = [round(LN(9.2, 0.2), 1) for _ in weeks]
    div_views = [int(LN(11, 0.6)) for _ in DIVS]
    fig1 = [{"name": "Views", "type": "bar", "x": MONTHS, "y": views, "marker": {"color": "#404040"}},
            {"name": "Visits", "type": "bar", "x": MONTHS,
             "y": {"dtype": "i4", "bdata": base64.b64encode(struct.pack(f"<{len(visits)}i", *visits)).decode()},
             "marker": {"color": "#B98E2C"}}]
    fig2 = [{"name": "Unique visitors", "type": "scatter", "mode": "lines", "x": weeks,
             "y": {"dtype": "f8", "bdata": base64.b64encode(struct.pack(f"<{len(uv)}d", *uv)).decode()}}]
    fig3 = [{"type": "pie", "labels": DIVS, "values": div_views, "hole": 0.5}]
    expect("01-intranet-plotly.html", "views and visits by month",
           [{"month": m, "Views": a, "Visits": b} for m, a, b in zip(MONTHS, views, visits)])
    expect("01-intranet-plotly.html", "unique visitors by week", [{"week": w, "uv": u} for w, u in zip(weeks, uv)])
    expect("01-intranet-plotly.html", "views by division", [{"div": d, "v": v} for d, v in zip(DIVS, div_views)])

    rows = []
    for i, p in enumerate(PAGES):
        v = int(LN(10, 0.7))
        rows.append({"page": p, "site": rnd.choice(SITES), "views": v, "visits": int(v * rnd.uniform(0.5, 0.7)),
                     "unique_visitors": int(v * rnd.uniform(0.3, 0.45)),
                     "avg_time_on_page": f"{rnd.randint(0, 3):02d}:{rnd.randint(0, 59):02d}",
                     "bounce_rate": round(rnd.uniform(0.2, 0.6), 3)})
    expect("01-intranet-plotly.html", "top pages table", rows)
    th = "".join(f"<th>{k}</th>" for k in rows[0])
    tb = "".join("<tr><th>%d</th>%s</tr>" % (i, "".join(f"<td>{v}</td>" for v in r.values()))
                 for i, r in enumerate(rows))
    table = (f'<table border="1" class="dataframe">\n  <thead>\n    <tr style="text-align: right;">\n      <th></th>{th}'
             f'</tr>\n  </thead>\n  <tbody>{tb}</tbody>\n</table>')

    def div(uid, traces, title):
        layout = {"title": {"text": title}, "template": {"data": {"bar": [{"type": "bar"}]}}, "height": 360}
        return (f'<div id="{uid}" class="plotly-graph-div" style="height:360px; width:100%;"></div>'
                f'<script type="text/javascript">window.PLOTLYENV=window.PLOTLYENV || {{}};'
                f'if (document.getElementById("{uid}")) {{ Plotly.newPlot("{uid}", {json.dumps(traces)}, '
                f'{json.dumps(layout)}, {{"responsive": true}})}};</script>')

    body = ("<h1>Intranet traffic 2026</h1>\n"
            + div("5c1f0a2e-7b41-4b8a-9d8e-1f2a3b4c5d6e", fig1, "Views and visits by month") + "\n"
            + div("8a9b0c1d-2e3f-4a5b-8c7d-9e0f1a2b3c4d", fig2, "Unique visitors per week") + "\n"
            + div("0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f", fig3, "Views by division") + "\n"
            + "<h2>Top pages</h2>\n" + table)
    head = '<script src="https://cdn.plot.ly/plotly-2.35.2.min.js" charset="utf-8"></script>'
    (OUT / "01-intranet-plotly.html").write_text(page("Intranet traffic 2026", body, head), encoding="utf-8")


# ---------------------------------------------------------------- 02 hand-built Chart.js with a JSON script tag
def chartjs_dashboard():
    channels = ["Email", "Intranet banner", "Teams post", "Digital signage", "Manager cascade"]
    news = []
    for i in range(48):
        sent = int(rnd.choice([850, 2400, 12000, 45000, 105000]) * rnd.uniform(0.9, 1.1))
        delivered = int(sent * rnd.uniform(0.97, 0.995))
        uo = int(delivered * rnd.uniform(0.4, 0.8))
        news.append({"id": f"NL-{i + 1:03d}", "sent": f"2026-{(i // 6) + 1:02d}-{rnd.randint(1, 28):02d}",
                     "title": f"Weekly update #{i + 1}", "audience": {"segment": rnd.choice(["Global", "Switzerland",
                     "APAC", "EMEA", "Americas"]), "size": sent}, "delivered": delivered,
                     "opens": int(uo * rnd.uniform(1.2, 1.6)), "unique_opens": uo,
                     "clicks": int(uo * rnd.uniform(0.1, 0.3)), "unique_clicks": int(uo * rnd.uniform(0.05, 0.15)),
                     "unsubscribes": rnd.randint(0, 12), "tags": rnd.sample(["HR", "Culture", "AI", "Results", "Events"], 2)})
    flat = [{**{k: v for k, v in n.items() if k not in ("audience", "tags")}, "audience.size": n["audience"]["size"]}
            for n in news]
    expect("02-newsletter-chartjs.html", "newsletters (JSON script tag)", flat)
    mix = [{"channel": c, "sends": rnd.randint(20, 160), "reach": int(LN(13, 0.5))} for c in channels]
    expect("02-newsletter-chartjs.html", "channelMix (JS literal)", mix)
    targets = {"openRate": 0.45, "clickRate": 0.05, "unsubRate": 0.002}
    expect("02-newsletter-chartjs.html", "TARGETS (key/value)", [{"k": k, "v": v} for k, v in targets.items()])
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    wd_opens = [rnd.randint(9000, 30000) if d not in ("Sat", "Sun") else rnd.randint(500, 2000) for d in days]
    wd_clicks = [int(o * rnd.uniform(0.1, 0.2)) for o in wd_opens]
    expect("02-newsletter-chartjs.html", "opens and clicks by weekday (Chart.js literal)",
           [{"d": d, "o": o, "c": c} for d, o, c in zip(days, wd_opens, wd_clicks)])
    mix_js = ",\n  ".join(f"{{ channel: '{m['channel']}', sends: {m['sends']}, reach: {m['reach']} }}" for m in mix)
    body = f"""<h1>Newsletter performance</h1>
<p>Data refreshed nightly from the mailing platform.</p>
<h2>Open rate over time</h2><canvas id="cOpen" class="chart"></canvas>
<h2>Opens and clicks by weekday</h2><canvas id="cWeekday" class="chart"></canvas>
<h2>Channel mix</h2><canvas id="cMix" class="chart"></canvas>
<script type="application/json" id="dashboard-data">{json.dumps({"generated": "2026-09-01", "newsletters": news})}</script>
<script>
// Targets agreed with the comms leads (2026)
const TARGETS = {{ openRate: 0.45, clickRate: .05, unsubRate: 0.002, }};
const chartDefaults = {{ responsive: true, maintainAspectRatio: false, animation: false }};
/* channel mix is maintained by hand until the planning tool has an export */
const channelMix = [
  {mix_js},
];
const data = JSON.parse(document.getElementById('dashboard-data').textContent);
new Chart(document.getElementById('cOpen'), {{
  type: 'line',
  data: {{ labels: data.newsletters.map(n => n.sent),
          datasets: [{{ label: 'Unique open rate', data: data.newsletters.map(n => n.unique_opens / n.delivered) }}] }},
  options: chartDefaults
}});
new Chart(document.getElementById('cWeekday'), {{
  type: 'bar',
  data: {{
    labels: {json.dumps(days).replace('"', "'")},
    datasets: [
      {{ label: 'Opens', data: {json.dumps(wd_opens)}, backgroundColor: '#404040' }},
      {{ label: 'Clicks', data: {json.dumps(wd_clicks)}, backgroundColor: '#B98E2C' }},
    ]
  }},
  options: {{ ...chartDefaults, plugins: {{ legend: {{ position: 'bottom' }} }} }}
}});
new Chart(document.getElementById('cMix'), {{ type: 'bar',
  data: {{ labels: channelMix.map(c => c.channel), datasets: [{{ label: 'Reach', data: channelMix.map(c => c.reach) }}] }} }});
</script>"""
    head = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>'
    (OUT / "02-newsletter-chartjs.html").write_text(page("Newsletter performance", body, head), encoding="utf-8")


# ---------------------------------------------------------------- 03 ECharts + Highcharts, encoded payloads
def echarts_dashboard():
    owners = ["Group Functions", "Global Wealth Management", "Investment Bank", "Asset Management",
              "Personal & Corporate Banking"]
    cols = ["video", "owner", "published", "views", "unique_viewers", "completions", "avg_watch_s"]
    data = []
    for i in range(60):
        v = int(LN(6.5, 1))
        data.append([f"Episode {i + 1}: {rnd.choice(['Town hall', 'AI basics', 'Client story', 'Office tour'])}",
                     rnd.choice(owners), f"2026-{rnd.randint(1, 9):02d}-{rnd.randint(1, 28):02d}", v,
                     int(v * rnd.uniform(0.6, 0.85)), int(v * rnd.uniform(0.3, 0.6)), round(rnd.uniform(40, 300), 1)])
    expect("03-video-echarts.html", "videoTable (pandas split)", [dict(zip(cols, r)) for r in data])
    dist = [{"bucket_s": f"{b * 30}-{b * 30 + 29}", "views": int(LN(8, 0.5))} for b in range(20)]
    expect("03-video-echarts.html", "watch time distribution (base64 JSON)", dist)
    ret = [{"position_pct": p, "town_hall": round(1 - p / 100 * rnd.uniform(0.5, 0.7), 3),
            "short_clip": round(1 - p / 100 * rnd.uniform(0.2, 0.4), 3)} for p in range(0, 101, 10)]
    expect("03-video-echarts.html", "retention curve (gzip+base64 JSON)", ret)
    mv = [int(LN(10, 0.3)) for _ in MONTHS]
    mc = [int(v * rnd.uniform(0.4, 0.6)) for v in mv]
    expect("03-video-echarts.html", "views and completions by month (ECharts)",
           [{"m": m, "v": a, "c": b} for m, a, b in zip(MONTHS, mv, mc)])
    pie = [{"name": o, "value": int(LN(10, 0.6))} for o in owners]
    expect("03-video-echarts.html", "views by owner (ECharts pie)", pie)
    top = sorted(data, key=lambda r: -r[3])[:10]
    expect("03-video-echarts.html", "top videos (Highcharts)",
           [{"t": r[0], "v": r[3], "u": r[4]} for r in top])
    b64 = base64.b64encode(json.dumps(dist).encode()).decode()
    gz = base64.b64encode(gzip.compress(json.dumps(ret).encode(), mtime=0)).decode()
    split = {"columns": cols, "index": list(range(len(data))), "data": data}
    body = f"""<h1>Video analytics</h1>
<h2>Views and completions by month</h2><div id="eMonth" class="chart"></div>
<h2>Views by owner</h2><div id="eOwner" class="chart"></div>
<h2>Top videos</h2><div id="hTop" class="chart"></div>
<script>
var videoTable = {json.dumps(split)};
const watchDist = JSON.parse(atob("{b64}"));
const retention = JSON.parse(pako.inflate(Uint8Array.from(atob("{gz}"), c => c.charCodeAt(0)), {{ to: 'string' }}));
echarts.init(document.getElementById('eMonth')).setOption({{
  title: {{ text: 'Views and completions by month' }}, tooltip: {{ trigger: 'axis' }},
  xAxis: {{ type: 'category', data: {json.dumps(MONTHS)} }}, yAxis: {{ type: 'value' }},
  series: [{{ name: 'Views', type: 'bar', data: {json.dumps(mv)} }},
           {{ name: 'Completions', type: 'line', data: {json.dumps(mc)} }}]
}});
echarts.init(document.getElementById('eOwner')).setOption({{
  title: {{ text: 'Views by owner' }},
  series: [{{ type: 'pie', radius: ['40%', '70%'], data: {json.dumps(pie)} }}]
}});
Highcharts.chart('hTop', {{
  chart: {{ type: 'bar' }}, title: {{ text: 'Top 10 videos' }},
  xAxis: {{ categories: {json.dumps([r[0] for r in top])} }},
  series: [{{ name: 'Views', data: {json.dumps([r[3] for r in top])} }},
           {{ name: 'Unique viewers', data: {json.dumps([r[4] for r in top])} }}]
}});
</script>"""
    head = ('<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>'
            '<script src="https://cdn.jsdelivr.net/npm/highcharts@11.4.8/highcharts.js"></script>'
            '<script src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>')
    (OUT / "03-video-echarts.html").write_text(page("Video analytics", body, head), encoding="utf-8")


# ---------------------------------------------------------------- 04 server-rendered report: tables, KPI tiles, SVG
def de(n):
    return f"{n:,}".replace(",", "'")


def static_dashboard():
    camps = []
    for i, name in enumerate(["Promotions 2026", "Town hall Q1", "AI learning journey", "Wellbeing week",
                              "Hybrid working", "Leadership forum", "Quarterly results Q1", "Graduate intake",
                              "Volunteering season", "Office moves Zurich", "Pay and reward", "Town hall Q2"]):
        sent = int(LN(10.5, 0.8))
        opens = int(sent * rnd.uniform(0.5, 0.8))
        views = int(LN(9.5, 0.9))
        camps.append({"campaign": name, "sent": sent, "opens": opens, "open_rate": round(opens / sent, 3),
                      "views": views, "uv": int(views * rnd.uniform(0.4, 0.6)),
                      "video": None if i % 4 == 3 else int(LN(7, 0.8))})
    expect("04-campaign-static.html", "campaigns table (2-level header, de-CH numbers)",
           [{k: v for k, v in c.items()} for c in camps])
    tot = {k: sum(c[k] or 0 for c in camps) for k in ("sent", "opens", "views", "uv", "video")}
    rows = "".join(
        f"<tr><td>{c['campaign']}</td><td>{de(c['sent'])}</td><td>{de(c['opens'])}</td>"
        f"<td>{c['open_rate'] * 100:.1f} %</td><td>{de(c['views'])}</td><td>{de(c['uv'])}</td>"
        f"<td>{'–' if c['video'] is None else de(c['video'])}</td></tr>" for c in camps)
    t1 = f"""<table id="campaigns"><caption>Campaign reach by channel</caption>
<thead><tr><th rowspan="2">Campaign</th><th colspan="3">Email</th><th colspan="2">Intranet</th><th>Video</th></tr>
<tr><th>Sent</th><th>Opens</th><th>Open rate</th><th>Views</th><th>Unique visitors</th><th>Views</th></tr></thead>
<tbody>{rows}</tbody>
<tfoot><tr><td>Total</td><td>{de(tot['sent'])}</td><td>{de(tot['opens'])}</td><td>{tot['opens'] / tot['sent'] * 100:.1f} %</td>
<td>{de(tot['views'])}</td><td>{de(tot['uv'])}</td><td>{de(tot['video'])}</td></tr></tfoot></table>"""
    pages = []
    for s in SITES:
        for p in rnd.sample(PAGES, 5):
            v = int(LN(8.5, 1.1))
            pages.append({"site": s, "page": p, "views": v, "ctr": round(rnd.uniform(0.02, 0.4), 3),
                          "updated": f"{rnd.randint(1, 28):02d} {rnd.choice(MONTHS)} 2026"})
    expect("04-campaign-static.html", "pages table (rowspan, en numbers with k)", pages)

    def en(n):
        return f"{n / 1000:.1f}k" if n >= 10000 else f"{n:,}"
    body_rows = []
    for s in SITES:
        grp = [p for p in pages if p["site"] == s]
        for j, p in enumerate(grp):
            first = f'<td rowspan="{len(grp)}">{s}</td>' if j == 0 else ""
            body_rows.append(f"<tr>{first}<td>{p['page']}</td><td>{en(p['views'])}</td>"
                             f"<td>{p['ctr'] * 100:.1f}%</td><td>{p['updated']}</td></tr>")
    # k-rounded views change the sums: the answer key must use what the page shows
    for p in pages:
        if p["views"] >= 10000:
            p["views"] = round(p["views"] / 1000, 1) * 1000
    EXPECTED["04-campaign-static.html"][-1] = {"dataset": "pages table (rowspan, en numbers with k)",
                                               "rows": len(pages), "sums": {"views": round(sum(p["views"] for p in pages), 6),
                                                                            "ctr": round(sum(p["ctr"] for p in pages), 6)}}
    t2 = ("<h2>Pages by site</h2><table class=\"report\"><thead><tr><th>Site</th><th>Page</th><th>Views</th>"
          "<th>CTR</th><th>Last updated</th></tr></thead><tbody>" + "".join(body_rows) + "</tbody></table>")
    kpis = [("Page views", "1.24m", "+4.1 %"), ("Unique visitors", "312k", "+2.0 %"), ("Emails sent", "2'418'305", ""),
            ("Open rate", "61.8 %", "−0.4 pp"), ("Avg. time on page", "2:41 min", "")]
    EXPECTED["04-campaign-static.html"].append({"dataset": "KPI tiles", "rows": 5, "sums": {}})
    tiles = "".join(f'<div class="kpi"><div class="kpi-label">{a}</div><div class="kpi-value">{b}</div>'
                    f'<div class="kpi-delta">{c}</div></div>' for a, b, c in kpis)
    visits = [int(LN(9.8, 0.2)) for _ in MONTHS]
    expect("04-campaign-static.html", "visits by month (SVG data attributes)",
           [{"m": m, "v": v} for m, v in zip(MONTHS, visits)])
    mx = max(visits)
    bars = "".join(f'<rect x="{20 + i * 70}" y="{200 - v / mx * 180:.1f}" width="50" height="{v / mx * 180:.1f}" '
                   f'fill="#404040" data-month="{m}" data-visits="{v}"><title>{m}: {v:,} visits</title></rect>'
                   for i, (m, v) in enumerate(zip(MONTHS, visits)))
    svg1 = f'<h2>Visits by month</h2><svg width="680" height="220" role="img">{bars}</svg>'
    svg2 = ('<h2>Trend (drawn)</h2><svg width="680" height="120"><path d="M0,80 L80,60 L160,70 L240,40 L320,50 '
            'L400,20" stroke="#404040" fill="none"/></svg>')
    body = f"""<h1>Campaign report — August 2026</h1>
<div class="kpis">{tiles}</div>
{t1}
{t2}
{svg1}
{svg2}"""
    (OUT / "04-campaign-static.html").write_text(page("Campaign report — August 2026", body), encoding="utf-8")


# ---------------------------------------------------------------- 05 runtime fetch + Vega-Lite (Altair) spec
def fetch_dashboard():
    d = OUT / "05-events-fetch"
    (d / "data").mkdir(parents=True, exist_ok=True)
    sessions = [{"session": f"Town hall {i + 1}", "date": f"2026-{(i % 9) + 1:02d}-{rnd.randint(1, 28):02d}",
                 "format": rnd.choice(["Hybrid", "Online", "On site"]), "registrations": int(LN(7, 0.5)),
                 "attendees": 0, "replay_views": int(LN(7.5, 0.8))} for i in range(30)]
    for s in sessions:
        s["attendees"] = int(s["registrations"] * rnd.uniform(0.5, 0.9))
    (d / "data" / "sessions.json").write_text(json.dumps(sessions, indent=1), encoding="utf-8")
    expect("05-events-fetch/index.html", "sessions.json (fetch)", sessions)
    regs = [{"registration_id": f"R{i:05d}", "session": rnd.choice(sessions)["session"],
             "division": rnd.choice(DIVS), "region": rnd.choice(["Switzerland", "APAC", "EMEA", "Americas"]),
             "attended": rnd.choice([0, 1])} for i in range(200)]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=list(regs[0]))
    w.writeheader()
    w.writerows(regs)
    (d / "data" / "registrations.csv").write_text(buf.getvalue(), encoding="utf-8")
    expect("05-events-fetch/index.html", "registrations.csv (d3.csv)", regs)
    fb = [{"question": q, "score": round(rnd.uniform(3.2, 4.8), 2), "responses": rnd.randint(80, 900)}
          for q in ["Relevance", "Clarity", "Length", "Q&A", "Audio", "Would recommend"]
          for _ in range(4)]
    expect("05-events-fetch/index.html", "feedback (Vega-Lite datasets)", fb)
    spec = {"$schema": "https://vega.github.io/schema/vega-lite/v5.17.0.json", "config": {"view": {"stroke": None}},
            "data": {"name": "data-2f6c1b8e0d4a"}, "mark": {"type": "bar"},
            "encoding": {"x": {"field": "question", "type": "nominal"},
                         "y": {"aggregate": "mean", "field": "score", "type": "quantitative"}},
            "datasets": {"data-2f6c1b8e0d4a": fb}}
    body = f"""<h1>Events and town halls</h1>
<h2>Sessions</h2><table id="tSessions"></table>
<h2>Registrations by division</h2><div id="regs"></div>
<h2>Feedback</h2><div id="vis"></div>
<script>
fetch('data/sessions.json').then(r => r.json()).then(rows => {{
  document.getElementById('tSessions').innerHTML = rows.map(r => `<tr><td>${{r.session}}</td><td>${{r.attendees}}</td></tr>`).join('');
}});
d3.csv('data/registrations.csv').then(rows => {{ /* rendered with d3 */ }});
// survey export is too large for JSON; loaded via DuckDB-WASM when available
const FEEDBACK_RAW = 'data/feedback_raw.parquet';
vegaEmbed('#vis', {json.dumps(spec)}, {{"mode": "vega-lite"}}).catch(console.error);
</script>"""
    head = ('<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>'
            '<script src="https://cdn.jsdelivr.net/npm/vega@5"></script>'
            '<script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>'
            '<script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>')
    (d / "index.html").write_text(page("Events and town halls", body, head), encoding="utf-8")


# ---------------------------------------------------------------- 06 single-file React/Vite build
def bundle_dashboard():
    arts = []
    for i in range(40):
        v = int(LN(8.5, 0.8))
        arts.append({"article": f"{rnd.choice(['How AI agents help', 'Meet the team', 'Five questions for', 'Inside the'])} "
                                f"{rnd.choice(['operations', 'the CEO', 'the new hub', 'learning'])} ({i + 1})",
                     "channel": rnd.choice(["Group news", "Group HR news", "Tech & Ops news", "Regional news APAC"]),
                     "published": f"2026-{rnd.randint(1, 9):02d}-{rnd.randint(1, 28):02d}", "views": v,
                     "unique_visitors": int(v * rnd.uniform(0.5, 0.7)), "likes": rnd.randint(0, 300),
                     "comments": rnd.randint(0, 40), "reading_time_s": rnd.randint(40, 400)})
    arts[3]["article"] = "Don't miss: the new hub's opening"
    expect("06-articles-vite.html", "articles (JSON.parse in bundle)", arts)
    hc = [{"d": f"2026-{m:02d}", "hc": 104800 + m * 180} for m in range(1, 10)]
    expect("06-articles-vite.html", "headcount (minified literal)", hc)
    payload = json.dumps(arts, separators=(",", ":")).replace("\\", "\\\\").replace("'", "\\'")
    hc_js = "[" + ",".join(f'{{d:"{h["d"]}",hc:{h["hc"]}}}' for h in hc) + "]"
    bundle = ("(function(){const t=document.createElement(\"link\").relList;if(t&&t.supports&&t.supports(\"modulepreload\"))return;"
              "for(const l of document.querySelectorAll('link[rel=\"modulepreload\"]'))r(l);function r(l){if(l.ep)return;l.ep=!0}})();"
              "var Xe=Object.defineProperty;var Ke=(e,t,n)=>t in e?Xe(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;"
              f"const Ya=JSON.parse('{payload}'),Qm={hc_js},Zr=[\"views\",\"unique_visitors\",\"likes\"],"
              "Gf={GF:\"Group Functions\",IB:\"Investment Bank\",AM:\"Asset Management\"};"
              "function Jr(e){const t=Qm.find(n=>n.d===e.published.slice(0,7));return t?e.unique_visitors/t.hc:0}"
              "function Wo(){const e=document.getElementById(\"root\");e.innerHTML=Ya.slice().sort((t,n)=>n.views-t.views)"
              ".map(t=>`<tr><td>${t.article}</td><td>${t.views}</td><td>${(Jr(t)*100).toFixed(2)}%</td></tr>`).join(\"\")}"
              "Wo();")
    body = f"""<div id="app"><h1>Article performance</h1><table><tbody id="root"></tbody></table></div>
<script type="module" crossorigin>{bundle}</script>"""
    (OUT / "06-articles-vite.html").write_text(page("Article performance", body), encoding="utf-8")


def comms_demo_expectations():
    """The v2 demo build in dashboard/: columnar, dictionary-encoded mailings plus record lists."""
    import re
    html = (ROOT / "dashboard" / "comms-intelligence-dashboard-demo.html").read_text(encoding="utf-8")
    d = json.loads(re.search(r"const DATA = (\{.*?\});?</script>", html, re.S).group(1))
    P = d["mailP"]
    name = "../dashboard/comms-intelligence-dashboard-demo.html"
    EXPECTED[name] = [{"dataset": "mailP (columnar + dims)", "rows": len(P["es"]),
                       "sums": {"es": sum(P["es"]), "op": sum(P["op"]), "uc": sum(P["uc"])}}]
    for k in ("arts", "vids", "pages", "links", "pgLevel", "pgDiv", "pgReg"):
        expect(name, k, [{kk: vv for kk, vv in r.items() if kk in ("v", "uv", "c", "c1", "c100")} or {"n": 1}
                         for r in d[k]])
    expect(name, "hcGeduld (key/value)", [{"k": k, "v": v} for k, v in d["hcGeduld"].items()])


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    plotly_dashboard()
    chartjs_dashboard()
    echarts_dashboard()
    static_dashboard()
    fetch_dashboard()
    bundle_dashboard()
    comms_demo_expectations()
    (OUT / "expected.json").write_text(json.dumps(EXPECTED, indent=1), encoding="utf-8")
    for f, ds in EXPECTED.items():
        print(f"{f}: {len(ds)} datasets")
