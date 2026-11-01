#!/usr/bin/env node
// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Checks that the demo data tells one consistent story: every bug's history is possible, and every decision that
// references a bug agrees with that bug's history. Usage: node tools/validate-data.js [data.json]
// This is not the dashboard's job. The dashboard *flags* governance gaps (a deferral with no reason, an overdue review),
// because real teams have them, and a deferral recorded by bulk change can skip the reason and date. This file
// rejects data that could not have happened, or a decision that doesn't agree with the evidence it points to.
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('../dashboard/metrics.js');

const STATUSES = ['New', 'Ready', 'In progress', 'Verification', 'Deferred', 'Closed'];
// The workflow in docs/playbook.md, section 5. Closed (Fixed) only comes from Verification.
const NEXT = {
  'New': ['Ready', 'In progress', 'Closed'],   // In progress straight from New: a P0 picked up at once
  'Ready': ['In progress', 'Deferred', 'Closed'],
  'In progress': ['Verification', 'Deferred', 'Ready', 'Closed'],
  'Verification': ['Closed', 'In progress'],
  'Deferred': ['Ready', 'In progress', 'Closed'],
  'Closed': ['In progress'],                    // reopened
};
const REASONS = ['Needs a bigger change (tech debt)', 'Lower priority than the roadmap', 'Planned with other work', 'Workaround in place',
  'Waiting on another team or supplier', 'Monitoring for more evidence', 'Risk accepted (no fix planned)'];
const MITIGATION_TYPES = ['Removes the risk', 'Reduces the risk', 'Relies on a manual step'];
const RESOLUTIONS = ['Fixed', 'Duplicate', 'Not reproducible', 'Accepted risk'];
const PROTECTION = ['active', 'proposed', 'none'];
// Fields that record the day something happened. Each must equal the date of the event that sets it.
const DATED = ['triaged', 'reviewed', 'mitigated', 'closed', 'escalated'];
// The scoring matrix (docs/scoring-guide.md): severity rows, users-affected columns.
const LEVELS = ['Low', 'Medium', 'High', 'Very high'];
const USERS = ['Low', 'Medium', 'Large', 'Very large'];
const MATRIX = { 'Low': ['Low', 'Low', 'Low', 'Medium'], 'Medium': ['Low', 'Low', 'Medium', 'Medium'], 'High': ['Medium', 'High', 'High', 'Very high'], 'Very high': ['Medium', 'High', 'Very high', 'Very high'] };

function validate(data) {
  const problems = [];
  const add = (code, where, msg) => problems.push({ code, where, msg });
  const asOf = data.asOf;
  const byId = new Map(data.issues.map((i) => [i.id, i]));
  const seen = new Set();

  for (const issue of data.issues) {
    const id = issue.id;
    if (seen.has(id)) add('duplicate-bug-id', id, 'two bugs share this ID');
    seen.add(id);
    if (issue.note && !issue.noteDate) add('note-without-date', id, 'a summary note needs the date it was written');
    if (issue.created > asOf) add('created-after-asof', id, `raised ${issue.created}, after the demo date`);
    let status = 'New', impact = null, triaged = false, last = '';
    for (const e of issue.events) {
      const c = e.changes;
      if (e.date < issue.created) add('event-before-created', id, `event on ${e.date} is before the bug was raised (${issue.created})`);
      if (e.date > asOf) add('event-after-asof', id, `event on ${e.date} is after the demo date`);
      // Several events can share a day; what matters is that a dated field matches its own event.
      for (const f of DATED) if (c[f] && c[f] !== e.date) add(`${f}-date-mismatch`, id, `${f} says ${c[f]}, but the event that sets it is dated ${e.date}`);
      if (c.reviewDue && c.reviewDue < e.date) add('review-date-in-past', id, `review date ${c.reviewDue} set on ${e.date}, already in the past`);
      if (c.impact && c.triaged) {
        const base = c.severity && c.users && MATRIX[c.severity] ? MATRIX[c.severity][USERS.indexOf(c.users)] : null;
        const expected = base && (c.raisedBy ? LEVELS[Math.min(LEVELS.indexOf(base) + 1, 3)] : base);
        if (c.impact !== expected) add('impact-not-from-matrix', id, `severity ${c.severity}, users ${c.users}${c.raisedBy ? ', raised one level' : ''} gives ${expected}, not ${c.impact}`);
      }
      // Users are protected by a mitigation (which says what it is and how much it protects them) or by the fix
      // being released, which is when the bug is closed as fixed. Deploying to a test environment protects nobody.
      if (c.mitigated) {
        const releasedFix = c.status === 'Closed' && c.resolution === 'Fixed';
        if (c.status === 'Verification') add('protected-before-release', id, `marked protected on ${e.date} when the fix only reached a test environment`);
        else if (!releasedFix && (!c.mitigation || !MITIGATION_TYPES.includes(c.mitigationType))) add('mitigation-without-type', id, `protected on ${e.date} with no mitigation described, or no type saying how much it protects users`);
      }
      if (last && e.date < last) add('events-out-of-order', id, `event on ${e.date} comes after one on ${last}`);
      last = e.date > last ? e.date : last;
      if (c.status && c.status !== status) {
        if (!STATUSES.includes(c.status)) add('unknown-status', id, `status "${c.status}"`);
        else if (!NEXT[status].includes(c.status)) add('impossible-transition', id, `${status} → ${c.status} on ${e.date}`);
        if (c.status === 'Closed') {
          if (!RESOLUTIONS.includes(c.resolution)) add('closed-without-resolution', id, `closed on ${e.date} without a resolution`);
          if (c.resolution === 'Fixed' && status !== 'Verification') add('fixed-without-verification', id, `closed as fixed on ${e.date} straight from ${status}`);
          if (!c.closed) add('closed-date-missing', id, `closed on ${e.date} with no closed date`);
          if (c.resolution && c.resolution !== 'Fixed' && !c.closureReason) add('closed-without-reason', id, `closed as ${c.resolution.toLowerCase()} with no written reason`);
          if (c.resolution === 'Accepted risk') {
            if (!M.CLOSE_AS_ACCEPTED.includes(c.impact || impact)) add('accepted-urgent-closed', id, `a ${c.impact || impact} risk was closed as accepted; it must stay open as a deferral`);
            if (!c.acceptedBy || !c.lookAgainIf) add('accepted-without-owner', id, 'accepted risk needs who accepted it and what would make us look again');
            if (!c.reviewDue || c.reviewDue <= e.date) add('accepted-without-review-date', id, 'an accepted risk needs a future date to look at it again');
          }
        }
        status = c.status;
      }
      if (c.impact && c.impact !== impact) {
        if (triaged && !c.mitigated && !c.rescoreReason) add('rescore-without-reason', id, `impact changed to ${c.impact} on ${e.date} with no mitigation or reason`);
        impact = c.impact;
      }
      if (c.triaged) triaged = true;
      if (c.deferralReason && !REASONS.includes(c.deferralReason)) add('unknown-deferral-reason', id, `"${c.deferralReason}"`);
      if (c.mitigation && !c.mitigated && !MITIGATION_TYPES.includes(c.mitigationType)) add('mitigation-without-type', id, `workaround "${c.mitigation}" doesn't say how much it protects users`);
    }
  }

  const soSeen = new Set();
  for (const so of data.signOffs || []) {
    const where = so.id || so.milestone;
    if (!so.id) add('signoff-without-id', where, 'no ID');
    else if (soSeen.has(so.id)) add('duplicate-signoff-id', where, 'two sign-offs share this ID');
    soSeen.add(so.id);
    if (so.date > asOf) add('signoff-after-asof', where, `dated ${so.date}`);
    for (const f of ['milestone', 'team', 'accountable', 'reason', 'protection', 'residualRisk']) if (!so[f]) add('signoff-missing-field', where, `no ${f}`);
    if (!PROTECTION.includes(so.protectionAtGoLive)) add('signoff-protection-unstated', where, 'say whether protection was active, proposed or none at go-live');
    if (!so.followUp || !so.followUp.due || !['fixed', 'mitigated'].includes(so.followUp.kind)) add('signoff-without-follow-up', where, 'needs a promised follow-up: fixed or mitigated, by a date');
    else if (so.followUp.due < so.date) add('signoff-follow-up-before', where, `follow-up due ${so.followUp.due}, before the sign-off on ${so.date}`);
    for (const id of so.bugs || []) {
      const issue = byId.get(id);
      if (!issue) { add('signoff-unknown-bug', where, `${id} doesn't exist`); continue; }
      if (so.date < issue.created) { add('signoff-before-bug', where, `signed off on ${so.date}, but ${id} was raised on ${issue.created}`); continue; }
      const then = M.stateAt(issue, so.date);
      if (!then.open) add('signoff-bug-closed', where, `${id} was already closed on ${so.date}`);
      else if (!M.URGENT.includes(then.impact)) add('signoff-bug-not-urgent', where, `${id} was ${then.impact || 'not scored'} on ${so.date}; the log is for open High and Very high bugs`);
      if (issue.team !== so.team) add('signoff-team-mismatch', where, `${id} belongs to ${issue.team}, not ${so.team}`);
      // The sign-off can't claim protection that the bug's history doesn't show yet, or hide protection that existed.
      const protectedThen = !!then.firstMitigated && then.firstMitigated <= so.date && !!then.mitigated;
      if (so.protectionAtGoLive === 'active' && !protectedThen) add('signoff-claims-protection', where, `says protection was active on ${so.date}, but ${id} wasn't mitigated until ${M.stateAt(issue, asOf).firstMitigated || 'later (not yet)'}`);
      if (PROTECTION.includes(so.protectionAtGoLive) && so.protectionAtGoLive !== 'active' && protectedThen) add('signoff-understates-protection', where, `says protection was ${so.protectionAtGoLive}, but ${id} was already mitigated on ${then.firstMitigated}`);
      if (so.protectionAtGoLive === 'proposed' && so.followUp && so.followUp.kind !== 'mitigated') add('signoff-proposal-untracked', where, 'a proposed mitigation needs a follow-up of kind "mitigated"');
    }
    if (!(so.bugs || []).length) add('signoff-without-bugs', where, 'no bugs referenced');
  }

  let prev = null;
  for (const c of data.capacity || []) {
    const monthEnd = M.minus(new Date(Date.UTC(+c.month.slice(0, 4), +c.month.slice(5, 7), 1)).toISOString().slice(0, 10), 1);
    if (!c.reported) add('capacity-without-report-date', c.month, 'no reported date');
    else if (!c.toDate && c.reported <= monthEnd) add('capacity-reported-early', c.month, `a full-month figure reported on ${c.reported}, before the month ended`);
    else if (c.toDate && c.reported > monthEnd) add('capacity-to-date-after-month', c.month, 'a month-to-date figure reported after the month ended');
    if (c.reported > asOf) add('capacity-after-asof', c.month, `reported ${c.reported}`);
    if (![c.planned, c.done].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)) add('capacity-out-of-range', c.month, 'shares must be 0 to 100');
    if (prev && c.month <= prev) add('capacity-out-of-order', c.month, 'months must be in order');
    prev = c.month;
  }
  return problems;
}

if (require.main === module) {
  const file = process.argv[2] || path.join(__dirname, '../dashboard/data.json');
  const problems = validate(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!problems.length) { console.log(`✓ ${file}: every history and decision is consistent`); process.exit(0); }
  console.log(`✗ ${file}`); problems.forEach((p) => console.log(`  - [${p.code}] ${p.where}: ${p.msg}`));
  process.exit(1);
}
module.exports = { validate };
