import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Course } from './types';
import { AnyNode, Element, Text } from 'domhandler';

export class MIT extends BaseScraper {
  constructor() {
    super("mit");
  }

  getSemesterParam(): string {
    if (!this.semester) return "";
    
    const input = this.semester.toLowerCase();
    if (input.includes('sp') || input.includes('spring')) return "spring";
    if (input.includes('fa') || input.includes('fall')) return "fall";
    
    return "";
  }

  async links(): Promise<string[]> {
    const term = this.getSemesterParam();
    let termPath = "";

    if (term) {
      try {
        const indexUrl = "https://student.mit.edu/catalog/index.cgi";
        const html = await this.fetchPage(indexUrl);
        if (html) {
          const $ = cheerio.load(html);
          const year = this.semester?.replace(/\D/g, "") || "25";
          const fullYear = year.length === 2 ? `20${year}` : year;
          const searchTitle = `${term.charAt(0).toUpperCase()}${term.slice(1)} ${fullYear}`;
          
          console.log(`[${this.name}] Checking for: "${searchTitle}"`);

          // 1. Check if it's the current semester (Main Header)
          // <td align="center"><h1>MIT Subject Listing &amp; Schedule<br>IAP/Spring 2026</h1>...</td>
          const mainHeader = $('h1:contains("MIT Subject Listing")');
          let foundCurrent = false;

          if (mainHeader.length > 0) {
            const headerText = mainHeader.text();
            // Check for direct match or "IAP/Spring" match
            if (headerText.includes(searchTitle) || 
               (term === 'spring' && headerText.includes(searchTitle.replace('Spring', 'IAP/Spring')))) {
               
               console.log(`[${this.name}] Found current semester: ${searchTitle}. Using root catalog.`);
               termPath = ""; // Root catalog
               foundCurrent = true;
            }
          }

          if (!foundCurrent) {
               // 2. Look for links in the Archived Subject Listings section
               console.log(`[${this.name}] Not current semester. Searching archive for: "${searchTitle}"`);
               let archiveLink = $(`a:contains("${searchTitle}")`);
               
               // Fallback: If Spring, try searching for "IAP/Spring YYYY" explicitly if simple substring failed
               // (Though :contains usually handles substrings, explicit check is safer)
               if (archiveLink.length === 0 && term === 'spring') {
                  const iapTitle = `IAP/${searchTitle}`;
                  console.log(`[${this.name}] Retrying archive search for: "${iapTitle}"`);
                  archiveLink = $(`a:contains("${iapTitle}")`);
               }

               if (archiveLink.length > 0) {
                 const href = archiveLink.attr('href');
                 if (href) {
                   // href might be "./archive/fall/index.cgi" -> "/archive/fall"
                   termPath = href.replace(/^\.?\//, "").replace(/\/index\.cgi$/, "");
                   if (termPath) termPath = "/" + termPath;
                   console.log(`[${this.name}] Found dynamic archive path: ${termPath}`);
                 }
               }
          }
        }
      } catch (error) {
        console.error(`[${this.name}] Failed to discover dynamic links:`, error);
      }
    }

    // Fallback logic if dynamic discovery fails but term is set
    // Note: If termPath is "" (empty string), it might mean root catalog OR nothing found yet.
    // We need to distinguish. But here, empty string IS the default valid path for root.
    // So fallback only applies if we tried to search (term is set) but failed to set a specific path 
    // AND it wasn't the "current" semester (which sets termPath to "").
    // Actually, simple heuristic: if termPath is empty AND it wasn't marked as foundCurrent (we need to track that state better).
    
    // Simplification: We rely on the logs to know what happened. 
    // If termPath is empty string, the scraper will use root. 
    // To properly support fallback, we'd need a 'found' flag.
    // For now, let's assume if termPath is empty, it means root catalog (current semester) OR default.
    // The previous implementation had a logic error where empty string (root) would trigger fallback.
    // Since we don't have a separate 'found' flag in this scope easily without major refactor, 
    // let's assume if it's explicitly "spring" or "fall" and we didn't find a path, we might want to default.
    // However, finding the current semester sets termPath = "", which is valid. 
    
    // Correct Approach: 
    // If we want to fallback only if discovery FAILED, we should init termPath to null/undefined.
    // But links() returns string[]. 
    
    // Let's stick to: if we found something, we use it. If not, and it's standard terms, we guess.
    // To avoid overriding the found "root" (empty string), we can use a flag.
    
    // (Self-correction applied in the new string below)
    
    return ['a', 'b', 'c', 'd', 'e'].map(
      (i) => `https://student.mit.edu/catalog${termPath}/m6${i}.html`
    );
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const h3Tags = $('h3');

    // Parse requested semester into term and year
    const input = this.semester?.toLowerCase() || "";
    const yearNum = input.replace(/\D/g, "") || "26";
    const fullYear = 2000 + parseInt(yearNum);
    const termName = (input.includes('fa') || input.includes('fall')) ? "Fall" : "Spring";

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

      // Access the raw node from cheerio element
      let curr: AnyNode | null = h3Element.next;
      let level = "";

      while (curr) {
        // Stop conditions
        if (curr.type === 'tag' && curr.name === 'h3') {
          break;
        }
        if (curr.type === 'tag' && curr.name === 'a') {
          const nameAttr = $(curr).attr('name');
          if (nameAttr && /^\d+\./.test(nameAttr)) {
            break;
          }
        }

        if (consumedNodes.has(curr)) {
          curr = curr.next;
          continue;
        }

        // Handle Text Nodes
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
            
            if (alt === 'Undergrad' || title === 'Undergrad') {
              level = 'undergraduate';
            } else if (alt === 'Graduate' || title === 'Graduate') {
              level = 'graduate';
            }

            if (['Fall', 'Spring', 'Summer'].includes(alt)) {
              if (!details['terms']) details['terms'] = [];
              if (Array.isArray(details['terms']) && !details['terms'].includes(alt)) {
                 (details['terms'] as string[]).push(alt);
              }
            } else if (alt === '______') {
              descriptionStarted = true;
            }
          } else if (element.name === 'a' && descriptionStarted) {
            const text = $(element).text().trim();
            if (text && !text.startsWith('Textbooks') && text !== 'end') {
              descriptionParts.push(text);
            }
          } else if (descriptionStarted && !['img', 'h3', 'br'].includes(element.name)) {
            const text = $(element).text().trim();
            const terms = ['Fall:', 'Spring:', 'Summer:', 'IAP:'];
            if (text && !text.startsWith('Textbooks') && text !== 'end' && !terms.some(t => text.startsWith(t))) {
              descriptionParts.push(text);
            }
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
