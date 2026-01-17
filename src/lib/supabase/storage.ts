export function getStorageBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return baseUrl ? `${baseUrl}/storage/v1/object/public/logos` : '/logos';
}

// Map specific university names to their existing legacy filenames
// New universities should just use the slugified name (e.g. "Harvard University" -> "harvard-university.png")
const LEGACY_LOGO_MAP: Record<string, string> = {
  "MIT": "mit.svg",
  "Stanford": "stanford.jpg",
  "CMU": "cmu.jpg",
  "Carnegie Mellon": "cmu.jpg",
  "UC Berkeley": "ucb.png",
  "CAU Kiel": "cau.png",
  "NCU": "ncu.png",
  "NJU": "nju.png",
};

export function getUniversityLogoUrl(universityName: string): string {
  const baseUrl = getStorageBaseUrl();
  
  // 1. Check legacy map first
  if (LEGACY_LOGO_MAP[universityName]) {
    return `${baseUrl}/${LEGACY_LOGO_MAP[universityName]}`;
  }

  // 2. Fallback to convention: lowercase, hyphens instead of spaces, .png
  // e.g. "San Jose State" -> "san-jose-state.png"
  const slug = universityName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  return `${baseUrl}/${slug}.png`;
}

// Deprecated: strictly for backward compatibility if imports haven't been updated yet
export const UNIVERSITY_LOGOS: Record<string, string> = {};
