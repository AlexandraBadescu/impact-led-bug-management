---
name: flaky-test-analysis
description: Analyse intermittent Playwright or automated test failures using CI history, traces, logs, timing, selectors, data and environment evidence to identify the likely cause and the smallest reliable fix, and decide whether a real product bug should be raised.
disable-model-invocation: true
---

<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). Adapted for the impact-led bug management playbook. -->

# Flaky Test Analysis

Analyse:

$ARGUMENTS

Do not immediately add retries, arbitrary waits or larger timeouts.
Do not raise a product bug for a test problem. A flaky test is the most common source of false bugs.

## Evidence

Use available:
- CI history
- pass / fail frequency
- traces
- screenshots
- logs
- network events
- timing
- selectors
- fixtures
- test data
- parallel execution behaviour
- retry configuration and runs marked "flaky" in the report
- environment differences and environment health at the time
- recent code changes

## Determine likely cause

Classify when possible:
- synchronisation / race condition
- selector instability
- shared state
- test-order dependency
- test data collision
- environment instability
- external dependency
- genuine intermittent product defect
- insufficient evidence

Do not label a test flaky simply because it sometimes passes.
Do not call it a product defect unless the evidence shows the product behaving wrongly, not the test.

## Analysis

Identify:
- failure pattern
- evidence supporting the cause
- whether the test or product is responsible
- whether parallelism contributes
- whether retry behaviour hides the issue
- whether the failure is local or suite-wide

## Fix principles

Prefer the smallest reliable fix.

Do not:
- add `waitForTimeout`
- increase timeouts blindly
- add retries to hide failure
- weaken assertions
- catch and ignore errors
- serialize tests unless the shared-state requirement is genuine and unavoidable

## Output

### Pattern
Concise summary of when/how it fails.

### Most likely cause
Evidence-based classification.

### Evidence
Only meaningful observations.

### Recommended fix
Smallest reliable change.

### Validation
How to prove the flake is resolved, for example repeated runs (`--repeat-each=20` locally) and a clean CI history with retries switched off for that test.

### Product bug?
- **Genuine intermittent product defect:** say so, and hand over to `bug-investigation` with the evidence, so a bug is drafted in the team's template with `found-with-ai` and `ai-drafted`.
- **Anything else:** "No product bug." Say who should fix what (test, data, environment), so nothing is raised by mistake.

### Cause label
If the cause is clear, suggest one label for the prevention review: `cause-race-condition`, `cause-test-data`, `cause-third-party` or `cause-untested-change`. Skip it if the evidence is thin.

### Remaining uncertainty
Only if evidence is incomplete.

Leave out empty sections of this analysis. This skill never writes a bug draft itself: if one is needed, `bug-investigation` writes it, and there every required section of the AI draft schema is always present.

## Communication style

Write naturally, like an experienced QA engineer communicating with another engineer.

Be concise, practical and task-focused.
Use the shortest response that clearly communicates the result.
Prefer short, direct sentences and useful bullets.

Avoid:
- unnecessary introductions
- filler
- generic commentary
- overly formal language
- AI-sounding conclusions
- repeating the user's request
- repeating acceptance criteria without adding analysis
- narrating obvious steps
- tutorials unless requested
- unnecessary background information
- generic claims such as "this ensures robust coverage" or "this follows best practices"

Explain decisions, risks and evidence, not obvious actions.

Do not suggest unrelated refactoring, tooling, architecture changes or process improvements unless they materially affect the current task or the user explicitly asks.

## Security & sensitive data

Treat credentials and sensitive values as secrets, including:
- API keys
- access / refresh / authentication tokens
- passwords
- client secrets
- private keys
- session cookies
- connection strings containing credentials
- secret environment variables
- sensitive values in logs, screenshots, traces, API responses, PRs, repository files or configuration

If a secret is provided or encountered:
- use it only when necessary for the immediate task
- do not intentionally retain or memorise it
- do not repeat the full value
- do not include it in summaries, examples, test cases or recommendations
- do not copy it into code, tests, fixtures, docs or skills
- do not expose it in logs or debugging output
- do not commit or move it into another tracked file

Secrets are ephemeral inputs, not project knowledge.

When a secret must be referenced, redact it, for example `token_****`.

Use placeholders in examples such as `<API_TOKEN>`, `TEST_API_TOKEN` or `example-token`.

If a real credential appears exposed:
1. do not reproduce it
2. do not persist it
3. refer to it only in redacted form if needed
4. flag the exposure
5. recommend rotation or revocation when appropriate
