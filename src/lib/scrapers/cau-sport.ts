import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";

const DAY_MAP: Record<string, string> = {
  Mo: "Mon",
  Di: "Tue",
  Mi: "Wed",
  Do: "Thu",
  Fr: "Fri",
  Sa: "Sat",
  So: "Sun",
};

// German → English translation map for categories, titles, and locations
const DE_EN: Record<string, string> = {
  // --- Categories / Sports ---
  "Akrobatik": "Acrobatics",
  "Ballett, klassisches Ballett": "Ballet, Classical Ballet",
  "Boxen": "Boxing",
  "Eltern-Kind-Turnen": "Parent-Child Gymnastics",
  "Entspannung und Achtsamkeit": "Relaxation & Mindfulness",
  "Erste Hilfe Kurs": "First Aid Course",
  "Erste Hilfe Kurs für Kinder": "First Aid Course for Children",
  "Erste Hilfe Kurs für SL:": "First Aid Course for Instructors",
  "Fechten": "Fencing",
  "Fechten Semestergebühr": "Fencing Semester Fee",
  "Fitnessgymnastik für Ältere": "Fitness Gymnastics for Seniors",
  "Fußball": "Football",
  "Gerätturnen": "Artistic Gymnastics",
  "Gesellschaftstanz": "Ballroom Dance",
  "Gesellschaftstanz Semestergebühr": "Ballroom Dance Semester Fee",
  "Handball": "Handball",
  "Inlineskaten": "Inline Skating",
  "Jonglieren / Flow Arts": "Juggling / Flow Arts",
  "Kajakrolle": "Kayak Rolling",
  "Kampfsport Semestergebühr": "Martial Arts Semester Fee",
  "Kanupolo": "Canoe Polo",
  "Kinderklettern": "Kids Climbing",
  "Kinderklettern Ferien": "Kids Climbing Holiday",
  "Klettern": "Climbing",
  "Klettersport Semestergebühr": "Climbing Semester Fee",
  "Langhanteltraining": "Barbell Training",
  "Lauftreff": "Running Group",
  "Orientalischer Tanz": "Oriental Dance",
  "Orientierungslauf": "Orienteering",
  "Reiten": "Horse Riding",
  "Rhönrad/Cyr": "Rhönrad / Cyr Wheel",
  "Rudern": "Rowing",
  "Rückenfit": "Back Fitness",
  "Schach": "Chess",
  "Schwimmen Uni Wettkampf Mannschaft": "Swimming Uni Competition Team",
  "Schwimmen für SL:": "Swimming for Instructors",
  "Schwimmen öff. Schwimmbetrieb": "Swimming Public Pool",
  "Schwimmkurse Erwachsene": "Swimming Courses Adults",
  "Schwimmkurse Kinder": "Swimming Courses Children",
  "Segeln Grundlagen:": "Sailing Basics",
  "Semestergebühr freier Spielbetrieb": "Semester Fee Open Play",
  "Semestergebühr weitere Sportarten": "Semester Fee Other Sports",
  "Spleißworkshop": "Splicing Workshop",
  "Tenniskurse Semester": "Tennis Courses Semester",
  "Tischfußball": "Table Football",
  "Tischtennis": "Table Tennis",
  "Trampolin Großgerät": "Trampoline (Full-Size)",
  "Vertikaltuch": "Aerial Silks",
  "Völkerball": "Dodgeball",
  "FKN Fachkundenachweis für Seenotsignalmittel:": "FKN Distress Signal Certificate",
  "SKS Sportküstenschifferschein:": "SKS Coastal Skipper License",
  "Versicherungspaket für Übungsleiter:innen": "Insurance Package for Instructors",
  "Yacht Sicherheitstraining:": "Yacht Safety Training",
  "CAU Team beim Business Run Kiel": "CAU Team at Business Run Kiel",
  "CAU Uni-Jollen Regatta": "CAU Uni Dinghy Regatta",
  "Sportreisen (Kooperation mit Uni Hamburg)": "Sports Trips (Cooperation with Uni Hamburg)",
  "SBF Sportbootführerschein See Theorie:": "SBF Powerboat License Sea Theory",
  "SRC Funkausbildung:": "SRC Radio Training",
  "SSS Sportseeschifferschein:": "SSS Offshore Skipper License",
  "Inklusionssport": "Inclusive Sports",
  "Präventionssport CAU allg. Informationen": "Preventive Sports CAU General Info",
  "Pilates (Präventionssport)": "Pilates (Preventive Sports)",
  "Yoga, Hatha Yoga (Präventionssport)": "Yoga, Hatha Yoga (Preventive Sports)",
  "SPORTBOX": "SPORTBOX",
  "Entgeltfrei": "Free of charge",
  "entgeltfrei": "free of charge",
  // --- Title suffixes / Levels ---
  "Anf.": "Beginner",
  "Anfänger": "Beginner",
  "Anfänger*innen": "Beginners",
  "Anfänger/alle Level": "Beginner / All Levels",
  "Fortg.": "Advanced",
  "Fortgeschrittene": "Advanced",
  "Mittelstufe": "Intermediate",
  "Grundstufe": "Elementary",
  "Anf. + Fortg.": "Beginner + Advanced",
  "Anf. mit Grundk. und Mittelstufe": "Beginner w/ Basics & Intermediate",
  "Mittelstufe + Fortgeschrittene": "Intermediate + Advanced",
  "Mittelstufe bis Fortgeschrittene": "Intermediate to Advanced",
  "Mittelstufe und Fortgeschrittene": "Intermediate & Advanced",
  "Mittelstufe/Fortgeschrittene": "Intermediate / Advanced",
  "Unter- bis Oberstufe": "Lower to Upper Level",
  "Fortg. + Wettkampfteam": "Advanced + Competition Team",
  "Fortgeschrittene / Showgruppe": "Advanced / Show Group",
  "fortg. Anfänger": "Advanced Beginner",
  "fortg. Talentförderung": "Advanced Talent Development",
  "fortgeschrittene Anfänger*innen": "Advanced Beginners",
  "Grundlagentraining + Fortg.": "Fundamentals + Advanced",
  "Wettkampf/Fortgeschritten": "Competition / Advanced",
  "Wettkampftraining": "Competition Training",
  "Wiederholung und Vertiefung": "Review & Deepening",
  "Fitness auch Anf.": "Fitness incl. Beginner",
  "freies Spiel": "Open Play",
  "freies Training": "Open Training",
  "freies Training (Einzeltermin)": "Open Training (Single Session)",
  "freies Klettern": "Open Climbing",
  "freies Klettern (6-18 Jahre)": "Open Climbing (Ages 6-18)",
  "freies Klettern auch mit DAV-Berechtigung": "Open Climbing (DAV Permit)",
  "freies Klettern auch mit DAV-Berechtigung (ab 18J)": "Open Climbing (DAV Permit, 18+)",
  "freies Üben Ferienangebot": "Open Practice Holiday",
  "Hallentraining": "Indoor Training",
  "Handstandkurs": "Handstand Course",
  "Damen": "Women",
  "Frauen": "Women",
  "Herren": "Men",
  "Jedermann": "Everyone",
  "Showgruppe": "Show Group",
  "Schnupperstunde": "Trial Session",
  "Tanzabend": "Dance Night",
  "Leistungsgruppe Standard / Latein": "Performance Group Standard / Latin",
  "Disco Fox Grundkurs": "Disco Fox Basics",
  "Disco Fox for Runaways": "Disco Fox for Runaways",
  "Kinder bis 4 Jahre": "Children up to 4 Years",
  "Familienklettern ab 6 Jahren": "Family Climbing Ages 6+",
  "Seepferdchen": "Seahorse (Beginner Swim)",
  "Seepferdchen Einsteiger": "Seahorse Starter (Beginner Swim)",
  "Kraul Anfänger": "Front Crawl Beginner",
  "Kraul Fortgeschrittene": "Front Crawl Advanced",
  "Rollstuhlbasketball": "Wheelchair Basketball",
  "Uniliga": "Uni League",
  "norddeutsche Hochschulliga": "North German University League",
  "norddeutsche Hochschulliga Sichtungstraining": "North German University League Tryout",
  "DHM Wettkampfteam": "DHM Competition Team",
  "Vorbereitungskurs Felsklettern": "Rock Climbing Prep Course",
  "Aufbaukurs: Vorstieg": "Advanced Course: Lead Climbing",
  "Anfänger (Toprope)": "Beginner (Top Rope)",
  "Anfänger (Toprope International)": "Beginner (Top Rope International)",
  "Kumite-Formen": "Kumite Forms",
  "Hatha Yoga Präv.": "Hatha Yoga (Preventive)",
  "mit meditativem Ausklang": "with Meditative Ending",
  "durch Meditation, Atemtechnik & Yoga": "through Meditation, Breathing & Yoga",
  "mit Vorkenntnissen": "with Prior Knowledge",
  "für Anfänger*innen": "for Beginners",
  "für Anfänger*innen mit Grundkenntnissen": "for Beginners with Basic Knowledge",
  "für Teilnehmer*innen mit Vorkenntnissen": "for Participants with Prior Knowledge",
  "für Frauen Anf. und Fortg.": "for Women Beginner & Advanced",
  "nach DGUV Standard": "per DGUV Standard",
  "präventives Rückentraining": "Preventive Back Training",
  "Sicherheitstraining": "Safety Training",
  "Manövertraining im Semester Di": "Maneuver Training Semester Tue",
  "Vortragsreihe mit 5 Vorträgen": "Lecture Series (5 Lectures)",
  "Performance Class": "Performance Class",
  "Uni Wettk.Team Frauen/Männer": "Uni Competition Team Women/Men",
  "1. Hilfe Kurs": "First Aid Course",
  "nur Tanzabend": "Dance Night Only",
  "Ohne Betreuung": "Unsupervised",
  "jeweils 1.4. d.J. bis 31.3. des Folgejahres": "Apr 1 to Mar 31 of the following year",
  // --- Holiday course prefixes ---
  "Ferienkurs": "Holiday Course",
  // --- Locations ---
  "Spielhalle": "Sports Hall",
  "Fechthalle": "Fencing Hall",
  "Gymnastikhalle": "Gymnastics Hall",
  "Große Sporthalle": "Main Sports Hall",
  "Turnhalle": "Gym Hall",
  "Entspannungshalle oben": "Relaxation Hall Upper",
  "Entspannungshalle unten": "Relaxation Hall Lower",
  "Lehrschwimmbecken": "Training Pool",
  "Schwimmhalle flach": "Swimming Hall Shallow",
  "Schwimmhalle tief": "Swimming Hall Deep",
  "Schwimmhalle flach, Schwimmhalle tief": "Swimming Hall Shallow & Deep",
  "SchwHa-Sprungbecken": "Swimming Hall Diving Pool",
  "Kletteranlage": "Climbing Facility",
  "Nordmarksportfeld": "Nordmark Sports Field",
  "Stadion": "Stadium",
  "Stadionturm": "Stadium Tower",
  "Calisthenics Anlage am Uni Stadion": "Calisthenics Area at Uni Stadium",
  "Tennishalle Suchsdorf": "Tennis Hall Suchsdorf",
  "SH flach Bahn": "Pool Shallow Lane",
  "SH tief Bahn": "Pool Deep Lane",
};

// Cache sorted keys for translateDE so they aren't recomputed on every call
const DE_EN_SORTED_KEYS = Object.keys(DE_EN).sort((a, b) => b.length - a.length);

/**
 * Translate a German string to English using the DE_EN map.
 * Exact matches are returned immediately; otherwise performs substring replacement
 * in longest-match-first order to avoid partial overwrites.
 */
function translateDE(text: string): string {
  if (!text) return text;
  if (DE_EN[text]) return DE_EN[text];
  let result = text;
  for (const key of DE_EN_SORTED_KEYS) {
    if (result.includes(key)) {
      result = result.replaceAll(key, DE_EN[key]);
    }
  }
  return result;
}

const BOOKING_STATUS_MAP: Record<string, string> = {
  bs_btn_abgelaufen: "expired",
  bs_btn_ausgebucht: "fully_booked",
  bs_btn_gesperrt: "blocked",
  bs_btn_siehe_text: "see_text",
  bs_btn_buchen: "available",
  bs_btn_warteliste: "waitlist",
  bs_btn_storniert: "cancelled",
};

export interface WorkoutCourse {
  source: string;
  courseCode: string;
  category: string;
  categoryEn: string;
  title: string;
  titleEn: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  locationEn: string;
  instructor: string;
  startDate: string;
  endDate: string;
  priceStudent: number | null;
  priceStaff: number | null;
  priceExternal: number | null;
  priceExternalReduced: number | null;
  bookingStatus: string;
  bookingUrl: string;
  url: string;
  semester: string;
  details: Record<string, unknown>;
  duration?: string;
}

export class CAUSport extends BaseScraper {
  constructor() {
    super("cau-sport");
  }

  getSemesterParam(): string {
    if (!this.semester) return "aktueller_zeitraum";

    const input = this.semester.toLowerCase();
    const yearMatch = input.match(/\d{2}/);
    const currentYearShort = new Date().getFullYear() % 100;
    const yearNum = yearMatch ? parseInt(yearMatch[0]) : currentYearShort;

    const isWinter = input.includes("wi") || input.includes("winter") || input.includes("fa") || input.includes("fall");
    const isSummer = input.includes("su") || input.includes("summer");
    const isSpring = input.includes("sp") || input.includes("spring");

    // Current/upcoming transition semesters → use live path
    if (isWinter && yearNum === 25) return "aktueller_zeitraum";
    if (isSpring && yearNum === 26) return "aktueller_zeitraum";

    // Named archive paths
    if (isWinter) return `wintersemester_${yearNum}_${yearNum + 1}`;
    if (isSummer) return `sommersemester_${yearNum}`;
    if (isSpring) return `sommersemester_${yearNum}`;

    return "aktueller_zeitraum";
  }

  async fetchPage(url: string, retries = 3): Promise<string> {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[${this.name}] Fetching ${url} (attempt ${attempt})...`);
        const response = await fetch(url, { headers });

        if (response.status === 404) {
          console.log(`[${this.name}] Page not found (404): ${url}`);
          return "";
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        return new TextDecoder("iso-8859-1").decode(buffer);
      } catch {
        if (attempt === retries) {
          console.error(`[${this.name}] Failed to fetch ${url} after ${retries} attempts.`);
        } else {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return "";
  }

  async links(): Promise<string[]> {
    const sem = this.getSemesterParam();
    const url = `https://server.sportzentrum.uni-kiel.de/angebote/${sem}/index.html`;
    const html = await this.fetchPage(url);

    if (!html) {
      console.log(`[${this.name}] Semester ${sem} not found or not yet published. Skipping.`);
      return [];
    }

    const $ = cheerio.load(html);
    const categoryLinks: string[] = [];
    const currentSemPath = url.substring(0, url.lastIndexOf("/"));

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.includes("?")) return;

      // Category links end with .html but exclude the index and booking sub-pages
      if (href.endsWith(".html") && href !== "index.html" && !href.startsWith("bs_")) {
        const fullUrl = href.startsWith("/")
          ? `https://server.sportzentrum.uni-kiel.de${href}`
          : `${currentSemPath}/${href}`;
        categoryLinks.push(fullUrl);
      }
    });

    return [...new Set(categoryLinks)];
  }

  parser(): Course[] {
    return [];
  }

  parseSemester(html: string): string {
    const classMatch =
      html.match(/bs_((?:winter|sommer)semester_\d{2}_\d{2})/i) ||
      html.match(/bs_((?:winter|sommer)semester_\d{2})/i);

    if (classMatch) {
      const raw = classMatch[1].toLowerCase();
      if (raw.includes("winter")) {
        const parts = raw.match(/wintersemester_(\d{2})_(\d{2})/);
        return parts ? `Winter 20${parts[1]}/${parts[2]}` : "Winter";
      } else {
        const parts = raw.match(/sommersemester_(\d{2})/);
        return parts ? `Summer 20${parts[1]}` : "Summer";
      }
    }

    return "Current Period";
  }

  /**
   * Merges a list of individual dates into continuous weekly segments.
   * E.g. [Apr 6, Apr 13, Apr 27] (all Mondays) →
   * [ {start: Apr 6, end: Apr 13, day: 'Mon'}, {start: Apr 27, end: Apr 27, day: 'Mon'} ]
   */
  private mergeDatesIntoSegments(dates: string[]): Array<{ start: string; end: string; day: string }> {
    if (!dates.length) return [];

    const toIso = (d: Date) => d.toISOString().split("T")[0];
    const getDayName = (d: Date) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];

    const sorted = dates
      .map(d => {
        const parts = d.split(".");
        if (parts.length !== 3) return null;
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
      })
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!sorted.length) return [];

    const segments: Array<{ start: string; end: string; day: string }> = [];
    let currentSegment: { start: Date; last: Date; day: string } | null = null;

    for (const d of sorted) {
      const dayName = getDayName(d);

      if (!currentSegment) {
        currentSegment = { start: d, last: d, day: dayName };
        continue;
      }

      const diffDays = Math.round((d.getTime() - currentSegment.last.getTime()) / 86_400_000);

      if (diffDays === 7 && dayName === currentSegment.day) {
        currentSegment.last = d;
      } else {
        segments.push({ start: toIso(currentSegment.start), end: toIso(currentSegment.last), day: currentSegment.day });
        currentSegment = { start: d, last: d, day: dayName };
      }
    }

    if (currentSegment) {
      segments.push({ start: toIso(currentSegment.start), end: toIso(currentSegment.last), day: currentSegment.day });
    }

    return segments;
  }

  async parseDurationPageMetadata(url: string): Promise<{ dates: string[]; locations: string[] }> {
    if (!url) return { dates: [], locations: [] };
    const html = await this.fetchPage(url);
    if (!html) return { dates: [], locations: [] };

    const $ = cheerio.load(html);
    const datesSet = new Set<string>();
    const locationsSet = new Set<string>();
    const bodyText = $("body").text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

    // Strategy 1: dedicated "geplante Termine" rows used on CGI detail pages
    // e.g. <div class="bs_geplan_termine_row"><span class="bs_geplan_termine_datum">20.10.2025</span>...</div>
    $(".bs_geplan_termine_datum").each((_, el) => {
      const text = $(el).text().trim();
      const m = text.match(/(\d{2}\.\d{2}\.\d{4})/);
      if (m) datesSet.add(m[1]);
    });

    // Strategy 2: table rows that contain both a date AND a time range
    // e.g. "Mo 20.10.2025 21.00-21.45 ..."
    if (datesSet.size === 0) {
      $("tr").each((_, tr) => {
        const rowText = $(tr).text().trim();
        const dateMatch = rowText.match(/(\d{2}\.\d{2}\.\d{4})/);
        const timeMatch = rowText.match(/\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/);
        if (dateMatch && timeMatch) datesSet.add(dateMatch[1]);
      });
    }

    $("tr").each((_, tr) => {
      const row = $(tr);
      const dayText = row.find(".bs_stag").text().trim();
      const timeText = row.find(".bs_szeit").text().trim();
      const locationText = row.find(".bs_sort").text().replace(/\s+/g, " ").trim();
      if (!dayText || !timeText || !locationText) return;
      locationsSet.add(locationText);
    });

    // Strategy 3: scan "geplante termine" tables for single-date rows
    if (datesSet.size === 0) {
      $("table").each((_, table) => {
        const prevText = $(table).prev().text().toLowerCase();
        const tableText = $(table).text().toLowerCase();
        if (!prevText.includes("geplante termine") && !prevText.includes("planned dates") && !tableText.includes("geplante termine")) return;

        $(table).find("tr").each((_, tr) => {
          const rowText = $(tr).text().trim();
          const matches = rowText.match(/(\d{2}\.\d{2}\.\d{4})/g);
          if (matches?.length === 1) datesSet.add(matches[0]);
        });
      });
    }

    // Strategy 4: explicit "Zeitraum" / "duration" range text on detail pages
    if (datesSet.size === 0) {
      const rangeMatch = bodyText.match(
        /(?:zeitraum|duration)\s*:?\s*(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/i,
      );
      if (rangeMatch) {
        datesSet.add(rangeMatch[1]);
        datesSet.add(rangeMatch[2]);
      }
    }

    // Last resort: all dates in body (may include non-session dates — avoid if possible)
    if (datesSet.size === 0) {
      const allDates = $("body").text().match(/\b\d{2}\.\d{2}\.\d{4}\b/g) || [];
      allDates.forEach(d => datesSet.add(d));
    }

    $("b, strong, dt, .bs_label").each((_, el) => {
      const labelText = $(el).text().replace(/\s+/g, " ").trim().toLowerCase();
      if (!labelText.startsWith("veranstaltungsort")) return;

      const nextTextBlock = $(el).nextAll(".bs_text").first().text().replace(/\s+/g, " ").trim();
      if (nextTextBlock) {
        locationsSet.add(nextTextBlock);
      }
    });

    if (locationsSet.size === 0) {
      const locationMatch = bodyText.match(
        /(?:veranstaltungsorte|veranstaltungsort|locations?|venue)\s*:?\s*(.+?)(?=(?:\b(?:zeitraum|anmeldeschluss|anmeldung|leitung|dozent|kosten|preis|uhrzeit|termine)\b\s*:)|$)/i,
      );
      if (locationMatch?.[1]) {
        locationsSet.add(locationMatch[1].trim());
      }
    }

    return { dates: Array.from(datesSet), locations: Array.from(locationsSet) };
  }

  async parsePlannedDates(url: string): Promise<string[]> {
    return (await this.parseDurationPageMetadata(url)).dates;
  }

  async parseWorkouts(html: string, pageUrl: string): Promise<WorkoutCourse[]> {
    const $ = cheerio.load(html);
    const results: WorkoutCourse[] = [];
    const semester = this.parseSemester(html);

    const pLimit = (await import("p-limit")).default;
    const detailLimit = pLimit(3);
    const rowPromises: Promise<void>[] = [];

    $("table tbody tr").each((_, tr) => {
      const row = $(tr);

      const courseCode = row.find("td.bs_sknr span").text().trim();
      if (!courseCode || !/^\d{4}-\d{2}$/.test(courseCode)) return;

      const outerSpan = row.find("td.bs_sdet > span").first();
      const categoryPrefix = outerSpan.find(".dispmobile").text().trim();
      const cloned = outerSpan.clone();
      cloned.find(".dispmobile").remove();
      const specificName = cloned.text().trim();
      const fullTitle = specificName ? `${categoryPrefix} ${specificName}`.trim() : categoryPrefix;

      let category = categoryPrefix;
      let categoryEn = translateDE(category);

      // Group all "Semestergebühr" variants under one category
      if (fullTitle.toLowerCase().includes("semestergebühr") || fullTitle.toLowerCase().includes("semester fee")) {
        category = "Semestergebühr";
        categoryEn = "Semester Fee";
      }

      const parseCellLines = (cell: ReturnType<typeof row.find>) => {
        const html = cell.html();
        if (html && html.trim()) {
          return html
            .split(/<br\s*\/?>/i)
            .map((part) => cheerio.load(part).text().replace(/\s+/g, " ").trim())
            .filter(Boolean);
        }

        const text = cell.text().replace(/\s+/g, " ").trim();
        return text ? [text] : [];
      };

      const days = parseCellLines(row.find("td.bs_stag")).map((day) => day.replace(/\.$/, ""));
      const times = parseCellLines(row.find("td.bs_szeit"));
      const locations = parseCellLines(row.find("td.bs_sort"));

      const dateCell = row.find("td.bs_szr");
      const dateCellText = dateCell.text().replace(/\s+/g, " ").trim();
      const dateMatch = dateCellText.replace(/\s+/g, "").match(/([\d.]+)-\s*([\d.]+)/);
      const startDate = dateMatch?.[1] || "";
      const endDate = dateMatch?.[2] || "";
      const durationUrlRaw = dateCell.find("a").attr("href");
      const durationUrl = durationUrlRaw
        ? (durationUrlRaw.startsWith("http") ? durationUrlRaw : `https://server.sportzentrum.uni-kiel.de${durationUrlRaw}`)
        : null;

      const instructor = row.find("td.bs_skl").text().replace(/\s+/g, " ").trim();

      // Parse prices
      const priceValues: (number | null)[] = [];
      let isEntgeltfrei = false;

      const priceDivs = row.find("td.bs_spreis .bs_tt1");
      if (priceDivs.length > 0) {
        priceDivs.each((_, div) => {
          const rawText = $(div).text().toLowerCase();
          if (rawText.includes("entgeltfrei")) {
            isEntgeltfrei = true;
            priceValues.push(0);
          } else {
            const num = parseFloat(rawText.replace(/\s/g, "").replace("€", "").replace(",", ".").replace("--", ""));
            priceValues.push(isNaN(num) ? null : num);
          }
        });
      } else {
        const summaryText = row.find("td.bs_spreis > span").first().text().toLowerCase();
        if (summaryText.includes("entgeltfrei")) {
          isEntgeltfrei = true;
          priceValues.push(0, 0, 0, 0);
        } else {
          summaryText.split("/").forEach(p => {
            const n = parseFloat(p.replace(/[^\d.,]/g, "").replace(",", "."));
            priceValues.push(isNaN(n) ? null : n);
          });
        }
      }

      // Determine booking status from CSS class, then override with button value
      const bookingTd = row.find("td.bs_sbuch");
      let bookingStatus = "unknown";

      for (const [cls, status] of Object.entries(BOOKING_STATUS_MAP)) {
        if (bookingTd.find(`.${cls}`).length > 0 || bookingTd.html()?.includes(cls)) {
          bookingStatus = status;
          break;
        }
      }

      const btnValue = bookingTd.find("input[type='submit'], input[type='button']").attr("value")?.toLowerCase() || "";
      if (btnValue.includes("ausgebucht")) bookingStatus = "fully_booked";
      else if (btnValue.includes("buchen")) bookingStatus = "available";
      else if (btnValue.includes("warteliste")) bookingStatus = "waitlist";
      else if (btnValue.includes("gesperrt") || btnValue.includes("blocked")) bookingStatus = "blocked";
      else if (btnValue.includes("storniert") || btnValue.includes("cancel")) bookingStatus = "cancelled";

      const bookingUrl = bookingTd.find("a[href]").attr("href") || "";
      const scheduleEntries = days.map((day, i) => ({
        day: DAY_MAP[day] || day,
        time: times[i] || times[0] || "",
        location: locations[i] || locations[0] || "",
      }));

      rowPromises.push(detailLimit(async () => {
        const durationPageMetadata = durationUrl
          ? await this.parseDurationPageMetadata(durationUrl)
          : { dates: [], locations: [] };
        const plannedDates = durationPageMetadata.dates;
        const segments = this.mergeDatesIntoSegments(plannedDates);

        const finalStartDate = segments.length > 0 ? segments[0].start : startDate;
        const finalEndDate   = segments.length > 0 ? segments[segments.length - 1].end : endDate;

        const uniqueLocations = [...new Set(scheduleEntries.map(s => s.location))].join(", ");
        const resolvedLocation = durationPageMetadata.locations.length > 0
          ? durationPageMetadata.locations.join("; ")
          : uniqueLocations;

        results.push({
          source: "CAU Kiel Sportzentrum",
          courseCode,
          category,
          categoryEn,
          title: fullTitle,
          titleEn: translateDE(fullTitle),
          dayOfWeek: scheduleEntries.map(s => s.day).join(", "),
          startTime: scheduleEntries[0]?.time.split("-")[0] || "",
          endTime:   scheduleEntries[0]?.time.split("-")[1] || "",
          location:   resolvedLocation,
          locationEn: resolvedLocation,
          instructor: translateDE(instructor),
          startDate: finalStartDate,
          endDate:   finalEndDate,
          priceStudent:         priceValues[0] ?? null,
          priceStaff:           priceValues[1] ?? null,
          priceExternal:        priceValues[2] ?? null,
          priceExternalReduced: priceValues[3] ?? null,
          bookingStatus,
          bookingUrl: bookingUrl ? `https://server.sportzentrum.uni-kiel.de${bookingUrl}` : "",
          url: pageUrl,
          semester,
          details: {
            ...(scheduleEntries.length > 1 ? { schedule: scheduleEntries } : {}),
            ...(isEntgeltfrei      ? { isEntgeltfrei: true } : {}),
            ...(plannedDates.length > 0    ? { plannedDates }  : {}),
            ...(segments.length > 0        ? { segments }      : {}),
            ...(durationUrl        ? { durationUrl }   : {}),
          },
        });
      }));
    });

    await Promise.all(rowPromises);
    return results;
  }

  async retrieveWorkouts(categoryName?: string): Promise<WorkoutCourse[]> {
    const allLinks = await this.links();
    let targetLinks = allLinks;

    if (categoryName) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const target = normalize(categoryName);

      targetLinks = allLinks.filter(link => {
        const fileName = link.split("/").pop() || "";
        const germanName = fileName.replace(/^_/, "").replace(/\.html$/, "").replace(/_/g, " ");
        return normalize(germanName) === target || normalize(translateDE(germanName)) === target;
      });

      if (targetLinks.length === 0) {
        console.log(`[${this.name}] No specific link found for category "${categoryName}".`);
        return [];
      }
      console.log(`[${this.name}] Refreshing specific category: ${categoryName} (found ${targetLinks.length} link(s))`);
    }

    console.log(`[${this.name}] Processing ${targetLinks.length} category pages for semester ${this.semester}...`);

    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(5);
    const allWorkouts: WorkoutCourse[] = [];

    await Promise.all(
      targetLinks.map(link =>
        limit(async () => {
          const html = await this.fetchPage(link);
          if (html) {
            const workouts = await this.parseWorkouts(html, link);
            allWorkouts.push(...workouts);
          }
        })
      )
    );

    console.log(`[${this.name}] Found ${allWorkouts.length} total workout instances`);
    return allWorkouts;
  }

  async retrieve(): Promise<Course[]> {
    return (await this.retrieveWorkouts()) as unknown as Course[];
  }
}
