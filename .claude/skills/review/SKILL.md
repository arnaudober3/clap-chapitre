---
name: review
description: Review the staged (uncommitted) implementation against the plan and a correctness checklist, and run a typecheck + lint gate on the changed files. Runs in the main context so you can read and argue with the findings. Produces review_findings.json.
argument-hint: [slug]
allowed-tools: Read, Bash, Grep, Glob, Write
disable-model-invocation: true
user-invocable: true
---

# Review the implementation

You are the reviewer. You read the staged diff and the plan, and you report
problems. You do not fix anything.

## Context
- Target feature: **$ARGUMENTS** (if empty, most recent work dir)
- Work dir: !`ls -dt .claude/work/*/ 2>/dev/null | head -1`
- Staged diff: !`git diff --staged`
- Files changed: !`git diff --staged --name-only`
- Plan + notes: read `plan.json` and `implementation_notes.json` in the work dir

## Procedure
1. **Static gate — typecheck and lint.** Before reading anything by hand, run the
   mechanical checks on the changed files and fold the results into the findings.
   Detect the commands from the project the way `/test` detects its runner:
   - **Typecheck:** prefer a project script (`npm run typecheck`), else
     `npx tsc --noEmit` against the tsconfig nearest the changed files (run it per
     affected package in a monorepo, not just at the root).
   - **Lint:** `npx eslint <changed files>` — the files from
     `!`git diff --staged --name-only`` — or the project's lint script scoped to
     them.
   Turn each result into a finding: a **type error → critical** (it doesn't
   compile), a **lint error → major**, a **lint warning → minor**. Report counts,
   not the raw dump. Errors in files this change didn't touch are probably
   pre-existing — note them as context and say if the change plausibly caused
   them, but don't blame the change by default.
2. Confirm the diff actually implements the plan: every task's acceptance
   criteria are addressed, and nothing landed outside the tasks' declared
   `scope`. Flag scope creep as a finding.
3. Walk every changed file against this checklist:
   - null / undefined guards
   - empty array / empty string cases
   - async functions missing a catch
   - DB queries with N+1 likelihood
   - user input: escaping / validation
   - permissions: caller identity checked
   - logs: no sensitive data
   - tests present for each acceptance criterion, and they actually assert behavior
4. Read `implementation_notes.json` `deviations[]` — each deviation needs a
   defensible reason or becomes a finding.

## Output
Write `.claude/work/<slug>/review_findings.json`:

```json
[{ "severity": "critical|major|minor", "file": "src/x.ts", "line": 42,
   "description": "TypeError when u.email is null",
   "suggested_fix": "guard: u.email?.includes('@')" }]
```

Then summarize inline: counts by severity, and whether this is safe to test /
commit. **If the typecheck didn't pass, it is not safe to test regardless of the
rest** — say so plainly. If there are zero findings, say so explicitly — don't
invent nits.
