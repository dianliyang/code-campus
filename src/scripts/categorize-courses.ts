import { createAdminClient } from '../lib/supabase/server';

// This is a simplified version of categorization logic adapted for Supabase
async function main() {
  const supabase = createAdminClient();
  
  console.log("Starting course categorization...");

  // Define some fields
  const fields = [
    'Artificial Intelligence',
    'Systems',
    'Theory',
    'Human-Computer Interaction',
    'Graphics',
    'Security',
    'Networks',
    'Databases',
    'Software Engineering',
    'Programming Languages'
  ];

  for (const field of fields) {
    await supabase.from('fields').upsert({ name: field }, { onConflict: 'name' });
  }

  const { data: fieldRows } = await supabase.from('fields').select('id, name');
  const fieldMap = Object.fromEntries(fieldRows?.map(f => [f.name, f.id]) || []);

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description')
    .limit(100);

  if (!courses) return;

  for (const course of courses) {
    const text = (course.title + ' ' + (course.description || '')).toLowerCase();
    
    // Very simple keyword matching for demo
    for (const [fieldName, fieldId] of Object.entries(fieldMap)) {
      if (text.includes(fieldName.toLowerCase().split(' ')[0])) {
        await supabase.from('course_fields').upsert({
          course_id: course.id,
          field_id: fieldId
        }, { onConflict: 'course_id,field_id' });
      }
    }
  }

  console.log("Categorization complete.");
}

main();