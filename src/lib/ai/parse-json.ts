function findAllBalancedSegments(input: string, openChar: "{" | "[", closeChar: "}" | "]"): string[] {
  const segments: string[] = [];
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
        segments.push(input.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return segments;
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

/**
 * Repairs the pattern where an AI returns each key-value pair wrapped in its
 * own extra braces, e.g.:
 *   {"id1":{...},{"id2":{...},{"id3":{...}}
 * →  {"id1":{...},"id2":{...},"id3":{...}}
 *
 * Each `,{"` (value close + comma + extra open brace before a key) is replaced
 * with `},"` (just the separator comma). After removing N such extra braces, the
 * string has N extra trailing `}` characters that are stripped via depth counting.
 */
function repairExtraBraceWrapping(input: string): string {
  const fixed = input.replace(/\},\{"/g, '},"');
  if (fixed === input) return input; // pattern not found, no repair needed

  // Count brace depth (string-aware) to detect extra trailing }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const ch of fixed) {
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }

  // depth < 0 means there are |depth| extra } at the end; trim them
  return depth < 0 ? fixed.slice(0, depth) : fixed;
}

function extractCandidates(raw: string): string[] {
  const text = String(raw || "").trim();
  const candidates: string[] = [];

  // 1. Markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim());

  // 2. Repair extra-brace-wrapped keys before other strategies
  const repaired = repairExtraBraceWrapping(text);
  if (repaired !== text) candidates.push(repaired);

  // 3. All balanced objects/arrays
  const objects = findAllBalancedSegments(text, "{", "}");
  const arrays = findAllBalancedSegments(text, "[", "]");

  // If we found multiple objects but no array wrapper, try wrapping them
  if (objects.length > 1) {
    // Attempt to merge them if they are course metadata (object with numeric keys)
    candidates.push(`{${objects.map(obj => {
      const inner = obj.trim();
      return inner.startsWith("{") && inner.endsWith("}") ? inner.slice(1, -1) : inner;
    }).join(",")}}`);

    // Also try as an array
    candidates.push(`[${objects.join(",")}]`);
  }

  // Handle case like {"id":...},{"id":...} without outer braces
  if (text.includes("},{") || text.includes("}\n{")) {
    const multiMatch = text.replace(/\s+/g, " ");
    candidates.push(`[${multiMatch}]`);
    candidates.push(`{${multiMatch}}`);
  }

  if (objects.length > 0) candidates.push(objects[0]);
  if (arrays.length > 0) candidates.push(arrays[0]);

  candidates.push(text);

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

  // Final fallback: aggressive cleanup for common AI failures
  const aggressive = raw
    .replace(/^[^{[]+/, "") // remove prefix text
    .replace(/[^}\]]+$/, ""); // remove suffix text
  
  try {
    return JSON.parse(aggressive);
  } catch {
    // Ignore
  }

  throw lastError || new Error("Invalid JSON");
}

