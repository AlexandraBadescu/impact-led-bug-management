# Where this comes from

This playbook grew out of a bug management approach I designed and ran in a previous role. I've rewritten it from scratch for this portfolio, fixed what I learned didn't work, and added what I'd do next. Everything here is my own work; nothing is copied from an employer's documents, and all data is fictional.

The first three sections below are real experience. Everything after "What I'd do differently" describes this portfolio version, which is demonstrated with fictional data, not proven in an organisation.

## The problem I started with

My squad had the oldest bug backlog in Engineering. The backlog kept growing, old bugs had no decision, and there was no shared way to say which bugs mattered most.

## What I did

- Introduced **impact scoring** from severity and users affected, with a shared matrix, so product and engineering argued less and decided more.
- Set **age limits and review rhythms** by impact, with forced decisions on old bugs: fix, defer with a date, or close with a reason.
- Built **dashboards** so the team could see urgent bugs, ageing bugs and decisions due at a glance.
- Ran a **weekly fixing rhythm** with the team, with clear triage and a risk and impact assessment on every bug.

## Who did what

The approach, the scoring model, the age limits and the dashboards were mine. The fixing was the squad's: developers fixed the bugs, and the weekly rhythm was something we ran together. My part was getting everyone to the same language about harm, and making sure every old bug ended up with a decision.

## What happened

The squad went from the oldest bug backlog in Engineering to the fewest open bugs of any squad, with an average bug age a quarter of the next-best squad's.

That's the measure we used: open bug count and average bug age, compared with the other squads. It says the backlog got healthier. It doesn't say on its own that users hit fewer bugs, and a backlog can move for more than one reason, so I'd describe the approach as what made the decisions happen, not as the only reason the numbers moved.

## What I'd do differently, and what this version adds

Running it taught me where the first version was weak. This version fixes those gaps:

| In the first version | In this version |
|---|---|
| Age limits and escalation ages lived in different places and didn't agree | One table with two clear thresholds: "needs a plan by" (team) and "leadership decides at" |
| Mitigation was encouraged but not recorded | A mitigated date, a re-score, and mitigations counted towards the fix target |
| "Deferred" was inferred from other fields | An explicit Deferred state with a required reason (one dropdown) and a required review date, and accepted High risks kept open instead of closed |
| Goals had no measures | One number per goal, with a target and a status |
| "Total impact goes down" was a goal, but no points were defined, so it couldn't be tracked | A weighted exposure (8, 4, 2, 1 per open bug), explained as a ranking convention rather than a measure of harm, a weekly snapshot, and unscored bugs shown separately rather than counted as zero |
| No guardrails against gaming the numbers | Fixed and closed-without-fix kept apart, calibration sessions, team numbers only |
| Prevention was a meeting without data | A monthly review of fixed urgent and reopened bugs, with optional cause labels in Jira: data where it matters, without a form on every ticket |
| Stayed a draft for a long time | A phased rollout with a pilot and clear "done when" for each phase |
| AI ticket tools used the scoring model, but the process didn't say how to check them | AI drafts and suggests; people decide; AI scores checked against agreed examples after every change |
| No role-by-role guide | [Role guides](role-guides.md) for QA, developers, product, engineering managers, leadership and support |

I then reviewed this version too, as if it were someone else's, and it still had places where the numbers told a kinder story than the data. The [test report](test-report.md#what-reviewing-my-own-framework-found) covers what I found and how I fixed it.

## Skills this shows

Quality strategy, risk-based prioritisation, process design, metrics that drive decisions, dashboard design, Jira configuration and automation, stakeholder alignment, and the safe use of AI in QA.

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
