# Learning Identity Flex Grid Design

**Goal:** Let the `Learning identity` card’s top summary area grow naturally instead of being forced into a rigid single-row two-column layout.

## Scope

- Update the responsive summary grid in `src/components/identity/LearningProfileChart.tsx`.
- Keep the content hierarchy and card structure unchanged.
- Avoid changing the outer dashboard section layout.

## Design

The `Learning identity` card currently uses a fixed medium-screen grid definition that locks the summary area into a one-row layout. That makes the top section feel constrained even when the content would benefit from wrapping.

The updated layout should stay responsive but become more natural: the total-units block and dominant-field block should be able to stack or flow without being pinned to a rigid fixed-width side column. The rest of the chart content remains unchanged.

## Validation

- The top summary area no longer uses the fixed `md:grid-cols-[minmax(0,1fr)_220px]` layout.
- The summary blocks can wrap/grow naturally at intermediate widths.
- The rest of the chart remains intact.
