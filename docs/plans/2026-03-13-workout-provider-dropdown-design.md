# Workout Provider Dropdown Design

**Goal:** Replace the workout filter drawer with a provider-only dropdown in the main toolbar.

## Scope

- Update the workouts toolbar in `src/components/workouts/WorkoutListHeader.tsx`.
- Pass provider options from `src/components/workouts/WorkoutList.tsx`.
- Remove the mounted sidebar filter drawer from `src/app/(dashboard)/workouts/page.tsx`.
- Keep the existing `provider` URL param as the source of truth.

## Design

The workouts page currently exposes filtering through a generic filter button and sidebar drawer, even though the desired experience is now a single provider-only filter. The cleanest approach is to move provider selection into the toolbar and remove the sidebar flow from the page.

The new control will be a dropdown/select with:

- `All providers` to clear the filter
- one option per provider from the loaded workout data
- URL updates through the existing `provider` query param

Search, sort, refresh, and layout switching stay unchanged.

## Validation

- The toolbar shows a provider dropdown instead of the old filter button.
- Choosing a provider writes `provider=...` to the URL and resets `page=1`.
- Choosing `All providers` removes the `provider` query param.
- The workout page no longer mounts the old sidebar drawer.
