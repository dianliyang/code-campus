import { createAdminClient } from "../lib/supabase/server";

async function main() {
  const supabase = createAdminClient();
  const UNIVERSITY = "CMU";
  const TARGET_TERM = "Fall";
  const TARGET_YEAR = 2025;

  console.log(`Updating ${UNIVERSITY} courses to ${TARGET_TERM} ${TARGET_YEAR}...`);

  // 1. Get or Create Semester
  let semesterId: number | null = null;
  
  const { data: existingSemester, error: fetchError } = await supabase
    .from("semesters")
    .select("id")
    .eq("term", TARGET_TERM)
    .eq("year", TARGET_YEAR)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
    console.error("Error fetching semester:", fetchError);
    return;
  }

  if (existingSemester) {
    semesterId = existingSemester.id;
    console.log(`Found existing semester ID: ${semesterId}`);
  } else {
    const { data: newSemester, error: createError } = await supabase
      .from("semesters")
      .insert({ term: TARGET_TERM, year: TARGET_YEAR })
      .select("id")
      .single();

    if (createError) {
      console.error("Error creating semester:", createError);
      return;
    }
    semesterId = newSemester.id;
    console.log(`Created new semester ID: ${semesterId}`);
  }

  if (!semesterId) {
    console.error("Failed to resolve semester ID.");
    return;
  }

  // 2. Fetch all CMU courses
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, course_code") 
    .eq("university", UNIVERSITY);

  if (coursesError) {
    console.error("Error fetching courses:", coursesError);
    return;
  }

  console.log(`Found ${courses.length} courses for ${UNIVERSITY}.`);

  if (courses.length === 0) {
    console.log("No courses found. Exiting.");
    return;
  }

  // 3. Link courses to semester
  const links = courses.map(course => ({
    course_id: course.id,
    semester_id: semesterId!
  }));

  // Perform in batches
  const BATCH_SIZE = 1000;
  for (let i = 0; i < links.length; i += BATCH_SIZE) {
    const batch = links.slice(i, i + BATCH_SIZE);
    const { error: linkError } = await supabase
      .from("course_semesters")
      .upsert(batch, { onConflict: 'course_id, semester_id', ignoreDuplicates: true });

    if (linkError) {
      console.error(`Error linking batch ${i}-${i + batch.length}:`, linkError);
    } else {
      console.log(`Processed batch ${i}-${i + batch.length}`);
    }
  }

  console.log("Update complete.");
}

main();
