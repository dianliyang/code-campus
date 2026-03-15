import { beforeEach, describe, expect, test, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const syncGitHubProfileFromSession = vi.fn();
const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/github/profile", () => ({
  syncGitHubProfileFromSession,
}));

describe("GET /auth/callback GitHub sync", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
      },
    });
  });

  test("syncs the GitHub profile after a successful code exchange and returns to identity", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        session: {
          provider_token: "github-token",
          user: { id: "user-123" },
        },
      },
    });

    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc&next=/identity"));

    expect(syncGitHubProfileFromSession).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_token: "github-token",
        user: expect.objectContaining({ id: "user-123" }),
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/identity");
  });

  test("keeps the callback successful when GitHub sync fails", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        session: {
          provider_token: "github-token",
          user: { id: "user-123" },
        },
      },
    });
    syncGitHubProfileFromSession.mockRejectedValue(new Error("GitHub sync failed"));

    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc&next=/identity"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/identity");
  });

  test("still attempts GitHub sync when provider_token is missing but user session exists", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        session: {
          user: { id: "user-123" },
        },
      },
    });

    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc&next=/identity"));

    expect(syncGitHubProfileFromSession).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: "user-123" }),
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/identity");
  });
});
