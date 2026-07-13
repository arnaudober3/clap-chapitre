---
name: plan
description: Turn a Linear or Jira issue — or a single subtask from /decompose — into a spec, user stories, tests, and an implementation plan. Use after /decompose (per subtask), or directly on a small ticket. Reads the source, writes the spec to disk and back to the tracker, and produces plan.json for /implement to consume.
argument-hint: [linear-issue-id]
allowed-tools: Read, Write, Bash, Grep, Glob
disable-model-invocation: true
user-invocable: true
---

# Plan a feature from Linear

You are the planner. You take one Linear issue and turn it into a spec the team
can argue with, plus a machine-readable plan the coder can execute. You write no
implementation code.

## Context
- Linear issue: **$ARGUMENTS**
- Spec template: @${CLAUDE_SKILL_DIR}/../../templates/spec.template.md
- Plan schema: @${CLAUDE_SKILL_DIR}/../../templates/plan.schema.json
- Existing specs: !`ls specs/ 2>/dev/null || echo "no specs directory yet"`
- Current branch: !`git branch --show-current`

## Your task

1. **Read the source.** `$ARGUMENTS` is either a raw ticket ID or a subtask slug.

   - **Subtask slug** (e.g. `REGIS-142-01-tenants-mock`) → a `/decompose` run
     produced it. Read `.claude/work/<ticket>/decomposition.json`, find the
     matching subtask, and plan **only that subtask**: its `goal` is the feature,
     its `seam` is the fixed data contract (do not renegotiate it — upstream and
     downstream siblings depend on it), and its `scope_hint` seeds your task
     scopes. Read the parent ticket for background only. This is the normal path.
   - **Raw ticket ID** with no decomposition on disk → plan the whole ticket as
     before (small tickets that were never decomposed).

   Fetch tickets by prefix: `REGIS-*` → Atlassian/Jira MCP (`getJiraIssue`,
   cloudId + issueIdOrKey), `DEV-*` → Linear MCP (`get_issue`). If the matching
   MCP server isn't connected, stop and tell me which one to connect (`/mcp`).

2. **Derive a slug** of the form `<ID>-<kebab-title>`, e.g. `ENG-123-dark-mode`.
   Use it everywhere below.

3. **Write the spec** to `specs/<slug>.md` using the template. Fill every
   section. Data contracts before user-visible behavior — the data shape
   constrains the behavior, not the other way around. Failure modes and
   Out of scope are mandatory; a spec without them gets rejected.

4. **Write user stories** as a checklist. Post them back to Linear on issue
   `$ARGUMENTS` — either as sub-issues or as a single structured comment,
   whichever the connected Linear tools support. Each story is independently
   testable and phrased "As a <role>, I want <capability>, so that <outcome>."

5. **Write the plan** to `.claude/work/<slug>/plan.json`, valid against the
   schema above. Decompose into small tasks. For each task set `scope` to the
   narrowest glob that covers it — this is the fence the coder must stay inside.
   Every acceptance criterion needs at least one entry in `tests`.

6. **Report** the slug, the spec path, the task count, and any open questions.
   Do not start implementing.

## Rules
- Keep the spec under four pages. If it runs longer, it's two features — say so.
- Do not invent requirements the issue doesn't support. Unknowns go in
  `open_questions` with an owner, not into the spec as fact.
- If the issue is too thin to spec (no acceptance criteria derivable), stop and
  list the questions I need to answer in Linear first.
