import { CAU } from '../lib/scrapers/cau';
import { SupabaseDatabase } from '../lib/supabase/server';

async function main() {
  const scraper = new CAU();
  console.log(`Running scraper for ${scraper.name}...`);
  const courses = await scraper.retrieve();
  
  if (courses.length > 0) {
      console.log(`Saving ${courses.length} courses to Supabase...`);
      const db = new SupabaseDatabase();
      await db.saveCourses(courses);
      console.log('Courses saved successfully.');
  } else {
      console.log('No courses found to save.');
  }
}

main().catch(console.error);
