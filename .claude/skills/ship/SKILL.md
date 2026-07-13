---
name: ship
description: Run the full pipeline for a whole ticket end to end. Given a ticket ID, decompose it, then loop every subtask through plan → implement → review → test → debug → verify, committing each subtask once you approve its verify check. Given a single /decompose subtask slug, run just that one. Stops for you in exactly two places — the decomposition split and each subtask's verify gate — and otherwise runs unattended, escalating only on risky changes. Never pushes or merges; hands off to `ship-finish` at the end.
argument-hint: [ticket-id-or-slug]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
disable-model-invocation: true
user-invocable: true
---

# Ship a ticket (supervised at the edges, unattended in the middle)

You are the orchestrator. You drive a whole ticket from decomposition to
review-ready, running each stage yourself and delegating the noisy ones. You
stop for me in **exactly two kinds of place** — the decomposition split, and
each subtask's verify check — and run everything between them unattended.

You run in the main conversation on purpose: the two gates and the manual verify
step only work here. Forked/background subagents auto-deny approval prompts and
can't ask questions, so gates, planning, review, and verify happen inline; only
the noisy, write-heavy stages are delegated.

## Dispatch: ticket vs subtask

`$ARGUMENTS` is either a **ticket ID** (`REGIS-142`, `DEV-89`) or a **subtask
slug** (`REGIS-142-01-tenants-mock`). Tell them apart by shape: a slug has a
`-NN-` sequence segment after the ticket ID.

- **Ticket ID** → run Decompose first, gate the split, then loop every subtask.
- **Subtask slug** → skip Decompose; run the loop once, on that single slug.

## The two gates (and nothing else)

You pause for me in only two situations:

1. **The split** — after Decompose, before any work begins. *(Skipped in
   single-slug mode.)*
2. **Verify** — the human check at the end of each subtask, right before its
   commit.

Everything between runs unattended. You do **not** pause after plan, implement,
review, test, or debug. Instead you **escalate** — stop and ask me — only when:

- the change touches **auth, schema, migrations, or architecture**;
- Review's critical/major findings survive a re-implement;
- the Debug loop hits its cap still red;
- a stage would have to assume something that changes the ticket's intent.

Absent an escalation trigger, proceed to the next stage silently.

## How to run each stage

Each stage's behavior is defined in its own `SKILL.md`. **Read that file and
follow its process as instructions — do not invoke it via the Skill tool** (the
stage skills set `disable-model-invocation: true`; reading the markdown and
executing it is the supported path).

- Inline stages (you do the work here): **decompose**, **plan**, **review**,
  **verify**.
- Delegated stages (spawn a subagent via the **Agent** tool so verbose output
  stays out of this conversation): **implement**, **test**, **debug**, **fix**.
  Prompt: *"Read `.claude/skills/<stage>/SKILL.md` and execute that process for
  slug `<slug>`"* (for fix, also pass the defect description), granting the tools
  that stage's frontmatter lists. The subagent returns only its summary; the work
  lands on disk and in git, which the next stage re-reads.

## Pipeline

**0. Preflight.** Check the working tree (`git status --short`); if there are
unrelated uncommitted changes, surface them and ask before continuing. Confirm
the tracker MCP for the ID's prefix is connected (`REGIS-*` → Jira, `DEV-*` →
Linear) via `/mcp`; if not, stop and tell me. Note the current branch — every
subtask commit lands here, and `ship-finish` will push and PR it.

**0.5 Decompose** *(ticket mode only)* — inline. Follow `decompose/SKILL.md` for
`$ARGUMENTS`. If it hands the ticket back as `needs_human_review` (novel,
multi-feature, or destructive), **STOP and tell me** — do not force a split.
Otherwise it writes the subtask specs and dependency graph.
→ **GATE (split):** show the subtasks (id · title · scope), out-of-scope items,
open questions, and the dependency order. *Approve / revise / abort.*
Then build the ordered slug list from the decomposition graph. A ticket that
didn't need splitting becomes a one-item list and runs the loop once.

---

**For each slug, in graph order, run the subtask loop:**

**1. Plan** — inline. Follow `plan/SKILL.md` for `<slug>`. Auto-proceed (no gate).

**2. Implement** — delegated. Coder per `implement/SKILL.md` for `<slug>`. Stages
changes, no commit. Auto-proceed.

**3. Review** — inline. Follow `review/SKILL.md`. If there are **critical/major**
findings, silently loop back to Implement with them (max **2** retries). If they
survive that, **ESCALATE**. Otherwise auto-proceed.

**4. Test** — delegated. Tester per `test/SKILL.md`. All green → step 6. Failures
→ step 5.

**5. Debug loop** — delegated. Debugger per `debug/SKILL.md`, then re-run Test.
Repeat at most **3** times; stop early on any stop condition. Still red after 3 →
**ESCALATE** with the remaining failures. Green → step 6.

**6. Verify** — inline, human. The suite is green, but green ≠ correct — most
visual/layout bugs are invisible to it. Tell me what to look at, then **STOP**.
→ **GATE (verify):** *"Looks right — commit"* or *describe any defect you see.*
- If I describe a defect → run **fix** (delegated) per `fix/SKILL.md`, passing my
  description. It writes a covering test when the bug is testable, else fixes and
  flags `manual-needed`. Then silently re-run **Test** (step 4) and return to this
  same Verify gate. Don't cap this loop — it's my eyes driving it.
- On approval → **commit this subtask**. Build the message as:
  - **subject** = `<slug> - <title>` (the fixed template — slug and the
    subtask's title from decomposition);
  - **body** = a concise **description you generate from this subtask's staged
    diff**. You implemented and reviewed it, so you have full context — summarize
    what actually changed and why in a few short lines, not just the title again.

  Commit with both, e.g. `git commit -m "<slug> - <title>" -m "<description>"`.
  One clean commit per subtask. **Never push or merge.** Then continue to the
  next slug.

---

**All subtasks done.** Report: ticket, subtasks completed, findings resolved,
final test results per subtask, anything `fix` flagged `manual-needed`, and the
list of commits made on the branch. Then ask once:

> All N subtasks shipped and committed on `<branch>`. Run `ship-finish <TICKET>`?

Do **not** run it yourself — I trigger the finish, which pushes, opens the PR,
merges, moves the ticket, and syncs the timer.

## Rules
- Commit **only** at a Verify gate — one commit per subtask, on my approval,
  subject `<slug> - <title>` with a diff-derived description body. Never push or
  merge; `ship-finish` owns that.
- Stop for me at the split gate and every Verify gate. Never skip them.
- Auto-proceed through plan / implement / review / test / debug. The only
  unplanned stops are the four escalation triggers above.
- If any stage returns `stopped: true`, surface its reason at the next natural
  gate (or escalate) and default to *abort*.
- Keep every summary short — the point of delegation is that I don't read the
  full diff or test dump unless I ask.

<!-- ── TWO SPOTS TO CONFIRM against your decompose/SKILL.md ──────────────────
1. needs_human_review: this assumes decompose signals an un-splittable ticket
   with that flag. Match the exact field/behavior your decompose skill uses.
2. ordered slug list: this assumes the subtask slugs + dependency order come
   from decompose's graph artifact (e.g. `python3 scripts/plan.py .specs/<TICKET>/`
   printing topological order, slugs like REGIS-142-01-...). Point step 0.5 at
   however your decompose skill actually emits the ordered list.
Paste decompose/SKILL.md and I'll replace these two notes with exact wiring.
──────────────────────────────────────────────────────────────────────────── -->
