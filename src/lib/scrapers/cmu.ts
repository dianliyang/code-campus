import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Course } from './types';
import { fetch, Agent } from 'undici';

export class CMU extends BaseScraper {
  constructor() {
    super("cmu");
  }

  links(): string[] {
    return ["https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search"];
  }

  async fetchPage(url: string): Promise<string> {
    console.log(`[${this.name}] Fetching data from ${url} using POST...`);
    
    const params = new URLSearchParams();
    params.append("SEMESTER", "S25");
    params.append("MINI", "NO");
    params.append("GRAD_UNDER", "All");
    params.append("PRG_LOCATION", "All");
    params.append("DEPT", "CS");
    params.append("DEPT", "ECE");
    params.append("BEG_TIME", "All");
    params.append("KEYWORD", "");
    params.append("TITLE_ONLY", "NO");
    params.append("SUBMIT", "Retrieve Schedule");

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        dispatcher: new Agent({
          connect: {
            rejectUnauthorized: false
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`[${this.name}] Error fetching data:`, error);
      return "";
    }
  }

  async parser(html: string): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    
    const ALLOWED_DEPTS = ['ELECTRICAL & COMPUTER ENGINEERING', 'COMPUTER SCIENCE'];
    
    const tables = $('table#search-results-table');
    
    tables.each((_, tableElement) => {
        const table = $(tableElement);
        // Find closest previous h4 with class department-title
        const prevH4 = table.prevAll('h4.department-title').first();
        if (prevH4.length === 0) return;
        
        const deptName = prevH4.text().trim();
        if (!ALLOWED_DEPTS.includes(deptName)) return;
        
        const tbody = table.find('tbody');
        if (tbody.length === 0) return;
        
        let currentCourse: Course | null = null;
        
        tbody.find('tr').each((_, trElement) => {
            const cols = $(trElement).find('td');
            if (cols.length < 10) return;
            
            const getText = (idx: number) => $(cols[idx]).text().trim();
            
            const courseIdText = getText(0);
            const titleText = getText(1);
            const unitsText = getText(2);
            const secText = getText(3);
            const daysText = getText(5);
            const beginText = getText(6);
            const endText = getText(7);
            const locationText = getText(8);
            
            if (courseIdText) {
                if (currentCourse) {
                    courses.push(currentCourse);
                }
                
                currentCourse = {
                    university: this.name,
                    course_code: courseIdText,
                    title: titleText,
                    units: unitsText,
                    description: "", 
                    details: {
                        sections: []
                    }
                };
            }
            
            const meeting = {
                days: daysText,
                begin: beginText,
                end: endText,
                location: locationText
            };
            
            if (currentCourse) {
                if (courseIdText || secText) {
                    const section = {
                        id: secText,
                        meetings: [meeting]
                    };
                    currentCourse.details!.sections.push(section);
                } else {
                    // Continuation
                    const sections = currentCourse.details!.sections;
                    if (sections.length > 0) {
                        sections[sections.length - 1].meetings.push(meeting);
                    }
                }
            }
        });
        
        if (currentCourse) {
            courses.push(currentCourse);
        }
    });
    
    return courses;
  }
}
