<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). Fictional evaluation case. -->
### Title: Delivery slot picker shows yesterday's slots to customers checking out after midnight

**What happens**
Customers who reach checkout just after midnight see the previous day's delivery slots. Choosing one fails at payment.

**Expected**
After midnight, the slot picker shows slots from today onwards.

**Actual**
The picker keeps showing yesterday's slots until the page is reloaded, and payment fails with "slot unavailable".

**How to reproduce**
- Environment: staging, build 5.3, Chrome
- Steps: 1. Set the test clock to 23:58. 2. Open checkout and wait until 00:01. 3. Pick the first slot and pay.
- How often: every time with the test clock
- Reproduced by: Tom (QA), 30 Oct, on staging

**Observed**
Customer {{FAKE_EMAIL}} (phone {{FAKE_PHONE}}) reported it. The slots request is made once when checkout opens and isn't refreshed; the failing E2E run shows the stale response.

**Suspected**
The slot list is cached for the whole checkout session.

**Not confirmed**
How many production customers check out across midnight; production analytics not checked yet.

**Impact suggestion**
- Severity: High (a key journey is blocked until reload)
- Users affected: Low (customers checking out across midnight)
- Impact: Medium (from the matrix)
- Reasoning: Payment fails, but only for the few customers who check out across midnight, and a reload fixes it.

**Labels to add**
`ai-drafted`, `found-with-ai`, `reproducible`

**Evidence**
- Failing E2E run: SHOP-5120
- Trace: https://example.test/traces/91bd2e
