# Status Card Rectangle Count Design

**Goal:** Make the overview status card light an exact number of rectangles equal to each metric count, while keeping the fixed 10-slot layout.

## Scope

- Update the metric bar logic in `src/components/dashboard/CourseMomentumCard.tsx`.
- Keep the visual stack height and total slot count at 10 rectangles.
- Stop scaling filled rectangles proportionally against a separate maximum.

## Design

The current status card beside `Today's Routine` always renders 10 rectangles per metric, but the number of active rectangles is derived proportionally from an external maximum. That makes a count like `6` render something other than 6 active blocks.

The updated behavior is direct: each metric still renders 10 rectangles total, but the active rectangle count equals the metric value itself, capped at 10. This preserves the existing layout while making the visualization literal and easier to read.

## Validation

- A metric count of `6` lights exactly 6 rectangles.
- A metric count above `10` lights all 10 rectangles.
- The card still renders 10 total rectangles for each metric.
