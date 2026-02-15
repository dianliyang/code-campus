import { request } from 'undici';

async function test() {
  const url = `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A2262&f%5B1%5D=subject_area%3ACOMPSCI`;
  const { statusCode, headers, body } = await request(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', statusCode);
  const text = await body.text();
  console.log('Body length:', text.length);
  if (text.includes('views-row')) {
      console.log('Found views-row! Results exist.');
  } else if (text.includes('No results found')) {
      console.log('Explicitly no results found.');
  } else {
      console.log('Snippet:', text.substring(0, 500));
  }
}

test();
