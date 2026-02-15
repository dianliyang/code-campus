import { MIT } from '../lib/scrapers/mit';
import { Stanford } from '../lib/scrapers/stanford';
import { CMU } from '../lib/scrapers/cmu';
import { UCB } from '../lib/scrapers/ucb';
import { CAU } from '../lib/scrapers/cau';
import { BaseScraper } from '../lib/scrapers/BaseScraper';

async function verifyScraper(scraper: BaseScraper) {
  console.log(`\n=== Verifying Scraper: ${scraper.name.toUpperCase()} ===`);
  try {
    // 1. Check Link Discovery
    console.log(`[${scraper.name}] Discovering links...`);
    const links = await scraper.links();
    console.log(`[${scraper.name}] Found ${links.length} links.`);
    
    if (links.length === 0 && scraper.name !== 'stanford' && scraper.name !== 'cmu') {
      console.error(`[${scraper.name}] ERROR: No links discovered!`);
      return;
    }

    // 2. Test Fetch and Parse (First Link Only)
    if (scraper.name === 'cmu') {
       console.log(`[${scraper.name}] CMU uses POST search. Running full retrieve (CS/ECE only)...`);
       const courses = await scraper.retrieve();
       console.log(`[${scraper.name}] SUCCESS: Parsed ${courses.length} courses.`);
       if (courses.length > 0) {
         console.log(`[${scraper.name}] Sample Course: ${courses[0].courseCode} - ${courses[0].title}`);
       }
    } else if (scraper.name === 'stanford') {
       console.log(`[${scraper.name}] Stanford uses search. Retrieving Autumn 2025 CS...`);
       const courses = await scraper.retrieve();
       console.log(`[${scraper.name}] SUCCESS: Parsed ${courses.length} courses.`);
       if (courses.length > 0) {
         console.log(`[${scraper.name}] Sample Course: ${courses[0].courseCode} - ${courses[0].title}`);
       }
    } else {
       const testLink = links[0];
       console.log(`[${scraper.name}] Testing fetch/parse on: ${testLink}`);
       const html = await scraper.fetchPage(testLink);
       if (!html) {
         console.error(`[${scraper.name}] ERROR: Failed to fetch page content!`);
         return;
       }
       console.log(`[${scraper.name}] Page fetched (${html.length} chars). Parsing...`);
       const courses = await scraper.parser(html);
       console.log(`[${scraper.name}] SUCCESS: Parsed ${courses.length} courses.`);
       if (courses.length > 0) {
         console.log(`[${scraper.name}] Sample Course: ${courses[0].courseCode} - ${courses[0].title}`);
       } else {
         console.warn(`[${scraper.name}] WARNING: Parser returned 0 courses. HTML might have changed.`);
       }
    }
  } catch (error) {
    console.error(`[${scraper.name}] FAILED with error:`, error);
  }
}

async function main() {
  const semester = 'fa25';
  console.log(`Starting verification for all scrapers (Semester: ${semester})...\n`);

  const scrapers: BaseScraper[] = [
    new MIT(),
    new Stanford(),
    new CMU(),
    new UCB(),
    new CAU()
  ];

  for (const scraper of scrapers) {
    scraper.semester = semester;
    await verifyScraper(scraper);
  }

  console.log("\nVerification finished.");
}

main();
