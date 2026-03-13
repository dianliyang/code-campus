import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const publishDelayedJsonMessageMock = vi.fn();
const sendWorkoutReminderEmailMock = vi.fn();
const createAdminClientMock = vi.fn();

vi.mock("@/lib/qstash", async () => {
  const actual = await vi.importActual<typeof import("@/lib/qstash")>("@/lib/qstash");
  return {
    ...actual,
    publishDelayedJsonMessage: publishDelayedJsonMessageMock,
  };
});

vi.mock("@/lib/email", () => ({
  sendWorkoutReminderEmail: sendWorkoutReminderEmailMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: createAdminClientMock,
}));

type ReminderRow = {
  status: string;
  reminder_sent_at: string | null;
  reminder_message_id: string | null;
};

function createSupabaseMock(reminderRow: ReminderRow) {
  const updateMatchMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn(() => ({
    match: updateMatchMock,
  }));
  const maybeSingleMock = vi.fn().mockResolvedValue({
    data: reminderRow,
    error: null,
  });
  const matchMock = vi.fn(() => ({
    maybeSingle: maybeSingleMock,
  }));
  const selectMock = vi.fn(() => ({
    match: matchMock,
  }));
  const fromMock = vi.fn((table: string) => {
    if (table !== "user_workouts") {
      throw new Error(`Unexpected table ${table}`);
    }

    return {
      select: selectMock,
      update: updateMock,
    };
  });

  return {
    from: fromMock,
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
    updateMatchMock,
  };
}

describe("workout reminder qstash route chaining", () => {
  const originalSecret = process.env.QSTASH_WORKOUT_REMINDER_SECRET;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T10:00:00.000Z"));
    process.env.QSTASH_WORKOUT_REMINDER_SECRET = "test-secret";
    publishDelayedJsonMessageMock.mockReset();
    sendWorkoutReminderEmailMock.mockReset();
    createAdminClientMock.mockReset();
  });

  afterEach(() => {
    process.env.QSTASH_WORKOUT_REMINDER_SECRET = originalSecret;
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  test("reschedules itself when the final reminder is still beyond the qstash max delay", async () => {
    const supabase = createSupabaseMock({
      status: "reminder",
      reminder_sent_at: null,
      reminder_message_id: "msg_initial",
    });
    createAdminClientMock.mockReturnValue(supabase);
    publishDelayedJsonMessageMock.mockResolvedValue("msg_chained");

    const { POST } = await import("@/app/api/qstash/workout-reminder/route");

    const response = await POST(
      new NextRequest("https://course.oili.dev/api/qstash/workout-reminder", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "user_1",
          workoutId: 42,
          reminderAt: "2026-03-25T10:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(sendWorkoutReminderEmailMock).not.toHaveBeenCalled();
    expect(publishDelayedJsonMessageMock).toHaveBeenCalledWith({
      destination: "https://course.oili.dev/api/qstash/workout-reminder",
      body: {
        userId: "user_1",
        workoutId: 42,
        reminderAt: "2026-03-25T10:00:00.000Z",
      },
      notBefore: new Date("2026-03-20T10:00:00.000Z"),
      deduplicationId: "workout-reminder:user_1:42:2026-03-20T10:00:00.000Z",
    });
    expect(supabase.updateMatchMock).toHaveBeenCalledWith({
      user_id: "user_1",
      workout_id: 42,
    });
  });

  test("schedules the final delivery hop instead of sending early when reminder time is still in the future", async () => {
    const supabase = createSupabaseMock({
      status: "reminder",
      reminder_sent_at: null,
      reminder_message_id: "msg_checkpoint",
    });
    createAdminClientMock.mockReturnValue(supabase);
    publishDelayedJsonMessageMock.mockResolvedValue("msg_final");

    const { POST } = await import("@/app/api/qstash/workout-reminder/route");

    const response = await POST(
      new NextRequest("https://course.oili.dev/api/qstash/workout-reminder", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "user_1",
          workoutId: 42,
          reminderAt: "2026-03-18T10:15:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(sendWorkoutReminderEmailMock).not.toHaveBeenCalled();
    expect(publishDelayedJsonMessageMock).toHaveBeenCalledWith({
      destination: "https://course.oili.dev/api/qstash/workout-reminder",
      body: {
        userId: "user_1",
        workoutId: 42,
        reminderAt: "2026-03-18T10:15:00.000Z",
      },
      notBefore: new Date("2026-03-18T10:15:00.000Z"),
      deduplicationId: "workout-reminder:user_1:42:2026-03-18T10:15:00.000Z",
    });
  });
});
