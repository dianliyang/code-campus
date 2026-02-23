import { beforeEach, describe, expect, test } from "vitest";
import { CMU } from "../../lib/scrapers/cmu";

describe("CMU scraper math department", () => {
  let scraper: CMU;

  beforeEach(() => {
    scraper = new CMU();
  });

  test("parser includes courses from MATHEMATICAL SCIENCES department", async () => {
    const html = `
      <html><body>
        <h4 class="department-title">MATHEMATICAL SCIENCES</h4>
        <table id="search-results-table">
          <tbody>
            <tr>
              <td>21-241</td>
              <td>Matrices and Linear Transformations</td>
              <td>10</td>
              <td>A</td>
              <td></td>
              <td>MWF</td>
              <td>10:00AM</td>
              <td>10:50AM</td>
              <td>WEH 7500</td>
              <td>Smith J</td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `;
    // Pass existing code so detail-fetch HTTP call is skipped
    const courses = await scraper.parser(html, new Set(["21-241"]));
    expect(courses.length).toBeGreaterThan(0);
    expect(courses[0].courseCode).toBe("21-241");
  });

  test("parser assigns Mathematical Sciences department to 21-xxx courses", async () => {
    const html = `
      <html><body>
        <h4 class="department-title">MATHEMATICAL SCIENCES</h4>
        <table id="search-results-table">
          <tbody>
            <tr>
              <td>21-241</td>
              <td>Matrices and Linear Transformations</td>
              <td>10</td>
              <td>A</td>
              <td></td>
              <td>MWF</td>
              <td>10:00AM</td>
              <td>10:50AM</td>
              <td>WEH 7500</td>
              <td>Smith J</td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `;
    const courses = await scraper.parser(html, new Set(["21-241"]));
    expect(courses[0].department).toBe("Mathematical Sciences");
  });
});
