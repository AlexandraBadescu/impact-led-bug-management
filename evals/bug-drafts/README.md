<!-- © 2026 Alexandra Badescu. Licensed under CC BY-NC-ND 4.0 (see LICENSE). -->
# Known-answer cases for AI bug drafts

The playbook says: before trusting an AI tool to draft bugs, run it against past cases with agreed answers, and again after every prompt or model change. These are those cases. They're fictional, small, and chosen to include the traps: a duplicate, an intermittent bug, and a report with too little evidence to say anything.

| Case | What it tests | Kind |
|---|---|---|
| 01 Valid, reproducible defect | A real bug becomes a complete draft that passes the checker | Investigation |
| 02 Duplicate | The answer points to the existing bug, with no new draft | Investigation |
| 03 No expected or actual result | The checker sends the draft back | Checker |
| 04 Unsupported impact claim | "Could affect everyone" doesn't beat the matrix | Checker |
| 05 Personal data | The checker catches an email and a phone number | Checker |
| 06 Intermittent defect | Says how often, doesn't claim it was reproduced, asks for evidence | Investigation |
| 07 Incomplete AI draft | No evidence and no "not confirmed": sent back | Checker |
| 08 Too little evidence | Uncertainty and a list of what's missing, not a confident bug | Investigation |

Each case folder has `input.md` (what the tool is given), `case.json` (the expected answer and the rubric) and, for investigation cases, `reference.md`: a hand-written answer that passes, so you can see what "good" looks like.

## Running them

1. Check the checker and the reference answers: `npm run eval`. The tests do this too.
2. To score a real model: run the [bug-investigation skill](../../skills/bug-investigation/SKILL.md) on each investigation case's `input.md`, save each answer as `outputs/<case-id>.md`, then run `npm run eval -- outputs/`. Cases with no output are reported as "not run", never as passed.
3. Score each answer against its rubric by hand (below). Automation can't tell whether evidence really supports a finding.

**What's been done here, honestly:** the checker cases and reference answers are tested. No model output has been scored from this repo, because that needs a model call. Do step 2 before relying on the skill.

## What the automated score checks, and what it can't

It checks the classification in the Finding (the first term from the skill's list that appears), whether a draft was written, the checker's result on the draft, required and forbidden labels, and phrases that must or mustn't appear. It's deliberately literal. A finding like "not a product defect, a duplicate" would be read as "product defect", so keep the finding's first classification the real one, as the skill asks.

It can't judge whether the evidence supports the conclusion, whether the steps would really reproduce the bug, or whether "Suspected" is an honest guess. That's the rubric.

## The rubric

For each investigation answer, a person scores each line in the case's `rubric` as 0 (missing or wrong), 1 (partly) or 2 (clearly done). An answer passes if the automated score passes and no rubric line scores 0. Track the pass rate per case over time; if it drops after a prompt or model change, pause drafting until it's back (playbook, section 11).
