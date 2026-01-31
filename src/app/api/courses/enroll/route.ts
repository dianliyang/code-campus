import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getUser, createClient, incrementPopularity, decrementPopularity } from '@/lib/supabase/server';
import { EnrollRequest } from '@/types';

export async function POST(request: Request) {
  const user = await getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const body = await request.json() as EnrollRequest;
    const { courseId, action } = body; // action: 'enroll' | 'unenroll' | 'update_progress'
    const progress = body.progress ?? 0;
    
    console.log(`[Enroll API] Processing action: ${action} for course ${courseId} user ${userId}`);

    const supabase = await createClient();

    if (action === 'enroll') {
      const { error } = await supabase
        .from('user_courses')
        .upsert({ 
          user_id: userId, 
          course_id: courseId, 
          status: 'in_progress', 
          progress: progress,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      revalidatePath('/courses');
      revalidatePath('/study-plan');
      return NextResponse.json({ success: true, message: "Enrolled successfully" });
    }

    if (action === 'unenroll') {
      const { error } = await supabase
        .from('user_courses')
        .delete()
        .match({ user_id: userId, course_id: courseId });
        
      if (error) throw error;
      revalidatePath('/courses');
      revalidatePath('/study-plan');
      return NextResponse.json({ success: true, message: "Unenrolled successfully" });
    }

    if (action === 'update_progress') {
      const isCompleted = progress === 100;
      const status = isCompleted ? 'completed' : 'in_progress';
      const { gpa, score } = body;

      const updateData: {
        progress: number;
        status: string;
        updated_at: string;
        gpa?: number;
        score?: number;
      } = { 
        progress: progress, 
        status: status, 
        updated_at: new Date().toISOString() 
      };

      if (isCompleted) {
        updateData.gpa = gpa ?? 0;
        updateData.score = score ?? 0;
      }

      // Read previous user_course row to determine if we need to adjust popularity
      const { data: prevRow, error: prevError } = await supabase
        .from('user_courses')
        .select('status')
        .match({ user_id: userId, course_id: courseId })
        .single();

      if (prevError && prevError.code !== 'PGRST116') throw prevError;

      const { error } = await supabase
        .from('user_courses')
        .update(updateData)
        .match({ user_id: userId, course_id: courseId });

      if (error) throw error;

      // If we just marked completed, increment popularity. If we changed from completed -> in_progress, decrement.
      if (isCompleted) {
        await incrementPopularity(courseId);
      } else if (prevRow && prevRow.status === 'completed' && !isCompleted) {
        // We moved from completed -> in_progress
        // Decrement popularity but ensure function exists
        try {
          await decrementPopularity(courseId);
        } catch (e) {
          console.warn('Failed to decrement popularity:', e);
        }
      }

      revalidatePath('/study-plan');
      revalidatePath('/profile');
      return NextResponse.json({ success: true, message: "Progress updated" });
    }

    if (action === 'hide') {
      const { error } = await supabase
        .from('user_courses')
        .upsert({ 
          user_id: userId, 
          course_id: courseId, 
          status: 'hidden', 
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      revalidatePath('/courses');
      return NextResponse.json({ success: true, message: "Course hidden" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json({ error: "Failed to process enrollment" }, { status: 500 });
  }
}