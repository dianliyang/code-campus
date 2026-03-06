import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DashboardError from "@/app/(dashboard)/error";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

describe("DashboardError", () => {
  test("renders the calmer retry card", () => {
    const reset = vi.fn();

    render(<DashboardError error={new Error("boom")} reset={reset} />);

    const wrapper = screen.getByText("Something interrupted the dashboard").closest("div");

    expect(screen.getByText("Something interrupted the dashboard")).toBeDefined();
    expect(wrapper?.className || "").not.toContain("border");
    expect(wrapper?.className || "").not.toContain("bg-");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /back to courses/i }).getAttribute("href")).toBe("/courses");
  });
});
