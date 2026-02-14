import { MIT } from '../lib/scrapers/mit';
import { Stanford } from '../lib/scrapers/stanford';
import { CMU } from '../lib/scrapers/cmu';
import { UCB } from '../lib/scrapers/ucb';
import { CAU } from '../lib/scrapers/cau';
import { CAUSport } from '../lib/scrapers/cau-sport';
import { SupabaseDatabase } from '../lib/supabase/server';
import { BaseScraper } from '../lib/scrapers/BaseScraper';

async function runScraper(scraper: BaseScraper, db: SupabaseDatabase) {
  try {
    console.log(`\n=== Running Scraper: ${scraper.name.toUpperCase()} ===`);
    const courses = await scraper.retrieve();
    console.log(`Successfully scraped ${courses.length} courses from ${scraper.name}.`);

    if (courses.length > 0) {
      await db.saveCourses(courses);
      console.log(`Completed ${scraper.name}.`);
    }
  } catch (error) {
    console.error(`Failed to run scraper for ${scraper.name}:`, error);
  }
}

async function runWorkoutScraper(db: SupabaseDatabase) {
  try {
    const scraper = new CAUSport();
    console.log(`\n=== Running Scraper: ${scraper.name.toUpperCase()} ===`);
    const workouts = await scraper.retrieveWorkouts();
    console.log(`Successfully scraped ${workouts.length} workouts from ${scraper.name}.`);

    if (workouts.length > 0) {
      await db.saveWorkouts(workouts);
      console.log(`Completed ${scraper.name}.`);
    }
  } catch (error) {
    console.error(`Failed to run workout scraper:`, error);
  }
}

async function main() {
  const db = new SupabaseDatabase();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const semesterArg = args.find(arg => arg.startsWith('--semester='));
  const semester = semesterArg ? semesterArg.split('=')[1] : 'fa25';

  const scrapers: BaseScraper[] = [
    new MIT(),
    new Stanford(),
    new CMU(),
    new UCB(),
    new CAU()
  ];

  console.log(`Starting full scrape for all universities... (Semester: ${semester})`);
  console.log(`Target: Supabase Database`);

  for (const scraper of scrapers) {
    scraper.semester = semester;
    await runScraper(scraper, db);
  }

  // Run workout scraper (separate table)
  await runWorkoutScraper(db);

  console.log("\nAll scrapers finished.");
}

main();
