import { createAdminClient } from '../lib/supabase/server';

async function main() {
  const supabase = createAdminClient();
  console.log("Seeding mock data to Supabase...");

  // Seed Fields
  const fields = ['Machine Learning', 'Data Science', 'Web Development', 'Algorithms', 'Mobile Apps'];
  for (const field of fields) {
    await supabase.from('fields').upsert({ name: field }, { onConflict: 'name' });
  }

  // Seed Semesters
  const semesters = [
    { year: 2024, term: 'Fall' },
    { year: 2025, term: 'Spring' },
    { year: 2025, term: 'Fall' }
  ];
  for (const sem of semesters) {
    await supabase.from('semesters').upsert(sem, { onConflict: 'year,term' });
  }

  // Links
  const { data: allCourses } = await supabase.from('courses').select('id').limit(20);
  const { data: allSemesters } = await supabase.from('semesters').select('id');
  const { data: allFieldRows } = await supabase.from('fields').select('id');

  if (!allCourses || !allSemesters || !allFieldRows) {
    console.log("No courses/semesters/fields found to link. Run scrapers first.");
    return;
  }

  for (const course of allCourses) {
    // Link to random semester
    const randomSem = allSemesters[Math.floor(Math.random() * allSemesters.length)];
    await supabase.from('course_semesters').upsert({
      course_id: course.id,
      semester_id: randomSem.id
    }, { onConflict: 'course_id,semester_id' });

    // Link to random field
    const randomField = allFieldRows[Math.floor(Math.random() * allFieldRows.length)];
    await supabase.from('course_fields').upsert({
      course_id: course.id,
      field_id: randomField.id
    }, { onConflict: 'course_id,field_id' });
  }

  console.log("Mock data seeding complete.");
}

main();