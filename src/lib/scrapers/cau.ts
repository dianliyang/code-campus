import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";

interface CAUDetails {
  internalId: string;
  schedule: Record<string, string[]>;
  type?: string;
  rawUnits?: number;
  breakdown?: [number, number, number];
  instructors?: string[];
}

export class CAU extends BaseScraper {
  constructor() {
    super("cau");
  }

  getSemesterParam(): string {
    if (!this.semester) return "2025w"; // Default to Winter 2025/26

    const input = this.semester.toLowerCase();
    const yearNum = parseInt(input.replace(/\D/g, "")) || 25;
    const year = 2000 + yearNum;

    if (input.includes('fa') || input.includes('fall') || input.includes('wi') || input.includes('winter')) {
      return `${year}w`;
    } else if (input.includes('sp') || input.includes('spring')) {
      // Spring 2026 is part of Winter 2025/26
      return `${year - 1}w`;
    } else if (input.includes('su') || input.includes('summer')) {
      return `${year}s`;
    }

    return `${year}w`;
  }

  async links(): Promise<string[]> {
    const sem = this.getSemesterParam();
    try {
      // 1. Visit index to get a fresh session if possible, or just use the known pattern
      // UnivIS links are often ephemeral. The most reliable way is to find the current directory path.
      const baseUrl = "https://univis.uni-kiel.de/form";
      const indexHtml = await this.fetchPage(`${baseUrl}?__s=2&dsc=anew/tlecture&anonymous=1&lang=en&sem=${sem}`);
      const $ = cheerio.load(indexHtml);
      
      // Look for the specific department link in the index
      // techn/infora/master/wahlpf
      const deptLink = $('a:contains("Computer Science")').attr('href') || 
                       $('a[href*="techn/infora"]').attr('href');
      
      if (deptLink) {
        const fullUrl = deptLink.startsWith('http') ? deptLink : `https://univis.uni-kiel.de/${deptLink.replace(/^\//, '')}`;
        console.log(`[${this.name}] Discovered dynamic link: ${fullUrl}`);
        return [fullUrl];
      }
    } catch (e) {
      console.warn(`[${this.name}] Session discovery failed, falling back to static link pattern.`, e);
    }

    // Fallback to the pattern we know, but it might be brittle due to __s session param
    return [
      `https://univis.uni-kiel.de/form?__s=2&dsc=anew/tlecture&showhow=long&anonymous=1&lang=en&sem=${sem}&tdir=techn/infora/master/wahlpf&__e=487`,
    ];
  }

  async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[${this.name}] Fetching ${url} (attempt ${attempt})...`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder("windows-1252");
        return decoder.decode(buffer);
      } catch (error) {
        console.error(`[${this.name}] Attempt ${attempt} failed for ${url}:`, error);
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    console.error(`[${this.name}] All ${retries} attempts failed for ${url}`);
    return "";
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
    const $ = cheerio.load(html);
    const allEnglishCourses: Course[] = [];

    // Parse current semester info for DB lookup consistency
    const semParam = this.getSemesterParam();
    const year = parseInt(semParam.substring(0, 4));
    const term = semParam.endsWith('w') ? "Winter" : "Spring";

    // 1. Collect all English courses first
    $("tr[valign=top]").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 2) {
        const contentTd = $(tds[1]);
        const titleA = contentTd.find("a").first();
        if (titleA.length > 0) {
          const fullText = contentTd.text().replace(/\s+/g, " ");
          
          const metaMatch = fullText.match(/(?:\[([\w-]+)\])?\s*\((\d{6})\)/);
          
          if (metaMatch) {
            const internalId = metaMatch[2];
            const courseCode = metaMatch[1] || internalId;
            
            let title = titleA.text().trim();
            if (metaMatch[1]) {
                 title = title.replace(new RegExp(`^${metaMatch[1]}:\\s*`), "");
            }

            // OPTIMIZATION: If course already exists for this semester, skip parsing details
            if (existingCodes.has(courseCode)) {
              allEnglishCourses.push({
                university: "CAU Kiel",
                courseCode: courseCode,
                title: title,
                semesters: [{ term, year }],
                details: { is_partially_scraped: true }
              });
              return;
            }

            // Determine Type for Unit Breakdown
            let type = "Lecture";
            const titleLower = title.toLowerCase();
            if (courseCode.startsWith("PE") || titleLower.startsWith("practical")) {
                type = "Practical";
            } else if (courseCode.startsWith("E") || courseCode.startsWith("P") || 
                       titleLower.startsWith("exercise") || titleLower.startsWith("practice") ||
                       titleLower.includes("bung")) {
                type = "Exercise";
            } else if (titleLower.includes("seminar")) {
                type = "Seminar";
            }

            const course: Course = {
              university: "CAU Kiel",
              courseCode: courseCode,
              title: title,
              department: "Computer Science",
              semesters: [{ term: "Spring", year: 2026 }],
              level: "graduate",
              details: {
                internalId: internalId,
                schedule: {} as Record<string, string[]>,
                type: type, // Store type for merging logic
                rawUnits: 0 // Store raw numeric units
              } as unknown as Record<string, unknown>
            };

            let isEnglish = false;
            contentTd.find("dl dt").each((_, dt) => {
              const label = $(dt).text().trim().toLowerCase();
              const dd = $(dt).next("dd");
              const value = dd.text().trim();

              if (label.includes("lecturer")) {
                (course.details as unknown as CAUDetails).instructors = value.split(",").map(i => i.trim());
              } else if (label.includes("details")) {
                const ectsMatch = value.match(/ECTS:\s*(\d+)/);
                if (ectsMatch) course.credit = parseInt(ectsMatch[1]);
                
                const unitsMatch = value.match(/(\d+)\s*cred\.h/);
                if (unitsMatch) {
                    const u = parseInt(unitsMatch[1]);
                    course.units = u.toString(); // Keep string for now
                    (course.details as unknown as CAUDetails).rawUnits = u;
                }
                
                if (value.toLowerCase().includes("language of lecture is english")) isEnglish = true;
              } else if (label.includes("prerequisites")) {
                course.corequisites = value;
              } else if (label.includes("contents")) {
                course.description = value;
              } else if (label.includes("dates")) {
                if (value) {
                    const sched = (course.details as unknown as CAUDetails).schedule;
                    if (!sched[type]) sched[type] = [];
                    sched[type].push(value);
                }
              }
            });

            if (isEnglish) {
              const rawUrl = titleA.attr("href");
              if (rawUrl) course.url = `https://univis.uni-kiel.de/${rawUrl.replace(/&amp;/g, "&")}`;
              allEnglishCourses.push(course);
            }
          }
        }
      }
    });

    // 2. Merge Exercises into Main Courses
    const courseMap = new Map<string, Course>();
    
    // Sort: Process potential "Main" courses first
    const isSecondary = (c: Course) => {
        const titleLower = c.title.toLowerCase();
        return c.courseCode.startsWith("E") || 
               c.courseCode.startsWith("P") || 
               titleLower.startsWith("exercise") || 
               titleLower.startsWith("practical") ||
               titleLower.includes("bung");
    };

    const sortedCourses = [...allEnglishCourses].sort((a, b) => {
        const secA = isSecondary(a);
        const secB = isSecondary(b);
        if (secA === secB) return 0;
        return secA ? 1 : -1; 
    });

    for (const course of sortedCourses) {
      const cleanTitle = course.title
        .replace(/^(.?bung|Exercise|Practical Exercise|Practice|Tutorial)( zu)?:\s*/i, "")
        .trim();

      let targetCode: string | undefined;

      if (course.courseCode.startsWith("PE") && courseMap.has(course.courseCode.substring(2))) {
        targetCode = course.courseCode.substring(2);
      } else if ((course.courseCode.startsWith("E") || course.courseCode.startsWith("P")) && courseMap.has(course.courseCode.substring(1))) {
        targetCode = course.courseCode.substring(1);
      }

      if (!targetCode) {
        for (const [code, existing] of courseMap.entries()) {
             if (existing.title === cleanTitle && !isSecondary(existing)) {
                 targetCode = code;
                 break;
             }
        }
      }

      const existing = targetCode ? courseMap.get(targetCode) : undefined;
      const target = existing || course;

      // Initialize breakdown if needed: [Lecture, Discussion, Exercise/Practical]
      if (!(target.details as unknown as CAUDetails).breakdown) {
          (target.details as unknown as CAUDetails).breakdown = [0, 0, 0];
      }

      // Add units to breakdown
      const u = (course.details as unknown as CAUDetails).rawUnits || 0;
      const type = (course.details as unknown as CAUDetails).type;
      
      const bd = (target.details as unknown as CAUDetails).breakdown!;
      if (type === "Lecture") {
          bd[0] += u;
      } else if (type === "Seminar") {
          bd[1] += u;
      } else { // Exercise, Practical
          bd[2] += u;
      }

      if (existing) {
        // Merge Schedule
        const sourceSched = (course.details as unknown as CAUDetails).schedule;
        const targetSched = (existing.details as unknown as CAUDetails).schedule;
        for (const [t, dates] of Object.entries(sourceSched)) {
            if (!targetSched[t]) targetSched[t] = [];
            (dates as string[]).forEach(d => {
                if (!targetSched[t].includes(d)) targetSched[t].push(d);
            });
        }
        // Merge metadata
        if (!existing.description && course.description) existing.description = course.description;
        if (!existing.corequisites && course.corequisites) existing.corequisites = course.corequisites;
      } else {
        courseMap.set(course.courseCode, course);
      }
    }

    const mergedCourses = Array.from(courseMap.values());
    
    // Finalize units string "L-D-E"
    mergedCourses.forEach(c => {
        const details = c.details as unknown as CAUDetails;
        if (details.breakdown) {
            c.units = `${details.breakdown[0]}-${details.breakdown[1]}-${details.breakdown[2]}`;
            delete details.breakdown; // Clean up
            delete details.rawUnits;
            delete details.type;
        }
    });

    console.log(`[${this.name}] Found ${mergedCourses.length} merged English courses`);
    return mergedCourses;
  }
}
