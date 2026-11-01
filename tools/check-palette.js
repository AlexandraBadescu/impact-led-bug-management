#!/usr/bin/env node
// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Checks the dashboard's chart colours, in light and dark mode, read straight from dashboard/styles.css:
// - the five series colours (--c1 to --c5) stay distinguishable with normal vision and with each common type of
//   colour blindness, simulated with Machado, Oliveira and Fernandes (2009) at full severity;
// - each series colour has at least 3:1 contrast with the card it's drawn on (WCAG 1.4.11);
// - the impact ramp (--seq-l to --seq-vh) gets steadily stronger: darker in light mode, brighter in dark mode.
// Distance is CIE76 ΔE in Lab. It's an approximation of what people see, so it complements a check by a person;
// it doesn't replace one. Usage: node tools/check-palette.js
'use strict';
const fs = require('fs');
const path = require('path');

const LIMITS = { normal: 20, cvd: 12, contrast: 3, rampStep: 10 };
const SIM = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};

const lin = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const lum = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const contrast = (a, b) => { const [x, y] = [lum(lin(a)), lum(lin(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function lab([r, g, b]) {
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X / 0.95047), f(Y), f(Z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const simulate = (rgb, m) => m.map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The token blocks: the first ":root {" is light mode, the ":root {" inside the dark media query is dark mode.
function tokens(css) {
  const block = (from) => { const i = css.indexOf(':root {', from); return css.slice(i, css.indexOf('}', i)); };
  const read = (text) => Object.fromEntries([...text.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
  return { light: read(block(0)), dark: read(block(css.indexOf('@media (prefers-color-scheme: dark)'))) };
}

function check(css) {
  const problems = [];
  for (const [mode, t] of Object.entries(tokens(css))) {
    const series = [1, 2, 3, 4, 5].map((i) => [`--c${i}`, t[`--c${i}`]]);
    for (const [name, hex] of series) {
      const c = contrast(hex, t['--card']);
      if (c < LIMITS.contrast) problems.push(`${mode}: ${name} ${hex} has ${c.toFixed(2)}:1 on the card, under ${LIMITS.contrast}:1`);
    }
    for (const [vision, m] of [['normal', null], ...Object.entries(SIM)]) {
      const limit = vision === 'normal' ? LIMITS.normal : LIMITS.cvd;
      const L = series.map(([, hex]) => lab(m ? simulate(lin(hex), m) : lin(hex)));
      for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
        const d = dE(L[a], L[b]);
        if (d < limit) problems.push(`${mode}, ${vision}: ${series[a][0]} and ${series[b][0]} are only ΔE ${d.toFixed(1)} apart (need ${limit})`);
      }
    }
    const ramp = ['--seq-l', '--seq-m', '--seq-h', '--seq-vh'].map((k) => [k, lab(lin(t[k]))[0]]);
    for (let i = 1; i < ramp.length; i++) {
      const step = mode === 'light' ? ramp[i - 1][1] - ramp[i][1] : ramp[i][1] - ramp[i - 1][1];
      if (step < LIMITS.rampStep) problems.push(`${mode}: ${ramp[i][0]} is not clearly ${mode === 'light' ? 'darker' : 'brighter'} than ${ramp[i - 1][0]} (L* step ${step.toFixed(1)}, need ${LIMITS.rampStep})`);
    }
  }
  return problems;
}

if (require.main === module) {
  const problems = check(fs.readFileSync(path.join(__dirname, '../dashboard/styles.css'), 'utf8'));
  if (!problems.length) { console.log('✓ chart colours: distinguishable in light and dark mode, including with colour blindness'); process.exit(0); }
  problems.forEach((p) => console.log('✗ ' + p));
  process.exit(1);
}
module.exports = { check, tokens, LIMITS };
