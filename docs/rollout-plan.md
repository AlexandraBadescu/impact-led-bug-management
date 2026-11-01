# Rolling it out

A plan an engineering manager can use to decide whether this is worth adopting, and what it will cost. Every effort figure here is a **planning assumption** for a team of roughly 5 to 9 people, not a measurement from a past rollout. Replace them with your own as soon as the pilot gives you data.

Start with the [minimum version](minimum-viable-approach.md). The phases below assume that, and add the rest of the [playbook](playbook.md) only where the pilot shows a need.

## The phases

### 0. Agree (about 2 weeks)

**Deliverables:** the minimum version adapted to your team (thresholds, who decides what), the Impact and Review date fields, three saved filters, a triage slot in the calendar.
**Roles:** QA lead drafts; engineering manager and product owner agree; a Jira admin adds the fields.
**Depends on:** someone with Jira admin rights; agreement on the matrix from the people who'll use it.
**Effort (assumption):** QA lead 1 to 2 days; engineering manager and product owner 2 to 3 hours each; Jira admin half a day.
**Decision point:** engineering manager and product owner approve the pilot scope, the success criteria below and the rollback trigger. No pilot without that agreement.

### 1. Pilot (one quarter, one or two teams)

**Deliverables:** every new bug triaged and scored; weekly look at the three numbers; a calibration session in month 1 and month 3 (five bugs, scored separately, compared).
**Roles:** QA facilitates triage; product owner and a developer attend; engineering manager runs the weekly look.
**Effort (assumption):** triage 2 × 20 minutes a week for three people; the weekly look 15 minutes for three or four people; QA prep 30 minutes a week. Roughly 2 to 3 person-hours a week for the team in total.
**Decision point, mid-pilot:** keep going, adjust a threshold, or stop (see rollback).

### 2. Backlog reset (2 to 3 weeks, during the pilot)

**Deliverables:** every open bug past its age limit put in one of four buckets: fix now, fix later (planned and linked), accept and monitor (dated), or close with a reason.
**Roles:** product owner decides, QA prepares the list, developers estimate the "fix now" ones.
**Effort (assumption):** for a backlog of around 100 old bugs, two or three 1-hour sessions with the product owner, a developer and QA. Most bugs take under a minute; a handful take a real conversation.
**Risk:** the reset becomes a mass closure to make the numbers look good. Every closure needs a written reason, and "closed without a fix" is counted apart from fixes.

### 3. Scale (next quarter)

**Deliverables:** more teams on the minimum version; the monthly view for leadership if it's wanted; the extra playbook pieces the pilot asked for.
**Depends on:** the pilot meeting its success criteria; a calibration session across teams before their scores are compared.
**Effort (assumption):** per new team, half a day of set-up and a 30-minute walk-through of the scoring guide.
**Decision point:** leadership agrees to the monthly readout, including their own time for escalations (below).

### 4. Review (every quarter)

**Deliverables:** thresholds reviewed against the data, a line in the [decision log](playbook.md#14-decision-log-and-open-questions) for every change.
**Effort (assumption):** 45 minutes for product, engineering and QA leads.

## What it costs to run, week to week

| Who | Planning assumption | What for |
|---|---|---|
| QA | 1 to 1.5 hours a week | Triage, preparing the weekly look, keeping review dates honest |
| Product owner | 45 minutes to 1 hour a week | Triage, priority calls, deferral decisions |
| Developer (rotating) | 40 minutes a week | Triage, effort and mitigation options |
| Engineering manager | 15 to 30 minutes a week | The weekly look, pickup and capacity |
| Leadership | 30 to 60 minutes a month, more in a month with several escalations | Reading the monthly view, deciding escalations |
| Jira admin | Half a day once, then occasional | Fields, filters, the few validators the team keeps |

If the real numbers come out well above these, something is too heavy. That's a finding, not a failure.

## Success and rollback

**Success at the end of the pilot:** urgent bugs past target trending down; the "no decision" list near zero and staying there; triage still fits in its slot; the people in the pilot think the scores are fair (ask them).

**Roll back, or cut back to fewer rules, if:** triage regularly overruns by more than half; review dates are routinely ignored for a month; the team is spending more time on fields than on bugs; or nobody is using the numbers to decide anything. Rolling back means returning to what the team did before, keeping only the bug template and the impact field if people found them useful.

## Adoption risks, and what to do about them

| Risk | Early sign | What to do |
|---|---|---|
| Leadership doesn't respond to escalations | Escalations sit "pending" past the next monthly review | Agree the escalation rule at the start (see [when decisions stall](playbook.md#when-decisions-stall)). Silence never counts as accepting the risk; the bug stays visible as pending, and goes to the next level up after a second missed review |
| Teams score differently | The same kind of bug is High in one team and Medium in another | Calibration sessions across teams before comparing; add the disputed bug to the worked examples |
| Gaming the numbers | Closures without a fix rise, or re-scores downward cluster before the monthly review | Closures without a fix and re-scores are counted and shown; ask about spikes at the review; never tie the numbers to individual performance |
| Too many required fields | Fields left blank, or filled with whatever unblocks the transition | Keep the minimum version's two fields; add a field only when a decision needs it; drop any field nobody has used for a quarter |
| Meetings multiply | People start skipping triage | Fold the monthly and quarterly reviews into existing retros or planning; keep triage short and async when it can be |
| Review dates ignored | "Reviews overdue" grows week on week | Make the overdue list the first item of the weekly look; if it keeps growing, the cadence is too frequent for this team, so relax it rather than nag |

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
