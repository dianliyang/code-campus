import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Course } from './types';

export class Stanford extends BaseScraper {
  constructor() {
    super("stanford");
  }

  links(query: string = "CS", terms?: string[]): string[] {
    if (!terms) {
      terms = ["Autumn", "Winter", "Spring", "Summer"];
    }

    const baseUrl = "https://explorecourses.stanford.edu/print";
    const params = new URLSearchParams();
    params.append("filter-coursestatus-Active", "on");
    params.append("descriptions", "on");
    params.append("q", query);

    for (const term of terms) {
      params.append(`filter-term-${term}`, "on");
    }

    return [`${baseUrl}?${params.toString()}`];
  }

  async fetchPage(url: string): Promise<string> {
    console.log(`[${this.name}] Fetching ${url} with cookies...`);
    try {
      const response = await fetch(url, {
        headers: {
          "Cookie": "jsenabled=1"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`[${this.name}] Error fetching ${url}:`, error);
      return "";
    }
  }

  async parser(html: string): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];

    $('.searchResult').each((_, element) => {
      const result = $(element);
      const course: Course = {
        university: this.name,
        course_code: '',
        title: '',
        description: '',
        details: {
          terms: [],
          instructors: []
        }
      };

      const courseInfo = result.find('.courseInfo');
      if (courseInfo.length > 0) {
        const numberSpan = courseInfo.find('.courseNumber');
        if (numberSpan.length > 0) {
          course.course_code = numberSpan.text().trim().replace(/:$/, '');
        }

        const titleSpan = courseInfo.find('.courseTitle');
        if (titleSpan.length > 0) {
          course.title = titleSpan.text().trim();
        }

        const descDiv = courseInfo.find('.courseDescription');
        if (descDiv.length > 0) {
          course.description = descDiv.text().trim();
        }
      }

      result.find('.courseAttributes').each((_, attrDiv) => {
        const text = $(attrDiv).text().replace(/\s+/g, ' ').trim();

        if (text.includes('Terms:')) {
          const parts = text.split('|');
          for (const part of parts) {
            const p = part.trim();
            if (p.startsWith('Terms:')) {
              const termsStr = p.replace('Terms:', '').trim();
              (course.details as any).terms = termsStr.split(',').map(t => t.trim()).filter(t => t);
            } else if (p.startsWith('Units:')) {
              course.units = p.replace('Units:', '').trim();
            }
          }
        }

        if (text.includes('Instructors:')) {
          let instructorsText = text.replace('Instructors:', '').trim();
          if (instructorsText.startsWith(';')) {
            instructorsText = instructorsText.substring(1).trim();
          }

          if (instructorsText) {
            const links = $(attrDiv).find('a');
            if (links.length > 0) {
                (course.details as any).instructors = links.map((_, a) => $(a).text().trim()).get();
            } else {
                (course.details as any).instructors = [instructorsText];
            }
          }
        }
      });

      courses.push(course);
    });

    return courses;
  }
}
