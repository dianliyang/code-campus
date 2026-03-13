export const WORKOUT_REMINDER_TIMEZONE = "Europe/Berlin";
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedDateTimeParts(date: Date, timeZone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function parseLocalDateTime(input: string): DateTimeParts | null {
  const match = String(input || "").match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || "0"),
  };
}

export function parseBerlinLocalDateTimeToUtc(input: string): Date | null {
  const localParts = parseLocalDateTime(input);
  if (!localParts) return null;

  const utcGuess = new Date(
    Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day,
      localParts.hour,
      localParts.minute,
      localParts.second,
    ),
  );

  const zonedParts = getZonedDateTimeParts(utcGuess, WORKOUT_REMINDER_TIMEZONE);
  const desiredEpoch = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour,
    localParts.minute,
    localParts.second,
  );
  const zonedEpoch = Date.UTC(
    zonedParts.year,
    zonedParts.month - 1,
    zonedParts.day,
    zonedParts.hour,
    zonedParts.minute,
    zonedParts.second,
  );

  return new Date(utcGuess.getTime() + (desiredEpoch - zonedEpoch));
}

export function getWorkoutBookingOpensUtc(details: Record<string, unknown> | null | undefined): Date | null {
  const bookingOpensAt =
    details && typeof details.bookingOpensAt === "string" ? details.bookingOpensAt : "";
  return bookingOpensAt ? parseBerlinLocalDateTimeToUtc(bookingOpensAt) : null;
}

export function getWorkoutReminderAtUtc(details: Record<string, unknown> | null | undefined): Date | null {
  const bookingOpensAt = getWorkoutBookingOpensUtc(details);
  if (!bookingOpensAt) return null;
  return new Date(bookingOpensAt.getTime() - FIFTEEN_MINUTES_MS);
}

export function formatWorkoutBookingOpensTime(
  details: Record<string, unknown> | null | undefined,
): string | null {
  const bookingOpensAt =
    details && typeof details.bookingOpensAt === "string" ? details.bookingOpensAt : "";
  const match = bookingOpensAt.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

export function formatWorkoutBookingOpensLabel(
  details: Record<string, unknown> | null | undefined,
): string | null {
  const bookingOpensOn =
    details && typeof details.bookingOpensOn === "string" ? details.bookingOpensOn : "";
  const bookingOpensTime = formatWorkoutBookingOpensTime(details);

  if (!bookingOpensOn && !bookingOpensTime) return null;
  if (!bookingOpensOn) return bookingOpensTime ? `Opens ${bookingOpensTime}` : null;

  const date = new Date(`${bookingOpensOn}T12:00:00Z`);
  const dateLabel = Number.isNaN(date.getTime())
    ? bookingOpensOn
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date);

  return bookingOpensTime ? `Opens ${dateLabel}, ${bookingOpensTime}` : `Opens ${dateLabel}`;
}
