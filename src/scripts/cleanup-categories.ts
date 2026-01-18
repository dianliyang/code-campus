
import { createAdminClient } from '../lib/supabase/server';

async function main() {
  const supabase = createAdminClient();
  console.log("Starting cleanup of empty categories...");

  // 1. Get all active field IDs
  const { data: activeFields, error: activeError } = await supabase
    .from('course_fields')
    .select('field_id');

  if (activeError) {
    console.error("Error fetching active fields:", activeError);
    return;
  }

  const activeIds = new Set(activeFields.map(f => f.field_id));
  console.log(`Found ${activeIds.size} active categories.`);

  // 2. Get all fields
  const { data: allFields, error: fieldsError } = await supabase
    .from('fields')
    .select('id, name');

  if (fieldsError) {
    console.error("Error fetching fields:", fieldsError);
    return;
  }

  // 3. Identify empty fields
  const emptyFields = allFields.filter(f => !activeIds.has(f.id));
  console.log(`Found ${emptyFields.length} empty categories to delete:`);
  emptyFields.forEach(f => console.log(` - ${f.name}`));

  if (emptyFields.length === 0) {
    console.log("No empty categories found.");
    return;
  }

  // 4. Delete empty fields
  const idsToDelete = emptyFields.map(f => f.id);
  const { error: deleteError } = await supabase
    .from('fields')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error("Error deleting fields:", deleteError);
  } else {
    console.log("Successfully deleted empty categories.");
  }
}

main().catch(console.error);
