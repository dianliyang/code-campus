import { createAdminClient } from "../lib/supabase/server";

async function main() {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from("courses")
    .select("university");

  if (error) {
    console.error("Error fetching courses:", error);
    return;
  }

  const distinctUniversities = [...new Set(data.map(c => c.university))];
  console.log("Distinct universities found:", distinctUniversities);
}

main();
