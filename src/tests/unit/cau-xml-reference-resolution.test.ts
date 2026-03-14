import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU reference resolution", () => {
  test("extracts a readable room label from room_view html", () => {
    const html = readFileSync("src/tests/fixtures/cau/room-view.html", "utf8");
    const scraper = new CAU();

    expect(scraper.parseRoomViewForTests(html)).toEqual({
      name: "LMS 8 - R.108",
      short: "LMS 8 - R.108",
      building: "Ludewig-Meyn-Str. 8",
      address: "24118 Kiel",
      label: "LMS 8 - R.108, Ludewig-Meyn-Str. 8, 24118 Kiel",
    });
  });

  test("extracts a readable person label from tel_view html", () => {
    const html = readFileSync("src/tests/fixtures/cau/person-view.html", "utf8");
    const scraper = new CAU();

    expect(scraper.parsePersonViewForTests(html)).toEqual({
      name: "Prof. Dr. Jens Jansen",
      email: "jj@informatik.uni-kiel.de",
      office: "LMS 8, Room 210",
    });
  });
});
