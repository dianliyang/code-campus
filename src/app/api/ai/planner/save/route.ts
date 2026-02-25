import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const preset = String(body?.preset || "").trim();
  const response = body?.response;
  const prompt = typeof body?.prompt === "string" ? body.prompt : null;
  const responseText = typeof body?.responseText === "string" ? body.responseText : null;
  const provider = typeof body?.provider === "string" ? body.provider : null;
  const model = typeof body?.model === "string" ? body.model : null;
  const tokensInput = Number(body?.tokensInput || 0);
  const tokensOutput = Number(body?.tokensOutput || 0);
  const costUsd = Number(body?.costUsd || 0);

  if (!preset || !response) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ai_planner_responses")
    .insert({
      user_id: user.id,
      feature: "planner",
      preset,
      response,
      prompt,
      response_text: responseText,
      provider,
      model,
      tokens_input: Number.isFinite(tokensInput) ? tokensInput : 0,
      tokens_output: Number.isFinite(tokensOutput) ? tokensOutput : 0,
      cost_usd: Number.isFinite(costUsd) ? costUsd : 0,
      request_payload: typeof body?.requestPayload === "object" && body?.requestPayload ? body.requestPayload : {},
      response_payload: typeof body?.responsePayload === "object" && body?.responsePayload ? body.responsePayload : {},
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
