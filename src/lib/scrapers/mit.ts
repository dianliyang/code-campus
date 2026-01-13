import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Course } from './types';
import { AnyNode, Element, Text } from 'domhandler';

export class MIT extends BaseScraper {
  constructor() {
    super("mit");
  }

  links(term?: string): string[] {
    let termPath = "";
    if (term === "spring") {
      termPath = "/archive/spring";
    } else if (term === "fall") {
      termPath = "/archive/fall";
    }

    return ['a', 'b', 'c', 'd', 'e'].map(
      (i) => `https://student.mit.edu/catalog${termPath}/m6${i}.html`
    );
  }

  async parser(html: string): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const h3Tags = $('h3');

    h3Tags.each((_, h3Element) => {
      const h3 = $(h3Element);
      const headerText = h3.text().replace(/\s+/g, ' ').trim();
      const match = headerText.match(/^([\w\.]+J?)\s+(.+)/);

      if (!match) return;

      const courseId = match[1];
      const courseTitle = match[2];

      const details: Record<string, any> = {};
      const descriptionParts: string[] = [];
      const instructors: string[] = [];
      let descriptionStarted = false;
      const consumedNodes = new Set<AnyNode>();

      // Access the raw node from cheerio element
      let curr: AnyNode | null = h3Element.next;

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
              while (temp && (temp.type !== 'tag' || (temp.name !== 'br' && temp.name !== 'h3'))) {
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
            if (['Fall', 'Spring', 'Summer', 'IAP'].includes(alt)) {
              if (!details['terms']) details['terms'] = [];
              if (!details['terms'].includes(alt)) details['terms'].push(alt);
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
        course_code: courseId,
        title: courseTitle,
        units: details.units,
        description: descriptionParts.join(" ").trim(),
        details: {
          prerequisites: details.prerequisites,
          terms: details.terms,
          instructors: instructors
        }
      });
    });

    return courses;
  }
}
