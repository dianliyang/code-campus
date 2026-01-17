import { Course } from './types';

export abstract class BaseScraper {
  name: string;
  semester?: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract links(): string[] | Promise<string[]>;

  abstract parser(html: string): Course[] | Promise<Course[]>;

  async fetchPage(url: string): Promise<string> {
    console.log(`[${this.name}] Fetching ${url}...`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`[${this.name}] Error fetching ${url}:`, error);
      return "";
    }
  }

  async retrieve(): Promise<Course[]> {
    const links = await this.links();
    const allCourses: Course[] = [];
    console.log(`[${this.name}] Processing ${links.length} links...`);

    for (const link of links) {
      const html = await this.fetchPage(link);
      if (html) {
        const courses = await this.parser(html);
        allCourses.push(...courses);
      }
    }

    return allCourses;
  }
}
