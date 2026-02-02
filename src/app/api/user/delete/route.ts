import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();

    // Delete the user from Supabase Auth
    // FK cascades (ON DELETE CASCADE) will auto-clean user_courses, study_plans, study_logs
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
