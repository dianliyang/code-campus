export function parseCMUSemester(code: string): { term: string; year: number } {
  if (!code) return { term: "Fall", year: 2025 }; // Default

  const termCode = code.charAt(0);
  const yearCode = code.substring(1);
  
  const termMap: Record<string, string> = {
    'F': 'Fall',
    'S': 'Spring',
    'M': 'Summer'
  };
  
  const term = termMap[termCode] || "Fall";
  const year = 2000 + (parseInt(yearCode) || 25);

  return { term, year };
}
