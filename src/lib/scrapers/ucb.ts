import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";

export class UCB extends BaseScraper {
  constructor() {
    super("ucb");
  }

  getSemesterParam(): string {
    if (!this.semester) return "2262"; // Default to Spring 2026
    
    const input = this.semester.toLowerCase();
    
    // UCB Term codes: 2 + Last 2 of year + (2=Spring, 5=Summer, 8=Fall)
    const yearMatch = input.match(/\d{2}/);
    const yearCode = yearMatch ? yearMatch[0] : "26";
    
    let termSuffix = "2"; // Spring
    if (input.includes('fa') || input.includes('fall')) termSuffix = "8";
    if (input.includes('su') || input.includes('summer')) termSuffix = "5";
    
    return `2${yearCode}${termSuffix}`;
  }

  links(maxPages: number = 10): string[] {
    const termCode = this.getSemesterParam();
    const links: string[] = [];
    // Using mnemonic subject areas which are more stable
    ["COMPSCI", "EECS", "EL ENG"].map((subject) => {
      for (let page = 0; page < maxPages; page++) {
        links.push(
          `https://classes.berkeley.edu/search/class?f%5B0%5D=term%3A${termCode}&f%5B1%5D=subject_area%3A${subject}&page=${page}`
        );
      }
    });

    return links;
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const rows = $("div.views-row");

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
