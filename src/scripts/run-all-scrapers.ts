import { MIT } from '../lib/scrapers/mit';
import { Stanford } from '../lib/scrapers/stanford';
import { CMU } from '../lib/scrapers/cmu';
import { UCB } from '../lib/scrapers/ucb';
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

async function main() {
  const db = new SupabaseDatabase();
  const scrapers: BaseScraper[] = [
    new MIT(),
    new Stanford(),
    new CMU(),
    new UCB()
  ];

  console.log("Starting full scrape for all universities...");
  console.log(`Target: Supabase Database`);

  for (const scraper of scrapers) {
    await runScraper(scraper, db);
  }

  console.log("\nAll scrapers finished.");
}

main();
