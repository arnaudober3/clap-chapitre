---
name: fix
description: Fix an observed defect that is NOT a current test failure — a bug you noticed by hand (visual, layout, wrong copy, misbehavior) while the suite is green, OR the typecheck/lint errors flagged by /review. Reproduces from your description, writes a covering test when the bug is testable (for static errors the compiler/linter is the check — no test written), applies the smallest fix, and re-runs until clean. Use this instead of /debug when nothing is red yet.
argument-hint: "<description of the observed defect>"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
disable-model-invocation: true
user-invocable: true
context: fork
---

# Fix an observed defect

You are the fixer. You are invoked when a human has seen something wrong that
the test suite does not catch — the suite is green but the behavior is off. Your
job is to close the gap between "I can see it" and "a test can see it," then fix
it. You do not commit.

## The defect
> **$ARGUMENTS**

If the defect names typecheck/lint errors (or `$ARGUMENTS` is empty and the work
dir has static findings), treat it as the **static-error class** below — read the
`review_findings.json` entries the `/review` gate wrote, but re-derive the live
error list yourself by running the checks, since findings can be stale after edits.

## Context
- Feature under work: !`ls -dt .claude/work/*/ 2>/dev/null | head -1`
- Plan (for scope + intended behavior): read `plan.json` in that work dir
- Review findings (may include static errors): read `review_findings.json` if present
- Test harness in use: !`cat package.json 2>/dev/null | grep -Ei 'jest|vitest|playwright|cypress|storybook|chromatic' || echo "inspect the repo to determine the runner"`

## Process

**1. Locate.** From the description, find the responsible code. State a one-line
hypothesis of the cause before changing anything. If the description is too vague
to locate the defect with confidence, stop and report what you'd need to know —
do not guess at a plausible target.

**2. Decide testability.** Classify the defect honestly:
   - **Static error (typecheck / lint)** — a `tsc --noEmit` or ESLint error, e.g.
     from `/review`'s gate. The check **is** the reproduction; there is no
     covering test to write. Run `eslint --fix` first to clear the safe
     mechanical set (formatting, import order, unused imports), then re-run
     `tsc --noEmit` and `eslint` to get the real remaining errors. Skip step 2's
     other branches for these.
   - **Testable as logic/DOM/state** (wrong class, missing attribute, bad
     conditional, incorrect text, off-by-one) → write a test that asserts the
     correct behavior. Run it, confirm it is **red**, so you know it actually
     reproduces the bug.
   - **Visual/pixel and a visual-regression harness exists** (Playwright
     screenshots, Cypress, Storybook/Chromatic) → add or update a snapshot /
     screenshot assertion capturing the correct state; confirm it fails first.
   - **Visual/pixel and no such harness exists** → do **not** fabricate a test
     that can't really see the bug. Skip the test, note in the report that the
     fix needs manual visual verification, and suggest (once, briefly) that a
     visual-regression tool would let `/debug` cover this class next time.

**3. Fix.** Apply the smallest change that resolves the defect. Prefer to stay
within the scope of whichever `plan.json` task owns this area. A bug fix may
legitimately fall outside the original decomposition — if it does, keep the
change localized and note it. If the fix balloons beyond a localized change or
requires a shared-schema change, stop: that's a re-plan (`/plan`), not a fix.

For static errors specifically: **never silence a type error to make it pass.**
No `any`, no non-null `!`, no `@ts-ignore`/`eslint-disable` slapped on to quiet
the checker. Fix the actual cause — the missing guard, the wrong type, the
unhandled case. If the only way to satisfy the checker is a genuine design
decision (which shape is right, whether the value can really be null by
contract), that is not a mechanical fix — stop and surface it, don't cast it away.

**4. Verify.** Re-run the relevant checks. For a static-error fix, "green" means
`tsc --noEmit` **and** `eslint` both come back clean on the changed files; loop
fix → re-check at most **3** times, and if errors remain that need a design
decision, stop and surface them rather than forcing them quiet. If you wrote a
test in step 2, confirm it now passes and that nothing else went red. Update
`test_results.json` in the work dir if you ran the suite.

## Finish
- `git add -A`. **Do not commit.**
- Write `.claude/work/<slug>/fix_notes.json`:
  `{ "defect": "...", "hypothesis": "...", "testable": true|false,
     "test_added": "path or null", "files_changed": [...],
     "verified": "test" | "static-check" | "manual-needed", "stopped": false, "stop_reason": null }`
- Report: the cause in one line, the fix, whether it's covered by a test / a
  clean `tsc`+`eslint` run / needs your eyes, and the suggested next step
  (`/review`, then commit).

## Stop conditions (write notes with `stopped: true`, then return)
- The description doesn't pin down the defect well enough to locate it.
- The fix would require a shared-schema change or a broad refactor.
- A type error's only resolution is a design decision or a contract/shared-schema
  change — surface it; do **not** silence it with `any`, `!`, or an ignore
  comment to make the gate pass.
- The "bug" is actually intended behavior that contradicts the spec — flag it
  for `/plan` rather than silently changing it.
