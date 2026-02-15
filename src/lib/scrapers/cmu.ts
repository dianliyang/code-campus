import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";
import { fetch, Agent } from "undici";
import { parseCMUSemester } from "./utils/semester";

export class CMU extends BaseScraper {
  private agent: Agent;

  constructor() {
    super("cmu");
    this.agent = new Agent({
      connect: {
        rejectUnauthorized: false
      }
    });
  }

  links(): string[] {
    return ["https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search"];
  }

  getSemesterParam(): string {
    // Default to F25 if no semester is provided
    if (!this.semester) return "F25";

    const input = this.semester.toLowerCase();
    const year = input.replace(/\D/g, "");
    const term = input.replace(/[\d\s]/g, ""); // Remove digits and whitespace
    
    const termMap: Record<string, string> = {
      'fa': 'F',
      'fall': 'F',
      'sp': 'S',
      'spring': 'S',
      'su': 'M',
      'summer': 'M'
    };
    
    const cmuTerm = termMap[term] || 'F';
    // Use last 2 digits of year
    const shortYear = year.length === 4 ? year.slice(2) : (year || '25');
    
    return `${cmuTerm}${shortYear}`;
  }

  async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[${this.name}] Fetching ${url} (attempt ${attempt})...`);
        const response = await fetch(url, { dispatcher: this.agent });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return await response.text();
      } catch (error) {
        console.error(`[${this.name}] Attempt ${attempt} failed for ${url}:`, error);
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    return "";
  }

  async retrieve(): Promise<Course[]> {
    const url = "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search";
    const cmuSemester = this.getSemesterParam();
    const { term, year } = parseCMUSemester(cmuSemester);

    console.log(`[${this.name}] Using semester code: ${cmuSemester}`);

    // Get existing courses to skip detailed fetching
    const existingCodes = this.db 
      ? await this.db.getExistingCourseCodes("CMU", term, year)
      : new Set<string>();
    
    if (existingCodes.size > 0) {
      console.log(`[${this.name}] Found ${existingCodes.size} existing courses in DB. These will skip detail fetching.`);
    }

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

    const html = await this.fetchWithBody(url, params);
    if (html) {
      return await this.parser(html, existingCodes);
    }
    return [];
  }

  private async fetchWithBody(url: string, body?: URLSearchParams): Promise<string> {
    console.log(`[${this.name}] Fetching ${url}...`);

    try {
      const response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? {
          "Content-Type": "application/x-www-form-urlencoded",
        } : {},
        body: body,
        dispatcher: this.agent,
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

  async fetchDetail(courseCode: string, semester: string): Promise<{
    description: string;
    prerequisites: string;
    corequisites: string;
    relatedUrls: string[];
    crossListedCourses: string;
  }> {
    const cleanCode = courseCode.replace(/-/g, "");
    const url = `https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/courseDetails?COURSE=${cleanCode}&SEMESTER=${semester}`;

    // Small delay to be polite
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const html = await this.fetchPage(url);
      if (!html) return {
        description: "",
        prerequisites: "",
        corequisites: "",
        relatedUrls: [],
        crossListedCourses: ""
      };

      const $ = cheerio.load(html);

      // Extract description
      const description = $("#course-detail-description p").text().trim();

      // Extract prerequisites
      const prerequisites = $("dt:contains('Prerequisites')").next("dd").text().trim();

      // Extract corequisites
      const corequisites = $("dt:contains('Corequisites')").next("dd").text().trim();

      // Extract related URLs (excluding generic department homepages)
      const relatedUrls: string[] = [];
      const ignoredUrls = [
        "http://www.csd.cmu.edu",
        "https://www.csd.cmu.edu",
        "http://www.ece.cmu.edu/",
        "https://www.ece.cmu.edu/"
      ];
      $("#course-detail-related-urls a").each((_, el) => {
        const href = $(el).attr("href");
        if (href && !ignoredUrls.includes(href)) {
          relatedUrls.push(href);
        }
      });

      // Extract cross-listed courses
      const crossListedCourses = $("dt:contains('Cross-Listed Courses')").next("dd").text().trim();

      return {
        description,
        prerequisites: prerequisites === "None" ? "" : prerequisites,
        corequisites: corequisites === "None" ? "" : corequisites,
        relatedUrls,
        crossListedCourses: crossListedCourses === "None" ? "" : crossListedCourses
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching details for ${courseCode}:`, error);
      return {
        description: "",
        prerequisites: "",
        corequisites: "",
        relatedUrls: [],
        crossListedCourses: ""
      };
    }
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
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

          // Check if we should skip detail fetching
          const shouldSkip = existingCodes.has(rawId);
          
          let detailsInfo: {
            description: string;
            prerequisites: string;
            corequisites: string;
            relatedUrls: string[];
            crossListedCourses: string;
          } = {
            description: "",
            prerequisites: "",
            corequisites: "",
            relatedUrls: [],
            crossListedCourses: ""
          };

          // Extract URL from onclick attribute if present
          const onclick = $(cols[0]).find('a').attr('onclick') || '';
          const urlMatch = onclick.match(/openModal\('[^']+',\s*'[^']+',\s*'([^']+)'/);
          let courseUrl = "";
          if (urlMatch) {
            courseUrl = `https://enr-apps.as.cmu.edu${urlMatch[1]}`.replace(/&amp;/g, "&");
          }

          if (!shouldSkip) {
            // Fetch detailed course information
            detailsInfo = await this.fetchDetail(rawId, semesterCode);
          }

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
            description: detailsInfo.description,
            url: courseUrl,
            department: department,
            corequisites: detailsInfo.corequisites,
            level: level,
            semesters: [{ term: term, year: year }],
            details: {
              sections: [],
              prerequisites: detailsInfo.prerequisites,
              relatedUrls: detailsInfo.relatedUrls,
              crossListedCourses: detailsInfo.crossListedCourses,
              is_partially_scraped: shouldSkip // Flag to indicate details were skipped
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
