import { NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const calls = Math.max(0, Math.floor(Number(body?.calls || 0)));
  const tokens = Math.max(0, Math.floor(Number(body?.tokens || 0)));

  if (calls === 0 && tokens === 0) {
    return NextResponse.json({ success: true });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_ai_usage", {
    p_user_id: user.id,
    p_calls: calls,
    p_tokens: tokens,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ai_usage_calls: 0, ai_usage_tokens: 0, ai_usage_updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
