<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). Fictional evaluation case. -->
# Evidence given to the skill

- Production logs, last 7 days: about 1 in 30 card payments at checkout times out after 30 seconds (request IDs req-5a1f..., 212 cases).
- Staging: 20 attempts with the same card types and basket sizes, no timeout.
- No recent release to the payments service; the payment provider's status page shows no incident.
- Open bugs: none about payment timeouts.
