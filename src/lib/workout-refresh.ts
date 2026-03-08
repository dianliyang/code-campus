export function partitionStaleWorkoutIds(
  staleWorkoutIds: number[],
  referencedWorkoutIds: Iterable<number>,
): { deletableIds: number[]; preservedIds: number[] } {
  const referenced = new Set(Array.from(referencedWorkoutIds, (id) => Number(id)));
  const deletableIds: number[] = [];
  const preservedIds: number[] = [];

  for (const id of staleWorkoutIds) {
    if (referenced.has(Number(id))) preservedIds.push(Number(id));
    else deletableIds.push(Number(id));
  }

  return { deletableIds, preservedIds };
}
