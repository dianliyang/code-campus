# Routine Synthetic Parent Design

**Goal:** Make `Today's Routine` render hierarchical course groups even when an explicit same-day study-plan parent row is missing.

## Scope

- Update grouping logic in `src/lib/week-calendar.ts`.
- Keep the existing tree rendering in overview and calendar.
- Preserve explicit study-plan parents when they exist.

## Design

The current grouping logic only nests child items when a same-day parent study-plan row is present. In real routine data, schedules and assignments can exist without that explicit parent row, causing the routine to appear flat even though the UI supports a tree.

The fix is to synthesize a parent when multiple same-course same-day items exist and no explicit parent is available. The synthetic parent should represent the course/day grouping and allow the existing overview and calendar tree UI to render correctly. When a real explicit parent exists, it remains the group parent.

## Validation

- Multiple same-course same-day child items group under a synthesized parent when no explicit parent row exists.
- Existing explicit-parent grouping still works.
- Unrelated standalone items remain standalone.
