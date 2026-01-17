"use server";

import { createAdminClient, getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateCourse(courseId: number, data: {
  title: string;
  description: string;
  courseCode: string;
  url: string;
  level: string;
  workload: string;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("courses")
    .update({
      title: data.title,
      description: data.description,
      course_code: data.courseCode,
      url: data.url,
      level: data.level,
      workload: data.workload,
    })
    .eq("id", courseId);

  if (error) {
    console.error("Failed to update course:", error);
    throw new Error("Failed to update course");
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}
