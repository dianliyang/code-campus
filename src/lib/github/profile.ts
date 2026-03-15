import { createAdminClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

export type GitHubUserProfile = {
  id: number | string;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  html_url?: string | null;
  bio?: string | null;
  company?: string | null;
  [key: string]: unknown;
};

export type GitHubProfileSnapshot = Database["public"]["Tables"]["user_connected_profiles"]["Row"];
export type GitHubProfileSnapshotInsert =
  Database["public"]["Tables"]["user_connected_profiles"]["Insert"];

type SessionLike = {
  provider_token?: string | null;
  user?: {
    id?: string | null;
    user_metadata?: Record<string, unknown> | null;
    identities?: Array<{
      provider?: string | null;
      id?: string | null;
      identity_data?: Record<string, unknown> | null;
    }> | null;
  } | null;
};

function deriveGitHubProfileFromSessionUser(
  user: SessionLike["user"],
): GitHubUserProfile | null {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const githubIdentity = identities.find((identity) => identity?.provider === "github");
  const identityData = githubIdentity?.identity_data || {};
  const userMetadata = user?.user_metadata || {};

  const providerUserId = String(
    identityData.sub ||
      identityData.id ||
      githubIdentity?.id ||
      "",
  ).trim();
  const login = String(
    identityData.user_name ||
      identityData.preferred_username ||
      userMetadata.user_name ||
      userMetadata.preferred_username ||
      "",
  ).trim();

  if (!providerUserId || !login) {
    return null;
  }

  return {
    id: providerUserId,
    login,
    name: typeof identityData.full_name === "string"
      ? identityData.full_name
      : typeof userMetadata.full_name === "string"
        ? userMetadata.full_name
        : null,
    avatar_url: typeof identityData.avatar_url === "string"
      ? identityData.avatar_url
      : typeof userMetadata.avatar_url === "string"
        ? userMetadata.avatar_url
        : null,
    html_url: typeof identityData.profile_url === "string"
      ? identityData.profile_url
      : typeof identityData.user_name === "string"
        ? `https://github.com/${identityData.user_name}`
        : typeof userMetadata.user_name === "string"
          ? `https://github.com/${userMetadata.user_name}`
          : null,
    bio: null,
    company: null,
  };
}

export function mapGitHubProfileSnapshot(
  userId: string,
  profile: GitHubUserProfile,
): GitHubProfileSnapshotInsert {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    provider: "github",
    provider_user_id: String(profile.id),
    login: profile.login,
    name: profile.name ?? null,
    avatar_url: profile.avatar_url ?? null,
    profile_url: profile.html_url ?? null,
    bio: profile.bio ?? null,
    company: profile.company ?? null,
    raw_profile: profile as Json,
    updated_at: now,
    created_at: now,
  };
}

export async function fetchGitHubProfile(
  accessToken: string,
): Promise<GitHubUserProfile> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "AthenaGitHubConnect/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub profile request failed with status ${response.status}`);
  }

  return (await response.json()) as GitHubUserProfile;
}

export async function upsertGitHubProfileSnapshot(
  userId: string,
  profile: GitHubUserProfile,
): Promise<void> {
  const admin = createAdminClient();
  const payload = mapGitHubProfileSnapshot(userId, profile);
  const { error } = await admin
    .from("user_connected_profiles")
    .upsert(payload, { onConflict: "user_id,provider" });

  if (error) {
    throw new Error(error.message || "Failed to save GitHub profile snapshot");
  }
}

export async function syncGitHubProfileFromSession(
  session: SessionLike | null | undefined,
): Promise<void> {
  const accessToken = String(session?.provider_token || "").trim();
  const userId = String(session?.user?.id || "").trim();

  if (!userId) {
    return;
  }

  const profile = accessToken
    ? await fetchGitHubProfile(accessToken)
    : deriveGitHubProfileFromSessionUser(session?.user);

  if (!profile) {
    return;
  }

  await upsertGitHubProfileSnapshot(userId, profile);
}
