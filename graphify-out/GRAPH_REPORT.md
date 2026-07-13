# Graph Report - ./src  (2026-07-13)

## Corpus Check
- Corpus is ~1,824 words - fits in a single context window. You may not need a graph.

## Summary
- 52 nodes · 66 edges · 12 communities (7 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Header & Navigation
- Domain Types & Home Page
- App Shell & Static Pages
- Layout & Footer
- App Entry & Routing
- Design Tokens
- Project Setup Test
- Article Page
- Bilan Culturel Page
- Not Found Page

## God Nodes (most connected - your core abstractions)
1. `App()` - 3 edges
2. `Layout()` - 3 edges
3. `Medium` - 3 edges
4. `Footer()` - 2 edges
5. `NavItem` - 2 edges
6. `primaryNav` - 2 edges
7. `secondaryNav` - 2 edges
8. `Article` - 2 edges
9. `Comment` - 2 edges
10. `AProposPage()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (12 total, 5 thin omitted)

### Community 0 - "Header & Navigation"
Cohesion: 0.27
Nodes (3): NavItem, primaryNav, secondaryNav

### Community 1 - "Domain Types & Home Page"
Cohesion: 0.33
Nodes (6): Article, Comment, Medium, HomePage(), MEDIUM_LABEL, PATH_TO_MEDIUM

### Community 2 - "App Shell & Static Pages"
Cohesion: 0.43
Nodes (3): AProposPage(), ArchivesPage(), MeSuivrePage()

### Community 3 - "Layout & Footer"
Cohesion: 0.38
Nodes (3): Footer(), Layout(), NAV_LABELS

### Community 5 - "Design Tokens"
Cohesion: 0.50
Nodes (3): global, root, tokens

## Knowledge Gaps
- **7 isolated node(s):** `PATH_TO_MEDIUM`, `MEDIUM_LABEL`, `root`, `root`, `tokens` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Layout()` connect `Layout & Footer` to `App Shell & Static Pages`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `App()` connect `App Entry & Routing` to `App Shell & Static Pages`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `PATH_TO_MEDIUM`, `MEDIUM_LABEL`, `root` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._