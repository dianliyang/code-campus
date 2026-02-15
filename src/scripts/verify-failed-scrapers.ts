import { CMU } from '../lib/scrapers/cmu';
import { UCB } from '../lib/scrapers/ucb';
import { CAU } from '../lib/scrapers/cau';
import { BaseScraper } from '../lib/scrapers/BaseScraper';
import { SupabaseDatabase } from '../lib/supabase/server';

async function verifyScraper(scraper: BaseScraper, db: SupabaseDatabase) {
  console.log(`\n=== Verifying Scraper: ${scraper.name.toUpperCase()} ===`);
  try {
    scraper.db = db;
    const links = await scraper.links();
    console.log(`[${scraper.name}] Found ${links.length} links.`);
    
    if (scraper.name === 'cmu') {
       const courses = await scraper.retrieve();
       console.log(`[${scraper.name}] SUCCESS: Parsed ${courses.length} courses.`);
    } else if (links.length > 0) {
       const testLink = links[0];
       console.log(`[${scraper.name}] Testing: ${testLink}`);
       const html = await scraper.fetchPage(testLink);
       if (!html) return;
       const courses = await scraper.parser(html);
       console.log(`[${scraper.name}] SUCCESS: Parsed ${courses.length} courses.`);
    }
  } catch (error) {
    console.error(`[${scraper.name}] FAILED:`, error);
  }
}

async function main() {
  const db = new SupabaseDatabase();
  const semester = 'fa25';
  const scrapers: BaseScraper[] = [
    new CMU(),
    new UCB(),
    new CAU()
  ];
  for (const scraper of scrapers) {
    scraper.semester = semester;
    await verifyScraper(scraper, db);
  }
}
main();
