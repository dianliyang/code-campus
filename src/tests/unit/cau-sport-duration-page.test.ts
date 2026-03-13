import { describe, expect, test, vi } from "vitest";
import { CAUSport } from "@/lib/scrapers/cau-sport";

describe("CAUSport duration page parsing", () => {
  test("prefers explicit Zeitraum ranges over unrelated dates in the page body", async () => {
    const scraper = new CAUSport();

    vi.spyOn(scraper, "fetchPage").mockResolvedValue(`
      <html>
        <body>
          <div>Zeitraum: 13.10.2025-30.03.2026</div>
          <div>Anmeldeschluss: 01.09.2025</div>
        </body>
      </html>
    `);

    const dates = await scraper.parsePlannedDates("https://example.com/duration");

    expect(dates).toEqual(["13.10.2025", "30.03.2026"]);
  });

  test("extracts Veranstaltungsorte from the duration page metadata", async () => {
    const scraper = new CAUSport();

    vi.spyOn(scraper, "fetchPage").mockResolvedValue(`
      <html><body>
        <b>Veranstaltungsorte:</b>
        <br>
        <div class="bs_text">
          <a href="https://server.sportzentrum.uni-kiel.de/cgi/webpage.cgi?spid=18dad9656f4222457931a1d5bbf555f5&amp;campus=0&amp;z=61&amp;f=0">Turnhalle</a>, Olshausenstr. 72, 24118 Kiel
        </div>
      </body></html>
    `);

    const metadata = await scraper.parseDurationPageMetadata("https://example.com/duration");

    expect(metadata.locations).toEqual(["Turnhalle, Olshausenstr. 72, 24118 Kiel"]);
  });

  test("extracts location from planned-date schedule rows", async () => {
    const scraper = new CAUSport();

    vi.spyOn(scraper, "fetchPage").mockResolvedValue(`
      <html><body>
        <table>
          <tbody>
            <tr>
              <td class="bs_stag">Mo</td>
              <td class="bs_szeit">19:00-20:00</td>
              <td class="bs_sort">
                <a href="/cgi/webpage.cgi?spid=5efc2838bae815ff5d6fbe6b32ca3152">Spielhalle</a>
              </td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `);

    const metadata = await scraper.parseDurationPageMetadata("https://example.com/duration");

    expect(metadata.locations).toEqual(["Spielhalle"]);
  });
});
