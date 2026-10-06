# Comms Intelligence Dashboard: architecture, hosting and maintenance

For architects and platform owners. How the dashboard works, what hosting it requires, who maintains what, and a proposal for a low-maintenance prototype environment. How to run it locally is in [README.md](README.md).

## In short

- The dashboard is a **static web page**: HTML, CSS, JavaScript and JSON files. There is no server-side code, no database and no runtime on the host. Any web server that serves files can host it.
- The HTML is an **empty shell**. It holds layout only; every figure comes from JSON files in `data/`, which are loaded and rendered by our code at page load.
- A **data refresh replaces the JSON files and nothing else**: no code change, no merge request, no deployment, no IT ticket.
- **No third-party code**: no framework, no chart library, no CDN, no external requests. There is nothing to patch in the application itself.
- **Ownership stays with our team.** Code, data refresh and user questions are ours. From IT we need a static host behind employee sign-in and a location for the data files.

## At a glance

| | |
|---|---|
| What is served | 2 HTML shells, about 40 JavaScript modules (about 2,400 lines), 3 CSS files (about 260 lines) |
| Server-side code | None |
| Front-end build step | None: the files in the repository are the files served |
| Third-party dependencies in the browser | None. Charts are SVG drawn by our own code |
| External network calls | None. The page requests only files from its own origin |
| Data | 7 JSON files (about 1 MB with the demo data), produced by a Python job: standard library, plus openpyxl to read Excel sources |
| What the page writes | Nothing. Filters and selections live in the browser tab and are gone on reload |
| Personal data | Engagement figures per mailing, article, page and video. No data about individual readers. Articles carry the author's name, as on the intranet itself |
| Code location | GitLab; every change goes through a merge request |

## The page is an empty shell

`index.html` contains the page layout: header, tabs and empty containers with an id, for example `<div class="kpis" id="smKpi"></div>`. It contains no figures, no data and no inline script. Its only script reference is `<script type="module" src="src/main.js">`.

What happens when the page opens:

```
index.html (layout, empty containers)
  └─ src/main.js                  starts the page
       ├─ src/boot.js             reads the data location from <meta name="data-base" content="data/">
       ├─ src/data/loader.js      fetches data/manifest.json, then every file the manifest lists
       ├─ src/data/decode.js      turns the compact files into records (no business logic)
       ├─ src/state/store.js      holds period, filters and active tab
       └─ on every change:
            src/viewmodels/*.js   compute the figures for the active tab, using
            src/services/*.js     period, filter, aggregation, metric and number-format rules
            src/components/*.js   write KPI tiles, SVG charts and tables into the empty containers
```

**Loading the data** (`src/data/loader.js`):

1. Fetches `manifest.json` and checks its `schema_version`. A file of a different major version is refused with a message.
2. Fetches every dataset the manifest lists, in parallel. Requests revalidate with the server (`cache: 'no-cache'`), so new data appears on the next reload and unchanged files cost a `304`.
3. Compares the row count of every file with the count the manifest announces. A mismatch usually means a refresh is being copied in at that moment: the loader waits 1.5 seconds and reads again. If the files still disagree, the page shows an error instead of figures.

**Rendering:** the header (data cut-off, comparison year, source) is filled from the manifest. Each tab has a view-model that turns records into display values, and components that put them on the page. Text from the data files is HTML-escaped (`esc()` in `src/services/format.js`) before it is inserted.

`index2.html` is the same mechanism for the earlier dashboard layout. Both pages share the data, state and service code.

### Why the dashboard always looks the same

- **Everything that decides appearance and calculation is code in Git**: markup, styles, components and every formula. The data files carry values only.
- **A refresh replaces `data/` only.** Same code with new values gives the same layout, the same calculations and the same metric definitions. Nobody edits HTML to refresh.
- **Wrong or partial data fails visibly.** Schema version, row counts and the structure of every file are checked before anything is drawn. The build job writes each file atomically and the manifest last, so the page never mixes old and new files without noticing.
- **Verified against the original.** The rebuild was compared with the single-file dashboard it replaces: 116 of 118 scripted scenarios produce identical visible text (the two differences are intended wording), full-page screenshots are identical apart from one 6×8 pixel patch in a header line, and all 14 CSV exports are identical. Details: [README.md → Verification](README.md#verification).

Compare the current way of working: the original dashboard is one HTML file with the data written into the page. Every refresh produces a new file that is copied and passed around, with code and figures travelling together.

## How data gets into `data/`

`scripts/build_clarity_data.py` produces the files once, before anything reaches the page:

1. Reads the source (today: the bridge workbook, an Excel export, plus the pack list).
2. Applies inclusion rules, converts dates, computes derived metrics (reach from monthly headcount) and adds the reviewed manual rows from `overrides.yaml`.
3. Checks the result and stops with a message on broken input.
4. Writes the 7 files and the manifest. The format is described in [README.md → Data contract](README.md#data-contract).

### Next step: read from the gold layer

Today the source is a data dump. Reading the gold layer of the data platform instead changes **one function**: `read_bridge()` returns the same structure as every other reader, so checks, files and page stay as they are.

The intended shape:

```
gold tables ──► scheduled job on the data platform ──► data/*.json ──► static page
                (queries, rules and checks above)      (storage the     (unchanged)
                                                        page reads)
```

- The job reads the gold tables on a schedule (daily or weekly) under a service identity governed by the platform's existing access control.
- **The browser never connects to the data platform.** No credentials in the browser, no query load from users, no new API to secure.
- Live queries from the page are deliberately not proposed: they would need an API, user-level authorisation and an always-on component. Batch files keep the page static.

## What hosting requires

Required:

- Serve static files over HTTPS: any web server, an object-storage static website, or a container with a standard web server image.
- Employee sign-in in front of it, optionally limited to a group.
- A location for `data/` that the refresh job can write to: a mounted volume or an object-storage prefix. The path is set in one `<meta>` tag per page.

Not required: application server, database, Node/Python/Java runtime on the host, secrets, outbound network access, write endpoints, server-side sessions.

Recommended response headers (starting point, to be confirmed on the test host):

```
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'
X-Content-Type-Options: nosniff
```

`script-src 'self'` works as is: the code uses no inline scripts, no inline event handlers and no `eval`. Styles need `'unsafe-inline'` because some elements carry inline style attributes. With this policy the browser blocks any request to another origin, even if the code were changed.

**Deployment boundary:** code (everything except `data/`) is released through a merge request and the pipeline. That happens rarely. `data/` is replaced by the refresh job on its own schedule, without a release.

The first load requests about 30 small files. That is fine over HTTP/2. If the platform needs fewer requests, the modules can be bundled into one file without changing the code.

## Maintenance effort

| Task | Owner | Effort |
|---|---|---|
| Static host, TLS, sign-in, base-image patching | IT / platform | One-time setup; afterwards the same automated patching as any static site |
| Code: fixes, changes, review | Our team | Our backlog in GitLab |
| Data refresh: running the job, checking its output | Our team | Scheduled; a named person checks the result |
| Metric definitions, user questions | Our team | — |
| Page shows a load error | Our team | IT only if the host itself is down |

Why the effort is small:

- **Nothing to patch in the application.** No packages, no framework, no chart library, so no security advisories and no forced upgrades from the application itself. It uses ES modules, `fetch` and SVG, which every supported browser has shipped for years.
- **Small and readable.** About 2,400 lines of JavaScript, 260 lines of CSS and a 1,000-line build script, in layers (data → services → view-models → components) with one module per tab. An engineer new to it can read it in an afternoon.
- **No state on the host.** Code is in Git; data can be rebuilt from the source by running the job again. Restore means redeploy and rerun, with no backup to manage.
- **Refreshes do not involve IT.** New data never needs a release.
- **Low exit cost.** Retiring the dashboard means deleting one folder or container. If the report later moves to Power BI or another tool, the gold-layer job and the data contract carry over; only the presentation is replaced.

## Security and data

| Concern | Answer |
|---|---|
| Attack surface | Static files, read-only `GET` requests. No input is stored, no server code runs |
| Script injection | Text from the data is escaped before insertion; the Content-Security-Policy above is a second line of defence |
| Supply chain | No third-party code in the page. The build job uses the Python standard library, openpyxl for Excel sources and PyYAML for manual rows |
| Data exposure | Behind employee sign-in. Engagement figures per item, no reader-level data. Classification to be confirmed with the data owner |
| Real data in Git | Never: `data/` and source workbooks are excluded by `.gitignore`. The repository holds code and a generator for synthetic demo data |
| Change control | Every code change through a merge request and the pipeline |

## Proposal: a low-maintenance environment for internal prototypes

This dashboard is one example of a recurring need: our team builds a prototype quickly, puts it in front of real users, and then decides. Either it moves to the governed production path, it is rebuilt in a strategic tool, or it is switched off. Today there is no place for that step, so prototypes travel as files.

The proposal is a **fast lane for prototypes next to the governed production path**, set up once by IT and run by us within fixed guardrails.

**Guardrails** (what keeps it cheap and safe for IT):

1. **Static only.** HTML, CSS, JavaScript and JSON. No server code, no databases, no secrets. The host serves files; the Content-Security-Policy blocks outbound calls.
2. **Internal only**, behind employee sign-in, optionally limited to a group per prototype.
3. **Internal, aggregated data only.** No client data, no reader-level personal data. Classification agreed per prototype with the data owner.
4. **A named owner in our team for every prototype.** IT is never responsible for application behaviour. Each page states "Prototype, no service level".
5. **An end date.** After a set period (for example six months) each prototype is promoted, extended by decision, or removed.
6. **One pipeline for all prototypes.** Merge request review plus automated checks (no external URLs, no secrets, size limit), deployed to its own path.

**What IT provides:**

- Once: one static hosting location with sign-in, one pipeline template, one pattern for data locations.
- Per prototype: nothing beyond the pipeline run.
- Ongoing: the platform patching that is already in place.

**Hosting options**, least IT effort first. Which ones are available depends on the platform:

| Option | IT effort | Notes |
|---|---|---|
| An app hosting feature the data platform already offers (for example Databricks Apps, if enabled) | Lowest: enable for our team | Platform sign-in and permissions apply; data sits next to the gold layer. A few lines of file-serving code are needed. Viewers need access to the platform, which suits a pilot group better than all staff |
| Object-storage static website behind the existing sign-in gateway | Low | No compute at all |
| Container with a standard web server on the existing container platform, `data/` on a mounted volume | Low to medium | The layout the code already assumes |

**What we are not asking for:** round-the-clock support, a new runtime, a database, or write access to production systems. The only data access is read access to gold tables by the refresh job.

**Suggested path:**

1. **Pilot:** host this dashboard for a pilot group with the current data files. Three months.
2. **Gold layer:** replace the data dump with the scheduled job above.
3. **Decision:** promote, rebuild or retire, based on use and feedback from the pilot.

## Open points to agree

- Hosting option and the data location the page reads from
- Data classification, with the data owner
- Pilot audience and sign-in group
- Named person accountable for the refresh
- End or review date for the pilot
