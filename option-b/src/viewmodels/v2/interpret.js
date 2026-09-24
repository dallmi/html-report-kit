/* index2.html reading aids: method note and the "what this pattern means" boxes. Numbers in, text out. */
import { fmt2 as fmt, pct2 as pct, full, esc, trunc } from '../../services/format.js';

const verdictTag = (v, cls) => `<span class="verdict${cls ? ' ' + cls : ''}">${esc(v)}</span>`;

export function methodBox(a) {
  return `<div class="methodbox"><h4>How these rates are calculated &mdash; and the alternative we could switch to</h4>
  <p>Every rate on this tab uses the <b>simple-average method</b>, so you can reconcile it by hand against the file.</p>
  <div class="mrow"><div><div class="t1"><span class="tag top">In use</span> Simple average</div><div class="v1">${pct(a.open)} open · ${pct(a.cto)} CTO</div>
    <div class="d1">Average the <code>Avg % unique opens</code> and <code>Avg % click-to-open rate</code> columns across the mailings in scope. Every mailing counts once, whatever its size. Open rate averages ${full(a.nOpen)} of ${full(a.n)} mailings; CTO averages ${full(a.nCto)} &mdash; the rest are blank in the file and are skipped.</div></div>
  <div><div class="t1">Available &mdash; volume-weighted</div><div class="v1">${pct(a.wOpen)} open · ${pct(a.wCto)} CTO</div>
    <div class="d1">Add up all opens and divide by all emails sent: <code>Σ #open ÷ Σ Emails sent</code>. A mailing to 130,000 people then counts 10,000× more than one to 13.</div></div></div>
  <p><b>Why weighted is usually preferred.</b> It answers “across everything we sent, what share was opened?” &mdash; the true experience of the audience. The simple average answers “how did the typical mailing perform?”, which a handful of tiny mailings with near-100% open rates can inflate. The workbook's own Dashboard sheet uses the weighted method, so switching would align the two exactly.</p></div>`;
}

export function interpMail(a) {
  if (!a.n || a.open == null) return `<div class="interp"><div class="ih"><h4>What this pattern means</h4>${verdictTag('No signal')}</div><div class="lead">Not enough mailings in scope to read a pattern.</div></div>`;
  const open = a.open, cto = a.cto == null ? 0 : a.cto;
  const inTenOpen = Math.round(open * 10), oneInCto = cto ? Math.round(1 / cto) : 0;
  let verdict, cls = '', lead, points, report;
  const hiOpen = open >= 0.75, loOpen = open < 0.60, hiCto = cto >= 0.15, loCto = cto < 0.06;
  if (hiOpen && hiCto) {
    verdict = 'Strong on both'; cls = 'good';
    lead = `<b>${pct(open)}</b> of recipients opened, and <b>${pct(cto)}</b> of those who opened went on to click.`;
    points = ['<b>Lead with the pattern:</b> the subject line earns the open and the content earns the click &mdash; both halves of the funnel are working.',
      `<b>Relevance:</b> roughly ${inTenOpen} in 10 recipients opened, which says the audience is well targeted rather than over-mailed.`,
      `<b>Action orientation:</b> about 1 in ${oneInCto} openers clicked, so the call to action is visible and worth following.`,
      '<b>What to do:</b> treat this as the template &mdash; reuse the structure, send timing and audience definition on comparable campaigns.'];
    report = `“${inTenOpen} in 10 people opened, and 1 in ${oneInCto} of those clicked through.”`;
  } else if (hiOpen && loCto) {
    verdict = 'Read but not acted on'; cls = 'warn';
    lead = `Opens are healthy at <b>${pct(open)}</b>, but only <b>${pct(cto)}</b> of openers clicked.`;
    points = ['<b>Lead with the pattern:</b> the subject line is doing its job; the content is not converting attention into action.',
      '<b>Likely cause:</b> the message is being consumed in the preview &mdash; people read it and are done. Common and perfectly acceptable for announcements and FYI updates.',
      `<b>If a click was the goal:</b> only about 1 in ${oneInCto || '–'} openers acted. Check that the call to action sits above the fold and that there is a single clear next step rather than several competing links.`,
      '<b>Question to ask:</b> was this mailing meant to inform or to drive action? Judge it against that intent, not against the click rate alone.'];
    report = `“${inTenOpen} in 10 opened, but the content was largely self-contained &mdash; few needed to click further.”`;
  } else if (loOpen && hiCto) {
    verdict = 'Niche but committed';
    lead = `Only <b>${pct(open)}</b> opened, yet <b>${pct(cto)}</b> of those who did went on to click.`;
    points = ['<b>Lead with the pattern:</b> a smaller slice of the audience is opening, but that slice is highly engaged &mdash; the content matters to the people it reaches.',
      '<b>Likely cause:</b> the subject line or sender is not signalling relevance to the wider list, or the audience is broader than the topic warrants.',
      '<b>What to do:</b> the content is working. Focus effort on the subject line and on tightening the distribution list rather than on the message itself.'];
    report = `“Fewer people opened, but those who did were ${(cto / Math.max(open, 0.001)).toFixed(1)}× more likely to act &mdash; this reached the right people.”`;
  } else if (loOpen) {
    verdict = 'Attention problem'; cls = 'bad';
    lead = `Open rate is <b>${pct(open)}</b> &mdash; below the level at which a mailing can be relied on to land.`;
    points = ['<b>Lead with the pattern:</b> the message is not being seen, so content quality is not yet the question.',
      '<b>Likely causes:</b> subject line not signalling value, unfamiliar sender, send timing, or list fatigue from too-frequent mailing.',
      `<b>Reality check:</b> roughly ${inTenOpen} in 10 recipients opened, so most of the audience never saw the content.`,
      '<b>What to do:</b> test subject lines and send times before reworking the body. Consider whether the whole list needs this message.'];
    report = `“Around ${inTenOpen} in 10 recipients opened &mdash; the message struggled to earn attention.”`;
  } else {
    verdict = 'Solid, unremarkable';
    lead = `<b>${pct(open)}</b> opened and <b>${pct(cto)}</b> of openers clicked &mdash; both in the normal working range.`;
    points = ['<b>Lead with the pattern:</b> a dependable performance with no clear weak link.',
      `<b>Reach:</b> about ${inTenOpen} in 10 recipients opened${oneInCto ? `, and roughly 1 in ${oneInCto} of those clicked` : ''}.`,
      '<b>What to do:</b> compare against the content type and audience size bands below to see whether this is strong or weak <em>for its class</em> &mdash; a 70% open to 130,000 people is a very different achievement from 70% to 13.'];
    report = `“${inTenOpen} in 10 opened${oneInCto ? `, and 1 in ${oneInCto} of those clicked through` : ''}.”`;
  }
  return `<div class="interp"><div class="ih"><h4>What this pattern means &mdash; email performance</h4>${verdictTag(verdict, cls)}</div>
  <div class="lead">${lead}</div>
  <div class="cmp"><div class="${hiOpen ? 'win' : ''}"><div class="m-l">Open rate</div><div class="m-v">${pct(open)}</div>
      <div class="m-q">“Of the people we sent to, how many opened?”</div><div class="m-f">Simple average across ${full(a.nOpen)} mailings · measures whether the message earns attention</div></div>
    <div class="${hiCto ? 'win' : ''}"><div class="m-l">Click-to-open</div><div class="m-v">${pct(cto)}</div>
      <div class="m-q">“Of the people who opened, how many clicked?”</div><div class="m-f">Simple average across ${full(a.nCto)} mailings · measures whether the content earns action</div></div></div>
  <ul>${points.map(p => `<li>${p}</li>`).join('')}</ul>
  <div class="rep"><b>How to report it</b>${report}</div>
  <div class="note">Open rate and click-to-open answer different questions: one is about reach, the other about persuasion. A mailing can succeed on one and fail on the other, so read them together. Click-through (${pct(a.ctr, 2)}) multiplies the two &mdash; of everyone sent to, the share who both opened and clicked.</div></div>`;
}

/* V: videos in scope; all: every video of the year, for the comparison */
export function interpVideo(V, all) {
  if (!V.length) return `<div class="interp"><div class="ih"><h4>What the engagement score means</h4>${verdictTag('No signal')}</div><div class="lead">No videos in scope.</div></div>`;
  const eng = V.reduce((s, x) => s + x.eng, 0) / V.length;
  const c1 = V.reduce((s, x) => s + x.c1, 0), c100 = V.reduce((s, x) => s + x.c100, 0), c50 = V.reduce((s, x) => s + x.c50, 0);
  const comp = c1 ? c100 / c1 : 0, half = c1 ? c50 / c1 : 0;
  const avgAll = all.reduce((s, x) => s + x.eng, 0) / all.length;
  const best = V.slice().sort((a, b) => b.eng - a.eng)[0];
  const d = eng - avgAll, vs = Math.abs(d) < 0.25 ? 'in line with' : (d > 0 ? 'above' : 'below');
  const cmp = V.length === all.length ? 'the all-video average' : `the ${avgAll.toFixed(1)} across all videos`;
  let verdict, cls = '', points;
  const lead = `Average engagement score is <b>${eng.toFixed(1)}</b>, ${vs} ${cmp}.`;
  if (eng >= 20) {
    verdict = 'High engagement'; cls = 'good';
    points = ['<b>What the score is:</b> a composite of how far through the video people watch and how much of it they actually consume &mdash; not simply how many pressed play.',
      `<b>Reading it here:</b> ${pct(half)} of started views passed the halfway mark, so viewers are staying with the content rather than sampling it.`,
      "<b>What it tells you:</b> length and pacing are matched to the audience's appetite. Videos scoring this well are worth studying for format, not just topic."];
  } else if (eng >= 10) {
    verdict = 'Moderate engagement';
    points = ['<b>What the score is:</b> a composite of watch depth and completion &mdash; it rewards videos people stay with, not videos people merely open.',
      `<b>Reading it here:</b> ${pct(half)} of started views reached halfway and ${pct(comp)} reached the end. A normal pattern: people give it a fair chance, and a meaningful share finish.`,
      '<b>What it tells you:</b> the content holds up but has room to improve. Front-load the key message &mdash; the drop-off curve shows where attention is lost.'];
  } else {
    verdict = 'Low engagement'; cls = 'warn';
    points = ['<b>What the score is:</b> a composite of watch depth and completion, so a low value means people start but do not stay.',
      `<b>Reading it here:</b> only ${pct(half)} of started views reached halfway and ${pct(comp)} reached the end &mdash; attention is being lost early.`,
      '<b>What it tells you:</b> most often a length or opening problem rather than a topic problem. Check the drop-off curve for the exact quartile where viewers leave, and consider a shorter cut.'];
  }
  return `<div class="interp"><div class="ih"><h4>What the engagement score means</h4>${verdictTag(verdict, cls)}</div>
  <div class="lead">${lead}</div>
  <div class="cmp"><div class="win"><div class="m-l">Engagement score</div><div class="m-v">${eng.toFixed(1)}</div>
      <div class="m-q">“How deeply did people watch, not just how many pressed play?”</div><div class="m-f">Average across ${full(V.length)} videos in scope · all-video average is ${avgAll.toFixed(1)}</div></div>
    <div><div class="m-l">Completion rate</div><div class="m-v">${pct(comp)}</div>
      <div class="m-q">“Of the views that actually started, how many reached the end?”</div><div class="m-f">${fmt(c100)} completions ÷ ${fmt(c1)} started views</div></div></div>
  <ul>${points.map(p => `<li>${p}</li>`).join('')}</ul>
  ${best ? `<div class="rep"><b>Best performer in scope</b>${esc(trunc(best.t, 90))} &mdash; score ${best.eng.toFixed(1)}, ${pct(best.c1 ? best.c100 / best.c1 : 0)} completion</div>` : ''}
  <div class="note">Views tell you reach; the engagement score tells you whether that reach was meaningful. A video with fewer views but a high score often did more work than a widely-opened one nobody finished. Completion is measured against <b>started views</b> (views at 1%), matching the workbook's definition.</div></div>`;
}

export function interpClicks(ctvr, uctuvr, label, v, c, uv, ucl) {
  const gap = ctvr - uctuvr, rel = uctuvr > 0 ? Math.abs(gap) / uctuvr : 0;
  const perClicker = ucl > 0 ? c / ucl : 0, oneIn = ctvr > 0 ? Math.round(1 / ctvr) : 0, inTen = Math.round(uctuvr * 10);
  const head = `<h4>What this pattern means${label ? ' &mdash; ' + esc(label) : ''}</h4>`;
  if (!v || !uv || (!c && !ucl)) return `<div class="interp"><div class="ih">${head}${verdictTag('No signal')}</div><div class="lead">Too little traffic in scope to read a pattern &mdash; ${fmt(v)} views and ${fmt(uv)} unique visitors.</div></div>`;
  let verdict, lead, points, report;
  if (rel < 0.10) {
    verdict = 'Balanced';
    lead = `Interaction and conversion are effectively level &mdash; <b>${pct(ctvr)}</b> CTVR against <b>${pct(uctuvr)}</b> UCTUVR.`;
    points = ['<b>User behaviour:</b> simple and predictable. The page generates a healthy, straightforward interaction pattern.',
      '<b>Decisive action vs. exploration:</b> visitors who engage generally take the intended action without creating large amounts of repeated clicking.',
      '<b>Measuring success:</b> little difference between the number of people taking action and the number of actions generated &mdash; engagement is spread evenly, not concentrated among a few power users.'];
    report = `“Roughly ${inTen} in 10 visitors clicked at least once, and the volume of clicks matches the number of clickers &mdash; around ${perClicker.toFixed(1)} clicks each.”`;
  } else if (gap > 0) {
    verdict = 'Depth — power users';
    lead = `Interaction rate is <b>${pct(ctvr)}</b> against a visitor conversion of <b>${pct(uctuvr)}</b> &mdash; CTVR leads by ${(Math.abs(gap) * 100).toFixed(1)} points.`;
    points = ['<b>Lead with the pattern:</b> a smaller audience is generating lots of repeat interaction &mdash; power users.',
      '<b>Decisive action vs. exploration:</b> this is exploratory behaviour &mdash; people navigating an ecosystem and accessing multiple resources in one visit.',
      `<b>Measuring success:</b> the page reliably drives action, averaging ${perClicker.toFixed(1)} clicks per clicker. Best read as interaction efficiency &mdash; how consistently views generate clicks.`,
      '<b>Typical of:</b> resource-heavy pages &mdash; articles, talking points, release notes, download hubs.'];
    report = `“About 1 in ${oneIn} views resulted in a click, and those who clicked did so ${perClicker.toFixed(1)} times on average.”`;
  } else {
    verdict = 'Breadth — one-time action';
    lead = `Visitor conversion is <b>${pct(uctuvr)}</b> against an interaction rate of <b>${pct(ctvr)}</b> &mdash; UCTUVR leads by ${(Math.abs(gap) * 100).toFixed(1)} points.`;
    points = ['<b>Lead with the pattern:</b> many first-time visitors clicked. The page serves a specific need once.',
      '<b>Decisive action vs. exploration:</b> a clear, action-oriented one-way journey &mdash; those who came, clicked, and generally did not return.',
      `<b>Measuring success:</b> ${inTen} in 10 visitors took action. For action-oriented pages a higher visitor conversion is the result to celebrate.`,
      '<b>Typical of:</b> forms, login and registration pages, interactive tools. A lower figure here can simply mean users bookmarked the link.'];
    report = `“${inTen} in 10 visitors took action, mostly clicking once rather than exploring further.”`;
  }
  return `<div class="interp"><div class="ih">${head}${verdictTag(verdict)}</div>
  <div class="lead">${lead}</div>
  <div class="cmp"><div class="${gap > 0 && rel >= 0.10 ? 'win' : ''}"><div class="m-l">CTVR · interaction rate</div><div class="m-v">${pct(ctvr)}</div>
      <div class="m-q">“Across all page views, how often did a click happen?”</div><div class="m-f">${fmt(c)} clicks ÷ ${fmt(v)} views · measures how much engagement was generated overall</div></div>
    <div class="${gap < 0 && rel >= 0.10 ? 'win' : ''}"><div class="m-l">UCTUVR · visitor conversion rate</div><div class="m-v">${pct(uctuvr)}</div>
      <div class="m-q">“Of the people who visited, how many clicked at least once?”</div><div class="m-f">${fmt(ucl)} unique clicks ÷ ${fmt(uv)} unique visitors · counted once per person however many times they click</div></div></div>
  <ul>${points.map(p => `<li>${p}</li>`).join('')}</ul>
  <div class="rep"><b>How to report it</b>${report}</div>
  <div class="note">Success is never one metric: interaction rate shows how consistently the page drove action; visitor conversion shows how many people acted.</div></div>`;
}
