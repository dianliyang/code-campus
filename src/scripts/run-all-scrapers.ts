import { MIT } from '../lib/scrapers/mit';
import { Stanford } from '../lib/scrapers/stanford';
import { CMU } from '../lib/scrapers/cmu';
import { UCB } from '../lib/scrapers/ucb';
import { D1Database } from '../lib/db';
import { BaseScraper } from '../lib/scrapers/BaseScraper';

async function runScraper(scraper: BaseScraper, db: D1Database) {
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
  const db = new D1Database();
  const scrapers: BaseScraper[] = [
    new MIT(),
    new Stanford(),
    new CMU(),
    new UCB()
  ];

  console.log("Starting full scrape for all universities...");
  console.log(`Target: ${process.env.REMOTE_DB === 'true' ? 'REMOTE' : 'LOCAL'} D1 Database`);

  for (const scraper of scrapers) {
    await runScraper(scraper, db);
  }

  console.log("\nAll scrapers finished.");
}

main();
