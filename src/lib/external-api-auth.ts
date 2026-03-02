import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHash } from "node:crypto";

type AuthResult =
  | { ok: true; keyId: number | null }
  | { ok: false; status: number; error: string };

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = String((error as { message?: unknown }).message || "").toLowerCase();
  const code = String((error as { code?: unknown }).code || "");
  return code === "42P01" || (msg.includes("relation") && msg.includes("user_api_keys") && msg.includes("does not exist"));
}

export async function authorizeExternalRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("x-api-key");
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!authHeader || !authHeader.trim()) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (internalKey && authHeader === internalKey) {
    return { ok: true, keyId: null };
  }

  const supabase = createAdminClient();
  // user_api_keys may not yet be present in generated database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const keyHash = hashKey(authHeader);

  const { data, error } = await db
    .from("user_api_keys")
    .select("id, is_active, requests_limit, requests_used")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }
    return { ok: false, status: 500, error: "Database error" };
  }

  if (!data || data.is_active !== true) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const used = Number(data.requests_used || 0);
  const limit = data.requests_limit == null ? null : Number(data.requests_limit);
  if (limit !== null && used >= limit) {
    return { ok: false, status: 429, error: "API key limit reached" };
  }

  const { error: updateError } = await db
    .from("user_api_keys")
    .update({ requests_used: used + 1, last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  if (updateError) {
    return { ok: false, status: 500, error: "Database error" };
  }

  return { ok: true, keyId: Number(data.id) };
}
