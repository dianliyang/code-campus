import { describe, expect, test } from "vitest";
import { externalApiOpenApiSpec } from "@/lib/external-api-openapi";

describe("externalApiOpenApiSpec", () => {
  test("documents status on the external course schema", () => {
    expect(
      externalApiOpenApiSpec.components.schemas.Course.properties.status,
    ).toEqual({ type: "string", nullable: true });
  });

  test("documents numeric schedule weekdays on the external course schema", () => {
    expect(
      externalApiOpenApiSpec.components.schemas.ExternalSchedule.properties.daysOfWeek,
    ).toEqual({ type: "array", items: { type: "integer" } });
  });
});
