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

  test("excludes denylisted Inf-HPC entries", async () => {
    const scraper = new CAU();
    const html = `
      <table>
        <tr>
          <td width="100%">
            <a href="anew/lecture_view?key=456">High Performance Computing</a>
            [Inf-HPC] (456789)
            <dl>
              <dt>Details</dt>
              <dd>Lecture, 4 cred.h, English</dd>
            </dl>
          </td>
        </tr>
      </table>
    `;

    const courses = await scraper.parser(html);

    expect(courses).toHaveLength(0);
  });

  test("excludes entries whose details explicitly say they are taught in German", async () => {
    const scraper = new CAU();
    const html = `
      <table>
        <tr>
          <td width="100%">
            <a href="anew/lecture_view?key=789">MS0202: Effiziente Algorithmen</a>
            [MS0202] (789012)
            <dl>
              <dt>Details</dt>
              <dd>Lecture, 4 cred.h, ECTS studies, ECTS credits: 8, This course will be taught in German.</dd>
            </dl>
          </td>
        </tr>
      </table>
    `;

    const courses = await scraper.parser(html);

    expect(courses).toHaveLength(0);
  });
});
