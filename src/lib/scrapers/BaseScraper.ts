import { Course } from './types';
import pLimit from 'p-limit';

export abstract class BaseScraper {
  name: string;
  semester?: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Returns the university-specific semester parameter based on the `this.semester` property.
   * Default implementation returns empty string.
   * Override this in subclasses to provide specific mapping logic.
   */
  getSemesterParam(): string {
    return "";
  }

  abstract links(): string[] | Promise<string[]>;

  abstract parser(html: string): Course[] | Promise<Course[]>;

  async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[${this.name}] Fetching ${url} (attempt ${attempt})...`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return await response.text();
      } catch (error) {
        console.error(`[${this.name}] Attempt ${attempt} failed for ${url}:`, error);
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    console.error(`[${this.name}] All ${retries} attempts failed for ${url}`);
    return "";
  }

  async retrieve(): Promise<Course[]> {
    const links = await this.links();
    console.log(`[${this.name}] Processing ${links.length} links...`);

    const limit = pLimit(5);
    const results = await Promise.all(
      links.map(link =>
        limit(async () => {
          const html = await this.fetchPage(link);
          if (html) {
            return this.parser(html);
          }
          return [];
        })
      )
    );

    return results.flat();
  }
}
