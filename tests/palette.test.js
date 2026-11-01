// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// The chart colours stay distinguishable, including with colour blindness, and the check can fail.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { check } = require('../tools/check-palette.js');

const CSS = fs.readFileSync(path.join(__dirname, '../dashboard/styles.css'), 'utf8');

test('the dashboard\'s chart colours pass in light and dark mode', () => {
  assert.deepEqual(check(CSS), []);
});

test('the check catches a forest and rose pair that protanopia merges (the first sage palette had one)', () => {
  const broken = CSS.replace(/--c1: #[0-9a-f]{6};/, '--c1: #2f6b4f;').replace(/--c2: #[0-9a-f]{6};/, '--c2: #b1544c;');
  assert.match(check(broken).join('\n'), /light, protanopia: --c1 and --c2 are only ΔE 1\.\d apart/);
});

test('the check catches an impact ramp that does not get stronger', () => {
  const broken = CSS.replace(/--seq-m: #[0-9a-f]{6};/, '--seq-m: #22402f;');
  assert.match(check(broken).join('\n'), /light: --seq-(m|h) is not clearly darker/);
});

test('the check catches a series colour too faint on its card', () => {
  const broken = CSS.replace(/--c5: #[0-9a-f]{6};/, '--c5: #e7e2ee;');
  assert.match(check(broken).join('\n'), /light: --c5 #e7e2ee has 1\.\d+:1 on the card/);
});
