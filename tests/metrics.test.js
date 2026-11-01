// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Checks that the dashboard's numbers follow the playbook's rules.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const M = require('../dashboard/metrics.js');
const DATA = require('../dashboard/data.json');

const AS_OF = '2026-10-31';
// Build a single fictional bug for rule tests.
const bug = (over = {}, events = []) => ({ id: 'T-1', title: 'Test bug', team: 'Team A', area: 'Area', created: '2026-10-01', foundIn: 'Staging', foundBy: 'Exploratory testing', events, ...over });
const triaged = (date, impact, extra = {}) => ({ date, changes: { status: 'Ready', impact, priority: 'P2', triaged: date, reviewed: date, reviewDue: '2026-12-31', ...extra } });

test('rules: an unscored bug is late for triage after 2 days, not before', () => {
  assert.equal(M.stateAt(bug({ created: '2026-10-29' }), AS_OF).triageLate, false);
  assert.equal(M.stateAt(bug({ created: '2026-10-28' }), AS_OF).triageLate, true);
  assert.equal(M.nextStep(M.stateAt(bug({ created: '2026-10-28' }), AS_OF)), 'Score impact and agree priority');
});

test('rules: an urgent bug is past its fix target only when not mitigated', () => {
  const late = M.stateAt(bug({ created: '2026-10-16' }, [triaged('2026-10-16', 'High')]), AS_OF); // 15 days, target 14
  assert.equal(late.pastFixTarget, true);
  const onTime = M.stateAt(bug({ created: '2026-10-17' }, [triaged('2026-10-17', 'High')]), AS_OF); // 14 days
  assert.equal(onTime.pastFixTarget, false);
  const mitigated = M.stateAt(bug({ created: '2026-10-01' }, [triaged('2026-10-01', 'High'), { date: '2026-10-05', changes: { mitigated: '2026-10-05', impact: 'Medium' } }]), AS_OF);
  assert.equal(mitigated.pastFixTarget, false);
  assert.equal(mitigated.urgent, false, 're-scored to Medium after mitigation');
});

test('rules: "no plan" needs the age limit, and an untouched status', () => {
  const ready = M.stateAt(bug({ created: '2026-08-01' }, [triaged('2026-08-02', 'Medium')]), AS_OF); // 91 days
  assert.equal(ready.noPlan, true);
  const young = M.stateAt(bug({ created: '2026-08-05' }, [triaged('2026-08-06', 'Medium')]), AS_OF); // 87 days
  assert.equal(young.noPlan, false);
  const deferred = M.stateAt(bug({ created: '2026-08-01' }, [triaged('2026-08-02', 'Medium'), { date: '2026-08-10', changes: { status: 'Deferred', deferralReason: 'Planned with other work', mitigation: 'm', reviewDue: '2026-11-30' } }]), AS_OF);
  assert.equal(deferred.noPlan, false);
  assert.equal(deferred.deferralIncomplete, false);
});

test('rules: a deferral needs a reason and a review date; the workaround is optional', () => {
  const defer = (changes) => M.stateAt(bug({}, [triaged('2026-10-02', 'Medium'), { date: '2026-10-03', changes: { status: 'Deferred', ...changes } }]), AS_OF);
  const complete = defer({ deferralReason: 'Planned with other work', reviewDue: '2026-12-01' });
  assert.equal(complete.deferralIncomplete, false, 'reason and date, no workaround: complete');
  assert.deepEqual(complete.missing, []);
  const noDate = defer({ deferralReason: 'Planned with other work', reviewDue: null });
  assert.equal(noDate.deferralIncomplete, true);
  assert.deepEqual(noDate.missing, ['Review date']);
  // Scenario: deferred without a reason. Medium impact, future review date, no reason: must be flagged.
  const noReason = defer({ reviewDue: '2026-12-01' });
  assert.equal(noReason.deferralIncomplete, true, 'a deferral without a reason is postponement, not a decision');
  assert.deepEqual(noReason.missing, ['Deferral reason']);
  assert.ok(M.reasons(noReason).includes('Deferral has no reason'));
  assert.equal(M.nextStep(noReason), 'Record why it was deferred, or pick it up');
  const g4 = M.month([bug({}, [triaged('2026-10-02', 'Medium'), { date: '2026-10-03', changes: { status: 'Deferred', reviewDue: '2026-12-01' } }])], AS_OF, {}, {}).goals.find((g) => g.id === 'G4');
  assert.deepEqual([g4.value, g4.status], ['1', 'Watch'], 'and goal G4 counts it');
});

test('rules: an urgent bug nobody picks up within 2 days of triage is flagged for the engineering manager', () => {
  const late = M.stateAt(bug({ created: '2026-10-20' }, [triaged('2026-10-20', 'High', { priority: 'P1' })]), AS_OF);
  assert.equal(late.notPickedUp, true);
  assert.ok(M.reasons(late).includes('Not picked up after 2 days'));
  assert.equal(M.nextStep(late), 'Engineering manager and product owner agree who picks it up today');
  const fresh = M.stateAt(bug({ created: '2026-10-30' }, [triaged('2026-10-30', 'High', { priority: 'P1' })]), AS_OF);
  assert.equal(fresh.notPickedUp, false, 'still inside 2 days');
  const picked = M.stateAt(bug({ created: '2026-10-20' }, [triaged('2026-10-20', 'High', { priority: 'P1' }), { date: '2026-10-21', changes: { status: 'In progress', assignee: 'Sam' } }]), AS_OF);
  assert.equal(picked.notPickedUp, false);
  const low = M.stateAt(bug({ created: '2026-10-01' }, [triaged('2026-10-01', 'Low')]), AS_OF);
  assert.equal(low.notPickedUp, false, 'only urgent bugs');
});

test('rules: triaged means reviewed by the team and scored', () => {
  const reviewedNoScore = M.stateAt(bug({ created: '2026-10-20' }, [{ date: '2026-10-21', changes: { triaged: '2026-10-21' } }]), AS_OF);
  assert.equal(reviewedNoScore.untriaged, true, 'reviewed but no impact is not triaged');
  const scored = M.stateAt(bug({ created: '2026-10-20' }, [triaged('2026-10-21', 'Medium')]), AS_OF);
  assert.equal(scored.untriaged, false);
});

test('rules: the owner is always the team, so it is never reported missing', () => {
  const s = M.stateAt(bug({ created: '2026-10-20' }, []), AS_OF);
  assert.ok(!s.missing.includes('Owner'));
  assert.deepEqual(s.missing, ['Impact']);
});

test('data: cause labels, when present, come with the fix, never added at closure by QA', () => {
  for (const i of DATA.issues) {
    for (const e of i.events) {
      if (e.changes.status === 'Closed' && e.changes.resolution === 'Fixed') assert.equal(e.changes.rootCause, undefined, `${i.id}: root cause set at closure`);
      if (e.changes.rootCause) assert.equal(e.changes.status, 'Verification', `${i.id}: root cause recorded when moving to Verification`);
    }
  }
});

test('rules: review state follows triage and the review date', () => {
  const notYet = M.stateAt(bug({ created: '2026-10-30' }, []), AS_OF);
  assert.equal(notYet.reviewState, 'Not reviewed yet');
  const reviewed = M.stateAt(bug({}, [triaged('2026-10-02', 'Low', { reviewDue: '2026-11-30' })]), AS_OF);
  assert.equal(reviewed.reviewState, 'Reviewed');
  const due = M.stateAt(bug({}, [triaged('2026-10-02', 'Low', { reviewDue: '2026-10-20' })]), AS_OF);
  assert.equal(due.reviewState, 'Due for review again');
});

test('rules: a bug the team could not reproduce gets a reproduce-it next step', () => {
  const s = M.stateAt(bug({}, [triaged('2026-10-02', 'Medium', { reproducible: false })]), AS_OF);
  assert.equal(s.reproState, 'Not reproducible yet');
  assert.ok(M.reasons(s).includes('Not reproducible yet'));
  assert.equal(M.nextStep(s), 'Reproduce it: pair with the reporter, or add logging');
  assert.equal(M.stateAt(bug({ created: '2026-10-30' }, []), AS_OF).reproState, 'Not checked yet');
});

test('demo: reproducibility and review groups each add up to all open bugs, and match the tiles', () => {
  const t = M.today(DATA.issues, AS_OF, {});
  const sum = (xs) => xs.reduce((a, x) => a + x.count, 0);
  assert.equal(sum(t.repro), t.open.length);
  assert.equal(sum(t.reviewed), t.open.length);
  assert.equal(t.reviewed.find((x) => x.label === 'Due for review again').count, t.reviewOverdue.length, 'same as the Reviews overdue tile');
  assert.equal(t.reviewed.find((x) => x.label === 'Not reviewed yet').count, t.untriaged.length, 'same as the Waiting for triage tile');
});

test('rules: "Is AI helping?" compares rejection rates and applies the stop rule', () => {
  const closed = (id, labels, resolution) => bug({ id, labels, created: '2026-10-01' }, [triaged('2026-10-02', 'Low'), { date: '2026-10-05', changes: { status: 'Closed', resolution } }]);
  const open1 = (id, labels) => bug({ id, labels, created: '2026-10-01' }, [triaged('2026-10-02', 'Low')]);
  const rows = [closed('A1', ['ai-drafted'], 'Duplicate'), closed('A2', ['ai-drafted'], 'Not reproducible'), open1('A3', ['ai-drafted']), open1('A4', ['ai-drafted']), open1('A5', ['ai-drafted']),
    open1('P1', []), closed('P2', [], 'Fixed'), open1('F1', ['found-with-ai'])];
  const r = M.aiHelp(rows, AS_OF, {});
  assert.deepEqual([r.ai.count, r.ai.outcomes, r.ai.rejected, r.ai.duplicate, r.ai.notReproducible], [5, 5, 2, 1, 1], 'triaged tickets have an outcome; rejections are split by reason');
  assert.equal(r.status, 'Too few to judge', '5 outcomes is under the minimum of 10, so the stop rule is not applied');
  assert.deepEqual([r.people.count, r.people.rejected], [3, 0], 'a fix is not a rejection');
  assert.equal(r.found.count, 1);
  // With enough outcomes the stop rule applies: 3 rejected of 10 is over 1 in 5.
  const more = [...rows, ...['A6', 'A7', 'A8', 'A9'].map((id) => open1(id, ['ai-drafted'])), closed('A10', ['ai-drafted'], 'Duplicate')];
  const r2 = M.aiHelp(more, AS_OF, {});
  assert.deepEqual([r2.ai.outcomes, r2.ai.rejected, r2.status], [10, 3, 'Pause AI drafting']);
});

test('rules: AI tickets still waiting for triage have no outcome, so they are not in the rate', () => {
  const waiting = (id) => bug({ id, labels: ['ai-drafted'], created: '2026-10-28' }, []);
  const dup = bug({ id: 'D', labels: ['ai-drafted'], created: '2026-10-01' }, [triaged('2026-10-02', 'Low'), { date: '2026-10-05', changes: { status: 'Closed', resolution: 'Duplicate', closureReason: 'dup' } }]);
  const r = M.aiHelp([waiting('W1'), waiting('W2'), waiting('W3'), dup], AS_OF, {});
  assert.deepEqual([r.ai.count, r.ai.waiting, r.ai.outcomes, r.ai.rate], [4, 3, 1, 1], '1 of 1 with an outcome, not 1 of 4');
});

test('demo: AI labels appear only where they belong', () => {
  for (const i of DATA.issues) assert.ok((i.labels || []).every((l) => ['found-with-ai', 'ai-drafted'].includes(l)), i.id);
  const r = M.aiHelp(DATA.issues, AS_OF, {});
  assert.equal(r.status, 'Too few to judge', 'the demo has only 2 AI drafts with an outcome in 90 days');
  assert.ok(r.found.urgent > 0 && r.found.cells.Low > 0, 'the demo shows both real and small finds');
});

test('data: deferral reasons come from the fixed list', () => {
  const LIST = ['Needs a bigger change (tech debt)', 'Lower priority than the roadmap', 'Planned with other work', 'Workaround in place', 'Waiting on another team or supplier', 'Monitoring for more evidence', 'Risk accepted (no fix planned)'];
  for (const i of DATA.issues) for (const e of i.events) if (e.changes.deferralReason) assert.ok(LIST.includes(e.changes.deferralReason), `${i.id}: "${e.changes.deferralReason}"`);
});

test('rules: High bugs past 90 days and not mitigated need a leadership decision', () => {
  const s = M.stateAt(bug({ created: '2026-08-01' }, [triaged('2026-08-02', 'High')]), AS_OF);
  assert.equal(s.needsEscalation, true);
  assert.equal(M.nextStep(s), 'Ask leadership: fix next milestone, or accept the risk');
});

test('rules: escalating is not deciding; the bug waits for leadership until a decision is recorded', () => {
  const esc = { date: '2026-10-27', changes: { escalated: '2026-10-27', reviewDue: '2026-11-03' } };
  const pending = M.stateAt(bug({ created: '2026-07-01' }, [triaged('2026-07-02', 'High'), esc]), AS_OF);
  assert.deepEqual([pending.needsEscalation, pending.decisionPending, pending.noPlan], [false, true, false]);
  assert.ok(M.reasons(pending).includes('Leadership decision pending'));
  const t = M.today([bug({ created: '2026-07-01' }, [triaged('2026-07-02', 'High'), esc])], AS_OF, {});
  assert.deepEqual([t.undecided.length, t.noPlan.length, t.decisionPending.length], [1, 0, 1]);
  const g3 = M.month([bug({ created: '2026-07-01' }, [triaged('2026-07-02', 'High'), esc])], AS_OF, {}, {}).goals.find((g) => g.id === 'G3');
  assert.equal(g3.value, '1', 'G3 and the Today tile count the same bugs');
  const decided = M.stateAt(bug({ created: '2026-07-01' }, [triaged('2026-07-02', 'High'), esc, { date: '2026-10-29', changes: { escalationDecision: 'Fix next milestone', status: 'In progress', assignee: 'Sam' } }]), AS_OF);
  assert.equal(decided.decisionPending, false);
});

test('rules: weighted exposure counts open, scored bugs only', () => {
  const rows = [
    bug({ id: 'A' }, [triaged('2026-10-02', 'Very high')]),
    bug({ id: 'B' }, [triaged('2026-10-02', 'Low')]),
    bug({ id: 'C' }, []), // not scored
    bug({ id: 'D' }, [triaged('2026-10-02', 'High'), { date: '2026-10-09', changes: { status: 'Closed', resolution: 'Fixed', closed: '2026-10-09' } }]),
  ];
  const m = M.month(rows, AS_OF, {}, {});
  assert.equal(m.points, 9);
  assert.equal(m.unknown, 1);
});

test('rules: fixes and other closures are counted separately; reopens are counted', () => {
  const rows = [
    bug({ id: 'A', created: '2026-10-10' }, [triaged('2026-10-10', 'Low'), { date: '2026-10-12', changes: { status: 'Closed', resolution: 'Fixed' } }, { date: '2026-10-20', changes: { status: 'In progress', resolution: 'Reopened' } }]),
    bug({ id: 'B', created: '2026-10-10' }, [triaged('2026-10-10', 'Low'), { date: '2026-10-12', changes: { status: 'Closed', resolution: 'Duplicate' } }]),
  ];
  assert.deepEqual(M.eventsIn(rows, '2026-10-04', AS_OF, {}), { created: 2, fixed: 1, other: 1, reopened: 1 });
});

test('rules: the action list follows the pickup order: P0, untriaged, agreed P1 work, then decisions due', () => {
  const rows = [
    bug({ id: 'LOW', created: '2026-01-01' }, [triaged('2026-01-02', 'Low', { priority: 'P3', reviewDue: '2026-04-01' })]),
    bug({ id: 'NEW', created: '2026-10-20' }, []),
    bug({ id: 'HIGH', created: '2026-10-25' }, [triaged('2026-10-25', 'High', { priority: 'P1' })]),
    bug({ id: 'P0', created: '2026-10-30', foundIn: 'Production' }, [triaged('2026-10-30', 'Very high', { priority: 'P0', status: 'In progress' })]),
  ];
  assert.deepEqual(M.today(rows, AS_OF, {}).queue.map((s) => s.id), ['P0', 'NEW', 'HIGH', 'LOW']);
});

test('rules: a P0 emergency comes first even when it is younger and lower impact', () => {
  const rows = [
    bug({ id: 'OLD-VH', created: '2026-10-01' }, [triaged('2026-10-01', 'Very high', { priority: 'P1' })]),
    bug({ id: 'P0', created: '2026-10-31' }, [triaged('2026-10-31', 'High', { priority: 'P0' })]),
  ];
  const q = M.today(rows, AS_OF, {});
  assert.deepEqual(q.queue.map((s) => s.id), ['P0', 'OLD-VH']);
  assert.deepEqual(q.emergencies.map((s) => s.id), ['P0']);
  assert.equal(M.nextStep(q.queue[0]), 'Emergency: engineering manager assigns someone now; tell the product owner', 'nobody on it yet');
  const swarming = M.stateAt(bug({ created: '2026-10-31' }, [triaged('2026-10-31', 'High', { priority: 'P0', assignee: 'Ana', status: 'In progress' })]), AS_OF);
  assert.equal(M.nextStep(swarming), 'Emergency: swarm until fixed or mitigated');
});

test('rules: a mitigated P0 is no longer an emergency next step', () => {
  const s = M.stateAt(bug({}, [triaged('2026-10-29', 'Very high', { priority: 'P0' }), { date: '2026-10-30', changes: { mitigated: '2026-10-30', impact: 'Medium', priority: 'P2' } }]), AS_OF);
  assert.equal(s.emergency, false);
  assert.notEqual(M.nextStep(s), 'Emergency: swarm until fixed or mitigated');
});

test('data: every triaged demo bug has an agreed priority that starts from its impact', () => {
  const start = (impact, foundIn) => impact === 'Very high' ? (foundIn === 'Production' ? 'P0' : 'P1') : { High: 'P1', Medium: 'P2', Low: 'P3' }[impact];
  for (const i of DATA.issues) {
    const t = i.events.find((e) => e.changes.triaged);
    if (!t) continue;
    assert.equal(t.changes.priority, start(t.changes.impact, i.foundIn), `${i.id} starting priority`);
  }
});

test('data: every demo bug is unique, fictional and consistent with the scoring matrix', () => {
  const ids = new Set(), titles = new Set();
  const MATRIX = { 'Low': ['Low', 'Low', 'Low', 'Medium'], 'Medium': ['Low', 'Low', 'Medium', 'Medium'], 'High': ['Medium', 'High', 'High', 'Very high'], 'Very high': ['Medium', 'High', 'Very high', 'Very high'] };
  const USERS = ['Low', 'Medium', 'Large', 'Very large'], LEVELS = ['Low', 'Medium', 'High', 'Very high'];
  assert.equal(DATA.fictional, true);
  for (const i of DATA.issues) {
    assert.ok(!ids.has(i.id), 'duplicate id ' + i.id); ids.add(i.id);
    assert.ok(!titles.has(i.title), 'duplicate title ' + i.title); titles.add(i.title);
    const first = (i.events.find((e) => e.changes.impact) || { changes: null }).changes;
    if (!first) continue; // not scored yet
    const base = MATRIX[first.severity][USERS.indexOf(first.users)];
    const expected = first.raisedBy ? LEVELS[Math.min(LEVELS.indexOf(base) + 1, 3)] : base;
    assert.equal(first.impact, expected, `${i.id} impact should follow the matrix`);
    const dates = i.events.map((e) => e.date);
    assert.deepEqual(dates, [...dates].sort(), `${i.id} events in date order`);
    assert.ok(dates.every((d) => d >= i.created && d <= DATA.asOf), `${i.id} events inside its lifetime`);
  }
});

test('data: regenerating gives exactly the committed data', () => {
  const before = fs.readFileSync(path.join(__dirname, '../dashboard/data.json'), 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, '../dashboard/generate-data.js')]);
  assert.equal(fs.readFileSync(path.join(__dirname, '../dashboard/data.json'), 'utf8'), before);
});

test('demo: headline numbers on the demo date', () => {
  const t = M.today(DATA.issues, AS_OF, {});
  assert.equal(t.urgentOpen.length, 7);
  assert.equal(t.untriaged.length, 4);
  assert.equal(t.triageLate.length, 4);
  assert.equal(t.reviewOverdue.length, 6);
  assert.equal(t.queue.length, 17); // includes a deferred bug nobody has reproduced yet, and one deferred with no reason
  assert.deepEqual([t.undecided.length, t.noPlan.length, t.decisionPending.length], [3, 2, 1]);
  const m = M.month(DATA.issues, AS_OF, {}, DATA);
  assert.deepEqual(m.goals.map((g) => [g.id, g.value, g.status]), [
    ['G1', '92%', 'Off track'], ['G2', '58', 'Off track'], ['G3', '3', 'Watch'], ['G4', '4', 'Off track'],
  ]);
  assert.equal(m.goals[0].alongside, '4 still open past target', 'the on-time rate never hides overdue urgent bugs');
});

test('demo: the team filter splits the numbers without losing any', () => {
  const teams = [...new Set(DATA.issues.map((i) => i.team))];
  const all = M.month(DATA.issues, AS_OF, {}, DATA).points;
  const sum = teams.reduce((a, team) => a + M.month(DATA.issues, AS_OF, { team }, DATA).points, 0);
  assert.equal(sum, all);
});

test('demo: going back in time hides bugs raised later', () => {
  const early = M.states(DATA.issues, '2026-07-01', {});
  assert.ok(early.every((s) => s.created <= '2026-07-01'));
  assert.ok(early.length < DATA.issues.length);
});

// ---------- One deadline rule (docs/playbook.md, "How days are counted") ----------
// A limit of N days is met through day N and missed from day N + 1; the day a bug is raised is day 0.
// Each rule is checked one day before, on, and one day after its limit.
const dayN = (n) => M.minus(AS_OF, n); // a bug raised n days before the demo date is n days old
const boundary = (name, n, make, flag) => test(`deadline: ${name} at ${n - 1}, ${n} and ${n + 1} days`, () => {
  assert.deepEqual([n - 1, n, n + 1].map((age) => flag(M.stateAt(make(dayN(age)), AS_OF))), [false, false, true]);
});
const scored = (impact) => (created) => bug({ created }, [triaged(created, impact)]);
boundary('Very high fix target', M.POLICY.fixTarget['Very high'], scored('Very high'), (s) => s.pastFixTarget);
boundary('High fix target', M.POLICY.fixTarget.High, scored('High'), (s) => s.pastFixTarget);
boundary('triage', M.POLICY.triageWithin, (created) => bug({ created }, []), (s) => s.triageLate);
for (const level of ['High', 'Medium', 'Low']) boundary(`${level} needs a plan`, M.POLICY.decisionAge[level], scored(level), (s) => s.noPlan);
boundary('High leadership age', M.POLICY.escalationAge.High, scored('High'), (s) => s.needsEscalation);
boundary('Medium leadership age', M.POLICY.escalationAge.Medium, scored('Medium'), (s) => s.needsEscalation);
test('deadline: a review date is met on the day and overdue the day after', () => {
  const due = (d) => M.stateAt(bug({ created: '2026-09-01' }, [triaged('2026-09-01', 'Low', { reviewDue: d })]), AS_OF).reviewOverdue;
  assert.deepEqual([due(M.minus(AS_OF, -1)), due(AS_OF), due(M.minus(AS_OF, 1))], [false, false, true]);
  const deferral = (d) => M.stateAt(bug({ created: '2026-09-01' }, [triaged('2026-09-01', 'Low'), { date: '2026-09-02', changes: { status: 'Deferred', deferralReason: 'Planned with other work', reviewDue: d } }]), AS_OF).reviewOverdue;
  assert.deepEqual([deferral(AS_OF), deferral(M.minus(AS_OF, 1))], [false, true], 'deferred risks use the same rule');
});

// ---------- History: nothing known later leaks into an earlier day ----------
test('history: an unscored bug has no impact, even if it is scored later', () => {
  const later = bug({ created: '2026-10-01', labels: ['found-with-ai'] }, [{ date: '2026-10-20', changes: { status: 'Ready', impact: 'High', severity: 'High', users: 'Medium', triaged: '2026-10-20', reviewed: '2026-10-20', reviewDue: '2026-10-27', priority: 'P1' } }]);
  const before = M.stateAt(later, '2026-10-10');
  assert.deepEqual([before.impact, before.firstImpact], [null, null]);
  assert.equal(M.aiHelp([later], '2026-10-10', {}).found.cells.Unknown, 1, 'counted as not scored, not as its future impact');
  assert.equal(M.stateAt(later, AS_OF).firstImpact, 'High');
  assert.equal(before.note, undefined, 'notes are never part of a day\'s state');
});

test('accepted risk: a closed accepted risk keeps its owner, review date and residual impact, and its review can go overdue', () => {
  const acc = (reviewDue) => bug({ created: '2026-06-01' }, [triaged('2026-06-01', 'Low'), { date: '2026-06-10', changes: { status: 'Closed', resolution: 'Accepted risk', closed: '2026-06-10', closureReason: 'Within policy', acceptedBy: 'Product owner', lookAgainIf: 'Policy changes', reviewDue } }]);
  const m = M.month([acc('2026-09-10')], AS_OF, {}, {});
  assert.equal(m.acceptedClosed.length, 1, 'still listed for leadership');
  const s = m.acceptedClosed[0];
  assert.deepEqual([s.impact, s.acceptedBy, s.acceptedReviewOverdue], ['Low', 'Product owner', true]);
  assert.equal(m.points, 0, 'not in the open exposure total');
  assert.equal(M.today([acc('2026-09-10')], AS_OF, {}).queue.length, 0, 'not in the active fixing queue');
  const retired = bug({ created: '2026-06-01' }, [...acc('2026-09-10').events, { date: '2026-10-01', changes: { retired: '2026-10-01' } }]);
  assert.equal(M.month([retired], AS_OF, {}, {}).acceptedClosed.length, 0, 'listed until the risk is retired');
});

// ---------- Generator: changing one bug never moves another ----------
test('generator: changing one bug leaves every other bug\'s history untouched', () => {
  const { build, CATALOGUE } = require('../dashboard/generate-data.js');
  const before = build();
  const changed = CATALOGUE.map((row) => [...row]);
  changed[5][7] = 'reopened'; // BUG-106 gets a different story, with a different number of random draws
  const after = build(changed);
  assert.notDeepEqual(after[5].events, before[5].events, 'the changed bug did change');
  for (let i = 0; i < before.length; i++) if (i !== 5) assert.deepEqual(after[i], before[i], `${before[i].id} moved`);
});
