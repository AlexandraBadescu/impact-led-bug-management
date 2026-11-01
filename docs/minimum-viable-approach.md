# The minimum version: start here

The full playbook is deliberately complete. This page is what I'd actually start a team on: enough to stop bugs ageing without a decision, small enough to run with the tools you already have. No custom dashboard, no new meetings beyond one, and only two extra fields. Run it for a quarter, then add the pieces from the [playbook](playbook.md) that solve a problem you've actually hit.

## 1. Write bugs so anyone can act on them

Use the [bug template](bug-template.md): what happens, expected, actual, how to reproduce, evidence. That's the whole requirement. A bug nobody can reproduce or understand can't be prioritised, however important it is.

## 2. Score impact, then agree priority

Two questions at triage: how bad is it for the people who hit it, and how many people hit it? Read the impact from the [matrix](scoring-guide.md#step-3-read-the-impact). Then QA, a developer and the product owner agree when to work on it, and write one line saying why if it's not what the impact suggests. Impact is harm; priority is when. Keeping them apart stops most of the arguments.

Two fields: **Impact** (Very high, High, Medium, Low) and **Review date**. Use Jira's built-in Priority for priority.

## 3. Know who decides

| Decision | Who makes it |
|---|---|
| Impact score | QA, a developer and the product owner together; evidence settles disagreements |
| Priority | The product owner, after hearing QA and engineering |
| Who picks up an urgent bug, and what pauses | The engineering manager and product owner |
| Deferring, or accepting a Low or Medium risk | The product owner, with QA's view of the risk on the ticket |
| Accepting a High or Very high risk | Leadership, never by silence |

## 4. One short triage, twice a week

Twenty minutes, or async within 2 days. Every new bug leaves with an impact, a priority and a review date. If triage runs over, you're discussing fixes, not triaging.

## 5. Every deferral is a decision

A deferred bug needs a **reason** and a **review date**. That's it. No reason means it was postponed, not decided. On the review date, someone looks again: fix it, defer it again with a new date, or close it with a written reason.

## 6. Three numbers, looked at weekly

1. **Urgent bugs open, and how many are past their fix target** (7 days for Very high, 14 for High). The second number matters more than the first.
2. **Bugs older than their age limit without a decision** (30 days for High and Very high, 90 for Medium, 180 for Low). The target is zero.
3. **Deferred bugs past their review date, or with no reason.** Also zero.

Three saved filters in Jira cover all of them (see [Jira setup](jira-setup.md#4-saved-filters-for-the-dashboard)). Days are calendar days from the day the bug is raised; "within 14 days" is late from day 15.

## 7. When to escalate

- An urgent bug is past its fix target and nobody can say when it'll be fixed or mitigated: raise it at the weekly look, and tell stakeholders.
- A High or Very high bug is still open and unmitigated at 90 days: leadership chooses, in writing, fix next milestone or accept the risk.
- Someone wants to go live with a known urgent bug: the product owner signs it off, with how users are protected and what's promised by when. An active incident, a safety risk, an unmitigated security vulnerability or a confirmed legal breach can't be signed off.

## What's not in the minimum version

All optional, all in the [playbook](playbook.md): the full dashboard, weighted exposure, the monthly prevention and quarterly trade-off reviews, cause labels, "where are bugs caught?", work-in-progress limits, mitigation types, the AI skills and "Is AI helping?", and the go-live sign-off log. Add one when someone needs the answer it gives, not because it's there.

## How you'll know it's working

After a quarter: fewer urgent bugs past target, the "no decision" list at or near zero, and triage still taking twenty minutes. If triage takes longer every week, or people stop setting review dates, the process is too heavy for the team. Cut something before adding anything.

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
