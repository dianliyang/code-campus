export interface TranscriptRow {
  university: string;
  courseCode: string;
  title: string;
  credit?: number;
  gpa?: number;
  score?: number;
  completionDate?: string;
  semesters?: string[];
}

function escapePdfText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function toAscii(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "?");
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US");
}

function buildTranscriptLines(title: string, rows: TranscriptRow[]): string[] {
  const lines: string[] = [];
  lines.push(title);
  lines.push(`Generated: ${new Date().toLocaleString("en-US")}`);
  lines.push("");

  rows.forEach((row, idx) => {
    const gpaText = row.gpa !== undefined ? Number(row.gpa).toFixed(2) : "-";
    const scoreText = row.score !== undefined ? `${Number(row.score).toFixed(1)}%` : "-";
    const creditText = row.credit !== undefined ? String(row.credit) : "-";
    const semesters = (row.semesters || []).join(", ") || "-";

    lines.push(
      `${idx + 1}. ${row.university} | ${row.courseCode} | Credits: ${creditText} | GPA: ${gpaText} | Score: ${scoreText}`
    );
    lines.push(`   ${row.title}`);
    lines.push(`   Semesters: ${semesters} | Completed: ${formatDate(row.completionDate)}`);
    lines.push("");
  });

  lines.push(`Total courses: ${rows.length}`);
  return lines.map((line) => toAscii(line));
}

function paginateLines(lines: string[], linesPerPage = 46): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages.length > 0 ? pages : [["No transcript rows available."]];
}

function buildPageStream(lines: string[]): string {
  const fontSize = 10;
  const startY = 760;
  const lineHeight = 16;
  const x = 45;

  const ops: string[] = ["BT", `/F1 ${fontSize} Tf`];
  lines.forEach((line, index) => {
    const y = startY - index * lineHeight;
    ops.push(`${x} ${y} Td (${escapePdfText(line)}) Tj`);
    if (index < lines.length - 1) ops.push(`${-x} ${-lineHeight} Td`);
  });
  ops.push("ET");
  return ops.join("\n");
}

export function generateTranscriptPdf(title: string, rows: TranscriptRow[]): Buffer {
  const lines = buildTranscriptLines(title, rows);
  const pages = paginateLines(lines);

  const objectMap = new Map<number, string>();
  const pageCount = pages.length;
  const firstPageObjectId = 3;
  const fontObjectId = firstPageObjectId + pageCount * 2;

  objectMap.set(1, "<< /Type /Catalog /Pages 2 0 R >>");

  const kids: string[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    const pageObjectId = firstPageObjectId + i * 2;
    kids.push(`${pageObjectId} 0 R`);
  }
  objectMap.set(2, `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`);

  for (let i = 0; i < pageCount; i += 1) {
    const pageObjectId = firstPageObjectId + i * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = buildPageStream(pages[i]);
    const streamLength = Buffer.byteLength(stream, "utf8");

    objectMap.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    );
    objectMap.set(
      contentObjectId,
      `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`
    );
  }

  objectMap.set(fontObjectId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const maxObjectId = fontObjectId;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let id = 1; id <= maxObjectId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, "utf8");
    const content = objectMap.get(id);
    if (!content) throw new Error(`Missing PDF object ${id}`);
    pdf += `${id} 0 obj\n${content}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${maxObjectId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= maxObjectId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
