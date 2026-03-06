import React from "react";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Landing page redesign", () => {
  test("renders architecture hero and relational knowledge section", async () => {
    const { default: Home } = await import("@/app/page");
    render(<Home />);

    expect(screen.getAllByText("Athena").length).toBeGreaterThan(0);
    expect(screen.getByText("Relational Knowledge Base")).toBeDefined();
    expect(screen.getByText("The architecture of your", { exact: false })).toBeDefined();
  });
});
