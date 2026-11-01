// © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE).
// Renders the demo dashboard in a real browser, to the same standard as the website's release gate:
// 8 widths, light and dark mode, sideways overflow before and after expanding notes, axe-core's automated WCAG A/AA rules,
// text spacing, keyboard use, no console errors, no failed requests and no security policy violations.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { chromium, webkit, firefox } = require('playwright');
const AXE = require.resolve('axe-core/axe.min.js');

const http = require('http');
const fs = require('fs');
const ROOT = path.join(__dirname, '../dashboard');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
let URL;
const VIEWS = ['today', 'week', 'month', 'how'];
const WIDTHS = [280, 344, 390, 690, 768, 860, 1024, 1280]; // folding phone to laptop, as on the website
const SCHEMES = ['light', 'dark'];
const AXE_SOURCE = fs.readFileSync(AXE, 'utf8');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Serve the dashboard over HTTP, the way GitHub Pages does.
let browser, server;
test.before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  URL = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch();
});
test.after(async () => { await browser.close(); server.close(); });

async function open(width, view, colorScheme = 'light') {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); // includes security policy violations
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  await page.goto(URL + '#' + view);
  await page.waitForSelector('#view > *');
  return { page, errors };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function axe(page) {
  // Evaluated directly, so the page's strict security policy stays on during the check.
  await page.evaluate(AXE_SOURCE);
  const result = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), WCAG);
  return result.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(' ')}`);
}

for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    for (const view of VIEWS) {
      test(`${view}, ${width}px, ${scheme}: no errors, no sideways scrolling, no automated axe WCAG A/AA violations`, async () => {
        const { page, errors } = await open(width, view, scheme);
        let o = await overflow(page);
        assert.ok(o <= 0, `page is ${o}px wider than the screen (notes closed)`);
        // Open every "How it's counted" note so hidden text is checked too.
        await page.$$eval('details', (ds) => ds.forEach((d) => { d.open = true; }));
        o = await overflow(page);
        assert.ok(o <= 0, `page is ${o}px wider than the screen (notes open)`);
        assert.deepEqual(await axe(page), [], 'accessibility violations');
        assert.deepEqual(errors, [], 'console errors, failed requests or security policy violations');
        await page.close();
      });
    }
  }
}

test('the action list starts with the 5 most urgent bugs; the rest are one keyboard-reachable click away', async () => {
  const { page, errors } = await open(1280, 'today');
  const visible = () => page.$$eval('#action-table tbody tr', (rs) => rs.filter((r) => !r.hidden && r.offsetParent !== null).length);
  assert.equal(await visible(), 5);
  const btn = page.locator('#toggle-actions');
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');
  assert.match(await btn.textContent(), /Show all 17 bugs \(12 more\)/);
  await btn.focus();
  await page.keyboard.press('Enter');
  assert.equal(await visible(), 17);
  assert.equal(await page.locator('#toggle-actions').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'toggle-actions', 'focus stays on the button');
  await page.keyboard.press('Enter');
  assert.equal(await visible(), 5);
  assert.deepEqual(errors, []);
  await page.close();
  const phone = await open(390, 'today');
  assert.equal(await phone.page.$$eval('#action-table tbody tr', (rs) => rs.filter((r) => getComputedStyle(r).display !== 'none').length), 5, 'phones too, where rows are cards');
  await phone.page.close();
});

test('the three things that make the dashboard credible are visible without opening anything', async () => {
  for (const width of [1280, 390]) {
    const { page } = await open(width, 'month');
    const late = page.locator('.goal .alongside.late');
    assert.ok(await late.isVisible(), `${width}px: overdue urgent bugs beside the on-time rate`);
    assert.match(await late.textContent(), /BUG-109, BUG-110, BUG-140, BUG-148/);
    assert.ok(await page.locator('.summary .fiction').isVisible(), `${width}px: why the fictional data is red`);
    assert.ok(await page.locator('.summary h3:has-text("What needs a decision?")').isVisible(), `${width}px: the decisions summary`);
    assert.ok(await page.locator('.summary li:has-text("BUG-148")').first().isVisible());
    await page.close();
  }
});

test('the action list stays right when the team or date changes, collapsed or expanded', async () => {
  const { page, errors } = await open(1280, 'today');
  const shown = () => page.$$eval('#action-table tbody tr', (rs) => rs.filter((r) => !r.hidden).length);
  await page.click('#toggle-actions');
  assert.equal(await shown(), 17);
  await page.selectOption('#team', 'Orders & Delivery');
  const total = await page.$$eval('#action-table tbody tr', (rs) => rs.length);
  assert.ok(total < 17 && total > 0, 'filtered to one team');
  assert.equal(await shown(), total, 'still expanded, showing every row for that team');
  await page.click('#toggle-actions');
  assert.equal(await shown(), Math.min(5, total));
  await page.selectOption('#team', '');
  await page.fill('#asof', '2026-08-01');
  await page.dispatchEvent('#asof', 'change');
  const past = await page.$$eval('#action-table tbody tr', (rs) => rs.length);
  assert.notEqual(past, 17, 'an earlier date has a different list');
  if (past > 5) assert.match(await page.textContent('#toggle-actions'), new RegExp(`Show all ${past} bugs`));
  assert.deepEqual(errors, []);
  await page.close();
});

test('on phones, where the sidebar notes are hidden, the footer still says who designed it and links to the one-page version', async () => {
  const { page } = await open(390, 'today');
  assert.equal(await page.isVisible('.byline'), false, 'the sidebar byline is hidden on phones');
  const credit = page.locator('footer .credit');
  assert.ok(await credit.isVisible());
  assert.match(await credit.textContent(), /Designed by Alexandra Badescu[\s\S]*fictional[\s\S]*one-page version/);
  await page.close();
});

test('each expanded explanation adds to its summary instead of repeating it', async () => {
  const { page } = await open(1280, 'week');
  const words = (t) => new Set(t.toLowerCase().match(/[a-z]+/g).filter((w) => w.length > 3));
  const pairs = await page.$$eval('#view .panel', (ps) => ps.filter((p) => p.querySelector(':scope > .help + details.more'))
    .map((p) => [p.querySelector('.help').textContent, p.querySelector('details.more p').textContent.split(/(?<=[.?!])\s/)[0]]));
  assert.ok(pairs.length > 0);
  for (const [summary, first] of pairs) {
    const a = words(summary), b = words(first), shared = [...a].filter((w) => b.has(w)).length;
    assert.ok(shared / Math.max(1, Math.min(a.size, b.size)) < 0.7, `"${first}" repeats "${summary}"`);
  }
  await page.close();
});

test('the sidebar says who designed it, that the data is fictional, and links to the one-page version', async () => {
  const { page } = await open(1280, 'today');
  const by = await page.textContent('.byline');
  assert.match(by, /Designed by Alexandra Badescu[\s\S]*fictional/);
  assert.equal(await page.getAttribute('.byline a:has-text("one-page version")', 'href'), 'https://github.com/AlexandraBadescu/impact-led-bug-management/blob/main/docs/minimum-viable-approach.md');
  await page.close();
});

test('help text: a short written summary at a glance, the full explanation under "More about this panel"', async () => {
  const { page } = await open(1280, 'week');
  const helps = await page.$$eval('#view .panel .help', (ps) => ps.map((p) => p.textContent.trim()));
  assert.ok(helps.length > 0);
  assert.ok(helps.every((t) => (t.match(/[.?!](\s|$)/g) || []).length <= 1), 'each visible help line is one sentence');
  assert.ok(await page.locator('details.more').count() > 0, 'the rest is still there, one click away');
  await page.close();
});

test('text spacing (WCAG 1.4.12): no sideways scrolling with wider spacing on a 320px screen', async () => {
  for (const view of VIEWS) {
    const { page } = await open(320, view);
    await page.evaluate(() => {
      document.querySelectorAll('*').forEach((el) => {
        el.style.lineHeight = '1.5'; el.style.letterSpacing = '0.12em'; el.style.wordSpacing = '0.16em';
        if (el.tagName === 'P') el.style.marginBottom = '2em';
      });
    });
    await page.$$eval('details', (ds) => ds.forEach((d) => { d.open = true; }));
    const o = await overflow(page);
    assert.ok(o <= 0, `${view}: page is ${o}px wider than the screen with wider text spacing`);
    await page.close();
  }
});

// Fonts differ by machine: system-ui is Inter or San Francisco on a laptop, but DejaVu Sans on the Linux CI runner,
// which is noticeably wider. CI caught a 12px overflow at 280px that local runs missed, so every view is also checked
// with a deliberately wide font stack. The style is injected for the test only (bypassing the page's policy).
test('no sideways scrolling with a wide font, as on Linux, at 280px and with wider text spacing at 320px', async () => {
  const WIDE = '*{font-family:"DejaVu Sans",Verdana,sans-serif!important} code,pre{font-family:"DejaVu Sans Mono",Menlo,monospace!important}';
  for (const [width, spacing] of [[280, false], [320, true]]) {
    for (const view of VIEWS) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, bypassCSP: true });
      await page.goto(URL + '#' + view);
      await page.waitForSelector('#view > *');
      await page.addStyleTag({ content: WIDE });
      if (spacing) await page.evaluate(() => document.querySelectorAll('*').forEach((el) => { el.style.lineHeight = '1.5'; el.style.letterSpacing = '0.12em'; el.style.wordSpacing = '0.16em'; }));
      await page.$$eval('details', (ds) => ds.forEach((d) => { d.open = true; }));
      const o = await overflow(page);
      assert.ok(o <= 0, `${view} at ${width}px${spacing ? ' with wider spacing' : ''}: ${o}px too wide with a wide font`);
      await page.close();
    }
  }
});

test('tables render as readable tables on wide screens and as cards on phones', async () => {
  for (const [view, sel] of [['today', '#view table.stack'], ['month', '#view table.stack']]) {
    const wide = await open(1280, view);
    const t = await wide.page.$eval(sel, (el) => ({ display: getComputedStyle(el).display, rows: [...el.tBodies[0].rows].filter((r) => !r.hidden).length, h: el.getBoundingClientRect().height, firstRow: el.tBodies[0].rows[0].getBoundingClientRect().height }));
    assert.equal(t.display, 'table', `${view}: the table is laid out as a table`);
    assert.ok(t.firstRow >= 30, `${view}: rows are readable (first row ${t.firstRow}px)`);
    assert.ok(t.h >= t.rows * 30, `${view}: the table isn't squashed (${t.h}px for ${t.rows} rows)`);
    await wide.page.close();
    const phone = await open(390, view);
    const c = await phone.page.$eval(sel, (el) => ({ display: getComputedStyle(el.tBodies[0].rows[0]).display, h: el.tBodies[0].rows[0].getBoundingClientRect().height }));
    assert.equal(c.display, 'block', `${view}: rows become cards on phones`);
    assert.ok(c.h >= 60, `${view}: each card has room (${c.h}px)`);
    await phone.page.close();
  }
});

test('every chart has a text alternative, a legend and a table view, and shows a readout on hover', async () => {
  for (const view of ['today', 'week', 'month']) {
    const { page, errors } = await open(1280, view);
    const charts = await page.$$eval('#view svg[role="img"], #view .sbar[role="img"], #view .pair[role="img"]', (els) => els.map((el) => el.getAttribute('aria-label') || ''));
    assert.ok(charts.length > 0, `${view}: has charts`);
    assert.ok(charts.every((l) => /\d/.test(l)), `${view}: every chart's text alternative includes its numbers`);
    const panels = await page.$$eval('#view .panel', (ps) => ps.filter((p) => p.querySelector('svg[role="img"], .sbar, .pair')).map((p) => ({ legend: !!p.querySelector('.legend, .donut-legend'), table: !!p.querySelector('details.tableview table') })));
    assert.ok(panels.every((p) => p.legend && p.table), `${view}: every chart panel has a legend and a table view`);
    const ticks = await page.$$eval('#view .chart .ax', (ts) => ts.map((t) => t.textContent).filter((t) => /^\d+(\.\d+)?$/.test(t)));
    assert.ok(ticks.every((t) => Number.isInteger(Number(t))), `${view}: axis ticks are whole numbers (${ticks})`);
    if (view === 'week') {
      const hit = page.locator('.chart .hit').nth(5);
      const box = await hit.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForSelector('#tip:not([hidden])');
      assert.match(await page.textContent('#tip'), /Week ending .+\n\d+ new\n\d+ fixed\n\d+ reopened/);
      assert.equal(await page.getAttribute('.chart .guide', 'visibility'), 'visible', 'crosshair shows');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('each view leads with what to act on; the supporting panels are one click away under "Explore"', async () => {
  const { page } = await open(1280, 'today');
  const top = await page.$$eval('#view > section h2, #view > .tiles h2', (hs) => hs.map((h) => h.textContent.trim()));
  assert.ok(top.includes('The action list'), 'the action list is at the top level, right after the tiles');
  const hidden = await page.$$eval('#view details.explore:not([open]) .panel h2', (hs) => hs.map((h) => h.textContent.trim()));
  for (const chart of ['What state are open bugs in?', 'How serious are open bugs?', 'Can we reproduce them?', 'Has the team reviewed them?']) {
    assert.ok(hidden.some((h) => h.startsWith(chart)), `${chart} is under Explore, closed by default`);
  }
  await page.close();
  const w = await open(1280, 'week');
  assert.equal(await w.page.textContent('h2:has-text("Where are bugs caught?") .optional'), 'Optional');
  assert.equal(await w.page.locator('#view > .grid2 h2:has-text("Bug trends")').count(), 1, 'trends stay at a glance');
  await w.page.close();
  const m = await open(1280, 'month');
  const glance = await m.page.$$eval('#view > section h2', (hs) => hs.map((h) => h.textContent.trim()));
  assert.deepEqual(glance, ['This month in three questions', 'Which risks have we chosen to carry?', 'Known urgent bugs accepted at go-live'],
    'leadership sees decisions, goals, risks and promises first');
  await m.page.close();
});

test('the reference page and footer say the strategy is comprehensive and should be simplified', async () => {
  const { page } = await open(1280, 'how');
  assert.match(await page.textContent('.disclaimer'), /comprehensive strategy[\s\S]*Simplify it to fit your team's way of working/);
  assert.match(await page.textContent('footer'), /simplify it to fit your team's way of working/);
  await page.close();
});

test('dropdown text never runs under its arrow', async () => {
  const { page } = await open(1280, 'today');
  const tight = await page.$$eval('select', (els) => els.filter((el) => {
    const cs = getComputedStyle(el);
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const longest = Math.max(...[...el.options].map((o) => c.measureText(o.text).width));
    return longest + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) > el.clientWidth + 1 && el.selectedOptions[0].text.length > 0
      && c.measureText(el.selectedOptions[0].text).width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) > el.clientWidth;
  }).map((el) => el.id));
  assert.deepEqual(tight, []);
  await page.close();
});

test('filter controls line up: same width, same height, arrows in the same place', async () => {
  for (const width of [1280, 390]) {
    const { page } = await open(width, 'today');
    const boxes = await page.$$eval('#asof, #team, #impact', (els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; }));
    const [date, team, impact] = boxes;
    assert.equal(team.w, impact.w, `${width}px: dropdowns are the same width`);
    assert.equal(team.top, impact.top, `${width}px: dropdowns sit on the same line`);
    assert.ok(boxes.every((b) => b.h === 40), `${width}px: every control is 40px tall`);
    if (width > 520) assert.equal(date.w, team.w, 'date and dropdowns share a width on wide screens');
    await page.close();
  }
});

test('every in-page link goes somewhere', async () => {
  const { page } = await open(1280, 'today');
  const missing = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
    .map((a) => a.getAttribute('href').slice(1))
    .filter((id) => !['today', 'week', 'month', 'how'].includes(id) && !document.getElementById(id)));
  assert.deepEqual(missing, []);
  await page.close();
});

test('the page has a strict security policy and no inline styles or scripts in its source', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /style-src 'self'(;|$)/);
  for (const f of ['index.html', 'app.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, f), 'utf8'), /\sstyle=/, `${f} has an inline style attribute`);
  }
  assert.doesNotMatch(html, /<script>(?!<)/, 'no inline scripts');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'no inline event handlers: the policy would block them');
  assert.doesNotMatch(html, /https?:\/\/(?!github\.com|www\.w3\.org)/, 'no third-party resources');
});

test('the bug history opens and closes with the keyboard, and focus returns', async () => {
  const { page } = await open(1280, 'today');
  const first = page.locator('.idbtn').first();
  await first.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog[open]');
  assert.match(await page.textContent('#dlg-title'), /^BUG-\d+: /);
  assert.ok(await page.locator('.timeline li').count() >= 1, 'history shown');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('idbtn')), true, 'focus back on the bug ID');
  await page.close();
});

test('navigation marks the current view and changes the heading', async () => {
  const { page } = await open(1280, 'today');
  await page.click('a[href="#month"]');
  // The view changes on the hashchange event, so wait for it rather than reading straight away.
  await page.waitForFunction(() => document.querySelector('h1').textContent === 'Are we meeting our quality goals?');
  assert.equal(await page.getAttribute('a[href="#month"]', 'aria-current'), 'page');
  assert.equal(await page.getAttribute('a[href="#today"]', 'aria-current'), null);
  await page.click('a[href="#how"]');
  await page.waitForFunction(() => document.querySelector('h1').textContent === 'How it works');
  assert.equal(await page.isVisible('#filters'), false, 'filters are hidden on the reference page');
  await page.close();
});

test('filters change the numbers', async () => {
  const { page } = await open(1280, 'today');
  const urgent = () => page.textContent('.tile:first-child .num');
  assert.equal(await urgent(), '7');
  await page.selectOption('#team', 'Orders & Delivery');
  assert.equal(await urgent(), '3');
  await page.selectOption('#team', '');
  await page.fill('#asof', '2026-07-01');
  await page.dispatchEvent('#asof', 'change');
  assert.notEqual(await urgent(), '7', 'an earlier date shows a different picture');
  await page.close();
});

test('the CSV download contains the filtered bugs', async () => {
  const { page } = await open(1280, 'today');
  await page.selectOption('#team', 'Checkout & Payments');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
  const file = await download.path();
  const lines = require('fs').readFileSync(file, 'utf8').trim().split('\n');
  assert.match(lines[0], /^id,title,team/);
  assert.ok(lines.slice(1).every((l) => l.includes('"Checkout & Payments"')), 'only the selected team');
  assert.equal(lines.length - 1, 20);
  await page.close();
});

test('the monthly view never lets a good rate hide bad news', async () => {
  const { page, errors } = await open(1280, 'month');
  const g1 = await page.textContent('.goal:first-child');
  assert.match(g1, /92%/);
  assert.match(g1, /4 still open past target: BUG-109, BUG-110, BUG-140, BUG-148/, 'overdue urgent bugs sit beside the on-time rate');
  assert.match(g1, /Off track/);
  assert.match(await page.textContent('#view'), /No reason recorded/, 'a deferral without a reason is flagged');
  assert.match(await page.textContent('#view'), /BUG-116[\s\S]*Residual impact[\s\S]*Look again by/, 'a closed accepted risk stays listed, with its residual impact and review date');
  const first = await page.evaluate(() => { const r = document.querySelector('.summary').getBoundingClientRect(); return r.top; });
  assert.ok(first < 900, 'the decisions summary starts on the first screen');
  assert.match(await page.textContent('.summary'), /What needs a decision\?[\s\S]*BUG-148/);
  assert.match(await page.textContent('#view'), /Not done: 9 days overdue/, 'a missed go-live promise shows');
  assert.deepEqual(errors, []);
  await page.close();
});

test('going back in time shows only what was known that day', async () => {
  const { page } = await open(1280, 'month');
  await page.fill('#asof', '2026-10-01');
  await page.dispatchEvent('#asof', 'change');
  const text = await page.textContent('#view');
  assert.doesNotMatch(text, /Oct to date/, 'October\'s figure did not exist on 1 October');
  assert.doesNotMatch(text, /Checkout redesign/, 'a sign-off made later is not shown');
  await page.selectOption('#team', 'Orders & Delivery');
  assert.match(await page.textContent('h2:has-text("What share of completed tickets")'), /All teams/, 'an organisation-wide panel says so when a filter is on');
  await page.close();
  const today = await open(1280, 'today');
  await today.page.fill('#asof', '2026-08-20');
  await today.page.dispatchEvent('#asof', 'change');
  await today.page.click('.idbtn[data-id="BUG-148"]');
  await today.page.waitForSelector('dialog[open]');
  const dlg = await today.page.textContent('#dlg-body');
  assert.doesNotMatch(dlg, /escalated to leadership/i, 'a note written later is hidden on an earlier date');
  assert.doesNotMatch(dlg, /written on|hidden/i, 'and no placeholder that hints a note exists');
  await today.page.close();
});

async function injectScript(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let blocked = false;
    document.addEventListener('securitypolicyviolation', () => { blocked = true; }, { once: true });
    const el = document.createElement('script');
    el.textContent = 'window.__injected = true;';
    document.body.appendChild(el);
    setTimeout(() => resolve({ ran: window.__injected === true, blocked }), 50);
  }));
}

test('the security policy blocks an injected inline script', async () => {
  const { page } = await open(1280, 'today');
  assert.deepEqual(await injectScript(page), { ran: false, blocked: true });
  await page.close();
});

test('pressing Enter in a filter changes nothing and never reloads the page', async () => {
  const { page, errors } = await open(1280, 'month');
  await page.evaluate(() => { window.__stillHere = true; });
  await page.focus('#asof');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__stillHere), true, 'no reload');
  assert.deepEqual(errors, [], 'and no security policy violation from an inline handler');
  await page.close();
});

test('the standalone preview works under its hash-based policy, and still blocks injected scripts', async () => {
  const { build } = require('../tools/build-preview.js');
  const html = build();
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const directive = (name) => (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' ')) || '');
  for (const d of ['script-src', 'style-src']) assert.match(directive(d), new RegExp(`^${d}( 'sha256-[A-Za-z0-9+/=]+')+$`), `${d} allows only listed hashes`);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-hashes|unsafe-eval/);
  const crypto = require('crypto');
  const blocks = [...html.matchAll(/<(script|style)>([\s\S]*?)<\/\1>/g)].map((m) => `'sha256-${crypto.createHash('sha256').update(m[2]).digest('base64')}'`);
  assert.equal(blocks.length, 4);
  for (const h of blocks) assert.ok(csp.includes(h), 'every inline block is listed by its hash');
  const file = path.join(require('os').tmpdir(), `preview-${process.pid}.html`);
  fs.writeFileSync(file, html);
  for (const view of VIEWS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('file://' + file + '#' + view);
    await page.waitForSelector('#view > *');
    assert.deepEqual(errors, [], `${view}: the preview runs with no policy violations`);
    if (view === 'today') assert.deepEqual(await injectScript(page), { ran: false, blocked: true });
    await page.close();
  }
  fs.unlinkSync(file);
});

// Partial evidence for focus visibility (WCAG 2.4.7). It checks an indicator is drawn, not that it's easy to see:
// that still needs a person (docs/accessibility-checklist.md).
test('every keyboard stop on Today and This month shows a visible focus indicator', async () => {
  for (const view of ['today', 'month']) {
    const { page } = await open(1280, view);
    const missing = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return { what: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : ''), visible: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      });
      if (f && !f.visible) missing.push(f.what);
    }
    assert.deepEqual(missing, [], `${view}: focused elements with no indicator`);
    await page.close();
  }
});

// Firefox. CI installs it and sets REQUIRE_FIREFOX=1; locally it's skipped with a message if it isn't installed.
test('Firefox: every view renders and fits at phone and desktop sizes, with no errors', async (t) => {
  let ff;
  try { ff = await firefox.launch(); } catch (e) {
    if (process.env.REQUIRE_FIREFOX) throw e;
    t.skip('Firefox is not installed here; CI runs this test');
    return;
  }
  try {
    for (const width of [390, 1280]) {
      for (const view of VIEWS) {
        const page = await ff.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(URL + '#' + view);
        await page.waitForSelector('#view > *');
        await page.$$eval('details', (ds) => ds.forEach((d) => { d.open = true; }));
        const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(o <= 0, `Firefox ${view} at ${width}px is ${o}px too wide`);
        assert.deepEqual(errors, [], `Firefox ${view} at ${width}px: errors`);
        await page.close();
      }
    }
  } finally { await ff.close(); }
});

// Safari's engine. CI installs it and sets REQUIRE_WEBKIT=1, so it can never be skipped there.
// Locally it is skipped with a message if WebKit isn't installed.
test('Safari engine (WebKit): every view fits, filters line up, no errors', async (t) => {
  let wk;
  try { wk = await webkit.launch(); } catch (e) {
    if (process.env.REQUIRE_WEBKIT) throw e;
    t.skip('WebKit is not installed here; CI runs this test');
    return;
  }
  try {
    for (const width of [390, 1280]) {
      for (const view of VIEWS) {
        const page = await wk.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(URL + '#' + view);
        await page.waitForSelector('#view > *');
        await page.$$eval('details', (ds) => ds.forEach((d) => { d.open = true; }));
        const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(o <= 0, `WebKit ${view} at ${width}px is ${o}px too wide`);
        if (view === 'today') {
          const boxes = await page.$$eval('#asof, #team, #impact', (els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; }));
          assert.equal(boxes[1].w, boxes[2].w, `WebKit ${width}px: dropdowns are the same width`);
          assert.equal(boxes[1].top, boxes[2].top, `WebKit ${width}px: dropdowns sit on the same line`);
          assert.ok(boxes.every((b) => Math.abs(b.h - 40) <= 1), `WebKit ${width}px: controls are 40px tall (${boxes.map((b) => b.h)})`);
        }
        assert.deepEqual(errors, [], `WebKit ${view} at ${width}px: errors`);
        await page.close();
      }
    }
  } finally { await wk.close(); }
});
