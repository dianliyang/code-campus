import type { SectionId } from "./SettingsContainer";

const DEFAULT_SECTION: SectionId = "engine";

const PATH_TO_SECTION: Array<{ prefix: string; section: SectionId }> = [
  { prefix: "/settings/usage", section: "usage" },
  { prefix: "/settings/security", section: "identity" },
  { prefix: "/settings/system", section: "sync" },
  { prefix: "/settings/api-management", section: "api-management" },
  { prefix: "/settings/api-reference", section: "api-reference" },
  { prefix: "/settings/import", section: "import" },
  { prefix: "/settings/engine", section: "engine" },
  { prefix: "/settings/intelligence", section: "engine" },
  { prefix: "/settings", section: "engine" },
];

const SECTION_TO_PATH: Partial<Record<SectionId, string>> = {
  engine: "/settings/engine",
  usage: "/settings/usage",
  identity: "/settings/security",
  sync: "/settings/system",
  "api-management": "/settings/api-management",
  "api-reference": "/settings/api-reference",
  import: "/settings/import",
};

export function getSettingsSectionFromPathname(pathname: string | null | undefined, fallback?: SectionId): SectionId {
  const normalized = (pathname || "").trim();
  if (!normalized) return fallback || DEFAULT_SECTION;
  const match = PATH_TO_SECTION.find((entry) => normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`));
  return match?.section || fallback || DEFAULT_SECTION;
}

export function getSettingsPathForSection(section: SectionId): string | null {
  return SECTION_TO_PATH[section] || null;
}
