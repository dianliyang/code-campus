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
    // Use stable direct search for English-taught CS department courses
    return [`https://univis.uni-kiel.de/prg?search=lectures&department=080110000&spec=englisch:ja&sem=${sem}&show=long`];
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
        const fullText = td.text().replace(/\s+/g, " ").trim();
        const bracketMatch = fullText.match(/\[([a-zA-Z0-9._-]+)\]/);
        const startMatch = fullText.match(/^([a-zA-Z0-9._-]+):/);
        const internalIdMatch = fullText.match(/\((\d{6})\)/);
        
        if (internalIdMatch) {
          const internalId = internalIdMatch[1];
          let courseCode = bracketMatch ? bracketMatch[1] : (startMatch ? startMatch[1] : internalId);
          if (['exercise', 'übung', 'praktikum', 'practical', 'projekt', 'project', 'tutorium', 'tutorial', 'workshop'].includes(courseCode.toLowerCase())) {
              courseCode = internalId;
          }

          let title = titleA.text().trim();
          // Clean title: remove code prefix if present (e.g. "infCN-01a: Computer Networks" -> "Computer Networks")
          title = title.replace(/^[a-zA-Z0-9._-]+[:\s]+/, "").trim();

          if (existingCodes.has(courseCode)) {
            courses.push({
              university: "CAU Kiel", courseCode, title, semesters: [{ term, year }],
              details: { is_partially_scraped: true, internalId } as any // eslint-disable-line @typescript-eslint/no-explicit-any
            });
            return;
          }

          let type = "Lecture";
          let category = "General";
          const titleLower = title.toLowerCase();

          if (titleLower.includes("advanced project") || titleLower.includes("oberprojekt") || titleLower.includes("advanced computer science project")) category = "Advanced Project";
          else if (titleLower.includes("seminar") && !titleLower.includes("supervision")) category = "Seminar";
          else if (titleLower.includes("colloquium") || titleLower.includes("kolloquium") || titleLower.includes("study group")) category = "Colloquia and study groups";
          else if (titleLower.includes("theoretical") || titleLower.includes("theoretische")) category = "Theoretical Computer Science";
          else if (titleLower.includes("involvement") || titleLower.includes("mitarbeit")) category = "Involvement in a working group";
          else if (titleLower.includes("thesis supervision") || titleLower.includes("begleitseminar zur masterarbeit")) category = "Master Thesis Supervision Seminar";
          else if (titleLower.includes("elective") || titleLower.includes("wahlpflicht")) category = "Compulsory elective modules in Computer Science";
          else if (titleLower.includes("open elective") || titleLower.includes("freie wahl")) category = "Open Elective";
          else category = "Standard Course";

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
                  const cType = (course.details as any).type || "Lecture"; // eslint-disable-line @typescript-eslint/no-explicit-any
                  const sched = (course.details as any).schedule; // eslint-disable-line @typescript-eslint/no-explicit-any
                  if (!sched[cType]) sched[cType] = [];
                  sched[cType].push(value);
              }
            }
          });

          const hasEnglishTag = (course.details as any).isEnglish; // eslint-disable-line @typescript-eslint/no-explicit-any
          const hasGermanChars = /[äöüß]/i.test(title);
          const hasEnglishKeywords = ['computer', 'data', 'science', 'network', 'system', 'software', 'intelligence', 'security', 'advanced', 'distributed', 'introduction', 'foundation', 'logic', 'machine', 'learning', 'cloud', 'robotics', 'project', 'seminar', 'vision', 'rendering', 'parallel', 'algorithm'].some(word => titleLower.includes(word));
          
          if (hasEnglishTag || (hasEnglishKeywords && !hasGermanChars)) {
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
    console.log(`[${this.name}] Scraping English courses from ${links.length} departments...`);
    const allItems: Course[] = [];
    for (const link of links) {
      const html = await this.fetchPage(link);
      if (html) {
        const batch = await this.parser(html, new Set());
        allItems.push(...batch);
      }
    }
    const merged = this.mergeCourses(allItems);
    console.log(`[${this.name}] Found ${merged.length} English academic items after merging.`);
    return merged;
  }

  private mergeCourses(items: Course[]): Course[] {
    const courseMap = new Map<string, Course>();
    
    const normalizeTitle = (title: string) => {
        let t = title.trim();
        t = t.replace(/^[a-zA-Z0-9._-]+[:\s]+/, "");
        const prefixes = /^(übung|.?bung|exercise|practical exercise|practice|tutorial|lab|projekt|project|workshop|fyord workshop|begleitseminar|oberseminar|tutorium)( zu| to)?[:\s]+/i;
        while (prefixes.test(t)) { t = t.replace(prefixes, ""); }
        return t.trim().toLowerCase();
    };

    const isSecondary = (c: Course) => {
        const type = (c.details as any).type; // eslint-disable-line @typescript-eslint/no-explicit-any
        return type === "Exercise" || type === "Practical" || type === "Project" ||
               /^(übung|.?bung|exercise|practical|practice|tutorial|lab|projekt|project|workshop)( zu| to)?:\s*/i.test(c.title);
    };

    const sorted = [...items].sort((a, b) => {
        const secA = isSecondary(a); const secB = isSecondary(b);
        if (secA === secB) return 0;
        return secA ? 1 : -1;
    });

    for (const item of sorted) {
      const itemNormTitle = normalizeTitle(item.title);
      let targetCode: string | undefined;

      // Match by code, code prefix, or alphanumeric variation
      if (courseMap.has(item.courseCode)) targetCode = item.courseCode;
      else if (item.courseCode.startsWith("PE") && courseMap.has(item.courseCode.substring(2))) targetCode = item.courseCode.substring(2);
      else if ((item.courseCode.startsWith("E") || item.courseCode.startsWith("P")) && courseMap.has(item.courseCode.substring(1))) targetCode = item.courseCode.substring(1);

      // 2. Normalize and check ALL codes in map for a matching internal ID
      if (!targetCode) {
          const itemInternalId = (item.details as any).internalId; // eslint-disable-line @typescript-eslint/no-explicit-any
          for (const [code, existing] of courseMap.entries()) {
              if ((existing.details as any).internalId === itemInternalId) { // eslint-disable-line @typescript-eslint/no-explicit-any
                  targetCode = code; break;
              }
          }
      }

      // 3. Match by normalized title
      if (!targetCode) {
        for (const [code, existing] of courseMap.entries()) {
             const existingNormTitle = normalizeTitle(existing.title);
             if (existingNormTitle === itemNormTitle && !isSecondary(existing)) {
                 targetCode = code; break;
             }
        }
      }

      // 4. Fuzzy containment match
      if (!targetCode) {
        for (const [code, existing] of courseMap.entries()) {
             const existingNormTitle = normalizeTitle(existing.title);
             if (existingNormTitle.length > 5 && (existingNormTitle.includes(itemNormTitle) || itemNormTitle.includes(existingNormTitle)) && !isSecondary(existing)) {
                 targetCode = code; break;
             }
        }
      }

      if (targetCode && courseMap.has(targetCode)) {
        const existing = courseMap.get(targetCode)!;
        // Prefer alphanumeric code as the main key
        const isNewCodeBetter = /^[a-zA-Z]/.test(item.courseCode) && /^\d/.test(existing.courseCode);
        
        const target = isNewCodeBetter ? item : existing;
        const source = isNewCodeBetter ? existing : item;
        
        if (isNewCodeBetter) {
            courseMap.delete(existing.courseCode);
            courseMap.set(item.courseCode, item);
        }

        const tDetails = target.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const sDetails = source.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        
        if (!tDetails.breakdown) tDetails.breakdown = [0, 0, 0, 0];
        if (!sDetails.breakdown) sDetails.breakdown = [0, 0, 0, 0];

        // Merge units
        const su = sDetails.rawUnits || 0;
        const stype = sDetails.type;
        if (stype === "Lecture") tDetails.breakdown[0] += su;
        else if (stype === "Seminar") tDetails.breakdown[1] += su;
        else if (stype === "Exercise") tDetails.breakdown[2] += su;
        else if (stype === "Practical" || stype === "Project") tDetails.breakdown[3] += su;

        // Merge schedules
        const sSched = sDetails.schedule || {};
        const tSched = tDetails.schedule || {};
        for (const [type, dates] of Object.entries(sSched)) {
            if (!tSched[type]) tSched[type] = [];
            (dates as string[]).forEach(d => { if (!tSched[type].includes(d)) tSched[type].push(d); });
        }
        tDetails.schedule = tSched;

        // Merge instructors
        const sInstr = sDetails.instructors || [];
        const tInstr = tDetails.instructors || [];
        sInstr.forEach((i: string) => { if (!tInstr.includes(i)) tInstr.push(i); });
        tDetails.instructors = tInstr;

        if (!target.description) target.description = source.description;
      } else {
        const details = item.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!details.breakdown) {
            details.breakdown = [0, 0, 0, 0];
            const u = details.rawUnits || 0;
            const type = details.type;
            if (type === "Lecture") details.breakdown[0] += u;
            else if (type === "Seminar") details.breakdown[1] += u;
            else if (type === "Exercise") details.breakdown[2] += u;
            else if (type === "Practical" || type === "Project") details.breakdown[3] += u;
        }
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
