import { NextResponse } from 'next/server';
import { runD1, queryD1 } from '@/lib/d1';
import { auth } from '@/auth';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { courseId, action } = body; // action: 'enroll' | 'unenroll' | 'update_progress'
    const progress = body.progress ?? 0;

    const user = await queryD1<{ id: number }>('SELECT id FROM users WHERE email = ?', [session.user.email]);
    
    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user[0].id;

    if (action === 'enroll') {
      await runD1(
        `INSERT INTO user_courses (user_id, course_id, status, progress) 
         VALUES (?, ?, 'in_progress', ?)
         ON CONFLICT(user_id, course_id) DO UPDATE SET 
         status = 'in_progress', 
         updated_at = CURRENT_TIMESTAMP`,
        [userId, courseId, progress]
      );
      return NextResponse.json({ success: true, message: "Enrolled successfully" });
    } 
    
    if (action === 'unenroll') {
      await runD1('DELETE FROM user_courses WHERE user_id = ? AND course_id = ?', [userId, courseId]);
      return NextResponse.json({ success: true, message: "Unenrolled successfully" });
    }

    if (action === 'update_progress') {
      const isCompleted = progress === 100;
      const status = isCompleted ? 'completed' : 'in_progress';

      // Update enrollment progress and status
      await runD1(
        'UPDATE user_courses SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND course_id = ?',
        [progress, status, userId, courseId]
      );

      // If just completed, increment popularity
      if (isCompleted) {
        await runD1('UPDATE courses SET popularity = popularity + 1 WHERE id = ?', [courseId]);
      }

      return NextResponse.json({ success: true, message: "Progress updated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json({ error: "Failed to process enrollment" }, { status: 500 });
  }
}
