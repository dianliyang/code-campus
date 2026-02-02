"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "./client";

interface UserCourseChange {
  course_id: number;
  status: string;
}

export function useRealtimeEnrollments(
  userId: string | undefined,
  initialEnrolledIds: number[]
) {
  const [enrolledIds, setEnrolledIds] = useState<number[]>(initialEnrolledIds);

  const refreshEnrollments = useCallback(async () => {
    if (!userId) return;
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase
      .from("user_courses")
      .select("course_id")
      .eq("user_id", userId);
    if (data) {
      setEnrolledIds(data.map((r) => Number(r.course_id)));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`user_courses:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_courses",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const record = (payload.new || payload.old) as UserCourseChange | undefined;
          if (!record) return;

          if (payload.eventType === "INSERT") {
            setEnrolledIds((prev) =>
              prev.includes(record.course_id) ? prev : [...prev, record.course_id]
            );
          } else if (payload.eventType === "DELETE") {
            setEnrolledIds((prev) =>
              prev.filter((id) => id !== record.course_id)
            );
          } else if (payload.eventType === "UPDATE") {
            // Re-fetch to handle status changes (e.g., hidden)
            refreshEnrollments();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshEnrollments]);

  // Sync with prop changes
  useEffect(() => {
    setEnrolledIds(initialEnrolledIds);
  }, [initialEnrolledIds]);

  return { enrolledIds, refreshEnrollments };
}
