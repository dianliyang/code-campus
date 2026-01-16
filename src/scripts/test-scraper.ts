import { MIT } from '../lib/scrapers/mit';
import { Stanford } from '../lib/scrapers/stanford';
import { CMU } from '../lib/scrapers/cmu';
import { UCB } from '../lib/scrapers/ucb';
import { BaseScraper } from '../lib/scrapers/BaseScraper';
import { SupabaseDatabase } from '../lib/supabase/server';

async function main() {
  const args = process.argv.slice(2);
  const uni = args[0] || 'mit';
  const shouldSave = args.includes('--save');

  console.log(`Starting ${uni} Scraper test...`);
  
  let scraper: BaseScraper;
  
  switch (uni) {
      case 'mit':
          scraper = new MIT();
          scraper.links = () => ["https://student.mit.edu/catalog/m6a.html"];
          break;
      case 'stanford':
          scraper = new Stanford();
          break;
      case 'cmu':
          scraper = new CMU();
          break;
      case 'ucb':
          scraper = new UCB();
          scraper.links = () => ["https://classes.berkeley.edu/search/class?f%5B0%5D=subject_area:5582&f%5B1%5D=term:8573&f%5B2%5D=term:8576&page=0"];
          break;
      default:
          console.error("Unknown university. Options: mit, stanford, cmu, ucb");
          process.exit(1);
  }

  try {
    const courses = await scraper.retrieve();
    console.log(`Retrieved ${courses.length} courses.`);
    console.log("First 5 course samples:");
    console.log(JSON.stringify(courses.slice(0, 5), null, 2));

    if (shouldSave) {
      const db = new SupabaseDatabase();
      await db.saveCourses(courses);
    }
  } catch (error) {
    console.error("Error running scraper:", error);
  }
}

main();
