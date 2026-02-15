import { CMU } from './src/lib/scrapers/cmu';

async function test() {
  const scraper = new CMU();
  scraper.semester = 'fa25';
  console.log("Starting CMU test...");
  try {
    const courses = await scraper.retrieve();
    console.log(`Success! Found ${courses.length} courses.`);
    if (courses.length > 0) {
      console.log("Sample:", courses[0].courseCode, courses[0].title);
    }
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test();
