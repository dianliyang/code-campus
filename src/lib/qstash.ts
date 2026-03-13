type PublishOptions = {
  destination: string;
  body: unknown;
  notBefore: Date;
  deduplicationId?: string;
  forwardHeaders?: Record<string, string>;
};

function getQstashConfig() {
  const token = process.env.QSTASH_TOKEN?.trim();
  const baseUrl = process.env.QSTASH_BASE_URL?.trim() || "https://qstash.upstash.io/v2";
  const forwardSecret =
    process.env.QSTASH_WORKOUT_REMINDER_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";

  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }

  if (!forwardSecret) {
    throw new Error("QSTASH_WORKOUT_REMINDER_SECRET or CRON_SECRET is not configured");
  }

  return { token, baseUrl, forwardSecret };
}

export async function publishDelayedJsonMessage({
  destination,
  body,
  notBefore,
  deduplicationId,
  forwardHeaders = {},
}: PublishOptions): Promise<string> {
  const { token, baseUrl, forwardSecret } = getQstashConfig();
  const url = `${baseUrl}/publish/${encodeURIComponent(destination)}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Upstash-Not-Before": String(Math.floor(notBefore.getTime() / 1000)),
    "Upstash-Retries": "3",
    "Upstash-Forward-Authorization": `Bearer ${forwardSecret}`,
  };

  if (deduplicationId) {
    headers["Upstash-Deduplication-Id"] = deduplicationId;
  }

  for (const [key, value] of Object.entries(forwardHeaders)) {
    headers[`Upstash-Forward-${key}`] = value;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as { messageId?: string; error?: string };
  if (!response.ok || !payload.messageId) {
    throw new Error(payload.error || "Failed to schedule QStash message");
  }

  return payload.messageId;
}

export async function cancelQstashMessage(messageId: string): Promise<boolean> {
  const { token, baseUrl } = getQstashConfig();
  const response = await fetch(`${baseUrl}/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  return response.ok || response.status === 404;
}
