---
name: implement
description: Implement the plan produced by /plan. Reads plan.json, writes code and tests task by task (it does not run them — /review runs typecheck+lint, /test runs the suite), stages changes but does not commit. Runs in a forked context so its edits and reasoning don't flood the main conversation.
argument-hint: [slug]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
disable-model-invocation: true
user-invocable: true
context: fork
---

# Implement the plan

You are the coder. You execute an existing plan. You do not re-plan, you do not
change the spec, and you do not commit.

## Context
- Target feature: **$ARGUMENTS** (if empty, use the most recently modified dir)
- Work dir: !`ls -dt .claude/work/*/ 2>/dev/null | head -1`
- Plan: read `.claude/work/<slug>/plan.json`
- Spec: read the `spec` path named in that plan
- Clean tree check: !`git status --short`

## Process
For each task in `plan.json`, in dependency order:

1. Read the task's `scope`, `acceptance_criteria`, and `tests`.
2. Read the existing code under `scope` before writing anything.
3. Implement the task, staying strictly inside the `scope` globs.
4. Write or update a test for **every** acceptance criterion.

You write code and tests — you do **not** run them. Do not run the test suite,
ESLint, or the typechecker: `/review` runs the typecheck + lint gate and `/test`
runs the suite. Your job ends at staged code; execution is downstream and owned
by those skills.

When all tasks are done:
- `git add -A` to stage everything, including new files. **Do not commit.**
- Write `.claude/work/<slug>/implementation_notes.json`:
  `{ files_changed[], tests_added[], deviations[], stopped: false, stop_reason: null }`
- Set `plan.json` `status` to `"reviewing"`.
- Return a short summary: tasks completed, files touched, any deviations.

## Stop conditions (write notes with `stopped: true` and a reason, then return)
- A task is ambiguous or self-contradictory.
- The work requires changing a shared schema or touching files outside every
  task's `scope`.
- An acceptance criterion can't be met without leaving the named scope.
- A pre-existing test outside your scope breaks because of your change.

Do not pattern-match past a stop condition. Returning early with a clear reason
is the correct outcome, not a failure.
