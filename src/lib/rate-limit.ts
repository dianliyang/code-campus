const rateLimitStore = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = rateLimitStore.get(key) || [];
  const recent = timestamps.filter(t => t > windowStart);

  if (recent.length >= limit) {
    rateLimitStore.set(key, recent);
    return { success: false, remaining: 0 };
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return { success: true, remaining: limit - recent.length };
}
