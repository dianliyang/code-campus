import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/actions/language", () => ({
  getLanguage: vi.fn(async () => "en"),
}));

vi.mock("@/lib/dictionary", () => ({
  getDictionary: vi.fn(async () => ({
    hero: {
      system_status: "Open Catalog // Beta",
      title_prefix: "Find the Best",
      title_highlight: "CS",
      title_suffix: "Courses",
      description: "Explore and compare computer science curricula in one index.",
      cta: "Browse Courses",
    },
    mission: {
      label: "Project Overview",
      title_prefix: "A Simple Index",
      title_middle: "for",
      title_highlight: "Computer Science",
      desc_1: "We gather public course catalogs into one search surface.",
      desc_2: "We organize requirements and difficulty signals.",
      stat_sources: "Schools",
      stat_nodes: "Courses",
    },
    features: {
      universal_index: { title: "All in One Place", desc: "Combined cross-school catalog search." },
      progress_analytics: { title: "Track Your Learning", desc: "Simple progress logging." },
      gap_analysis: { title: "Plan Your Path", desc: "Compare progress against requirements." },
    },
    universities: {
      label: "Including Public Catalogs From",
    },
    navbar: {},
    footer: {
      copyright: "© 2026 CodeCampus Catalog",
    },
  })),
}));

vi.mock("@/components/layout/LandingNavbar", () => ({
  default: () => <div>navbar</div>,
}));

vi.mock("@/components/layout/LandingFooter", () => ({
  default: () => <div>footer</div>,
}));

describe("Landing page redesign", () => {
  test("renders demo-style hero and curriculum without pricing section", async () => {
    const { default: Home } = await import("@/app/page");
    const view = await Home();
    render(view);

    expect(screen.getAllByText("Project Overview").length).toBeGreaterThan(0);
    expect(screen.getByText("The Curriculum")).toBeDefined();
    expect(screen.getAllByText("All in One Place").length).toBeGreaterThan(0);
    expect(screen.queryByText("Simple Pricing")).toBeNull();
  });
});
