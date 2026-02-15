import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";
import { parseSemesterCode } from "./utils/semester";

export class UCB extends BaseScraper {
  constructor() {
    super("ucb");
  }

  getSemesterParam(): string {
    if (!this.semester) return "8576"; // Default to Spring 2026

    const input = this.semester.toLowerCase();
    
    // UC Berkeley specific term IDs for 2026
    if (input.includes('sp26')) return "8576"; // Spring 2026
    if (input.includes('su26')) return "8580"; // Summer 2026
    if (input.includes('fa25')) return "8240"; // Fall 2025 (Approximation based on increments)
    
    // Fallback to calculation if not in map
    const { term, year } = parseSemesterCode(this.semester);
    const yearCode = year.toString().substring(2);
    let termSuffix = "2";
    if (term === "Spring") termSuffix = "2";
    else if (term === "Summer") termSuffix = "5";
    else if (term === "Fall") termSuffix = "8";
    else if (term === "Winter") termSuffix = "1";

    return `2${yearCode}${termSuffix}`;
  }

  // Satisfy abstract member, though retrieve is overridden for sequential fetching
  links(): string[] {
    return [];
  }

  // Override retrieve to implement early exit if a term is not published
  async retrieve(): Promise<Course[]> {
    const termCode = this.getSemesterParam();
    // Use numeric subject IDs: 5582=COMPSCI, 5475=EECS, 5476=EL ENG
    const subjects = ["5582", "5475", "5476"];
    const allCourses: Course[] = [];
    const maxPages = 10;

    console.log(`[${this.name}] Starting sequential retrieval for term ${termCode}...`);

    for (const subject of subjects) {
      console.log(`[${this.name}] Processing subject ID: ${subject}`);
      
      for (let page = 0; page < maxPages; page++) {
        const url = `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A${termCode}&f%5B1%5D=subject_area%3A${subject}&page=${page}`;
        const html = await this.fetchPage(url);
        
        if (!html) break;

        const $ = cheerio.load(html);
        
        // Check for "No results found"
        if (html.includes("No results found") || $(".views-row").length === 0) {
          console.log(`[${this.name}] No results found for ${subject} on page ${page}. Skipping remaining pages for this subject.`);
          break;
        }

        const courses = await this.parser(html);
        allCourses.push(...courses);

        // If we got fewer than 20 rows (UCB default page size), it's likely the last page
        if ($(".views-row").length < 20) break;
      }
    }

    // Deduplicate by courseCode to prevent Supabase ON CONFLICT errors
    const uniqueMap = new Map<string, Course>();
    allCourses.forEach(c => {
        if (!uniqueMap.has(c.courseCode)) {
            uniqueMap.set(c.courseCode, c);
        }
    });

    return Array.from(uniqueMap.values());
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const rows = $("div.views-row");

    // Parse requested semester
    const input = this.semester?.toLowerCase() || "";
    const { term: termName, year: fullYear } = parseSemesterCode(input);

    rows.each((_, rowElement) => {
      const row = $(rowElement);
      const article = row.find("article.st");
      if (article.length === 0) return;

      const sectionNameSpan = article.find("span.st--section-name");
      const courseCode = sectionNameSpan.text().trim();

      const titleDiv = article.find("div.st--title");
      const title = titleDiv.find("h2").text().trim();

      // OPTIMIZATION: If course already exists for this semester, skip parsing details
      if (existingCodes.has(courseCode)) {
        courses.push({
          university: this.name,
          courseCode: courseCode,
          title: title,
          semesters: [{ term: termName, year: fullYear }],
          details: { is_partially_scraped: true }
        });
        return;
      }

      const urlPath = article
        .find("div.st--section-name-wraper a")
        .attr("href");
      const courseUrl = urlPath ? `https://classes.berkeley.edu${urlPath}` : "";

      const deptLink = article.find("span.st-section-dept a");
      const department =
        deptLink.length > 0 ? deptLink.first().text().trim() : "";

      const sectionCodeSpan = article.find("span.st--section-code");
      const sectionCode = sectionCodeSpan.text().trim();

      const sectionCountSpans = article.find("span.st--section-count");
      const sectionNumber = sectionCountSpans.last().text().trim();

      const fullSection = `${sectionCode} ${sectionNumber}`.trim();

      const unitsDiv = article.find("div.st--details-unit");
      const units =
        unitsDiv.length > 0 ? unitsDiv.text().replace("Units:", "").trim() : "";

      const descDiv = article.find("div.st--description");
      const description = descDiv.length > 0 ? descDiv.text().trim() : "";

      // Determine level: UC Berkeley undergraduate is 1-199, graduate is 200+
      let level = "undergraduate";
      const codeNumMatch = courseCode.match(/\d+/);
      if (codeNumMatch) {
        const num = parseInt(codeNumMatch[0]);
        if (num >= 200) level = "graduate";
      }

      // Extract corequisites from description if possible
      let corequisites = "";
      const coreqMatch = description.match(/(?:Corequisites?|Prerequisites?|Prereq):\s*(.*?)(?=\.|$)/i);
      if (coreqMatch) {
        corequisites = coreqMatch[1].trim();
      }

      const meetingsDiv = article.find("div.st--meetings");
      let days = "";
      let time = "";
      let location = "";

      if (meetingsDiv.length > 0) {
        const daysDiv = meetingsDiv.find("div.st--meeting-days");
        if (daysDiv.length > 0) {
          const spans = daysDiv.find("span");
          if (spans.length > 1) {
            days = $(spans[1]).text().trim();
          }
        }

        const timeDiv = meetingsDiv.find("div.st--meeting-time");
        if (timeDiv.length > 0) {
          const spans = timeDiv.find("span");
          if (spans.length > 1) {
            time = $(spans[1]).text().trim();
          }
        }

        const locDiv = meetingsDiv.find("div.st--location");
        if (locDiv.length > 0) {
          const aTag = locDiv.find("a");
          if (aTag.length > 0) {
            aTag.find("svg").remove();
            location = aTag.text().trim();
          } else {
            location = locDiv.text().trim();
          }
        }
      }

      courses.push({
        university: this.name,
        courseCode: courseCode,
        title: title,
        units: units,
        description: description,
        url: courseUrl,
        department: department,
        level: level,
        corequisites: corequisites,
        semesters: [{ term: termName, year: fullYear }],
        details: {
          section: fullSection,
          days: days,
          time: time,
          location: location,
        },
      });
    });

    return courses;
  }
}
