import { createAdminClient } from '../lib/supabase/server';

async function main() {
  const supabase = createAdminClient();
  
  console.log("--- Hiding NCU Courses ---");
  
  // Update courses where university is 'NCU' or 'ncu'
  const { data, error } = await supabase
    .from('courses')
    .update({ is_hidden: true })
    .in('university', ['NCU', 'ncu'])
    .select('id, university, is_hidden');

  if (error) {
    console.error("Error hiding courses:", error);
  } else {
    console.log(`Successfully processed courses.`);
    if (data && data.length > 0) {
       console.log(`Updated ${data.length} courses.`);
       console.log("Sample verification:", data[0]);
    } else {
       console.log("No courses found for NCU.");
    }
  }
}

main();
