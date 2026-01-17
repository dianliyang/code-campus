"use server";

import { createAdminClient, getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateCourse(courseId: number, data: {
  university: string;
  courseCode: string;
  title: string;
  units: string;
  description: string;
  url: string;
  department: string;
  corequisites: string;
  level: string;
  difficulty: number;
  popularity: number;
  workload: string;
  isHidden: boolean;
  isInternal: boolean;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("courses")
    .update({
      university: data.university,
      course_code: data.courseCode,
      title: data.title,
      units: data.units,
      description: data.description,
      url: data.url,
      department: data.department,
      corequisites: data.corequisites,
      level: data.level,
      difficulty: data.difficulty,
      popularity: data.popularity,
      workload: data.workload,
      is_hidden: data.isHidden,
      is_internal: data.isInternal,
    })
    .eq("id", courseId);

  if (error) {
    console.error("Failed to update course:", error);
    throw new Error("Failed to update course");
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

export async function deleteCourse(courseId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) {
    console.error("Failed to delete course:", error);
    throw new Error("Failed to delete course");
  }

  revalidatePath("/courses");
}
