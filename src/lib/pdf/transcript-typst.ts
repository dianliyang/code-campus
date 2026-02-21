import type { TranscriptRow } from "./transcript";

interface TranscriptTypstInput {
  title: string;
  rows: TranscriptRow[];
  generatedBy: string;
  universityFilter: string;
  semesterFilter: string;
}

function escapeTypstString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function averageScore(rows: TranscriptRow[]): string {
  const withScore = rows.filter((r) => typeof r.score === "number");
  if (withScore.length === 0) return "-";
  const avg = withScore.reduce((sum, r) => sum + (r.score || 0), 0) / withScore.length;
  return avg.toFixed(2);
}

function averageGpa(rows: TranscriptRow[]): string {
  const withGpa = rows.filter((r) => typeof r.gpa === "number");
  if (withGpa.length === 0) return "-";
  const avg = withGpa.reduce((sum, r) => sum + (r.gpa || 0), 0) / withGpa.length;
  return avg.toFixed(2);
}

function totalCredits(rows: TranscriptRow[]): string {
  const total = rows.reduce((sum, r) => sum + (r.credit || 0), 0);
  return Number.isFinite(total) ? total.toFixed(0) : "-";
}

function toTypstRows(rows: TranscriptRow[]): string {
  return rows
    .map((row, index) => {
      const credit = row.credit !== undefined ? String(row.credit) : "-";
      const gpa = row.gpa !== undefined ? row.gpa.toFixed(2) : "-";
      const score = row.score !== undefined ? row.score.toFixed(1) : "-";
      return `(
  no: ${index + 1},
  code: "${escapeTypstString(row.courseCode || "-")}",
  title: "${escapeTypstString(row.title || "-")}",
  credit: "${escapeTypstString(credit)}",
  score: "${escapeTypstString(score)}",
  gpa: "${escapeTypstString(gpa)}",
)`;
    })
    .join(",\n");
}

export function buildTranscriptTypst(input: TranscriptTypstInput): string {
  const rowsExpr = toTypstRows(input.rows);
  const issuedAt = new Date().toISOString().slice(0, 10);
  const reference = `CC-TR-${issuedAt}-${String(input.rows.length).padStart(4, "0")}`;
  const avgScore = averageScore(input.rows);
  const avgGpa = averageGpa(input.rows);
  const credits = totalCredits(input.rows);

  return `// ==========================================
// Transcript — Academic Paper Style (Typst)
// ==========================================

#let transcript(
  metadata: (:),
  rows: (),
  note: none,
) = {
  let m(key, fallback: "N/A") = metadata.at(key, default: fallback)

  let rule  = rgb("#b8bcc6")
  let muted = rgb("#555a66")

  let sc(body) = smallcaps(text(8.6pt, tracking: 0.6pt, fill: muted)[body])
  let sm(body) = text(9.2pt, fill: muted, body)
  let mono(body) = text(font: "Libertinus Mono", 9.2pt, fill: muted, body)
  let ttitle(body) = text(17pt, weight: "semibold", body)
  let hr(st: 0.7pt) = line(length: 100%, stroke: st + rule)

  set page(paper: "a4", margin: (x: 2.6cm, y: 2.8cm), numbering: "1")
  set text(font: "Libertinus Serif", 11pt)
  set par(leading: 1.35em, justify: false)

  align(center)[
    #sc(m("institution"))
    #v(6pt)
    #ttitle[Official Academic Transcript]
    #v(6pt)
    #sm[
      #m("student_name") · ID #mono(m("student_id"))
    ]
    #sm[
      #m("program") · #m("term")
    ]
  ]

  v(14pt)
  hr(st: 0.9pt)
  v(14pt)

  sc[Student information]
  v(6pt)

  let key(body) = sc(body)
  let val(body) = body

  table(
    columns: (auto, 1fr, auto, 1fr),
    stroke: none,
    column-gutter: 14pt,
    row-gutter: 2pt,
    inset: (x: 0pt, y: 1pt),
    align: left,

    key[Name],        val[#m("student_name")],         key[Issued],      val[#m("issued_at")],
    key[Student ID],  val[#mono(m("student_id"))],     key[Issued by],   val[#m("issued_by")],
    key[Program],     val[#m("program")],              key[Reference],   val[#mono(m("reference", fallback: "—"))],
    key[Level],       val[#m("level")],                key[Page],        val[#context counter(page).display("1")],
  )

  v(16pt)

  sc[Academic record]
  v(6pt)

  let th(body) = text(9.4pt, weight: "semibold")[body]

  table(
    columns: (auto, 1.1fr, 3fr, auto, auto, auto),
    stroke: none,
    inset: (x: 4pt, y: 3pt),
    column-gutter: 10pt,
    align: (x, y) => if x == 2 { left } else if x >= 3 { right } else { center },

    table.hline(stroke: 0.9pt + rule),
    table.header(
      th[#], th[Code], th[Course title], th[Cr], th[Score], th[GPA],
    ),
    table.hline(stroke: 0.6pt + rule),

    ..rows.map(r => (
      str(r.no),
      mono(r.code),
      r.title,
      str(r.credit),
      str(r.score),
      str(r.gpa),
    )).flatten(),

    table.hline(stroke: 0.9pt + rule),
  )

  v(14pt)

  sc[Summary]
  v(6pt)

  table(
    columns: (auto, 1fr, auto, 1fr),
    stroke: none,
    column-gutter: 14pt,
    row-gutter: 2pt,
    inset: (x: 0pt, y: 1pt),

    key[Records],      [#m("record_count", fallback: str(rows.len()))],  key[Credits],  [#m("total_credits", fallback: "—")],
    key[Average],      [#m("average_score", fallback: "—")],             key[GPA],      [#m("gpa", fallback: "—")],
  )

  if note != none {
    v(10pt)
    sm(note)
  }

  v(18pt)
  hr()
  v(6pt)
  align(center, sm[
    This transcript is an electronically generated academic record.
  ])
}

#transcript(
  metadata: (
    institution: "CodeCampus",
    student_name: "${escapeTypstString(input.generatedBy)}",
    student_id: "${escapeTypstString(input.generatedBy)}",
    program: "${escapeTypstString(input.title)}",
    level: "N/A",
    term: "${escapeTypstString(input.semesterFilter)}",
    issued_at: "${escapeTypstString(issuedAt)}",
    issued_by: "${escapeTypstString(input.universityFilter)}",
    reference: "${escapeTypstString(reference)}",
    record_count: "${escapeTypstString(String(input.rows.length))}",
    total_credits: "${escapeTypstString(credits)}",
    average_score: "${escapeTypstString(avgScore)}",
    gpa: "${escapeTypstString(avgGpa)}",
  ),
  rows: (
${rowsExpr}
  ),
  note: [Grades are recorded as provided by the exporting system and may be subject to verification.],
)
`;
}
