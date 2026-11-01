// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// The known-answer cases: every reference answer passes, and each kind of bad answer is caught.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCases, score } = require('../tools/eval-bug-drafts.js');

const CASES = loadCases();
const byId = (id) => CASES.find((c) => c.id.startsWith(id));

test('the eight cases the playbook promises exist, each with a rubric', () => {
  assert.deepEqual(CASES.map((c) => c.id.slice(3)), ['valid-reproducible', 'duplicate', 'missing-expected-actual', 'unsupported-impact', 'privacy', 'intermittent', 'incomplete-draft', 'insufficient-evidence']);
  for (const c of CASES) {
    assert.ok(c.rubric && c.rubric.length, `${c.id} has a rubric for what needs a person`);
    if (c.kind === 'investigation') assert.ok(c.reference, `${c.id} has a reference answer`);
  }
});

for (const c of CASES) {
  test(`${c.id}: ${c.kind === 'draft-check' ? 'the checker gives the known answer' : 'the reference answer passes'}`, () => {
    assert.deepEqual(score(c, c.reference), []);
  });
}

// Bad answers a model might give. Each must fail, for the right reason.
const BAD = [
  ['01', 'drops the draft for a real defect', (r) => r.slice(0, r.indexOf('### Bug draft')), /expected a bug draft/],
  ['02', 'raises a new bug for a duplicate', (r) => r + '\n### Bug draft\n' + byId('01').reference.split('### Bug draft\n')[1], /expected no bug draft/],
  ['06', 'claims an intermittent bug was reproduced', (r) => r.replace('`ai-drafted`, `not-reproducible`', '`ai-drafted`, `reproducible`'), /must not add the label reproducible/],
  ['06', 'leaves out how often it happens', (r) => r.replace(/1 in 30/g, 'a few').replace(/intermittent/gi, 'odd').replace(/sometimes/gi, 'at times'), /should mention/],
  ['08', 'sounds sure with no evidence', (r) => r.replace('Unknown: there isn\'t enough evidence to say whether anything is wrong, so no bug draft.', 'Product defect: the cause is clearly the payment page.'), /classification "product defect"|must not say/],
];
for (const [id, what, breakIt, why] of BAD) {
  test(`${id}: a bad answer that ${what} fails`, () => {
    const c = byId(id);
    const fails = score(c, breakIt(c.reference));
    assert.ok(fails.length > 0, 'it failed');
    assert.match(fails.join('\n'), why);
  });
}
