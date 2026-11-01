# Impact-led bug management

At one point, my squad had the oldest bug backlog in Engineering. We had plenty of tickets, but not enough decisions about what to do with them.

So I changed the conversation. Instead of counting bugs, we looked at which ones were actually hurting users, what needed fixing first, and which risks we were consciously choosing to carry. I introduced impact scoring with a shared matrix, age limits that forced a decision on old bugs, a weekly fixing rhythm with the team, and dashboards so everyone could see what was urgent and what was ageing. The fixing was the squad's work; the approach was mine.

**The squad went from the oldest bug backlog in Engineering to the fewest open bugs of any squad, with an average bug age a quarter of the next-best squad's.** That's the real result, from a previous role. [Where this comes from](docs/background.md) has the rest of the story, and its limits.

### Explore the project

**[Explore the live Bug Decisions dashboard](https://alexandrabadescu.github.io/impact-led-bug-management/dashboard/)** · [Start with the one-page approach](docs/minimum-viable-approach.md) · [See the test evidence](docs/test-report.md)

## What this repo is

This project takes that real experience, rewrites it from scratch and develops it further into a practical bug management framework.

It includes a playbook, impact scoring, Jira configuration guidance, automated checks, AI evaluation examples and an interactive dashboard using fictional data for MaxQ Ltd.

The fictional dataset deliberately includes overdue bugs, missed targets and decisions that still need attention. The dashboard isn't supposed to look reassuring when the underlying situation isn't.

And while the framework is comprehensive, I wouldn't drop all of it onto a team on Monday morning and expect everyone to thank me. That's why there's a [minimum viable approach](docs/minimum-viable-approach.md) for teams that want to start small.

## Three things it demonstrates

1. **Bugs are about product risk, not ticket counts.** Impact describes the potential harm; priority describes when we should act. The scoring helps inform decisions, but it doesn't replace judgement. See the [worked prioritisation](docs/scoring-guide.md#using-the-score-a-worked-prioritisation).

2. **A decision needs an owner, not just a meeting.** Deferrals need reasons and review dates, accepted risks remain visible, and go-live decisions record who accepted what. Escalating an issue isn't the same as resolving it.

3. **Good-looking metrics can still tell a misleading story.** When I reviewed the first version of this framework, I found that a 92% on-time result was sitting alongside four overdue urgent bugs. I also found contradictory sign-off dates. The [test report](docs/test-report.md) explains what I corrected, how I tested it and what remains unproven.

## What this project doesn't claim

The dashboard and its 59 bug records are fictional. They demonstrate how the framework behaves, not that a real organisation adopted it successfully.

The Jira implementation is documented, not connected to a live Jira instance. The AI evaluation examples include known answers but haven't been evaluated against a live model. Automated accessibility checks do not establish complete WCAG conformance; manual checks remain outstanding.

I'd rather make those limitations clear than pretend a green test suite proves more than it actually does.

## Where to go next

- **Just exploring?** Open the [live dashboard](https://alexandrabadescu.github.io/impact-led-bug-management/dashboard/) and browse the [test report](docs/test-report.md).
- **Want something practical?** Read the [minimum viable approach](docs/minimum-viable-approach.md) and [rollout plan](docs/rollout-plan.md).
- **Interested in the decisions?** Explore the [playbook](docs/playbook.md), [scoring guide](docs/scoring-guide.md) and [cross-functional scenarios](docs/role-guides.md).
- **Want to challenge the engineering?** Review the [`dashboard/`](dashboard), [`tests/`](tests), [AI skills](skills/README.md) and [evaluation cases](evals/bug-drafts/README.md).

By [Alexandra Badescu](https://alexandrabadescu.com), Senior QA Engineer and former Head of QA. This is a personal portfolio project, not a description of any employer's internal processes.

## Run it

```bash
npm ci
npx playwright install chromium   # add webkit and firefox to run those tests locally; CI runs all three
npm test                          # calculations, data checks, scenarios, dashboard in a browser, docs
npm run validate                  # is the demo data one consistent story?
npm run eval                      # the AI known-answer cases
npm run preview                   # the dashboard as one standalone HTML file, in dist/
```

## Licence

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](LICENSE). You're welcome to read it, use the ideas in your own team, and share it unchanged with credit. Commercial use (consultancy, courses, paid products, client work) and publishing modified versions need my written permission.

---

Alexandra Badescu · [alexandrabadescu.com](https://alexandrabadescu.com) · [LinkedIn](https://www.linkedin.com/in/alexandra-maria-badescu/)
