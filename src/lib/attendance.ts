import { addDays, getDay, parseISO, startOfDay, isAfter } from "date-fns";

interface Plan {
  id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
}

interface Log {
  plan_id: number;
  log_date: string;
  is_completed: boolean | null;
}

export function calculateAttendance(plans: Plan[], logs: Log[]) {
  let attended = 0;
  let total = 0;

  const today = startOfDay(new Date());

  // Optimize log lookup by creating a map of planId -> date -> is_completed
  const logsMap = new Map<number, Map<string, boolean>>();
  for (const log of logs) {
    if (!logsMap.has(log.plan_id)) {
      logsMap.set(log.plan_id, new Map());
    }
    const dateStr = log.log_date.split('T')[0]; // Ensure we only have YYYY-MM-DD
    logsMap.get(log.plan_id)?.set(dateStr, log.is_completed ?? false);
  }

  for (const plan of plans) {
    const startDate = parseISO(plan.start_date);
    const endDate = parseISO(plan.end_date);
    const effectiveEndDate = isAfter(endDate, today) ? today : endDate;
    const planLogs = logsMap.get(plan.id);

    let currentDate = startDate;
    while (currentDate <= effectiveEndDate) {
      const dayOfWeek = getDay(currentDate);

      if (plan.days_of_week.includes(dayOfWeek)) {
        total++;

        const dateStr = currentDate.toISOString().split('T')[0];
        if (planLogs?.get(dateStr)) {
          attended++;
        }
      }

      currentDate = addDays(currentDate, 1);
    }
  }

  return { attended, total };
}
