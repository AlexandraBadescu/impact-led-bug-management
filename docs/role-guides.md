# How we work together on bugs

Bugs are a team problem, not a QA queue. This page shows where each role comes in, what they bring, and what they get back. The [playbook](playbook.md) has the full detail.

- [The three moments we meet](#the-three-moments-we-meet)
- [QA](#qa)
- [Developers](#developers)
- [Product managers and product owners](#product-managers-and-product-owners)
- [Engineering managers](#engineering-managers)
- [Leadership](#leadership)
- [Customer support](#customer-support)
- [A disagreement, worked through](#a-disagreement-worked-through)

---

## The three moments we meet

Most of the collaboration happens in three short moments. Everything else follows from them.

| Moment | Who's there | What we decide together |
|---|---|---|
| **Triage** (twice a week, 20 minutes, or async within 2 days) | QA, a developer, the product owner | How much harm each new bug does, when we'll work on it (priority), and who owns it |
| **Urgent bug review** (weekly, 15 minutes) | QA lead, engineering managers, product owners | Next step for every urgent bug; what to defer, mitigate or escalate |
| **Go/no-go** (each release in Scrum; before a feature goes live for everyone in Kanban) | Product owner, engineering manager, QA lead | Whether to ship with any known urgent bug, and how users are protected if we do |

**Ground rules**
- Bring evidence, not volume. The [scoring guide](scoring-guide.md) is the shared language.
- Anyone can raise a bug, and anyone can challenge a score or a priority.
- Decisions are written on the ticket, so nobody has to remember them.
- These are team numbers. Nobody is rated on them.

---

## QA

**You bring**
- Bugs written with the [template](bug-template.md): clear steps, evidence, and a first guess at impact.
- The risk view at triage: who is affected, how badly, and what could happen next.
- Verification that covers what the bug affected: browsers, devices, locales, data. You verify High and Very high bugs and risky changes; a peer developer can verify the rest, and you help them decide what to check.

**You do together with others**
- Agree impact, priority and owner at triage with the developer and the product owner.
- Agree with the developer how a fix will be checked **before** it's built, and pair on hard-to-reproduce bugs.
- At the monthly prevention review, bring the fixed urgent bugs and anything reopened. You're not expected to know the root cause; the developers who fixed them do.
- QA lead: facilitate the weekly urgent bug review and the monthly prevention review, and keep the dashboard honest.

**You get**
- Decisions on old bugs, so you stop re-testing things nobody plans to fix.
- A shared language for "this matters", backed by evidence rather than opinion.

**Time (planning assumption):** 1 to 1.5 hours a week across triage and reviews, less as the backlog gets cleaner. All the time figures on this page match the [rollout plan](rollout-plan.md#what-it-costs-to-run-week-to-week); replace them with your pilot's real numbers.

## Developers

**How you pick up bugs**
1. **P0 emergencies first.** Drop what you're doing and join the swarm, if you're needed, until it's fixed or mitigated.
2. **Then the team's agreed order.** P1 bugs in the order agreed at triage or sprint planning, alongside planned feature work.
3. **Then planned decisions.** P2 bugs scheduled for this sprint, milestone or tech debt window.
4. **Fix while you're there.** A small bug in code you're already changing can go in the same pull request. Tell QA so it gets verified and closed.

If a bug looks more important than its priority, say so at triage or in the team channel. Don't quietly reorder the backlog; the priority reflects trade-offs the team agreed.

**You bring**
- At triage: what a fix would take, and whether a quick mitigation (feature flag, fallback, guard) could protect users sooner.
- When you fix it: link the pull request, with the test or check that came with the fix. If you know the cause, add one `cause-` label. It's optional, takes a few seconds, and nothing is blocked without it.
- At the monthly prevention review: join for the urgent or reopened bugs you fixed, so the team can agree what caused them.

**You do together with others**
- Agree the checks with QA before building the fix; pair on reproduction when it's tricky.
- Tell the product owner early if a fix will miss its target, so the team can choose: mitigate, re-plan or escalate.

**You get**
- A clear, agreed order of work, and no surprise "drop everything" requests except real P0s.
- Credit for mitigations: protecting users quickly counts.

**Time (planning assumption):** about 40 minutes in a week when you're the developer at triage; otherwise 5 to 10 minutes when your team's bugs come up.

## Product managers and product owners

**You bring**
- What matters to users and the business: deadlines, commitments, who the affected customers are.
- At triage: the final call on priority when the team can't agree.

**You do together with others**
- Agree impact and priority at triage with QA and a developer. Confirm the score for High and Very high bugs.
- Make trade-offs with the engineering manager: defer (with a reason from the list and a review date), accept a Low or Medium risk in writing, or close. High and Very high risks are accepted by leadership, and stay open. QA's view of the risk goes on the ticket.
- At go/no-go, or before a feature goes live in Kanban, decide with the engineering manager and QA lead whether it can go live with a known urgent bug, and record the sign-off with what's promised by when. An active incident, a safety risk, an unmitigated security vulnerability or a confirmed legal breach isn't yours to sign off: it blocks go-live.
- When an urgent bug is flagged `needs-pickup`, agree with the engineering manager who picks it up. If planned work has to pause, you decide what moves.
- When a P0 is called, keep stakeholders informed while the team fixes it.
- Start new initiatives with a quality baseline: known bugs in the area, and what you expect to happen to them.

**You get**
- Bugs in the language of product risk: harm to users, not ticket counts.
- A short list of decisions each week, instead of a backlog to read.

**Time (planning assumption):** 45 minutes to an hour a week across triage and the urgent bug review; 30 minutes a month.

## Engineering managers

**You bring**
- Capacity and sequencing: what the team can take on, and what it would displace.

**You do together with others**
- Confirm P0 emergencies (or the on-call engineer does), and make sure the right people swarm.
- Make sure every urgent bug is picked up by someone within 2 days (P0s straight away). When one is flagged `needs-pickup`, agree with the product owner who picks it up; if planned work has to pause, the product owner decides what moves. Keep the team to no more than 3 urgent bugs at once.
- Agree trade-offs with the product owner, with QA's risk view.
- Protect the 15 to 25% of work planned for bugs, tech debt and prevention, and check each month that the share of completed tickets matched it.
- Turn structural fixes into planned tech debt with the team.

**You get**
- A view of where your team's risk sits, and early warning when it's growing.
- Evidence for tech debt work: hotspots and root causes, not gut feeling.

**Time (planning assumption):** 15 to 30 minutes a week; 30 minutes a month.

## Leadership

**You bring**
- Decisions the team can't make alone: escalated bugs (fix next milestone, or accept the risk) and support for the capacity reservation when deadlines press. Record the decision on the ticket by the next monthly review; until then the dashboard shows it as pending, because escalating isn't deciding.

**You do together with others**
- Read the monthly view with product, engineering and QA leads, and agree one action for any goal that's off track.

**You get**
- An honest picture of the risk the organisation is carrying, and who owns it.
- A trend you can trust, with the context that stops it being gamed.

**Time (planning assumption):** 30 to 60 minutes a month to read the monthly view and decide escalations, more in a month with several. If escalations regularly wait past the next monthly review, see [when decisions stall](playbook.md#when-decisions-stall).

## Customer support

**You bring**
- What customers are actually experiencing: volume, who's affected, and the workarounds you use.

**You do together with others**
- Link support tickets to the bug they relate to. Volume changes the "users affected" score.
- Flag anything that looks like a P0: money, data or safety at risk right now.

**You get**
- Known issues and workarounds in one place.
- Bugs that affect many customers rise up the list, because your data counts.

---

## A disagreement, worked through

*Fictional, from the demo data: BUG-109 and the "Checkout redesign" sign-off. Nobody here is a real person.*

**The risk.** A week before the checkout redesign was due to go live on 15 October, QA found that keyboard users lose their place on the payment form after a validation error: focus jumps to the top, and a screen reader user has to work out where they were. It was scored High (High severity, Low reach, raised one level because it's at payment). The fix was in progress, due by 22 October, the bug's 14-day target.

**Three reasonable views.**

- **QA** wanted to hold the release until the fix shipped. The evidence: the accessibility suite, a screen recording of the keyboard path, and the fact that payment is the one journey where getting lost costs the customer something.
- **Product** wanted to ship. The redesign fixes two other accessibility problems on the old page, which every keyboard user hits today, and a second release slot wasn't available for three weeks.
- **Engineering** said the fix was a few days from done, and rushing it into the release would mean shipping it barely tested, which is how a second bug gets made.

Nobody was wrong. That's the usual shape of a real trade-off.

**The options on the table.** Hold the release until the fix lands. Ship without the redesign's payment step and keep the old form for now (rejected: two days of work to split, and the old form has its own problems). Or ship, with the fix promised by its target date and support briefed to help anyone who gets stuck.

**The decision.** The product owner, who is accountable for go-live, chose to ship, with the engineering manager and the QA lead consulted. QA's recommendation to hold is recorded on the sign-off, not overruled in silence. The sign-off says plainly that there's no mitigation at go-live: phone support helps, but it doesn't protect anyone, so the bug stays urgent.

**Residual risk, and what happened next.** Keyboard and screen reader users could lose their place after a payment error until the fix shipped. The fix was promised by 22 October. On 31 October it's in verification and 9 days late, and the dashboard shows that on the sign-off itself, in goal G1 and on the Today list, without anyone having to remember to report it. The follow-up conversation is the useful one: why did a few days become nearly three weeks, and should the next sign-off ask for a mitigation, not just a date?

What this shows isn't that QA was right or Product was wrong. It's that the decision had an owner, the disagreement was on record, and the promise was checked against what actually happened.

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
