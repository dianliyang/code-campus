import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";
import { fetch, Agent } from "undici";

export class CMU extends BaseScraper {
  constructor() {
    super("cmu");
  }

  async retrieve(): Promise<Course[]> {
    const url = "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search";
    
    const params = new URLSearchParams();
    params.append("SEMESTER", "F25"); // Updated to Fall 2025 to match sample
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
    const semester = "F25";

    const ALLOWED_DEPTS = [
      "ELECTRICAL & COMPUTER ENGINEERING",
      "COMPUTER SCIENCE",
    ];

    const tables = $("table#search-results-table");
    
    // LAZY UPDATE: Only fetch details for the first 5 courses by default
    // Increase this or use env var for full scrape
    const FETCH_LIMIT = process.env.FULL_SCRAPE ? 9999 : 5;
    let fetchCount = 0;

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

          let description = "";
          let corequisites = "";

          if (fetchCount < FETCH_LIMIT) {
            const details = await this.fetchDetail(rawId, semester);
            description = details.description;
            corequisites = details.corequisites;
            fetchCount++;
          }

          // Determine Level: CMU levels are like 15-112. 
          // 100-500 are Undergraduate, 600+ are Graduate.
          let level = "undergraduate";
          const numMatch = rawId.match(/-(\d+)/);
          if (numMatch) {
            const num = parseInt(numMatch[1]);
            if (num >= 600) level = "graduate";
          }

          currentCourse = {
            university: this.name,
            courseCode: rawId,
            title: getText(1),
            units: getText(2),
            description: description,
            corequisites: corequisites,
            level: level,
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
            (currentCourse.details as any).sections.push(section);
          } else {
            const sections = (currentCourse.details as any).sections;
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
