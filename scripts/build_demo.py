"""Build the Comms Intelligence demo dashboard.

Generates synthetic data in the same DATA schema the production dashboard
expects and injects it into dashboard/template.html (v2) and
dashboard/template-v3.html (redesign mockup). All names, titles, URLs and
figures are fictional. A synthetic 2025 block (DATA.prior) feeds the v3
year-on-year comparison; v2 ignores it.

    python3 scripts/build_demo.py
"""
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "dashboard" / "template.html"
OUT = ROOT / "dashboard" / "comms-intelligence-dashboard-demo.html"
TEMPLATE_V3 = ROOT / "dashboard" / "template-v3.html"
OUT_V3 = ROOT / "dashboard" / "comms-intelligence-dashboard-v3-demo.html"

rnd = random.Random(20260924)


def pick(weighted):
    items, weights = zip(*weighted)
    return rnd.choices(items, weights=weights, k=1)[0]


def lognorm(mu, sigma):
    return math.exp(rnd.gauss(mu, sigma))


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


# ---------------------------------------------------------------- mailings
DIV = [("Non Corp Comms", 60), ("GIC", 5), ("Corp Comms – unmapped", 9), ("Region APAC", 3),
       ("IB", 4), ("GWM", 2), ("Region Americas", 1.2), ("Region EMEA", 2), ("AI, Technology & Operations", 1),
       ("AM", 2.5), ("Region CH", 0.8), ("GSI", 0.5)]
CT = {"Newsletter": (0.11, 18), "Invitations": (0.21, 14), "Internal mailing": (0.13, 34),
      "Reminder": (0.14, 12), "Survey": (0.20, 8), "Organizational Announcement": (0.10, 14)}
CL = [("A 11-499", 38, (11, 499), 0.84), ("B 500-1999", 26, (500, 1999), 0.76),
      ("C 2000-9999", 22, (2000, 9999), 0.74), ("D 10000-59999", 11, (10000, 59999), 0.66),
      ("E >60000", 3, (60000, 131000), 0.70)]
TM = [("Standard", 50), ("Newsletter template", 20), ("Event template", 18), ("Plain text", 12)]
MAP = [("Not mapped", 55), ("Group", 20), ("Regional", 15), ("Divisional", 10)]
TEAM = [("Group Internal Comms", 30), ("Regional Comms", 25), ("Divisional Comms", 25), ("Other senders", 20)]
PK = ["News Digest 2026", "Promotions 2026", "Global Learning Weeks", "AI Learning Journey",
      "Employee Wellbeing Survey", "Hybrid working & office time", "Quarterly results 2026",
      "Town hall series", "Career development", "Feedback conversations", "Leadership Forum 2026"]
TCL = ["Uncategorised / general", "Financial results", "Leadership messages", "Learning", "Culture & inclusion"]
THEMES = ["Careers", "Business Environment", "Culture", "Technology", "Who We Are", "Employee Relations"]
TOPICS = ["Human Resources", "Artificial Intelligence", "Wellbeing", "Training And Career Development",
          "Integration", "CEO", "Performance Management", "Sustainability"]
TITLES = {
    "Newsletter": ["News digest edition {n}", "Weekly tech update #{n}", "Regional newsletter {n}"],
    "Invitations": ["Invitation: quarterly town hall {n}", "Invitation: learning session {n}", "Join the leadership call {n}"],
    "Internal mailing": ["Policy update {n}", "Office services notice {n}", "Operating model update {n}"],
    "Reminder": ["Reminder: complete your training {n}", "Reminder: survey closes soon {n}"],
    "Survey": ["Pulse survey wave {n}", "Your feedback on hybrid working {n}"],
    "Organizational Announcement": ["Organisational announcement {n}", "Leadership appointment {n}"],
}

month_w = [(1, 13), (2, 14), (3, 15), (4, 13), (5, 11), (6, 13), (7, 13), (8, 8)]


def gen_mail(n, year, open_shift=0.0, cto_shift={}):
    dims = {k: [] for k in ["cc", "div", "map", "team", "ct", "tm", "cl", "pk", "tcl", "tid"]}
    for k in ["pk", "tcl", "tid"]:
        dims[k].append("")

    def dim_idx(k, v):
        if v not in dims[k]:
            dims[k].append(v)
        return dims[k].index(v)

    mail = {"cols": {k: [] for k in dims}, "q": [], "m": [], "t": [], "es": [], "op": [], "uc": [], "ms": [],
            "po": [], "pc": [], "pu": [], "th": [], "tp": []}
    tid_n = 0
    for i in range(n):
        m = pick(month_w)
        div = pick(DIV)
        ct = pick([(k, v[1]) for k, v in CT.items()])
        band = pick([(b, b[1]) for b in CL])
        pk = pick([("", 60)] + [(p, 4) for p in PK])
        tcl = pick([("", 35)] + [(c, 13) for c in TCL])
        tid_n += 1
        tid = "" if rnd.random() < 0.3 else f"TRK-{year}-{tid_n:04d}"
        es = rnd.randint(*band[2])
        open_ = clamp(rnd.gauss(band[3] + open_shift, 0.08), 0.2, 1.0)
        cto = clamp(rnd.gauss(CT[ct][0] + cto_shift.get(ct, 0), 0.05), 0.0, 0.8)
        if pk == "Promotions 2026":
            cto = clamp(rnd.gauss(0.55, 0.05), 0, 0.9)
        po = None if rnd.random() < 0.004 else round(open_, 4)
        pc = None if rnd.random() < 0.037 else round(cto, 4)
        pu = None if pc is None or po is None else round(open_ * cto, 4)
        op = round(es * open_ * rnd.uniform(0.85, 1.0))
        uc = round(op * cto)
        cols = mail["cols"]
        cols["cc"].append(dim_idx("cc", "Not Corp Comms" if div == "Non Corp Comms" else "Corp Comms"))
        cols["div"].append(dim_idx("div", div))
        cols["map"].append(dim_idx("map", pick(MAP)))
        cols["team"].append(dim_idx("team", pick(TEAM)))
        cols["ct"].append(dim_idx("ct", ct))
        cols["tm"].append(dim_idx("tm", pick(TM)))
        cols["cl"].append(dim_idx("cl", band[0]))
        cols["pk"].append(dim_idx("pk", pk))
        cols["tcl"].append(dim_idx("tcl", tcl))
        cols["tid"].append(dim_idx("tid", tid))
        mail["q"].append((m - 1) // 3 + 1)
        mail["m"].append(m)
        mail["t"].append(rnd.choice(TITLES[ct]).format(n=i + 1))
        mail["es"].append(es)
        mail["op"].append(op)
        mail["uc"].append(uc)
        mail["ms"].append(2 if rnd.random() < 0.02 else 1)
        mail["po"].append(po)
        mail["pc"].append(pc)
        mail["pu"].append(pu)
        mail["th"].append(rnd.sample(THEMES, rnd.choice([0, 1, 1, 2])))
        mail["tp"].append(rnd.sample(TOPICS, rnd.choice([0, 1, 1, 2])))
    mail["dims"] = dims
    return mail


N = 2400
mail = gen_mail(N, 2026)

# ---------------------------------------------------------------- articles
AUTHORS = ["Alex Morgan", "Priya Natarajan", "Jonas Keller", "Mei Lin Tan", "Samuel Okafor", "Clara Weiss",
           "Daniel Rossi", "Hannah Berger", "Lukas Meier", "Sofia Alvarez", "Tom Fischer", "Nora Lindqvist"]
CHANNELS = ["Group news", "Group HR news", "Tech & Ops news", "Regional news Switzerland", "Regional news APAC",
            "Personal & Corporate Banking news", "Global Wealth Management news", "Group Compliance news"]
ART_TITLES = ["Promotions 2026", "How AI agents help you rethink your work", "New operating model explained",
              "Meet the new graduate cohort", "Quarterly results in five charts", "Building your first agent",
              "Wellbeing week: what's on", "Our approach to hybrid working", "Inside the new tech hub",
              "Five questions for the CEO", "Career paths in operations", "Learning journey launches",
              "Volunteering season opens", "Updated travel policy", "Celebrating ten years of the innovation lab"]
HC = {f"2026-{m:02d}": 104800 + m * 180 for m in range(1, 10)}


def gen_arts(n, year, views_mu=7.6):
    arts = []
    for i in range(n):
        m = pick(month_w)
        d = rnd.randint(1, 28)
        base = ART_TITLES[i % len(ART_TITLES)]
        t = base if i < len(ART_TITLES) else f"{base} ({i // len(ART_TITLES) + 1})"
        v = round(lognorm(views_mu, 0.8))
        if i == 0:
            v = 61200 if year == 2026 else 48900
        uv = round(v * rnd.uniform(0.5, 0.7))
        arts.append({
            "t": t, "ds": f"{d:02d} {['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][m]} {year}",
            "m": m, "q": (m - 1) // 3 + 1, "au": rnd.choice(AUTHORS),
            "ov": pick([("News", 50), ("Feature", 25), ("Interview", 15), ("Announcement", 10)]),
            "th": rnd.choice(THEMES), "tp": rnd.sample(TOPICS, rnd.choice([1, 1, 2, 3])),
            "ts": "Yes" if rnd.random() < 0.15 else "", "rg": pick([("Global", 60), ("Switzerland", 15), ("APAC", 9), ("EMEA", 9), ("Americas", 7)]),
            "ch": rnd.choice(CHANNELS), "pk": pick([("", 70)] + [(p, 3) for p in PK[:8]]),
            "tcl": pick([("", 60)] + [(c, 8) for c in TCL]), "tid": "",
            "v": v, "uv": uv, "li": round(uv * rnd.uniform(0.002, 0.01)), "co": round(uv * rnd.uniform(0, 0.001)),
        })
    return arts


arts = gen_arts(180, 2026)

# ---------------------------------------------------------------- videos
OWNERS = [("Group Functions", 55), ("Personal & Corporate Banking", 12), ("Investment Bank", 10),
          ("Global Wealth Management", 13), ("Asset Management", 10)]
VID_TITLES = ["Episode {n} - Learning agent basics.mp4", "Town hall replay {n}.mp4", "Office opening {n}.mp4",
              "Client story {n}.mp4", "Quarterly update {n}.mp4", "Agent builder tutorial {n}.mp4"]


def gen_vids(n, keep_end=0.86, sep=True):
    vids = []
    for i in range(n):
        m = pick(month_w + ([(9, 2)] if sep else []))
        v = round(lognorm(5.2, 1.1))
        if m == 7 and rnd.random() < 0.15:
            v *= 6
        c1 = round(v * rnd.uniform(0.75, 0.9))
        keep = [1.0, clamp(rnd.gauss(0.81, 0.08), 0.3, 1), 0, 0, 0]
        keep[2] = keep[1] * clamp(rnd.gauss(0.91, 0.05), 0.4, 1)
        keep[3] = keep[2] * clamp(rnd.gauss(0.93, 0.04), 0.4, 1)
        keep[4] = keep[3] * clamp(rnd.gauss(keep_end, 0.08), 0.2, 1)
        owner = pick(OWNERS)
        vids.append({
            "t": rnd.choice(VID_TITLES).format(n=i + 1), "div": owner, "m": m, "q": (m - 1) // 3 + 1,
            "lang": pick([("EN", 80), ("DE", 12), ("FR", 5), ("IT", 3)]),
            "v": v, "uv": round(v * rnd.uniform(0.7, 0.9)), "c1": c1,
            "c25": round(c1 * keep[1]), "c50": round(c1 * keep[2]), "c75": round(c1 * keep[3]), "c100": round(c1 * keep[4]),
            "eng": round(clamp(rnd.gauss(14.5 if owner != "Investment Bank" else 4, 9), 0.5, 110), 1),
        })
    return vids


vids = gen_vids(320)

# ---------------------------------------------------------------- click tracking
SITES = {"AI at work": ["Artificial Intelligence", "Learn", "AI Powerhour", "Use cases", "Use", "Tutorial videos",
                        "Big rocks", "Guided exercises", "Ideas", "Build", "Model governance", "Senior leadership journey"],
         "Careers portal": ["Careers home", "Internal mobility", "Graduate programme", "Mentoring"],
         "Learning hub": ["Learning home", "Catalogue", "Certifications", "Leadership academy"]}
pages, links = [], []
for site, names in SITES.items():
    slug_site = site.lower().replace(" ", "-")
    for j, p in enumerate(names):
        slug = p.lower().replace(" ", "-")
        url = f"/sites/{slug_site}/SitePages/{slug}.aspx"
        v = round(lognorm(9.6 - j * 0.18, 0.5))
        uv = round(v * rnd.uniform(0.3, 0.55))
        c = round(v * rnd.uniform(0.3, 0.9))
        ucl = round(uv * rnd.uniform(0.25, 0.75))
        pages.append({"site": site, "p": p, "url": url, "v": v, "uv": uv, "c": c, "ucl": ucl,
                      "d": round(c * rnd.uniform(0, 0.3))})
        for k in range(rnd.randint(4, 14)):
            lc = round(c * rnd.uniform(0.02, 0.2))
            links.append({"t": f"{p} resource {k + 1}", "p": p, "url": url,
                          "dest": f"https://learning.example.com/{slug}/item-{k + 1}",
                          "c": lc, "ucl": round(lc * rnd.uniform(0.4, 0.8)), "d": 0})

# ---------------------------------------------------------------- page level (visitor splits)
VDIV = [("Group Functions", 55), ("Global Wealth Management", 17), ("Personal & Corporate Banking", 8),
        ("Investment Bank", 8), ("Asset Management", 3), ("Non-Core and Legacy", 0.5), ("Unknown", 0.05)]
VREG = [("Switzerland", 36), ("APAC", 26), ("EMEA", 22), ("Americas", 15), ("Unknown", 0.7)]
PG_CT = [("Technology Update", 50), ("Overview Page", 15), ("Event", 10), ("Blog Post", 10), ("Newsletter", 5), ("Case Study", 10)]
pg_level, pg_div, pg_reg = [], [], []
k = 0
for site, names in SITES.items():
    for p in names + [f"{names[0]} archive"]:
        k += 1
        url = f"https://intranet.example.com/sites/{site.lower().replace(' ', '-')}/SitePages/{p.lower().replace(' ', '-')}.aspx"
        uv = round(lognorm(8.6 - k * 0.08, 0.9))
        v = round(uv * rnd.uniform(1.3, 3.6))
        attrs = {"site": site, "url": url, "div": pick([("Group Functions", 70), ("Global Wealth Management", 15), ("Investment Bank", 15)]),
                 "ct": pick(PG_CT), "ov": "", "th": pick([("Technology", 55), ("Education", 25), ("Business Environment", 15), ("Unknown", 5)]),
                 "tp": rnd.sample(TOPICS, rnd.choice([0, 1, 2])), "org": pick([("Group", 70), ("Division", 30)]),
                 "rg": pick([("Global", 50), ("Europe, Middle East and Africa", 30), ("Switzerland", 20)])}
        uvy = round(uv * rnd.uniform(0.3, 1.0))
        pg_level.append({**attrs, "uv": uv, "vis": round(uv * rnd.uniform(1.2, 2.8)), "v": v,
                         "uvy": uvy, "vy": round(v * uvy / uv), "li": rnd.randint(0, 40), "co": rnd.randint(0, 6)})
        for sp, w in VDIV:
            share = w / 100 * rnd.uniform(0.7, 1.3)
            if share * uv >= 1:
                pg_div.append({**attrs, "sp": sp, "uv": round(share * uv)})
        for sp, w in VREG:
            share = w / 100 * rnd.uniform(0.7, 1.3)
            if share * uv >= 1:
                pg_reg.append({**attrs, "sp": sp, "uv": round(share * uv)})

# ---------------------------------------------------------------- prior year (same period, for comparison)
# Separate random stream so the 2026 figures above stay identical to earlier builds.
rnd = random.Random(20250924)
prior = {
    "year": 2025,
    "mailP": gen_mail(2250, 2025, open_shift=-0.012,
                      cto_shift={"Survey": -0.03, "Invitations": 0.02, "Newsletter": 0.01}),
    "arts": gen_arts(172, 2025, views_mu=7.5),
    "vids": gen_vids(290, keep_end=0.89, sep=False),
}

DATA = {
    "src": {"mail": N, "arts": len(arts), "vids": len(vids), "pages": len(pages), "links": len(links), "pgLevel": len(pg_level)},
    "mailP": mail, "arts": arts, "vids": vids, "pages": pages, "links": links,
    "pgLevel": pg_level, "pgDiv": pg_div, "pgReg": pg_reg,
    "hcGeduld": HC, "hcDash": HC,
    "year": 2026, "asOf": "2026-08-21", "prior": prior, "source": "synthetic demo data",
}

payload = json.dumps(DATA, separators=(",", ":"), ensure_ascii=False)
marker = "/*__DATA__*/null"

# Lets compare.html switch tabs inside the embedded v2 build (postMessage works across file:// frames).
COMPARE_HOOK = ("<script>addEventListener('message',e=>{const t=e.data&&e.data.tab;"
                "const b=t&&document.querySelector('.tab[data-p=\"'+t+'\"]');if(b)b.click();});</script>\n</body>")

for template, out, hook in [(TEMPLATE, OUT, True), (TEMPLATE_V3, OUT_V3, False)]:
    html = template.read_text(encoding="utf-8")
    assert marker in html, f"DATA marker missing in {template.name}"
    html = html.replace(marker, payload)
    if hook:
        html = html.replace("</body>", COMPARE_HOOK, 1)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}  ({out.stat().st_size // 1024} KB)")
