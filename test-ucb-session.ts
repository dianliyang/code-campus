import { fetch } from 'undici';

async function test() {
  const homeUrl = 'https://classes.berkeley.edu/';
  const searchUrl = 'https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A2262&f%5B1%5D=subject_area%3ACOMPSCI';
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  console.log('Visiting home...');
  const res1 = await fetch(homeUrl, { headers: { 'User-Agent': ua } });
  const cookies = res1.headers.get('set-cookie');
  console.log('Cookies:', cookies);

  console.log('Performing search...');
  const res2 = await fetch(searchUrl, {
    headers: {
      'User-Agent': ua,
      'Cookie': cookies || ''
    }
  });
  const text = await res2.text();
  console.log('Search length:', text.length);
  console.log('Snippet:', text.substring(0, 500));
}

test();
