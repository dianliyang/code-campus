import { NextResponse } from 'next/server';
import { getUser, createClient } from '@/lib/supabase/server';

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const supabase = await createClient();
    
    // Delete user data from user_courses
    const { error: deleteError } = await supabase
      .from('user_courses')
      .delete()
      .eq('user_id', userId);
      
    if (deleteError) throw deleteError;
    
    // Note: To delete the user from Supabase Auth, you would typically use 
    // supabase.auth.admin.deleteUser(userId) which requires a service role key.
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: "Account data cleared successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
