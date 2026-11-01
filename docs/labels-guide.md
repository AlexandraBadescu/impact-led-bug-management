# Labels guide

Which Jira labels we use, which are mandatory, and who or what adds them. Labels are built into Jira, show on every board, and can be filtered and charted with no setup, so they're lighter than custom fields. The rule of thumb: make as few mandatory as possible, automate the state labels, let people add the judgement labels, and let AI add only labels that describe its own work.

One thing that used to be a label isn't any more: the **deferral reason**. It's required, and Jira can't require a particular label, so it's a dropdown on the Deferred transition screen (see [Jira setup](jira-setup.md#1-fields)).

## The labels

| Label | Mandatory? | Added by | When | Why |
|---|---|---|---|---|
| `bug-reviewed` | **Mandatory** | **Automatic**, when impact and priority are set at triage | Triage | Shows the team has looked at it, with no extra click |
| `needs-review` | Automatic | Automation, which also removes `bug-reviewed` | When the review date passes | "Reviewed" never goes stale |
| `needs-triage` | Automatic | Automation | No impact after 2 days | Nothing new gets forgotten |
| `needs-pickup` | Automatic | Automation, which notifies the engineering manager and product owner | High or Very high with no assignee after 2 days | They agree who picks it up, and what pauses if needed |
| `needs-decision` | Automatic | Automation | Past its age limit with no plan | Forces fix, defer or close |
| `reproducible` / `not-reproducible` | **Mandatory** | Manual: QA, or whoever tries | At triage, after a real attempt | You can't fix confidently what you can't reproduce. P0 emergencies can be worked on before this is set. Not reproducible yet isn't the same as not real: if evidence still points to a problem, defer it with "Monitoring for more evidence" rather than closing it. |
| `regression` | Recommended | Manual: QA or a developer | When it's known to have worked before | Pushes priority up; feeds the prevention review |
| `incident` | Mandatory for P0 in production | Automatic from the incident process, or manual by on-call | When an incident is opened | Links bugs and incidents |
| `ai-drafted` | Mandatory **when it applies** | **Automatic**: the AI tool adds it to every ticket it drafts | When the ticket is created | Honest and reliable, because nobody has to remember it |
| `found-with-ai` | Optional | Manual: the reporter (automatic if an AI tool raised it) | When raised | Shows whether AI-assisted testing finds real bugs |
| `cause-*` | Optional | Manual: the developer who fixed it, or the prevention review | When fixed, or at the monthly review | Learning without a form on every ticket. See the [cause list](playbook.md#10-prevention-learning-from-what-we-fix). |
| `go-live-signoff` | When it applies | Manual: the product owner | On a release or epic that went live with an open urgent bug | Lists the sign-off log, so promised fixes can be checked |
| `customer-reported` | Optional | Automatic, if support is connected to Jira | When raised | Feeds "users affected", and the optional "Where are bugs caught?" panel |

## Two rules that keep labels trustworthy

1. **No labels about people.** Not "caused by", not "dev error", not "AI code" on a single bug. People stop labelling honestly once labels feel like blame. If AI-generated code keeps coming up, raise it at the monthly prevention review as a process cause, for example "AI-generated code merged without enough review".
2. **Mandatory means checked, not enforced.** Triage and the dashboard's "What information is missing?" panel catch gaps. Nothing blocks a ticket, so nobody feels the friction.

## Watch out in JQL

`labels not in (…)` leaves out bugs with **no labels at all**. Always write `(labels is EMPTY OR labels not in (…))`. The full filters for each dashboard panel are in [Jira setup](jira-setup.md).

## What the labels power

| Dashboard panel | Labels used |
|---|---|
| Has the team reviewed them? | `bug-reviewed`, `needs-review` |
| Can we reproduce them? | `reproducible`, `not-reproducible` |
| What causes them? | `cause-*` |
| Is AI helping? | `ai-drafted`, `found-with-ai` |

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
