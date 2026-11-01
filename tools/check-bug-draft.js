#!/usr/bin/env node
// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Checks an AI-drafted bug before a person sees it. Usage: node tools/check-bug-draft.js draft.md [more.md]
// A draft that fails goes back to the AI (or a person) to fix. It never reaches the backlog.
// The rules come from docs/playbook.md, section 11, and the AI draft schema in docs/bug-template.md.
// The privacy checks are a basic safeguard against obvious personal data and secrets. They can't prove a draft is
// clean, so the person who accepts the draft at triage still checks it.
'use strict';
const fs = require('fs');

const LEVELS = ['Low', 'Medium', 'High', 'Very high'];
const USERS = ['Low', 'Medium', 'Large', 'Very large'];
const MATRIX = { 'Low': ['Low', 'Low', 'Low', 'Medium'], 'Medium': ['Low', 'Low', 'Medium', 'Medium'], 'High': ['Medium', 'High', 'High', 'Very high'], 'Very high': ['Medium', 'High', 'Very high', 'Very high'] };
// The one AI draft schema. docs/bug-template.md and skills/bug-investigation/SKILL.md must list the same sections;
// tests/check-bug-draft.test.js checks that they do.
const SCHEMA = {
  required: ['What happens', 'Expected', 'Actual', 'How to reproduce', 'Observed', 'Not confirmed', 'Impact suggestion', 'Labels to add', 'Evidence'],
  optional: ['Suspected'],
};
const REQUIRED = SCHEMA.required;
// Human template headings that an AI draft replaces, so a draft written to the wrong template gets a clear message.
const RENAMED = { 'Impact': 'Impact suggestion', 'Notes': 'Suspected', 'Found by': 'Labels to add (found-with-ai)' };

function sections(text) {
  const out = {};
  const parts = text.split(/^\*\*([^*]+)\*\*\s*$/m);
  for (let i = 1; i < parts.length; i += 2) out[parts[i].trim()] = parts[i + 1].trim();
  return out;
}
const field = (body, name) => { const m = body.match(new RegExp(`^-\\s*${name}:\\s*(.+)$`, 'mi')); return m ? m[1].trim() : null; };
const level = (v, list) => list.slice().sort((a, b) => b.length - a.length).find((l) => v && v.toLowerCase().startsWith(l.toLowerCase())) || null;
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function check(text) {
  const problems = [];
  const add = (code, msg) => problems.push({ code, msg });

  // Title: one line, from the user's point of view, no internal names.
  const t = text.match(/^###\s*Title:\s*(.+)$/m);
  const title = t ? t[1].trim() : '';
  if (!title) add('title-missing', 'No "### Title:" line.');
  else {
    if (title.length > 90) add('title-long', `Title is ${title.length} characters; keep it under 90.`);
    if (/\b[A-Z][a-z]+[A-Z][A-Za-z]*\b|\b(NPE|null pointer|exception|stack ?trace|500 error)\b/.test(title)) add('title-jargon', 'Title uses internal names or error jargon; describe what the user sees.');
    if (/^(bug|issue|problem|error|broken|not working)\b/i.test(title) || title.split(/\s+/).length < 4) add('title-vague', 'Title is too vague; say what fails, when, and for whom.');
  }

  const s = sections(text);
  for (const name of REQUIRED) if (!s[name]) add('section-missing', `Missing section: ${name}.`);
  for (const name of Object.keys(s)) {
    const base = name.replace(/\s*\(.*\)$/, '');
    if (!REQUIRED.includes(name) && !SCHEMA.optional.includes(name)) add('section-unknown', RENAMED[base] ? `"${name}" is the human template's heading; AI drafts use "${RENAMED[base]}".` : `Unknown section "${name}"; see the AI draft schema in docs/bug-template.md.`);
  }

  // Plain words: the description is short enough for anyone to read.
  if (s['What happens']) {
    const sentences = s['What happens'].split(/[.!?](\s|$)/).filter((x) => x && x.trim().length > 2).length;
    const words = s['What happens'].split(/\s+/).filter(Boolean).length;
    if (sentences > 2 || words > 50) add('description-long', `"What happens" is ${words} words in ${sentences} sentences; keep it to two plain sentences.`);
  }
  if (s.Expected && s.Actual && norm(s.Expected) === norm(s.Actual)) add('expected-equals-actual', 'Expected and Actual say the same thing.');

  // Reproduction: numbered steps.
  if (s['How to reproduce']) {
    const steps = (s['How to reproduce'].match(/(^|\s)\d+\.\s+\S/g) || []).length;
    if (steps < 2) add('steps-missing', 'Add at least two numbered steps.');
  }

  // Evidence: something a person can open.
  if (s.Evidence && !/https?:\/\/\S+|\b[A-Z][A-Z0-9]+-\d+\b|\b(request|trace|run|build|job)[ -]?(id)?[:#]?\s*[A-Za-z0-9-]{4,}/i.test(s.Evidence)) add('evidence-missing', 'Evidence needs a link or an ID a person can open.');

  // Impact: a suggestion that follows the scoring matrix.
  if (s['Impact suggestion']) {
    const sev = level(field(s['Impact suggestion'], 'Severity'), LEVELS);
    const users = level(field(s['Impact suggestion'], 'Users affected'), USERS);
    const impact = level(field(s['Impact suggestion'], 'Impact'), LEVELS);
    if (!sev || !users || !impact) add('impact-incomplete', 'Impact suggestion needs Severity, Users affected and Impact, using the scoring guide levels.');
    else {
      const base = MATRIX[sev][USERS.indexOf(users)];
      const raised = /raised one level/i.test(s['Impact suggestion']);
      const expected = raised ? LEVELS[Math.min(LEVELS.indexOf(base) + 1, 3)] : base;
      if (impact !== expected) add('impact-mismatch', `Severity ${sev} and users ${users} give ${base}${raised ? ', raised to ' + expected : ''}, not ${impact}.`);
    }
    if (!/reasoning:/i.test(s['Impact suggestion'])) add('impact-reasoning', 'Add one sentence of impact reasoning.');
  }

  // Labels: honest about AI, and never claiming a team review.
  if (s['Labels to add']) {
    const labels = s['Labels to add'];
    if (!/\bai-drafted\b/.test(labels)) add('label-ai-drafted', 'An AI draft must carry the ai-drafted label.');
    if (/\bbug-reviewed\b/.test(labels)) add('label-reviewed', 'Only the team adds bug-reviewed, at triage.');
    if (/(^|[\s,`])reproducible\b/.test(labels.replace(/not-reproducible/g, '')) && !/reproduced by/i.test(s['How to reproduce'] || '')) add('label-reproducible', 'The reproducible label needs "Reproduced by …" in How to reproduce.');
  }

  // Privacy: no personal data or secrets.
  if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text)) add('privacy-email', 'Remove the email address.');
  if (/(\+44|\b0)7\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/.test(text)) add('privacy-phone', 'Remove the phone number.');
  if (/\b(?:\d[ -]?){13,19}\b/.test(text)) add('privacy-card', 'Remove the long number; it may be a card or account number.');
  if (/\b(bearer\s+[a-z0-9._-]{10,}|sk_live_[a-z0-9]+|api[_-]?key\s*[:=]\s*\S{8,})/i.test(text)) add('privacy-secret', 'Remove the token or key.');

  return problems;
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('Usage: node tools/check-bug-draft.js draft.md [more.md]'); process.exit(2); }
  let failed = 0;
  for (const f of files) {
    if (!fs.existsSync(f)) { console.error(`${f}: file not found`); failed++; continue; }
    const problems = check(fs.readFileSync(f, 'utf8'));
    if (problems.length) { failed++; console.log(`✗ ${f}`); problems.forEach((p) => console.log(`  - [${p.code}] ${p.msg}`)); } else console.log(`✓ ${f}`);
  }
  process.exit(failed ? 1 : 0);
}
module.exports = { check, SCHEMA };
