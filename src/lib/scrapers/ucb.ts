import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Course } from './types';

export class UCB extends BaseScraper {
  constructor() {
    super("ucb");
  }

  links(maxPages: number = 10): string[] {
    const links: string[] = [];
    for (let page = 0; page < maxPages; page++) {
      links.push(`https://classes.berkeley.edu/search/class?f%5B0%5D=subject_area:5582&f%5B1%5D=term:8573&f%5B2%5D=term:8576&page=${page}`);
    }
    return links;
  }

  async parser(html: string): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const rows = $('div.views-row');

    rows.each((_, rowElement) => {
      const row = $(rowElement);
      const article = row.find('article.st');
      if (article.length === 0) return;

      const titleDiv = article.find('div.st--title');
      const title = titleDiv.find('h2').text().trim();

      const sectionNameSpan = article.find('span.st--section-name');
      const courseCode = sectionNameSpan.text().trim();

      const sectionCodeSpan = article.find('span.st--section-code');
      const sectionCode = sectionCodeSpan.text().trim();

      const sectionCountSpans = article.find('span.st--section-count');
      const sectionNumber = sectionCountSpans.last().text().trim();

      const fullSection = `${sectionCode} ${sectionNumber}`.trim();

      const unitsDiv = article.find('div.st--details-unit');
      const units = unitsDiv.length > 0 ? unitsDiv.text().replace('Units:', '').trim() : "";

      const descDiv = article.find('div.st--description');
      const description = descDiv.length > 0 ? descDiv.text().trim() : "";

      const meetingsDiv = article.find('div.st--meetings');
      let days = "";
      let time = "";
      let location = "";

      if (meetingsDiv.length > 0) {
        const daysDiv = meetingsDiv.find('div.st--meeting-days');
        if (daysDiv.length > 0) {
          const spans = daysDiv.find('span');
          if (spans.length > 1) {
            days = $(spans[1]).text().trim();
          }
        }

        const timeDiv = meetingsDiv.find('div.st--meeting-time');
        if (timeDiv.length > 0) {
          const spans = timeDiv.find('span');
          if (spans.length > 1) {
            time = $(spans[1]).text().trim();
          }
        }

        const locDiv = meetingsDiv.find('div.st--location');
        if (locDiv.length > 0) {
          const aTag = locDiv.find('a');
          if (aTag.length > 0) {
            aTag.find('svg').remove();
            location = aTag.text().trim();
          } else {
            location = locDiv.text().trim();
          }
        }
      }

      courses.push({
        university: this.name,
        course_code: courseCode,
        title: title,
        units: units,
        description: description,
        details: {
          section: fullSection,
          days: days,
          time: time,
          location: location
        }
      });
    });

    return courses;
  }
}
