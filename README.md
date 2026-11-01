# Impact-led bug management

At one point, my squad had the oldest bug backlog in Engineering. We had plenty of tickets, but not enough decisions about what to do with them.

So I changed the conversation. Instead of counting bugs, we looked at which ones were actually hurting users, what needed fixing first, and which risks we were consciously choosing to carry. I introduced impact scoring with a shared matrix, age limits that forced a decision on old bugs, a weekly fixing rhythm with the team, and dashboards so everyone could see what was urgent and what was ageing. The fixing was the squad's work; the approach was mine.

**The squad went from the oldest bug backlog in Engineering to the fewest open bugs of any squad, with an average bug age a quarter of the next-best squad's.** That's the real result, from a previous role. [Where this comes from](docs/background.md) has the rest of the story, and its limits.

## What this repo is

This repo is that experience, rewritten from scratch and taken further: a playbook, a scoring guide, a Jira setup, and a **[demo dashboard](https://alexandrabadescu.github.io/impact-led-bug-management/dashboard/)** running on fictional data for MaxQ Ltd, a made-up company with an online shop, its own payments service and an identity-check service. The data deliberately includes overdue urgent bugs, a deferral nobody explained and a go-live promise that was missed, because the point of the dashboard is to make those visible, not to look green.

It's deliberately comprehensive, and I wouldn't drop all of it onto a team on Monday morning and hope everyone thanked me. Start with the **[one-page minimum version](docs/minimum-viable-approach.md)**.

## Three things it demonstrates

1. **Bugs as product risk, not ticket counts.** Impact (harm to users) is kept apart from priority (when we fix it), and the score informs the decision rather than making it. The [worked prioritisation](docs/scoring-guide.md#using-the-score-a-worked-prioritisation) and the [worked disagreement](docs/role-guides.md#a-disagreement-worked-through) show the judgement part.
2. **Decisions that are visible and owned.** Every deferral needs a reason and a date, accepted risks stay visible, and a go-live with a known urgent bug records who was accountable and what was promised. Whether the promise was kept is read from the bug's own history.
3. **Numbers that can't quietly mislead.** I reviewed my own first version and found it telling a kinder story than its data: a 92% "On track" with four urgent bugs overdue, sign-offs dated before their bugs existed. The [test report](docs/test-report.md) says what I found and fixed, and which claims are still unproven.

## What it isn't

The demo is fictional, so it shows how the approach works, not that an organisation improved: that evidence is the real result above. The Jira setup is documented, not installed. The AI evaluation cases have reference answers but haven't been run against a model. Automated accessibility checks pass, but the manual ones are still to do. The [publication gate](docs/test-report.md#publication-gate) lists each of these.

## Where to go next

- **Short on time:** the [demo dashboard](dashboard/index.html), then the [test report](docs/test-report.md).
- **Thinking of trying it:** the [minimum version](docs/minimum-viable-approach.md), then the [rollout plan](docs/rollout-plan.md).
- **Product, engineering or QA:** [how each role works with it](docs/role-guides.md), the [playbook](docs/playbook.md), the [scoring guide](docs/scoring-guide.md), the [dashboard guide](docs/dashboard-guide.md) and the [Jira setup](docs/jira-setup.md).
- **Code and evidence:** the dashboard and its calculations in [`dashboard/`](dashboard), the data and draft checkers in [`tools/`](tools), the [AI skills](skills/README.md) and their [known-answer cases](evals/bug-drafts/README.md), and [`tests/`](tests).

By [Alexandra Badescu](https://alexandrabadescu.com), Senior QA Engineer and former Head of QA. A personal portfolio project: it doesn't describe any employer's process, and all data is fictional.

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
