<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). Fictional evaluation case. -->
# Evidence given to the skill

- Nightly E2E run SHOP-5120 failed: `checkout-slots.spec.ts` "slot chosen after midnight can be paid for".
- Trace https://example.test/traces/91bd2e: one `GET /slots` when checkout opens, none after the clock passes midnight; payment returns 409 "slot unavailable".
- The test passed on the two previous nights and fails every run since build 5.3 (three runs).
- Acceptance criteria for slots: "the picker only offers slots that can still be booked".
- Open bugs: none mention delivery slots after midnight.
