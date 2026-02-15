import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Course } from './types';
import { AnyNode, Element, Text } from 'domhandler';
import { parseSemesterCode } from './utils/semester';

export class MIT extends BaseScraper {
  constructor() {
    super("mit");
  }

  getSemesterParam(): string {
    if (!this.semester) return "";
    
    const input = this.semester.toLowerCase();
    if (input.includes('sp') || input.includes('spring')) return "Spring";
    if (input.includes('fa') || input.includes('fall')) return "Fall";
    if (input.includes('su') || input.includes('summer')) return "Summer";
    if (input.includes('wi') || input.includes('winter')) return "Winter";
    
    return "";
  }

  async links(): Promise<string[]> {
    const term = this.getSemesterParam().toLowerCase();
    let termPath = "";

    if (term) {
      try {
        const indexUrl = "https://student.mit.edu/catalog/index.cgi";
        const html = await this.fetchPage(indexUrl);
        if (html) {
          const $ = cheerio.load(html);
          const yearNum = this.semester?.replace(/\D/g, "") || "25";
          const fullYear = yearNum.length === 2 ? `20${yearNum}` : yearNum;
          const searchTitle = `${term.charAt(0).toUpperCase()}${term.slice(1)} ${fullYear}`;
          
          console.log(`[${this.name}] Checking for: "${searchTitle}"`);

          // 1. Check if it's the current semester (Main Header)
          const mainHeader = $('h1:contains("MIT Subject Listing")');
          let foundCurrent = false;

          if (mainHeader.length > 0) {
            const headerText = mainHeader.text();
            // Handle cases like "IAP/Spring 2026" or "Fall 2025"
            if (headerText.toLowerCase().includes(searchTitle.toLowerCase()) || 
               (term === 'spring' && headerText.toLowerCase().includes('iap/spring ' + fullYear))) {
               
               console.log(`[${this.name}] Found current semester: ${searchTitle}. Using root catalog.`);
               termPath = ""; 
               foundCurrent = true;
            }
          }

          if (!foundCurrent) {
               console.log(`[${this.name}] Not current semester. Searching archive for: "${searchTitle}"`);
               let archiveLink = $(`a:contains("${searchTitle}")`);
               
               if (archiveLink.length === 0 && term === 'spring') {
                  archiveLink = $(`a:contains("IAP/${searchTitle}")`);
               }

               if (archiveLink.length > 0) {
                 const href = archiveLink.attr('href');
                 if (href) {
                   termPath = href.replace(/^\.?\//, "").replace(/\/index\.cgi$/, "");
                   if (termPath) termPath = "/" + termPath;
                   console.log(`[${this.name}] Found dynamic archive path: ${termPath}`);
                 }
               } else {
                 console.log(`[${this.name}] Semester "${searchTitle}" not found in current listing or archives.`);
                 return []; // Terminate early and return 0 links
               }
          }
        }
      } catch (error) {
        console.error(`[${this.name}] Failed to discover dynamic links:`, error);
        return [];
      }
    }

    return ['a', 'b', 'c', 'd', 'e'].map(
      (i) => `https://student.mit.edu/catalog${termPath}/m6${i}.html`
    );
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const h3Tags = $('h3');

    // Parse requested semester
    const input = this.semester?.toLowerCase() || "";
    const { term: termName, year: fullYear } = parseSemesterCode(input);

    h3Tags.each((_, h3Element) => {
      const h3 = $(h3Element);
      const headerText = h3.text().replace(/\s+/g, ' ').trim();
      const match = headerText.match(/^([\w\.]+J?)\s+(.+)/);

      if (!match) return;

      const courseId = match[1];
      const courseTitle = match[2];

      // OPTIMIZATION: If course already exists for this semester, skip parsing details
      if (existingCodes.has(courseId)) {
        courses.push({
          university: this.name,
          courseCode: courseId,
          title: courseTitle,
          semesters: [{ term: termName, year: fullYear }],
          details: { is_partially_scraped: true }
        });
        return;
      }

      const details: Record<string, string | string[] | undefined> = {};
      const descriptionParts: string[] = [];
      const instructors: string[] = [];
      let descriptionStarted = false;
      const consumedNodes = new Set<AnyNode>();

      let curr: AnyNode | null = h3Element.next;
      let level = "";

      while (curr) {
        if (curr.type === 'tag' && curr.name === 'h3') break;
        if (curr.type === 'tag' && curr.name === 'a') {
          const nameAttr = $(curr).attr('name');
          if (nameAttr && /^\d+\./.test(nameAttr)) break;
        }

        if (consumedNodes.has(curr)) {
          curr = curr.next;
          continue;
        }

        if (curr.type === 'text') {
          const textNode = curr as Text;
          const text = textNode.data.trim();
          
          if (text) {
            if (text.startsWith('Prereq:')) {
              const parts = [text.replace('Prereq:', '').trim()];
              let temp = curr.next;
              while (temp && (temp.type !== 'tag' || (temp.name !== 'br' && temp.name !== 'h3' && temp.name !== 'img'))) {
                parts.push($(temp).text().trim());
                consumedNodes.add(temp);
                temp = temp.next;
              }
              details['prerequisites'] = parts.join(" ").trim();
            } else if (text.startsWith('Units:')) {
              const parts = [text.replace('Units:', '').trim()];
              let temp = curr.next;
              while (temp && (temp.type !== 'tag' || (temp.name !== 'br' && temp.name !== 'h3'))) {
                parts.push($(temp).text().trim());
                consumedNodes.add(temp);
                temp = temp.next;
              }
              details['units'] = parts.join(" ").trim();
            } else if (descriptionStarted) {
              const terms = ['Fall:', 'Spring:', 'Summer:', 'IAP:'];
              if (terms.some(t => text.startsWith(t))) {
                let instText = text;
                const temp = curr.next;
                if (temp && temp.type === 'tag' && temp.name === 'i') {
                  instText += " " + $(temp).text().trim();
                  consumedNodes.add(temp);
                }
                instructors.push(instText);
              } else if (!text.startsWith('Textbooks') && text !== 'end') {
                descriptionParts.push(text);
              }
            }
          }
        } else if (curr.type === 'tag') {
          const element = curr as Element;
          if (element.name === 'img') {
            const alt = $(element).attr('alt') || '';
            const title = $(element).attr('title') || '';
            
            if (alt === 'Undergrad' || title === 'Undergrad') level = 'undergraduate';
            else if (alt === 'Graduate' || title === 'Graduate') level = 'graduate';

            if (['Fall', 'Spring', 'Summer'].includes(alt)) {
              if (!details['terms']) details['terms'] = [];
              if (Array.isArray(details['terms']) && !details['terms'].includes(alt)) {
                 (details['terms'] as string[]).push(alt);
              }
            } else if (alt === '______') descriptionStarted = true;
          } else if (element.name === 'a' && descriptionStarted) {
            const text = $(element).text().trim();
            if (text && !text.startsWith('Textbooks') && text !== 'end') descriptionParts.push(text);
          } else if (descriptionStarted && !['img', 'h3', 'br'].includes(element.name)) {
            const text = $(element).text().trim();
            const terms = ['Fall:', 'Spring:', 'Summer:', 'IAP:'];
            if (text && !text.startsWith('Textbooks') && text !== 'end' && !terms.some(t => text.startsWith(t))) descriptionParts.push(text);
          }
        }
        curr = curr.next;
      }

      courses.push({
        university: this.name,
        courseCode: courseId,
        title: courseTitle,
        units: details.units as string | undefined,
        description: descriptionParts.join(" ").trim(),
        department: "Electrical Engineering and Computer Science",
        level: level,
        corequisites: details.prerequisites as string | undefined,
        semesters: [{ term: termName, year: fullYear }],
        details: {
          terms: details.terms,
          instructors: instructors
        }
      });
    });

    return courses;
  }
}
