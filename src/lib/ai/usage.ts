export function trackAiUsage(delta: { calls?: number; tokens?: number }) {
  if (typeof window === "undefined") return;

  const calls = Math.max(0, Math.floor(delta.calls || 0));
  const tokens = Math.max(0, Math.floor(delta.tokens || 0));

  if (calls === 0 && tokens === 0) return;

  void fetch("/api/ai/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calls, tokens }),
    keepalive: true,
  }).catch(() => {
    // best-effort usage tracking
  });
}
