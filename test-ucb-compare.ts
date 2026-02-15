import { fetch } from 'undici';

async function test() {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
  
  const variations = [
    `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A8576&f%5B1%5D=subject_area%3ACOMPSCI`,
    `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A2262&f%5B1%5D=subject_area%3ACOMPSCI`,
    `https://classes.berkeley.edu/search/class?f%5B0%5D=term_id%3A8576&f%5B1%5D=subject_area%3ACOMPSCI`,
    `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3ASpring%202026&f%5B1%5D=subject_area%3ACOMPSCI`
  ];

  for (const url of variations) {
    console.log(`Testing: ${url}`);
    const res = await fetch(url, { headers: { 'User-Agent': ua } });
    const text = await res.text();
    console.log(`  Length: ${text.length}, has row: ${text.includes('views-row')}`);
  }
}

test();
