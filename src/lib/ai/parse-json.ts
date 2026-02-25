function findBalancedSegment(input: string, openChar: "{" | "[", closeChar: "}" | "]"): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === openChar) {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === closeChar && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
}

function removeTrailingCommas(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === ",") {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j += 1;
      if (j < input.length && (input[j] === "}" || input[j] === "]")) {
        continue;
      }
    }

    out += ch;
  }

  return out;
}

function extractCandidates(raw: string): string[] {
  const text = String(raw || "");
  const candidates: string[] = [];

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim());

  const objectSegment = findBalancedSegment(text, "{", "}");
  if (objectSegment) candidates.push(objectSegment.trim());

  const arraySegment = findBalancedSegment(text, "[", "]");
  if (arraySegment) candidates.push(arraySegment.trim());

  candidates.push(text.trim());

  return Array.from(new Set(candidates.filter(Boolean)));
}

export function parseLenientJson(raw: string): unknown {
  const candidates = extractCandidates(raw);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastError = err as Error;
    }

    try {
      return JSON.parse(removeTrailingCommas(candidate));
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error("Invalid JSON");
}

