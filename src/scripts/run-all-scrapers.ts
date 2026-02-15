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
    const items = await scraper.retrieve();
    console.log(`Successfully scraped ${items.length} items from ${scraper.name}.`);

    if (items.length > 0) {
      // Clear previous data for this university before saving new results
      await db.clearUniversity(scraper.name);

      if (scraper.name === 'cau') {
        // Partition CAU items into Projects/Seminars vs standard Courses
        // "Standard Course" and "Compulsory elective modules in Computer Science" go to 'courses'
        // Everything else (Seminar, Advanced Project, etc.) goes to 'projects_seminars'
        const standardCategoryLabels = ['Standard Course', 'Compulsory elective modules in Computer Science'];
        
        const standardCourses = items.filter(item => {
          const cat = (item.details as any)?.category || ""; // eslint-disable-line @typescript-eslint/no-explicit-any
          return standardCategoryLabels.includes(cat);
        });
        const projectsSeminars = items.filter(item => {
          const cat = (item.details as any)?.category || ""; // eslint-disable-line @typescript-eslint/no-explicit-any
          return !standardCategoryLabels.includes(cat);
        });

        console.log(`[cau] Partitioned into ${standardCourses.length} standard courses and ${projectsSeminars.length} projects/seminars.`);
        
        if (standardCourses.length > 0) await db.saveCourses(standardCourses);
        if (projectsSeminars.length > 0) await db.saveProjectsSeminars(projectsSeminars);
      } else {
        await db.saveCourses(items);
      }
      console.log(`Completed ${scraper.name}.`);
    }
  } catch (error) {
    console.error(`Failed to run scraper for ${scraper.name}:`, error);
  }
}

async function runWorkoutScraper(db: SupabaseDatabase, semester: string) {
  try {
    const scraper = new CAUSport();
    scraper.semester = semester;
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

  const universityArg = args.find(arg => arg.startsWith('--university='));
  const targetUniversity = universityArg ? universityArg.split('=')[1].toLowerCase() : null;

  let scrapers: BaseScraper[] = [
    new MIT(),
    new Stanford(),
    new CMU(),
    new UCB(),
    new CAU()
  ];

  if (targetUniversity) {
    scrapers = scrapers.filter(s => s.name.toLowerCase() === targetUniversity);
    if (scrapers.length === 0 && targetUniversity !== 'cau-sport') {
      console.error(`University "${targetUniversity}" not found.`);
      process.exit(1);
    }
  }

  console.log(`Starting scrape... (Semester: ${semester}${targetUniversity ? `, University: ${targetUniversity}` : ''})`);
  console.log(`Target: Supabase Database`);

  for (const scraper of scrapers) {
    scraper.semester = semester;
    scraper.db = db;
    await runScraper(scraper, db);
  }

  // Run workout scraper if no filter or if explicitly requested
  if (!targetUniversity || targetUniversity === 'cau-sport') {
    await runWorkoutScraper(db, semester);
  }

  console.log("\nAll requested scrapers finished.");
}

main();
