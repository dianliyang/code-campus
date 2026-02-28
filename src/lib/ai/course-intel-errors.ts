export function getCourseIntelErrorStatus(message: string): number {
  if (/course not found/i.test(message)) return 404;
  if (/courseid required|invalid courseid|bad request/i.test(message)) return 400;
  if (/not configured|prompt template not configured/i.test(message)) return 422;
  if (/no valid json|malformed|truncated|invalid json/i.test(message)) return 422;
  if (/rate limit|timeout|upstream|api key|perplexity|openai|vertex|google cloud/i.test(message)) return 502;
  return 500;
}
