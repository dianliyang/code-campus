import { createAdminClient } from '../lib/supabase/server';

async function mockGrades() {
  const supabase = createAdminClient();
  
  console.log("Fetching completed courses...");
  const { data: completed, error: fetchError } = await supabase
    .from('user_courses')
    .select('user_id, course_id')
    .eq('status', 'completed');

  if (fetchError) {
    console.error("Error fetching completed courses:", fetchError);
    return;
  }

  if (!completed || completed.length === 0) {
    console.log("No completed courses found to update.");
    return;
  }

  console.log(`Updating ${completed.length} records with random grades...`);

  for (const record of completed) {
    // Random GPA between 3.0 and 4.0
    const randomGPA = (Math.random() * (4.0 - 3.0) + 3.0).toFixed(2);
    // Random Score between 85 and 98
    const randomScore = (Math.random() * (98 - 85) + 85).toFixed(1);

    const { error: updateError } = await supabase
      .from('user_courses')
      .update({
        gpa: parseFloat(randomGPA),
        score: parseFloat(randomScore)
      })
      .eq('user_id', record.user_id)
      .eq('course_id', record.course_id);

    if (updateError) {
      console.error(`Failed to update user ${record.user_id} course ${record.course_id}:`, updateError);
    } else {
      console.log(`Updated user ${record.user_id.substring(0,5)}... course ${record.course_id}: GPA ${randomGPA}, Score ${randomScore}%`);
    }
  }

  console.log("Mock grade insertion complete.");
}

mockGrades().catch(console.error);
