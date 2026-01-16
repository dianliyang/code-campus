import { createAdminClient } from '../lib/supabase/server';

async function main() {
  const supabase = createAdminClient();
  
  console.log("--- DB DEBUG ---");
  
  const { data: counts, error: countError } = await supabase
    .from('courses')
    .select('university');
    
  if (countError) {
    console.error("Error fetching counts:", countError);
  } else {
    const universityCounts: Record<string, number> = {};
    counts?.forEach(c => {
      universityCounts[c.university] = (universityCounts[c.university] || 0) + 1;
    });
    console.log("Course counts by university:", universityCounts);
  }

  const { data: stanford, error: stanfordError } = await supabase
    .from('courses')
    .select('*')
    .eq('university', 'stanford')
    .limit(1);
    
  if (stanfordError) {
    console.error("Error fetching stanford:", stanfordError);
  } else {
    console.log("One Stanford course sample:", stanford?.[0]?.title);
  }
}

main();