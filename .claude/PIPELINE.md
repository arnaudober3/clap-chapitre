# Spec-driven pipeline

Stages, each invoked explicitly as a slash command. Every stage reads the
previous stage's artifact and writes the next. The artifacts are the contract —
the "baton" passed between stages. If a stage can't produce its artifact, it
stops and reports rather than guessing.

## `/decompose` — split one ticket into subtasks, before planning

`/decompose <ID>` takes one raw tracker ticket and splits it into small,
contract-first subtasks, writing `decomposition.json`, posting the breakdown
back to the issue as a comment (the same way `/plan` posts user stories), and
printing the dependency graph. It matches the ticket against a small recipe
library (new page, new field, new endpoint, module, bug tiers) and a
migration-risk rule, fixing each subtask's **seam** — the data contract — up
front so the subtask can later be planned in isolation. It plans nothing and
writes no code.

The split stands as written unless you edit `decomposition.json` or ask for a
revision — there's no explicit approval step. Then `/plan <slug>` runs **once per
subtask**, each seeded from its decomposition entry, and `/ship <slug>` drives
that subtask through the rest of the loop — so every downstream `/plan →
/implement → /review → /test` pass carries only that subtask's narrow context.
You run one slug at a time for now; parallel execution across worktrees, with a
summary at the end and at the wobbly steps, is a later addition once the
sequential flow is trusted.

Novel, multi-feature, or destructive tickets are handed back with
`needs_human_review` set rather than force-split — the correct outcome, not a
failure. Small tickets that don't need splitting can skip straight to `/plan`.

## Stages

| Command       | Runs in        | Reads                          | Writes                         |
|---------------|----------------|--------------------------------|--------------------------------|
| `/decompose <ID>` | main context | tracker ticket `<ID>` (Jira or Linear) | `.claude/work/<ID>/decomposition.json`, comment on the issue, printed graph |
| `/plan <slug>`| main context   | one subtask from `decomposition.json` (or a raw ticket), codebase | `specs/<slug>.md`, `plan.json` |
| `/implement`  | forked subagent| `plan.json`, `specs/<slug>.md` | code (staged, **not** committed), `implementation_notes.json` |
| `/review`     | main context   | staged diff, `plan.json`, notes| `review_findings.json`         |
| `/test`       | forked subagent| repo                           | `test_results.json`            |
| `/debug`      | forked subagent| `test_results.json`, code      | code fixes, updates `test_results.json` |
| `/fix "<desc>"`| forked subagent| your description, code, `plan.json` | covering test (when testable) + fix, `fix_notes.json` |

**`/debug` vs `/fix`:** `/debug` acts only on tests that are already red — it
reads `failed[]` from `test_results.json`. `/fix` is for a defect you spotted by
hand while the suite is green (most visual/layout bugs). It turns the bug into a
failing test first when that's possible, then fixes; when the bug isn't
mechanically testable, it fixes from your description and flags that it needs
manual verification. If it isn't red yet, reach for `/fix`, not `/debug`.

## `/ship` — the supervised wrapper

`/ship <ID>` runs all of the above in order — plan → implement → review → test →
debug — plus a final **Verify** gate where you eyeball the result and any defect
you describe gets routed through `/fix`, then re-tested. It stops for your
approval between every stage, commits nothing, and prints the commit command at
the end. It runs in the main context (that's the only place approval gates and
the visual check work), follows each stage's `SKILL.md` as instructions rather
than invoking it via the Skill tool (which `disable-model-invocation` blocks),
and delegates the forked stages to the Agent tool so their output stays out of
your window. Every stage still works standalone.

Run each stage yourself, in order. Every stage reads the previous stage's
artifact off disk (and git), so you can stop, inspect, and re-run any stage
without losing work.

All artifacts live under `.claude/work/<slug>/`. The `<slug>` (e.g.
`ENG-123-dark-mode`) ties one feature's artifacts together. Downstream stages
default to the most recently modified work dir if no slug is passed.

## Rules every stage honors

1. **Stay in scope.** Each task in `plan.json` names the files it may touch.
   Writes outside that scope mean stop and report, not "seems related."
2. **Don't commit.** The coder stages changes (`git add -A`) but never commits.
   You commit by hand after `/review` and `/test` pass. This keeps the human as
   the merge gate.
3. **Tests are not optional.** Every acceptance criterion in `plan.json` gets at
   least one test.
4. **Stop on ambiguity or shared-schema changes.** Don't pattern-match a
   plausible interpretation; return control instead.

## Artifact shapes

- `plan.json` — see `.claude/templates/plan.schema.json`
- `implementation_notes.json` — `{ files_changed[], tests_added[], deviations[], stopped: bool, stop_reason }`
- `review_findings.json` — `[{ severity: "critical|major|minor", file, line, description, suggested_fix }]`
- `test_results.json` — `{ command, passed: int, failed: [{ name, file, message }], all_green: bool }`
