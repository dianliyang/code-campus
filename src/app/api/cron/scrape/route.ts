import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseDatabase } from '@/lib/supabase/server';
import { MIT } from '@/lib/scrapers/mit';
import { Stanford } from '@/lib/scrapers/stanford';
import { CMU } from '@/lib/scrapers/cmu';
import { UCB } from '@/lib/scrapers/ucb';
import { BaseScraper } from '@/lib/scrapers/BaseScraper';

const SCRAPER_MAP: Record<string, () => BaseScraper> = {
  MIT: () => new MIT(),
  Stanford: () => new Stanford(),
  CMU: () => new CMU(),
  'UC Berkeley': () => new UCB(),
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Find the next pending job
    const { data: job, error: fetchError } = await supabase
      .from('scraper_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ message: 'No pending scraper jobs' });
    }

    // Mark as running
    await supabase
      .from('scraper_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', job.id);

    const createScraper = SCRAPER_MAP[job.university];
    if (!createScraper) {
      await supabase
        .from('scraper_jobs')
        .update({ status: 'failed', error: `Unknown university: ${job.university}`, completed_at: new Date().toISOString() })
        .eq('id', job.id);
      return NextResponse.json({ error: `Unknown university: ${job.university}` }, { status: 400 });
    }

    const scraper = createScraper();
    const courses = await scraper.retrieve();

    const db = new SupabaseDatabase();
    await db.saveCourses(courses);

    await supabase
      .from('scraper_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        course_count: courses.length,
      })
      .eq('id', job.id);

    return NextResponse.json({
      success: true,
      university: job.university,
      courseCount: courses.length,
    });
  } catch (error) {
    console.error('[Cron/Scrape] Error:', error);
    return NextResponse.json({ error: 'Scraper job failed' }, { status: 500 });
  }
}
