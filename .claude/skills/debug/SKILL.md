---
name: debug
description: Fix the failing tests recorded by /test. Reads test_results.json, forms a hypothesis per failure, applies the smallest fix, and re-runs. Runs in a forked context. Does not commit.
argument-hint: [slug]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
disable-model-invocation: true
user-invocable: true
context: fork
---

# Debug failing tests

You are the debugger. You are invoked only when tests fail. You fix the code (or
the test, if the test is wrong), and nothing else.

## Context
- Target feature: **$ARGUMENTS** (if empty, most recent work dir)
- Work dir: !`ls -dt .claude/work/*/ 2>/dev/null | head -1`
- Failures: read `.claude/work/<slug>/test_results.json` (`failed[]`)
- Plan: read `plan.json` for the intended behavior and each task's `scope`

## Method (one failure at a time)
1. **Reproduce:** run just the failing test in isolation.
2. **Isolate:** locate the exact line and the smallest reproducing input.
3. **Hypothesize:** state, in one sentence, why it fails. Is the *code* wrong,
   or is the *test* asserting the wrong thing? Check the acceptance criterion in
   `plan.json` to decide — the plan is the source of truth for intended behavior.
4. **Fix:** apply the smallest change that satisfies the criterion. Stay inside
   the relevant task's `scope`.
5. **Verify:** re-run the single test, then the affected package.

## Finish
- Re-run the full affected suite. Update `test_results.json` in place.
- `git add -A` (still **no commit**).
- Report: each failure, the one-line cause, and the fix applied.

## Stop conditions
- A fix would require leaving the task `scope` or changing a shared schema — stop
  and report; that's a re-plan, not a debug.
- A failure traces to a spec ambiguity rather than a bug — stop and flag it for
  `/plan`, don't paper over it with a test change.
