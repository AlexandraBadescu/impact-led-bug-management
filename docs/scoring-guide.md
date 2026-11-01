# Scoring guide: how to score a bug's impact

Two questions: how bad is it for the people who hit it, and how many people hit it? Read the impact from the table, adjust it if safety, legal exposure or money is involved, and write one sentence saying why. Most bugs take under a minute. Then use the score as a starting point for priority, not the answer (see [using the score](#using-the-score-a-worked-prioritisation)).

## Step 1. Severity: how bad is it for the people affected?

| Level | Meaning | Ask yourself |
|---|---|---|
| **Very high** | A core journey is impossible, money or data is lost or exposed, or there's a safety or compliance risk with no workaround | Could someone lose money, data or safety, or be unable to do the main thing they came for? |
| **High** | A major function is broken or a key journey is blocked, including for people using assistive technology (for example, a WCAG 2.2 AA failure on checkout) | Is an important task blocked for the people affected? |
| **Medium** | Something is degraded or awkward, usually with a workaround | Can they still get it done, with some pain? |
| **Low** | Cosmetic; nothing stops working | Would most people notice, and would it matter if they did? |

**Workaround rule:** a safe, reasonable workaround caps severity at **Medium**, unless safety or compliance is involved. "Call support" is only a workaround if support can actually do it, quickly.

## Step 2. Users affected: how many people run into it?

| Level | Share of users | Typical examples |
|---|---|---|
| **Very large** | Over 25%, or everyone | Every customer at checkout; all mobile users |
| **Large** | 10 to 25%, or most people on one key journey | Everyone who uses saved cards; all new sign-ups |
| **Medium** | 1 to 10%, or one group | One browser; one market; business accounts |
| **Low** | Under 1%, a rare setup | Very large orders; an old device; a rare data shape |

Use evidence where you have it: analytics, support tickets, monitoring, logs. If you're guessing, say so in the reasoning, and re-score when you know more.

## Step 3. Read the impact

| Severity ↓ / Users → | Low | Medium | Large | Very large |
|---|---|---|---|---|
| **Very high** | Medium | High | Very high | Very high |
| **High** | Medium | High | High | Very high |
| **Medium** | Low | Low | Medium | Medium |
| **Low** | Low | Low | Low | Medium |

## Step 4. Adjust if needed, and say why

- **Raise one level** for safety, legal or regulatory exposure (data protection, consent, accessibility on a key journey), money at risk, or a critical group of users. Never more than one level. For accessibility, look at the journey: a keyboard trap at payment can block a purchase outright, while a contrast issue on a rarely used page usually can't. Not every WCAG failure carries the same legal or practical weight.
- Write one sentence of **impact reasoning** on the ticket. It's what lets someone else check your score, and it makes re-scoring easy.

## Worked examples

All from the fictional demo data. They show how the model handles different kinds of risk.

| Bug | Severity | Users | Matrix | Adjusted | Reasoning |
|---|---|---|---|---|---|
| Card charged twice when a customer retries after a payment timeout | Very high | Medium | High | **Very high** | Customers lose money. Only those who retry after a timeout, but money at risk raises it one level. |
| Identity check shows "passed" before the check has run | Very high | Large | Very high | **Very high** | Compliance: customers are treated as verified when they aren't. Affects all new sign-ups during the window. Already at the top level. |
| Allergen information missing from delivery notes for chilled items | Very high | Low | Medium | **High** | Safety risk for a small group of orders, so raised one level. |
| Keyboard focus jumps to the top of the payment form after a validation error | High | Low | Medium | **High** | Keyboard and screen reader users can't recover from an error at payment, a key journey with no workaround on the page. Raised one level for accessibility on checkout. |
| New-customer promo code makes referral credit impossible to redeem | High | Large | High | **High** (no change) | Every referred new customer loses a promised credit. No workaround at checkout. |
| Identity check stays "pending" after the document upload completes | High | Large | High | Re-scored to **Medium** after mitigation | A job now re-runs stuck checks every 15 minutes, so the harm is a delay, not a block. The mitigation reduces the risk rather than removing it. Structural fix planned as tech debt. |
| VAT line missing from receipts for business accounts | High | Low | Medium | **High**, re-scored to **Medium** after mitigation | Raised for regulatory exposure. Finance now sends corrected receipts, but that relies on a manual step, so it's reviewed more often than a mitigation that removes the risk. |
| Gift card balance ignored when combined with a promo code | Medium | Medium | Low | **Low** (no change) | Support applies the balance manually, and only customers using both at once are affected. |
| Tracking timeline shows events an hour apart after the clocks change | Low | Large | Low | **Low** (no change) | Confusing, but nothing is wrong with the order. |

**Notice:** the same severity can lead to different impact, and the adjustments matter. Compliance and money push things up. A good mitigation brings them down.

## Using the score: a worked prioritisation

The score tells you how much harm a bug does. It doesn't tell you what to do first. Here are three open bugs from the demo data, all scored **High**, competing for the same developers this sprint:

| | BUG-140: order status stuck on "Packed" | BUG-110: declined-card message not announced by screen readers | BUG-148: substitutions not shown before payment |
|---|---|---|---|
| Impact | High (High severity, Large reach) | High (High severity, Low reach, raised for accessibility at payment) | High (High severity, Large reach) |
| Evidence | Monitoring and support contacts; may share a cause with BUG-141 (courier webhooks not retried), already in progress | Accessibility suite; reproducible every time | Support tickets; reproducible |
| Cost of waiting | Support contacts continue, but orders still arrive | Screen reader users can't tell why payment failed, so they abandon or call | Refunds for rejected substitutions; trust |
| Mitigation available? | Possibly: BUG-141's fix | None on the page | A substitution summary in the confirmation email |
| Effort | Unknown until BUG-141 lands | Small: one live region | Large: a checkout design change |
| Other factors | | | Past 90 days, so already escalated to leadership |

**What the team decided, and the alternatives it turned down**

1. **Finish BUG-141 first, then re-test BUG-140 before starting it.** Starting BUG-140 now was rejected: if both share a cause, it duplicates work.
2. **Fix BUG-110 this sprint.** It's small, has no workaround and blocks a payment journey. Waiting for "bigger" bugs first was rejected, because its low reach doesn't make the harm smaller for the people it hits.
3. **Take two options for BUG-148 to leadership:** mitigate now with the email summary and fix next milestone, or accept the risk until the checkout redesign. Fixing it now was rejected because it would displace the whole sprint, and it needs a product decision on how substitutions are shown.

None of this changed an impact score. It changed the order, and the reasons are written on each ticket. That's the line to hold: scores stay about harm, and priority carries the trade-offs.

## Bringing in the money, without pretending to know it to the penny

Impact scores harm to users. The business consequences of a bug are a separate question, and the product owner usually knows them best. Five come up again and again:

- **Revenue exposure:** sales lost while the bug is open, such as a payment method that fails or a promotion that can't be redeemed.
- **Refunds and compensation:** money going back out, like refunds for substitutions customers didn't agree to.
- **Support cost:** contacts the bug generates, and the manual workarounds support carries.
- **Cost of delay:** how those costs grow the longer we wait. A seasonal peak or a campaign can turn a quiet bug into an expensive one in a week.
- **Contractual and regulatory obligations:** a service level owed to a business customer, or a rule like VAT on receipts. These often aren't about the amount at all; they're either met or they're not.

Use real figures where the team has them: finance for refunds, support for contact volume, analytics for drop-off. Where it doesn't, a rough range is fine, as long as it's labelled as an estimate and says where it came from. For example, for BUG-148:

> **Illustrative assumptions, not data:** around 30 to 50 rejected substitutions a week, at an average refund of £5 to £8, so roughly £150 to £400 a week in refunds, plus the support contacts. The demo data contains none of these figures.

A range like that is good enough to compare options: an email summary that mitigates the bug this week costs a day's work, against a few hundred pounds a week until the checkout redesign. It isn't good enough to put on a dashboard as if it were measured, which is why the dashboard doesn't show money at all. The figure belongs on the ticket, next to the decision it informed, with its assumptions.

## When to score again

- After a **mitigation** (feature flag, fallback, guard, workaround): record the date and re-score.
- When the **workaround stops working**.
- When **support volume** or **monitoring** shows more people are affected than we thought.
- When **usage changes**: a new market, a campaign, a seasonal peak.
- At every **review date**, quickly: is the score still right?

## Common mistakes

| Mistake | Instead |
|---|---|
| Scoring by how hard it is to fix | Score harm to users. Effort goes into planning, not the score. |
| Scoring everything Medium to be safe | Use the questions in step 1. If it's truly unclear, say so in the reasoning and re-score at triage. |
| Raising two levels because it feels serious | One level, with a reason. If it's still not high enough, check the severity again. |
| Counting a workaround nobody knows about | A workaround only counts if users or support can actually use it. |
| Never re-scoring after a mitigation | Weighted exposure then overstates the risk, and the team gets no credit for protecting users. |

## Calibration: making sure we score the same way

Once a month, during triage, three or four people score the same five recent bugs on their own, then compare.

- **Same score, or one level apart:** fine.
- **Two levels apart:** talk it through, agree, and add the bug to the worked examples above if it teaches something.
- Track the share of bugs where everyone agreed. If it drops, the guide needs clearer examples.

The same set of agreed examples is used to check AI-suggested scores (see [playbook, section 11](playbook.md#11-using-ai-with-a-human-in-charge)).

---

© 2026 Alexandra Badescu. Licensed under [CC BY-NC-ND 4.0](../LICENSE).
