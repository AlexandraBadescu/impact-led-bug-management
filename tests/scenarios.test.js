// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Three bugs traced from defect to decision, plus the reporting rules that stop the dashboard misleading anyone.
// Each scenario checks that the history, the numbers, the statuses and the explanations describe the same event.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../dashboard/metrics.js');
const DATA = require('../dashboard/data.json');

const AS_OF = DATA.asOf;
const issue = (id) => DATA.issues.find((i) => i.id === id);
const at = (id, date) => M.stateAt(issue(id), date);
const eventWith = (id, key) => issue(id).events.find((e) => e.changes[key] !== undefined);

// ---------- Scenario 1: a payment incident (BUG-101) ----------
test('scenario 1, payment incident: rollback is the first protection, the permanent fix is separate', () => {
  const i = issue('BUG-101');
  // Detection and assessment: found by canary monitoring in production; money at risk raises it to Very high, so P0.
  assert.equal(i.foundBy, 'Canary monitoring');
  assert.equal(eventWith('BUG-101', 'triaged').changes.raisedBy, 'Customers lose money');
  assert.equal(eventWith('BUG-101', 'triaged').changes.priority, 'P0');
  // Mitigation: the rollback on the day it was raised is the first protection, and it removes the risk.
  const rollback = eventWith('BUG-101', 'mitigation');
  assert.equal(rollback.date, i.created, 'protected the same day, not when the fix shipped');
  assert.equal(rollback.changes.mitigationType, 'Removes the risk');
  assert.equal(at('BUG-101', AS_OF).firstMitigated, i.created);
  // Decision: emergency over, permanent fix next as P1.
  assert.equal(rollback.changes.priority, 'P1');
  const sameDay = at('BUG-101', i.created);
  assert.deepEqual([sameDay.emergency, sameDay.open, sameDay.pastFixTarget], [false, true, false]);
  // Verification and evidence: the permanent fix is verified later, with a regression check added.
  const fix = issue('BUG-101').events.find((e) => e.changes.status === 'Verification');
  assert.ok(fix.date > rollback.date);
  assert.match(fix.changes.prevention, /regression check/i);
  assert.equal(at('BUG-101', AS_OF).resolution, 'Fixed');
  // The dashboard measures time to protection: 0 days, inside the 7-day target.
  const vh = M.week(DATA.issues, AS_OF, {}).byLevel.find((l) => l.level === 'Very high');
  assert.ok(vh.count >= 1 && vh.withinTarget === vh.count, 'Very high bugs in the last 90 days were all protected within target');
  assert.equal(M.daysBetween(i.created, at('BUG-101', AS_OF).firstMitigated), 0);
});

// ---------- Scenario 2: a deliberate commercial trade-off (BUG-111) ----------
test('scenario 2, deferred trade-off: signed off while urgent, promise kept, deferred with a reason and a date', () => {
  const so = DATA.signOffs.find((s) => s.bugs.includes('BUG-111'));
  // At go-live the bug was open and High: a sign-off was required.
  const then = at('BUG-111', so.date);
  assert.deepEqual([then.open, then.impact], [true, 'High']);
  // The promise (a mitigation by 31 July) is checked against the bug's own history, not typed into the sign-off.
  const before = M.signOffs(DATA.issues, '2026-07-28', {}, DATA).find((s) => s.id === so.id);
  assert.equal(before.followUpStatus, 'Due', 'on 28 July the promise was still open');
  const after = M.signOffs(DATA.issues, AS_OF, {}, DATA).find((s) => s.id === so.id);
  assert.deepEqual([after.followUpStatus, after.doneOn], ['Done', '2026-07-29']);
  // The mitigation relies on people, and the re-score says why.
  const m = eventWith('BUG-111', 'mitigation').changes;
  assert.equal(m.mitigationType, 'Relies on a manual step');
  assert.ok(m.rescoreReason);
  // Now: deferred with a reason and a future review date, still counted in weighted exposure and on the leadership view.
  const now = at('BUG-111', AS_OF);
  assert.deepEqual([now.status, now.impact, now.deferralIncomplete, now.reviewOverdue], ['Deferred', 'Medium', false, false]);
  const month = M.month(DATA.issues, AS_OF, {}, DATA);
  assert.ok(month.deferred.some((s) => s.id === 'BUG-111'));
  assert.equal(now.points, 2, 'a carried risk keeps its points');
});

// ---------- Scenario 3: an accessibility risk (BUG-109) ----------
test('scenario 3, accessibility: signed off with a promise that was missed, and every view says so', () => {
  const i = issue('BUG-109');
  assert.match(eventWith('BUG-109', 'triaged').changes.raisedBy, /WCAG/, 'raised one level for an accessibility failure on checkout');
  const so = DATA.signOffs.find((s) => s.bugs.includes('BUG-109'));
  assert.ok(so.date >= i.created, 'signed off after the bug was known');
  assert.deepEqual([at('BUG-109', so.date).open, at('BUG-109', so.date).impact], [true, 'High']);
  assert.equal(so.protectionAtGoLive, 'none', 'phone support is not counted as protection');
  // Before the target date nothing is late.
  const early = M.signOffs(DATA.issues, '2026-10-20', {}, DATA).find((s) => s.id === so.id);
  assert.equal(early.followUpStatus, 'Due');
  assert.equal(at('BUG-109', '2026-10-20').pastFixTarget, false);
  // On the demo date the promise is overdue, and the same fact shows on every view.
  const late = M.signOffs(DATA.issues, AS_OF, {}, DATA).find((s) => s.id === so.id);
  assert.deepEqual([late.followUpStatus, late.daysLate], ['Overdue', 9]);
  const now = at('BUG-109', AS_OF);
  assert.equal(now.pastFixTarget, true);
  assert.ok(M.reasons(now).includes('Urgent and past fix target'));
  assert.equal(M.nextStep(now), 'Verify today: it is past its fix target');
  assert.ok(M.month(DATA.issues, AS_OF, {}, DATA).goals[0].openLate.includes('BUG-109'), 'G1 lists it beside the on-time rate');
});

// ---------- Reporting integrity ----------
// Rebuild the data as it would have existed on a past date, with nothing recorded later. 10 June is before
// Checkout & Payments raised its first bug, so a team name from the future would show up there too.
function asItWasOn(date) {
  return {
    ...DATA, asOf: date,
    issues: DATA.issues.filter((i) => i.created <= date).map((i) => {
      const { note, noteDate, ...rest } = i; // a note written later didn't exist yet
      return { ...rest, ...(noteDate <= date ? { note, noteDate } : {}), events: i.events.filter((e) => e.date <= date) };
    }),
    signOffs: DATA.signOffs.filter((s) => s.date <= date),
    capacity: DATA.capacity.filter((c) => c.reported <= date),
  };
}
const everything = (data, date, filter) => JSON.stringify({
  today: M.today(data.issues, date, filter), week: M.week(data.issues, date, filter), month: M.month(data.issues, date, filter, data),
  ai: M.aiHelp(data.issues, date, filter), tts: M.timeToSafe(data.issues, date, filter), flow: M.teamFlow(data.issues, date, filter),
  ages: M.ageBuckets(M.states(data.issues, date, filter).filter((s) => s.open)),
});

for (const date of ['2026-06-10', '2026-07-01', '2026-07-28', '2026-08-26', '2026-10-01', '2026-10-15', '2026-10-31']) {
  test(`history: as of ${date}, no number depends on anything recorded later`, () => {
    for (const filter of [{}, { team: 'Checkout & Payments' }, { impact: 'High' }]) {
      assert.equal(everything(DATA, date, filter), everything(asItWasOn(date), date, filter), JSON.stringify(filter));
    }
  });
}

test('history: on 1 October, October\'s share of work is not shown yet (it was the final October figure in 1.0)', () => {
  assert.deepEqual(M.month(DATA.issues, '2026-10-01', {}, DATA).capacity.map((c) => c.month), ['2026-08', '2026-09']);
});

const T = (over = {}, events = []) => ({ id: 'T-1', title: 'Test bug', team: 'Team A', area: 'Area', created: '2026-09-01', foundIn: 'Staging', foundBy: 'Exploratory testing', events, ...over });
const ready = (date, impact) => ({ date, changes: { status: 'Ready', impact, priority: 'P1', triaged: date, reviewed: date, reviewDue: '2026-12-31' } });

test('urgent KPI: a perfect on-time rate cannot hide overdue urgent bugs', () => {
  const fixed = (id, c) => T({ id, created: c }, [ready(c, 'High'), { date: M.minus(c, -3), changes: { status: 'In progress', assignee: 'A' } }, { date: M.minus(c, -5), changes: { status: 'Verification', mitigated: M.minus(c, -5) } }, { date: M.minus(c, -6), changes: { status: 'Closed', resolution: 'Fixed', closed: M.minus(c, -6) } }]);
  const rows = [fixed('F1', '2026-09-01'), fixed('F2', '2026-09-10'), fixed('F3', '2026-09-20'), fixed('F4', '2026-10-01'), fixed('F5', '2026-10-05'),
    T({ id: 'L1', created: '2026-09-01' }, [ready('2026-09-01', 'High')]), T({ id: 'L2', created: '2026-09-15' }, [ready('2026-09-15', 'Very high')]), T({ id: 'L3', created: '2026-10-01' }, [ready('2026-10-01', 'High')])];
  const g1 = M.month(rows, AS_OF, {}, {}).goals[0];
  assert.equal(g1.value, '100%', 'every finished urgent bug was on time');
  assert.equal(g1.alongside, '3 still open past target');
  assert.equal(g1.status, 'Off track', 'three overdue urgent bugs make it off track, whatever the rate');
  const one = M.month([...rows.slice(0, 5), rows[5]], AS_OF, {}, {}).goals[0];
  assert.equal(one.status, 'Watch', 'one overdue is a watch');
});

test('accepted risk: a High risk accepted by leadership stays open, counted and visible', () => {
  const accepted = T({ created: '2026-06-01' }, [ready('2026-06-01', 'High'), { date: '2026-09-15', changes: { status: 'Deferred', deferralReason: 'Risk accepted (no fix planned)', reviewDue: '2026-12-15', escalationDecision: 'Accept the risk' } }]);
  const m = M.month([accepted], AS_OF, {}, {});
  assert.equal(m.points, 4, 'still adds 4 to weighted exposure');
  assert.deepEqual(m.deferred.map((s) => s.id), ['T-1'], 'on "Which risks have we chosen to carry?"');
});

test('accepted risk: a Low risk closed as accepted leaves the points but stays listed for leadership', () => {
  const m = M.month(DATA.issues, AS_OF, {}, DATA);
  assert.deepEqual(m.acceptedClosed.map((s) => s.id), ['BUG-116']);
  assert.ok(m.acceptedClosed.every((s) => M.CLOSE_AS_ACCEPTED.includes(s.impact) && s.acceptedBy && s.lookAgainIf));
});

test('filters: the sign-off log follows the team and impact filters; the share of work is organisation-wide', () => {
  const m = (f) => M.month(DATA.issues, AS_OF, f, DATA);
  assert.equal(m({}).signOffs.length, 2);
  assert.equal(m({ team: 'Orders & Delivery' }).signOffs.length, 0, 'no sign-offs for that team');
  assert.equal(m({ team: 'Checkout & Payments' }).signOffs.length, 2);
  assert.equal(m({ impact: 'Medium' }).signOffs.length, 0, 'filtered by the impact the bug had when signed off');
  assert.equal(m({ impact: 'High' }).signOffs.length, 2);
  assert.deepEqual(m({ team: 'Orders & Delivery' }).capacity, m({}).capacity, 'labelled "All teams" on the dashboard when a filter is on');
});

test('consistency: Today and the monthly goal G3 count the same undecided bugs, with the same split', () => {
  const t = M.today(DATA.issues, AS_OF, {}), g3 = M.month(DATA.issues, AS_OF, {}, DATA).goals.find((g) => g.id === 'G3');
  assert.equal(String(t.undecided.length), g3.value);
  assert.equal(g3.detail, `${t.noPlan.length} no plan recorded · ${t.decisionPending.length} leadership decision pending`);
});

test('consistency: the weekly "still open past target" note and goal G1 count the same bugs', () => {
  const w = M.week(DATA.issues, AS_OF, {}), g1 = M.month(DATA.issues, AS_OF, {}, DATA).goals[0];
  assert.equal(w.byLevel.reduce((a, l) => a + l.openLate, 0), g1.openLate.length);
});
