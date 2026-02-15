import { request } from 'undici';

async function test() {
  const url = `https://classes.berkeley.edu/search/class`;
  const { body } = await request(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await body.text();
  console.log('HTML length:', html.length);
  
  const matches = html.match(/term:\d+/g);
  console.log('Term matches:', matches ? [...new Set(matches)] : 'NONE');
}

test();
