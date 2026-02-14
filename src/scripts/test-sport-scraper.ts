import { CAUSport } from "../lib/scrapers/cau-sport";

async function main() {
  const scraper = new CAUSport();

  const testPages = [
    "_Schwimmkurse_Erwachsene.html",
    "_Boxen.html",
    "_Yoga__Hatha_Yoga.html",
    "_Klettern.html",
    "_Gesellschaftstanz.html",
    "_Rueckenfit.html",
  ];

  const BASE = "https://server.sportzentrum.uni-kiel.de/angebote/aktueller_zeitraum";

  for (const page of testPages) {
    const url = `${BASE}/${page}`;
    const html = await scraper.fetchPage(url);
    const workouts = scraper.parseWorkouts(html, url);

    console.log(`\n=== ${page} (${workouts.length} courses) ===`);
    for (const w of workouts) {
      console.log(
        `  ${w.courseCode} | ${w.title}` +
        `\n    EN: ${w.titleEn}` +
        `\n    Category: ${w.category} → ${w.categoryEn}` +
        `\n    ${w.dayOfWeek} ${w.startTime}-${w.endTime}` +
        `\n    Location: ${w.location} → ${w.locationEn}` +
        `\n    Instructor: ${w.instructor}` +
        `\n    Status: ${w.bookingStatus}` +
        `\n`
      );
    }
  }
}

main().catch(console.error);
