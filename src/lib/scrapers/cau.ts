import * as cheerio from "cheerio";
import { BaseScraper } from "./BaseScraper";
import { Course } from "./types";

export class CAU extends BaseScraper {
  constructor() {
    super("cau");
  }

  getSemesterParam(): string {
    if (!this.semester) return "2025w";
    const input = this.semester.toLowerCase();
    const yearNum = parseInt(input.replace(/\D/g, "")) || 25;
    const year = 2000 + yearNum;
    if (input.includes('wi') || input.includes('winter') || input.includes('fa') || input.includes('fall')) return `${year}w`;
    if (input.includes('sp') || input.includes('spring') || input.includes('su') || input.includes('summer')) return `${year}s`;
    return `${year}w`;
  }

  async links(): Promise<string[]> {
    const sem = this.getSemesterParam();
    // Use form-based URL for CS master program lectures (full listing)
    return [`https://univis.uni-kiel.de/form?__s=2&dsc=anew/tlecture&showhow=long&anonymous=1&lang=en&sem=${sem}&tdir=techn/infora/master&tlecture_all=1`];
  }

  private extractNavigationToken(html: string): string | null {
    const m = html.match(/(?:\?|&|&amp;)__e=(\d+)/i);
    return m ? m[1] : null;
  }

  private withNavigationToken(url: string, token: string): string {
    const u = new URL(url);
    u.searchParams.set("__e", token);
    return u.toString();
  }

  private sanitizeCourseUrl(rawUrl: string): string {
    const absolute = rawUrl.startsWith("http")
      ? rawUrl
      : `https://univis.uni-kiel.de/${rawUrl.replace(/&amp;/g, "&")}`;
    const u = new URL(absolute);
    // Drop volatile navigation/session params that cause "outdated key" errors later.
    u.searchParams.delete("__e");
    u.searchParams.delete("__s");
    return u.toString();
  }

  private toAbsoluteUrl(rawUrl: string): string {
    if (!rawUrl) return "";
    return rawUrl.startsWith("http")
      ? rawUrl
      : `https://univis.uni-kiel.de/${rawUrl.replace(/&amp;/g, "&")}`;
  }

  private collectRelatedLinksFromContainer(container: cheerio.Cheerio<any>): string[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const ignoredPatterns = [
      /dsc=anew\/lecture_view/i,
      /dsc=anew\/tel_view/i,
      /dsc=anew\/room_view/i,
      /dsc=anew\/lecture\b/i,
      /__e=\d+/i,
    ];

    const links = container
      .find("a[href]")
      .map((_, a) => (a.attribs?.href || "").trim())
      .get()
      .map((href) => this.toAbsoluteUrl(href))
      .filter((href) => /^https?:\/\//i.test(href))
      .filter((href) => !ignoredPatterns.some((pattern) => pattern.test(href)))
      .filter((href) => !/^mailto:/i.test(href))
      .filter((href) => !/^javascript:/i.test(href));

    return Array.from(new Set(links));
  }

  private extractDepartmentFromDetailHtml(html: string): string | null {
    if (!html) return null;
    const $ = cheerio.load(html);
    let department: string | null = null;
    const sanitizeDepartment = (value: string): string => {
      return value
        .replace(/\s+/g, " ")
        .replace(/\bUnivIS is a product of Config eG\b.*$/i, "")
        .replace(/\bOutdated referring page\b.*$/i, "")
        .trim();
    };

    $("dt").each((_, dt) => {
      if (department) return;
      const label = $(dt).text().trim().toLowerCase();
      const inlineAnchorText = sanitizeDepartment($(dt).find("a").first().text().trim());
      const dtText = sanitizeDepartment(
        $(dt)
          .clone()
          .children("a")
          .remove()
          .end()
          .text()
          .replace(/^[^:]*:\s*/i, "")
          .trim(),
      );
      const ddText = sanitizeDepartment($(dt).next("dd").text().trim());
      const value = inlineAnchorText || dtText || ddText;
      const isDepartmentLabel =
        label.includes("department") ||
        label.includes("institut") ||
        label.includes("fach") ||
        label.includes("chair") ||
        label.includes("arbeitsgruppe") ||
        label.includes("institution") ||
        label.includes("einrichtung");
      if (isDepartmentLabel && value) department = value;
    });

    if (department) return department;

    const bodyText = $("body").text().replace(/\s+/g, " ");
    const directMatch = bodyText.match(/(?:department|institut|chair)\s*:\s*([^|,;]+)/i);
    const cleaned = directMatch?.[1] ? sanitizeDepartment(directMatch[1]) : "";
    return cleaned || null;
  }

  async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let buffer = await response.arrayBuffer();
        let html = new TextDecoder("windows-1252").decode(buffer);

        // UnivIS rejects stale/missing navigation tokens with error pages.
        if (
          html.includes("Outdated referring page") ||
          html.includes("<title>Browser Error</title>")
        ) {
          const token = this.extractNavigationToken(html);
          if (token) {
            response = await fetch(this.withNavigationToken(url, token));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            buffer = await response.arrayBuffer();
            html = new TextDecoder("windows-1252").decode(buffer);
          }
        }

        return html;
      } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        if (attempt === retries) return "";
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return "";
  }

  async parser(html: string, existingCodes: Set<string> = new Set()): Promise<Course[]> {
    const $ = cheerio.load(html);
    const courses: Course[] = [];
    const semParam = this.getSemesterParam();
    const year = parseInt(semParam.substring(0, 4));
    const term = semParam.endsWith('w') ? "Winter" : "Spring";
    const headerCategoryMap: Record<string, string> = {
      "theoretical computer science": "Theoretical Computer Science",
      "compulsory elective modules in computer science": "Compulsory elective modules in Computer Science",
      seminar: "Seminar",
      "advanced project": "Advanced Project",
      "involvement in a working group": "Involvement in a working group",
      "open elective": "Open Elective",
    };

    const normalizeHeader = (value: string) =>
      value
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[–—]/g, "-")
        .trim();

    let currentHeaderCategory: string | null = null;

    $("tr").each((_, tr) => {
      const trText = normalizeHeader($(tr).text());
      const headerKey = Object.keys(headerCategoryMap).find((k) => trText === k || trText.startsWith(`${k} `));
      if (headerKey) {
        currentHeaderCategory = headerCategoryMap[headerKey];
      }

      if ($(tr).find("a[href*='key='], a[href*='lecture_view']").length === 0) return;
      const td = $(tr).find("td[width='100%']").first().length > 0
        ? $(tr).find("td[width='100%']").first()
        : $(tr).find("td").first();
      const titleA = td.find("a[href*='key='], a[href*='lecture_view']").first();
      if (titleA.length > 0) {
        const fullText = td.text().replace(/\s+/g, " ").trim();
        const bracketMatch = fullText.match(/\[([a-zA-ZÜÖÄüöä0-9._\s-]+)\]/);
        const startMatch = fullText.match(/^([a-zA-Z0-9._-]+):/);
        const internalIdMatch = fullText.match(/\((\d{6})\)/);

        if (internalIdMatch) {
          const internalId = internalIdMatch[1];
          let courseCode = bracketMatch ? bracketMatch[1].trim() : (startMatch ? startMatch[1] : internalId);
          // Strip Ü/Ö prefix from exercise codes (e.g. "ÜinfCN-01a" → "infCN-01a", "Ü infFGA-01a" → "infFGA-01a")
          courseCode = courseCode.replace(/^[ÜÖüö]\s*/i, "");
          if (['exercise', 'übung', 'praktikum', 'practical', 'projekt', 'project', 'tutorium', 'tutorial', 'workshop'].includes(courseCode.toLowerCase())) {
              courseCode = internalId;
          }

          let title = titleA.text().trim();
          title = title.replace(/^[a-zA-Z0-9._-]+[:\s]+/, "").replace(/^[-–—]\s*/, "").trim();
          const isLayoutOnlyEntry = /\(\s*layout\s*\)/i.test(title);
          if (isLayoutOnlyEntry) return;

          if (existingCodes.has(courseCode)) {
            courses.push({
              university: "CAU Kiel", courseCode, title, semesters: [{ term, year }],
              details: { is_partially_scraped: true, internalId } as any // eslint-disable-line @typescript-eslint/no-explicit-any
            });
            return;
          }

          let type = "Lecture";
          let category = currentHeaderCategory || "General";
          const titleLower = title.toLowerCase();

          if (!currentHeaderCategory) {
            if (titleLower.includes("advanced project") || titleLower.includes("oberprojekt") || titleLower.includes("advanced computer science project") || titleLower.startsWith("master project")) category = "Advanced Project";
            else if (titleLower.includes("seminar") && !titleLower.includes("supervision")) category = "Seminar";
            else if (titleLower.includes("colloquium") || titleLower.includes("kolloquium") || titleLower.includes("study group")) category = "Colloquia and study groups";
            else if (titleLower.includes("theoretical") || titleLower.includes("theoretische")) category = "Theoretical Computer Science";
            else if (titleLower.includes("involvement") || titleLower.includes("mitarbeit")) category = "Involvement in a working group";
            else if (titleLower.includes("thesis supervision") || titleLower.includes("begleitseminar zur masterarbeit")) category = "Master Thesis Supervision Seminar";
            else if (titleLower.includes("elective") || titleLower.includes("wahlpflicht")) category = "Compulsory elective modules in Computer Science";
            else if (titleLower.includes("open elective") || titleLower.includes("freie wahl")) category = "Open Elective";
            else category = "Standard Course";
          }

          if (courseCode.startsWith("E")) type = "Exercise";
          else if (courseCode.startsWith("P") || courseCode.startsWith("PE")) type = "Practical";

          const course: Course = {
            university: "CAU Kiel", courseCode, title,
            semesters: [{ term, year }], level: "graduate",
            details: { internalId, schedule: {}, category, type, rawUnits: 0 } as any // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          const rowRelatedLinks = this.collectRelatedLinksFromContainer(td);
          if (rowRelatedLinks.length > 0) {
            (course.details as Record<string, unknown>).resources = rowRelatedLinks;
          }

          td.find("dl dt").each((_, dt) => {
            const label = $(dt).text().trim().toLowerCase();
            const dd = $(dt).next("dd");
            const value = dd.text().trim();
            const isDepartmentLabel =
              label.includes("department") ||
              label.includes("institut") ||
              label.includes("fach") ||
              label.includes("chair") ||
              label.includes("arbeitsgruppe") ||
              label.includes("institution");
            if (label.includes("dozent") || label.includes("lecturer")) {
              (course.details as any).instructors = value.split(",").map(i => i.trim()).filter(i => i && i !== "N.N." && i !== "N. N."); // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (label.includes("angaben") || label.includes("details")) {
              const typeMatch = value.match(/^(Vorlesung|Übung|Seminar|Praktikum|Kolloquium|Projekt|Lecture|Exercise[^,]*|Practical[^,]*|Colloquium|Project)/i);
              if (typeMatch) {
                  const t = typeMatch[1].toLowerCase();
                  if (t === 'vorlesung' || t === 'lecture') type = "Lecture";
                  else if (t === 'übung' || t.startsWith('exercise')) type = "Exercise";
                  else if (t === 'praktikum' || t.startsWith('practical')) type = "Practical";
                  else if (t === 'seminar') type = "Seminar";
                  else if (t === 'projekt' || t === 'project') type = "Project";
                  else if (t === 'kolloquium' || t === 'colloquium') type = "Colloquium";
                  (course.details as any).type = type; // eslint-disable-line @typescript-eslint/no-explicit-any
              }
              const ectsMatch = value.match(/(?:ECTS|Credits):\s*(\d+)/i);
              if (ectsMatch) course.credit = parseInt(ectsMatch[1]);
              const unitsMatch = value.match(/(\d+)\s*(?:cred\.h|SWS)/i);
              if (unitsMatch) {
                  const u = parseInt(unitsMatch[1]);
                  course.units = u.toString();
                  (course.details as any).rawUnits = u; // eslint-disable-line @typescript-eslint/no-explicit-any
              }
              if (value.toLowerCase().includes("englisch") || value.toLowerCase().includes("english")) (course.details as any).isEnglish = true; // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (label.includes("voraussetzungen") || label.includes("prerequisites")) {
              course.corequisites = value;
              (course.details as any).prerequisites = value; // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (label.includes("inhalt") || label.includes("contents")) {
              course.description = value;
              (course.details as any).contents = value; // eslint-disable-line @typescript-eslint/no-explicit-any
              const contentsRelatedLinks = this.collectRelatedLinksFromContainer(dd);
              if (contentsRelatedLinks.length > 0) {
                const current =
                  Array.isArray((course.details as Record<string, unknown>).resources)
                    ? ((course.details as Record<string, unknown>).resources as string[])
                    : [];
                (course.details as Record<string, unknown>).resources = Array.from(new Set([...current, ...contentsRelatedLinks]));
              }
            } else if (isDepartmentLabel) {
              course.department = value || course.department;
              (course.details as any).department = value || null; // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (label.includes("termine") || label.includes("dates")) {
              if (value) {
                  const cType = (course.details as any).type || "Lecture"; // eslint-disable-line @typescript-eslint/no-explicit-any
                  const sched = (course.details as any).schedule; // eslint-disable-line @typescript-eslint/no-explicit-any
                  if (!sched[cType]) sched[cType] = [];
                  sched[cType].push(value);
              }
            }
          });

          // Verification with keywords
          const hasEnglishTag = (course.details as any).isEnglish; // eslint-disable-line @typescript-eslint/no-explicit-any
          const hasGermanChars = /[äöüß]/i.test(title);
          const germanWords = ['masterprojekt', 'oberprojekt', 'algorithmische', 'informatik', 'eingebettete', 'echtzeitsysteme', 'programmiersprachen', 'programmiersysteme', 'steuerung', 'meeresforschung', 'forschung', 'technische', 'grundlagen', 'einführung', 'verfahren', 'methoden', 'anwendungen', 'begleitseminar', 'masterarbeit', 'mitarbeit', 'arbeitsgruppe', 'wahlpflicht', 'kolloquium', 'tutorium', 'werkstatt'];
          const hasGermanWords = germanWords.some(w => titleLower.includes(w));
          const englishKeywords = ['computer', 'data', 'science', 'network', 'system', 'software', 'intelligence', 'security', 'advanced', 'distributed', 'introduction', 'foundation', 'logic', 'machine', 'learning', 'cloud', 'robotics', 'project', 'seminar', 'vision', 'rendering', 'parallel', 'algorithm', 'things', 'wireless', 'matlab', 'mining'];
          const hasEnglishKeywords = englishKeywords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(title));
          
          if (hasEnglishTag || (hasEnglishKeywords && !hasGermanChars && !hasGermanWords)) {
            const rawUrl = titleA.attr("href");
            if (rawUrl) {
              const absoluteRawUrl = rawUrl.startsWith("http")
                ? rawUrl
                : `https://univis.uni-kiel.de/${rawUrl.replace(/&amp;/g, "&")}`;
              course.url = this.sanitizeCourseUrl(rawUrl);
              (course.details as Record<string, unknown>).rawDetailUrl = absoluteRawUrl;
            }
            courses.push(course);
          }
        }
      }
    });
    return courses;
  }

  async retrieve(): Promise<Course[]> {
    const links = await this.links();
    console.log(`[${this.name}] Scraping English courses from ${links.length} departments...`);
    const allItems: Course[] = [];
    for (const link of links) {
      const html = await this.fetchPage(link);
      if (html) {
        const batch = await this.parser(html, new Set());
        allItems.push(...batch);
      }
    }
    const merged = this.mergeCourses(allItems);
    const projectTableCategories = new Set([
      "Seminar",
      "Advanced Project",
      "Involvement in a working group",
      "Open Elective",
      "Colloquia and study groups",
      "Master Thesis Supervision Seminar",
    ]);
    const isProjectSeminarWorkshop = (item: Course) => {
      const category =
        item.details && typeof item.details === "object" && typeof item.details.category === "string"
          ? item.details.category
          : "";
      const title = (item.title || "").toLowerCase();
      return (
        projectTableCategories.has(category) ||
        title.includes("project") ||
        title.includes("seminar") ||
        title.includes("workshop")
      );
    };

    let projectSeminarDepartmentStatus = new Map<string, boolean>();
    let courseDepartmentStatus = new Map<string, boolean>();
    if (this.db) {
      projectSeminarDepartmentStatus = await this.db.getProjectSeminarDepartmentStatus("CAU Kiel");
      courseDepartmentStatus = await this.db.getCourseDepartmentStatus("CAU Kiel");
    }

    const missingDepartmentItems = merged.filter((item) => {
      const detailsDepartment =
        item.details && typeof item.details === "object"
          ? ((item.details as Record<string, unknown>).department as string | undefined)
          : undefined;
      if (item.department || detailsDepartment || !item.url) return false;
      const inProjectsTable = isProjectSeminarWorkshop(item);
      const dbStatusMap = inProjectsTable ? projectSeminarDepartmentStatus : courseDepartmentStatus;
      const hasDepartmentInDb = dbStatusMap.get(item.courseCode);
      // Fetch detail only when this is a new row or existing row without department.
      return hasDepartmentInDb !== true;
    });

    if (missingDepartmentItems.length > 0) {
      await Promise.all(
        missingDepartmentItems.map(async (item) => {
          const rawDetailUrl =
            item.details && typeof item.details === "object"
              ? ((item.details as Record<string, unknown>).rawDetailUrl as string | undefined)
              : undefined;
          const detailUrl = rawDetailUrl || item.url;
          if (!detailUrl) return;
          const detailHtml = await this.fetchPage(detailUrl);
          const department = this.extractDepartmentFromDetailHtml(detailHtml);
          if (!department) return;
          item.department = department;
          if (!item.details || typeof item.details !== "object") item.details = {};
          (item.details as Record<string, unknown>).department = department;
        }),
      );
    }

    console.log(`[${this.name}] Found ${merged.length} English academic items after merging.`);
    return merged;
  }

  private mergeCourses(items: Course[]): Course[] {
    const courseMap = new Map<string, Course>();
    
    const normalizeTitle = (title: string) => {
        let t = title.trim();
        // Strip course code prefixes (alphanumeric codes containing digits/dots/hyphens like "infIoT-01a:")
        t = t.replace(/^[a-zA-Z0-9._-]*[\d._][a-zA-Z0-9._-]*[:\s]+/, "");
        // Strip exercise/practical prefixes
        const prefixes = /^(übung|.?bung|exercise|practical exercise|practice|tutorial|lab|projekt|project|workshop|fyord workshop|begleitseminar|oberseminar|tutorium)( zu| to)?[:\s]+/i;
        while (prefixes.test(t)) { t = t.replace(prefixes, ""); }
        // Strip leftover connectors from partial prefix removal
        t = t.replace(/^(zu|to)[:\s]+/i, "");
        return t.trim().toLowerCase();
    };

    const isSecondary = (c: Course) => {
        const type = (c.details as any).type; // eslint-disable-line @typescript-eslint/no-explicit-any
        return type === "Exercise" || type === "Practical" || type === "Project" ||
               /^(übung|.?bung|exercise|practical|practice|tutorial|lab|projekt|project|workshop)( zu| to)?:\s*/i.test(c.title);
    };

    // Deduplicate items by courseCode + internalId (same course appears in multiple page sections)
    const deduped = new Map<string, Course>();
    for (const item of items) {
        const key = `${item.courseCode}__${(item.details as any).internalId}`; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!deduped.has(key)) deduped.set(key, item);
    }

    const sorted = [...deduped.values()].sort((a, b) => {
        const secA = isSecondary(a); const secB = isSecondary(b);
        if (secA === secB) return 0;
        return secA ? 1 : -1;
    });

    for (const item of sorted) {
      const itemNormTitle = normalizeTitle(item.title);
      let targetCode: string | undefined;
      if (courseMap.has(item.courseCode)) targetCode = item.courseCode;
      else if (item.courseCode.startsWith("PE") && courseMap.has(item.courseCode.substring(2))) targetCode = item.courseCode.substring(2);
      else if ((item.courseCode.startsWith("E") || item.courseCode.startsWith("P")) && courseMap.has(item.courseCode.substring(1))) targetCode = item.courseCode.substring(1);

      if (!targetCode) {
          const itemInternalId = (item.details as any).internalId; // eslint-disable-line @typescript-eslint/no-explicit-any
          for (const [code, existing] of courseMap.entries()) {
              if ((existing.details as any).internalId === itemInternalId) { // eslint-disable-line @typescript-eslint/no-explicit-any
                  targetCode = code; break;
              }
          }
      }

      if (!targetCode) {
        for (const [code, existing] of courseMap.entries()) {
             const existingNormTitle = normalizeTitle(existing.title);
             if (existingNormTitle === itemNormTitle && !isSecondary(existing)) {
                 targetCode = code; break;
             }
        }
      }

      if (!targetCode) {
        for (const [code, existing] of courseMap.entries()) {
             const existingNormTitle = normalizeTitle(existing.title);
             // Require the shorter title to be at least 60% of the longer title's length to avoid false matches
             const shorter = existingNormTitle.length < itemNormTitle.length ? existingNormTitle : itemNormTitle;
             const longer = existingNormTitle.length < itemNormTitle.length ? itemNormTitle : existingNormTitle;
             if (shorter.length > 5 && longer.includes(shorter) && shorter.length >= longer.length * 0.6 && !isSecondary(existing)) {
                 targetCode = code; break;
             }
        }
      }

      if (targetCode && courseMap.has(targetCode)) {
        const existing = courseMap.get(targetCode)!;
        const isNewCodeBetter = /^[a-zA-Z]/.test(item.courseCode) && /^\d/.test(existing.courseCode);

        const target = isNewCodeBetter ? item : existing;
        const source = isNewCodeBetter ? existing : item;

        if (isNewCodeBetter) {
            courseMap.delete(existing.courseCode);
            courseMap.set(item.courseCode, item);
        }

        const tDetails = target.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const sDetails = source.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        
        if (!tDetails.breakdown) tDetails.breakdown = [0, 0, 0, 0];
        if (!sDetails.breakdown) sDetails.breakdown = [0, 0, 0, 0];

        const su = sDetails.rawUnits || 0;
        const stype = sDetails.type;
        if (stype === "Lecture") tDetails.breakdown[0] += su;
        else if (stype === "Seminar") tDetails.breakdown[1] += su;
        else if (stype === "Exercise") tDetails.breakdown[2] += su;
        else if (stype === "Practical" || stype === "Project") tDetails.breakdown[3] += su;

        const sSched = sDetails.schedule || {};
        const tSched = tDetails.schedule || {};
        for (const [type, dates] of Object.entries(sSched)) {
            if (!tSched[type]) tSched[type] = [];
            (dates as string[]).forEach(d => { if (!tSched[type].includes(d)) tSched[type].push(d); });
        }
        tDetails.schedule = tSched;

        const sInstr = (sDetails.instructors || []).filter((i: string) => i && i !== "N.N." && i !== "N. N.");
        const tInstr = (tDetails.instructors || []).filter((i: string) => i && i !== "N.N." && i !== "N. N.");
        sInstr.forEach((i: string) => { if (!tInstr.includes(i)) tInstr.push(i); });
        tDetails.instructors = tInstr;

        const sLinks = Array.isArray(sDetails.resources) ? (sDetails.resources as string[]) : [];
        const tLinks = Array.isArray(tDetails.resources) ? (tDetails.resources as string[]) : [];
        tDetails.resources = Array.from(new Set([...tLinks, ...sLinks]));

        if (!target.url && source.url) target.url = source.url;
        if (!target.department && source.department) target.department = source.department;
        if (!tDetails.department && sDetails.department) tDetails.department = sDetails.department;
        if (!tDetails.rawDetailUrl && sDetails.rawDetailUrl) tDetails.rawDetailUrl = sDetails.rawDetailUrl;

        if (!target.description) target.description = source.description;
      } else {
        const details = item.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!details.breakdown) {
            details.breakdown = [0, 0, 0, 0];
            const u = details.rawUnits || 0;
            const type = details.type;
            if (type === "Lecture") details.breakdown[0] += u;
            else if (type === "Seminar") details.breakdown[1] += u;
            else if (type === "Exercise") details.breakdown[2] += u;
            else if (type === "Practical" || type === "Project") details.breakdown[3] += u;
        }
        courseMap.set(item.courseCode, item);
      }
    }

    const result = Array.from(courseMap.values());
    result.forEach(c => {
        const d = c.details as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (d.breakdown) {
            c.units = `${d.breakdown[0]}-${d.breakdown[1]}-${d.breakdown[2]}-${d.breakdown[3]}`;
            delete d.breakdown; delete d.rawUnits; delete d.type;
        }
    });
    return result;
  }
}
