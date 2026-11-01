// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Checks the docs: every link and anchor works, every file carries the licence,
// and nothing names a real employer, client or person's contact details.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'test-results']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const FILES = walk(ROOT);
const MD = FILES.filter((f) => f.endsWith('.md'));

// GitHub's heading anchors: lower case, punctuation removed, spaces to hyphens.
const slug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
function anchors(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  return new Set([...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1])));
}

test('every relative link and anchor in the docs resolves', () => {
  const broken = [];
  for (const file of MD) {
    const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const [p, hash] = target.split('#');
      const dest = p ? path.resolve(path.dirname(file), p) : file;
      if (!fs.existsSync(dest)) { broken.push(`${path.relative(ROOT, file)} -> ${target} (missing file)`); continue; }
      if (hash && dest.endsWith('.md') && !anchors(dest).has(hash)) broken.push(`${path.relative(ROOT, file)} -> ${target} (missing anchor)`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every doc and source file carries the licence notice', () => {
  const missing = FILES.filter((f) => /\.(md|js|css)$/.test(f) && !f.endsWith('data.js'))
    .filter((f) => !fs.readFileSync(f, 'utf8').includes('Alexandra Badescu'))
    .map((f) => path.relative(ROOT, f));
  assert.deepEqual(missing, []);
});

test('no real employer, client, internal name or contact detail appears', () => {
  // The words are stored as one-way hashes, so this public file doesn't reveal the list it guards.
  const hits = [];
  for (const f of FILES.filter((f) => /\.(md|js|css|html|json|yml)$/.test(f))) {
    const text = fs.readFileSync(f, 'utf8');
    const tokens = new Set(text.toLowerCase().match(/[a-z0-9](?:[a-z0-9.]*[a-z0-9])?/g) || []);
    for (const t of tokens) if (BANNED.has(hash(t)) || BANNED.has(hash(t.replace(/\.$/, '')))) hits.push(`${path.relative(ROOT, f)}: a banned word (hash ${hash(t)})`);
    if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text)) hits.push(`${path.relative(ROOT, f)}: email address`);
    if (/(\+44|\b07\d{3})[\s\d]{8,}/.test(text)) hits.push(`${path.relative(ROOT, f)}: phone number`);
  }
  assert.deepEqual(hits, []);
});

test('the privacy check catches a banned word (so a pass means something)', () => {
  assert.ok(BANNED.has(hash(['pat', 'ients'].join(''))), 'a known banned word is in the list');
  assert.ok(!BANNED.has(hash('customers')), 'an ordinary word is not');
});

// Policy parity: the playbook, the Jira setup, the template and the code must state the same rules.
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const row = (text, start) => (text.split('\n').find((l) => l.startsWith(start)) || '');

test('parity: "Waiting for triage" means not triaged, never just unassigned', () => {
  const jql = row(read('docs/jira-setup.md'), '| Waiting for triage |');
  assert.ok(jql, 'the Jira setup has the filter');
  assert.doesNotMatch(jql, /assignee/i, 'an unassigned bug can already be scored and deliberately deferred');
  assert.match(jql, /status = New/);
  assert.ok(row(read('docs/jira-setup.md'), '| Urgent bugs waiting for pickup |'), 'pickup has its own filter');
});

test('parity: a deferral needs a reason and a review date, everywhere', () => {
  assert.match(row(read('docs/jira-setup.md'), '| Any → Deferred |'), /Deferral reason and Review date are filled in/);
  assert.match(row(read('docs/bug-template.md'), '| Deferral reason |'), /\| Yes/);
  assert.match(read('docs/playbook.md'), /\*\*Defer\*\* \| Reason \(required/);
  const M = require('../dashboard/metrics.js');
  const s = M.stateAt({ id: 'X', team: 'T', area: 'A', created: '2026-10-01', events: [{ date: '2026-10-02', changes: { status: 'Deferred', impact: 'Low', triaged: '2026-10-02', reviewDue: '2026-12-01' } }] }, '2026-10-31');
  assert.equal(s.deferralIncomplete, true, 'the dashboard flags a deferral with no reason');
});

test('parity: the fixed list of deferral reasons is the same in the template, the Jira setup and the validator', () => {
  const src = read('tools/validate-data.js');
  const list = JSON.parse(src.match(/const REASONS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  const norm = (x) => x.toLowerCase().replace(/[()]/g, '');
  for (const [file, start] of [['docs/bug-template.md', '| Deferral reason |'], ['docs/jira-setup.md', '| Deferral reason |']]) {
    const text = norm(row(read(file), start));
    for (const r of list) assert.ok(text.includes(norm(r)), `${file} is missing "${r}"`);
  }
});

test('parity: only Low and Medium risks can be closed as accepted', () => {
  const M = require('../dashboard/metrics.js');
  assert.deepEqual([...M.CLOSE_AS_ACCEPTED].sort(), ['Low', 'Medium']);
  assert.match(row(read('docs/jira-setup.md'), '| Any → Closed (Accepted risk) |'), /Impact is Low or Medium/);
});

test('parity: every Jira age filter counts days the way the dashboard does, with the same limits', () => {
  const M = require('../dashboard/metrics.js');
  const jira = read('docs/jira-setup.md');
  assert.doesNotMatch(jira, /created <= -\d+d/, 'relative times count hours from now, not calendar days');
  const used = [...jira.matchAll(/created < startOfDay\(-(\d+)d\)/g)].map((m) => +m[1]);
  const limits = new Set([M.POLICY.triageWithin, ...Object.values(M.POLICY.fixTarget), ...Object.values(M.POLICY.decisionAge), ...Object.values(M.POLICY.escalationAge)]);
  assert.deepEqual([...new Set(used)].sort((a, b) => a - b), [...limits].sort((a, b) => a - b), 'every dashboard limit has a Jira filter, and no other numbers appear');
  for (const n of used) assert.ok(limits.has(n), `${n} days is not one of the dashboard's limits`);
  const past = row(jira, '| Urgent bugs open past target |');
  assert.match(past, /"Very high" AND created < startOfDay\(-7d\)/);
  assert.match(past, /High AND created < startOfDay\(-14d\)/);
});

test('tone: no overclaiming, and no stock opening repeated across the docs', () => {
  const all = MD.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(all, /ready-to-run/i, 'the Jira setup is documented, not installed');
  assert.doesNotMatch(all, /\*\*In plain words:\*\*/);
  assert.doesNotMatch(all, /Impact = severity ×/, 'impact is a matrix lookup, not a multiplication');
  assert.doesNotMatch(all, /AUTHOR FOLLOW-UP|\bTODO\b|\bTBD\b/, 'no working notes in published docs, hidden or not');
});

const crypto = require('crypto');
const hash = (w) => crypto.createHash('sha256').update(w).digest('hex').slice(0, 16);
const BANNED = new Set(["92f7a5e7bdd03849","496c50af6a1feed3","bd5bf93af6b148c6","a73f3e71cc4704d0","3a7f607fe0dd1495","9fe3b18c44622d61","ed92cb33c83fdae0","ee46e2d141d53f08","3bea44f95b17af14","1532e76dbe9d43d0","8b90d8d61b657096","c50a025863dcef5a","2295ff7a8bd8b3f2","9f9c7cfdeee2409d","98569e7e9080addd","87ddbb4e5cec0c1d","758768c3ca261d85","0a2c6ce180b2503e"]);
