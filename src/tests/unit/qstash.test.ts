import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  QSTASH_MAX_DELAY_MS,
  getQstashSafeNotBefore,
  publishDelayedJsonMessage,
} from "@/lib/qstash";

const fetchMock = vi.fn();

describe("publishDelayedJsonMessage", () => {
  const originalEnv = {
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_BASE_URL: process.env.QSTASH_BASE_URL,
    QSTASH_WORKOUT_REMINDER_SECRET: process.env.QSTASH_WORKOUT_REMINDER_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.QSTASH_TOKEN = "test-token";
    process.env.QSTASH_BASE_URL = "https://qstash.upstash.io";
    process.env.QSTASH_WORKOUT_REMINDER_SECRET = "forward-secret";
    process.env.CRON_SECRET = "";
  });

  afterEach(() => {
    process.env.QSTASH_TOKEN = originalEnv.QSTASH_TOKEN;
    process.env.QSTASH_BASE_URL = originalEnv.QSTASH_BASE_URL;
    process.env.QSTASH_WORKOUT_REMINDER_SECRET = originalEnv.QSTASH_WORKOUT_REMINDER_SECRET;
    process.env.CRON_SECRET = originalEnv.CRON_SECRET;
    vi.unstubAllGlobals();
  });

  test("publishes to qstash with the destination URL path left unescaped", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ messageId: "msg_123" }),
    } as Response);

    await publishDelayedJsonMessage({
      destination: "https://course.oili.dev/api/qstash/workout-reminder",
      body: { userId: "user_1", workoutId: 42 },
      notBefore: new Date("2026-03-13T16:45:00.000Z"),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://qstash.upstash.io/v2/publish/https://course.oili.dev/api/qstash/workout-reminder",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  test("caps the first qstash schedule hop at the 7 day max delay", () => {
    const now = new Date("2026-03-13T10:00:00.000Z");
    const finalReminderAt = new Date(now.getTime() + QSTASH_MAX_DELAY_MS + 3 * 24 * 60 * 60 * 1000);

    expect(getQstashSafeNotBefore(finalReminderAt, now).toISOString()).toBe("2026-03-20T10:00:00.000Z");
  });

  test("keeps the original reminder time when already within qstash delay limits", () => {
    const now = new Date("2026-03-13T10:00:00.000Z");
    const finalReminderAt = new Date("2026-03-18T10:15:00.000Z");

    expect(getQstashSafeNotBefore(finalReminderAt, now)).toEqual(finalReminderAt);
  });
});
