import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTranscriptPdf, TranscriptRow } from "@/lib/pdf/transcript";

type ExportPayload = {
  rows?: TranscriptRow[];
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
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows to export" }, { status: 400 });
    }

    const titleUniversity = body.university && body.university !== "all" ? body.university : "All Universities";
    const titleSemester = body.semester && body.semester !== "all" ? body.semester : "All Semesters";
    const title = `Academic Transcript - ${titleUniversity} - ${titleSemester}`;

    const pdfBuffer = generateTranscriptPdf(title, rows);
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
