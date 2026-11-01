<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). Fictional evaluation case. -->
### Finding
Product defect, intermittent and not reproduced yet: about 1 in 30 production card payments time out, but 20 attempts on staging didn't reproduce it.

### Evidence
- Production logs, last 7 days: 212 timeouts (request IDs from req-5a1f).

### Likely affected area
Checkout, card payment call to the provider.

### Regression risk
High: a timeout followed by a retry could charge twice.

### Recommended checks
Add timing logs around the provider call; compare timed-out requests by card type, basket size and time of day.

### Missing information
Whether timeouts cluster by time of day or card type.

### Bug draft
### Title: Card payments sometimes time out at checkout in production

**What happens**
About 1 in 30 card payments at checkout time out after 30 seconds. The customer sees an error and may retry.

**Expected**
A card payment completes or fails within a few seconds.

**Actual**
Some payments wait 30 seconds and then fail with a timeout.

**How to reproduce**
- Environment: production only so far
- Steps: 1. Add items to the basket. 2. Pay by card at checkout. 3. Watch for a timeout.
- How often: sometimes, about 1 in 30 in production logs; not reproduced in 20 attempts on staging

**Observed**
212 timeouts in production in 7 days, from the logs.

**Not confirmed**
Not reproduced on demand yet; the cause and whether retries charge twice are unknown.

**Impact suggestion**
- Severity: High (payment fails, with a retry risk)
- Users affected: Medium (about 3% of card payments)
- Impact: High (from the matrix)
- Reasoning: Payment fails for about 3% of card payments, from production logs; the retry risk is unconfirmed.

**Labels to add**
`ai-drafted`, `not-reproducible`

**Evidence**
- Production logs: request ID req-5a1f2c and 211 others, last 7 days
