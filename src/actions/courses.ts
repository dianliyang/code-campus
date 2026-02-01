"use server";

import { createAdminClient, getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  details?: {
    prerequisites?: string;
    relatedUrls?: string[];
    crossListedCourses?: string;
  };
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  // Merge new details with existing details to preserve scraper data (sections, terms, etc.)
  let mergedDetails: Record<string, unknown> | undefined;
  if (data.details) {
    const { data: existing } = await supabase
      .from("courses")
      .select("details")
      .eq("id", courseId)
      .single();

    const existingDetails =
      typeof existing?.details === "string"
        ? JSON.parse(existing.details)
        : existing?.details || {};

    mergedDetails = { ...existingDetails, ...data.details };
  }

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
      ...(mergedDetails && { details: JSON.stringify(mergedDetails) }),
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
