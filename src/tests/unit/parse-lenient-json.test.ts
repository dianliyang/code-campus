import { describe, expect, test } from "vitest";
import { parseLenientJson } from "@/lib/ai/parse-json";

describe("parseLenientJson", () => {
  test("parses standard json object", () => {
    const parsed = parseLenientJson("{\"track\":\"AI Infra\"}") as Record<string, unknown>;
    expect(parsed.track).toBe("AI Infra");
  });

  test("parses fenced json with prose", () => {
    const input = "Here is the result:\n```json\n{\"track\":\"ML Systems\"}\n```";
    const parsed = parseLenientJson(input) as Record<string, unknown>;
    expect(parsed.track).toBe("ML Systems");
  });

  test("parses object with trailing commas", () => {
    const input = "{\"track\":\"Data Engineering\",\"roadmap\":[{\"phase\":\"P1\",}],}";
    const parsed = parseLenientJson(input) as Record<string, unknown>;
    expect(parsed.track).toBe("Data Engineering");
  });

  test("parses multiple root objects separated by commas", () => {
    const input = "{\"1\":{\"val\":1}},{\"2\":{\"val\":2}}";
    const parsed = parseLenientJson(input) as Record<string, unknown>;
    expect(parsed).toEqual({ "1": { "val": 1 }, "2": { "val": 2 } });
  });

  test("parses multiple root objects separated by newline", () => {
    const input = "{\"1\":{\"val\":1}}\n{\"2\":{\"val\":2}}";
    const parsed = parseLenientJson(input) as Record<string, unknown>;
    expect(parsed).toEqual({ "1": { "val": 1 }, "2": { "val": 2 } });
  });

  test("aggressive cleanup of non-json prefix/suffix", () => {
    const input = "Result is: {\"track\":\"Aggressive\"} !!!";
    const parsed = parseLenientJson(input) as Record<string, unknown>;
    expect(parsed.track).toBe("Aggressive");
  });
});

