import { addDays, isSameDay, getDay, parseISO, startOfDay, isAfter } from "date-fns";

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

  for (const plan of plans) {
    const startDate = parseISO(plan.start_date);
    const endDate = parseISO(plan.end_date);
    
    // Determine the effective end date for calculation (cannot be in the future for "past sessions")
    // If the plan ends before today, use plan end date.
    // If the plan ends after today, use today.
    const effectiveEndDate = isAfter(endDate, today) ? today : endDate;

    // Iterate through days
    let currentDate = startDate;
    while (currentDate <= effectiveEndDate) {
      const dayOfWeek = getDay(currentDate); // 0 = Sunday

      if (plan.days_of_week.includes(dayOfWeek)) {
        total++;

        // Check for log
        // Note: Logs are stored as YYYY-MM-DD strings usually, or Date objects.
        // Assuming log_date is YYYY-MM-DD string from Supabase.
        const log = logs.find(l => 
          l.plan_id === plan.id && 
          isSameDay(parseISO(l.log_date), currentDate)
        );

        if (log && log.is_completed) {
          attended++;
        }
      }

      currentDate = addDays(currentDate, 1);
    }
  }

  return { attended, total };
}
