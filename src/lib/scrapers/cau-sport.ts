import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";

const BASE_URL = "https://server.sportzentrum.uni-kiel.de/angebote/aktueller_zeitraum";

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

/**
 * Translate a German string to English using the DE_EN map.
 * Tries exact match first, then partial replacements for composite terms.
 */
function translateDE(text: string): string {
  if (!text) return text;
  // Exact match
  if (DE_EN[text]) return DE_EN[text];

  let result = text;
  // Sort keys by length descending so longer phrases match first
  const sortedKeys = Object.keys(DE_EN).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (result.includes(key)) {
      result = result.replaceAll(key, DE_EN[key]);
    }
  }
  return result;
}

const BOOKING_STATUS_MAP: Record<string, string> = {
  bs_btn_abgelaufen: "expired",
  bs_btn_ausgebucht: "fully_booked",
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
}

export class CAUSport extends BaseScraper {
  constructor() {
    super("cau-sport");
  }

  async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[${this.name}] Fetching ${url} (attempt ${attempt})...`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return new TextDecoder("iso-8859-1").decode(buffer);
      } catch (error) {
        console.error(`[${this.name}] Attempt ${attempt} failed for ${url}:`, error);
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    console.error(`[${this.name}] All ${retries} attempts failed for ${url}`);
    return "";
  }

  async links(): Promise<string[]> {
    const html = await this.fetchPage(`${BASE_URL}/index.html`);
    if (!html) return [];
    const $ = cheerio.load(html);
    const categoryLinks: string[] = [];

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("_") && href.endsWith(".html")) {
        categoryLinks.push(`${BASE_URL}/${href}`);
      }
    });

    return [...new Set(categoryLinks)];
  }

  parser(html: string): Course[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Not used — we use parseWorkouts instead
    return [];
  }

  parseSemester(html: string): string {
    // Semester is embedded in body class, e.g. "bs_wintersemester_25_26"
    const classMatch = html.match(/bs_((?:winter|sommer)semester_\d{2}_\d{2})/i);
    if (classMatch) {
      // "wintersemester_25_26" -> "WiSe 25/26"
      const raw = classMatch[1];
      const parts = raw.match(/(winter|sommer)semester_(\d{2})_(\d{2})/i);
      if (parts) {
        const prefix = parts[1].toLowerCase() === "winter" ? "WiSe" : "SoSe";
        return `${prefix} ${parts[2]}/${parts[3]}`;
      }
    }
    return "";
  }

  parseWorkouts(html: string, pageUrl: string): WorkoutCourse[] {
    const $ = cheerio.load(html);
    const results: WorkoutCourse[] = [];

    const semester = this.parseSemester(html);

    $("table tbody tr").each((_, tr) => {
      const row = $(tr);

      // Course code: td.bs_sknr
      const codeEl = row.find("td.bs_sknr span");
      const courseCode = codeEl.text().trim();
      if (!courseCode || !/^\d{4}-\d{2}$/.test(courseCode)) return;

      // Title: td.bs_sdet — the outer <span> contains <span class="dispmobile">Category </span>SpecificName
      // We need to get the direct outer span only, then separate category and specific name
      const outerSpan = row.find("td.bs_sdet > span").first();
      const categoryPrefix = outerSpan.find(".dispmobile").text().trim();
      // Clone and remove dispmobile to get only the specific name
      const cloned = outerSpan.clone();
      cloned.find(".dispmobile").remove();
      const specificName = cloned.text().trim();
      const fullTitle = specificName
        ? `${categoryPrefix} ${specificName}`.trim()
        : categoryPrefix;
      const category = categoryPrefix;

      // Days + Times + Locations: split by <br>
      const dayHtml = row.find("td.bs_stag span").html() || "";
      const timeHtml = row.find("td.bs_szeit span").html() || "";
      const locTd = row.find("td.bs_sort span");
      const locationHtml = locTd.html() || "";

      const days = dayHtml.split(/<br\s*\/?>/i).map(d => cheerio.load(d).text().trim()).filter(Boolean);
      const times = timeHtml.split(/<br\s*\/?>/i).map(t => cheerio.load(t).text().trim()).filter(Boolean);
      const locations = locationHtml.split(/<br\s*\/?>/i).map(l => {
        const $l = cheerio.load(l);
        return $l("a").text().trim() || $l.text().trim();
      }).filter(Boolean);

      // Date range: td.bs_szr
      const dateText = row.find("td.bs_szr").text().replace(/\s+/g, "").trim();
      const dateMatch = dateText.match(/([\d.]+)-\s*([\d.]+)/);
      const startDate = dateMatch?.[1] || "";
      const endDate = dateMatch?.[2] || "";

      // Instructor: td.bs_skl
      const instructor = row.find("td.bs_skl span").text().trim();

      // Prices: use the structured div.bs_tt1 elements (more reliable than the summary line)
      const priceDivs = row.find("td.bs_spreis .bs_tt1");
      const priceValues: (number | null)[] = [];
      let isEntgeltfrei = false;

      priceDivs.each((_, div) => {
        const rawText = $(div).text().toLowerCase();
        if (rawText.includes("entgeltfrei")) {
          isEntgeltfrei = true;
          priceValues.push(0);
        } else {
          const text = rawText.replace(/\s/g, "").replace("€", "").replace(",", ".").replace("--", "");
          const num = parseFloat(text);
          priceValues.push(isNaN(num) ? null : num);
        }
      });
      // Fallback: parse from summary span "45/ 65/ 80/ 65 €"
      if (priceValues.length === 0) {
        const summaryText = row.find("td.bs_spreis > span").first().text().toLowerCase();
        if (summaryText.includes("entgeltfrei")) {
          isEntgeltfrei = true;
          priceValues.push(0, 0, 0, 0);
        } else {
          const parts = summaryText.split("/").map(p => {
            const n = parseFloat(p.replace(/[^\d.,]/g, "").replace(",", "."));
            return isNaN(n) ? null : n;
          });
          priceValues.push(...parts);
        }
      }

      // Booking status: detect from class names or button values
      const bookingTd = row.find("td.bs_sbuch");
      let bookingStatus = "unknown";
      if (isEntgeltfrei && bookingStatus === "unknown") {
        // Many free courses use 'bs_btn_siehe_text' but are effectively 'available' or just 'free'
      }
      for (const [cls, status] of Object.entries(BOOKING_STATUS_MAP)) {
        if (bookingTd.find(`.${cls}`).length > 0 || bookingTd.html()?.includes(cls)) {
          bookingStatus = status;
          break;
        }
      }
      // Also check input button value
      const btnValue = bookingTd.find("input").attr("value");
      if (btnValue === "ausgebucht") bookingStatus = "fully_booked";
      else if (btnValue === "buchen") bookingStatus = "available";

      const bookingUrl = bookingTd.find("a[href]").attr("href") || "";

      // Build schedule entries — one per day for multi-day courses
      const scheduleEntries = days.map((day, i) => ({
        day: DAY_MAP[day] || day,
        time: times[i] || times[0] || "",
        location: locations[i] || locations[0] || "",
      }));

      // For multi-day courses, join into a single row with schedule array in details
      const dayStr = scheduleEntries.map(s => s.day).join(", ");
      const timeStr = scheduleEntries.map(s => s.time).join(", "); // eslint-disable-line @typescript-eslint/no-unused-vars
      const locationStr = [...new Set(scheduleEntries.map(s => s.location))].join(", ");

      results.push({
        source: "CAU Kiel Sportzentrum",
        courseCode,
        category,
        categoryEn: translateDE(category),
        title: fullTitle,
        titleEn: translateDE(fullTitle),
        dayOfWeek: dayStr,
        startTime: scheduleEntries[0]?.time.split("-")[0] || "",
        endTime: scheduleEntries[0]?.time.split("-")[1] || "",
        location: locationStr,
        locationEn: translateDE(locationStr),
        instructor: translateDE(instructor),
        startDate,
        endDate,
        priceStudent: priceValues[0] ?? null,
        priceStaff: priceValues[1] ?? null,
        priceExternal: priceValues[2] ?? null,
        priceExternalReduced: priceValues[3] ?? null,
        bookingStatus,
        bookingUrl: bookingUrl ? `https://server.sportzentrum.uni-kiel.de${bookingUrl}` : "",
        url: pageUrl,
        semester,
        details: {
          ...(scheduleEntries.length > 1 ? { schedule: scheduleEntries } : {}),
          ...(isEntgeltfrei ? { isEntgeltfrei: true } : {}),
        },
      });
    });

    return results;
  }

  async retrieve(): Promise<Course[]> {
    // Override to use parseWorkouts instead of parser
    const links = await this.links();
    console.log(`[${this.name}] Processing ${links.length} category pages...`);

    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(5);

    const allWorkouts: WorkoutCourse[] = [];

    await Promise.all(
      links.map(link =>
        limit(async () => {
          const html = await this.fetchPage(link);
          if (html) {
            const workouts = this.parseWorkouts(html, link);
            allWorkouts.push(...workouts);
          }
        })
      )
    );

    console.log(`[${this.name}] Found ${allWorkouts.length} total workout instances`);
    return allWorkouts as unknown as Course[];
  }

  async retrieveWorkouts(): Promise<WorkoutCourse[]> {
    return await this.retrieve() as unknown as WorkoutCourse[];
  }
}
