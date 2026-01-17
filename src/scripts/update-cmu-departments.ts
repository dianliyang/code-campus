import { createAdminClient } from "../lib/supabase/server";

async function main() {
  const supabase = createAdminClient();
  const UNIVERSITY = "CMU";

  console.log(`Updating departments for ${UNIVERSITY}...`);

  // Fetch all CMU courses
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, course_code, department")
    .eq("university", UNIVERSITY);

  if (error) {
    console.error("Error fetching courses:", error);
    return;
  }

  console.log(`Found ${courses.length} courses.`);

  let csCount = 0;
  let eceCount = 0;
  let skippedCount = 0;

  for (const course of courses) {
    let newDepartment = course.department;
    const code = course.course_code.trim();

    if (code.startsWith("15")) {
      newDepartment = "Computer Science";
      csCount++;
    } else if (code.startsWith("18")) {
      newDepartment = "Electrical & Computer Engineering";
      eceCount++;
    } else {
      skippedCount++;
      continue; // No change needed
    }

    if (newDepartment !== course.department) {
       const { error: updateError } = await supabase
        .from("courses")
        .update({ department: newDepartment })
        .eq("id", course.id);
      
      if (updateError) {
        console.error(`Failed to update course ${course.course_code} (ID: ${course.id}):`, updateError);
      }
    }
  }

  console.log(`Update Summary:`);
  console.log(`- Set "Computer Science" for: ${csCount} courses`);
  console.log(`- Set "Electrical & Computer Engineering" for: ${eceCount} courses`);
  console.log(`- Skipped/Unchanged: ${skippedCount} courses`);
}

main();
