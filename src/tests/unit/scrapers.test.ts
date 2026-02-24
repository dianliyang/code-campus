import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CMU } from '../../lib/scrapers/cmu';

// Mock dependencies
vi.mock('undici', () => {
  return {
    fetch: vi.fn(),
    Agent: vi.fn(),
  };
});

vi.mock('../../lib/scrapers/utils/semester', () => ({
  parseCMUSemester: vi.fn(() => ({ term: 'Fall', year: 2025 })),
}));

describe('CMU Scraper', () => {
  let scraper: CMU;

  beforeEach(() => {
    scraper = new CMU();
    vi.clearAllMocks();
  });

  test('should initialize correctly', () => {
    expect(scraper.name).toBe('cmu');
  });

  test('getSemesterParam should return correct code', () => {
    // Default
    expect(scraper.getSemesterParam()).toBe('F25');
    
    // Custom
    scraper.semester = 'Spring 2026';
    expect(scraper.getSemesterParam()).toBe('S26');
  });

  test('links should return the search URL', async () => {
    const links = await scraper.links();
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('SOCServlet/search');
  });

  test('parser should extract courses from HTML', async () => {
    // Mock HTML that resembles CMU SOC table
    const mockHtml = `
      <html>
        <body>
          <h4 class="department-title">COMPUTER SCIENCE</h4>
          <table id="search-results-table">
            <tbody>
              <tr>
                <td>15-112</td>
                <td>Fundamentals of Programming</td>
                <td>12.0</td>
                <td>A</td>
                <td>Lec</td>
                <td>MWF</td>
                <td>10:00AM</td>
                <td>11:20AM</td>
                <td>GHC 4401</td>
                <td>Smith</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const courses = await scraper.parser(mockHtml);
    
    expect(courses).toHaveLength(1);
    expect(courses[0].courseCode).toBe('15-112');
    expect(courses[0].title).toBe('Fundamentals of Programming');
    expect(courses[0].units).toBe('12.0');
    expect(courses[0].department).toBe('Computer Science');
    expect(courses[0].level).toBe('undergraduate');
  });

  test('parser should skip non-CS/ECE departments', async () => {
     const mockHtml = `
      <html>
        <body>
          <h4 class="department-title">HISTORY</h4>
          <table id="search-results-table">
            <tbody>
              <tr>
                <td>79-104</td>
                <td>Global History</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
    const courses = await scraper.parser(mockHtml);
    expect(courses).toHaveLength(0);
  });
});
