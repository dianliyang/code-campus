import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("StudyCalendar edit state", () => {
  test("stores schedule rows and study plans in local state for optimistic edits", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/home/StudyCalendar.tsx"),
      "utf8",
    );

    expect(source).toContain("const [localScheduleRows, setLocalScheduleRows] = useState<DatabaseScheduleRow[]>(scheduleRows);");
    expect(source).toContain("const [localStudyPlans, setLocalStudyPlans] = useState<CalendarStudyPlanRecord[]>(studyPlans);");
    expect(source).toContain("buildOptimisticStudyPlanRows");
  });

  test("rolls back optimistic calendar edits when remote study plan updates fail", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/home/StudyCalendar.tsx"),
      "utf8",
    );

    expect(source).toContain("const snapshot = applyOptimisticStudyPlanUpdate(nextPlan);");
    expect(source).toContain("rollbackOptimisticStudyPlanUpdate(snapshot);");
    expect(source).toContain("if (!res.ok) {");
  });
});
