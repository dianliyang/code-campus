export function trackAiUsage(delta: { calls?: number; tokens?: number }) {
  if (typeof window === "undefined") return;

  const addCalls = Math.max(0, Math.floor(delta.calls || 0));
  const addTokens = Math.max(0, Math.floor(delta.tokens || 0));

  try {
    const raw = localStorage.getItem("cc_ai_usage");
    const current = raw ? JSON.parse(raw) as { calls?: number; tokens?: number } : {};
    const next = {
      calls: Math.max(0, Math.floor(current.calls || 0) + addCalls),
      tokens: Math.max(0, Math.floor(current.tokens || 0) + addTokens),
    };
    localStorage.setItem("cc_ai_usage", JSON.stringify(next));
  } catch {
    // ignore localStorage parse/write failures
  }
}
