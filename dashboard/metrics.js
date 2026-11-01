// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// The rules from docs/playbook.md, as code. The dashboard and the tests both use this file.
// All dates are calendar days in UTC, so results don't change with the viewer's time zone.
// One deadline rule everywhere: a limit of N days is met through day N and missed from day N + 1, counting the day a
// bug was raised as day 0. A review date is met through that date and overdue the day after. The Jira filters in
// docs/jira-setup.md use the same rule (created < startOfDay(-Nd)).
(function (root) {
  'use strict';
  const DAY = 86400000;

  const POLICY = {
    // Weights for the weighted backlog exposure: a ranking convention, not a measure of harm (docs/playbook.md, section 3).
    points: { 'Very high': 8, 'High': 4, 'Medium': 2, 'Low': 1 },
    // Fix or mitigate within this many days of the bug being raised.
    fixTarget: { 'Very high': 7, 'High': 14 },
    // A bug at this age must have a plan: in progress, deferred with a date, or closed.
    decisionAge: { 'Very high': 30, 'High': 30, 'Medium': 90, 'Low': 180 },
    // Still open at this age: leadership decides to fix next milestone or accept the risk.
    escalationAge: { 'Very high': 90, 'High': 90, 'Medium': 180 },
    // How often each level is reviewed.
    reviewEvery: { 'Very high': 1, 'High': 7, 'Medium': 30, 'Low': 90 },
    triageWithin: 2,          // days to score impact and agree priority
    urgentInProgressLimit: 3, // High and Very high bugs being worked on at once, per team
    goals: { fixedOnTime: 0.8 },
    aiStopRule: 0.2,          // pause AI drafting if more than 1 in 5 AI-drafted tickets is rejected...
    aiMinOutcomes: 10,        // ...but only judge once at least 10 AI drafts have an outcome at triage
  };
  // Closing as "Accepted risk" is only for these levels. Higher risks that are accepted stay open (Deferred, reason
  // "Risk accepted"), so they keep counting in weighted exposure and stay on the leadership view.
  const CLOSE_AS_ACCEPTED = ['Medium', 'Low'];
  const LEVELS = ['Very high', 'High', 'Medium', 'Low'];
  const URGENT = ['Very high', 'High'];

  const day = (s) => Date.parse(s + 'T00:00:00Z');
  const daysBetween = (a, b) => Math.floor((day(b) - day(a)) / DAY);
  const minus = (s, n) => new Date(day(s) - n * DAY).toISOString().slice(0, 10);
  const median = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

  // The state of one bug on a given day, rebuilt from its history. Only what was known by that day goes in:
  // the record's fixed facts (when and where it was raised, by what, with which labels) and the events up to that day.
  const FIXED = ['id', 'title', 'team', 'area', 'created', 'labels', 'foundIn', 'foundBy'];
  function stateAt(issue, asOf) {
    if (issue.created > asOf) return null;
    const s = { status: 'New', impact: null, firstImpact: null, severity: null, users: null, raisedBy: null, assignee: null, triaged: null, reviewed: null, reviewDue: null,
      decision: null, priority: null, reproducible: null, mitigated: null, firstMitigated: null, closed: null, resolution: null, reopenedCount: 0,
      deferralReason: null, mitigation: null, mitigationType: null, escalated: null, escalationDecision: null,
      acceptedBy: null, lookAgainIf: null, closureReason: null, rootCause: null, prevention: null, retired: null };
    for (const f of FIXED) s[f] = issue[f];
    for (const e of issue.events) {
      if (e.date > asOf) break;
      Object.assign(s, e.changes);
      if (e.changes.impact && !s.firstImpact) s.firstImpact = e.changes.impact; // impact when first scored
      if (e.changes.mitigated && !s.firstMitigated) s.firstMitigated = e.changes.mitigated;
      if (e.changes.resolution === 'Reopened') s.reopenedCount++;
      s.updated = e.date;
    }
    s.age = daysBetween(s.created, asOf);
    s.open = s.status !== 'Closed';
    s.urgent = s.open && URGENT.includes(s.impact);
    s.emergency = s.open && s.priority === 'P0';
    // Urgent bugs nobody has picked up 2 days after triage (P0s: straight away). The engineering manager and product owner agree who picks it up.
    s.notPickedUp = s.open && URGENT.includes(s.impact) && !s.assignee && !s.mitigated && !!s.triaged && (s.emergency || daysBetween(s.triaged, asOf) > POLICY.triageWithin);
    // Reproducibility (Jira labels reproducible / not-reproducible) and team review (label bug-reviewed, set at triage).
    s.notReproduced = s.open && s.reproducible === false;
    s.reproState = s.reproducible === true ? 'Reproducible' : s.reproducible === false ? 'Not reproducible yet' : 'Not checked yet';
    s.points = s.open ? (POLICY.points[s.impact] || 0) : 0;
    s.deferred = s.open && s.status === 'Deferred';
    s.active = s.open && ['In progress', 'Verification'].includes(s.status);
    // Triaged means the team has reviewed it (label bug-reviewed) and it has an impact score.
    s.untriaged = s.open && (!s.triaged || !s.impact);
    s.triageLate = s.untriaged && s.age > POLICY.triageWithin;
    s.reviewOverdue = s.open && !!s.reviewDue && s.reviewDue < asOf;
    const target = POLICY.fixTarget[s.impact];
    s.pastFixTarget = s.urgent && !s.mitigated && target != null && s.age > target;
    s.noPlan = s.open && !!s.impact && s.age > POLICY.decisionAge[s.impact] && !s.deferred && !s.active && !s.escalated;
    const esc = POLICY.escalationAge[s.impact];
    // Escalating is not deciding: once escalated, the bug waits for leadership's fix-or-accept decision, and is shown as such.
    s.decisionPending = s.open && !!s.escalated && !s.escalationDecision;
    s.needsEscalation = s.open && esc != null && s.age > esc && !s.mitigated && !s.escalated;
    // A Low or Medium risk closed as accepted keeps its review date and stays listed until it's retired.
    s.acceptedRisk = !s.open && s.resolution === 'Accepted risk' && !s.retired;
    s.acceptedReviewOverdue = s.acceptedRisk && !!s.reviewDue && s.reviewDue < asOf;
    // A deferral needs a reason from the fixed list and a review date (docs/playbook.md, section 8). A workaround is optional.
    s.deferralIncomplete = s.deferred && (!s.reviewDue || !s.deferralReason);
    s.reviewState = !s.triaged ? 'Not reviewed yet' : s.reviewOverdue ? 'Due for review again' : 'Reviewed';
    s.missing = [];
    if (s.open && !s.impact) s.missing.push('Impact');
    if (s.open && s.triaged && !s.priority) s.missing.push('Priority');
    if (s.deferred && !s.deferralReason) s.missing.push('Deferral reason');
    if (s.deferred && !s.reviewDue) s.missing.push('Review date');
    return s;
  }

  function states(issues, asOf, filter = {}) {
    return issues.map((i) => stateAt(i, asOf)).filter(Boolean)
      .filter((s) => !filter.team || s.team === filter.team)
      .filter((s) => !filter.impact || (s.impact || 'Unknown') === filter.impact);
  }

  // Why a bug is on the action list, and the next step, in plain words.
  function reasons(s) {
    const r = [];
    if (!s.open) return r;
    if (s.emergency) r.push('P0 emergency');
    if (s.untriaged) r.push(s.triageLate ? 'Not triaged after 2 days' : 'New, not triaged yet');
    if (s.notPickedUp) r.push('Not picked up after 2 days');
    if (s.urgent && !s.mitigated) r.push(s.pastFixTarget ? 'Urgent and past fix target' : 'Urgent');
    if (s.reviewOverdue) r.push(s.deferred ? 'Deferral review overdue' : 'Review overdue');
    if (s.needsEscalation) r.push('Needs a leadership decision');
    if (s.decisionPending) r.push('Leadership decision pending');
    if (s.deferred && !s.deferralReason) r.push('Deferral has no reason');
    if (s.noPlan) r.push('Past age limit, no plan recorded');
    if (s.notReproduced) r.push('Not reproducible yet');
    if (s.status === 'Verification') r.push('Ready to verify');
    return r;
  }
  function nextStep(s) {
    if (s.emergency && !s.mitigated && !s.assignee) return 'Emergency: engineering manager assigns someone now; tell the product owner';
    if (s.emergency && !s.mitigated) return 'Emergency: swarm until fixed or mitigated';
    if (s.untriaged) return 'Score impact and agree priority';
    if (s.needsEscalation) return 'Ask leadership: fix next milestone, or accept the risk';
    if (s.decisionPending) return `Get leadership's fix-or-accept decision (escalated ${s.escalated})`;
    if (s.status === 'Verification') return s.pastFixTarget ? 'Verify today: it is past its fix target' : 'Verify and close';
    if (s.notPickedUp) return 'Engineering manager and product owner agree who picks it up today';
    if (s.urgent && !s.mitigated && !s.active) return 'Agree a fix or mitigation today';
    if (s.urgent && !s.mitigated) return s.pastFixTarget ? 'Fix or mitigate now; tell stakeholders' : 'Fix or mitigate within target';
    if (s.reviewOverdue && s.deferred) return 'Review the deferral: fix, re-defer with a date, or close';
    if (s.deferred && !s.deferralReason) return 'Record why it was deferred, or pick it up';
    if (s.noPlan) return 'Decide: fix, defer with a date, or close';
    if (s.reviewOverdue) return 'Review and record the next step';
    if (s.notReproduced && !s.active) return 'Reproduce it: pair with the reporter, or add logging';
    if (s.status === 'Verification') return 'Verify and close';
    return 'Keep going';
  }
  // The action list follows the order developers pick up work:
  // P0 emergencies, then untriaged bugs (they could be emergencies), then agreed P1 work, then decisions due.
  const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
  function rank(s) {
    if (s.emergency) return 0;
    if (s.untriaged) return 1;
    if (s.priority === 'P1' || s.urgent) return 2;
    if (s.needsEscalation || s.decisionPending) return 3;
    if (s.noPlan || s.reviewOverdue || s.deferralIncomplete) return 4;
    return 5;
  }
  function actionQueue(rows) {
    return rows.filter((s) => reasons(s).length)
      .sort((a, b) => rank(a) - rank(b) || (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || b.age - a.age || a.id.localeCompare(b.id));
  }

  // Daily view.
  function today(issues, asOf, filter) {
    const all = states(issues, asOf, filter), open = all.filter((s) => s.open);
    const teams = teamsOn(issues, asOf, filter);
    const undecided = open.filter((s) => s.noPlan || s.needsEscalation || s.decisionPending);
    return {
      open,
      urgentOpen: open.filter((s) => s.urgent),
      emergencies: open.filter((s) => s.emergency),
      untriaged: open.filter((s) => s.untriaged),
      triageLate: open.filter((s) => s.triageLate),
      notPickedUp: open.filter((s) => s.notPickedUp),
      reviewOverdue: open.filter((s) => s.reviewOverdue),
      // "Old bugs without a decision": no plan recorded, plus escalated bugs still waiting for leadership.
      undecided,
      noPlan: undecided.filter((s) => !s.decisionPending),
      decisionPending: undecided.filter((s) => s.decisionPending),
      queue: actionQueue(open),
      wip: teams.map((team) => ({ team, count: open.filter((s) => s.team === team && s.urgent && s.active).length, limit: POLICY.urgentInProgressLimit })),
      repro: ['Reproducible', 'Not reproducible yet', 'Not checked yet'].map((label) => ({ label, count: open.filter((s) => s.reproState === label).length })),
      reviewed: ['Reviewed', 'Due for review again', 'Not reviewed yet'].map((label) => ({ label, count: open.filter((s) => s.reviewState === label).length })),
      missing: ['Impact', 'Priority', 'Deferral reason', 'Review date'].map((field) => ({ field, count: open.filter((s) => s.missing.includes(field)).length })),
    };
  }

  // Events in a date range (inclusive), for flow counts.
  function eventsIn(issues, start, end, filter) {
    let created = 0, fixed = 0, other = 0, reopened = 0;
    for (const issue of issues) {
      const s = stateAt(issue, end);
      if (!s) continue;
      if (filter && filter.team && s.team !== filter.team) continue;
      if (filter && filter.impact && (s.impact || 'Unknown') !== filter.impact) continue;
      if (issue.created >= start && issue.created <= end) created++;
      for (const e of issue.events) {
        if (e.date < start || e.date > end) continue;
        if (e.changes.status === 'Closed') e.changes.resolution === 'Fixed' ? fixed++ : other++;
        if (e.changes.resolution === 'Reopened') reopened++;
      }
    }
    return { created, fixed, other, reopened };
  }

  function weekly(issues, asOf, filter, weeks = 8) {
    return Array.from({ length: weeks }, (_, i) => minus(asOf, 7 * (weeks - 1 - i))).map((end) => {
      const open = states(issues, end, filter).filter((s) => s.open);
      return { end, ...eventsIn(issues, minus(end, 6), end, filter), points: open.reduce((a, s) => a + s.points, 0), unknown: open.filter((s) => !s.impact).length };
    });
  }

  // Teams that had bugs on the day, so a past date never reveals a team that only appeared later.
  function teamsOn(issues, asOf, filter) {
    return [...new Set(states(issues, asOf).map((s) => s.team))].sort().filter((t) => !filter || !filter.team || t === filter.team);
  }

  // Weekly view.
  function week(issues, asOf, filter) {
    const start28 = minus(asOf, 27), start90 = minus(asOf, 89);
    const all = states(issues, asOf, filter);
    const flow28 = eventsIn(issues, start28, asOf, filter);
    const fixedOrClosed = flow28.fixed + flow28.other;
    // Time to fix or mitigate urgent bugs (by the impact they had when raised), last 90 days.
    const byLevel = URGENT.map((level) => {
      const done = all.filter((s) => s.firstImpact === level && s.firstMitigated && s.firstMitigated >= start90 && s.firstMitigated <= asOf);
      const days = done.map((s) => daysBetween(s.created, s.firstMitigated));
      const target = POLICY.fixTarget[level];
      // Still open, urgent now, not mitigated and past its target: the same rule as the Today view.
      const openLate = all.filter((s) => s.impact === level && s.pastFixTarget);
      return { level, target, count: done.length, median: median(days), withinTarget: days.filter((d) => d <= target).length, openLate: openLate.length };
    });
    const recent = all.filter((s) => s.created >= start90);
    const caught = { before: recent.filter((s) => s.foundIn !== 'Production').length, production: recent.filter((s) => s.foundIn === 'Production').length };
    const foundBy = countBy(recent, (s) => s.foundBy);
    const fixed90 = all.filter((s) => s.status === 'Closed' && s.resolution === 'Fixed' && s.closed >= start90);
    // Cause labels are optional, so this looks only where learning matters: fixed urgent bugs and anything reopened.
    const reviewSet = fixed90.filter((s) => URGENT.includes(s.firstImpact) || s.reopenedCount > 0);
    const rootCauses = countBy(reviewSet, (s) => s.rootCause || 'No cause label yet');
    const prevention = fixed90.filter((s) => s.prevention).map((s) => ({ id: s.id, rootCause: s.rootCause, prevention: s.prevention }));
    const open = all.filter((s) => s.open);
    const areas = [...new Set(open.map((s) => s.team + ' · ' + s.area))].sort();
    const hotspots = areas.map((key) => {
      const rows = open.filter((s) => s.team + ' · ' + s.area === key);
      return { area: key, cells: countByLevel(rows), points: rows.reduce((a, s) => a + s.points, 0) };
    }).sort((a, b) => b.points - a.points || a.area.localeCompare(b.area));
    return { flow28, reopenRate: flow28.fixed ? flow28.reopened / flow28.fixed : null, fixedOrClosed, byLevel, caught, foundBy, rootCauses, prevention, hotspots, weekly: weekly(issues, asOf, filter) };
  }

  // Monthly view: the four goals.
  function month(issues, asOf, filter, data) {
    const all = states(issues, asOf, filter), open = all.filter((s) => s.open);
    const points = open.reduce((a, s) => a + s.points, 0);
    const before = states(issues, minus(asOf, 28), filter).filter((s) => s.open).reduce((a, s) => a + s.points, 0);
    const w = week(issues, asOf, filter);
    const done = w.byLevel.reduce((a, l) => a + l.count, 0), onTime = w.byLevel.reduce((a, l) => a + l.withinTarget, 0);
    const shareOnTime = done ? onTime / done : null;
    // The on-time rate only covers finished work, so it can look healthy while urgent bugs sit overdue.
    // Overdue open bugs are shown beside it, and they cap the status: any at all is Watch, 3 or more is Off track.
    const openLate = open.filter((s) => s.pastFixTarget);
    const rateStatus = shareOnTime == null ? 'Watch' : shareOnTime >= 0.8 ? 'On track' : shareOnTime >= 0.6 ? 'Watch' : 'Off track';
    const lateStatus = openLate.length === 0 ? 'On track' : openLate.length < 3 ? 'Watch' : 'Off track';
    const ORDER = ['On track', 'Watch', 'Off track'];
    const noPlan = open.filter((s) => s.noPlan || s.needsEscalation), pending = open.filter((s) => s.decisionPending);
    const undecided = noPlan.length + pending.length;
    const deferred = open.filter((s) => s.deferred);
    const badDeferrals = deferred.filter((s) => s.reviewOverdue || s.deferralIncomplete);
    const levelCounts = [...LEVELS, 'Unknown'].map((l) => `${open.filter((s) => (s.impact || 'Unknown') === l).length} ${l === 'Unknown' ? 'not scored' : l}`).join(' · ');
    // Every headline number says what it counts, out of what, over which period, what's in and out, and which decision it supports.
    const goals = [
      { id: 'G1', goal: 'Urgent bugs are fixed or mitigated quickly', metric: 'High and Very high bugs fixed or mitigated within target, of those finished in the last 90 days',
        value: shareOnTime == null ? 'No data' : Math.round(shareOnTime * 100) + '%', detail: `${onTime} of ${done} finished`, target: 'at least 80%, and none open past target',
        alongside: `${openLate.length} still open past target`, openLate: openLate.map((s) => s.id),
        status: ORDER[Math.max(ORDER.indexOf(rateStatus), ORDER.indexOf(lateStatus))],
        definition: { counts: 'bugs whose users were protected within the target (7 days for Very high, 14 for High), counted from the day raised to the first mitigation or the release of the fix',
          outOf: 'bugs scored High or Very high when first scored, whose users were first protected in the last 90 days', period: 'last 90 days, ending on the As of date',
          excludes: 'urgent bugs not protected yet. They can\'t be rated, so they are listed beside the rate and cap its status: any is Watch, 3 or more is Off track',
          decision: 'whether urgent bugs need more capacity or faster mitigation' } },
      { id: 'G2', goal: 'Weighted backlog exposure goes down', metric: 'Weighted exposure of open bugs (Very high 8, High 4, Medium 2, Low 1), compared with 4 weeks ago',
        value: String(points), detail: `${before} four weeks ago`, target: 'lower than 4 weeks ago', alongside: `Open bugs: ${levelCounts}`, openLate: [],
        status: points < before ? 'On track' : points === before ? 'Watch' : 'Off track',
        definition: { counts: 'the sum of the weights of every open, scored bug', outOf: 'not a rate: compared with the same sum 4 weeks earlier', period: 'a snapshot on the As of date and 28 days before',
          excludes: 'closed bugs, including Low and Medium risks closed as accepted (listed separately), and bugs not scored yet (counted beside it). '
            + 'The weights are a ranking convention, not money or customers: a Very high bug isn\'t "worth" eight Low ones, and re-scoring moves the total without anything being fixed',
          decision: 'whether open risk is building up overall; read it with the counts by level, never alone' } },
      { id: 'G3', goal: 'No bug gets old without a decision', metric: 'Open bugs past their age limit without a decision',
        value: String(undecided), detail: `${noPlan.length} no plan recorded · ${pending.length} leadership decision pending`, target: '0',
        status: undecided === 0 ? 'On track' : undecided <= 3 ? 'Watch' : 'Off track',
        definition: { counts: 'open bugs past their age limit (30 days for High and Very high, 90 for Medium, 180 for Low) that are not in progress, verification or deferred; '
            + 'plus bugs past the leadership age and not escalated, and escalated bugs with no decision yet',
          outOf: 'not a rate: a list to clear', period: 'on the As of date', excludes: 'bugs being worked on, deferred with a reason and date, or closed',
          decision: 'which bugs need fix, defer or close, and which escalations leadership still owes' } },
      { id: 'G4', goal: 'Every deferral is a recorded decision', metric: 'Deferred bugs with no reason, no review date, or an overdue review',
        value: String(badDeferrals.length), detail: `of ${deferred.length} deferred`, target: '0',
        status: badDeferrals.length === 0 ? 'On track' : badDeferrals.length <= 3 ? 'Watch' : 'Off track',
        definition: { counts: 'deferred bugs missing a reason or a review date, or whose review date has passed', outOf: 'all open deferred bugs, including accepted High and Very high risks', period: 'on the As of date',
          excludes: 'Low and Medium risks closed as accepted; their reviews are shown with them', decision: 'which deferrals to review, re-date or pick up' } },
    ];
    const teams = [...new Set(open.map((s) => s.team))].sort();
    const exposure = teams.map((team) => {
      const mine = open.filter((s) => s.team === team);
      return { team, cells: countByLevel(mine), points: mine.reduce((a, s) => a + s.points, 0) };
    });
    // Low and Medium risks closed as accepted stay listed for leadership, with who accepted them and what would reopen them.
    const acceptedClosed = all.filter((s) => s.acceptedRisk);
    return { goals, points, before, unknown: open.filter((s) => !s.impact).length, deferred: deferred.sort((a, b) => (a.reviewDue || '').localeCompare(b.reviewDue || '')), acceptedClosed, exposure, weekly: w.weekly,
      signOffs: signOffs(issues, asOf, filter, data), capacity: capacity(asOf, data) };
  }

  // The first screen of the monthly view: what changed, what's concerning, which decisions are waiting.
  // Only facts from the views below, with bug IDs, so every line can be checked. No predictions.
  function summary(issues, asOf, filter = {}, data) {
    const m = month(issues, asOf, filter, data), t = today(issues, asOf, filter);
    const flow = eventsIn(issues, minus(asOf, 27), asOf, filter);
    const all = states(issues, asOf, filter), open = all.filter((s) => s.open);
    const ids = (xs) => xs.map((s) => s.id);
    const newUrgent = all.filter((s) => s.created >= minus(asOf, 27) && URGENT.includes(s.firstImpact));
    const diff = m.points - m.before;
    const changed = [
      { text: diff === 0 ? 'Weighted exposure is unchanged on 4 weeks ago.' : `Weighted exposure is ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)} on 4 weeks ago (${m.before} to ${m.points}).`, ids: [] },
      { text: `${flow.created} new ${flow.created === 1 ? 'bug' : 'bugs'} in 28 days, ${newUrgent.length} of them urgent; ${flow.fixed} fixed and ${flow.other} closed without a fix.`, ids: ids(newUrgent) },
    ];
    const late = open.filter((s) => s.pastFixTarget).sort((a, b) => b.age - a.age);
    const brokenPromises = m.signOffs.filter((x) => x.followUpStatus === 'Overdue');
    const acceptedDue = m.acceptedClosed.filter((s) => s.acceptedReviewOverdue);
    const concerning = [
      late.length && { text: `${late.length} urgent ${late.length === 1 ? 'bug is' : 'bugs are'} past the fix target and not mitigated; the oldest is ${late[0].age} days old.`, ids: ids(late) },
      brokenPromises.length && { text: `${brokenPromises.length} go-live ${brokenPromises.length === 1 ? 'promise is' : 'promises are'} overdue.`, ids: brokenPromises.flatMap((x) => x.bugs) },
      t.triageLate.length && { text: `${t.triageLate.length} ${t.triageLate.length === 1 ? 'bug has' : 'bugs have'} waited more than ${POLICY.triageWithin} days for triage, so their impact is unknown.`, ids: ids(t.triageLate) },
      acceptedDue.length && { text: `${acceptedDue.length} accepted ${acceptedDue.length === 1 ? 'risk is' : 'risks are'} past the date to look again.`, ids: ids(acceptedDue) },
    ].filter(Boolean);
    const decisions = [
      t.decisionPending.length && { text: `Leadership: fix or accept, for ${t.decisionPending.length === 1 ? 'an escalated bug' : 'escalated bugs'} (escalated ${t.decisionPending.map((s) => s.escalated).join(', ')}).`, ids: ids(t.decisionPending) },
      open.filter((s) => s.needsEscalation).length && { text: 'Escalate to leadership: past the leadership age and not mitigated.', ids: ids(open.filter((s) => s.needsEscalation)) },
      t.noPlan.filter((s) => s.noPlan).length && { text: 'Teams: fix, defer with a reason and date, or close.', ids: ids(t.noPlan.filter((s) => s.noPlan)) },
      open.filter((s) => s.deferred && !s.deferralReason).length && { text: 'Product owner: record why these were deferred, or pick them up.', ids: ids(open.filter((s) => s.deferred && !s.deferralReason)) },
    ].filter(Boolean);
    return { changed, concerning, decisions };
  }

  // Go-live sign-offs known on the day, with whether the promised follow-up happened, worked out from each bug's history.
  // They follow the team filter, and the impact filter by the impact each bug had when it was signed off.
  function signOffs(issues, asOf, filter = {}, data) {
    return ((data && data.signOffs) || []).filter((x) => x.date <= asOf).map((x) => {
      const bugs = x.bugs.map((id) => {
        const issue = issues.find((i) => i.id === id), then = issue && stateAt(issue, x.date), now = issue && stateAt(issue, asOf);
        const doneOn = !now ? null : x.followUp.kind === 'fixed' ? (now.status === 'Closed' && now.resolution === 'Fixed' ? now.closed : null) : now.firstMitigated;
        return { id, impactThen: then ? then.impact : null, doneOn, protectedOn: now ? now.firstMitigated : null };
      });
      const doneOn = bugs.every((b) => b.doneOn) ? bugs.map((b) => b.doneOn).sort().pop() : null;
      const due = x.followUp.due;
      const followUpStatus = doneOn ? (doneOn <= due ? 'Done' : 'Done late') : asOf > due ? 'Overdue' : 'Due';
      const protectedOn = bugs.every((b) => b.protectedOn) ? bugs.map((b) => b.protectedOn).sort().pop() : null;
      return { ...x, bugsThen: bugs, doneOn, protectedOn, followUpStatus, daysLate: !doneOn && asOf > due ? daysBetween(due, asOf) : doneOn && doneOn > due ? daysBetween(due, doneOn) : 0 };
    }).filter((x) => !filter.team || x.team === filter.team)
      .filter((x) => !filter.impact || x.bugsThen.some((b) => (b.impactThen || 'Unknown') === filter.impact));
  }
  // Monthly share of completed tickets that were bugs or tech debt. Organisation-wide, and only once each report exists.
  function capacity(asOf, data) {
    return ((data && data.capacity) || []).filter((c) => c.reported <= asOf);
  }

  // Counts of bugs per impact level, with not-scored bugs as "Unknown" (never as Low).
  function countByLevel(rows, key = (s) => s.impact) {
    const cells = {};
    for (const l of [...LEVELS, 'Unknown']) cells[l] = rows.filter((s) => (key(s) || 'Unknown') === l).length;
    return cells;
  }

  // Open bugs grouped by age, for the age distribution chart.
  const AGE_BUCKETS = [['Under 30 days', 0, 29], ['30 to 89 days', 30, 89], ['90 to 179 days', 90, 179], ['180 days or more', 180, Infinity]];
  function ageBuckets(open) {
    return AGE_BUCKETS.map(([label, lo, hi]) => {
      const rows = open.filter((s) => s.age >= lo && s.age <= hi);
      return { label, cells: countByLevel(rows) };
    });
  }

  // Median days from raised to fixed or mitigated, by impact when raised, last 90 days.
  function timeToSafe(issues, asOf, filter) {
    const start90 = minus(asOf, 89);
    const all = states(issues, asOf, filter);
    return ['Very high', 'High', 'Medium', 'Low'].map((level) => {
      const done = all.filter((s) => s.firstImpact === level && s.firstMitigated && s.firstMitigated >= start90 && s.firstMitigated <= asOf);
      const days = done.map((s) => daysBetween(s.created, s.firstMitigated));
      const target = POLICY.fixTarget[level] ?? null;
      return { level, count: done.length, median: median(days), target, withinTarget: target == null ? null : days.filter((d) => d <= target).length };
    });
  }
  // New and fixed bugs per team over the last 28 days.
  function teamFlow(issues, asOf, filter) {
    return teamsOn(issues, asOf, filter).map((team) => ({ team, ...eventsIn(issues, minus(asOf, 27), asOf, { ...(filter || {}), team }) }));
  }
  // Is AI helping? Bugs raised in the last 90 days: impact of bugs found with AI, and what happened to AI-drafted tickets
  // at intake compared with tickets people wrote. Only tickets with an outcome count: accepted at triage (scored by the
  // team), or closed as a duplicate or not reproducible. Tickets still waiting for triage are shown, not counted.
  // Stop rule: pause AI drafting if over 20% are rejected, judged only once there are at least 10 outcomes.
  const REJECTED = ['Duplicate', 'Not reproducible'];
  function aiHelp(issues, asOf, filter) {
    const start = minus(asOf, 89);
    const rows = states(issues, asOf, filter).filter((s) => s.created >= start);
    const has = (s, l) => (s.labels || []).includes(l);
    const found = rows.filter((s) => has(s, 'found-with-ai'));
    const cells = countByLevel(found, (s) => s.firstImpact);
    const rate = (xs) => {
      const closedAs = (r) => xs.filter((s) => s.status === 'Closed' && s.resolution === r).length;
      const duplicate = closedAs('Duplicate'), notReproducible = closedAs('Not reproducible');
      const waiting = xs.filter((s) => s.untriaged).length;
      const outcomes = xs.length - waiting, rejected = duplicate + notReproducible;
      return { count: xs.length, waiting, outcomes, accepted: outcomes - rejected, duplicate, notReproducible, rejected, rate: outcomes ? rejected / outcomes : null };
    };
    const ai = rate(rows.filter((s) => has(s, 'ai-drafted'))), people = rate(rows.filter((s) => !has(s, 'ai-drafted')));
    const enough = ai.outcomes >= POLICY.aiMinOutcomes;
    const status = !ai.outcomes ? 'No data' : !enough ? 'Too few to judge' : ai.rate > POLICY.aiStopRule ? 'Pause AI drafting' : ai.rate >= POLICY.aiStopRule * 0.75 ? 'Watch' : 'On track';
    return { total: rows.length, found: { count: found.length, cells, urgent: found.filter((s) => URGENT.includes(s.firstImpact)).length }, ai, people, enough, status, stopRule: POLICY.aiStopRule, minOutcomes: POLICY.aiMinOutcomes };
  }

  const STATUSES = ['New', 'Ready', 'In progress', 'Verification', 'Deferred'];
  function byStatus(open) { return STATUSES.map((status) => ({ label: status, count: open.filter((s) => s.status === status).length })); }

  function countBy(rows, key) { const m = {}; for (const r of rows) { const k = key(r); m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label, count]) => ({ label, count })); }

  const api = {
    POLICY, LEVELS, URGENT, CLOSE_AS_ACCEPTED, STATUSES,
    day, daysBetween, minus, median,                       // dates and maths
    stateAt, states, reasons, nextStep, actionQueue,       // one bug on one day
    today, week, month, weekly, eventsIn, summary,         // the three views
    signOffs, capacity, teamsOn, ageBuckets, aiHelp, timeToSafe, teamFlow, byStatus, countByLevel,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BugMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
