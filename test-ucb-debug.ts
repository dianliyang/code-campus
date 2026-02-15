import { request } from 'undici';

async function test() {
  const url = `https://classes.berkeley.edu/search/class`;
  const { statusCode, headers, body } = await request(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', statusCode);
  console.log('Headers:', headers);
  const text = await body.text();
  console.log('Body:', text);
}

test();
