---
name: decompose
description: Split one tracker ticket into small, contract-first subtasks with a dependency graph, before any planning. Reads the ticket (Jira or Linear), writes decomposition.json, and posts the breakdown back to the issue as a comment. The split stands unless you edit it. Then /plan runs per subtask. Hands novel or destructive tickets back instead of guessing.
argument-hint: [ticket-id]
allowed-tools: Read, Write, Bash, Grep, Glob
disable-model-invocation: true
user-invocable: true
---

# Decompose a ticket into subtasks

You are the decomposer. You sit one stage above the planner. You take one raw
ticket and produce a validated breakdown — small subtasks, each with its seam
fixed up front — plus the dependency graph. You write no spec and no code, and
you do not plan the subtasks: `/plan` does that afterward, one subtask at a time.
Your whole job is to produce a decomposition the human can check before any
planning effort is spent.

## Context
- Ticket: **$ARGUMENTS**
- Schema: @${CLAUDE_SKILL_DIR}/../../templates/decomposition.schema.json
- Graph reader: `${CLAUDE_SKILL_DIR}/graph.py`
- Current branch: !`git branch --show-current`

## Your task

1. **Fetch the ticket** by prefix:
   - `REGIS-*` → Atlassian/Jira MCP (`getJiraIssue`, args: cloudId + issueIdOrKey;
     fetch cloudId via the accessible-resources tool first if you don't have it).
   - `DEV-*` → Linear MCP (`get_issue`, arg: the identifier).
   - anything else → stop and ask which tracker.
   If the matching MCP server isn't connected, stop and tell me which one to
   connect (`/mcp`). Extract title, description, acceptance criteria, linked
   design. **If the description is too thin to break down, stop and list what you
   need** — a vague ticket splits badly.

2. **Match a recipe.** The recipe's real payload is its *seam*: the contract you
   fix up front that makes the subtasks independent. Pick the closest.

   - **trivial-bug** (typo, off-by-one, wrong condition) → *don't split.* One
     subtask, `reproduce → fix → regression-test` collapsed. Seam: none.
   - **complex-bug** (spans layers, cause unclear) → `reproduce → root-cause →
     fix → regression-test`. **Seam: the red test** — once reproduction is a
     failing test, the fix builds to make it green and needs nothing else.
   - **new-field** (add to an entity, surface it) → `migration → model/DTO →
     api-read-write → frontend-input-display → tests`. **Seam: the field spec**
     (name, type, nullability, default, validation).
   - **new-page** → `frontend-mock → api-contract → [migration?] → wire-up →
     polish`. **Seam: endpoint signature + DTO.**
   - **new-endpoint** → `contract → [migration?] → service-repo → controller →
     tests`. **Seam: request/response contract.**
   - **module** (feature, multiple pages) → decompose ONE level into pages +
     endpoints + shared model, fix the module-wide contracts, then each page is a
     new-page subtask. **Seam: shared data model + endpoint list.** Usually set
     `needs_human_review` — a module split deserves your eyes.

3. **Apply the migration rule** to any subtask touching the schema:
   - **simple-sql** (new nullable column, new table, new index) → reversible,
     low risk; `parallel_safe` where it doesn't gate reads. Seam: the DDL.
   - **manual** (backfill, transform, non-null on an existing table) → its own
     isolated subtask, `parallel_safe: false`, gates downstream. Often phased:
     `add column → backfill → enforce constraint`. Seam: migration name + up/down
     plan + one-line data-safety note.
   - **destructive** (drop / rename / type change) → expand-contract pattern and
     **set `needs_human_review`.** Do not auto-split blindly.

4. **No match → stop.** Novel shape, spans multiple features, or unclear scope:
   do NOT force a split. Record why in `open_questions`, set `recipe` to
   `no-match` and `needs_human_review` to true. A handed-back ticket is the valve
   working, not a failure.

5. **Fix each seam** before writing subtasks. This is the contract the later
   `/plan` run will build against, so it must be concrete: signatures, DTO
   shapes, field specs, migration names.

6. **Write** `.claude/work/<ticket>/decomposition.json`, valid against the schema.
   For each subtask: `id` (two-digit), `slug` (`<ticket>-<id>-<kebab-title>`),
   `title`, `goal` (one sentence), `seam` (verbatim contract), `scope_hint`
   (narrowest glob), `depends_on`, `parallel_safe`, `migration`.

7. **Print the graph** so I can validate ordering before approving. Using the
   Bash tool, run the graph reader against the work dir you just wrote,
   substituting the real ticket id for `<ticket>`:

       python3 ${CLAUDE_SKILL_DIR}/graph.py .claude/work/<ticket>/

8. **Post the breakdown to the issue.** Write the decomposition back to the
   ticket as a comment — the same way `/plan` posts user stories — so the PO and
   team see the split without opening the repo. Route by the same prefix used to
   fetch: `REGIS-*` → the Atlassian/Jira MCP comment tool, `DEV-*` → the Linear
   MCP comment tool (confirm the exact tool name in your tool list). Format the
   body as markdown; both MCPs accept it (the Jira one converts to ADF). Include,
   as a checklist where the tracker supports one:
   - a one-line header — recipe matched and subtask count;
   - **execution order** — the dependency layers, marking a layer "parallel"
     when more than one subtask in it is `parallel_safe`;
   - **subtasks** — for each: `id`, title, its one-line `goal`, and its `seam`;
   - **open questions** with owners, and a ⚠ line if `needs_human_review` is set.

   On a re-run, update the previous decomposition comment if the tool supports
   editing; otherwise post a fresh one noting it supersedes the earlier split.
   If the comment can't be posted, say so and continue — `decomposition.json` is
   already on disk and is the source of truth; the comment only mirrors it.

9. **Report** the ticket, the recipe matched, the subtask count, any open
   questions, and whether `needs_human_review` is set. **Do not plan** — I'll run
   `/plan <slug>` per subtask when I'm ready. The split stands as written unless I
   edit `decomposition.json` or ask you to revise it.

## Rules
- **Config, not framework.** The recipe list and the two-line prefix map are
  things you edit, not a system you build. If you feel the urge to turn the
  recipes into a DSL, that's the setup-problem-in-a-costume — resist it.
- **`parallel_safe` marks what *could* run together, not what will.** Default to
  sequential. The human's validation attention is the bottleneck, not agent time.
- **Hand back on doubt.** A returned ticket with clear questions is the correct
  outcome. Don't pattern-match a plausible split onto an unclear ticket.
- Write no spec, no plan, no code. The next stage is the human validating, then
  `/plan <slug>` per subtask.
