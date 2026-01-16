import { NextResponse } from 'next/server';
import { getUser, createClient } from '@/lib/supabase/server';

export async function GET() {
  const user = await getUser();
  
  if (!user) {
    return NextResponse.json({ enrolledIds: [] });
  }

  const userId = user.id;

  try {
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', userId);

    if (error) throw error;

    const enrolledIds = rows.map(r => Number(r.course_id));
    return NextResponse.json({ enrolledIds });
  } catch (error) {
    console.error("Error fetching user courses:", error);
    return NextResponse.json({ error: "Failed to fetch user courses" }, { status: 500 });
  }
}
