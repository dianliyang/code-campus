import React from "react";
import { describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import LandingNavbar from "@/components/layout/LandingNavbar";
import FloatingNavWrapper from "@/components/layout/FloatingNavWrapper";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt || ""} />
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  }),
}));

describe("Landing navbar branding and transition", () => {
  test("uses black and white logo asset", async () => {
    render(
      <LandingNavbar
        dict={{ mission: "About", universities: "Schools", curriculum: "Features", enter: "Browse" }}
      />,
    );

    const logo = await screen.findByAltText("CodeCampus");
    expect((logo as HTMLImageElement).getAttribute("src")).toContain("/code-campus-logo-bw.svg");
  });

  test("floating wrapper switches to scrolled shell on scroll", () => {
    render(
      <FloatingNavWrapper>
        {(scrolled) => <div data-testid="nav-state">{scrolled ? "scrolled" : "top"}</div>}
      </FloatingNavWrapper>,
    );

    expect(screen.getByTestId("nav-state").textContent).toBe("top");

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 40, writable: true, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByTestId("nav-state").textContent).toBe("scrolled");
  });
});
