# Bug template

Every bug is written the same way, so anyone can understand it, reproduce it and score it. The reporter fills in the top part; triage and closure add the rest. AI-drafted bugs use the same template with a few extra sections, set out [below](#ai-drafted-bugs-the-same-template-with-four-changes).

## For the reporter

```markdown
### Title: what's wrong, from the user's point of view, in one line
Example: "Card charged twice when a customer retries after a payment timeout"
Not: "Payment bug" or "PaymentService NPE"

**What happens**
One or two plain sentences: what the problem is and who notices it.

**Expected**
What should happen.

**Actual**
What happens instead.

**How to reproduce**
- Environment: dev / staging / production, version or build
- Device, browser, screen size, locale, account type, if they matter
- Steps: 1. … 2. … 3. …
- How often: every time / sometimes (roughly how often) / once

**Evidence**
Screenshots, a short video, logs, request IDs, links to support tickets or alerts.
Remove customer personal data first.

**Impact (your best guess; triage confirms it)**
- Severity: Very high / High / Medium / Low, and whether there's a safe workaround
- Users affected: Very large / Large / Medium / Low, and who
- Reasoning: one sentence

**Found by (optional)**
Automated test (which suite) / exploratory testing / customer support /
monitoring / developer / other

**Notes (optional)**
- Suspected cause, only if you know one. Most reporters won't, and that's fine.
- Suggested fix or mitigation
```

All labels, and which are mandatory, are in the [labels guide](labels-guide.md).

## AI-drafted bugs: the same template, with four changes

An AI tool that drafts a bug (see the [bug-investigation skill](../skills/bug-investigation/SKILL.md)) uses this template with four changes, so a person can see at a glance what's evidence and what's a guess. This is the one schema: the skill writes it, [`tools/check-bug-draft.js`](../tools/check-bug-draft.js) checks it, and a test makes sure all three list the same sections.

| Human template | AI draft | Why |
|---|---|---|
| Impact (your best guess) | **Impact suggestion**, with Severity, Users affected, Impact and Reasoning lines | Triage confirms it; the checker tests it against the matrix |
| Notes: suspected cause | **Suspected** (optional) | A guess, kept apart from what was observed |
| | **Observed** (required) | Only what the evidence shows |
| | **Not confirmed** (required) | What the AI couldn't check. "Nothing: …" with what was checked, if everything was |
| Found by | **Labels to add** (required): `ai-drafted` always, `found-with-ai` if it found the problem | The labels the person adds at intake |

Required sections, in order: What happens, Expected, Actual, How to reproduce, Observed, Not confirmed, Impact suggestion, Labels to add, Evidence. Optional: Suspected. The checker rejects a missing required section and any heading that isn't in this list, including the human template's "Impact", so a draft can't quietly drift from the schema.

The checker's privacy rules catch obvious emails, phone numbers, long card-like numbers and tokens. They're a basic safeguard, not a guarantee, so the person who accepts the draft still reads it for personal data.

## Added at triage

| Field | Required | Notes |
|---|---|---|
| Impact | Yes | From the [scoring guide](scoring-guide.md). Includes "raised one level because…" when used. |
| Impact reasoning | Yes | One sentence. |
| Priority | Yes | P0 to P3, agreed by QA, a developer and the product owner. Starts from impact; write the reason if it differs. |
| Team | Yes | Always accountable. |
| Owner | Automatic | The team whose board the bug is raised on. Always set, so it's never missing. |
| Assignee | When work starts | The developer who picks it up. P0 emergencies get one straight away. |
| Next review date | Yes | From the impact: daily, weekly, monthly or quarterly. |
| Area | Yes | Product area, for hotspots. |
| Reviewed | Automatic | Label `bug-reviewed`, added when triage is complete. |
| Reproducible | Yes | Label `reproducible` or `not-reproducible`, after a real attempt. |
| Found in | Optional | Development, staging or production. Only needed for the optional "Where are bugs caught?" panel. |
| Linked initiative or milestone | If known | Lets milestone exit checks find it. |

## Added when deferring

| Field | Required |
|---|---|
| Deferral reason | Yes. One choice from a short dropdown: needs a bigger change (tech debt), lower priority than the roadmap, planned with other work, workaround in place, waiting on another team or supplier, monitoring for more evidence, risk accepted (no fix planned) |
| Review date | Yes |
| Workaround | If there is one, with how much it protects users: removes the risk, reduces it, or relies on a manual step |

A reason and a review date are both required, because together they make a deferral a decision: we know why we're not fixing it now, and someone will look again. A deferral without a reason is just postponement. It's one dropdown and one date on the transition screen, so it takes seconds. The team's product owner makes the call; for a High or Very high risk accepted with no fix planned, leadership does.

## Added when closing

| Field | When |
|---|---|
| Resolution | Always: fixed, duplicate, not reproducible, or risk accepted. Risk accepted is only for Low and Medium; a High or Very high risk that's accepted stays open as a deferral, so it stays visible |
| Cause label | Optional. One `cause-` label if the cause is known (see the [playbook](playbook.md#10-prevention-learning-from-what-we-fix)). Usually added by the developer who fixed it, or at the monthly prevention review. |
| Linked pull request | When fixed. It shows the fix and the test or check that came with it. |
| Closure reason | When closed without a fix: what was tried, or who accepted the risk, why, and what would make us look again |
| Mitigated date | If users were protected before the fix |

## A good bug, and a weak one

| Weak | Good |
|---|---|
| "Checkout broken" | "Card charged twice when a customer retries after a payment timeout" |
| "Doesn't work on mobile" | "3-D Secure challenge loops back to checkout on iOS Safari 17 (staging, build 4.12)" |
| "Seems slow" | "Checkout takes over 8 seconds for baskets with 30+ items (production, p95 from monitoring)" |
| No impact | "High severity, Medium users: customers who retry after a timeout. Raised one level: money at risk." |

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
