export function getCourseIntelErrorStatus(message: string): number {
  const msg = String(message || "");
  const lower = msg.toLowerCase();

  if (/^unauthorized$/i.test(msg) || /not authenticated|auth required|login required/.test(lower)) return 401;
  if (/^forbidden$/i.test(msg)) return 403;
  if (/course not found/i.test(message)) return 404;
  if (/courseid required|invalid courseid|bad request/i.test(message)) return 400;
  if (/not configured|prompt template not configured/i.test(message)) return 422;
  if (/no valid json|malformed|truncated|invalid json/i.test(message)) return 422;
  if (
    /rate limit|timeout|upstream|api key|perplexity|openai|vertex|gemini|google cloud/i.test(message) ||
    ((/unauthorized|forbidden|permission denied|invalid credential|authentication/i.test(lower)) &&
      (/openai|perplexity|gemini|vertex|google|model|provider|api/i.test(lower)))
  ) {
    return 502;
  }
  return 500;
}
