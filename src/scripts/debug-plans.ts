import { createAdminClient } from '../lib/supabase/server';

async function main() {
  const supabase = createAdminClient();
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userId = users[0].id;

  const { data: plans } = await supabase
    .from('study_plans')
    .select(`
      id,
      days_of_week,
      start_time,
      end_time,
      courses(title)
    `)
    .eq('user_id', userId);

  console.log(`Study Plans for user ${userId}:`);
  plans?.forEach(p => {
    // @ts-expect-error: Supabase inference might return array or object depending on join
    console.log(`- ${p.courses?.title}: Days [${p.days_of_week.join(', ')}] @ ${p.start_time}-${p.end_time}`);
  });
}

main();
