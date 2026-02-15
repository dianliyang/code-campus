import { fetch } from 'undici';

async function test() {
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const url = `https://classes.berkeley.edu/search/class`;
  
  const res = await fetch(url, { headers: { 'User-Agent': ua } });
  const text = await res.text();
  
  const match = text.match(/{"suggested_terms":(\[.*?\])}/);
  if (match) {
      console.log('Suggested terms:', match[1]);
  } else {
      console.log('Not found suggested_terms');
  }
  
  // Try to find more term definitions
  const allTerms = text.match(/"term_id":"(\d+)","term_name":"(.*?)"/g);
  console.log('All term matches:', allTerms);
}

test();
