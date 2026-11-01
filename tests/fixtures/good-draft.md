<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). Fictional example. -->
### Title: Card charged twice when a customer retries after a payment timeout

**What happens**
Customers who retry a payment after a timeout are charged twice. They see one order but two charges.

**Expected**
A retry after a timeout charges the card once and shows one order.

**Actual**
The retry creates a second charge with the same order number.

**How to reproduce**
- Environment: staging, build 4.12, Chrome
- Steps: 1. Add an item to the basket. 2. Pay with the test card that times out. 3. Select "Try again" when the timeout message shows.
- How often: every time on the timeout test card
- Reproduced by: Priya (QA), 31 Oct, on staging

**Observed**
Two payment records with the same order number, 4 seconds apart (trace below).

**Suspected**
The retry doesn't reuse the original request's idempotency key.

**Not confirmed**
How many production customers hit this; production logs not checked yet.

**Impact suggestion**
- Severity: Very high (customers lose money)
- Users affected: Medium (customers who retry after a timeout)
- Impact: Very high (High from the matrix, raised one level: money at risk)
- Reasoning: Money is taken twice, but only for customers who retry after a timeout.

**Labels to add**
`ai-drafted`, `found-with-ai`, `reproducible`

**Evidence**
- Trace: https://example.test/traces/7f3a9c
- Failing test run: SHOP-4821
