---
name: test
description: Run the test suite and report only what matters. Runs in a forked context so verbose test output stays out of the main conversation. Produces test_results.json. On failure, tells you to run /debug.
argument-hint: [slug]
allowed-tools: Read, Bash, Grep, Glob, Write
disable-model-invocation: true
user-invocable: true
context: fork
---

# Run the tests

You are the tester. You run the suite, parse the result, and report a compact
verdict. You do not fix failing tests.

## Context
- Target feature: **$ARGUMENTS** (if empty, most recent work dir)
- Work dir: !`ls -dt .claude/work/*/ 2>/dev/null | head -1`
- Detect the runner: !`cat package.json 2>/dev/null | grep -A5 '"scripts"' || echo "no package.json"`

## Process
1. Detect the test framework (Jest, Vitest, pytest, etc.) from the project config.
2. Run the full suite for the affected packages. Prefer a machine-readable
   reporter if one is available (e.g. `--reporter=json`, `--json`).
3. Parse results into `.claude/work/<slug>/test_results.json`:

```json
{ "command": "npm test", "passed": 118,
  "failed": [{ "name": "toggleTheme flips light<->dark",
               "file": "src/theme/theme.test.ts",
               "message": "expected 'dark' got 'light'" }],
  "all_green": false }
```

4. Report inline: total passed, and the failing test names only — not the full
   dump. That's what the forked context is for.

## Handoff
- If `all_green` is true: say so and stop. Ready to commit.
- If there are failures: **do not fix them.** End with:
  "N tests failing. Run `/debug $ARGUMENTS` to fix." The main thread stays the
  orchestrator; it decides when to spawn the debugger.
