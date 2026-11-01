# Jira setup

These are the fields, workflow rules, automations and saved filters that let the playbook run without relying on people remembering. It's written for Jira, but the same ideas work in Azure DevOps, Linear or GitHub Issues. The project key `SHOP` is an example.

## What exists, and what doesn't

This page is setup guidance. Nothing here connects to Jira. To be precise about what's real:

| Capability | Status |
|---|---|
| Rules calculated on the demo dashboard: triage, fix targets, age limits, deferrals, escalations, G1 to G4, weighted exposure, go-live promise checks, history "as of" a date | **Implemented and tested**, on fictional data in the repo's own format |
| Data checks: possible histories, sign-offs matching their bugs, no figures from the future (`tools/validate-data.js`) | **Implemented and tested**, on the same fictional data |
| Fields, workflow validators, automations and saved filters below | **Documented setup.** Written to match the dashboard's rules, and checked as text by the tests, but not run on a live Jira site from this repo. Try them in a sandbox project first |
| Weighted exposure, G1's on-time share and median, and history for past dates, from real Jira data | **Not implemented.** Needs an export or script (see [the contract below](#if-you-build-the-export)) |
| Checking go-live promises against real bugs | **Not implemented.** Needs the same export, plus the sign-off comments |



## 1. Fields

| Field | Type | Values | Set when |
|---|---|---|---|
| Severity | Dropdown | Very high, High, Medium, Low | Raised (guess), confirmed at triage |
| Users affected | Dropdown | Very large, Large, Medium, Low | Raised (guess), confirmed at triage |
| Impact | Dropdown | Very high, High, Medium, Low | Triage. Kept as its own field so filters and charts work. |
| Raised because | Text | e.g. "Money at risk" | Only when impact is raised one level |
| Impact reasoning | Text, one line | | Triage |
| Priority | Jira's built-in Priority, renamed | P0 Emergency, P1 Next up, P2 Planned, P3 Later | Triage, agreed together. Kept separate from Impact: impact is harm, priority is when. |
| Team | Dropdown or Team field | | Triage. Always set. |
| Area | Components | | Triage |
| Found in | Dropdown, optional | Development, Staging, Production | Raised. Only needed for the optional "Where are bugs caught?" panel. |
| Found by | Dropdown, optional | Automated test, Exploratory testing, Customer support, Monitoring, Developer, Other | Raised. Optional, as above. |
| Review date | Date | | Triage, and at every review |
| Mitigated date | Date | | The day users were first protected: a rollback counts from the rollback, not from the permanent fix |
| Mitigation type | Dropdown | Removes the risk, Reduces the risk, Relies on a manual step | With the mitigated date, so the re-score can be checked |
| Deferral reason | Dropdown, **required** when deferring | Needs a bigger change (tech debt), Lower priority than the roadmap, Planned with other work, Workaround in place, Waiting on another team or supplier, Monitoring for more evidence, Risk accepted (no fix planned) | On the Deferred transition screen. One click, and it can be counted |
| Workaround | Text, optional | | When there is one; for support and for re-scoring |
| Escalated date | Date | | When a bug is taken to leadership |
| Leadership decision | Dropdown | Fix next milestone, Accept the risk | When leadership decides. Until then the bug is "leadership decision pending" |
| Closure reason | Text | | Closing without a fix |
| Accepted by, Look again if | Text | | Closing as accepted risk (Low and Medium only) |

Use the **same values everywhere**: the template, the scoring guide, Jira and the dashboard. Different words for the same level in different places is the fastest way to make people stop trusting the scores.

## 2. Workflow

Statuses: **New → Ready → In progress → Verification → Closed**, plus **Deferred**.

| Transition | Rule (validator) |
|---|---|
| New → Ready | Impact, Impact reasoning, Priority, Team and Review date are filled in |
| Any → Deferred | Deferral reason and Review date are filled in (both on the transition screen). A workaround is optional. |
| Verification → Closed (Fixed) | Nothing extra. There's deliberately no required root cause field: see [cause labels](#cause-labels). |
| Any → Closed (any other resolution) | Closure reason is filled in |
| Any → Closed (Accepted risk) | Impact is Low or Medium, and Accepted by and Look again if are filled in. A High or Very high risk that's accepted is deferred with the reason "Risk accepted (no fix planned)" instead, so it stays open and visible. |

Validators put the rules where the work happens. Nobody has to police them. Bulk changes can skip transition screens, though, so the dashboard's "What information is missing?" panel still checks for deferrals with no reason or review date.

## 3. Automations

In order of value: start with the first five in the pilot.

1. **Priority set to P0:** post in the team and incident channels; notify the engineering manager and product owner.
2. **High or Very high not picked up after 2 days** (no assignee): add label `needs-pickup`; notify the team's channel, the engineering manager and the product owner.
3. **No impact after 2 days:** add label `needs-triage`; post in the team channel.
4. **Review date reached:** remove the `bug-reviewed` label, add `needs-review`, and notify the team (and the assignee, if there is one). The bug shows as "due for review again" until the next review adds `bug-reviewed` back.
5. **Mitigated date set:** comment asking for the mitigation type and for the impact to be re-scored.
6. **Past "needs a plan" age and still New or Ready:** add label `needs-decision`; notify the team.
7. **Past "leadership decides" age, not mitigated and not escalated:** notify the QA lead and engineering manager to escalate.
8. **Escalated, and no leadership decision after 14 days:** notify the QA lead, so it's on the next monthly review.
9. **Reopened:** set status to In progress; notify the original assignee; keep the history.

## 4. Saved filters for the dashboard

**How days are counted.** The dashboard and these filters use one rule: a limit of N days is met through day N and missed from day N + 1, with the day a bug is raised as day 0. A High bug raised on 1 October is on time through 15 October and late from 16 October. In JQL that's `created < startOfDay(-Nd)`, not `created <= -Nd`: relative dates like `-14d` count back 14 × 24 hours from now, so a bug raised at 4pm would flip at 4pm. Review dates work the same way: `"Review date" < startOfDay()` is overdue from the day after the review date. A test checks every age filter here uses this form, with the same numbers as the dashboard.

Build every panel on one shared base filter, so a workflow change doesn't break eight panels at once.

**Base filter "Open bugs"**
```
project = SHOP AND issuetype = Bug AND statusCategory != Done
```
Use `statusCategory` rather than listing open statuses by name. Then reference the base filter with `filter = "Open bugs"`.

| Panel | JQL | Gadget |
|---|---|---|
| P0 emergencies | `filter = "Open bugs" AND priority = P0` | Filter results, at the top |
| The action list, in pickup order | `filter = "Open bugs" ORDER BY priority ASC, Impact DESC, created ASC` | Filter results |
| Urgent bugs open | `filter = "Open bugs" AND Impact in ("Very high", High) ORDER BY Impact DESC, created ASC` | Filter results |
| Waiting for triage | `filter = "Open bugs" AND (status = New OR Impact is EMPTY) ORDER BY created ASC` | Filter results |
| … waiting over 2 days | add `AND created < startOfDay(-2d)` | Filter results |
| Urgent bugs waiting for pickup | `filter = "Open bugs" AND Impact in ("Very high", High) AND assignee is EMPTY AND "Mitigated date" is EMPTY AND status != Deferred` (or simply `labels = needs-pickup`) | Filter results |
| Urgent bugs open past target | `filter = "Open bugs" AND "Mitigated date" is EMPTY AND ((Impact = "Very high" AND created < startOfDay(-7d)) OR (Impact = High AND created < startOfDay(-14d)))` | Filter results, next to the on-time share |
| Reviews overdue | `filter = "Open bugs" AND "Review date" < startOfDay()` | Filter results |
| Old bugs with no plan recorded | `filter = "Open bugs" AND status in (New, Ready) AND "Escalated date" is EMPTY AND ((Impact in ("Very high", High) AND created < startOfDay(-30d)) OR (Impact = Medium AND created < startOfDay(-90d)) OR (Impact = Low AND created < startOfDay(-180d)))` | Filter results |
| Needs escalating | `filter = "Open bugs" AND "Mitigated date" is EMPTY AND "Escalated date" is EMPTY AND ((Impact in ("Very high", High) AND created < startOfDay(-90d)) OR (Impact = Medium AND created < startOfDay(-180d)))` | Filter results |
| Leadership decision pending | `filter = "Open bugs" AND "Escalated date" is not EMPTY AND "Leadership decision" is EMPTY` | Filter results. Counted with the two above as "old bugs without a decision" |
| Urgent bugs in progress, per team | `filter = "Open bugs" AND Impact in ("Very high", High) AND status in ("In progress", Verification)` | Two-dimensional: Team × Status |
| Missing information | `filter = "Open bugs" AND (Impact is EMPTY OR priority is EMPTY OR (status = Deferred AND ("Deferral reason" is EMPTY OR "Review date" is EMPTY)))` | Filter results |
| Deferred bugs (the risks we carry) | `filter = "Open bugs" AND status = Deferred ORDER BY "Review date" ASC` | Filter results, with Deferral reason, Workaround and Mitigation type as columns |
| Why bugs are deferred | `filter = "Open bugs" AND status = Deferred` | Pie chart by Deferral reason |
| Closed as accepted risk | `project = SHOP AND issuetype = Bug AND resolution = "Accepted risk" ORDER BY resolved DESC` | Filter results, with Accepted by and Look again if as columns. Kept on the leadership view, so accepted risks never vanish |
| Created vs fixed | `project = SHOP AND issuetype = Bug` | Created vs resolved chart, 90 days |
| Closed without a fix | `project = SHOP AND issuetype = Bug AND statusCategory = Done AND resolution != Fixed AND resolved >= -28d` | Pie chart by Resolution |
| Reopened | `project = SHOP AND issuetype = Bug AND status CHANGED FROM Closed AFTER -28d` | Filter results |
| Where bugs are found | `project = SHOP AND issuetype = Bug AND created >= -90d` | Pie charts by Found in, and by Found by |
| Causes of urgent and reopened bugs | `project = SHOP AND issuetype = Bug AND resolution = Fixed AND resolved >= -90d AND (Impact in ("Very high", High) OR status CHANGED FROM Closed)` | Pie chart by Labels (shows the `cause-` labels) |
| Urgent fixed bugs with no cause label yet | same filter, `AND NOT labels in (cause-requirement-gap, cause-integration-contract, …)` | Filter results: the prevention review's agenda |
| Hotspots | `filter = "Open bugs"` | Two-dimensional: Component × Impact |
| Urgent bugs: time to fix or mitigate | `project = SHOP AND issuetype = Bug AND Impact in ("Very high", High) AND ("Mitigated date" >= -90d OR resolved >= -90d)` | Export, then median of (Mitigated date or Resolved) − Created. Always show "Urgent bugs open past target" beside it: this only covers finished work |

Name each gadget with the **question it answers**, not the filter name, for example "Is anything unscored?".

### AI labels

`ai-drafted` is added automatically by the tool that drafts the ticket; `found-with-ai` is added by the reporter, or by the tool if it raised the bug. See the [labels guide](labels-guide.md) for the full list, and the [playbook](playbook.md#is-ai-helping) for how they're used.

| Panel | JQL | Gadget |
|---|---|---|
| AI-drafted tickets with an outcome | `project = SHOP AND issuetype = Bug AND labels = ai-drafted AND created >= -90d AND status != New` | Count: the denominator. Tickets still in New haven't been judged, so they're left out |
| AI-drafted tickets rejected | the same filter, `AND resolution in (Duplicate, "Cannot Reproduce")` | Pie chart by Resolution, so duplicates and not reproducible show separately. Only apply the stop rule from 10 outcomes |
| Bugs found with AI, by impact | `project = SHOP AND issuetype = Bug AND labels = found-with-ai AND created >= -90d` | Pie chart by Impact |

### Review and reproducibility labels

These are built-in Jira labels too, so there's nothing to set up.

| Label | Added | Meaning |
|---|---|---|
| `bug-reviewed` | At triage, when impact and priority are agreed | The team has reviewed it. Removed automatically when the review date passes (automation 4), so it never goes stale. |
| `reproducible` | At triage, or when someone reproduces it | The team can make it happen on demand |
| `not-reproducible` | At triage, after a real attempt | The team tried and couldn't yet. Pair with the reporter or add logging. After two real attempts, close it with evidence of what was tried, unless something still points to a real problem (production-only, customer-reported, intermittent). Then defer it with "Monitoring for more evidence" and a review date instead. |

Panels:
- **Has the team reviewed them?** `filter = "Open bugs"` as a pie chart by Labels, or three filters: `labels = bug-reviewed`, `labels = needs-review`, and `(labels is EMPTY OR labels not in (bug-reviewed, needs-review))`.
- **Can we reproduce them?** `filter = "Open bugs" AND labels in (reproducible, not-reproducible)` as a pie chart by Labels, plus `filter = "Open bugs" AND (labels is EMPTY OR labels not in (reproducible, not-reproducible))` for "not checked yet".

Note: `labels not in (…)` leaves out bugs with no labels at all, so always add `labels is EMPTY OR`.

### Cause labels

Root cause is a **label**, not a custom field. Labels come with Jira, appear on every board and card, and pie charts can group by them, so there's nothing to set up and nothing to fill in on a form. Use one label from this list: `cause-requirement-gap`, `cause-integration-contract`, `cause-boundary-check`, `cause-untested-change`, `cause-cache-or-state`, `cause-data-migration`, `cause-race-condition`, `cause-test-data`, `cause-third-party`, `cause-accessibility`.

They're optional. The developer who fixed the bug adds one if they know the cause; the monthly prevention review adds them for fixed High and Very high bugs and reopened ones. Nothing blocks a ticket without one.

### Share of completed tickets that were bugs or tech debt

No time tracking needed: count completed tickets. It's a proxy for effort, not a measure of it, because every ticket counts as one whatever its size. If the team estimates in story points, use the share of points instead.

| Count | JQL |
|---|---|
| Bugs and tech debt completed last month | `project = SHOP AND issuetype in (Bug, "Tech debt") AND resolved >= startOfMonth(-1) AND resolved < startOfMonth()` |
| All tickets completed last month | `project = SHOP AND resolved >= startOfMonth(-1) AND resolved < startOfMonth()` |

Share = first count ÷ second count. Compare it with the planned share (15 to 25%). Save the figure on the first working day of the next month, with that date, so a past view only shows months whose figure existed then.

### Go-live sign-offs in Scrum and Kanban

- **Scrum:** at go/no-go for the sprint release or milestone, check `fixVersion = "<release>" AND issuetype = Bug AND Impact in ("Very high", High) AND statusCategory != Done`.
- **Kanban:** there's no release batch, so check before a feature goes live for everyone (for example a flag switched on) or an epic is closed: `parent = <EPIC-KEY> AND issuetype = Bug AND Impact in ("Very high", High) AND statusCategory != Done`.
- If anything comes back, first check nothing is on the can't-sign-off list (an active incident, a safety risk, an unmitigated security vulnerability, a confirmed legal breach). Otherwise, record the sign-off as a comment on the release or epic, with the bug IDs, who is accountable and who was consulted, why, whether users are protected **at go-live** (active, proposed or none: a mitigation that's only agreed is "proposed", not "active"), the residual risk, and what was promised by when (fixed or mitigated, by a date). Add the label `go-live-signoff` so the log can be listed.
- Check the promise against the bug, not the comment: was it mitigated or fixed by the date? The demo dashboard does this from each bug's history.

## 5. What Jira can't do on its own

These are the gaps the export above would fill.

- **Weighted exposure** (sum of 8, 4, 2, 1): Jira gadgets count issues but can't sum a mapped weight. Export the "Open bugs" filter weekly (or use a small script against the API) and keep the weekly totals. The goal scorecard needs the same.
- **Time to fix or mitigate, against target:** needs the export too, because it uses the earlier of Mitigated date and Resolved.
- **History "as of" a past date:** Jira's change history has it, but rebuilding past states needs a script. The [demo dashboard](../dashboard/index.html) shows how: it stores each bug's events and rebuilds its state for any date, and shows figures from outside Jira (like the monthly share of work) only from the day they were reported.
- **Whether go-live promises were kept:** needs a small script that reads each `go-live-signoff` comment's bugs and due date and compares them with the bugs' Mitigated date or resolution.

### If you build the export

The dashboard doesn't care where its data comes from, as long as it gets this shape. A small script reading Jira's REST API (issues plus their changelog) could produce it; this repo doesn't include one, because a speculative integration would be harder to trust than a clear contract.

- **One record per bug:** `id`, `title`, `team`, `area` (component), `created` (a `YYYY-MM-DD` date), `labels`, `foundIn`, `foundBy`.
- **`events`:** the changelog, as `{ date, changes }` in date order, where `changes` uses the field names the dashboard reads: `status`, `impact`, `severity`, `users`, `raisedBy`, `priority`, `assignee`, `triaged`, `reviewed`, `reviewDue`, `mitigated`, `mitigation`, `mitigationType`, `deferralReason`, `escalated`, `escalationDecision`, `resolution`, `closed`, `closureReason`, `acceptedBy`, `lookAgainIf`. Dated fields (`triaged`, `mitigated`, `closed`…) hold the date of their own event.
- **`signOffs`:** one per `go-live-signoff` comment: `id`, `milestone`, `team`, `date`, `bugs`, `accountable`, `consulted`, `reason`, `protectionAtGoLive` (active, proposed or none), `protection`, `residualRisk`, and `followUp` (`action`, `kind`: fixed or mitigated, `due`).
- **`capacity`:** monthly shares with the date each was reported.

Run `node tools/validate-data.js export.json` on the result before trusting any number from it. The validator will catch, for example, a sign-off that claims a mitigation was active before the bug's history shows one.

## 6. Checklist before the pilot

- [ ] Fields created with the agreed values
- [ ] Validators on the five transitions
- [ ] Automations 1 to 5 live
- [ ] Base filter and dashboard panels built
- [ ] Bug template added to the issue type's description
- [ ] Pilot teams walked through the [scoring guide](scoring-guide.md) (30 minutes, with 5 practice bugs)

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
