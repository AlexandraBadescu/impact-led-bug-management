# Test report

This report covers version 1.2. It has three jobs: to show what was tested, to be honest about what reviewing my own framework found, and to say which of the project's claims are backed by evidence and which aren't.

| | |
|---|---|
| **Date** | 1 November 2026 |
| **Version** | 1.2.0 |
| **Tools** | Node.js test runner, Playwright 1.63.0 (Chromium here; WebKit and Firefox in CI), axe-core 4.10.2 |
| **Result** | 239 tests: 237 pass in Chromium. The 2 skipped are the Firefox and WebKit (Safari) tests, which need those browsers; CI installs them and requires both to pass. |

## What reviewing my own framework found

I've reviewed this framework twice now, each time with an outside review alongside my own pass, asking one question: does every claim the project makes hold up against its own data? Both times, parts of it told a more reassuring story than the data supported, which is exactly what the playbook says a dashboard must never do.

### Version 1.1 to 1.2

The second round found subtler problems than the first, which is roughly what you'd hope. The three that mattered most:

**1. A go-live sign-off described a protection that didn't exist yet.** BUG-111's sign-off on 27 July said finance would send corrected receipts, and read as if users were protected at go-live. The bug's own history says the mitigation started on 29 July. Two days isn't much, but a sign-off that overstates protection is the kind of record that ends up quoted in an incident review. Every sign-off now states whether protection was **active, proposed or none** at go-live, and the validator rejects one that claims "active" before the bug's history shows a mitigation, or "proposed" when one already existed. BUG-111's is now "proposed", and the dashboard shows when protection actually started.

**2. "Users protected" was dated to the test environment.** For bugs fixed rather than mitigated, the demo marked users as protected when the fix reached Verification, which the playbook defines as a test environment. Nobody in production is protected by a fix on staging. Protection by a fix now counts from its release (closing as fixed), and a validator rule rejects the old pattern. This one came from my own audit, prompted by the BUG-111 finding: same kind of mistake, less obvious place.

**3. The dashboard and the Jira filters disagreed about what "14 days" means.** The dashboard counted calendar days ("late from day 15"); the Jira filters used `created <= -14d`, which counts 14 × 24 hours back from now, so the same bug could flip to late at 4pm on a different day. There's now one rule, written down in the playbook, the Jira setup and the code: day 0 is the day a bug is raised, and a limit of N days is missed from day N + 1. Every limit has tests one day before, on, and one day after, and a parity test checks the Jira filters use the same form and the same numbers.

| ID | What was misleading or wrong in 1.1 | Impact | Found by | Now guarded by |
|---|---|---|---|---|
| V1 | BUG-111's sign-off read as if a mitigation was active two days before it started | **High** | Review | Protection state on every sign-off; validator rules `signoff-claims-protection`, `signoff-understates-protection` |
| V2 | Fixes counted as protecting users from the day they reached a test environment | **Medium** | My own audit | Protection by a fix counts from release; validator rule `protected-before-release` |
| V3 | Jira filters and the dashboard counted days differently, so the same bug was late on different days | **Medium** | Review | One documented rule; boundary tests for every limit; Jira parity test |
| V4 | Past dates still leaked: a bug not yet scored showed the impact it got later (in its history and in "Bugs found with AI"), and the history dialog said a later note existed | **Medium** | Review, then my own audit | A day's state is built only from the record's fixed facts and events up to that day; notes carry their date; the cut-off test now removes later notes too |
| V5 | The playbook promised known-answer cases for AI drafts; none existed | **Medium** | Review | [Eight cases](../evals/bug-drafts/README.md), an evaluator, a rubric, and tests that bad answers fail |
| V6 | "Impact points" read as if they measured harm | **Medium** | Review | Renamed weighted exposure; what the weights mean and don't is explained on the dashboard and in the playbook; always shown with counts by level |
| V7 | My own publication gate said the README took under three minutes to read. It was 1,641 words | **Medium** | Review | The README's main story is now 475 words (693 in total); the gate below has evidence for every status |
| V8 | The date filter's calendar button had no visible focus indicator | **Medium** | A new automated focus test | A focus style that covers the date field's inner parts; the test |
| V9 | The page's own security policy blocked its inline `onsubmit` handler, and a 1.0 write-up said "the tests prove it blocks an injected script" with no such test | **Low** | Review | The handler moved into the script; tests for no inline handlers, a blocked injected script, and Enter not reloading |
| V10 | One shared random sequence meant editing one bug moved every later bug's dates | **Low** | Review | Seeds per bug, frozen from 1.1 so no existing date moved; a test that changing one bug leaves the others untouched |
| V11 | The validator missed duplicate IDs, dated fields that didn't match their event, closures with no date and mitigations with no type, and 8 of its rules had no negative test | **Low** | Review, then my own audit | 17 new rules; every rule now has its own negative test |
| V12 | Leadership time was "10 minutes a month", and role-guide times were stated as facts and disagreed with each other | **Low** | Review | Labelled as planning assumptions and aligned with the [rollout plan](rollout-plan.md) |
| V13 | The docs said chart colours were checked with a "palette validator"; it isn't in the repo, so nobody can re-run it | **Low** | My own audit | Reworded to say what it was and that it can't be reproduced here |

### Version 1.0 to 1.1

The first round found the bigger problems. The worst was an urgent-fix goal showing 92% "On track" while four urgent bugs sat overdue, because the rate could only see finished work. The fix wasn't to change the percentage: the overdue bugs now sit beside the rate, by ID, and cap its status. The others were sign-offs dated before their bugs existed, a deferral rule the playbook required and the code didn't, and accepted risks vanishing from the numbers.

| ID | What was misleading or wrong in 1.0 | Impact | Found by | Now guarded by |
|---|---|---|---|---|
| R1 | Urgent-fix goal "On track" while 4 urgent bugs were overdue | **High** | Review | Overdue shown beside the rate and capping its status; scenario and consistency tests |
| R2 | Sign-offs before the bug existed, and for a bug no longer urgent | **High** | Review | Data validator; negative cases `signoff-before-bug`, `signoff-bug-not-urgent` |
| R3 | Deferral reason required by the playbook, optional everywhere else | **High** | Review | Required in Jira, flagged by the dashboard; parity tests |
| R4 | Closing as "Accepted risk" removed a risk from every leadership number | **Medium** | Review | High and Very high accepted risks stay open; Low and Medium closed ones stay listed; validator rejects closing an urgent one |
| R5 | Past dates showed later information: October's final share of work on 1 October, notes written on 31 October, team names | **Medium** | Review, then my own tests | Monthly figures have a reported date; notes hidden on past dates; every panel compared with data cut off at 7 dates |
| R6 | "Old bugs with no plan" was 3 on Today and 2 in G3, and an escalated bug counted as having a plan | **Medium** | Review | One label and one split everywhere: no plan recorded, leadership decision pending |
| R7 | The Jira "Waiting for triage" filter counted any unassigned bug, so 17 already-scored bugs looked untriaged | **Medium** | Review | Filter uses the triage state; pickup has its own filter; parity test |
| R8 | The payment incident's mitigation date was the fix date, not the rollback an hour after it started | **Medium** | Review | Rollback recorded as the first protection, with a mitigation type; scenario test |
| R9 | "Is AI helping?" judged 5 tickets, counted untriaged ones, and treated not reproducible as plain rejection | **Medium** | Review | Outcomes only, split by reason, no judgement under 10 outcomes |
| R10 | The AI draft schema was defined three times and the three disagreed | **Low** | Review | One schema; a test checks the skill, template and checker list the same sections |
| R11 | Two reopened bugs (BUG-114, BUG-133) were closed as fixed without going through verification | **Low** | The new data validator | Validator rule `fixed-without-verification` |

R11 is the one I like best. Nobody spotted it by reading; it surfaced the first time the playbook's workflow was written as code and run over the data.

## Claim-to-evidence register

Every claim the project makes, what would prove it, and where it stands now.

| Claim | What would prove it | Evidence | Status |
|---|---|---|---|
| Every deferral is a recorded decision | Reason, review date and an accountable team, or the gap is flagged | Required in the Jira setup; flagged by the dashboard and G4; parity tests; the demo's bulk-change deferral is caught | **Verified** in the demo |
| Urgent bugs are handled within target | A clear population, correct timelines, overdue cases visible | G1 states what it covers and lists overdue bugs beside the rate; protection dated from the rollback or release; boundary tests; consistency test with the weekly view | **Verified** |
| Go-live risks are consciously accepted | Valid bug, possible chronology, an accountable owner, an honest protection state, a residual risk, a checked promise | Validator rules and negative tests; scenarios 2 and 3; follow-up status read from bug history | **Verified** |
| Historical views are trustworthy | No information from after the selected date | Every panel compared with data cut off at 7 dates and 3 filters, with later notes removed; browser test for hidden notes, later sign-offs and later monthly figures | **Verified** |
| The backlog shows the risk we carry | Deferred and accepted risks stay visible until retired | Accepted High risks stay open (tested); closed Low and Medium ones listed with owner, residual impact and a review date that can go overdue; validator rejects closing an urgent one | **Verified** |
| Every headline number can be understood without the code | Numerator, denominator, period, exclusions, decision | [Definitions table](dashboard-guide.md#every-headline-number-defined); "How it's counted" on every tile and goal | **Verified** by review; whether readers find it clear is **Not tested** |
| The monthly view shows what matters on its first screen | A person sees the decisions without scrolling | Summary of decisions, concerns and changes above the goals; browser test that it starts within the first 900px | **Partially verified**: placement is tested; usefulness to a real product owner isn't |
| AI helps without removing human judgement | Comparable outcomes, recorded human decisions, known-answer results | People gate every draft; one schema; outcome-based rate with a minimum sample; known-answer cases with reference answers | **Not tested**: no model output has been scored. The demo has only 2 AI drafts with an outcome |
| The Jira setup makes the process run by itself | Filters and validators working on a real Jira site | Documented; parity tests check the text against the dashboard's rules; an export contract is documented | **Not implemented**: never run on Jira; no export exists |
| The approach improved a real team | Real before-and-after data | My experience in a previous role, stated as such, with its limits | **Not demonstrated here**; details awaiting author input (timeframe, team size, starting point) |
| The dashboard is accessible | Automated and manual checks | axe-core rules at 8 widths in light and dark mode, keyboard, focus and text-spacing tests in Chromium | **Partially verified**: automated checks pass; every manual check in the [accessibility checklist](accessibility-checklist.md) is still **Not tested** |
| It works across browsers | Chromium, Firefox and WebKit runs | Chromium here; Firefox and WebKit tests exist and CI requires them | **Partially verified** until a CI run is green |

## How I know the tests can fail

A green suite only means something if breaking the rules turns it red. So I put old behaviours back, one at a time, and checked tests failed:

| Behaviour restored | Tests that failed |
|---|---|
| **1.1 → 1.2** | |
| Fixes marking users protected at Verification | The validator flags all 15 affected bugs (`protected-before-release`), and 50 tests fail, because the demo data and every negative case now start from invalid data |
| BUG-111's sign-off saying protection was "active" | `signoff-claims-protection`: "says protection was active on 2026-07-27, but BUG-111 wasn't mitigated until 2026-07-29" |
| A Jira filter back to `created <= -14d` | The Jira parity test |
| The day's state copying the whole bug record (so later facts can leak) | 5 history tests |
| One shared random sequence | The generator drift test |
| "Needs a plan" at day N instead of from day N + 1 | 3 deadline boundary tests |
| The date field's focus style, and the dialog placeholder | Both tests failed before the fix and pass after it (written first, then fixed) |
| **1.0 → 1.1** | |
| The share of work filtered by month instead of report date | 4: history at 26 August, 1 October and 15 October, and the 1 October check |
| G1's status from the rate alone | 2: the demo headline numbers, and "a perfect rate cannot hide overdue bugs" |
| Deferral reason optional again | 3: the deferral rule, the policy parity test, and the demo headline numbers |
| An escalated bug counted as having a plan | 3: the escalation rule, the demo headline numbers, and Today agreeing with G3 |
| Team names taken from all bugs, including future ones | None at first, because every date I'd tested already had all three teams. I added 10 June, before one team's first bug, and it fails there now |
| The 1.0 demo data, run through the 1.1 validator | 26 problems, including both sign-off defects |

On top of that, each of the 48 negative cases for the data validator and the 18 for the AI draft checker breaks one valid record in one way and must produce exactly the matching error, and five deliberately bad AI answers must fail the evaluator for the right reason.

## Publication gate

| Gate | Status | Evidence |
|---|---|---|
| All fictional event dates and sign-offs are chronologically valid | **Verified** | `npm run validate`; 50 validator tests, one negative case per rule |
| Policy, workflow, Jira examples, calculations and tests agree | **Partially verified** | Parity tests compare the docs' text with the code; the Jira filters have never been run on Jira |
| Every headline number has a truthful definition and visible limits | **Verified** | Definitions table; "How it's counted" on every tile and goal; consistency tests |
| Overdue, deferred and accepted risks can't disappear from reporting | **Verified** | Scenario, accepted-risk and KPI tests |
| Past dates can't reveal later information | **Verified** | Cut-off comparison at 7 dates and 3 filters; browser history test |
| Broken business rules are caught by negative tests | **Verified** | The table above |
| Automated tests pass in Chromium | **Verified** | `npm test`: 237 passed, 0 failed, 2 skipped (Firefox, WebKit) |
| Firefox and WebKit | **Not tested** here | Tests exist and CI requires them. **Before publishing:** confirm the CI run is green |
| Automated accessibility checks pass | **Verified** | 64 axe-core runs, plus keyboard, focus and text-spacing tests |
| Manual accessibility checks (screen reader, 200% zoom, real devices) | **Not tested** | [Accessibility checklist](accessibility-checklist.md) |
| The standalone preview matches the repo and works under its own security policy | **Verified** | A test builds it, checks every inline block is listed by hash, and loads every view with no policy violations |
| AI known-answer cases and evaluator | **Verified** for the cases and reference answers | 14 tests |
| Real AI output scored against the cases | **Not tested** | Needs a model call |
| A Jira export or integration | **Not implemented** | A contract is documented in the [Jira setup](jira-setup.md#if-you-build-the-export) |
| Real experience and the fictional demonstration are clearly separated | **Verified** | README and background |
| The real-world story has a timeframe, team size and how the result was measured | **Blocked** | Waiting for author input; nothing has been guessed |
| The README's story is short enough to read quickly | **Verified** for length: 475 words of story, 693 in total | Whether a recruiter gets it in 30 seconds is **Not tested** |
| No real employer, client, internal name or contact details | **Verified** for the listed names and patterns | Docs test (hashed word list, email and phone patterns). It can only find what it's told to look for |
| Chart colours checked for colour-blind separation | **Not tested** here | Done with a palette tool while building; that tool isn't in the repo |

## What was tested

| Area | Tests | What they check |
|---|---|---|
| **Calculations** (`tests/metrics.test.js`) | 40 | Each playbook rule, with deadline boundaries one day before, on and after every limit; deferrals without a reason or date; escalation pending versus decided; accepted risks keeping their review date; history (a bug not yet scored has no impact); the AI outcome rate; weighted exposure; the demo's headline numbers; the data regenerates exactly; changing one bug never moves another |
| **Scenarios and reporting integrity** (`tests/scenarios.test.js`) | 17 | Three bugs traced from defect to decision (a payment incident, a deliberate trade-off, an accessibility risk); every panel compared with data cut off at 7 past dates and 3 filters; overdue urgent bugs can't hide behind a good rate; accepted risks stay visible; filters apply to every panel or the panel says it's organisation-wide; Today and the monthly goals agree |
| **Data validator** (`tests/validate-data.test.js`) | 50 | The demo data passes; 48 negative cases, one for every rule, each break one record one way (impossible histories, dated fields that don't match their events, duplicate IDs, protection claimed before it existed, sign-offs that don't match their bugs, accepted risks without an owner or review date, figures from the future) and must be caught alone; the command line exits 1 on bad data |
| **Dashboard** (`tests/dashboard.test.js`) | 85 | All 4 views at 8 widths in light and dark mode: no sideways scrolling, no axe-core WCAG A/AA violations, no errors or policy violations. Plus focus indicators, text spacing, tables and cards, charts, the bug history dialog, filters, the CSV download, the monthly summary on the first screen, history, no inline handlers, a blocked injected script, the standalone preview, and Firefox and WebKit runs (skipped here, required in CI) |
| **AI draft checker** (`tests/check-bug-draft.test.js`) | 23 | A good draft passes; each of 18 problems is caught on its own; a draft written to the human template is caught; the skill, template and checker list the same sections |
| **AI known-answer cases** (`tests/eval-bug-drafts.test.js`) | 14 | All eight cases exist with a rubric; the checker gives the known answer; the reference answers pass; five kinds of bad answer fail for the right reason |
| **Docs** (`tests/docs.test.js`) | 10 | Links and anchors; the licence notice; no listed real names or contact details; triage, deferral, accepted-risk and day-counting rules the same in the docs and the code; no overclaiming in the wording |

## Bugs found while building version 1.0

These were found and fixed before the review above, while building the first version. Each is written in the [bug template](bug-template.md) style.

| ID | Bug | Impact | Found by |
|---|---|---|---|
| B1 | Wide tables couldn't be scrolled by keyboard on phones | **High** | Automated accessibility test (axe-core) |
| B2 | On phones, the action list squeezed into narrow columns and the next step was off-screen | **Medium** | Visual review of phone screenshots |
| B3 | The privacy test listed private names in plain text, in a file meant to be public | **High** | Reviewing my own test code before publishing |
| B4 | A deferral showed a workaround as its reason, and some mitigations started with a lower-case letter | **Low** | Visual review of the monthly view |
| B5 | Filters showed on the "How it works" page, where they do nothing | **Low** | Visual review |
| B6 | The view buttons that weren't selected looked like plain text | **Medium** | Owner review |
| B7 | The dashboard was tested to a lower standard than the website: no dark mode, the 280px width untested, no security policy | **Medium** | Owner review |
| B8 | Dropdown arrows sat in different places and overlapped the text | **Low** | Owner review |
| B9 | In Safari the filters looked different, and on iPhone the page zoomed when a filter was tapped | **Medium** | Owner review in Safari |
| B10 | Adding the charts flattened the action list into one clipped line | **High** | Owner review |
| T1 | The navigation test passed on some runs and failed on others | **Medium** | Repeated test runs |

### B1. Wide tables couldn't be scrolled by keyboard on phones

- **Expected:** keyboard users can reach every part of the page (WCAG 2.1.1).
- **Actual:** at 320 and 390px, some tables scroll sideways inside their box, but the box couldn't receive focus, so keyboard users couldn't scroll it.
- **Impact:** severity High (fails WCAG 2.2 AA), users Low (keyboard users on small screens). Matrix: Medium. Raised one level for compliance: **High**.
- **Fix:** each scrollable table is now a labelled region that can take focus. Covered by the axe tests at every width.

### B2. Action list unreadable on phones

- **Expected:** the next step for each bug is visible without scrolling sideways.
- **Actual:** six columns squeezed into 390px; the next step sat off-screen inside the table.
- **Impact:** severity Medium (workaround: scroll the table), users Large (most phone visitors use this view). **Medium.**
- **Fix:** on small screens, table rows become stacked cards with labels, and the tiles sit two to a row.

### B3. The privacy test would have published private names

- **Expected:** the check that keeps employer and internal names out of the repo doesn't reveal them.
- **Actual:** the first version listed the words in plain text inside the test file, which would be public.
- **Impact:** severity Very high (confidential information exposed), users Low (anyone who reads the test file). Matrix: Medium. Raised one level for confidentiality: **High**. Caught before anything was published.
- **Fix:** the test stores one-way hashes of the words, and has its own test to prove it still catches a banned word.
- **Lesson:** review test code with the same care as product code. Tests ship too.

### B4. Wrong deferral reason in the demo data

- **Expected:** "Why deferred" explains the decision; "Mitigation" holds the workaround.
- **Actual:** for one bug, the workaround appeared as the reason. Some mitigations started with a lower-case letter.
- **Impact:** severity Medium (misleading in a decision view), users Low (one bug). **Low.**
- **Fix:** corrected in the data generator; regenerated.

### B5. Filters showed where they do nothing

- **Expected:** the reference page has no filters, because nothing on it changes.
- **Actual:** the stylesheet's layout rule overrode the page's "hidden" setting, so the filters stayed visible.
- **Impact:** severity Low (confusing, nothing breaks), users Medium (people reading the rules). **Low.**
- **Fix:** the hidden state now wins in the stylesheet. A regression test checks the filters are hidden on that page.

### B6. View buttons didn't look clickable

- **Expected:** all four views look like options you can choose.
- **Actual:** only the selected view had a background; the others looked like plain text, so a first-time visitor asked whether they were buttons.
- **Impact:** severity Medium (people miss three of the four views), users Very large (every visitor). Matrix: **Medium.**
- **Fix:** every option now has a button outline and an arrow; the selected one is filled and marked.
- **Lesson:** automated checks pass a link that looks like text. Only a person trying it finds this.

### B7. Lower standard than the website

- **Expected:** a public portfolio page meets the same release gate as my website.
- **Actual:** the first version had no dark mode, wasn't tested at 280px or in dark mode, only checked overflow with notes open, and had no security policy.
- **Impact:** severity Medium (gaps in accessibility evidence and hardening, nothing broken that was found), users Large (dark-mode and folding-phone visitors). **Medium.**
- **Fix:** dark mode added through colour tokens; tests now cover 8 widths × 2 colour schemes, overflow before and after expanding notes, text spacing, failed requests and security policy violations. The page has a strict content security policy (no inline scripts or styles, nothing from other sites), and the tests prove it blocks an injected script.

### B8 and B9. Filters in Safari

- **Expected:** the filters line up and look the same in every browser.
- **Actual:** each dropdown sized itself to its text, so the arrows sat in different places; on the Impact filter, the arrow overlapped "All levels". Safari drew its own controls, and iPhone Safari zoomed the page when a filter was tapped, because the text was under 16px.
- **Impact:** B8 Low (cosmetic). B9: severity Medium (the page jumps on tap), users Large (Safari is common among people reviewing portfolios on a Mac or iPhone). **Medium.**
- **Fix:** every filter has the same width and height, one custom arrow in the same place, Safari's extra date padding removed, and 16px text on phones. Tests now check the alignment, and WebKit runs in CI.
- **Lesson:** my local tests only ran Chromium, so a Safari problem could pass them. WebKit is now part of the release gate in CI.

### B10. Adding the charts broke the action list

- **Expected:** the action list is a readable table on wide screens and stacked cards on phones.
- **Actual:** the new chart bars reused the class name `stack`, which the action list table already used. The chart rule (a flex row, 18px tall) took over the table, so the most important panel became one clipped line.
- **Impact:** severity High (the main view's key panel unusable), users Very large (every visitor). Matrix: **Very high** for the build; caught in review before publishing.
- **Fix:** the chart bars have their own class name. A new test checks that the tables lay out as tables with readable rows on wide screens, and as cards on phones. The test was confirmed to fail with the old rule put back.
- **Lesson:** every existing check passed: nothing overflowed, and the accessibility rules were met. A test of "can people read it" was missing, and a regression run of every view after each change matters as much as testing the new feature.

### T1. Flaky navigation test

- **Expected:** the test gives the same result every run.
- **Actual:** it read the heading straight after clicking, sometimes before the view had changed.
- **Impact:** a flaky test teaches people to ignore failures. **Medium.**
- **Fix:** traced rather than retried. The test now waits for the view to change, and passed 3 runs in a row afterwards.

## Limits

- **Browsers:** Chromium here. Firefox and WebKit (Safari's engine) run in CI only, and a check on a real iPhone is still worth doing.
- **Accessibility:** automated checks cover only part of WCAG 2.2 AA. Every manual check in the [accessibility checklist](accessibility-checklist.md) is still to do.
- **Jira:** the fields, validators and filters are documented and checked as text against the dashboard's rules, but not run on a live Jira site, and there's no export script.
- **AI skills:** the known-answer cases have hand-written reference answers. No model output has been scored against them from this repo.
- **Privacy checks** catch the listed names and obvious patterns. They can't prove there's no personal data anywhere, so a person still reads before anything is published.
- **The demo data is fictional and small** (59 bugs), and it was written to show the rules working. Real data would test them in ways invented data can't.

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
