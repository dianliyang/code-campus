import { UCB } from './src/lib/scrapers/ucb';

async function test() {
  const scraper = new UCB();
  const url = `https://classes.berkeley.edu/search/class`;
  console.log(`Fetching index: ${url}`);
  const html = await scraper.fetchPage(url);
  console.log('HTML length:', html.length);
  console.log('Snippet:', html.substring(0, 1000));
}

test();
