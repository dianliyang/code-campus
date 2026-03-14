import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

const signInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOAuth,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("SecurityIdentitySection GitHub profile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cleanup();
  });

  test("renders a connect CTA when GitHub is not connected", async () => {
    const { default: SecurityIdentitySection } = await import("@/components/identity/SecurityIdentitySection");

    render(<SecurityIdentitySection view="identity" provider="email" githubProfile={null} />);

    expect(screen.getByText("Developer Node")).toBeDefined();
    expect(screen.getByRole("button", { name: "Connect GitHub" })).toBeDefined();
  });

  test("renders the synced GitHub profile details when connected", async () => {
    const { default: SecurityIdentitySection } = await import("@/components/identity/SecurityIdentitySection");

    render(
      <SecurityIdentitySection
        view="identity"
        provider="email"
        githubProfile={{
          provider: "github",
          login: "octocat",
          name: "The Octocat",
          profile_url: "https://github.com/octocat",
          avatar_url: "https://avatars.githubusercontent.com/u/42?v=4",
          bio: "Mascot",
          company: "@github",
          updated_at: "2026-03-11T14:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("The Octocat")).toBeDefined();
    expect(screen.getByText("@octocat")).toBeDefined();
    expect(screen.getByText(/Mascot/)).toBeDefined();
    expect(screen.getByRole("link", { name: /view profile/i }).getAttribute("href")).toBe(
      "https://github.com/octocat",
    );
  });

  test("starts GitHub OAuth from the connect CTA", async () => {
    const { default: SecurityIdentitySection } = await import("@/components/identity/SecurityIdentitySection");

    render(<SecurityIdentitySection view="identity" provider="email" githubProfile={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Connect GitHub" }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "github",
          options: expect.objectContaining({
            redirectTo: "http://localhost:3000/auth/callback?next=/identity",
          }),
        }),
      );
    });
  });

  test("removes the decorative danger-zone access panel", async () => {
    const { default: SecurityIdentitySection } = await import("@/components/identity/SecurityIdentitySection");

    render(<SecurityIdentitySection view="account" provider="email" />);

    expect(screen.getByText("Danger Zone")).toBeDefined();
    expect(screen.queryByText("Authorized Access Only")).toBeNull();
  });
});

describe("SecurityIdentitySection source contract", () => {
  test("removes the nested bordered wrappers from the identity and danger-zone cards", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/identity/SecurityIdentitySection.tsx"),
      "utf8",
    );

    expect(source).not.toContain("p-3 rounded-lg border bg-slate-50/50");
    expect(source).not.toContain("border border-rose-100 bg-rose-50/30");
    expect(source).not.toContain("Authorized Access Only");
  });
});
