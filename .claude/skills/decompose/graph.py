#!/usr/bin/env python3
"""
graph.py — print the execution order of a ticket's subtasks.

Usage:
    python3 graph.py .claude/work/REGIS-142/

Reads decomposition.json in that dir, builds the dependency graph from each
subtask's `depends_on`, topologically sorts it, and prints the layers. A layer
with more than one subtask is parallel-safe only if every member opts in via
`parallel_safe`; otherwise it's independent-but-run-sequentially. This is the
view you check at the /decompose validation gate before /plan runs per subtask.

Requires: pyyaml is NOT needed — decomposition.json is JSON. graphlib is stdlib
on Python 3.9+.
"""
import sys
import json
import pathlib
from graphlib import TopologicalSorter, CycleError


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 graph.py <work-dir-containing-decomposition.json>")

    work_dir = pathlib.Path(sys.argv[1])
    doc_path = work_dir / "decomposition.json"
    if not doc_path.is_file():
        sys.exit(f"No decomposition.json in {work_dir}")

    try:
        doc = json.loads(doc_path.read_text())
    except json.JSONDecodeError as e:
        sys.exit(f"decomposition.json is not valid JSON: {e}")

    subtasks = doc.get("subtasks", [])
    if not subtasks:
        sys.exit("decomposition.json has no subtasks")

    if doc.get("needs_human_review"):
        print("\n  ⚠  needs_human_review is set — this decomposition wants your eyes "
              "before planning.\n")

    graph: dict[str, set[str]] = {}
    safe: dict[str, bool] = {}
    title: dict[str, str] = {}
    for t in subtasks:
        tid = t["id"]
        graph[tid] = set(t.get("depends_on", []))
        safe[tid] = bool(t.get("parallel_safe", False))
        title[tid] = t.get("title", t.get("slug", tid))

    known = set(graph)
    for node, deps in graph.items():
        missing = deps - known
        if missing:
            sys.exit(f"subtask {node}: depends_on unknown id(s): {', '.join(sorted(missing))}")

    ts = TopologicalSorter(graph)
    try:
        ts.prepare()
    except CycleError as e:
        sys.exit(f"Dependency cycle detected: {' -> '.join(e.args[1])}")

    print(f"\nExecution plan for {doc.get('ticket', work_dir.name)} "
          f"(recipe: {doc.get('recipe', '?')})\n" + "=" * 52)
    step = 1
    while ts.is_active():
        ready = tuple(ts.get_ready())
        if len(ready) > 1 and all(safe.get(t, False) for t in ready):
            tag = "parallel-safe"
        elif len(ready) > 1:
            tag = "independent (run sequentially — not all parallel_safe)"
        else:
            tag = "sequential"
        print(f"[{step}] {tag}")
        for t in ready:
            print(f"      {t}  {title[t]}")
        ts.done(*ready)
        step += 1
    print()


if __name__ == "__main__":
    main()
