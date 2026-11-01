# Dashboard guide

One dashboard, three views, one per meeting. Each panel answers one question and says what to do when the answer looks bad. Try the [demo](../dashboard/index.html); it uses fictional data.

| View | Question | Who | When |
|---|---|---|---|
| **Today** | What needs action today? | QA, developers, engineering manager | Daily, and in triage |
| **This week** | Is the bug flow healthy? | QA lead, engineering managers, product owners | Weekly urgent bug review |
| **This month** | Are we meeting our quality goals? | Product, engineering managers, leadership | Monthly and quarterly reviews |
| **How it works** | What are the rules? | Everyone | Any time |

Every view can be filtered by team and impact, and moved back in time with the **As of** date. A past date shows only what was known that day: bugs raised later, events after it, monthly figures not yet reported and notes written later are all left out, and a test checks every panel against data cut off at that date. The one panel that covers the whole organisation (the share of completed tickets) is labelled **All teams** when a filter is on. Every bug opens its full history: who scored it, every decision, and why.

## Today

Charts first, for the picture; then the action list, for what to do.

| Panel | Question it answers | How it's counted | If it looks bad |
|---|---|---|---|
| Urgent bugs open | How many High and Very high bugs are open, and are any P0 emergencies? | Open bugs scored High or Very high; P0s called out | P0: swarm now. Others: check each has an owner and a fix or mitigation under way |
| Waiting for triage | Is anything unscored? | Open bugs not triaged yet (no team review or no impact score); how many have waited over 2 days. Having no assignee doesn't count: a scored, deferred bug often has nobody on it on purpose | Triage now. An unscored bug could be urgent. |
| Reviews overdue | Has anything been forgotten? | Open bugs whose next review date has passed | Review them and set the next step |
| Old bugs without a decision | Is anything ageing without a decision? | Past its age limit with no decision, in two parts: **no plan recorded** (not in progress, deferred or escalated, or past the leadership age and not escalated yet), and **leadership decision pending** (escalated, nobody has chosen fix or accept yet). Same number and split as goal G3 | No plan: fix, defer with a reason and a date, or close. Pending: get the decision at the next monthly review. |
| The action list | What do I do next? | Every open bug with a reason to act, in the order developers pick up work: P0 emergencies, then untriaged bugs (they could be emergencies), then agreed P1 work, then decisions that are due. Each row shows the priority, why it's there and the next step. | Work down the list; raise it at triage if the order looks wrong |
| What state are open bugs in? | Where is the work sitting? | Open bugs by status, as a donut with counts and shares | A big New share: triage is behind. A big Deferred share is fine if reviews are current. |
| How serious are open bugs? | How much harm is open? | Open bugs by impact; not scored shown on its own | Not scored above zero: triage those first |
| Can we reproduce them? | Can we fix with confidence? | Open bugs: reproducible, not reproducible yet, not checked yet (labels `reproducible` / `not-reproducible`) | Not reproducible: pair with the reporter or add logging; after two attempts, close with evidence |
| Has the team reviewed them? | Has every bug had a team look? | Open bugs: reviewed, due for review again (review date passed), not reviewed yet (label `bug-reviewed`) | Not reviewed: triage. Due again: review at the next session. |
| Is any team taking on too much? | Are urgent bugs piling up in progress? | Urgent bugs in progress or verification, per team, against a limit of 3 | Finish before starting. Ask for help. |
| What information is missing? | Can we prioritise properly? | Open bugs missing impact or priority; deferred bugs missing a reason or a review date (a bulk change can skip the transition screen). Owner is the team, so it's never missing. | Fill in the gaps at triage |

## This week

| Panel | Question it answers | How it's counted | If it looks bad |
|---|---|---|---|
| New, fixed, closed without a fix, reopened | What moved in the last 28 days? | Bugs raised; closed as fixed; closed for other reasons; reopened. Reopen rate = reopened ÷ fixed. | Closed-without-fix rising: check the reasons. Reopens rising: verification is too narrow. |
| How long until bugs are fixed or mitigated? | Are we meeting the fix targets? | Median days from raised to the day users were first protected (a rollback counts from the rollback), by impact when raised, last 90 days, with the target as a dashed line. Underneath: urgent bugs still open and past target, which the medians can't include | Look at the late ones: blocked, under-staffed, or scored too high? |
| Bug trends | Is the backlog growing? | New, fixed and reopened bugs per week, over 12 weeks, with a hover readout | More coming in than going out for 3+ weeks: raise it at the monthly review |
| Where are more bugs coming in than going out? | Where is help needed? | New and fixed bugs per team, last 28 days, side by side. Per team, never per person. | Talk capacity with that team's engineering manager, not blame |
| Where are bugs caught? *(optional)* | Are we finding bugs before users do? | Bugs raised in the last 90 days: before release or in production; and how they were found | Many found by support in one area: add automated checks there first |
| What causes them? | What should we prevent? | Cause labels on fixed High and Very high bugs and reopened bugs, last 90 days. Labels are optional; unlabelled ones are counted separately. | Pick the top cause for a prevention action; label the rest at the review |
| What did we add so they don't come back? | Are fixes protected? | The test or check that came with each fix (from the linked pull request) | Fixes with nothing added: ask why at the review |
| How old are open bugs? | Are serious bugs ageing? | Open bugs in four age groups (under 30, 30 to 89, 90 to 179, 180+ days), split by impact | Very high or High bugs past 30 days need a plan now |
| Where are the hotspots? | Which areas carry the most risk? | Open bugs by area, split by impact, highest weighted exposure first | Candidate for a focused fix-up or tech debt work |

## This month

| Panel | Question it answers | How it's counted | If it looks bad |
|---|---|---|---|
| The four goals | Are we on track? | One number per goal (see the [playbook](playbook.md#2-goals-and-how-we-know-were-meeting-them)), with what it covers, a target and a status: on track, watch or off track. G1's on-time share only covers finished work, so the urgent bugs still open past target are shown beside it, by ID, and they cap its status: any at all is Watch, 3 or more is Off track | Agree one action per off-track goal, with an owner |
| Is weighted exposure going down? | Is open risk building up? | Weighted exposure of open bugs at the end of each week (Very high 8, High 4, Medium 2, Low 1): a ranking convention, not money or customers. Unscored bugs listed under the bars. | Check what drove it: new urgent bugs, re-scoring, or fewer fixes. A fall from closures without a fix is not progress. |
| How are open bugs spread across teams? | Which teams carry the risk? | Open bugs by team, split by impact, with each team's points | Talk capacity with that team's engineering manager |
| Which risks have we chosen to carry? | Are deferrals explicit and current, and is any accepted risk out of sight? | Deferred bugs with team, reason (from the fixed list, or flagged "No reason recorded"), workaround with how much it protects users, and review date; overdue reviews flagged. Underneath, Low and Medium bugs closed as accepted risk, with who accepted them and what would make us look again. High and Very high risks that are accepted stay in the deferred list | Review overdue ones; record missing reasons |
| Is AI helping? | Is AI finding real bugs, and are its tickets good enough? | Last 90 days: bugs labelled `found-with-ai` by impact; what happened to AI-drafted tickets at triage (accepted, duplicate, not reproducible, still waiting) compared with tickets people wrote. The rate only counts tickets with an outcome, and the stop rule (over 1 in 5 rejected: pause) is only applied from 10 outcomes; below that it says "too few to judge" | Watch: check the drafting prompt against known-answer cases. Pause: stop drafting until it's fixed. Mostly Low finds: the tool may be finding noise. |
| Known urgent bugs accepted at go-live | Were exceptions decided and recorded, and were promises kept? | The sign-off log: what went live (a release or milestone in Scrum; a feature or epic in Kanban), each bug with the impact it had that day, who decided, why, how users were protected, and what was promised by when. Whether the promise was kept (done, done late, overdue, due) is worked out from the bug's history. Follows the team and impact filters | Chase overdue promises at the monthly review |
| What share of completed tickets were bugs or tech debt? | Is the planned share real? | Share of completed tickets that were bugs or tech debt each month, against the planned share. Two saved filters in Jira; no time tracking. It counts tickets, not effort. A month appears once its report exists; the current month is shown to date. Covers all teams | Under-used for 2 months: the reservation isn't real yet |

## Every headline number, defined

So nobody has to read the code to know what a number means. "Out of" is the denominator; where a number is a count, not a rate, it says so. All of them follow the team and impact filters except the share of completed tickets, which covers the whole organisation and is labelled "All teams" when a filter is on. Days follow one rule: the day a bug is raised is day 0, and a limit of N days is missed from day N + 1.

| Number | Counts | Out of | Period | Left out | Helps decide |
|---|---|---|---|---|---|
| Urgent bugs open (Today) | Open bugs scored High or Very high now | A count | On the As of date | Bugs not scored yet (they're in "Waiting for triage") | Who picks up what next |
| Waiting for triage | Open bugs without a team review or an impact score; the sub-line counts those raised more than 2 days ago | A count | On the As of date | Unassigned bugs that are already scored | Whether triage is keeping up |
| Reviews overdue | Open bugs whose review date was before the As of date | A count | On the As of date | Closed bugs (accepted risks have their own review dates, on the monthly view) | What to look at again this week |
| Old bugs without a decision | Open bugs past their age limit with no plan recorded, plus escalated bugs with no leadership decision | A count, split into those two parts | On the As of date | Bugs in progress, in verification, or deferred | Fix, defer or close; chase leadership |
| New, Fixed, Closed without a fix, Reopened (This week) | Bugs raised; closed as fixed; closed with another resolution; reopened | Counts. Reopen rate = reopened ÷ fixed | Last 28 days | | Whether closures are real fixes, and whether verification is too narrow |
| Median time to fixed or mitigated | Days from raised to the first protection (a mitigation, or the fix being released) | Bugs first protected in the period, by impact when first scored | Last 90 days | Bugs not protected yet (listed under the chart) | Whether the fix targets are realistic |
| G1: urgent bugs fixed or mitigated within target | Of the urgent bugs protected in the period, those protected within 7 days (Very high) or 14 days (High) | Bugs scored High or Very high when first scored, first protected in the last 90 days | Last 90 days | Urgent bugs not protected yet: shown beside the rate, by ID, and capping its status (any is Watch, 3 or more is Off track) | Whether urgent bugs need more capacity or faster mitigation |
| G2: weighted backlog exposure | The sum of 8, 4, 2, 1 for every open, scored bug | Not a rate: compared with the same sum 28 days earlier, and shown with the counts by level | Snapshots on the As of date and 28 days before | Closed bugs, accepted Low and Medium risks (listed separately), bugs not scored yet (counted beside it) | Whether open risk is building up. Never on its own |
| G3: bugs without a decision | Same as "Old bugs without a decision" | A count | On the As of date | As above | As above |
| G4: deferrals that aren't recorded decisions | Deferred bugs with no reason, no review date, or a review date in the past | Shown against all open deferrals, including accepted High risks | On the As of date | Low and Medium risks closed as accepted (their reviews are listed with them) | Which deferrals to review, re-date or pick up |
| AI-drafted tickets rejected | Tickets closed as a duplicate or not reproducible, shown separately | AI-drafted tickets with an outcome: accepted at triage, or closed as one of those two | Raised in the last 90 days | Tickets still waiting for triage. Not judged at all below 10 outcomes | Whether to keep, fix or pause AI drafting |
| Go-live promise status | Whether each promised mitigation or fix happened by its due date, read from the bug's history | Each sign-off | Sign-offs made on or before the As of date | | Which promises to chase |
| Share of completed tickets that were bugs or tech debt | Bugs and tech debt tickets resolved in the month | All tickets resolved in the month | Each month, once its report exists; the current month to date | Effort: a ticket is a ticket whatever its size | Whether the planned share is real |

## Design choices, and why

- **Every number has a "how it's counted" note**, so product, engineering and QA read it the same way.
- **Questions as titles.** "Is the bug flow healthy?" tells you why to look; "Bug metrics" doesn't.
- **A next step on every row.** A dashboard that doesn't lead to an action becomes wallpaper.
- **Unscored bugs are never counted as zero.** They are shown separately everywhere.
- **Charts compare like with like.** One axis per chart; series colours from a brand-matched palette, checked for colour-blind separation in light and dark mode with a palette tool while building (that tool isn't part of this repo, so the check can't be re-run from here; axe-core's contrast checks are); every value also reachable through the legend, the hover readout and the table view.
- **Per team, not per developer.** Charts never rank individuals, so people keep raising bugs.
- **Distribution charts use one colour from light to dark for impact**, so more harm always reads as a stronger colour (in dark mode, stronger means brighter). Bugs not yet scored are hatched, never a shade of Low. Every chart has a legend, a text alternative for screen readers, a hover tooltip, and a "Show as a table" view with exact numbers. The colour steps were checked with a palette tool in light and dark mode while building; that tool isn't in this repo.
- **Fixed and closed-without-fix are separate.** Tidying the backlog should never look like fixing.
- **"Found in production" is called that, not "escape rate".** A true escape rate needs every bug linked to the release that introduced it.
- **Mitigations count.** A rollback, flag or workaround that protects users counts towards the target, from the day it took effect. It rewards reducing harm quickly, which is the behaviour we want. Each one says how much it protects users, so a manual workaround isn't mistaken for a fix.
- **A good rate never hides bad news.** Any rate over finished work is shown with the open work it leaves out, and a decision that's been escalated isn't counted as decided.
- **Team numbers, not people numbers.** The owner is always the team. Assignees appear so work gets picked up, never to rank individuals.
- **Built to be accessible, with honest evidence:** automated axe-core checks for WCAG A and AA rules pass at 8 widths from 280px to 1280px, in light and dark mode, and keyboard, focus and text-spacing tests pass. Automated tools cover only part of WCAG 2.2 AA, so this isn't a claim of conformance: the manual checks (screen reader, 200% zoom) are listed, with what's been done, in the [accessibility checklist](accessibility-checklist.md). Colour is never the only signal. On phones, tables become stacked cards.
- **Private and secure:** a static page with a strict content security policy. No tracking, cookies, third-party code or network requests.

## Building it for real

The demo is a single static page with fictional data. In a real team the same panels come from the bug tracker: see [Jira setup](jira-setup.md) for the fields, automations and filters. Most panels are standard Jira gadgets. Weighted exposure and the goal scorecard need a small weekly export or script, because Jira can't sum a weighted field on its own.

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
