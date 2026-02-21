type UnitEstimate = {
  weeklyHours: number;
  details: string;
};

export type UniversityUnitInfo = {
  label: string;
  help: string;
  estimate: UnitEstimate | null;
};

const roundHours = (value: number): number => Math.round(value * 10) / 10;

const parseSingleNumber = (rawUnits: string): number | null => {
  const match = rawUnits.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseRange = (rawUnits: string): { min: number; max: number } | null => {
  const normalized = rawUnits.replace(/\s+/g, "");
  const match = normalized.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
};

const parseMitTriple = (rawUnits: string): { lecture: number; lab: number; prep: number } | null => {
  const normalized = rawUnits.replace(/\s+/g, "");
  const match = normalized.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lecture = Number(match[1]);
  const lab = Number(match[2]);
  const prep = Number(match[3]);
  if (!Number.isFinite(lecture) || !Number.isFinite(lab) || !Number.isFinite(prep)) return null;
  return { lecture, lab, prep };
};

const formatHours = (hours: number): string => `${roundHours(hours).toFixed(1).replace(/\.0$/, "")} h/week`;

export function getUniversityUnitInfo(university: string | undefined, unitsRaw: string | undefined): UniversityUnitInfo {
  const school = (university || "").trim().toLowerCase();
  const units = (unitsRaw || "").trim();

  if (school === "cmu") {
    const numeric = parseSingleNumber(units);
    const estimate = numeric == null
      ? null
      : { weeklyHours: roundHours(numeric), details: `~${formatHours(numeric)} total workload` };

    return {
      label: "Units",
      help: "CMU units approximate total hours/week. Typical load is 45-55 units/semester. Rough conversion: CMU units ÷ 3 ~= semester credits.",
      estimate,
    };
  }

  if (school === "ucb") {
    const range = parseRange(units);
    const numeric = parseSingleNumber(units);
    const estimate = range
      ? {
          weeklyHours: roundHours(((range.min + range.max) / 2) * 3),
          details: `~${formatHours(range.min * 3)} to ${formatHours(range.max * 3)} (3 h per unit)`,
        }
      : numeric == null
        ? null
        : { weeklyHours: roundHours(numeric * 3), details: `~${formatHours(numeric * 3)} (3 h per unit)` };

    return {
      label: "Units",
      help: "Berkeley uses ~3 total hours/week per unit. Typical enrollment is ~13-17 units/semester; many courses are 4 units.",
      estimate,
    };
  }

  if (school === "stanford") {
    const range = parseRange(units);
    const numeric = parseSingleNumber(units);
    const estimate = range
      ? {
          weeklyHours: roundHours(((range.min + range.max) / 2) * 3),
          details: `~${formatHours(range.min * 3)} to ${formatHours(range.max * 3)} (3 h per unit)`,
        }
      : numeric == null
        ? null
        : { weeklyHours: roundHours(numeric * 3), details: `~${formatHours(numeric * 3)} (3 h per unit)` };

    return {
      label: "Units",
      help: "Stanford quarter units are usually ~3 total hours/week each. Typical undergraduate load is about 12-15 units per quarter.",
      estimate,
    };
  }

  if (school === "mit") {
    const triple = parseMitTriple(units);
    if (triple) {
      const total = triple.lecture + triple.lab + triple.prep;
      return {
        label: "Units (L-Lab-P)",
        help: "MIT often uses a lecture-lab-preparation pattern. Example 3-2-7 means 3 lecture + 2 lab + 7 prep = 12 h/week.",
        estimate: { weeklyHours: roundHours(total), details: `~${formatHours(total)} total (${units})` },
      };
    }

    const numeric = parseSingleNumber(units);
    return {
      label: "Units",
      help: "MIT units may be split by lecture/lab/preparation. Total weekly effort is the sum of all parts.",
      estimate: numeric == null ? null : { weeklyHours: roundHours(numeric), details: `~${formatHours(numeric)} total workload` },
    };
  }

  if (school === "cau") {
    return {
      label: "Units (L-S-E-P)",
      help: "CAU format is Lecture-Seminar-Exercise-Practical/Project, e.g. 2-0-2-0.",
      estimate: null,
    };
  }

  return {
    label: "Units",
    help: "Unit meaning can vary by university. Check official catalog guidance for workload interpretation.",
    estimate: null,
  };
}
