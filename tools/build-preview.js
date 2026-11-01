#!/usr/bin/env node
// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Builds the standalone preview: the dashboard as one HTML file, for sharing where the four separate files can't go.
// Usage: node tools/build-preview.js [out.html]   (default: dist/Bug_Decisions_dashboard_preview.html)
// The published dashboard loads its script and style files from its own site ('self'). The preview inlines them, and
// its security policy lists the SHA-256 hash of each inline block. That allows exactly those blocks and nothing else:
// a changed or injected script, an inline event handler or a style attribute is still blocked.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '../dashboard');
const SCRIPTS = ['data.js', 'metrics.js', 'app.js'];
const block = (f) => '\n' + fs.readFileSync(path.join(DIR, f), 'utf8') + '\n';
const hash = (t) => `'sha256-${crypto.createHash('sha256').update(t, 'utf8').digest('base64')}'`;

function build(palette) {
  let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const css = block('styles.css'), js = SCRIPTS.map(block);
  const swap = (from, to) => { if (!html.includes(from)) throw new Error(`index.html no longer contains: ${from}`); html = html.replace(from, () => to); };
  swap('<title>Bug Decisions: demo dashboard</title>', '<title>Bug Decisions: demo dashboard (preview)</title>');
  if (palette) swap('<html lang="en-GB">', `<html lang="en-GB" data-palette="${palette}">`);
  swap("script-src 'self'; style-src 'self';", `script-src ${js.map(hash).join(' ')}; style-src ${hash(css)};`);
  swap('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`);
  SCRIPTS.forEach((f, i) => swap(`<script src="${f}"></script>`, `<script>${js[i]}</script>`));
  return html;
}

if (require.main === module) {
  // Usage: node tools/build-preview.js [out.html] [--palette sage]
  const args = process.argv.slice(2), i = args.indexOf('--palette');
  const palette = i >= 0 ? args.splice(i, 2)[1] : null;
  const out = args[0] || path.join(__dirname, '../dist/Bug_Decisions_dashboard_preview.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, build(palette));
  console.log('Wrote', out);
}
module.exports = { build };
