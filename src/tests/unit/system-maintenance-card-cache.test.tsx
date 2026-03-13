import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { resetCachedJsonResourceCache } from "@/hooks/useCachedJsonResource";

const fetchMock = vi.fn();

vi.mock("@/actions/scrapers", () => ({
  runManualScraperAction: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; unoptimized?: boolean }) => <img alt={alt} src={src} {...props} />, // eslint-disable-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return {};
      },
    }),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("SystemMaintenanceCard cache behavior", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.sessionStorage.clear();
    resetCachedJsonResourceCache();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      json: async () => ({
        items: [
          {
            id: 11,
            university: "MIT",
            semester: "2026",
            status: "success",
            job_type: "manual",
            triggered_by: "user",
            course_count: 12,
            duration_ms: 1000,
            error: null,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  test("renders cached recent runs immediately and refreshes in the background", async () => {
    window.sessionStorage.setItem(
      "cc:cached-json:scraper-jobs",
      JSON.stringify({
        cachedAt: Date.now(),
        data: {
          items: [
            {
              id: 21,
              university: "Stanford",
              semester: "2026",
              status: "success",
              job_type: "manual",
              triggered_by: "user",
              course_count: 7,
              duration_ms: 800,
              error: null,
            },
          ],
        },
      }),
    );

    const { default: SystemMaintenanceCard } = await import("@/components/identity/SystemMaintenanceCard");

    render(<SystemMaintenanceCard />);

    expect(screen.getByText(/STANFORD/)).toBeDefined();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/scraper-jobs/recent", { cache: "no-store" });
    });
  });

  test("uses its own vertical scroll container so the full recent runs list remains reachable", async () => {
    const { default: SystemMaintenanceCard } = await import("@/components/identity/SystemMaintenanceCard");

    const { getByTestId } = render(<SystemMaintenanceCard />);

    expect(getByTestId("system-maintenance-scroll").className).toContain("overflow-y-auto");
    expect(getByTestId("system-maintenance-scroll").className).toContain("min-h-0");
  });

  test("renders institution toggles as fixed-size logo tiles with accessible names", async () => {
    const { default: SystemMaintenanceCard } = await import("@/components/identity/SystemMaintenanceCard");

    render(<SystemMaintenanceCard />);

    const mitToggle = screen.getByRole("button", { name: "MIT" });
    expect(mitToggle.className).toContain("h-20");
    expect(mitToggle.className).toContain("w-full");
    expect(screen.queryByRole("button", { name: "CAU Sport" })).toBeNull();

    const stanfordLogo = screen.getByAltText("Stanford");
    expect(stanfordLogo.getAttribute("src")).toBe("/stanford-text.png");
    expect(stanfordLogo.className).toContain("h-auto");
    expect(stanfordLogo.className).toContain("max-h-8");
    expect(stanfordLogo.className).toContain("max-w-[72%]");

    const cmuLogo = screen.getByAltText("CMU");
    expect(cmuLogo.getAttribute("src")).toBe("/cmu-text.svg");
  });
});
