import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";
import { fetch, Agent } from "undici";
import { parseCMUSemester } from "./utils/semester";

export class CMU extends BaseScraper {
  constructor() {
    super("cmu");
  }

  links(): string[] {
    return ["https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search"];
  }

  getSemesterParam(): string {
    // Default to F25 if no semester is provided
    if (!this.semester) return "F25";

    const input = this.semester.toLowerCase();
    const year = input.replace(/\D/g, "");
    const term = input.replace(/\d/g, "");
    
    const termMap: Record<string, string> = {
      'fa': 'F',
      'fall': 'F',
      'sp': 'S',
      'spring': 'S',
      'su': 'M',
      'summer': 'M'
    };
    
    const cmuTerm = termMap[term] || 'F';
    return `${cmuTerm}${year || '25'}`;
  }

  async retrieve(): Promise<Course[]> {
    const url = "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search";
    const cmuSemester = this.getSemesterParam();

    console.log(`[${this.name}] Using semester code: ${cmuSemester}`);

    const params = new URLSearchParams();
    params.append("SEMESTER", cmuSemester);
    params.append("MINI", "NO");
    params.append("GRAD_UNDER", "All");
    params.append("PRG_LOCATION", "All");
    params.append("DEPT", "CS");
    params.append("DEPT", "ECE");
    params.append("BEG_TIME", "All");
    params.append("KEYWORD", "");
    params.append("TITLE_ONLY", "NO");
    params.append("SUBMIT", "Retrieve Schedule");

    const html = await this.fetchPage(url, params);
    if (html) {
      return await this.parser(html);
    }
    return [];
  }

  async fetchPage(url: string, body?: URLSearchParams): Promise<string> {
    console.log(`[${this.name}] Fetching ${url}...`);

    try {
      const response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? {
          "Content-Type": "application/x-www-form-urlencoded",
        } : {},
        body: body,
        dispatcher: new Agent({
          connect: {
            rejectUnauthorized: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`
        );
      }
      return await response.text();
    } catch (error) {
      console.error(`[${this.name}] Error fetching ${url}:`, error);
      return "";
    }
  }

  async fetchDetail(courseCode: string, semester: string): Promise<{ description: string; corequisites: string }> {
    const cleanCode = courseCode.replace(/-/g, "");
    const url = `https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/courseDetails?COURSE=${cleanCode}&SEMESTER=${semester}`;
    
    // Small delay to be polite
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const html = await this.fetchPage(url);
      if (!html) return { description: "", corequisites: "" };
      
      const $ = cheerio.load(html);
      const description = $("#course-detail-description p").text().trim();
      
      const prereq = $("dt:contains('Prerequisites')").next("dd").text().trim();
      const coreq = $("dt:contains('Corequisites')").next("dd").text().trim();
      
      let combined = "";
      if (prereq && prereq !== "None") combined += `Prereq: ${prereq}`;
      if (coreq && coreq !== "None") combined += (combined ? "; " : "") + `Coreq: ${coreq}`;
      
      return { description, corequisites: combined };
    } catch (error) {
      console.error(`[${this.name}] Error fetching details for ${courseCode}:`, error);
      return { description: "", corequisites: "" };
    }
  }

  async parser(html: string): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];

    // Parse semester code (e.g., "F25" -> "Fall", 2025)
    const semesterCode = this.getSemesterParam();
    const { term, year } = parseCMUSemester(semesterCode);

    const ALLOWED_DEPTS = [
      "ELECTRICAL & COMPUTER ENGINEERING",
      "COMPUTER SCIENCE",
    ];

    const tables = $("table#search-results-table");
    
    for (const tableElement of tables.toArray()) {
      const table = $(tableElement);
      const prevH4 = table.prevAll("h4.department-title").first();
      if (prevH4.length === 0) continue;

      const deptName = prevH4.text().trim();
      if (!ALLOWED_DEPTS.includes(deptName)) continue;

      const tbody = table.find("tbody");
      if (tbody.length === 0) continue;

      let currentCourse: Course | null = null;
      const rows = tbody.find("tr").toArray();

      for (const trElement of rows) {
        const cols = $(trElement).find("td");
        if (cols.length < 10) continue;

        const getText = (idx: number) => $(cols[idx]).text().trim().replace(/\u00a0/g, " ");
        const rawId = getText(0);

        // CMU course IDs usually look like "15-112" or "15112"
        if (rawId && (/\d{2}-\d{3}/.test(rawId) || /^\d{5}$/.test(rawId))) {
          if (currentCourse) {
            courses.push(currentCourse);
          }

          // Extract URL from onclick attribute if present
          // openModal('#course-detail-modal', '...', '/open/SOC/SOCServlet/courseDetails?COURSE=15050&SEMESTER=F25', ...)
          const onclick = $(cols[0]).find('a').attr('onclick') || '';
          const urlMatch = onclick.match(/openModal\('[^']+',\s*'[^']+',\s*'([^']+)'/);
          let courseUrl = "";
          if (urlMatch) {
            courseUrl = `https://enr-apps.as.cmu.edu${urlMatch[1]}`.replace(/&amp;/g, "&");
          }

          // const { description, corequisites } = await this.fetchDetail(rawId, semester);
          const description = "";
          const corequisites = "";

          // Determine Level: CMU levels are like 15-112. 
          // 100-500 are Undergraduate, 600+ are Graduate.
          let level = "undergraduate";
          const numMatch = rawId.match(/-(\d+)/);
          if (numMatch) {
            const num = parseInt(numMatch[1]);
            if (num >= 600) level = "graduate";
          }

          let department = "Computer Science";
          if (rawId.startsWith("18")) {
            department = "Electrical & Computer Engineering";
          }

          currentCourse = {
            university: this.name,
            courseCode: rawId,
            title: getText(1),
            units: getText(2),
            description: description,
            url: courseUrl,
            department: department,
            corequisites: corequisites,
            level: level,
            semesters: [{ term: term, year: year }],
            details: {
              sections: [],
            },
          };
        }

        if (currentCourse) {
          const secId = getText(3);
          const meeting = {
            days: getText(5),
            begin: getText(6),
            end: getText(7),
            location: getText(8),
          };

          if (rawId || secId) {
            const section = {
              id: secId,
              meetings: [meeting],
            };
            const details = currentCourse.details as { sections: { id: string; meetings: { days: string; begin: string; end: string; location: string }[] }[] };
            details.sections.push(section);
          } else {
            const details = currentCourse.details as { sections: { id: string; meetings: { days: string; begin: string; end: string; location: string }[] }[] };
            const sections = details.sections;
            if (sections.length > 0) {
              sections[sections.length - 1].meetings.push(meeting);
            }
          }
        }
      }
      
      if (currentCourse) {
        courses.push(currentCourse);
      }
    }

    return courses;
  }
}
