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

  test("repairs extra-brace-wrapped keys from AI output", () => {
    // AI sometimes outputs: {"id1":{...},{"id2":{...},{"id3":{...}}
    // instead of:           {"id1":{...},"id2":{...},"id3":{...}}
    const input = '{"6983":{"subdomain":"AI","topics":["A","B"]},{"9035":{"subdomain":"SE","topics":["C","D"]},{"10176":{"subdomain":"AI","topics":["E","F"]}}}';
    const parsed = parseLenientJson(input) as Record<string, unknown>;
    expect(parsed["6983"]).toEqual({ subdomain: "AI", topics: ["A", "B"] });
    expect(parsed["9035"]).toEqual({ subdomain: "SE", topics: ["C", "D"] });
    expect(parsed["10176"]).toEqual({ subdomain: "AI", topics: ["E", "F"] });
  });
});

