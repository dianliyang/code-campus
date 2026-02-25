import { describe, expect, test } from "vitest";
import { CAU } from "../../lib/scrapers/cau";

describe("CAU scraper filtering", () => {
  test("excludes layout-only master project entries", async () => {
    const scraper = new CAU();
    const html = `
      <table>
        <tr>
          <td width="100%">
            <a href="anew/lecture_view?key=123">Masterprojekt - Echtzeitsysteme/Eingebettete Systeme (Layout)</a>
            [infMP-01a] (123456)
            <dl>
              <dt>Details</dt>
              <dd>Project, 2 SWS, English</dd>
            </dl>
          </td>
        </tr>
      </table>
    `;

    const courses = await scraper.parser(html);
    expect(courses).toHaveLength(0);
  });
});
