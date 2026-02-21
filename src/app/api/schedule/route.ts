import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getUser, createClient } from '@/lib/supabase/server';

interface ScheduleRequest {
  action: 'generate' | 'add_plan' | 'update_plan' | 'remove_plan' | 'toggle_complete' | 'get';
  // For add_plan / update_plan
  planId?: number;
  courseId?: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  location?: string;
  // For remove_plan
  // For toggle_complete
  date?: string; // The specific date of the instance
  notes?: string;
}

export async function POST(request: Request) {
  const user = await getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const body = await request.json() as ScheduleRequest;
    const { action } = body;
    
    console.log(`[Schedule API] Processing action: ${action} for user ${userId}`);

    const supabase = await createClient();

    // Generate default study plans for in-progress courses
    if (action === 'generate') {
      // Get all in-progress courses
      const { data: userCourses, error: fetchError } = await supabase
        .from('user_courses')
        .select(`
          course_id,
          courses(id, workload)
        `)
        .eq('user_id', userId)
        .eq('status', 'in_progress');

      if (fetchError) throw fetchError;

      if (!userCourses || userCourses.length === 0) {
        return NextResponse.json({ success: true, message: "No in-progress courses to schedule" });
      }

      // Clear existing plans
      await supabase.from('study_plans').delete().eq('user_id', userId);
      await supabase.from('study_logs').delete().eq('user_id', userId);

      // Simple heuristic: Distribute courses across the week
      // Pattern A: Mon, Wed, Fri
      // Pattern B: Tue, Thu, Sat
      // Pattern C: Sun (or stacked on other days)
      
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDateDate = new Date(today);
      endDateDate.setMonth(today.getMonth() + 4); // 4 months duration
      const endDate = endDateDate.toISOString().split('T')[0];

      const patterns = [
        { days: [1, 3, 5], start: '19:00:00', end: '21:00:00' }, // MWF Evening
        { days: [2, 4, 6], start: '19:00:00', end: '21:00:00' }, // TTS Evening
        { days: [1, 3, 5], start: '07:00:00', end: '09:00:00' }, // MWF Morning
        { days: [2, 4, 6], start: '07:00:00', end: '09:00:00' }, // TTS Morning
        { days: [0],       start: '14:00:00', end: '17:00:00' }, // Sun Afternoon
      ];

      const newPlans = userCourses.map((uc, index) => {
        const pattern = patterns[index % patterns.length];
        return {
          user_id: userId,
          course_id: uc.course_id,
          start_date: startDate,
          end_date: endDate,
          days_of_week: pattern.days,
          start_time: pattern.start,
          end_time: pattern.end,
          location: 'Home',
        };
      });

      if (newPlans.length > 0) {
        const { error: insertError } = await supabase
          .from('study_plans')
          .insert(newPlans);
        
        if (insertError) throw insertError;
      }

      revalidatePath('/study-plan');
      return NextResponse.json({ success: true, message: `Generated plans for ${userCourses.length} courses` });
    }

    // Get plans and logs
    if (action === 'get') {
      const { data: plans, error: plansError } = await supabase
        .from('study_plans')
        .select(`
          *,
          courses(id, title, course_code, university)
        `)
        .eq('user_id', userId);

      if (plansError) throw plansError;

      const { data: logs, error: logsError } = await supabase
        .from('study_logs')
        .select('*')
        .eq('user_id', userId);

      if (logsError) throw logsError;

      return NextResponse.json({ success: true, plans: plans || [], logs: logs || [] });
    }

    // Add a manual plan
    if (action === 'add_plan') {
      const { courseId, startDate, endDate, daysOfWeek, startTime, endTime, location } = body;
      
      if (!courseId || !startDate || !endDate || !daysOfWeek) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { error } = await supabase
        .from('study_plans')
        .insert({
          user_id: userId,
          course_id: courseId,
          start_date: startDate,
          end_date: endDate,
          days_of_week: daysOfWeek,
          start_time: startTime || '09:00:00',
          end_time: endTime || '11:00:00',
          location: location || 'Home'
        });

      if (error) throw error;
      revalidatePath('/study-plan');
      return NextResponse.json({ success: true, message: "Plan created" });
    }

    // Update a plan
    if (action === 'update_plan') {
      const { planId, startDate, endDate, daysOfWeek, startTime, endTime, location } = body;
      
      if (!planId || !startDate || !endDate || !daysOfWeek) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { error } = await supabase
        .from('study_plans')
        .update({
          start_date: startDate,
          end_date: endDate,
          days_of_week: daysOfWeek,
          start_time: startTime,
          end_time: endTime,
          location: location,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('user_id', userId);

      if (error) throw error;
      revalidatePath('/study-plan');
      return NextResponse.json({ success: true, message: "Plan updated" });
    }

    // Remove a plan
    if (action === 'remove_plan') {
      const { planId } = body;
      if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', userId);

      if (error) throw error;
      revalidatePath('/study-plan');
      return NextResponse.json({ success: true, message: "Plan removed" });
    }

    // Toggle completion (Log entry)
    if (action === 'toggle_complete') {
      const { planId, date } = body;
      if (!planId || !date) return NextResponse.json({ error: "planId and date required" }, { status: 400 });

      // Check if log exists
      const { data: existingLog, error: fetchError } = await supabase
        .from('study_logs')
        .select('id, is_completed')
        .match({ user_id: userId, plan_id: planId, log_date: date })
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // Ignore not found error

      if (existingLog) {
        // Toggle
        const { error } = await supabase
          .from('study_logs')
          .update({ is_completed: !existingLog.is_completed, updated_at: new Date().toISOString() })
          .eq('id', existingLog.id);
        if (error) throw error;
      } else {
        // Create new log as completed
        const { error } = await supabase
          .from('study_logs')
          .insert({
            user_id: userId,
            plan_id: planId,
            log_date: date,
            is_completed: true
          });
        if (error) throw error;
      }

      revalidatePath('/study-plan');
      return NextResponse.json({ success: true, message: "Completion toggled" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json({ error: "Failed to process schedule" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const userId = user.id;

  const { data: plans } = await supabase
    .from('study_plans')
    .select(`*, courses(id, title, course_code, university)`)
    .eq('user_id', userId);

  const { data: logs } = await supabase
    .from('study_logs')
    .select('*')
    .eq('user_id', userId);

  return NextResponse.json({ success: true, plans: plans || [], logs: logs || [] });
}