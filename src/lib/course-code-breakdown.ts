export type CodeBreakdownItem = {
  label: string;
  value: string;
  detail?: string;
};

const CMU_DEPARTMENTS: Record<string, string> = {
  "15": "School of Computer Science",
  "18": "Electrical and Computer Engineering",
  "21": "Mathematics",
  "70": "Tepper School of Business",
};

const cmuLevelFromThirdDigit = (digit: string): string => {
  if (digit === "0" || digit === "1") return "Freshman / Intro";
  if (digit === "2") return "Sophomore / Core";
  if (digit === "3") return "Junior / Intermediate";
  if (digit === "4") return "Senior / Advanced";
  if (digit === "6" || digit === "7" || digit === "8") return "Graduate";
  return "Other";
};

const cmuTopicFamily = (dept: string, thirdDigit: string): string | null => {
  if (dept !== "15") return null;
  if (thirdDigit === "1") return "General Intro";
  if (thirdDigit === "2") return "Core CS Foundations";
  if (thirdDigit === "3") return "Mathematical Foundations / Theory";
  if (thirdDigit === "4") return "Systems";
  if (thirdDigit === "6") return "AI / ML (Graduate)";
  return null;
};

const stanfordLevelBand = (courseNumber: number): string => {
  if (courseNumber <= 99) return "Introductory (0-99)";
  if (courseNumber <= 199) return "Undergraduate Core (100-199)";
  if (courseNumber <= 299) return "Advanced / Master's (200-299)";
  if (courseNumber <= 399) return "Advanced Graduate (300-399)";
  return "Special Topics / Research (400+)";
};

const stanfordTopicByTens = (courseNumber: number): string => {
  const tens = Math.floor((courseNumber % 100) / 10);
  if (tens === 2) return "Artificial Intelligence";
  if (tens === 4) return "Systems";
  if (tens === 5) return "Theory";
  if (tens === 6) return "Algorithms";
  if (tens === 7) return "Graphics / HCI";
  return "General";
};

const stanfordSuffixMeaning = (suffix: string): string => {
  const normalized = suffix.toUpperCase();
  if (!normalized) return "None";
  if (normalized === "N") return "Introductory Seminar";
  if (normalized === "W") return "Writing Intensive";
  if (normalized === "S") return "Summer Offering";
  if (normalized === "A" || normalized === "B" || normalized === "C") return "Sequence Course";
  return `Variant ${normalized}`;
};

export const getCourseCodeBreakdown = (university: string | undefined, courseCode: string | undefined): CodeBreakdownItem[] => {
  const rawSchool = (university || "").trim().toLowerCase();
  const school = (
    rawSchool === "uc berkeley" || rawSchool === "university of california, berkeley" || rawSchool === "university of california berkeley"
      ? "ucb"
      : rawSchool === "carnegie mellon" || rawSchool === "carnegie mellon university"
        ? "cmu"
        : rawSchool
  );
  const code = (courseCode || "").trim();
  if (!code) return [];

  if (school === "cmu") {
    const normalized = /^\d{5}$/.test(code) ? `${code.slice(0, 2)}-${code.slice(2)}` : code;
    const match = normalized.match(/^(\d{2})-(\d{3})$/);
    if (!match) return [];

    const dept = match[1];
    const body = match[2];
    const thirdDigit = body[0];
    const topicId = body.slice(1);
    const family = cmuTopicFamily(dept, thirdDigit);

    const items: CodeBreakdownItem[] = [
      {
        label: "Department",
        value: dept,
        detail: CMU_DEPARTMENTS[dept] || `Department ${dept}`,
      },
      {
        label: "Level Digit",
        value: thirdDigit,
        detail: cmuLevelFromThirdDigit(thirdDigit),
      },
      {
        label: "Topic ID",
        value: topicId,
        detail: "Unique subject identifier",
      },
    ];
    if (family) {
      items.push({
        label: "Topic Family",
        value: `15-${thirdDigit}xx`,
        detail: family,
      });
    }
    return items;
  }

  if (school === "stanford") {
    const match = code.toUpperCase().match(/^([A-Z&]+)\s+(\d+)([A-Z]*)$/);
    if (!match) return [];

    const subject = match[1];
    const numberText = match[2];
    const suffix = match[3] || "";
    const courseNumber = Number(numberText);
    if (!Number.isFinite(courseNumber)) return [];

    return [
      {
        label: "Subject Prefix",
        value: subject,
        detail: "Department",
      },
      {
        label: "Course Number",
        value: numberText,
        detail: stanfordLevelBand(courseNumber),
      },
      {
        label: "Tens Digit Area",
        value: String(Math.floor((courseNumber % 100) / 10)),
        detail: stanfordTopicByTens(courseNumber),
      },
      {
        label: "Suffix",
        value: suffix || "-",
        detail: stanfordSuffixMeaning(suffix),
      },
    ];
  }

  if (school === "mit") {
    const match = code.toUpperCase().match(/^([A-Z0-9]+)\.([A-Z]?)(\d+)([A-Z]?)$/);
    if (!match) return [];
    const dept = match[1];
    const specialPrefix = match[2] || "";
    const digits = match[3];
    const suffix = match[4] || "";
    const firstDigit = Number(digits[0] || "0");
    const secondDigit = Number(digits[1] || "0");
    const thirdDigit = Number(digits[2] || "0");
    const lastDigit = Number(digits[digits.length - 1] || "0");

    const firstDigitLevel = (() => {
      if (firstDigit >= 1 && firstDigit <= 4) return "Undergraduate (Foundational/Advanced)";
      if (firstDigit === 5) return "Graduate Foundation";
      if (firstDigit >= 6 && firstDigit <= 8) return "Graduate Advanced";
      if (firstDigit === 9) return "Special Programs";
      return "Other";
    })();

    const subDiscipline = (() => {
      if (secondDigit === 0) return "Software & Programming";
      if (secondDigit === 1) return "Programming Languages";
      if (secondDigit === 2) return "Theory";
      if (secondDigit === 3) return "Signal Processing / Control";
      if (secondDigit === 4) return "AI / Vision / HCI";
      if (secondDigit === 5) return "Systems";
      if (secondDigit === 9) return "Architecture / Hardware";
      return "General";
    })();

    const versionMeaning = (() => {
      if (digits.length >= 4) {
        if (lastDigit === 0) return "Graduate Credit Variant";
        if (lastDigit === 1) return "Undergraduate Credit Variant";
        if (lastDigit === 2) return "Alternate Graduate Variant";
      }
      if (suffix === "A") return "First-Half Module";
      if (suffix === "B") return "Second-Half Module";
      if (suffix === "L") return "Lab-focused Variant";
      if (suffix === "J") return "Joint / Cross-listed Variant";
      return "Standard Variant";
    })();

    return [
      { label: "Department", value: dept, detail: "Owning MIT department/subject" },
      { label: "Level Digit", value: String(firstDigit), detail: firstDigitLevel },
      { label: "Sub-discipline", value: String(secondDigit), detail: subDiscipline },
      { label: "Subject ID", value: String(thirdDigit), detail: "Unique identifier within track" },
      { label: "Version / Variant", value: digits.length >= 4 ? String(lastDigit) : (suffix || "-"), detail: versionMeaning },
      ...(specialPrefix ? [{ label: "Special Prefix", value: specialPrefix, detail: "Special/temporary subject marker" }] : []),
    ];
  }

  if (school === "ucb") {
    const match = code.toUpperCase().match(/^([A-Z&]+)\s+([A-Z]*)(\d+)([A-Z]*)$/);
    if (!match) return [];
    const subject = match[1];
    const prefixMod = match[2] || "";
    const numberText = match[3];
    const suffix = match[4] || "";
    const num = Number(numberText);
    if (!Number.isFinite(num)) return [];

    const firstDigit = Number(numberText[0] || "0");
    const levelBand = (() => {
      if (num <= 99) return "Lower Division (1-99)";
      if (num <= 199) return "Upper Division (100-199)";
      if (num <= 299) return "Graduate (200-299)";
      return "Professional / Specialized (300+)";
    })();

    const topicFlavor = (() => {
      if (!["EECS", "ELENG", "COMPSCI"].includes(subject)) return "General";
      const tens = Math.floor((num % 100) / 10);
      if (tens === 5) return "Architecture / Integrated Circuits";
      if (tens === 6) return "Software Systems";
      if (tens === 7) return "Theory";
      if (tens === 8) return "Applications";
      return "General";
    })();

    const suffixMeaning = (() => {
      if (!suffix) return "Standard";
      if (suffix === "W") return "Web-based";
      if (suffix === "L") return "Lab-centric";
      if (suffix === "H") return "Honors";
      if (suffix === "N") return "Summer Session Variant";
      if (suffix === "AC") return "American Cultures";
      if (suffix === "R") return "Reading & Composition";
      if (suffix === "A" || suffix === "B" || suffix === "C") return "Series Course";
      return `Variant ${suffix}`;
    })();

    const prefixMeaning = (() => {
      if (!prefixMod) return "None";
      if (prefixMod.includes("C")) return "Cross-listed";
      if (prefixMod.includes("S")) return "Summer Offering";
      if (prefixMod.includes("W")) return "Web/Delivery Modifier";
      return `Modifier ${prefixMod}`;
    })();

    return [
      { label: "Subject Prefix", value: subject, detail: "Department" },
      { label: "Level Digit", value: String(firstDigit), detail: levelBand },
      { label: "Topic Flavor", value: `${subject} ${Math.floor(num / 10)}x`, detail: topicFlavor },
      { label: "Prefix Modifier", value: prefixMod || "-", detail: prefixMeaning },
      { label: "Suffix", value: suffix || "-", detail: suffixMeaning },
    ];
  }

  return [];
};
