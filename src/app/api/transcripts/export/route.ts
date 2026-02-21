import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTranscriptPdf, TranscriptRow } from "@/lib/pdf/transcript";
import { generateTranscriptPdfWithReact } from "@/lib/pdf/transcript-react";

export const runtime = "nodejs";

type ExportPayload = {
  university?: string;
  semester?: string;
};

function toSafeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ExportPayload;
    let query = supabase
      .from("courses")
      .select(`
        university,
        course_code,
        title,
        credit,
        uc:user_courses!inner(status, updated_at, gpa, score),
        semesters:course_semesters(semesters(term, year))
      `)
      .eq("user_courses.user_id", user.id)
      .eq("user_courses.status", "completed");

    if (body.university && body.university !== "all") {
      query = query.eq("university", body.university);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows: TranscriptRow[] = (data || [])
      .map((row: Record<string, unknown>) => {
        const uc =
          (Array.isArray(row.uc) ? row.uc[0] : row.uc) as
            | { updated_at?: string; gpa?: number; score?: number }
            | undefined;

        const semesterLabels = (
          (row.semesters as { semesters: { term: string; year: number } }[] | null) || []
        )
          .map((s) => `${s.semesters.term} ${s.semesters.year}`)
          .filter(Boolean);

        return {
          university: String(row.university || ""),
          courseCode: String(row.course_code || ""),
          title: String(row.title || ""),
          credit: typeof row.credit === "number" ? row.credit : undefined,
          gpa: typeof uc?.gpa === "number" ? uc.gpa : undefined,
          score: typeof uc?.score === "number" ? uc.score : undefined,
          completionDate: uc?.updated_at,
          semesters: semesterLabels,
        };
      })
      .filter((row) => {
        if (!body.semester || body.semester === "all") return true;
        return row.semesters?.includes(body.semester) || false;
      })
      .sort((a, b) => {
        const left = a.completionDate ? new Date(a.completionDate).getTime() : 0;
        const right = b.completionDate ? new Date(b.completionDate).getTime() : 0;
        return right - left;
      });

    if (rows.length === 0) {
      return NextResponse.json({ error: "No transcript data found for selected filters" }, { status: 404 });
    }

    const titleUniversity = body.university && body.university !== "all" ? body.university : "All Universities";
    const titleSemester = body.semester && body.semester !== "all" ? body.semester : "All Semesters";
    const title = `Academic Transcript - ${titleUniversity} - ${titleSemester}`;

    const pdfInput = {
      title,
      rows,
      generatedBy: user.email || user.id,
      universityFilter: titleUniversity,
      semesterFilter: titleSemester,
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateTranscriptPdfWithReact(pdfInput);
    } catch (reactPdfError) {
      console.error("React PDF transcript generation failed, falling back:", reactPdfError);
      pdfBuffer = generateTranscriptPdf(pdfInput);
    }
    const uniSafe = toSafeFilenamePart(titleUniversity);
    const semSafe = toSafeFilenamePart(titleSemester);
    const filename = `transcript_${uniSafe}_${semSafe}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Transcript PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate transcript PDF" }, { status: 500 });
  }
}
