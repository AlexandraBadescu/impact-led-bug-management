// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// The demo data must tell one consistent story. Each negative case breaks one valid record in one way and
// proves the validator catches exactly that, so a pass means something.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { validate } = require('../tools/validate-data.js');
const DATA = require('../dashboard/data.json');

const clone = () => JSON.parse(JSON.stringify(DATA));
const bug = (d, id) => d.issues.find((i) => i.id === id);
const signOff = (d, id) => d.signOffs.find((s) => s.id === id);
const codes = (d) => validate(d).map((p) => p.code);

test('the demo data passes: every history is possible and every decision matches its evidence', () => {
  assert.deepEqual(validate(DATA), []);
});

const CASES = [
  // The two defects found in review of version 1.0, kept as regression cases.
  ['signoff-before-bug', 'a sign-off dated 18 September cannot reference a bug raised on 8 October', (d) => { signOff(d, 'SO-2').date = '2026-09-18'; }],
  ['signoff-bug-not-urgent', 'the go-live log is for open urgent bugs; BUG-111 was Medium by 7 October', (d) => { Object.assign(signOff(d, 'SO-1'), { date: '2026-10-07', protectionAtGoLive: 'active', followUp: { ...signOff(d, 'SO-1').followUp, due: '2026-10-14' } }); }],
  ['signoff-unknown-bug', 'a sign-off must reference a real bug', (d) => { signOff(d, 'SO-1').bugs = ['BUG-999']; }],
  ['signoff-bug-closed', 'a closed bug cannot be accepted at go-live', (d) => { d.signOffs.push({ ...signOff(d, 'SO-1'), id: 'SO-X', date: '2026-09-01', bugs: ['BUG-101'], protectionAtGoLive: 'active', followUp: { ...signOff(d, 'SO-1').followUp, due: '2026-09-05' } }); }],
  ['signoff-team-mismatch', 'the sign-off belongs to the team that owns the bug', (d) => { signOff(d, 'SO-1').team = 'Orders & Delivery'; }],
  ['signoff-follow-up-before', 'a promise cannot fall due before it was made', (d) => { signOff(d, 'SO-2').followUp.due = '2026-10-10'; }],
  ['signoff-without-follow-up', 'every sign-off says what was promised, and by when', (d) => { delete signOff(d, 'SO-2').followUp; }],
  ['signoff-missing-field', 'every sign-off says how users are protected', (d) => { delete signOff(d, 'SO-2').protection; }],
  ['signoff-after-asof', 'nothing is signed off in the future', (d) => { signOff(d, 'SO-2').date = '2026-11-02'; signOff(d, 'SO-2').followUp.due = '2026-11-09'; }],
  ['created-after-asof', 'no bug is raised after the demo date', (d) => { bug(d, 'BUG-117').created = '2026-11-05'; }],
  ['event-before-created', 'nothing happens to a bug before it exists', (d) => { Object.assign(bug(d, 'BUG-140').events[0], { date: '2026-09-20' }); Object.assign(bug(d, 'BUG-140').events[0].changes, { triaged: '2026-09-20', reviewed: '2026-09-20' }); }],
  ['event-after-asof', 'nothing happens after the demo date', (d) => { bug(d, 'BUG-140').events.push({ date: '2026-11-03', changes: { reviewed: '2026-11-03' } }); }],
  ['events-out-of-order', 'a history is in date order', (d) => { const e = bug(d, 'BUG-148').events; [e[0], e[1]] = [e[1], e[0]]; }],
  ['impossible-transition', 'a bug cannot reach Verification without being worked on', (d) => { bug(d, 'BUG-140').events.push({ date: '2026-10-31', changes: { status: 'Verification' } }); }],
  ['fixed-without-verification', 'closed as fixed means verified first', (d) => { bug(d, 'BUG-130').events.push({ date: '2026-10-31', changes: { status: 'Closed', resolution: 'Fixed', closed: '2026-10-31' } }); }],
  ['closed-without-reason', 'closing without a fix needs a written reason', (d) => { delete bug(d, 'BUG-151').events.find((e) => e.changes.status === 'Closed').changes.closureReason; }],
  ['accepted-urgent-closed', 'a High risk accepted must stay open and visible, not closed', (d) => { bug(d, 'BUG-140').events.push({ date: '2026-10-31', changes: { status: 'Closed', resolution: 'Accepted risk', closed: '2026-10-31', closureReason: 'Accepted', acceptedBy: 'Leadership', lookAgainIf: 'Volumes rise', reviewDue: '2027-01-31' } }); }],
  ['accepted-without-owner', 'an accepted risk records who accepted it and what would reopen it', (d) => { delete bug(d, 'BUG-116').events.find((e) => e.changes.resolution === 'Accepted risk').changes.acceptedBy; }],
  ['rescore-without-reason', 'lowering impact needs a mitigation or a reason', (d) => { bug(d, 'BUG-140').events.push({ date: '2026-10-31', changes: { impact: 'Medium' } }); }],
  ['mitigation-without-type', 'a mitigation says how much it protects users', (d) => { delete bug(d, 'BUG-111').events.find((e) => e.changes.mitigation).changes.mitigationType; }],
  ['unknown-deferral-reason', 'deferral reasons come from the fixed list', (d) => { bug(d, 'BUG-113').events.find((e) => e.changes.deferralReason).changes.deferralReason = 'Not now'; }],
  ['escalated-date-mismatch', 'the escalation date is the day it happened', (d) => { bug(d, 'BUG-148').events.find((e) => e.changes.escalated).changes.escalated = '2026-10-01'; }],
  // New in 1.2.
  ['duplicate-bug-id', 'every bug has its own ID', (d) => { bug(d, 'BUG-159').id = 'BUG-158'; }],
  ['duplicate-signoff-id', 'every sign-off has its own ID', (d) => { signOff(d, 'SO-2').id = 'SO-1'; }],
  ['triaged-date-mismatch', 'the triage date is the day of the triage event', (d) => { bug(d, 'BUG-140').events[0].changes.triaged = '2026-09-25'; }],
  ['closed-date-mismatch', 'the closed date is the day of the closing event', (d) => { bug(d, 'BUG-101').events.find((e) => e.changes.status === 'Closed').changes.closed = '2026-08-27'; }],
  ['mitigated-date-mismatch', 'the mitigated date is the day of the mitigation event', (d) => { bug(d, 'BUG-101').events.find((e) => e.changes.mitigation).changes.mitigated = '2026-08-27'; }],
  ['closed-date-missing', 'a closing event records the closed date', (d) => { delete bug(d, 'BUG-151').events.find((e) => e.changes.status === 'Closed').changes.closed; }],
  ['protected-before-release', 'a fix on a test environment protects no users', (d) => { Object.assign(bug(d, 'BUG-102').events.find((e) => e.changes.status === 'Verification').changes, { mitigated: bug(d, 'BUG-102').events.find((e) => e.changes.status === 'Verification').date }); }],
  ['impact-not-from-matrix', 'the impact at triage follows the matrix', (d) => { bug(d, 'BUG-140').events[0].changes.impact = 'Very high'; }],
  ['review-date-in-past', 'a review date is in the future when it is set', (d) => { bug(d, 'BUG-140').events[0].changes.reviewDue = '2026-09-01'; }],
  ['note-without-date', 'a summary note says when it was written', (d) => { delete bug(d, 'BUG-148').noteDate; }],
  ['accepted-without-review-date', 'an accepted risk keeps a date to look again', (d) => { delete bug(d, 'BUG-116').events.find((e) => e.changes.resolution === 'Accepted risk').changes.reviewDue; }],
  ['signoff-claims-protection', 'BUG-111: a go-live cannot claim the finance mitigation was active two days before it started', (d) => { signOff(d, 'SO-1').protectionAtGoLive = 'active'; }],
  ['signoff-understates-protection', 'a sign-off cannot say "proposed" when the bug was already mitigated', (d) => { d.signOffs.push({ ...signOff(d, 'SO-1'), id: 'SO-X', date: '2026-08-25', bugs: ['BUG-101'], protectionAtGoLive: 'proposed', followUp: { ...signOff(d, 'SO-1').followUp, due: '2026-08-30' } }); }],
  ['signoff-protection-unstated', 'every sign-off says whether protection was active, proposed or none', (d) => { delete signOff(d, 'SO-2').protectionAtGoLive; }],
  // Rules that had no negative case of their own until the 1.2 audit.
  ['unknown-status', 'only the workflow\'s statuses exist', (d) => { bug(d, 'BUG-140').events.push({ date: '2026-10-31', changes: { status: 'Blocked' } }); }],
  ['closed-without-resolution', 'closing records how it was resolved', (d) => { bug(d, 'BUG-130').events.push({ date: '2026-10-31', changes: { status: 'Closed', closed: '2026-10-31' } }); }],
  ['reviewed-date-mismatch', 'the reviewed date is the day of the review', (d) => { bug(d, 'BUG-140').events[0].changes.reviewed = '2026-09-25'; }],
  ['signoff-without-id', 'every sign-off can be referred to', (d) => { delete signOff(d, 'SO-2').id; }],
  ['signoff-without-bugs', 'a sign-off is about specific bugs', (d) => { signOff(d, 'SO-2').bugs = []; }],
  ['capacity-without-report-date', 'a monthly figure says when it was reported', (d) => { delete d.capacity[0].reported; }],
  ['capacity-to-date-after-month', 'a month-to-date figure is reported before the month ends', (d) => { d.capacity.find((c) => c.month === '2026-09').toDate = true; }],
  ['capacity-out-of-order', 'monthly figures are in order', (d) => { [d.capacity[0], d.capacity[1]] = [d.capacity[1], d.capacity[0]]; }],
  ['signoff-proposal-untracked', 'a proposed mitigation is tracked by a mitigation follow-up', (d) => { signOff(d, 'SO-1').followUp.kind = 'fixed'; }],
  ['capacity-reported-early', 'a full month cannot be reported before it ends (no future information)', (d) => { delete d.capacity.find((c) => c.month === '2026-10').toDate; }],
  ['capacity-after-asof', 'no report from the future', (d) => { d.capacity.find((c) => c.month === '2026-09').reported = '2026-11-02'; }],
  ['capacity-out-of-range', 'shares are percentages', (d) => { d.capacity[0].done = 140; }],
];

for (const [code, why, breakIt] of CASES) {
  test(`catches ${code}, and only that: ${why}`, () => {
    const d = clone();
    breakIt(d);
    assert.notDeepEqual(d, DATA, 'the case changed the data');
    assert.deepEqual(codes(d), [code]);
  });
}

test('the command line exits 1 for broken data and 0 for the demo data', () => {
  const cli = path.join(__dirname, '../tools/validate-data.js');
  execFileSync(process.execPath, [cli], { stdio: 'pipe' });
  const d = clone(); signOffAt(d);
  const tmp = path.join(os.tmpdir(), `bad-data-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(d));
  assert.throws(() => execFileSync(process.execPath, [cli, tmp], { stdio: 'pipe' }), (e) => e.status === 1);
  fs.unlinkSync(tmp);
  function signOffAt(x) { signOff(x, 'SO-2').date = '2026-09-18'; }
});
