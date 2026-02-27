import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendStudyReminderEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting daily study reminder...');

    const supabase = createAdminClient();

    // Get today's date and day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay();

    console.log(`[Cron] Today: ${todayString}, Day of week: ${dayOfWeek}`);

    // Get all users with study plans for today
    const { data: plans, error: plansError } = await supabase
      .from('study_plans')
      .select(`
        id,
        user_id,
        start_time,
        end_time,
        location,
        kind,
        days_of_week,
        courses(id, title, course_code, university)
      `)
      .lte('start_date', todayString)
      .gte('end_date', todayString);

    if (plansError) {
      console.error('[Cron] Error fetching plans:', plansError);
      return NextResponse.json({ error: 'Failed to fetch plans', details: plansError }, { status: 500 });
    }

    if (!plans || plans.length === 0) {
      console.log('[Cron] No plans found for today');
      return NextResponse.json({ success: true, message: 'No plans for today', sent: 0 });
    }

    // Filter plans by day of week
    const todayPlans = plans.filter(plan =>
      plan.days_of_week && (plan.days_of_week as number[]).includes(dayOfWeek)
    );

    if (todayPlans.length === 0) {
      console.log('[Cron] No plans match today\'s day of week');
      return NextResponse.json({ success: true, message: 'No matching day plans', sent: 0 });
    }

    // Group plans by user
    const plansByUser = new Map<string, typeof todayPlans>();
    for (const plan of todayPlans) {
      if (!plansByUser.has(plan.user_id)) {
        plansByUser.set(plan.user_id, []);
      }
      plansByUser.get(plan.user_id)!.push(plan);
    }

    console.log(`[Cron] Found ${plansByUser.size} users with plans for today`);

    // Fetch all users once (instead of per-user in the loop)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('[Cron] Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users', details: usersError }, { status: 500 });
    }

    const usersById = new Map(users.map(u => [u.id, u]));

    let sentCount = 0;
    const errors: string[] = [];

    // Send emails to each user
    for (const [userId, userPlans] of plansByUser) {
      try {
        const user = usersById.get(userId);
        if (!user || !user.email) {
          console.warn(`[Cron] User ${userId} not found or no email`);
          errors.push(`User ${userId} has no email`);
          continue;
        }

        // Calculate duration for each course
        const emailCourses = userPlans
          .filter(plan => plan.courses != null)
          .map(plan => {
            const course = Array.isArray(plan.courses) ? plan.courses[0] : plan.courses;
            if (!course) return null;

            const startTime = plan.start_time || '09:00:00';
            const endTime = plan.end_time || '11:00:00';

            // Parse time and calculate duration in minutes
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

            return {
              title: course.title,
              courseCode: course.course_code,
              university: course.university,
              durationMinutes: Math.max(durationMinutes, 30), // Minimum 30 minutes
              location: plan.location || undefined,
              startTime: startTime.slice(0, 5), // HH:MM format
            };
          })
          .filter((course): course is NonNullable<typeof course> => course != null);

        if (emailCourses.length === 0) {
          console.warn(`[Cron] User ${userId} has no valid courses`);
          continue;
        }

        // Send email
        const result = await sendStudyReminderEmail({
          recipientEmail: user.email,
          recipientName: user.user_metadata?.name || user.email.split('@')[0],
          courses: emailCourses,
          date: today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        });

        if (result.success) {
          sentCount++;
          console.log(`[Cron] Sent email to ${user.email}`);
        } else {
          errors.push(`Failed to send email to ${user.email}`);
          console.error(`[Cron] Failed to send email to ${user.email}:`, result.error);
        }
      } catch (error) {
        console.error(`[Cron] Error processing user ${userId}:`, error);
        errors.push(`Error processing user ${userId}: ${error}`);
      }
    }

    console.log(`[Cron] Completed: Sent ${sentCount} emails`);

    return NextResponse.json({
      success: true,
      message: `Daily reminder job completed`,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('[Cron] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
