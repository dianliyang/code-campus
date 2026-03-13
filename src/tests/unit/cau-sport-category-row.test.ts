import { describe, expect, test, vi } from "vitest";
import { CAUSport } from "@/lib/scrapers/cau-sport";

describe("CAUSport category page parsing", () => {
  test("keeps day time instructor and price from the category row while enriching dates and location from the duration page", async () => {
    const scraper = new CAUSport();

    vi.spyOn(scraper, "fetchPage").mockResolvedValue(`
      <html><body>
        <div>Zeitraum: 13.10.2025-30.03.2026</div>
        <b>Veranstaltungsorte:</b>
        <br>
        <div class="bs_text">Spielhalle, Olshausenstraße 72, 24118 Kiel</div>
      </body></html>
    `);

    const categoryHtml = `
      <html><body class="bs_wintersemester_25_26">
        <table>
          <tbody>
            <tr>
              <td class="bs_sknr"><span>3194-01</span></td>
              <td class="bs_sdet">
                <span><span class="dispmobile">Volleyball</span> Mixed 2</span>
              </td>
              <td class="bs_stag">Mo</td>
              <td class="bs_szeit">19:00-20:00</td>
              <td class="bs_sort"><a href="/cgi/webpage.cgi?spid=5efc2838bae815ff5d6fbe6b32ca3152">Spielhalle</a></td>
              <td class="bs_szr"><a href="/cgi/webpage.cgi?kursinfo=050F1D5F86">13.10. - 30.03.</a></td>
              <td class="bs_skl">Guidance Coach</td>
              <td class="bs_spreis"><span>12,00 / 18,00 / 24,00</span></td>
              <td class="bs_sbuch"><input type="submit" value="buchen"></td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `;

    const workouts = await scraper.parseWorkouts(
      categoryHtml,
      "https://server.sportzentrum.uni-kiel.de/angebote/aktueller_zeitraum/_Volleyball.html",
    );

    expect(workouts).toHaveLength(1);
    expect(workouts[0]).toMatchObject({
      courseCode: "3194-01",
      title: "Volleyball Mixed 2",
      dayOfWeek: "Mon",
      startTime: "19:00",
      endTime: "20:00",
      instructor: "Guidance Coach",
      priceStudent: 12,
      priceStaff: 18,
      priceExternal: 24,
      location: "Spielhalle, Olshausenstraße 72, 24118 Kiel",
      locationEn: "Spielhalle, Olshausenstraße 72, 24118 Kiel",
      startDate: "2025-10-13",
      endDate: "2026-03-30",
    });
    expect(workouts[0]).not.toHaveProperty("duration");
    expect(workouts[0].details).not.toHaveProperty("duration");
    expect(workouts[0].details).not.toHaveProperty("durationLocations");
  });

  test("keeps expired and blocked volleyball rows instead of dropping them", async () => {
    const scraper = new CAUSport();

    vi.spyOn(scraper, "fetchPage").mockImplementation(async (url: string) => {
      if (url.includes("050F1D5F6E")) {
        return `
          <html><body>
            <div>Zeitraum: 27.10.2025-23.02.2026</div>
            <b>Veranstaltungsorte:</b>
            <br>
            <div class="bs_text">Große Sporthalle, Olshausenstr. 72, 24118 Kiel</div>
          </body></html>
        `;
      }
      if (url.includes("05E7F2BA60")) {
        return `
          <html><body>
            <div>Zeitraum: 13.10.2025-13.10.2025</div>
            <b>Veranstaltungsorte:</b>
            <br>
            <div class="bs_text">Große Sporthalle, Olshausenstr. 72, 24118 Kiel</div>
          </body></html>
        `;
      }
      if (url.includes("050F1D5F8B")) {
        return `
          <html><body>
            <div>Zeitraum: 27.10.2025-23.02.2026</div>
            <b>Veranstaltungsorte:</b>
            <br>
            <div class="bs_text">Große Sporthalle, Olshausenstr. 72, 24118 Kiel</div>
          </body></html>
        `;
      }
      return "";
    });

    const categoryHtml = `
      <html><body class="bs_wintersemester_25_26">
        <table>
          <tbody>
            <tr>
              <td class="bs_sknr"><span>3195-01</span></td>
              <td class="bs_sdet"><span><span class="dispmobile">Volleyball </span>Kiel-Liga</span></td>
              <td class="bs_stag">Mo</td>
              <td class="bs_szeit">20:00-22:00</td>
              <td class="bs_sort"><a href="/cgi/webpage.cgi?spid=2fadfae501b120ec200e7bbc91bd7a6e">Große Sporthalle</a></td>
              <td class="bs_szr"><span><a href="/cgi/webpage.cgi?kursinfo=050F1D5F8B">27.10.-23.02.</a></span></td>
              <td class="bs_skl"><span>Christoph</span></td>
              <td class="bs_spreis"><span>30/ 30/ 30/ 30 €</span></td>
              <td class="bs_sbuch"><span class="bs_btn_gesperrt">gesperrt</span></td>
            </tr>
            <tr>
              <td class="bs_sknr"><span>3195-02</span></td>
              <td class="bs_sdet"><span><span class="dispmobile">Volleyball </span>norddeutsche Hochschulliga</span></td>
              <td class="bs_stag">Mo</td>
              <td class="bs_szeit">18:00-20:00</td>
              <td class="bs_sort"><a href="/cgi/webpage.cgi?spid=2fadfae501b120ec200e7bbc91bd7a6e">Große Sporthalle</a></td>
              <td class="bs_szr"><span><a href="/cgi/webpage.cgi?kursinfo=050F1D5F6E">27.10.-23.02.</a></span></td>
              <td class="bs_skl"><span>Bassam, Christoph</span></td>
              <td class="bs_spreis"><span>50/ --/ --/ -- €</span></td>
              <td class="bs_sbuch"><span class="bs_btn_abgelaufen">abgelaufen</span></td>
            </tr>
            <tr>
              <td class="bs_sknr"><span>3196-01</span></td>
              <td class="bs_sdet"><span><span class="dispmobile">Volleyball </span>norddeutsche Hochschulliga Sichtungstraining</span></td>
              <td class="bs_stag">Mo</td>
              <td class="bs_szeit">18:00-20:00</td>
              <td class="bs_sort"><a href="/cgi/webpage.cgi?spid=2fadfae501b120ec200e7bbc91bd7a6e">Große Sporthalle</a></td>
              <td class="bs_szr"><span><a href="/cgi/webpage.cgi?kursinfo=05E7F2BA60">13.10.</a></span></td>
              <td class="bs_skl"><span>Bassam, Christoph</span></td>
              <td class="bs_spreis"><span><span>entgeltfrei</span></span></td>
              <td class="bs_sbuch"><span class="bs_btn_abgelaufen">abgelaufen</span></td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `;

    const workouts = await scraper.parseWorkouts(
      categoryHtml,
      "https://server.sportzentrum.uni-kiel.de/angebote/aktueller_zeitraum/_Volleyball.html",
    );

    expect(workouts).toHaveLength(3);
    expect(workouts.map((w) => w.courseCode)).toEqual(["3195-01", "3195-02", "3196-01"]);
    expect(workouts[0]).toMatchObject({
      bookingStatus: "blocked",
      dayOfWeek: "Mon",
      startTime: "20:00",
      endTime: "22:00",
    });
    expect(workouts[1]).toMatchObject({
      bookingStatus: "expired",
      instructor: "Bassam, Christoph",
      priceStudent: 50,
      priceStaff: null,
      priceExternal: null,
      priceExternalReduced: null,
      startDate: "2025-10-27",
      endDate: "2026-02-23",
    });
    expect(workouts[1]).not.toHaveProperty("duration");
    expect(workouts[1].details).not.toHaveProperty("duration");
    expect(workouts[1].details).not.toHaveProperty("durationLocations");
    expect(workouts[2]).toMatchObject({
      bookingStatus: "expired",
      instructor: "Bassam, Christoph",
      priceStudent: 0,
      startDate: "2025-10-13",
      endDate: "2025-10-13",
    });
    expect(workouts[2].locationEn).toBe("Große Sporthalle, Olshausenstr. 72, 24118 Kiel");
  });
});
