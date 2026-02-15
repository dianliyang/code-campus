import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";

export class CAU extends BaseScraper {
  constructor() {
    super("cau");
  }

  getSemesterParam(): string {
    if (!this.semester) return "2025w";
    const input = this.semester.toLowerCase();
    const yearNum = parseInt(input.replace(/\D/g, "")) || 25;
    const year = 2000 + yearNum;
    if (input.includes('wi') || input.includes('winter') || input.includes('fa') || input.includes('fall')) return `${year}w`;
    if (input.includes('sp') || input.includes('spring') || input.includes('su') || input.includes('summer')) return `${year}s`;
    return `${year}w`;
  }

  async links(): Promise<string[]> {
    const sem = this.getSemesterParam();
    // Use stable direct search for ALL CS department courses
    return [`https://univis.uni-kiel.de/prg?search=lectures&department=080110000&sem=${sem}&show=long`];
  }

  async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        return new TextDecoder("windows-1252").decode(buffer);
      } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        if (attempt === retries) return "";
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return "";
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const semParam = this.getSemesterParam();
    const year = parseInt(semParam.substring(0, 4));
    const term = semParam.endsWith('w') ? "Winter" : "Spring";

    $("tr[valign=top]").each((_, tr) => {
      const td = $(tr).find("td").first();
      const titleA = td.find("a[href*='key=']").first();
      if (titleA.length > 0) {
        const fullText = td.text().replace(/\s+/g, " ");
        
        // Smarter extraction for codes like infCV3D-01a
        // 1. Try to find bracketed code first (often present in both lectures and exercises)
        const bracketMatch = fullText.match(/\[([a-zA-Z0-9._-]+)\]/);
        // 2. Try to find code at the beginning (before colon)
        const startMatch = fullText.match(/^([a-zA-Z0-9._-]+):/);
        // 3. Find 6-digit internal ID as fallback
        const internalIdMatch = fullText.match(/\((\d{6})\)/);
        
        if (internalIdMatch) {
          const internalId = internalIdMatch[1];
          let courseCode = bracketMatch ? bracketMatch[1] : (startMatch ? startMatch[1] : internalId);
          
          // If extracted code is just a generic label, fallback to internal ID
          if (['exercise', 'übung', 'praktikum', 'practical', 'projekt', 'project', 'tutorium', 'tutorial'].includes(courseCode.toLowerCase())) {
              courseCode = internalId;
          }

          const title = titleA.text().trim();

          if (existingCodes.has(courseCode)) {
            courses.push({
              university: "CAU Kiel", courseCode, title, semesters: [{ term, year }],
              details: { is_partially_scraped: true } as any // eslint-disable-line @typescript-eslint/no-explicit-any
            });
            return;
          }

          let type = "Lecture";
          let category = "General";
          const titleLower = title.toLowerCase();

          // Categorization logic
          if (titleLower.includes("advanced project") || titleLower.includes("oberprojekt") || titleLower.includes("advanced computer science project")) category = "Advanced Project";
          else if (titleLower.includes("seminar") && !titleLower.includes("supervision")) category = "Seminar";
          else if (titleLower.includes("colloquium") || titleLower.includes("kolloquium") || titleLower.includes("study group")) category = "Colloquia and study groups";
          else if (titleLower.includes("theoretical") || titleLower.includes("theoretische")) category = "Theoretical Computer Science";
          else if (titleLower.includes("involvement") || titleLower.includes("mitarbeit")) category = "Involvement in a working group";
          else if (titleLower.includes("thesis supervision") || titleLower.includes("begleitseminar zur masterarbeit")) category = "Master Thesis Supervision Seminar";
          else if (titleLower.includes("elective") || titleLower.includes("wahlpflicht")) category = "Compulsory elective modules in Computer Science";
          else if (titleLower.includes("open elective") || titleLower.includes("freie wahl")) category = "Open Elective";
          else category = "Standard Course";

          // Initial type detection from code prefix
          if (courseCode.startsWith("E")) type = "Exercise";
          else if (courseCode.startsWith("P") || courseCode.startsWith("PE")) type = "Practical";

          const course: Course = {
            university: "CAU Kiel", courseCode, title, department: "Computer Science",
            semesters: [{ term, year }], level: "graduate",
            details: { internalId, schedule: {}, category, type, rawUnits: 0 } as any // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          td.find("dl dt").each((_, dt) => {
            const label = $(dt).text().trim().toLowerCase();
            const dd = $(dt).next("dd");
            const value = dd.text().trim();

            if (label.includes("dozent") || label.includes("lecturer")) {
              (course.details as any).instructors = value.split(",").map(i => i.trim()); // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (label.includes("angaben") || label.includes("details")) {
              const typeMatch = value.match(/^(Vorlesung|Übung|Seminar|Praktikum|Kolloquium|Projekt)/i);
              if (typeMatch) {
                  const t = typeMatch[1].toLowerCase();
                  if (t === 'vorlesung') type = "Lecture";
                  else if (t === 'übung') type = "Exercise";
                  else if (t === 'praktikum') type = "Practical";
                  else if (t === 'seminar') type = "Seminar";
                  else if (t === 'projekt') type = "Project";
                  (course.details as any).type = type; // eslint-disable-line @typescript-eslint/no-explicit-any
              }

              const ectsMatch = value.match(/(?:ECTS|Credits):\s*(\d+)/i);
              if (ectsMatch) course.credit = parseInt(ectsMatch[1]);
              const unitsMatch = value.match(/(\d+)\s*(?:cred\.h|SWS)/i);
              if (unitsMatch) {
                  const u = parseInt(unitsMatch[1]);
                  course.units = u.toString();
                  (course.details as any).rawUnits = u; // eslint-disable-line @typescript-eslint/no-explicit-any
              }
              if (value.toLowerCase().includes("englisch") || value.toLowerCase().includes("english")) (course.details as any).isEnglish = true; // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (label.includes("voraussetzungen") || label.includes("prerequisites")) {
              course.corequisites = value;
            } else if (label.includes("inhalt") || label.includes("contents")) {
              course.description = value;
            } else if (label.includes("termine") || label.includes("dates")) {
              if (value) {
                  const sched = (course.details as any).schedule; // eslint-disable-line @typescript-eslint/no-explicit-any
                  if (!sched[type]) sched[type] = [];
                  sched[type].push(value);
              }
            }
          });

          // Heuristic for English if not explicit
          const isEnglish = (course.details as any).isEnglish || // eslint-disable-line @typescript-eslint/no-explicit-any
                            (!/[äöüß]/i.test(title) && ['computer', 'data', 'science', 'network', 'system', 'software', 'intelligence', 'security', 'advanced', 'distributed', 'introduction', 'foundation', 'logic', 'machine', 'learning', 'cloud', 'robotics'].some(word => titleLower.includes(word)));

          if (isEnglish || category !== "General") {
            const rawUrl = titleA.attr("href");
            if (rawUrl) course.url = rawUrl.startsWith('http') ? rawUrl : `https://univis.uni-kiel.de/${rawUrl.replace(/&amp;/g, "&")}`;
            courses.push(course);
          }
        }
      }
    });

    return courses;
  }

  async retrieve(): Promise<Course[]> {
    const links = await this.links();
    console.log(`[${this.name}] Scraping ${links.length} departments...`);
    const allItems: Course[] = [];
    for (const link of links) {
      const html = await this.fetchPage(link);
      if (html) {
        const batch = await this.parser(html, new Set());
        allItems.push(...batch);
      }
    }

    const merged = this.mergeCourses(allItems);
    console.log(`[${this.name}] Found ${merged.length} total academic items after merging.`);
    return merged;
  }

  private mergeCourses(items: Course[]): Course[] {
    const courseMap = new Map<string, Course>();
    
    // Helper to identify if an item is a secondary component
    const isSecondary = (c: Course) => {
        const type = (c.details as any).type; // eslint-disable-line @typescript-eslint/no-explicit-any
        return type === "Exercise" || type === "Practical" || type === "Project" ||
               /^(übung|bung|exercise|practical|practice|tutorial|lab|projekt|project)( zu)?:\s*/i.test(c.title);
    };

    // Sort items so primary components (Lectures, Seminars) are processed first
    const sorted = [...items].sort((a, b) => {
        const secA = isSecondary(a);
        const secB = isSecondary(b);
        if (secA === secB) return 0;
        return secA ? 1 : -1;
    });

    for (const item of sorted) {
      // Normalize title for matching
      const cleanTitle = item.title.replace(/^(.?bung|Exercise|Practical Exercise|Practice|Tutorial|Lab|Projekt|Project)( zu)?:\s*/i, "").trim();
      let targetCode: string | undefined;
      
      // 1. Direct match by code (This handles infCV3D-01a matching exactly)
      if (courseMap.has(item.courseCode)) {
          targetCode = item.courseCode;
      }
      // 2. Strip prefix match (e.g., E-infCV -> infCV)
      else if (item.courseCode.startsWith("PE") && courseMap.has(item.courseCode.substring(2))) targetCode = item.courseCode.substring(2);
      else if ((item.courseCode.startsWith("E") || item.courseCode.startsWith("P")) && courseMap.has(item.courseCode.substring(1))) targetCode = item.courseCode.substring(1);

      // 3. Match by internal ID if courseCode is alphanumeric
      if (!targetCode) {
          const itemInternalId = (item.details as any).internalId; // eslint-disable-line @typescript-eslint/no-explicit-any
          for (const [code, existing] of courseMap.entries()) {
              if ((existing.details as any).internalId === itemInternalId) { // eslint-disable-line @typescript-eslint/no-explicit-any
                  targetCode = code;
                  break;
              }
          }
      }

      // 4. Clean title match
      if (!targetCode) {
        for (const [code, existing] of courseMap.entries()) {
             if (existing.title.toLowerCase() === cleanTitle.toLowerCase() && !isSecondary(existing)) {
                 targetCode = code;
                 break;
             }
        }
      }

      const existing = targetCode ? courseMap.get(targetCode) : undefined;
      const target = existing || item;
      const details = target.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      
      if (!details.breakdown) details.breakdown = [0, 0, 0, 0]; // L, S, E, P/Proj
      
      const u = (item.details as any).rawUnits || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
      const type = (item.details as any).type; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (type === "Lecture") details.breakdown[0] += u;
      else if (type === "Seminar") details.breakdown[1] += u;
      else if (type === "Exercise") details.breakdown[2] += u;
      else if (type === "Practical" || type === "Project") details.breakdown[3] += u;

      if (existing) {
        // Merge schedule
        const sSched = (item.details as any).schedule || {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        const tSched = details.schedule || {};
        for (const [t, d] of Object.entries(sSched)) {
            if (!tSched[t]) tSched[t] = [];
            (d as string[]).forEach(x => { if (!tSched[t].includes(x)) tSched[t].push(x); });
        }
        details.schedule = tSched;
        
        // Merge description if missing
        if (!target.description && item.description) target.description = item.description;
        
        // Merge instructors
        const sInstr = (item.details as any).instructors || []; // eslint-disable-line @typescript-eslint/no-explicit-any
        const tInstr = details.instructors || [];
        sInstr.forEach((i: string) => { if (!tInstr.includes(i)) tInstr.push(i); });
        details.instructors = tInstr;
      } else {
        courseMap.set(item.courseCode, item);
      }
    }

    const result = Array.from(courseMap.values());
    result.forEach(c => {
        const d = c.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (d.breakdown) {
            c.units = `${d.breakdown[0]}-${d.breakdown[1]}-${d.breakdown[2]}-${d.breakdown[3]}`;
            delete d.breakdown; delete d.rawUnits; delete d.type;
        }
    });
    return result;
  }
}
