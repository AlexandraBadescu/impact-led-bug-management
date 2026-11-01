// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// The draft checker must pass a good draft, and catch each problem on its own.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { check } = require('../tools/check-bug-draft.js');

const GOOD = fs.readFileSync(path.join(__dirname, 'fixtures/good-draft.md'), 'utf8');
const codes = (text) => check(text).map((p) => p.code);
// Fake personal data is built at runtime, so this public file never contains anything that looks real.
const FAKE_EMAIL = ['jane.doe', 'example.com'].join('@');
const FAKE_PHONE = ['077', '00 900', '123'].join('');

test('a good draft passes', () => {
  assert.deepEqual(check(GOOD), []);
});

// Each case changes one thing, so a failure can only be for that reason.
const CASES = [
  ['title-jargon', (t) => t.replace('Card charged twice when a customer retries after a payment timeout', 'PaymentService throws on retry after timeout')],
  ['title-vague', (t) => t.replace('Card charged twice when a customer retries after a payment timeout', 'Bug in payments')],
  ['title-long', (t) => t.replace('after a payment timeout', 'after a payment timeout on the payment page during checkout on any device or browser')],
  ['section-missing', (t) => t.replace(/\*\*Not confirmed\*\*\n[^\n]+\n/, '')],
  ['description-long', (t) => t.replace('They see one order but two charges.', 'They see one order but two charges. Support then gets a call. Finance then has to refund it by hand.')],
  ['expected-equals-actual', (t) => t.replace('The retry creates a second charge with the same order number.', 'A retry after a timeout charges the card once and shows one order.')],
  ['steps-missing', (t) => t.replace('- Steps: 1. Add an item to the basket. 2. Pay with the test card that times out. 3. Select "Try again" when the timeout message shows.', '- Steps: retry a payment')],
  ['evidence-missing', (t) => t.replace('- Trace: https://example.test/traces/7f3a9c\n- Failing test run: SHOP-4821', '- Seen in the logs')],
  ['impact-mismatch', (t) => t.replace('- Impact: Very high (High from the matrix, raised one level: money at risk)', '- Impact: Medium')],
  ['impact-incomplete', (t) => t.replace('- Users affected: Medium (customers who retry after a timeout)\n', '')],
  ['impact-reasoning', (t) => t.replace(/- Reasoning: .+\n/, '')],
  ['label-ai-drafted', (t) => t.replace('`ai-drafted`, ', '')],
  ['label-reviewed', (t) => t.replace('`reproducible`', '`reproducible`, `bug-reviewed`')],
  ['label-reproducible', (t) => t.replace('- Reproduced by: Priya (QA), 31 Oct, on staging\n', '')],
  ['privacy-email', (t) => t.replace('Two payment records', `Customer ${FAKE_EMAIL} had two payment records`)],
  ['privacy-phone', (t) => t.replace('Two payment records', `The customer (${FAKE_PHONE}) had two payment records`)],
  ['privacy-card', (t) => t.replace('Two payment records', 'Card 4111 1111 1111 1111 had two payment records')],
  ['privacy-secret', (t) => t.replace('- Trace:', '- Auth: Bearer abcdefghij1234567890\n- Trace:')],
];

for (const [code, mutate] of CASES) {
  test(`catches ${code}, and only that`, () => {
    const changed = mutate(GOOD);
    assert.notEqual(changed, GOOD, 'the case changed the draft');
    assert.deepEqual(codes(changed), [code]);
  });
}

test('the command line exits 1 for a bad draft and 0 for a good one', () => {
  const tmp = path.join(require('os').tmpdir(), `bad-draft-${process.pid}.md`);
  fs.writeFileSync(tmp, GOOD.replace('`ai-drafted`, ', ''));
  const cli = path.join(__dirname, '../tools/check-bug-draft.js');
  assert.throws(() => execFileSync(process.execPath, [cli, tmp], { stdio: 'pipe' }), (e) => e.status === 1);
  execFileSync(process.execPath, [cli, path.join(__dirname, 'fixtures/good-draft.md')], { stdio: 'pipe' });
  fs.unlinkSync(tmp);
});

test('catches a draft written to the human template: "Impact" instead of "Impact suggestion"', () => {
  const changed = GOOD.replace('**Impact suggestion**', '**Impact**');
  assert.deepEqual(codes(changed), ['section-missing', 'section-unknown']);
  assert.match(check(changed).find((p) => p.code === 'section-unknown').msg, /AI drafts use "Impact suggestion"/);
});

test('the optional Suspected section can be left out', () => {
  assert.deepEqual(check(GOOD.replace(/\*\*Suspected\*\*\n[^\n]+\n\n/, '')), []);
});

// One schema, three places. If the skill, the template and the checker drift apart, this fails.
test('the skill, the bug template and the checker list the same AI draft sections', () => {
  const { SCHEMA } = require('../tools/check-bug-draft.js');
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const skill = read('skills/bug-investigation/SKILL.md');
  const draftRules = skill.slice(skill.indexOf('### Bug draft'), skill.indexOf('## Communication style'));
  const skillSections = [...draftRules.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1].replace(/:$/, '')).flatMap((x) => x === 'Expected' ? ['Expected', 'Actual'] : [x]).filter((x) => x !== 'Title');
  assert.deepEqual(skillSections, [...SCHEMA.required.slice(0, 5), 'Suspected', ...SCHEMA.required.slice(5)], 'skill lists the schema in order');
  assert.doesNotMatch(skill, /Omit empty sections/, 'the skill must not drop required sections');
  const template = read('docs/bug-template.md');
  const line = template.match(/^Required sections, in order: (.+)\. Optional: (.+?)\./m);
  assert.ok(line, 'the template states the schema');
  assert.deepEqual(line[1].split(', '), SCHEMA.required);
  assert.deepEqual(line[2].split(', '), SCHEMA.optional);
  // The example the tests use is itself a valid instance of the schema.
  const fixture = [...GOOD.matchAll(/^\*\*([^*]+)\*\*\s*$/gm)].map((m) => m[1]);
  assert.deepEqual(fixture.filter((x) => x !== 'Suspected'), SCHEMA.required);
});
