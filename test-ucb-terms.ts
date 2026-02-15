import { UCB } from './src/lib/scrapers/ucb';

async function test() {
  const scraper = new UCB();
  const terms = ["2258", "2262", "2265"];
  
  for (const term of terms) {
    const url = `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A${term}&f%5B1%5D=subject_area%3ACOMPSCI`;
    console.log(`Testing term ${term}: ${url}`);
    const html = await scraper.fetchPage(url);
    if (html && html.includes("views-row")) {
        console.log(`Term ${term} has results!`);
    } else {
        console.log(`Term ${term} has NO results.`);
    }
  }
}

test();
