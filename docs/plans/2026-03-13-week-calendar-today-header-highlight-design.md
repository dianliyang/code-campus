# Week Calendar Today Header Highlight Design

**Goal:** Make the current day stand out more strongly in the week calendar by highlighting only the header, while keeping the day column body unchanged.

## Scope

- Update the week calendar header styling in `src/components/home/StudyCalendar.tsx`.
- Keep the body of the today column unchanged.
- Remove the current weak today-column body overlay if it is still present.

## Design

The current week view uses a very soft today emphasis in the body column, which does not create enough visual contrast. The stronger cue should move to the header, because that is where users scan day identity first.

Only the today header cell will receive a stronger background surface. The weekday/date text can continue using the existing hierarchy, but the header container will gain a more visible fill so today stands out immediately. Event cards, grid lines, and the current-time indicator below should remain untouched.

## Validation

- The today header is visually highlighted with a stronger background treatment.
- The day column body does not gain any additional background emphasis.
- The rest of the week headers remain unchanged.
