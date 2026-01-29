import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createAdminClient } from '../lib/supabase/server';

async function main() {
  const supabase = createAdminClient();
  const { data: { users } } = await supabase.auth.admin.listUsers();
  if (!users || users.length === 0) {
    console.log("No users found");
    return;
  }
  const userId = users[0].id;

  const { data: plans } = await supabase
    .from('study_plans')
    .select(`
      id,
      days_of_week,
      start_date,
      end_date,
      start_time,
      end_time,
      courses(title)
    `)
    .eq('user_id', userId);

  console.log(`Study Plans for user ${userId}:`);
  console.log(`Current Date: ${new Date().toISOString()}`);
  plans?.forEach(p => {
    // @ts-expect-error: Supabase inference might return array or object depending on join
    console.log(`- ${p.courses?.title}: Days [${p.days_of_week.join(', ')}] @ ${p.start_time}-${p.end_time} (${p.start_date} to ${p.end_date})`);
  });
}

main();
