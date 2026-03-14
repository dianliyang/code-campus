import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { CAU } from "@/lib/scrapers/cau";

describe("CAU XML lecture parsing", () => {
  test("parses core lecture fields from XML", () => {
    const xml = readFileSync("src/tests/fixtures/cau/data.xml", "utf8");
    const scraper = new CAU();

    const lectures = scraper.parseXmlLecturesForTests(xml);
    const lecture = lectures.find((entry) => entry.id === "22632461");

    expect(lectures.length).toBeGreaterThan(0);
    expect(lecture).toEqual(
      expect.objectContaining({
        id: "22632461",
        short: "infEOR-01a",
        type: "V",
        name: "infEOR-01a: Einf\u00fchrung in Operations Research",
        orgname: "Algorithmische Optimale Steuerung - CO2-Aufnahme des Meeres",
        ectsCred: "6",
        sws: "2",
        classificationKeys: ["Title.techn.infora.master.wahlpf"],
        personKeys: ["Person.techn.infor.inform.algori.slawig"],
        roomKeys: ["Room.zentra_1.servic.ressou.gebude.dezern_1.refera.cap3i"],
      }),
    );

    expect(lecture?.terms[0]).toEqual(
      expect.objectContaining({
        starttime: "12:15",
        endtime: "13:45",
        repeat: "w1 4",
      }),
    );
  });
});
