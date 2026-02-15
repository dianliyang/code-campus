import { UCB } from './src/lib/scrapers/ucb';
import * as cheerio from 'cheerio';

async function test() {
  const scraper = new UCB();
  const url = `https://classes.berkeley.edu/search/class`;
  const html = await scraper.fetchPage(url);
  const $ = cheerio.load(html);
  
  console.log('Searching for term options...');
  $("option").each((_, el) => {
      const val = $(el).attr('value') || '';
      const text = $(el).text();
      if (val.includes('term') || text.includes('202')) {
          console.log(`Option: text="${text}", value="${val}"`);
      }
  });
}

test();
