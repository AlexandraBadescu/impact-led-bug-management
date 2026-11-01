#!/usr/bin/env node
// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Scores bug-investigation output against the known-answer cases in evals/bug-drafts/cases.
//   node tools/eval-bug-drafts.js               checks the checker cases, and scores the hand-written reference answers
//   node tools/eval-bug-drafts.js outputs/      scores real skill output: one file per case, named <case-id>.md
// It scores what can be checked mechanically: the classification, whether a draft was written, the draft checker's
// result, labels, and phrases that must or mustn't appear. Whether the evidence really supports the finding needs a
// person: each case lists its rubric, and evals/bug-drafts/README.md says how to use it.
'use strict';
const fs = require('fs');
const path = require('path');
const { check } = require('./check-bug-draft.js');

const CASES = path.join(__dirname, '../evals/bug-drafts/cases');
// The skill's classification list (skills/bug-investigation/SKILL.md).
const CLASSES = ['product defect', 'automation defect', 'test data issue', 'environment issue', 'configuration issue', 'requirement ambiguity', 'expected behaviour', 'duplicate', 'unknown'];
// Personal data for the privacy case is built here, so no file in the repo contains anything that looks real.
const FAKE = { '{{FAKE_EMAIL}}': ['sam.example', 'example.com'].join('@'), '{{FAKE_PHONE}}': ['077', '00 900', '123'].join('') };
const expand = (t) => Object.entries(FAKE).reduce((s, [k, v]) => s.split(k).join(v), t);

function loadCases() {
  return fs.readdirSync(CASES).sort().map((id) => {
    const dir = path.join(CASES, id), read = (f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : null);
    return { id, dir, ...JSON.parse(read('case.json')), input: expand(read('input.md')), reference: read('reference.md') };
  });
}

const section = (text, name) => { const m = text.match(new RegExp(`^### ${name}\\s*\\n([\\s\\S]*?)(?=^### (?!Title:)|$(?![\\s\\S]))`, 'm')); return m ? m[1].trim() : null; };
const draftOf = (text) => { const i = text.search(/^### Bug draft\s*$/m); return i < 0 ? null : text.slice(i).replace(/^### Bug draft\s*\n/, ''); };
const classify = (finding) => { const f = (finding || '').toLowerCase(); return CLASSES.find((c) => f.includes(c)) || null; };
const sameCodes = (got, want) => {
  const used = new Set();
  return got.length === want.length && want.every((w) => { const i = got.findIndex((g, k) => !used.has(k) && g.code === w.code && (!w.contains || g.msg.includes(w.contains))); if (i < 0) return false; used.add(i); return true; });
};

// Scores one answer against one case. Returns the list of failures; empty means it passed the automated part.
function score(c, output) {
  const fail = [];
  const e = c.expect;
  if (c.kind === 'draft-check') {
    const got = check(c.input);
    if (!sameCodes(got, e.checkerCodes)) fail.push(`checker gave [${got.map((p) => p.code).join(', ')}], expected [${e.checkerCodes.map((x) => x.code).join(', ')}]`);
    return fail;
  }
  const cls = classify(section(output, 'Finding'));
  if (!e.classification.includes(cls)) fail.push(`classification "${cls || 'none'}", expected ${e.classification.join(' or ')}`);
  const draft = draftOf(output);
  if (e.draft === true && !draft) fail.push('expected a bug draft');
  if (e.draft === false && draft) fail.push('expected no bug draft');
  if (draft) {
    const codes = check(draft).map((p) => p.code);
    if (e.checkerCodes && codes.join() !== e.checkerCodes.join()) fail.push(`draft fails the checker: ${codes.join(', ')}`);
    const labels = (draft.match(/\*\*Labels to add\*\*\s*\n([^\n]*)/) || [])[1] || '';
    const has = (l) => new RegExp(`\`${l}\``).test(labels);
    for (const l of e.labelsInclude || []) if (!has(l)) fail.push(`draft should add the label ${l}`);
    for (const l of e.labelsExclude || []) if (has(l)) fail.push(`draft must not add the label ${l}`);
  }
  for (const re of e.mustMention || []) if (!new RegExp(re, 'i').test(output)) fail.push(`should mention /${re}/`);
  for (const re of e.mustNotContain || []) if (new RegExp(re, 'i').test(output)) fail.push(`must not say /${re}/`);
  return fail;
}

if (require.main === module) {
  const dir = process.argv[2];
  let failed = 0, notRun = 0;
  for (const c of loadCases()) {
    let output = c.reference;
    if (dir && c.kind === 'investigation') {
      const f = path.join(dir, `${c.id}.md`);
      if (!fs.existsSync(f)) { notRun++; console.log(`- ${c.id}: not run (no ${f})`); continue; }
      output = fs.readFileSync(f, 'utf8');
    }
    const fails = score(c, output);
    if (fails.length) failed++;
    console.log(`${fails.length ? '✗' : '✓'} ${c.id}: ${c.title}${fails.map((x) => `\n    - ${x}`).join('')}`);
  }
  console.log(dir ? `\nScored ${dir}. ${notRun} not run. Still score each answer against its rubric by hand.` : '\nChecked the checker cases and the reference answers. To score real skill output, pass a folder.');
  process.exit(failed ? 1 : 0);
}
module.exports = { loadCases, score, classify };
