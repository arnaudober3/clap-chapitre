# Spec: <feature name>

**Status:** draft
**Linear:** <ID>
**Owner:** <name>
**Last updated:** <date>

## Context
Why this work, what triggered it, what user or business problem it solves. One
paragraph. Reference the Linear issue; do not duplicate it.

## Data contracts
The shape of every piece of data this feature reads, writes, or passes between
layers. Schemas, types, field names, units, nullability. The data shape is the
seam that lets work proceed in parallel, so be specific.

## User-visible behavior
What the user sees, in plain language, in the order they see it. One subsection
per distinct behavior. Each subsection is testable.

## Failure modes
What goes wrong, what the system does, what the user sees in each case. At
minimum: invalid input, upstream service unavailable, partial failure,
concurrent modification.

## Rollout
Feature flag, gradual rollout, dark launch, big bang. What gets monitored. What
the rollback plan is.

## Out of scope
What this spec is explicitly not doing. Read this before arguing about scope in
review.

## Open questions
Each item has an owner and a target resolution date. Empty by the time the spec
is settled.
