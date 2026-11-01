---
name: bug-investigation
description: Investigate unexpected product behaviour using requirements, UI evidence, API responses, logs, code and data to find the most likely cause and affected area, and only then draft a bug in the team's template, with an impact suggestion for people to confirm at triage.
disable-model-invocation: true
---

<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). Adapted for the impact-led bug management playbook. -->

# Bug Investigation

Investigate:

$ARGUMENTS

Do not immediately assume the issue is a product defect.
Do not modify code unless explicitly asked.
Do not raise, score, prioritise, defer or close anything. You suggest; people decide at triage.

## Goal

Determine:
- what is happening
- what should happen
- whether the behaviour is reproducible, and how you know
- where the failure most likely originates
- what evidence supports that conclusion
- what related areas may be affected
- whether this is a product bug at all

## Evidence

Use relevant available evidence:
- ticket / acceptance criteria
- screenshots / videos
- browser console
- network requests
- API responses
- logs
- repository code
- database state
- feature flags
- environment information
- existing tests
- recent PRs or changes
- open bugs, to check for duplicates

Correlate evidence across layers.
No evidence, no bug: every claim in a draft must point to something a person can open.

## Investigation flow

1. Confirm expected behaviour from requirements, flags or existing product behaviour.
2. Search open bugs for the same symptom. If one matches, stop and suggest a comment on it instead.
3. Reproduce the smallest reliable scenario when possible.
4. Identify where actual behaviour diverges.
5. Trace the request / state change through relevant layers.
6. Compare UI state, API behaviour, persistence and downstream effects.
7. Identify whether the issue is isolated or shared.
8. Classify the likely cause.

## Classification

Use one of:
- product defect
- automation defect
- test data issue
- environment issue
- configuration issue
- requirement ambiguity
- expected behaviour
- duplicate of an open bug
- unknown

Do not force a classification if evidence is insufficient.

**Only a product defect becomes a bug draft.** For anything else, say what should happen instead: fix the test (see `flaky-test-analysis`), fix the data or environment, ask Product to clarify the requirement, or add to the existing bug. This is the main guard against false bugs.

## Regression impact

Identify related existing behaviour that could be affected by the same cause.
Only include evidence-based impact.

## Output

### Finding
One concise conclusion, including the classification.

### Evidence
Only the evidence that materially supports the conclusion, with links or IDs.

### Likely affected area
Component, service, workflow or layer most likely involved.

### Regression risk
High / Medium / Low with a short reason.

### Recommended checks
Focused checks that would confirm scope or guard against regression.

### Missing information
Only if needed to reach a stronger conclusion.

### Bug draft
Only for a product defect. Use the AI draft schema from the team's bug template (`docs/bug-template.md`): these sections, as bold headings, in this order. `tools/check-bug-draft.js` checks the same list.

- **Title** (as `### Title: …`) from the user's point of view: what fails, when, for whom. One line. No internal class or service names.
- **What happens:** one or two plain sentences that product, QA and developers all understand.
- **Expected** and **Actual**, kept separate.
- **How to reproduce:** environment, numbered steps, how often. Add "Reproduced by: …" only if someone actually did.
- **Observed:** what the evidence shows, and nothing else.
- **Suspected** (optional): a likely cause, clearly a guess. Leave this section out if you have no suspicion.
- **Not confirmed:** what you couldn't check, for example "steps not run by a person yet" or "number of users affected unknown". Always present: if everything was checked, write "Nothing: " and what was checked.
- **Impact suggestion:** severity and users affected from the scoring guide, the resulting impact, any one-level raise with its reason, and one sentence of reasoning. Mark it as a suggestion for triage.
- **Labels to add:** `ai-drafted` always; `found-with-ai` if you found the problem; `reproducible` only if it was actually reproduced, saying by whom and how; `not-reproducible` only after a real attempt; a `cause-` label only if the evidence shows the cause. Never `bug-reviewed`: that's added when the team reviews it.
- **Evidence:** links or IDs a person can open, with customer personal data removed.

Every section except Suspected is required, so don't leave any out, even when it's short. Run the draft through `node tools/check-bug-draft.js` before handing it over. Its privacy checks only catch obvious personal data and secrets, so still read the draft yourself.

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

Treat customer personal data the same way: names, emails, phone numbers, addresses, card or account details, document images. Never put them in a bug draft; describe the case instead ("a customer with a business account").

If a secret is provided or encountered:
- use it only when necessary for the immediate task
- do not intentionally retain or memorise it
- do not repeat the full value
- do not include it in summaries, examples, test cases, recommendations or bug drafts
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
