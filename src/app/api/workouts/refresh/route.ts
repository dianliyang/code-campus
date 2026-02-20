import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CAUSport } from "@/lib/scrapers/cau-sport";
import { SupabaseDatabase, createAdminClient, getUser } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const scraper = new CAUSport();
    const workouts = await scraper.retrieveWorkouts();

    const supabase = createAdminClient();
    const source = "CAU Kiel Sportzentrum";

    const { error: deleteError } = await supabase
      .from("workouts")
      .delete()
      .eq("source", source);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 },
      );
    }

    if (workouts.length > 0) {
      const db = new SupabaseDatabase();
      await db.saveWorkouts(workouts);
    }

    revalidatePath("/workouts");
    return NextResponse.json({ success: true, count: workouts.length });
  } catch (error) {
    console.error("[workouts/refresh] failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
