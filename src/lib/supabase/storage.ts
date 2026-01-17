export function getStorageBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return baseUrl ? `${baseUrl}/storage/v1/object/public/logos` : '/logos';
}

export function getUniversityLogoBase(universityName: string): string {
  const baseUrl = getStorageBaseUrl();
  
  // Convention: lowercase, hyphens instead of spaces
  // e.g. "San Jose State" -> "san-jose-state"
  const slug = universityName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  return `${baseUrl}/${slug}`;
}
