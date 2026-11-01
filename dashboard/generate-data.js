// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Builds the fictional demo data for the dashboard: run `node dashboard/generate-data.js`.
// Everything here is invented. No real company, customer or ticket is described.
// The output is deterministic, so the tests can rely on exact numbers.
'use strict';
const fs = require('fs');
const path = require('path');

const AS_OF = '2026-10-31';
const DAY = 86400000;
const d = (s) => Date.parse(s + 'T00:00:00Z');
const plus = (s, n) => new Date(d(s) + n * DAY).toISOString().slice(0, 10);
const minus = (s, n) => plus(s, -n);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// MaxQ Ltd is a fictional multi-product platform: MaxQ Shop (online grocery and household), MaxQ Pay (its own card
// payments, refunds and promotions) and MaxQ Verify (identity, proof-of-address and bank-statement checks, used at
// sign-up and sold to other businesses). Three teams own the three areas below.

// Impact model: severity and users affected, read from a matrix (see docs/scoring-guide.md).
const LEVELS = ['Low', 'Medium', 'High', 'Very high'];
const MATRIX = {
  //            Low users  Medium     Large        Very large
  'Low':       ['Low',     'Low',     'Low',       'Medium'],
  'Medium':    ['Low',     'Low',     'Medium',    'Medium'],
  'High':      ['Medium',  'High',    'High',      'Very high'],
  'Very high': ['Medium',  'High',    'Very high', 'Very high'],
};
const USERS = ['Low', 'Medium', 'Large', 'Very large'];
const impactOf = (sev, users) => MATRIX[sev][USERS.indexOf(users)];
const raise = (level) => LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)];
// The model allows raising impact one level for safety, compliance or money at risk,
// with the reason written on the ticket. These are the fictional bugs where it applies.
const RAISED = {
  'Card charged twice': 'Customers lose money',
  'Identity check shows "passed"': 'Compliance risk',
  'Allergen information missing': 'Safety risk',
  'Keyboard focus jumps': 'Accessibility failure at payment (WCAG 2.2 AA)',
  'Declined-card message': 'Accessibility failure at payment (WCAG 2.2 AA)',
  'Sign-up errors shown by colour': 'Accessibility failure at sign-up (WCAG 2.2 AA)',
  'Deleted accounts keep receiving': 'Data protection risk',
  'SMS updates sent even when': 'Consent risk',
  'Proof of address older': 'Compliance risk',
  'VAT line missing': 'Compliance risk',
};
// Bugs the team couldn't reproduce yet (Jira label not-reproducible). Everything else that's been triaged is reproducible.
const NOT_REPRODUCED = ['Session ends while the customer is mid-checkout', 'Courier webhook failures are not retried', 'Selfie step fails on older Android cameras', 'Social sign-in creates a second account for the same email'];
// AI labels (see docs/labels-guide.md). found-with-ai: an AI tool helped find it (AI-generated tests, AI code review,
// AI flaky-test analysis). ai-drafted: an AI tool drafted the ticket from a support ticket or log, and a person checked it.
const FOUND_WITH_AI = ['Login page sometimes fails in the E2E suite only', 'Payment webhook duplicates create two refund records', 'Order confirmation page appears before the payment is authorised',
  'Name change not copied to the verification record', 'Order search fails for order numbers with leading zeros', 'Partial refund can exceed what is left on the order', 'Date of birth field accepts future dates'];
const AI_DRAFTED = ['Social sign-in creates a second account for the same email', 'Order emails sent twice when the status changes quickly', 'Refund confirmation email shows £0.00',
  'Delivery fee charged above the free-delivery threshold in one region', 'Pasted two-factor codes are not accepted', 'Invoice PDF is blank for orders with more than 20 lines',
  'Return label email contains a blank QR code', 'Order history is empty for customers with over 200 orders', 'Locked-out customers see a generic error with no support route',
  'Substitutions not shown before payment', 'Partial dispatch shows the whole order as dispatched'];
const aiLabels = (title) => [...(FOUND_WITH_AI.includes(title) ? ['found-with-ai'] : []), ...(AI_DRAFTED.includes(title) ? ['ai-drafted'] : [])];
const raisedFor = (title) => { const k = Object.keys(RAISED).find((k) => title.startsWith(k)); return k ? RAISED[k] : null; };

// How much a mitigation protects users (docs/playbook.md, "Mitigation counts"). Keyed by title prefix.
const MITIGATION_TYPE = {
  'Card charged twice': 'Removes the risk',            // canary rolled back
  'VAT line missing': 'Relies on a manual step',        // finance corrects receipts on request
  'Identity check stays "pending"': 'Reduces the risk', // a job re-runs stuck checks every 15 minutes
  'Delivery address change': 'Reduces the risk',        // changes blocked after dispatch, with a clear message
};
const mitigationTypeFor = (title) => { const k = Object.keys(MITIGATION_TYPE).find((k) => title.startsWith(k)); return k ? MITIGATION_TYPE[k] : 'Relies on a manual step'; };
// A deferral recorded by bulk change during the backlog reset, which skipped the transition screen, so it has no
// reason. The dashboard must flag it: a deferral without a reason is postponement, not a decision.
const DEFERRED_WITHOUT_REASON = ['Collection point list includes closed locations'];

const DEVELOPERS = {
  'Checkout & Payments': ['Priya', 'Tom'],
  'Accounts & Identity': ['Sam', 'Ana'],
  'Orders & Delivery': ['Luca', 'Mei'],
};

// Each entry: [title, team, area, severity, users, found in, found by, story, root cause, prevention, note]
// "story" picks the life the bug has led so far (see STORIES below).
const P = 'Checkout & Payments', I = 'Accounts & Identity', O = 'Orders & Delivery';
const CATALOGUE = [
  // Checkout & Payments
  ['Card charged twice when a customer retries after a payment timeout', P, 'Payments', 'Very high', 'Medium', 'Production', 'Canary monitoring', 'fixedFast', 'Integration contract', 'API regression check for retries; idempotency key required in the payment contract', 'Canary stopped at 5% and rolled back within the hour. Refunds issued to affected customers.'],
  ['Saved cards missing for some customers after the payment provider switch', P, 'Payments', 'High', 'Large', 'Production', 'Customer support', 'fixedOnTime', 'Data migration gap', 'Migration reconciliation report run before each batch', 'Found by matching support tickets to the migration batch. Fixed before the next batch went live.'],
  ['3-D Secure challenge loops back to checkout on some mobile browsers', P, 'Payments', 'High', 'Medium', 'Staging', 'Exploratory testing', 'fixedOnTime', 'Third-party behaviour', 'Device matrix added to the release checklist', 'Caught before release, so no customer impact.'],
  ['New-customer promo code makes referral credit impossible to redeem', P, 'Promotions', 'High', 'Large', 'Staging', 'Release regression', 'fixedFast', 'Requirement gap', 'Acceptance criteria now cover how promotions combine', 'Release stopped at go/no-go. Four options shared with Product; the lowest-risk one shipped.'],
  ['Refund confirmation email shows £0.00', P, 'Refunds', 'Medium', 'Large', 'Production', 'Customer support', 'fixedLate', 'Untested template change', 'Email snapshot tests added to the regression pack', ''],
  ['Partial refund can exceed what is left on the order', P, 'Refunds', 'High', 'Medium', 'Development', 'API regression (nightly)', 'fixedOnTime', 'Missing boundary check', 'Boundary cases added to the refund API suite', ''],
  ['Basket total does not refresh after removing a discounted item', P, 'Basket', 'Medium', 'Large', 'Staging', 'Playwright regression', 'inProgress', '', '', ''],
  ['Gift card balance ignored when combined with a promo code', P, 'Promotions', 'Medium', 'Medium', 'Production', 'Customer support', 'deferredOverdue', '', '', 'Workaround: support applies the balance manually.'],
  ['Keyboard focus jumps to the top of the payment form after a validation error', P, 'Payments', 'High', 'Low', 'Staging', 'Accessibility suite (WCAG 2.2)', 'verification', 'Accessibility not designed in', '', 'Keyboard users can lose their place at payment, a key journey, so it is raised one level.'],
  ['Declined-card message is not announced by screen readers', P, 'Payments', 'High', 'Low', 'Development', 'Accessibility suite (WCAG 2.2)', 'agedNoPlan', '', '', 'Screen reader users are not told why payment failed.'],
  ['VAT line missing from receipts for business accounts', P, 'Refunds', 'High', 'Low', 'Production', 'Customer support', 'mitigatedDeferred', '', '', 'Mitigation: finance sends corrected receipts on request. Structural fix needs the receipts rewrite.'],
  ['Order confirmation page appears before the payment is authorised', P, 'Payments', 'Very high', 'Medium', 'Staging', 'Playwright regression', 'fixedFast', 'Race condition', 'Wait-for-authorisation assertion added to E2E tests', 'Blocked the release; fixed the same day.'],
  ['Checkout takes over 8 seconds for baskets with 30+ items', P, 'Basket', 'Medium', 'Low', 'Production', 'Production monitoring', 'deferredFuture', '', '', 'Affects a small group of bulk buyers. Planned with the basket service rework.'],
  ['Expired promo code still accepted in the mobile app', P, 'Promotions', 'Medium', 'Medium', 'Production', 'Customer support', 'reopened', 'Cache not invalidated', '', 'Reopened: the first fix covered web only.'],
  ['Default card not preselected on the payment page', P, 'Payments', 'Low', 'Large', 'Production', 'Customer support', 'lowBacklog', '', '', ''],
  ['Multi-buy discount rounds 1p differently from the shelf price', P, 'Promotions', 'Low', 'Medium', 'Staging', 'Exploratory testing', 'closedAccepted', '', '', 'Accepted by the product owner: the difference is within the pricing policy. Closed with the reason and what would make us look again.'],
  ['Delivery fee charged above the free-delivery threshold in one region', P, 'Basket', 'Medium', 'Low', 'Production', 'Customer support', 'untriaged', '', '', ''],
  ['Generic "Something went wrong" at checkout with no next step', P, 'Payments', 'Low', 'Medium', 'Production', 'Exploratory testing', 'lowBacklog', '', '', ''],
  ['Payment webhook duplicates create two refund records', P, 'Refunds', 'High', 'Low', 'Development', 'Contract test', 'fixedOnTime', 'Integration contract', 'Pact contract test for webhook replays', ''],
  ['Currency symbol in the wrong place for euro customers', P, 'Basket', 'Low', 'Low', 'Staging', 'Exploratory testing', 'closedDuplicate', '', '', 'Duplicate of an existing localisation bug.'],

  // Accounts & Identity
  ['Identity check stays "pending" after the document upload completes', I, 'ID checks', 'High', 'Large', 'Production', 'API regression (nightly)', 'mitigatedDeferred', '', '', 'Mitigation: status job re-runs every 15 minutes. Root fix needs the event-driven rewrite.'],
  ['Identity check shows "passed" before the check has run', I, 'ID checks', 'Very high', 'Large', 'Production', 'API regression (nightly)', 'newUrgent', '', '', 'Compliance risk. Escalated to the EM and product owner the same morning.'],
  ['Selfie step fails on older Android cameras', I, 'ID checks', 'Medium', 'Medium', 'Production', 'Customer support', 'deferredFuture', '', '', 'Workaround: document-only route offered by support.'],
  ['Surnames with an apostrophe block sign-up', I, 'Sign-up', 'High', 'Low', 'Production', 'Customer support', 'fixedOnTime', 'Missing boundary check', 'Name test data set added to sign-up regression', ''],
  ['Password reset link expires before the email arrives for some providers', I, 'Login', 'High', 'Medium', 'Production', 'Customer support', 'fixedOnTime', 'Third-party behaviour', 'Email delivery timing added to the login regression checks', ''],
  ['Date of birth field accepts future dates', I, 'Sign-up', 'Low', 'Low', 'Staging', 'Exploratory testing', 'lowBacklog', '', '', ''],
  ['Pasted two-factor codes are not accepted', I, 'Login', 'Low', 'Medium', 'Production', 'Customer support', 'untriaged', '', '', ''],
  ['Address lookup returns nothing for new-build postcodes', I, 'Sign-up', 'Medium', 'Low', 'Production', 'Customer support', 'deferredOverdue', '', '', 'Workaround: manual address entry.'],
  ['Deleted accounts keep receiving marketing emails', I, 'Profile', 'High', 'Low', 'Production', 'Customer support', 'fixedLate', 'Integration contract', 'Contract test for account-deleted events', 'Data protection risk; escalated to leadership when it passed 30 days.'],
  ['Session ends while the customer is mid-checkout', I, 'Login', 'High', 'Large', 'Production', 'Production monitoring', 'inProgress', '', '', ''],
  ['Already verified customers asked to verify again', I, 'ID checks', 'Medium', 'Medium', 'Production', 'Customer support', 'fixedOnTime', 'Shared test data', 'Isolated test data per run in the identity suite', ''],
  ['Sign-up errors shown by colour only', I, 'Sign-up', 'High', 'Low', 'Staging', 'Accessibility suite (WCAG 2.2)', 'fixedOnTime', 'Accessibility not designed in', 'Error-state check added to the accessibility suite', 'WCAG 1.4.1 (use of colour).'],
  ['Proof of address older than 3 months accepted', I, 'ID checks', 'High', 'Low', 'Production', 'API regression (nightly)', 'reopened', 'Requirement gap', '', 'Reopened once: the first fix missed scanned documents.'],
  ['Bank statement upload shows an estimated balance instead of the printed one', I, 'ID checks', 'Medium', 'Low', 'Production', 'API regression (nightly)', 'untriaged', '', '', ''],
  ['Locked-out customers see a generic error with no support route', I, 'Login', 'Medium', 'Low', 'Production', 'Customer support', 'lowBacklog', '', '', ''],
  ['Social sign-in creates a second account for the same email', I, 'Login', 'Medium', 'Low', 'Production', 'Customer support', 'closedNotRepro', '', '', 'Not reproducible after two attempts with the reporter, and no further reports or log evidence. Closed with what was tried.'],
  ['Name change not copied to the verification record', I, 'Profile', 'Medium', 'Low', 'Development', 'API regression (nightly)', 'fixedOnTime', 'Integration contract', 'Contract test between profile and ID services', ''],
  ['Phone number error appears under the wrong field', I, 'Profile', 'Low', 'Low', 'Staging', 'Playwright regression', 'deferredReplaced', '', '', 'The profile page is being replaced next quarter, so it is deferred to that work with a review date, not closed.'],
  ['Login page sometimes fails in the E2E suite only', I, 'Login', 'Low', 'Low', 'Development', 'Flaky test analysis', 'fixedOnTime', 'Shared test data', 'Test data isolated per run; flaky test removed from quarantine', 'Traced instead of retried.'],

  // Orders & Delivery
  ['Order status stuck on "Packed" after the courier collects it', O, 'Tracking', 'High', 'Large', 'Production', 'Production monitoring', 'agedNoPlan', '', '', ''],
  ['Courier webhook failures are not retried', O, 'Tracking', 'High', 'Medium', 'Production', 'Production monitoring', 'newUrgent', '', '', 'Linked to the "stuck on Packed" bug; may be the same root cause.'],
  ['Tracking timeline shows events an hour apart after the clocks change', O, 'Tracking', 'Low', 'Large', 'Production', 'Customer support', 'deferredFuture', '', '', 'Planned with the time zone clean-up.'],
  ['Delivery slot still shown as available after it fills up', O, 'Delivery slots', 'High', 'Medium', 'Production', 'Customer support', 'fixedOnTime', '', 'Slot capacity check added to API regression', ''],
  ['Invoice PDF is blank for orders with more than 20 lines', O, 'Documents', 'Medium', 'Low', 'Production', 'Customer support', 'deferredOverdue', '', '', 'Workaround: support emails an invoice from the back office.'],
  ['Order history is empty for customers with over 200 orders', O, 'Order history', 'Medium', 'Low', 'Production', 'Customer support', 'lowBacklog', '', '', ''],
  ['Cancel button still shown after the order is dispatched', O, 'Order history', 'Medium', 'Medium', 'Staging', 'Playwright regression', 'fixedOnTime', 'Requirement gap', 'State-based visibility rules in acceptance criteria', ''],
  ['Allergen information missing from delivery notes for chilled items', O, 'Documents', 'Very high', 'Low', 'Staging', 'Exploratory testing', 'fixedFast', 'Requirement gap', 'Safety content check added to the release checklist', 'Safety risk, so impact raised one level. Fixed before release.'],
  ['Substitutions not shown before payment', O, 'Fulfilment', 'High', 'Large', 'Production', 'Customer support', 'escalatedOpen', '', '', 'Past 90 days; escalated to leadership for a fix-or-accept decision.'],
  ['Delivery address change does not reach the courier', O, 'Delivery slots', 'High', 'Medium', 'Production', 'Customer support', 'mitigatedDeferred', '', '', 'Mitigation: changes blocked after dispatch, with a clear message. Courier API change planned.'],
  ['Return label email contains a blank QR code', O, 'Documents', 'Medium', 'Medium', 'Production', 'Customer support', 'fixedLate', 'Untested template change', 'Email snapshot tests added', ''],
  ['Order emails sent twice when the status changes quickly', O, 'Tracking', 'Low', 'Medium', 'Production', 'Customer support', 'closedDuplicate', '', '', 'Duplicate of the webhook retry bug.'],
  ['Map view errors when an order has no geocoded address', O, 'Tracking', 'Low', 'Low', 'Staging', 'Exploratory testing', 'lowBacklog', '', '', ''],
  ['Estimated delivery date ignores bank holidays', O, 'Delivery slots', 'Medium', 'Large', 'Production', 'Customer support', 'verification', 'Missing boundary check', '', ''],
  ['Partial dispatch shows the whole order as dispatched', O, 'Fulfilment', 'Medium', 'Large', 'Production', 'Customer support', 'untriaged', '', '', ''],
  ['SMS updates sent even when the customer turned them off', O, 'Tracking', 'High', 'Low', 'Production', 'Customer support', 'fixedOnTime', 'Integration contract', 'Contract test for notification preferences', 'Consent issue, so treated as compliance risk.'],
  ['Delivery instructions cut off at 50 characters', O, 'Delivery slots', 'Low', 'Medium', 'Production', 'Customer support', 'lowBacklog', '', '', ''],
  ['Collection point list includes closed locations', O, 'Delivery slots', 'Medium', 'Large', 'Production', 'Customer support', 'deferredFuture', '', '', ''],
  ['Confirmation email total leaves out the delivery fee', O, 'Documents', 'Medium', 'Large', 'Staging', 'Release regression', 'fixedOnTime', 'Untested template change', 'Email snapshot tests added', ''],
  ['Order search fails for order numbers with leading zeros', O, 'Order history', 'Low', 'Low', 'Development', 'API regression (nightly)', 'fixedOnTime', 'Missing boundary check', 'Leading-zero case added to search API tests', ''],
];

// Deferral reasons come from a fixed list (a dropdown in Jira), so they can be filtered and counted.
const REASONS = {
  tech: 'Needs a bigger change (tech debt)',
  roadmap: 'Lower priority than the roadmap',
  planned: 'Planned with other work',
  workaround: 'Workaround in place',
  waiting: 'Waiting on another team or supplier',
  evidence: 'Monitoring for more evidence',
  accepted: 'Risk accepted (no fix planned)', // High or Very high risk accepted by leadership: stays open and visible
};

// Each bug has its own random sequence, so changing one bug never moves another bug's dates.
// The seeds below were frozen from version 1.1's single shared sequence, so every existing date stayed the same
// when seeds became per bug. A new bug gets a seed from its ID.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const FROZEN_SEEDS = [20261031,1509107228,2915777845,2560141506,1452327891,4024446648,1267947521,1986895323,4160969023,1684060105,2418915555,4110344391,2158792892,1210905008,2259945444,1558738589,528556618,2732666145,3624437022,1535352159,178537780,1980395944,2108139751,344420107,1041892944,2013381497,821524054,3767286205,1372885569,3821379774,3860565664,3741923849,2986416166,978864826,2900024017,1045658766,4055892367,962884900,689736925,451974538,2718988620,3758449723,3730527647,3919905396,595223272,202217457,1885261870,3158044079,3415406009,979464189,2097678122,2830812763,389347296,4217130002,875560009,3915818854,590111047,477265259,3252233264];
const seedFor = (id) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);

function build(catalogue = CATALOGUE) {
  const issues = [];
  catalogue.forEach((row, i) => {
    const [title, team, area, severity, users, foundIn, foundBy, story, rootCause, prevention, note] = row;
    const id = 'BUG-' + String(i + 101);
    const rand = rng(FROZEN_SEEDS[i] ?? seedFor(id));
    const between = (a, b) => a + Math.floor(rand() * (b - a + 1));
    const raisedBy = raisedFor(title);
    const base = impactOf(severity, users);
    const impact = raisedBy ? raise(base) : base;
    const assignee = DEVELOPERS[team][i % 2]; // the developer who picks it up; the owner is always the team
    const ev = [];
    const add = (date, changes) => { if (date <= AS_OF) ev.push({ date, changes }); };
    const triage = (created, extra = {}) => {
      const t = plus(created, between(0, 2));
      add(t, { status: 'Ready', impact, severity, users, ...(raisedBy ? { raisedBy } : {}), priority: priorityOf(impact, foundIn), reproducible: !NOT_REPRODUCED.includes(title), triaged: t, reviewed: t, reviewDue: plus(t, cadence(impact)), decision: 'Scored, prioritised and assigned', ...extra });
      return t;
    };
    let created;
    switch (story) {
      case 'fixedFast': { // Very high or High, fixed well within target
        created = minus(AS_OF, between(25, 120));
        const t = triage(created);
        add(plus(t, 0), { status: 'In progress', assignee, reviewed: plus(t, 0), decision: 'Fix now' });
        const m = plus(created, between(1, 3));
        const rolledBack = /rolled back/.test(note);
        // A rollback protects users straight away: that's the first mitigation. The permanent fix comes later.
        if (rolledBack) add(t, { mitigated: t, mitigationType: mitigationTypeFor(title), mitigation: 'Canary rolled back within the hour; affected customers refunded', priority: 'P1', reviewed: t,
          decision: 'Emergency over: rollback stopped new double charges. Permanent fix next (P1)' });
        add(m, { status: 'Verification', reviewed: m, decision: 'Permanent fix deployed to staging; verifying', rootCause, prevention });
        add(plus(m, 1), { status: 'Closed', resolution: 'Fixed', closed: plus(m, 1), ...(rolledBack ? {} : { mitigated: plus(m, 1) }), decision: 'Verified and released' });
        break;
      }
      case 'fixedOnTime': {
        created = minus(AS_OF, between(20, 170));
        const t = triage(created);
        add(plus(t, 2), { status: 'In progress', assignee, reviewed: plus(t, 2), decision: 'Fix in this sprint' });
        const m = plus(created, impact === 'High' ? between(6, 13) : between(10, 40));
        add(m, { status: 'Verification', reviewed: m, rootCause, prevention });
        add(plus(m, 1), { status: 'Closed', resolution: 'Fixed', closed: plus(m, 1), mitigated: plus(m, 1), decision: 'Verified and released' });
        break;
      }
      case 'fixedLate': {
        created = minus(AS_OF, between(70, 150));
        const t = triage(created);
        add(plus(t, 20), { status: 'In progress', assignee, reviewed: plus(t, 20), decision: 'Fix after the release freeze' });
        const m = plus(created, between(32, 50));
        add(m, { status: 'Verification', reviewed: m, rootCause, prevention });
        add(plus(m, 3), { status: 'Closed', resolution: 'Fixed', closed: plus(m, 3), mitigated: plus(m, 3), decision: 'Verified and released' });
        break;
      }
      case 'reopened': {
        created = minus(AS_OF, between(30, 60));
        const t = triage(created);
        add(plus(t, 1), { status: 'In progress', assignee, reviewed: plus(t, 1), decision: 'Fix now' });
        const m = plus(created, 9);
        add(m, { status: 'Verification', reviewed: m, decision: 'Fix deployed to staging; verified on web only' });
        add(plus(m, 1), { status: 'Closed', resolution: 'Fixed', closed: plus(m, 1), mitigated: plus(m, 1), decision: 'Verified and released' });
        const r = plus(m, between(4, 10));
        add(r, { status: 'In progress', resolution: 'Reopened', closed: null, mitigated: null, reviewed: r, reviewDue: plus(r, 7), decision: 'Reopened: first fix incomplete' });
        const m2 = plus(r, between(3, 6));
        add(m2, { status: 'Verification', reviewed: m2, rootCause, prevention: 'Regression test added for the missed path' });
        add(plus(m2, 1), { status: 'Closed', resolution: 'Fixed', closed: plus(m2, 1), mitigated: plus(m2, 1), decision: 'Verified on web and mobile, and released' });
        break;
      }
      case 'mitigatedDeferred': { // High: mitigated, re-scored lower, structural fix deferred with a date
        created = minus(AS_OF, between(60, 110));
        const t = triage(created);
        add(plus(t, 1), { status: 'In progress', assignee, reviewed: plus(t, 1), decision: 'Mitigate first' });
        const m = plus(created, between(5, 12));
        add(m, { status: 'Deferred', impact: 'Medium', priority: 'P2', mitigated: m, reviewed: m, reviewDue: plus(AS_OF, between(5, 25)),
          decision: 'Mitigated; structural fix deferred', deferralReason: REASONS.tech, mitigation: cap(note.split('.')[0].replace('Mitigation: ', '')), mitigationType: mitigationTypeFor(title),
          rescoreReason: 'Re-scored after mitigation: users are protected, the root cause remains' });
        break;
      }
      case 'deferredFuture': {
        created = minus(AS_OF, between(40, 140));
        const t = triage(created);
        const r = plus(t, between(5, 20));
        const noReason = DEFERRED_WITHOUT_REASON.includes(title);
        add(r, { status: 'Deferred', priority: 'P3', reviewed: r, reviewDue: plus(AS_OF, between(7, 40)), decision: noReason ? 'Deferred by bulk change in the backlog reset; no reason recorded' : 'Deferred with a review date',
          ...(noReason ? {} : { deferralReason: note.startsWith('Workaround') ? REASONS.workaround : /Planned with/.test(note) ? REASONS.planned : REASONS.roadmap }),
          ...(note.startsWith('Workaround') ? { mitigation: cap(note.replace('Workaround: ', '').replace(/\.$/, '')), mitigationType: 'Relies on a manual step' } : {}) });
        break;
      }
      case 'deferredOverdue': {
        created = minus(AS_OF, between(80, 170));
        const t = triage(created);
        const r = plus(t, between(5, 15));
        add(r, { status: 'Deferred', priority: 'P3', reviewed: r, reviewDue: minus(AS_OF, between(3, 20)), decision: 'Deferred with a review date',
          deferralReason: REASONS.workaround, mitigation: cap(note.replace('Workaround: ', '').replace(/\.$/, '')), mitigationType: 'Relies on a manual step' });
        break;
      }
      case 'agedNoPlan': { // triaged but left in Ready past its decision age
        created = minus(AS_OF, impact === 'Medium' ? between(95, 140) : between(34, 60));
        triage(created);
        break;
      }
      case 'escalatedOpen': {
        created = minus(AS_OF, between(96, 120));
        const t = triage(created);
        add(minus(AS_OF, 4), { reviewed: minus(AS_OF, 4), reviewDue: plus(AS_OF, 3), decision: 'Escalated: fix next milestone or accept the risk', escalated: minus(AS_OF, 4) });
        break;
      }
      case 'inProgress': {
        created = minus(AS_OF, between(6, 20));
        const t = triage(created);
        add(plus(t, 1), { status: 'In progress', assignee, reviewed: plus(t, 1), decision: 'Fix in this sprint' });
        break;
      }
      case 'verification': {
        created = minus(AS_OF, between(8, 25));
        const t = triage(created);
        add(plus(t, 1), { status: 'In progress', assignee, reviewed: plus(t, 1), decision: 'Fix in this sprint' });
        add(minus(AS_OF, 1), { status: 'Verification', reviewed: minus(AS_OF, 1), decision: 'Fix deployed to staging; verifying across browsers' });
        break;
      }
      case 'newUrgent': {
        created = minus(AS_OF, between(0, 1));
        add(created, { status: 'In progress', impact, severity, users, ...(raisedBy ? { raisedBy } : {}), priority: priorityOf(impact, foundIn), reproducible: !NOT_REPRODUCED.includes(title), assignee, triaged: created, reviewed: created, reviewDue: plus(created, 1),
          decision: priorityOf(impact, foundIn) === 'P0' ? 'P0 emergency: team swarming; incident opened' : 'Picked up next: ahead of planned work' });
        break;
      }
      case 'untriaged': {
        created = minus(AS_OF, between(3, 12));
        break;
      }
      case 'lowBacklog': {
        created = minus(AS_OF, between(30, 200));
        const t = triage(created);
        if (d(AS_OF) - d(created) > 180 * DAY) break; // left without a decision past 180 days
        add(plus(t, 3), { status: 'Deferred', priority: 'P3', reviewed: plus(t, 3), reviewDue: plus(AS_OF, between(10, 80)), decision: 'Linked to an initiative',
          deferralReason: REASONS.planned });
        break;
      }
      case 'closedAccepted': case 'closedDuplicate': case 'closedNotRepro': {
        created = minus(AS_OF, between(15, 120));
        const t = triage(created);
        const c = plus(t, between(2, 10));
        const resolution = { closedAccepted: 'Accepted risk', closedDuplicate: 'Duplicate', closedNotRepro: 'Not reproducible' }[story];
        // Closing as accepted risk is only for Low and Medium impact; it records who accepted it and what would reopen it.
        const accepted = story === 'closedAccepted' ? { acceptedBy: 'Product owner, ' + team, lookAgainIf: 'The pricing policy changes, or customers complain about the difference', reviewDue: plus(c, 90) } : {};
        add(c, { status: 'Closed', resolution, closed: c, reviewed: c, closureReason: note, ...accepted });
        break;
      }
      case 'deferredReplaced': { // same random draws as closedAccepted
        created = minus(AS_OF, between(15, 120));
        const t = triage(created);
        const r = plus(t, between(2, 10));
        add(r, { status: 'Deferred', priority: 'P3', reviewed: r, reviewDue: '2027-01-15', decision: 'Deferred to the profile page replacement, with a review date',
          deferralReason: REASONS.planned });
        break;
      }
      default: throw new Error('Unknown story ' + story);
    }
    // Scores, raise reasons and the summary note are not on the record itself: scores live in the triage event, and
    // the note says when it was written, so a past date can never show something nobody knew yet.
    issues.push({ id, title, team, area, created, labels: aiLabels(title), foundIn, foundBy, ...(note ? { note, noteDate: AS_OF } : {}), events: ev.sort((a, b) => a.date.localeCompare(b.date)) });
  });
  return issues;
}

// Starting priority: impact suggests it; the team agrees it at triage.
// P0 emergency (stop and swarm), P1 next up, P2 planned, P3 later.
function priorityOf(impact, foundIn) {
  if (impact === 'Very high') return foundIn === 'Production' ? 'P0' : 'P1';
  return { 'High': 'P1', 'Medium': 'P2', 'Low': 'P3' }[impact];
}

function cadence(impact) { return { 'Very high': 1, 'High': 7, 'Medium': 30, 'Low': 90 }[impact]; }

// Required by the tests: build() without writing files.
if (require.main !== module) { module.exports = { build, CATALOGUE, AS_OF }; return; }

const data = {
  fictional: true,
  asOf: AS_OF,
  product: 'MaxQ Ltd (fictional multi-product platform: MaxQ Shop, MaxQ Pay and MaxQ Verify)',
  teams: [P, I, O].sort(),
  issues: build(),
  // Go-live sign-offs. Each references bugs that were open and High or Very high on the day, says how users were
  // protected and what was promised. Whether the promise was kept is worked out from the bug's history, never typed in.
  // tools/validate-data.js checks every one of these rules.
  // Go-live sign-offs. Each references bugs that were open and High or Very high on the day, and says:
  // - who was accountable, and who was consulted;
  // - how users were protected *at go-live*: active (a mitigation already in place, which must match the bug's
  //   history), proposed (agreed, not in place yet: the follow-up tracks it) or none (the risk was carried as it was);
  // - the residual risk accepted, and what was promised by when.
  // Whether the promise was kept is worked out from the bug's history, never typed in. tools/validate-data.js checks it all.
  signOffs: [
    { id: 'SO-1', milestone: 'Payment provider switch, batch 2', team: P, date: '2026-07-27', bugs: ['BUG-111'],
      accountable: 'Product owner, Checkout & Payments',
      consulted: 'Engineering manager and QA lead; the finance lead, who owns VAT compliance, agreed corrected receipts meet the requirement',
      reason: 'Delaying batch 2 would keep two payment providers running for another month.',
      protectionAtGoLive: 'proposed',
      protection: 'Finance to send corrected receipts to business accounts in the batch. Agreed at go-live, not yet in place.',
      residualRisk: 'Until finance starts, business accounts in batch 2 get receipts without the VAT line.',
      followUp: { action: 'Mitigation in place', kind: 'mitigated', due: '2026-07-31' } },
    { id: 'SO-2', milestone: 'Checkout redesign', team: P, date: '2026-10-15', bugs: ['BUG-109'],
      accountable: 'Product owner, Checkout & Payments',
      consulted: 'Engineering manager and QA lead (QA recommended holding the release; see the worked disagreement in the role guides)',
      reason: 'The fix was in progress, and the redesign removes two other accessibility problems.',
      protectionAtGoLive: 'none',
      protection: 'No mitigation. Support can take payment by phone for keyboard users who get stuck.',
      residualRisk: 'Keyboard and screen reader users can lose their place after a payment error until the fix ships.',
      followUp: { action: 'Fix released', kind: 'fixed', due: '2026-10-22' } },
  ],
  // Share of completed tickets that were bugs or tech debt, from monthly reports. A month only appears once its report
  // exists, so going back in time never shows a figure nobody had yet. October is a month-to-date snapshot.
  capacity: [
    { month: '2026-08', reported: '2026-09-01', planned: 20, done: 12 },
    { month: '2026-09', reported: '2026-10-01', planned: 20, done: 17 },
    { month: '2026-10', reported: '2026-10-31', planned: 20, done: 21, toDate: true },
  ],
};

const out = path.join(__dirname, 'data.js');
fs.writeFileSync(out, '// Generated by generate-data.js. Fictional data only.\nwindow.DEMO = ' + JSON.stringify(data, null, 1) + ';\n');
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 1));
console.log('Wrote', data.issues.length, 'fictional bugs to', out);
