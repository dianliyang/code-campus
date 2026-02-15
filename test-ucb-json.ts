import { fetch } from 'undici';

async function test() {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
  const url = `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A2262&f%5B1%5D=subject_area%3ACOMPSCI`;
  
  const res = await fetch(url, { headers: { 'User-Agent': ua } });
  const text = await res.text();
  
  const startIdx = text.indexOf('data-drupal-selector="drupal-settings-json">');
  if (startIdx === -1) {
      console.log('JSON blob not found. Body snippet:', text.substring(0, 500));
      return;
  }
  
  const jsonStart = text.indexOf('{', startIdx);
  const jsonEnd = text.indexOf('</script>', jsonStart);
  const jsonStr = text.substring(jsonStart, jsonEnd);
  
  try {
      const data = JSON.parse(jsonStr);
      console.log('Suggested terms:', data.term_not_selected_warning?.suggested_terms);
      console.log('Facets keys:', Object.keys(data.facets || {}));
      
      // If results were found, they might be in a specific key
      // But usually UCB renders rows in HTML
      if (text.includes('views-row')) {
          console.log('HTML contains views-row results!');
      } else {
          console.log('HTML does NOT contain views-row.');
      }
      
  } catch (e) {
      console.error('Failed to parse JSON');
  }
}

test();
