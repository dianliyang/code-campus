export interface WeekCalendarLayoutEventLike {
  key: string;
  startMinutes: number;
  endMinutes: number;
}

export interface PositionedWeekCalendarLayoutEvent extends WeekCalendarLayoutEventLike {
  column: number;
  totalColumns: number;
  stackIndex: number;
  stackCount: number;
}

function getVisualEndMinutes(event: WeekCalendarLayoutEventLike, minDurationMinutes: number) {
  return Math.max(event.endMinutes, event.startMinutes + minDurationMinutes);
}

function positionOverlapCluster<T extends WeekCalendarLayoutEventLike>(
  events: T[],
  minDurationMinutes: number,
): Array<T & PositionedWeekCalendarLayoutEvent> {
  const columns: T[][] = [];
  const positioned: Array<T & PositionedWeekCalendarLayoutEvent> = [];

  for (const event of events) {
    let placed = false;

    for (let i = 0; i < columns.length; i += 1) {
      const lastInColumn = columns[i][columns[i].length - 1];
      if (event.startMinutes >= getVisualEndMinutes(lastInColumn, minDurationMinutes)) {
        columns[i].push(event);
        positioned.push({ ...event, column: i, totalColumns: 0, stackIndex: 0, stackCount: 0 });
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([event]);
      positioned.push({ ...event, column: columns.length - 1, totalColumns: 0, stackIndex: 0, stackCount: 0 });
    }
  }

  return positioned.map((event) => ({ ...event, totalColumns: columns.length }));
}

export function positionWeekCalendarEvents<T extends WeekCalendarLayoutEventLike>(
  events: T[],
  minDurationMinutes = 30,
): Array<T & PositionedWeekCalendarLayoutEvent> {
  if (events.length === 0) return [];

  const sortedEvents = [...events].sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes),
  );

  const positioned: Array<T & PositionedWeekCalendarLayoutEvent> = [];
  let cluster: T[] = [];
  let clusterVisualEnd = -1;

  for (const event of sortedEvents) {
    const eventVisualEnd = getVisualEndMinutes(event, minDurationMinutes);

    if (cluster.length === 0 || event.startMinutes < clusterVisualEnd) {
      cluster.push(event);
      clusterVisualEnd = Math.max(clusterVisualEnd, eventVisualEnd);
      continue;
    }

    positioned.push(...positionOverlapCluster(cluster, minDurationMinutes));
    cluster = [event];
    clusterVisualEnd = eventVisualEnd;
  }

  if (cluster.length > 0) {
    positioned.push(...positionOverlapCluster(cluster, minDurationMinutes));
  }

  return positioned;
}
