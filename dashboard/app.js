// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
'use strict';
(function () {
  const M = window.BugMetrics, DATA = window.DEMO, P = M.POLICY;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${+d} ${MONTHS[+m - 1]} ${y}`; };
  const short = (s) => { const [, m, d] = s.split('-'); return `${+d} ${MONTHS[+m - 1]}`; };
  const pct = (x) => (x == null ? '—' : Math.round(x * 100) + '%');
  const cls = { 'Very high': 'vh', 'High': 'h', 'Medium': 'm', 'Low': 'l' };
  const tag = (impact) => `<span class="tag ${cls[impact] || 'u'}">${esc(impact || 'Not scored')}</span>`;
  const prio = (p) => (p ? `<span class="prio p${p.slice(1)}" title="Priority">${esc(p)}</span>` : '');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const VIEWS = {
    today: { eyebrow: 'Daily · team view', title: 'What needs action today?',
      lead: 'Every open bug that needs something from someone, with the next step. Urgent bugs come first.',
      who: ['QA', 'Developers', 'Engineering manager'] },
    week: { eyebrow: 'Weekly · bug review', title: 'Is the bug flow healthy?',
      lead: 'What came in, what got fixed, how fast urgent bugs were fixed or mitigated, and where bugs come from, so we can prevent the next ones.',
      who: ['QA lead', 'Engineering manager', 'Product owner'] },
    month: { eyebrow: 'Monthly · product and leadership', title: 'Are we meeting our quality goals?',
      lead: 'Four goals with one number each, plus the risks we have chosen to carry and who owns them.',
      who: ['Product manager', 'Product owner', 'Engineering manager', 'Leadership'] },
    how: { eyebrow: 'Reference · everyone', title: 'How it works',
      lead: 'The rules behind every number on this dashboard. The playbook explains the why.',
      who: ['Everyone'] },
  };

  const state = { view: 'today', asOf: DATA.asOf, team: '', impact: '', showAllActions: false };
  const filter = () => ({ team: state.team, impact: state.impact });

  function how(text) { return `<details class="how"><summary>How it's counted</summary><p>${text}</p></details>`; }
  function tile(title, num, sub, explain, alert) {
    return `<section class="tile"><h2>${esc(title)}</h2><p class="num${alert ? ' alert' : ''}">${esc(num)}</p><p class="sub">${esc(sub)}</p>${how(explain)}</section>`;
  }
  function bars(items, max, opts = {}) {
    const top = Math.max(max || 0, ...items.map((i) => i.count), 1);
    return `<ul class="bars">${items.map((i) => `<li><span>${esc(i.label)}</span><span class="bar${i.over ? ' over' : ''}" aria-hidden="true"><i class="${i.cls || ''}" data-w="${Math.round(i.count / top * 100)}"></i></span><span class="val">${esc(i.text != null ? i.text : i.count)}</span></li>`).join('')}</ul>`;
  }
  // Stacked bars for distributions: one hue, light (Low) to dark (Very high); "not scored" is hatched, never a shade of Low.
  // Each bar has a text alternative, a legend, a hover tooltip, and a table view underneath.
  const LV = [['Very high', 'vh'], ['High', 'h'], ['Medium', 'm'], ['Low', 'l'], ['Unknown', 'u']];
  const lvName = (l) => (l === 'Unknown' ? 'Not scored' : l);
  function stacked(rows, caption, firstCol) {
    const max = Math.max(1, ...rows.map((r) => LV.reduce((a, [l]) => a + r.cells[l], 0)));
    const legend = `<ul class="legend" aria-hidden="true">${LV.map(([l, c]) => `<li><i class="seg s-${c}"></i>${lvName(l)}</li>`).join('')}</ul>`;
    const bars = rows.map((r) => {
      const total = LV.reduce((a, [l]) => a + r.cells[l], 0);
      const parts = LV.filter(([l]) => r.cells[l]).map(([l]) => `${r.cells[l]} ${lvName(l)}`).join(', ');
      const segs = LV.filter(([l]) => r.cells[l]).map(([l, c]) => `<i class="seg s-${c}" data-w="${(r.cells[l] / max * 100).toFixed(2)}" data-tip="${esc(r.label)} · ${lvName(l)}: ${plural(r.cells[l], 'bug')}"></i>`).join('');
      return `<li><span class="lab">${esc(r.label)}</span><span class="sbar" role="img" aria-label="${esc(r.label)}: ${plural(total, 'bug')}${parts ? ': ' + esc(parts) : ''}">${segs}</span><span class="tot">${total}</span></li>`;
    }).join('');
    const table = `<div class="table-wrap"><table class="heat">
        <caption class="sr">${esc(caption)}</caption>
        <thead><tr><th scope="col">${esc(firstCol)}</th>${LV.map(([l]) => `<th scope="col" class="n">${lvName(l)}</th>`).join('')}<th scope="col" class="n">Total</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th>${LV.map(([l]) => `<td class="c c${Math.min(r.cells[l], 3)}">${r.cells[l]}</td>`).join('')}<td class="n">${LV.reduce((a, [l]) => a + r.cells[l], 0)}</td></tr>`).join('')}</tbody>
      </table></div>`;
    return `${legend}<ul class="stacks">${bars}</ul><details class="tableview"><summary>Show as a table</summary>${table}</details>`;
  }

  // ---------- SVG charts ----------
  // Series colours: CSS tokens --c1..--c5, light and dark, checked for colour-blind separation by tools/check-palette.js.
  // One y-axis only; thin marks; every chart has a legend, a text alternative, a hover readout and a table view.
  const narrow = () => window.innerWidth < 560;
  // Axis tops that halve into whole numbers, so counts never show as 2.5.
  const niceMax = (v) => [2, 4, 6, 8, 10, 20, 30, 40, 60, 80, 100, 200].find((n) => n >= v) || Math.ceil(v / 100) * 100;
  const legendLines = (series) => `<ul class="legend" aria-hidden="true">${series.map((x) => `<li><i class="key-line ${x.cls}"></i>${esc(x.name)}</li>`).join('')}</ul>`;
  const legendBoxes = (items) => `<ul class="legend" aria-hidden="true">${items.map((x) => `<li><i class="key-box ${x.cls}"></i>${esc(x.name)}</li>`).join('')}</ul>`;
  const tableView = (caption, head, rows) => `<details class="tableview"><summary>Show as a table</summary><div class="table-wrap"><table>
      <caption class="sr">${esc(caption)}</caption>
      <thead><tr>${head.map((h, i) => `<th scope="col"${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map((c) => `<td class="n">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div></details>`;

  function lineChart({ labels, series, label, unit }) {
    const W = narrow() ? 330 : 460, H = 220, m = { l: 30, r: 12, t: 14, b: 28 };
    const max = niceMax(Math.max(...series.flatMap((x) => x.values)));
    const x = (i) => m.l + (labels.length === 1 ? 0 : i * (W - m.l - m.r) / (labels.length - 1));
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / max);
    const ticks = [0, max / 2, max];
    const step = (W - m.l - m.r) / Math.max(1, labels.length - 1);
    const every = narrow() ? 3 : 2;
    const grid = ticks.map((t) => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('');
    const xl = labels.map((l, i) => (i % every === (labels.length - 1) % every ? `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(short(l))}</text>` : '')).join('');
    const lines = series.map((sr) => `<polyline class="ln ${sr.cls}" points="${sr.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>${sr.values.map((v, i) => `<circle class="pt ${sr.cls}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5"/>`).join('')}`).join('');
    const hits = labels.map((l, i) => `<rect class="hit" x="${(x(i) - step / 2).toFixed(1)}" y="${m.t}" width="${step.toFixed(1)}" height="${H - m.t - m.b}" data-x="${x(i).toFixed(1)}" data-tip="${esc(`Week ending ${fmt(l)}\n` + series.map((sr) => `${sr.values[i]} ${sr.name.toLowerCase()}`).join('\n'))}"/>`).join('');
    const summary = `${label}: ${series.map((sr) => `${sr.name} ${sr.values.reduce((a, b) => a + b, 0)} in total`).join(', ')}, over ${labels.length} weeks`;
    return `${legendLines(series)}<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">${grid}<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>${xl}${lines}<line class="guide" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>${hits}</svg>`;
  }

  function columnChart({ items, label }) {
    const W = narrow() ? 330 : 460, H = 220, m = { l: 30, r: 12, t: 22, b: 28 };
    const max = niceMax(Math.max(...items.map((i) => Math.max(i.value || 0, i.target || 0))));
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / max);
    const band = (W - m.l - m.r) / items.length, bw = Math.min(56, band * 0.5);
    const ticks = [0, max / 2, max];
    const grid = ticks.map((t) => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('');
    const cols = items.map((it, i) => {
      const cx = m.l + band * i + band / 2, x0 = cx - bw / 2, top = y(it.value || 0), base = y(0), r = Math.min(4, Math.max(0, base - top));
      const bar = it.value ? `<path class="col-mark" d="M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${base} Z"/>` : '';
      const val = `<text class="val" x="${cx}" y="${(it.value ? top : base) - 6}" text-anchor="middle">${it.value == null ? 'none' : it.value + 'd'}</text>`;
      const tgt = it.target ? `<line class="target" x1="${x0 - 8}" x2="${x0 + bw + 8}" y1="${y(it.target)}" y2="${y(it.target)}"/>` : '';
      const hit = `<rect class="hit" x="${cx - band / 2}" y="${m.t}" width="${band}" height="${H - m.t - m.b}" data-tip="${esc(`${it.label}: ${it.value == null ? 'none in the period' : `median ${it.value} days`}${it.target ? `\ntarget ${it.target} days` : ''}${it.count != null ? `\n${plural(it.count, 'bug')}` : ''}`)}"/>`;
      return `${bar}${tgt}${val}<text class="ax" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(it.label)}</text>${hit}`;
    }).join('');
    const summary = `${label}: ${items.map((it) => `${it.label} ${it.value == null ? 'none' : it.value + ' days'}${it.target ? ` (target ${it.target})` : ''}`).join(', ')}`;
    return `<ul class="legend" aria-hidden="true"><li><i class="key-box c1"></i>Median days</li><li><i class="key-line dash"></i>Target</li></ul><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">${grid}<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>${cols}</svg>`;
  }

  function donut({ parts, label }) {
    const total = parts.reduce((a, p) => a + p.count, 0) || 1, r = 52, C = 2 * Math.PI * r, gap = parts.filter((p) => p.count).length > 1 ? 2 : 0;
    let offset = 0;
    const arcs = parts.map((p, i) => {
      if (!p.count) return '';
      const len = p.count / total * C;
      const arc = `<circle class="arc c${i + 1}" cx="70" cy="70" r="${r}" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${(C - Math.max(0, len - gap)).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" data-tip="${esc(`${p.label}: ${plural(p.count, 'bug')} (${Math.round(p.count / total * 100)}%)`)}"/>`;
      offset += len; return arc;
    }).join('');
    const list = `<ul class="donut-legend">${parts.map((p, i) => `<li><i class="key-box c${i + 1}" aria-hidden="true"></i><span>${esc(p.label)}</span><b>${p.count}</b><span class="pct">${Math.round(p.count / total * 100)}%</span></li>`).join('')}</ul>`;
    const summary = `${label}: ${parts.map((p) => `${p.label} ${p.count}`).join(', ')}`;
    return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 140 140" role="img" aria-label="${esc(summary)}"><g transform="rotate(-90 70 70)">${arcs}</g><text class="donut-num" x="70" y="72" text-anchor="middle">${parts.reduce((a, p) => a + p.count, 0)}</text><text class="ax" x="70" y="90" text-anchor="middle">open</text></svg>${list}</div>`;
  }

  function pairedBars({ rows, a, b, single, max: fixedMax, suffix = '' }) {
    const max = fixedMax || Math.max(1, ...rows.flatMap((r) => [r[a.key], r[b.key]]));
    const one = (r, k, name, cls) => `<span class="prow"><i class="pbar ${cls}" data-w="${(r[k] / max * 100).toFixed(1)}" data-tip="${esc(`${r.label}\n${r[k]}${suffix} ${name.toLowerCase()}`)}"></i><b>${r[k]}${suffix}</b></span>`;
    const legend = single ? '' : legendBoxes([{ name: a.name, cls: 'c1' }, { name: b.name, cls: 'c2' }]);
    return `${legend}<ul class="pairs">${rows.map((r) => `<li><span class="lab">${esc(r.label)}</span>
      <span class="pair" role="img" aria-label="${esc(single ? `${r.label}: ${r[a.key]}${suffix} ${a.name.toLowerCase()}` : `${r.label}: ${r[a.key]} ${a.name.toLowerCase()}, ${r[b.key]} ${b.name.toLowerCase()}`)}">
        ${one(r, a.key, a.name, 'c1')}${single ? '' : one(r, b.key, b.name, 'c2')}
      </span></li>`).join('')}</ul>`;
  }

  const idCell = (s) => `<button type="button" class="idbtn" data-id="${esc(s.id)}" aria-haspopup="dialog">${esc(s.id)}</button><span class="title">${esc(s.title)}</span>`;

  // Scrollable tables must be reachable by keyboard (WCAG 2.1.1), so each wrapper is a labelled, focusable region.
  // Help text: the first sentence stays visible; the rest is one click away, under "More about this panel".
  // Less to read at a glance, nothing removed. A help paragraph that is one sentence stays as it is.
  function trimHelp(html) {
    return html.replace(/<p class="help">([\s\S]*?)<\/p>/g, (m, text) => {
      const cut = text.search(/[.?!] (?=[A-Z"(])(?![^<]*<\/(code|a|strong|em)>)/);
      if (cut < 0) return m;
      return `<p class="help">${text.slice(0, cut + 1)}</p><details class="more"><summary>More about this panel</summary><p>${text.slice(cut + 2)}</p></details>`;
    });
  }

  function regions(html) {
    html = trimHelp(html);
    return html.replace(/<div class="table-wrap"><table([^>]*)>\s*<caption([^>]*)>([^<]*)<\/caption>/g,
      (m, attrs, capAttrs, cap) => `<div class="table-wrap" role="region" tabindex="0" aria-label="${cap}"><table${attrs}><caption${capAttrs}>${cap}</caption>`);
  }

  // ---------- Today ----------
  function actionRow(s, hidden) {
    const why = M.reasons(s).map((x) => `<span class="${/Urgent|past fix|leadership|after 2 days/.test(x) ? 'hot' : ''}">${esc(x)}</span>`).join('');
    return `<tr${hidden ? ' hidden' : ''}><td>${idCell(s)}</td>`
      + `<td data-label="Team">${esc(s.team)}${s.assignee ? ` · ${esc(s.assignee)}` : ''}</td>`
      + `<td data-label="Impact"><span class="pi">${prio(s.priority)}${tag(s.impact)}<span class="age">${s.age} days old</span></span></td>`
      + `<td class="n hide-sm">${s.age}d</td><td data-label="Why"><div class="why">${why}</div></td>`
      + `<td class="next" data-label="Next step">${esc(M.nextStep(s))}</td></tr>`;
  }

  // The four tiles at the top of Today. The "how it's counted" text sits apart from the layout, so it reads as prose.
  function todayTiles(t) {
    const urgentSub = t.emergencies.length ? plural(t.emergencies.length, 'P0 emergency').replace('emergencys', 'emergencies')
      : t.notPickedUp.length ? `${t.notPickedUp.length} not picked up` : 'High or Very high';
    const HOW = {
      urgent: `Open bugs scored High or Very high. Each needs someone to pick it up, and a fix or mitigation within target: ${P.fixTarget['Very high']} days for Very high, ${P.fixTarget.High} days for High (late from the day after). `
        + `If nobody picks it up within ${P.triageWithin} days of triage (a P0 straight away), it's flagged, and the engineering manager and product owner agree who picks it up. `
        + 'If planned work has to pause, the product owner decides what moves. If it then passes its fix target, the QA lead raises it at the weekly review and the product owner tells stakeholders.',
      triage: `Open bugs the team hasn't triaged yet. Triaged means the team has reviewed it (label bug-reviewed) and it has an impact score: impact scored, priority agreed, reproducibility checked and the next review date set, within ${P.triageWithin} days. `
        + 'Having no assignee doesn\'t make a bug untriaged: a scored, deferred bug often has nobody on it, on purpose. Urgent bugs nobody has picked up are counted on the first tile instead.',
      review: 'Every bug gets a next review date from its impact: daily for Very high, weekly for High, monthly for Medium, quarterly for Low. Overdue means the date has passed and nobody has looked since.',
      undecided: `Open bugs older than their age limit (${P.decisionAge.High} days for High, ${P.decisionAge.Medium} for Medium, ${P.decisionAge.Low} for Low) with no decision. Two kinds, counted separately: `
        + 'no plan recorded (not being worked on, deferred or escalated, or past the leadership age and not escalated yet), and leadership decision pending (escalated, but nobody has chosen fix or accept yet). '
        + 'Escalating isn\'t deciding, so both count until there\'s a decision. The same split is goal G3 on the monthly view.',
    };
    return [
      tile('Urgent bugs open', t.urgentOpen.length, urgentSub, HOW.urgent, t.urgentOpen.length > 0),
      tile('Waiting for triage', t.untriaged.length, `${t.triageLate.length} waiting more than ${P.triageWithin} days`, HOW.triage, t.triageLate.length > 0),
      tile('Reviews overdue', t.reviewOverdue.length, 'next review date has passed', HOW.review, t.reviewOverdue.length > 0),
      tile('Old bugs without a decision', t.undecided.length, `${t.noPlan.length} no plan recorded · ${t.decisionPending.length} waiting on leadership`, HOW.undecided, t.undecided.length > 0),
    ].join('');
  }

  function renderToday() {
    const t = M.today(DATA.issues, state.asOf, filter());
    const statuses = M.byStatus(t.open);
    const counts = M.countByLevel(t.open);
    const impacts = LV.map(([l, c]) => ({ label: lvName(l), cls: 's-' + c, count: counts[l] }));
    // The most urgent few are always on screen; the rest are one click away, so the list starts short.
    const TOP = 5, extra = Math.max(0, t.queue.length - TOP);
    const rows = t.queue.map((s, i) => actionRow(s, i >= TOP && !state.showAllActions)).join('');
    const toggle = extra ? `<button type="button" class="linkbtn" id="toggle-actions" aria-controls="action-table" aria-expanded="${state.showAllActions ? 'true' : 'false'}">${state.showAllActions ? `Show only the top ${TOP}` : `Show all ${t.queue.length} bugs (${extra} more)`}</button>` : '';
    return `
    <div class="tiles">
      ${todayTiles(t)}
    </div>
    <section class="panel">
      <h2>The action list</h2>
      <p class="help">${plural(t.queue.length, 'bug')} need something, in the order developers pick up work: P0 emergencies first, then bugs not yet triaged (they could be emergencies), then agreed P1 work, then decisions that are due. Select a bug ID to see its history.</p>
      <div class="table-wrap"><table class="stack" id="action-table">
        <caption class="sr">Bugs that need action, with the reason and the next step</caption>
        <thead><tr><th scope="col">Bug</th><th scope="col">Team · assignee</th><th scope="col">Priority · impact</th><th scope="col" class="n hide-sm">Age</th><th scope="col">Why it's here</th><th scope="col">Next step</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">Nothing needs action. Good day.</td></tr>'}</tbody>
      </table></div>
      ${toggle}
    </section>
    <details class="explore"><summary><span class="explore-title">Explore the open backlog</span><span class="explore-sub">Six panels: state, impact, reproducibility, team review, team load and missing information</span></summary>
    <div class="grid2">
      <section class="panel">
        <h2>What state are open bugs in?</h2>
        <p class="help">Every open bug by where it is in its life. A big "New" slice means triage is behind; a big "Deferred" slice is fine as long as the reviews are up to date.</p>
        ${donut({ parts: statuses, label: 'Open bugs by status' })}
        ${tableView('Open bugs by status', ['Status', 'Bugs'], statuses.map((p) => [p.label, p.count]))}
      </section>
      <section class="panel">
        <h2>How serious are open bugs?</h2>
        <p class="help">Open bugs by impact. Bugs not yet scored are shown on their own, never counted as Low.</p>
        ${bars(impacts.map((x) => ({ label: x.label, count: x.count, cls: x.cls })))}
        ${tableView('Open bugs by impact', ['Impact', 'Bugs'], impacts.map((x) => [x.label, x.count]))}
      </section>
    </div>
    <div class="grid2">
      <section class="panel">
        <h2>Can we reproduce them?</h2>
        <p class="help">Open bugs by whether the team could reproduce them, from the Jira labels <code>reproducible</code> and <code>not-reproducible</code>. A bug nobody can reproduce can't be fixed with confidence: pair with the reporter, or add logging.</p>
        ${bars(t.repro.map((x, i) => ({ label: x.label, count: x.count, cls: ['c2', 'c4', 's-u'][i] })))}
        ${tableView('Open bugs by reproducibility', ['Reproducible?', 'Bugs'], t.repro.map((x) => [x.label, x.count]))}
      </section>
      <section class="panel">
        <h2>Has the team reviewed them?</h2>
        <p class="help">Open bugs by team review, from the Jira label <code>bug-reviewed</code>, added at triage. When a bug's review date passes it's due for review again, so "reviewed" never goes stale.</p>
        ${bars(t.reviewed.map((x, i) => ({ label: x.label, count: x.count, cls: ['c2', 'c3', 's-u'][i] })))}
        ${tableView('Open bugs by team review', ['Reviewed?', 'Bugs'], t.reviewed.map((x) => [x.label, x.count]))}
      </section>
    </div>
    <div class="grid2">
      <section class="panel">
        <h2>Is any team taking on too much?</h2>
        <p class="help">Urgent bugs being worked on right now (In progress or Verification). Suggested limit: ${P.urgentInProgressLimit} per team, so work gets finished before more starts.</p>
        ${bars(t.wip.map((w) => ({ label: w.team, count: w.count, text: `${w.count} / ${w.limit}`, over: w.count > w.limit })), P.urgentInProgressLimit)}
      </section>
      <section class="panel">
        <h2>What information is missing?</h2>
        <p class="help">A bug can't be prioritised without an impact score and an agreed priority, and a deferral needs a reason and a review date. The owner is always the team whose board the bug is on, so it's never missing.</p>
        ${bars(t.missing.map((m) => ({ label: m.field, count: m.count })))}
      </section>
    </div>
    </details>`;
  }

  // ---------- This week ----------
  function renderWeek() {
    const w = M.week(DATA.issues, state.asOf, filter());
    const f = w.flow28;
    const total = w.caught.before + w.caught.production;
    const support = (w.foundBy.find((x) => x.label === 'Customer support') || { count: 0 }).count;
    const hot = w.hotspots.slice(0, 8).map((h) => ({ label: h.area, cells: h.cells }));
    const w12 = M.weekly(DATA.issues, state.asOf, filter(), 12);
    const tts = M.timeToSafe(DATA.issues, state.asOf, filter());
    const late = w.byLevel.reduce((a, l) => a + l.openLate, 0);
    const flow = M.teamFlow(DATA.issues, state.asOf, filter());
    const ages = M.ageBuckets(M.states(DATA.issues, state.asOf, filter()).filter((s) => s.open));
    return `
    <div class="tiles">
      ${tile('New bugs', f.created, 'last 28 days', 'Bugs raised in the last 28 days, wherever they were found: development, staging or production.')}
      ${tile('Fixed', f.fixed, 'last 28 days', 'Bugs closed as fixed after verification. Closing for other reasons is counted separately, so tidying the backlog never looks like fixing.')}
      ${tile('Closed without a fix', f.other, 'duplicates, not reproducible, accepted', 'Every one of these needs a written reason on the ticket. A rise here is worth a look: it can mean real problems are being closed to tidy the numbers.')}
      ${tile('Reopened', f.reopened, f.fixed ? `${pct(w.reopenRate)} of fixes in the period` : 'no fixes in the period', 'Bugs that came back after being closed as fixed. A high rate usually means verification was too narrow, for example one browser or one locale.', f.reopened > 0 && w.reopenRate > 0.1)}
    </div>
    <div class="grid2">
      <section class="panel">
        <h2>Bug trends</h2>
        <p class="help">New, fixed and reopened bugs per week, over the last 12 weeks. More coming in than going out for three weeks or more is worth raising at the monthly review.</p>
        ${lineChart({ labels: w12.map((x) => x.end), series: [{ name: 'New', cls: 'c1', values: w12.map((x) => x.created) }, { name: 'Fixed', cls: 'c2', values: w12.map((x) => x.fixed) }, { name: 'Reopened', cls: 'c3', values: w12.map((x) => x.reopened) }], label: 'Bug trends' })}
        ${tableView('Bugs per week', ['Week ending', 'New', 'Fixed', 'Reopened', 'Closed, no fix'], w12.map((x) => [short(x.end), x.created, x.fixed, x.reopened, x.other]))}
      </section>
      <section class="panel">
        <h2>How long until bugs are fixed or mitigated?</h2>
        <p class="help">Median days from a bug being raised to being fixed or mitigated (a workaround or flag that removes the impact counts), by impact when raised, over the last 90 days. The dashed line is the target.</p>
        ${columnChart({ items: tts.map((l) => ({ label: l.level, value: l.median, target: l.target, count: l.count })), label: 'Median days until fixed or mitigated, by impact' })}
        ${tableView('Time until fixed or mitigated, by impact', ['Impact', 'Bugs', 'Median days', 'Target', 'Within target'], tts.map((l) => [l.level, l.count, l.median == null ? '—' : l.median, l.target ? l.target + ' days' : 'Planned', l.target ? `${l.withinTarget} of ${l.count}` : '—']))}
        <p class="take">${late ? `${plural(late, 'urgent bug')} still open and past target. They aren't in the medians above, which only cover finished work.` : 'No urgent bugs are open and past target.'}</p>
      </section>
    </div>
    <details class="explore"><summary><span class="explore-title">Where bugs come from, and where they sit</span><span class="explore-sub">Six panels: flow by team, where bugs are caught, causes, prevention, age and hotspots</span></summary>
    <div class="grid2">
      <section class="panel">
        <h2>Where are more bugs coming in than going out?</h2>
        <p class="help">New and fixed bugs per team over the last 28 days. More coming in than going out for a few weeks is a signal to look at support or capacity together, not a judgement on the team.</p>
        ${pairedBars({ rows: flow.map((f) => ({ label: f.team, created: f.created, fixed: f.fixed })), a: { key: 'created', name: 'New' }, b: { key: 'fixed', name: 'Fixed' } })}
        ${tableView('New and fixed per team, last 28 days', ['Team', 'New', 'Fixed', 'Reopened', 'Closed, no fix'], flow.map((f) => [f.team, f.created, f.fixed, f.reopened, f.other]))}
      </section>
      <section class="panel">
        <h2>Where are bugs caught? <span class="optional">Optional</span></h2>
        <p class="help">Bugs raised in the last 90 days, by how they were found. Optional: it needs "Found in" and "Found by" recorded on each bug. Worth it if you want to show where test automation would pay off; skip it if it's extra effort for your team.</p>
        ${bars([{ label: 'Before release', count: w.caught.before }, { label: 'In production', count: w.caught.production }])}
        <h3 class="sr">Found by</h3>
        <div class="gap-top">${bars(w.foundBy.map((x) => ({ label: x.label, count: x.count })))}</div>
        ${total ? `<p class="take">${w.caught.production} of ${total} reached production, and customer support found ${support}. Those areas are where new automated checks would pay off first.</p>` : ''}
      </section>
    </div>
    <div class="grid2">
      <section class="panel">
        <h2>What causes them?</h2>
        <p class="help">Causes of fixed High and Very high bugs, and anything reopened, in the last 90 days. Cause labels are optional; the monthly prevention review agrees the cause for any without one.</p>
        ${bars(w.rootCauses.map((x) => ({ label: x.label, count: x.count })))}
      </section>
      <section class="panel">
        <h2>What did we add so they don't come back?</h2>
        <p class="help">The test or check that came with each fix, from its linked pull request. A fix without one is a bug waiting to return.</p>
        <ul>${w.prevention.slice(0, 8).map((p) => `<li><strong>${esc(p.id)}</strong>${p.rootCause ? ` (${esc(p.rootCause)})` : ''}: ${esc(p.prevention)}</li>`).join('') || '<li>Nothing in this period.</li>'}</ul>
      </section>
    </div>
    <div class="grid2">
      <section class="panel">
        <h2>How old are open bugs?</h2>
        <p class="help">Open bugs by age and impact. A plan is needed by day 30 for High and Very high, day 90 for Medium and day 180 for Low (flagged from the day after), so Very high and High bugs in the older rows need attention first.</p>
        ${stacked(ages, 'Open bugs by age and impact', 'Age')}
      </section>
      <section class="panel">
        <h2>Where are the hotspots?</h2>
        <p class="help">Open bugs by product area and impact, highest weighted exposure first. An area at the top is a candidate for a focused fix-up or tech debt work.</p>
        ${stacked(hot, 'Open bugs by area and impact', 'Team · area')}
      </section>
    </div>
    </details>`;
  }

  // ---------- This month ----------
  // One small function per panel, so each can be read and changed on its own.
  const STATUS_CLS = { 'On track': 'on', 'Watch': 'watch', 'Off track': 'off' };
  const dates = (text) => esc(text).replace(/\d{4}-\d{2}-\d{2}/g, (d) => fmt(d)); // ISO dates in summary text, read as dates

  function definitionList(d) {
    const rows = [['Counts', d.counts], ['Out of', d.outOf], ['Period', d.period], ['Left out', d.excludes], ['Helps decide', d.decision]];
    return `<details class="how"><summary>How it's counted</summary><dl class="def">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <p>Follows the team and impact filters.</p></details>`;
  }

  function goalCard(g) {
    const alongside = g.alongside
      ? `<span class="alongside${g.openLate.length ? ' late' : ''}">${esc(g.alongside)}${g.openLate.length ? `: ${esc(g.openLate.join(', '))}` : ''}</span>`
      : '';
    return `<section class="goal"><h3>${esc(g.goal)}</h3><p class="metric">${esc(g.metric)}</p>
      <span class="big">${esc(g.value)}</span>${alongside}
      <span class="meta">${esc(g.detail)} · target: ${esc(g.target)}</span>
      <span class="status ${STATUS_CLS[g.status]}">${esc(g.status)}</span>${definitionList(g.definition)}</section>`;
  }

  function summaryPanel(sum) {
    const list = (items, empty) => (items.length
      ? `<ul>${items.map((x) => `<li>${dates(x.text)}${x.ids.length ? ` <span class="ids">${x.ids.map(esc).join(', ')}</span>` : ''}</li>`).join('')}</ul>`
      : `<p>${empty}</p>`);
    return `<section class="panel summary" aria-labelledby="sum-h">
      <h2 id="sum-h">This month in three questions</h2>
      <div class="grid3">
        <div><h3 class="sub-h">What needs a decision?</h3>${list(sum.decisions, 'Nothing is waiting for a decision.')}</div>
        <div><h3 class="sub-h">What's concerning?</h3>${list(sum.concerning, 'Nothing stands out.')}</div>
        <div><h3 class="sub-h">What changed?</h3>${list(sum.changed, 'No change.')}</div>
      </div>
      <p class="fiction"><strong>About the red:</strong> this is fictional data, built to show problems. It deliberately includes overdue urgent bugs, a deferral with no reason and a missed go-live promise, so you can see how the dashboard exposes them. It isn't the record of a real rollout.</p>
    </section>`;
  }

  function exposurePanels(m) {
    const top = Math.max(...m.weekly.map((x) => x.points), 1);
    const cols = m.weekly.map((x, i) => `<li class="${i === m.weekly.length - 1 ? 'last' : ''}"><b>${x.points}</b>`
      + `<span class="col" data-h="${Math.max(4, Math.round(x.points / top * 120))}" aria-hidden="true"></span>`
      + `<span class="wk">${short(x.end)}</span><span class="unk">${x.unknown ? '+' + x.unknown + ' not scored' : '&nbsp;'}</span></li>`).join('');
    const diff = m.points - m.before;
    const take = diff > 0 ? `Up ${diff} on 4 weeks ago. Check what drove it: new urgent bugs, bugs re-scored higher, or fewer fixes.`
      : diff < 0 ? `Down ${-diff} on 4 weeks ago. Check it came from fixes and mitigations, not from closing bugs without a fix or scoring them lower.`
        : 'No change on 4 weeks ago.';
    const byTeam = m.exposure.map((e) => ({ label: `${e.team} (${e.points})`, cells: e.cells }));
    return `<div class="grid2">
      <section class="panel">
        <h2>Is weighted exposure going down?</h2>
        <p class="help">The weighted exposure of all open bugs at the end of each week: each open bug adds 8 for Very high, 4 for High, 2 for Medium and 1 for Low. The weights are a ranking convention that lets one serious bug outweigh a few small ones; they don't measure money or customers. Bugs not yet scored are listed under the bars rather than counted as zero.</p>
        <ul class="cols" aria-label="Weighted exposure of open bugs by week">${cols}</ul>
        <p class="take">${take}</p>
      </section>
      <section class="panel">
        <h2>How are open bugs spread across teams?</h2>
        <p class="help">Open bugs by team and impact, with each team's weighted exposure in brackets. The counts matter as much as the total: select "Show as a table" for exact numbers.</p>
        ${stacked(byTeam, 'Open bugs by team and impact', 'Team')}
      </section>
    </div>`;
  }

  function deferredRow(s) {
    const reason = s.deferralReason ? esc(s.deferralReason) : '<span class="tag h">No reason recorded</span>';
    const accepted = /^Risk accepted/.test(s.deferralReason || '') ? ' <span class="tag u">Accepted</span>' : '';
    const workaround = s.mitigation ? `${esc(s.mitigation)}${s.mitigationType ? ` <em>(${esc(s.mitigationType.toLowerCase())})</em>` : ''}` : 'None';
    const review = (s.reviewDue ? fmt(s.reviewDue) : '<span class="tag h">Missing</span>') + (s.reviewOverdue ? ' <span class="tag h">Overdue</span>' : '');
    return `<tr><td>${idCell(s)}</td><td data-label="Team">${esc(s.team)}</td><td data-label="Impact">${tag(s.impact)}</td>`
      + `<td data-label="Why deferred">${reason}${accepted}</td><td data-label="Workaround">${workaround}</td><td data-label="Review by">${review}</td></tr>`;
  }

  function acceptedItem(s) {
    return `<li><strong>${esc(s.id)}</strong> ${esc(s.title)}. Residual impact ${tag(s.impact)}. Accepted by ${esc(s.acceptedBy)} on ${fmt(s.closed)}: ${esc(s.closureReason)} `
      + `Look again by ${fmt(s.reviewDue)}${s.acceptedReviewOverdue ? ' <span class="tag h">Overdue</span>' : ''}, or sooner if ${esc(s.lookAgainIf.charAt(0).toLowerCase() + s.lookAgainIf.slice(1))}.</li>`;
  }

  function risksPanel(m) {
    return `<section class="panel">
      <h2>Which risks have we chosen to carry?</h2>
      <p class="help">Deferred bugs stay open and visible, and count in weighted exposure. Each one needs a reason from the fixed list and a date to look again; a workaround is added when there is one, with how much it protects users. The team's product owner makes the call; leadership does for accepting a High or Very high risk, which stays here marked "Accepted".</p>
      <div class="table-wrap"><table class="stack">
        <caption class="sr">Deferred bugs and their review dates</caption>
        <thead><tr><th scope="col">Bug</th><th scope="col">Team</th><th scope="col">Impact</th><th scope="col">Why deferred</th><th scope="col">Workaround</th><th scope="col">Review by</th></tr></thead>
        <tbody>${m.deferred.map(deferredRow).join('') || '<tr><td colspan="6">No deferred bugs.</td></tr>'}</tbody>
      </table></div>
      <h3 class="sub-h">Closed as accepted risk</h3>
      <p class="help">Only Low and Medium risks can be closed as accepted. They leave the fixing queue and the exposure total, but stay listed here with their residual impact, who accepted them and a date to look again, until the risk is retired.</p>
      <ul>${m.acceptedClosed.map(acceptedItem).join('') || '<li>None.</li>'}</ul>
    </section>`;
  }

  function aiPanel(ai) {
    const found = ai.found.count
      ? (ai.found.urgent ? 'Finding real, urgent bugs as well as small ones. Keep the AI-generated tests that found them in the regression pack.' : 'Mostly Low impact so far. Check the tool isn\'t finding noise.')
      : 'No bugs found with AI in this period.';
    const bars = ai.enough ? pairedBars({ rows: [
      { label: `AI-drafted (${ai.ai.outcomes})`, a: Math.round((ai.ai.rate || 0) * 100), b: 0 },
      { label: `Written by people (${ai.people.outcomes})`, a: Math.round((ai.people.rate || 0) * 100), b: 0 }],
    a: { key: 'a', name: '% rejected' }, b: { key: 'b', name: '' }, single: true, max: 100, suffix: '%' }) : '';
    const row = (name, x, rate) => [name, x.count, x.waiting, x.accepted, x.duplicate, x.notReproducible, rate];
    const table = tableView('Outcomes of AI-drafted tickets compared with tickets people wrote, last 90 days',
      ['Written by', 'Tickets', 'Waiting for triage', 'Accepted', 'Duplicate', 'Not reproducible', 'Rejected %'],
      [row('AI (ai-drafted)', ai.ai, ai.enough ? pct(ai.ai.rate) : 'Too few'), row('People', ai.people, pct(ai.people.rate))]);
    const verdict = !ai.ai.count ? ''
      : ai.enough ? `${ai.ai.rejected} of ${ai.ai.outcomes} AI-drafted tickets with an outcome were rejected (${ai.ai.duplicate} duplicate, ${ai.ai.notReproducible} not reproducible), against ${ai.people.rejected} of ${ai.people.outcomes} written by people.`
        : `${ai.ai.outcomes} of ${ai.ai.count} AI-drafted tickets have an outcome so far (${ai.ai.accepted} accepted, ${ai.ai.rejected} rejected) and ${ai.ai.waiting} are waiting for triage. That's too few to compare with people or apply the stop rule: one more rejection would swing the rate by a lot.`;
    const advice = ai.status === 'Watch' ? 'At the limit: run the drafting skill against the known-answer cases before the next batch.' : ai.status === 'Pause AI drafting' ? 'Pause drafting and fix the prompt.' : '';
    return `<section class="panel">
      <h2>Is AI helping?</h2>
      <p class="help">Bugs raised in the last 90 days, from the labels <code>found-with-ai</code> (an AI tool helped find it) and <code>ai-drafted</code> (an AI tool drafted the ticket and a person checked it). These are learning numbers for the team, never a comparison of people.</p>
      <div class="grid2 flat">
        <div>
          <h3 class="sub-h">Bugs found with AI</h3>
          <p class="kpi"><b>${ai.found.count}</b> of ${ai.total} new bugs${ai.total ? ` (${pct(ai.found.count / ai.total)})` : ''}, ${plural(ai.found.urgent, 'urgent one')}</p>
          ${stacked([{ label: 'Found with AI', cells: ai.found.cells }], 'Bugs found with AI, by impact when first scored', 'Bugs')}
          <p class="take">${found}</p>
        </div>
        <div>
          <h3 class="sub-h">What happened to AI-drafted tickets at triage?</h3>
          <p class="kpi">Rejected % = closed as a duplicate or not reproducible, out of tickets with an outcome (accepted at triage, or closed as one of those two). Tickets waiting for triage are left out. Stop rule: pause AI drafting above ${pct(ai.stopRule)} rejected, judged once there are at least ${ai.minOutcomes} outcomes.</p>
          ${bars}${table}
          <p class="take"><span class="status ${ai.status === 'On track' ? 'on' : ai.status === 'Pause AI drafting' ? 'off' : 'watch'}">${esc(ai.status)}</span> ${verdict} ${advice} Not reproducible is shown on its own, because an intermittent bug can be real even when nobody can reproduce it yet.</p>
        </div>
      </div>
    </section>`;
  }

  const FOLLOW_CLS = { 'Done': 'on', 'Done late': 'watch', 'Overdue': 'off', 'Due': 'watch' };
  const PROTECTION_TEXT = { active: 'Active at go-live', proposed: 'Proposed at go-live, not yet in place', none: 'None at go-live' };
  function followText(x) {
    if (x.followUpStatus === 'Done') return `Done on ${fmt(x.doneOn)}`;
    if (x.followUpStatus === 'Done late') return `Done on ${fmt(x.doneOn)}, ${plural(x.daysLate, 'day')} late`;
    if (x.followUpStatus === 'Overdue') return `Not done: ${plural(x.daysLate, 'day')} overdue`;
    return `Due ${fmt(x.followUp.due)}`;
  }
  function signOffRow(x) {
    const protection = `<strong>${PROTECTION_TEXT[x.protectionAtGoLive]}.</strong> ${esc(x.protection)}`
      + (x.protectionAtGoLive !== 'active' && x.protectedOn ? ` Users protected from ${fmt(x.protectedOn)}, from the bug's history.` : '');
    return `<tr><td data-label="What went live">${esc(x.milestone)}<br><span class="age">${fmt(x.date)}</span></td>`
      + `<td data-label="Bugs">${x.bugsThen.map((b) => `${esc(b.id)} ${tag(b.impactThen)}`).join('<br>')}</td>`
      + `<td data-label="Accountable">${esc(x.accountable)}<br><span class="age">Consulted: ${esc(x.consulted)}</span></td>`
      + `<td data-label="Why, protection and residual risk">${esc(x.reason)} ${protection} <em>Residual risk: ${esc(x.residualRisk)}</em></td>`
      + `<td data-label="Promised">${esc(x.followUp.action)} by ${fmt(x.followUp.due)}<br><span class="status ${FOLLOW_CLS[x.followUpStatus]}">${esc(followText(x))}</span></td></tr>`;
  }
  function signOffPanel(m) {
    return `<section class="panel">
      <h2>Known urgent bugs accepted at go-live</h2>
      <p class="help">Anything that goes live with an open High or Very high bug linked to it needs a recorded sign-off: who is accountable, why, how users are protected at that moment (active, proposed or none), the residual risk, and what was promised by when. Whether a protection became active and whether the promise was kept come from the bug's own history, not from the sign-off. Some risks can't be signed off at all: an active incident, a safety risk, an unmitigated security vulnerability or a confirmed legal breach blocks go-live. In Scrum, this is the sprint release or milestone; in Kanban, when a feature goes live for everyone or an epic is closed.</p>
      <div class="table-wrap"><table class="stack">
        <caption class="sr">Go-live sign-offs with open urgent bugs, and whether the promised follow-up happened</caption>
        <thead><tr><th scope="col">What went live</th><th scope="col">Bugs (impact then)</th><th scope="col">Accountable</th><th scope="col">Why, protection and residual risk</th><th scope="col">Promised</th></tr></thead>
        <tbody>${m.signOffs.map(signOffRow).join('') || '<tr><td colspan="5">None in this period.</td></tr>'}</tbody>
      </table></div>
    </section>`;
  }

  function sharePanel(m, filtered) {
    const rows = m.capacity.flatMap((c) => {
      const mon = short(c.month + '-01').split(' ')[1] + (c.toDate ? ' to date' : '');
      return [{ label: `${mon} planned`, count: c.planned, text: c.planned + '%' }, { label: `${mon} done`, count: c.done, text: c.done + '%' }];
    });
    return `<section class="panel">
      <h2>What share of completed tickets were bugs or tech debt?${filtered ? ' <span class="optional">All teams</span>' : ''}</h2>
      <p class="help">Each month's share of completed tickets that were bugs or tech debt, against the share planned. Counted from Jira (tickets resolved in the month, by type), so no time tracking is needed. It counts tickets, not effort: a one-line fix and a two-week investigation both count as one, so read it as a signal, not a measure of time spent. A month appears once its report exists; the current month is shown to date.${filtered ? ' This panel covers all teams and doesn\'t follow the filters.' : ''}</p>
      ${rows.length ? bars(rows, 25) : '<p>No monthly report yet on this date.</p>'}
    </section>`;
  }

  function renderMonth() {
    const m = M.month(DATA.issues, state.asOf, filter(), DATA);
    const sum = M.summary(DATA.issues, state.asOf, filter(), DATA);
    const ai = M.aiHelp(DATA.issues, state.asOf, filter());
    const more = [exposurePanels(m), aiPanel(ai), sharePanel(m, !!(state.team || state.impact))].join('\n');
    return [summaryPanel(sum), `<div class="goals">${m.goals.map(goalCard).join('')}</div>`, risksPanel(m), signOffPanel(m),
      `<details class="explore"><summary><span class="explore-title">Explore the trends</span><span class="explore-sub">Weighted exposure over time, open bugs by team, "Is AI helping?" and the share of work spent on bugs</span></summary>\n${more}\n</details>`].join('\n');
  }

  // ---------- How it works ----------
  // The labels from docs/labels-guide.md: name, whether it's mandatory, who adds it.
  const LABELS = [
    ["bug-reviewed", "Mandatory", "Automatic at triage, removed when the review date passes"],
    ["reproducible / not-reproducible", "Mandatory", "QA or whoever tries, after a real attempt"],
    ["needs-triage, needs-pickup, needs-review, needs-decision", "Automatic", "Automation, when something is overdue"],
    ["incident", "For P0 in production", "The incident process, or on-call"],
    ["regression", "Recommended", "QA or a developer"],
    ["ai-drafted", "When it applies", "The AI tool, automatically"],
    ["found-with-ai", "Optional", "The reporter"],
    ["cause-*", "Optional", "The developer who fixed it, or the prevention review"],
    ["go-live-signoff", "When it applies", "The product owner, on a release or epic that went live with an open urgent bug"],
    ["customer-reported", "Optional", "Automatic, from support"],
  ];

  function renderHow() {
    const MATRIX = [['Low', 'Low', 'Low', 'Medium'], ['Low', 'Low', 'Medium', 'Medium'], ['Medium', 'High', 'High', 'Very high'], ['Medium', 'High', 'Very high', 'Very high']];
    const sev = ['Low', 'Medium', 'High', 'Very high'];
    const matrix = sev.map((s, i) => `<tr><th scope="row">${s}</th>${MATRIX[i].map((c) => `<td>${tag(c)}</td>`).join('')}</tr>`).join('');
    const rules = ['Very high', 'High', 'Medium', 'Low'].map((l) => `<tr><th scope="row">${tag(l)}</th><td class="n">${P.points[l]}</td><td>${P.fixTarget[l] ? P.fixTarget[l] + ' days' : l === 'Medium' ? 'Planned, or deferred with a date' : 'Linked to planned work, or closed'}</td><td>${{ 'Very high': 'Daily, until fixed or mitigated', 'High': 'Weekly', 'Medium': 'Monthly', 'Low': 'Quarterly' }[l]}</td><td>${P.decisionAge[l]} days</td><td>${P.escalationAge[l] ? P.escalationAge[l] + ' days' : 'Close or link to planned work'}</td></tr>`).join('');
    return `
    <section class="panel disclaimer" aria-label="Disclaimer">
      <h2>Before you start</h2>
      <p>This is a comprehensive strategy, written to show the full picture. Most teams won't need all of it. Simplify it to fit your team's way of working (Scrum or Kanban), your tools and your internal processes. The thresholds, labels, meetings and panels here are examples to adapt, not rules.</p>
      <p><strong>A good place to start:</strong> impact scoring, triage within ${P.triageWithin} days, a weekly look at urgent bugs, and a review date on every deferral. Add the rest only when it solves a real problem.</p>
    </section>
    <section class="panel">
      <h2>1. How we score impact</h2>
      <p class="help">Impact combines how bad it is for the user (severity) with how many users it reaches, read from the matrix below and then adjusted for exceptional risk. It measures harm to users, not effort or blame. It informs the decision about what to fix first; it doesn't make it.</p>
      <div class="grid2">
        <div><h3>Severity</h3><ul>
          <li><strong>Very high:</strong> a core journey is impossible, money or data is lost or exposed, or there's a safety or compliance risk with no workaround.</li>
          <li><strong>High:</strong> a major function is broken or a key journey is blocked, including for people using assistive technology (for example a WCAG 2.2 AA failure on checkout).</li>
          <li><strong>Medium:</strong> something is degraded or awkward, usually with a workaround.</li>
          <li><strong>Low:</strong> cosmetic, nothing stops working.</li></ul>
          <p class="help">A safe workaround caps severity at Medium, unless safety or compliance is involved.</p></div>
        <div><h3>Users affected</h3><ul>
          <li><strong>Very large:</strong> over 25% of users, or everyone.</li>
          <li><strong>Large:</strong> 10 to 25%, or most people on one key journey.</li>
          <li><strong>Medium:</strong> 1 to 10%, or one group such as a device, browser or role.</li>
          <li><strong>Low:</strong> under 1%, a rare setup.</li></ul>
          <p class="help">Raise the result one level for safety, legal or regulatory exposure, or money at risk, and write the reason on the ticket.</p></div>
      </div>
      <div class="table-wrap"><table class="matrix">
        <caption>Impact, from severity (rows) and users affected (columns)</caption>
        <thead><tr><th scope="col">Severity</th><th scope="col">Low</th><th scope="col">Medium</th><th scope="col">Large</th><th scope="col">Very large</th></tr></thead>
        <tbody>${matrix}</tbody>
      </table></div>
    </section>
    <section class="panel">
      <h2>2. What each level means in practice</h2>
      <div class="table-wrap"><table>
        <caption class="sr">Rules by impact level</caption>
        <thead><tr><th scope="col">Impact</th><th scope="col" class="n">Weight</th><th scope="col">Fix or mitigate within</th><th scope="col">Review</th><th scope="col">Needs a plan by</th><th scope="col">Leadership decides at</th></tr></thead>
        <tbody>${rules}</tbody>
      </table></div>
      <p class="take">A plan means one of three things: being worked on, deferred with a reason and a review date, or closed with a written reason. Escalating to leadership isn't a plan until leadership decides. These limits are starting values for a pilot, not fixed rules.</p>
    </section>
    <section class="panel">
      <h2>3. What we fix first</h2>
      <p class="help">Impact says how much harm a bug does. Priority says when we work on it. Impact suggests a starting priority; at triage, QA, a developer and the product owner agree it together, and can move it up or down for a good reason, such as a release date or a cheap fix in code already being changed.</p>
      <div class="table-wrap"><table>
        <caption class="sr">Priorities and what they mean</caption>
        <thead><tr><th scope="col">Priority</th><th scope="col">What happens</th><th scope="col">Usually</th></tr></thead>
        <tbody>
          <tr><th scope="row">${prio('P0')} Emergency</th><td>Stop current work. The team swarms until it's fixed or mitigated, then plans the full fix.</td><td>Very high in production; an incident; money, data, safety or compliance at risk right now</td></tr>
          <tr><th scope="row">${prio('P1')} Next up</th><td>Ahead of new feature work in the current sprint, within the fix target.</td><td>High; Very high found before release (it blocks that release)</td></tr>
          <tr><th scope="row">${prio('P2')} Planned</th><td>Scheduled into a sprint, milestone or tech debt window.</td><td>Medium; the structural fix after a mitigation</td></tr>
          <tr><th scope="row">${prio('P3')} Later</th><td>Linked to planned work, or looked at again on its review date.</td><td>Low; deferred bugs</td></tr>
        </tbody>
      </table></div>
      <p class="take">Developers pick up work in this order: P0 emergencies, then the team's agreed order of P1 bugs, then P2 bugs planned for this sprint or milestone. A small bug in code you're already changing can be fixed in the same pull request; just tell QA.</p>
    </section>
    <div class="grid2">
      <section class="panel">
        <h2>4. The life of a bug</h2>
        <ol>
          <li><strong>New:</strong> raised with the bug template.</li>
          <li><strong>Ready:</strong> triaged within ${P.triageWithin} days (late from day ${P.triageWithin + 1}): impact scored, priority agreed, review date set. The owner is the team whose board it's on.</li>
          <li><strong>In progress:</strong> being fixed or mitigated. Max ${P.urgentInProgressLimit} urgent bugs per team at once.</li>
          <li><strong>Verification:</strong> checked by someone other than the developer who fixed it, on the browsers, devices and locales it affected. QA for High and Very high or complex fixes; a peer for the rest.</li>
          <li><strong>Closed:</strong> fixed, or closed with a reason: duplicate, not reproducible, or risk accepted (Low or Medium only).</li>
        </ol>
        <p class="help"><strong>Deferred</strong> sits beside these: still open, with a reason from a fixed list and a review date. It's also where accepted High and Very high risks and bugs being monitored for more evidence live.</p>
      </section>
      <section class="panel">
        <h2>5. Words we use</h2>
        <dl class="facts">
          <dt>Urgent</dt><dd>High or Very high impact.</dd>
          <dt>Priority</dt><dd>When we work on it, agreed together at triage. P0 means stop and fix now.</dd>
          <dt>Mitigated</dt><dd>Users are protected (rollback, flag, guard or workaround) but the root cause is still there. Record how much: removes the risk, reduces it, or relies on a manual step. Then re-score.</dd>
          <dt>Deferred</dt><dd>A conscious, dated decision not to fix now.</dd>
          <dt>Accepted</dt><dd>The product owner (leadership, for High and Very high) decides to live with it, in writing, with what would make us look again.</dd>
          <dt>Weighted exposure</dt><dd>Each open bug adds 8, 4, 2 or 1 by level. A ranking convention so one serious bug outweighs a few small ones, not a measure of money or customers. Always read it with the counts by level.</dd>
          <dt>Days</dt><dd>The day a bug is raised is day 0. "Within 14 days" is met through day 14 and late from day 15; a review date is overdue the day after it.</dd>
          <dt>Escalation</dt><dd>Leadership chooses: fix next milestone, or accept the risk.</dd>
        </dl>
        <p><a href="https://github.com/AlexandraBadescu/impact-led-bug-management/blob/main/docs/playbook.md">Read the full playbook</a></p>
      </section>
    </div>
    <section class="panel">
      <h2>6. Labels we use</h2>
      <p class="help">Jira's built-in labels, so there's nothing to set up. As few are mandatory as possible; state labels are automatic; people add judgement labels; AI only adds labels about its own work. No label is ever about a person.</p>
      <div class="table-wrap"><table>
        <caption class="sr">Labels, whether they're mandatory, and who adds them</caption>
        <thead><tr><th scope="col">Label</th><th scope="col">Mandatory?</th><th scope="col">Added by</th></tr></thead>
        <tbody>${LABELS.map(([l, m, by]) => `<tr><th scope="row"><code>${esc(l)}</code></th><td>${esc(m)}</td><td>${esc(by)}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="take">Mandatory means checked at triage and shown on "What information is missing?", never enforced with a blocked ticket.</p>
    </section>`;
  }

  // ---------- Bug history ----------
  function describe(changes) {
    const out = [];
    if (changes.status) out.push(changes.resolution && changes.status === 'Closed' ? `Closed as ${changes.resolution.toLowerCase()}` : changes.resolution === 'Reopened' ? 'Reopened' : `Status: ${changes.status}`);
    if (changes.impact) out.push(`Impact: ${changes.impact}${changes.severity ? ` (severity ${changes.severity}, users ${changes.users})` : ''}`);
    if (changes.priority) out.push(`Priority: ${changes.priority}`);
    if (changes.reproducible === true) out.push('Reproduced by the team'); else if (changes.reproducible === false) out.push('Not reproducible yet');
    if (changes.triaged) out.push('Reviewed by the team (bug-reviewed)');
    if (changes.assignee) out.push(`Picked up by: ${changes.assignee}`);
    if (changes.mitigated) out.push('Users protected from this date');
    if (changes.decision) out.push(`Decision: ${changes.decision}`);
    if (changes.deferralReason) out.push(`Why deferred: ${changes.deferralReason}`);
    if (changes.mitigation) out.push(`Protection: ${changes.mitigation}${changes.mitigationType ? ` (${changes.mitigationType.toLowerCase()})` : ''}`);
    if (changes.rescoreReason) out.push(changes.rescoreReason);
    if (changes.escalated) out.push('Escalated to leadership');
    if (changes.escalationDecision) out.push(`Leadership decided: ${changes.escalationDecision}`);
    if (changes.acceptedBy) out.push(`Accepted by: ${changes.acceptedBy}`);
    if (changes.lookAgainIf) out.push(`Look again if: ${changes.lookAgainIf}`);
    if (changes.reviewDue) out.push(`Next review: ${fmt(changes.reviewDue)}`);
    if (changes.closureReason) out.push(`Reason: ${changes.closureReason}`);
    if (changes.rootCause) out.push(`Cause label: ${changes.rootCause}`);
    if (changes.prevention) out.push(`Added: ${changes.prevention}`);
    return out;
  }
  function openBug(id) {
    const issue = DATA.issues.find((i) => i.id === id), s = M.stateAt(issue, state.asOf);
    $('dlg-title').textContent = `${id}: ${issue.title}`;
    const facts = [
      ['Team · area', `${s.team} · ${s.area}`], ['Impact now', s.impact || 'Not scored'], ['Impact when first scored', s.firstImpact ? `${s.firstImpact}${s.raisedBy ? ` (raised one level: ${s.raisedBy})` : ''}` : 'Not scored yet'],
      ['Priority', s.priority || 'Not agreed yet'], ['Reproducible', s.reproState], ['Reviewed by the team', s.reviewState === 'Reviewed' ? `Yes, last on ${fmt(s.reviewed)}` : s.reviewState], ['Status', s.status], ['Owner', `${s.team} (team)`], ['Assignee', s.assignee || 'Not picked up yet'], ['Found', `${issue.foundIn}, by ${issue.foundBy}`], ['Raised', `${fmt(issue.created)} (${s.age} days ago)`],
      ['Next review', fmt(s.reviewDue)], ['Next step', s.open ? M.nextStep(s) : 'None, closed'],
    ];
    const events = [{ date: issue.created, changes: { status: 'New' } }, ...issue.events.filter((e) => e.date <= state.asOf)];
    $('dlg-body').innerHTML = `<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${issue.note && issue.noteDate <= state.asOf ? `<p class="take">${esc(issue.note)}</p>` : ''}
      <h3>History</h3><ol class="timeline">${events.map((e) => `<li><time datetime="${e.date}">${fmt(e.date)}</time>${describe(e.changes).map(esc).join('<br>')}</li>`).join('')}</ol>`;
    $('dlg').showModal();
  }

  // ---------- CSV ----------
  function exportCsv() {
    const rows = M.states(DATA.issues, state.asOf, filter());
    const cols = ['id', 'title', 'team', 'area', 'status', 'priority', 'impact', 'reproState', 'reviewState', 'assignee', 'age', 'foundIn', 'foundBy', 'reviewDue', 'decision', 'deferralReason', 'mitigationType', 'resolution', 'rootCause'];
    const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bug-decisions-${state.asOf}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Wiring ----------
  function render() {
    const v = VIEWS[state.view];
    $('eyebrow').textContent = v.eyebrow; $('title').textContent = v.title; $('lead').textContent = v.lead;
    $('who').innerHTML = v.who.map((w) => `<li>${esc(w)}</li>`).join('');
    $('filters').hidden = state.view === 'how';
    document.querySelectorAll('.nav a').forEach((a) => { if (a.getAttribute('href') === '#' + state.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = `${v.title.replace('?', '')} · Bug Decisions demo`;
    $('view').innerHTML = regions({ today: renderToday, week: renderWeek, month: renderMonth, how: renderHow }[state.view]());
    // Sizes are set through the CSSOM, which a strict content security policy allows; inline style attributes are blocked.
    $('view').querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w + '%'; });
    $('view').querySelectorAll('[data-h]').forEach((el) => { el.style.height = el.dataset.h + 'px'; });
  }
  function fromHash() { const h = location.hash.slice(1); state.view = VIEWS[h] ? h : 'today'; render(); }

  const teams = [...new Set(DATA.issues.map((i) => i.team))].sort();
  $('team').insertAdjacentHTML('beforeend', teams.map((t) => `<option>${esc(t)}</option>`).join(''));
  $('asof').value = DATA.asOf; $('asof').max = DATA.asOf; $('asof').min = DATA.issues.map((i) => i.created).sort()[0];
  $('asof').addEventListener('change', (e) => { if (e.target.value) { state.asOf = e.target.value; render(); } });
  $('team').addEventListener('change', (e) => { state.team = e.target.value; render(); });
  $('impact').addEventListener('change', (e) => { state.impact = e.target.value; render(); });
  $('export').addEventListener('click', exportCsv);
  // The filters never submit anywhere. This replaces an inline onsubmit attribute, which the security policy blocks.
  $('filters').addEventListener('submit', (e) => e.preventDefault());
  $('view').addEventListener('click', (e) => {
    const b = e.target.closest('.idbtn'); if (b) openBug(b.dataset.id);
    if (e.target.closest('#toggle-actions')) { state.showAllActions = !state.showAllActions; render(); $('toggle-actions').focus(); }
  });
  $('dlg-close').addEventListener('click', () => $('dlg').close());
  // Hover tooltip for chart segments. Each bar also has a text alternative and a table view, so nothing depends on hover.
  const tip = document.createElement('div');
  tip.id = 'tip'; tip.setAttribute('aria-hidden', 'true'); tip.hidden = true;
  document.body.appendChild(tip);
  $('view').addEventListener('mousemove', (e) => {
    const seg = e.target.closest('[data-tip]');
    if (!seg) { tip.hidden = true; return; }
    tip.textContent = seg.dataset.tip; tip.hidden = false;
    const svg = seg.closest('svg'), guide = svg && svg.querySelector('.guide');
    if (guide && seg.dataset.x) { guide.setAttribute('x1', seg.dataset.x); guide.setAttribute('x2', seg.dataset.x); guide.setAttribute('visibility', 'visible'); }
    const x = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  $('view').addEventListener('mouseleave', () => { tip.hidden = true; $('view').querySelectorAll('.guide').forEach((g) => g.setAttribute('visibility', 'hidden')); });
  let resizeTimer, wasNarrow = narrow();
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (narrow() !== wasNarrow) { wasNarrow = narrow(); render(); } }, 150); });
  window.addEventListener('hashchange', () => { fromHash(); $('main').focus(); });
  fromHash();
})();
