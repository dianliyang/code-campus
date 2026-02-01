import { createClient } from '@supabase/supabase-js';

const UNIVERSITY = 'MIT';
const OCW_SEARCH_URL = 'https://open.mit.edu/api/v0/search/';
const OCW_BASE_URL = 'https://ocw.mit.edu';

// Semester ordering for picking the "latest" run
const SEMESTER_ORDER: Record<string, number> = {
  'Spring': 1,
  'Summer': 2,
  'Fall': 3,
  'January IAP': 0,
};

interface OCWRun {
  semester: string;
  year: number;
  level: string[];
  slug: string;
  instructors: string[];
}

interface OCWHit {
  _source: {
    coursenum: string;
    title: string;
    short_description: string;
    topics: string[];
    department_name: string[];
    runs: OCWRun[];
  };
}

function buildRequestBody(from: number, size: number) {
  return {
    from,
    size,
    post_filter: {
      bool: {
        must: [
          { bool: { should: [{ term: { 'object_type.keyword': 'course' } }] } },
          { bool: { should: [{ term: { offered_by: 'OCW' } }] } },
          { bool: { should: [{ term: { department_name: 'Electrical Engineering and Computer Science' } }] } },
        ],
      },
    },
    query: {
      bool: {
        should: [
          { bool: { filter: { bool: { must: [{ term: { object_type: 'course' } }] } } } },
        ],
      },
    },
    aggs: {},
  };
}

function getLatestRun(runs: OCWRun[]): OCWRun | undefined {
  if (!runs || runs.length === 0) return undefined;
  return [...runs].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (SEMESTER_ORDER[b.semester] ?? 0) - (SEMESTER_ORDER[a.semester] ?? 0);
  })[0];
}

function normalizeSemesterTerm(semester: string): string {
  const s = semester.toLowerCase();
  if (s.includes('fall')) return 'Fall';
  if (s.includes('spring')) return 'Spring';
  if (s.includes('summer')) return 'Summer';
  if (s.includes('winter') || s.includes('iap') || s.includes('january')) return 'Winter';
  // Default: capitalize first letter
  return semester.charAt(0).toUpperCase() + semester.slice(1);
}

async function fetchOCWCourses(size: number): Promise<OCWHit[]> {
  const body = buildRequestBody(0, size);

  console.log(`Fetching up to ${size} EECS courses from MIT OCW API...`);
  const res = await fetch(OCW_SEARCH_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'origin': 'https://ocw.mit.edu',
      'referer': 'https://ocw.mit.edu/',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OCW API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const hits: OCWHit[] = data.hits?.hits ?? [];
  console.log(`API returned ${hits.length} courses (total: ${data.hits?.total})`);
  return hits;
}

function parseArgs(): { size: number } {
  let size = 300;
  for (const arg of process.argv) {
    const match = arg.match(/^--size=(\d+)$/);
    if (match) {
      size = parseInt(match[1], 10);
    }
  }
  return { size };
}

async function main() {
  const { size } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch courses from OCW API
  const hits = await fetchOCWCourses(size);

  // 2. Transform API hits into structured data
  interface CourseData {
    courseCode: string;
    title: string;
    url: string | null;
    level: string | null;
    department: string | null;
    description: string | null;
    details: Record<string, unknown> | null;
  }
  const coursesData: CourseData[] = [];
  const semesterData: { courseCode: string; term: string; year: number }[] = [];

  for (const hit of hits) {
    const src = hit._source;
    const latestRun = getLatestRun(src.runs);

    const courseCode = src.coursenum;
    if (!courseCode) continue;

    const url = latestRun?.slug
      ? `${OCW_BASE_URL}/${latestRun.slug}`
      : null;

    const level = latestRun?.level?.[0]?.toLowerCase() ?? null;

    const details: Record<string, unknown> = {};
    if (src.topics && src.topics.length > 0) {
      details.topics = src.topics;
    }
    if (latestRun?.instructors && latestRun.instructors.length > 0) {
      details.instructors = latestRun.instructors;
    }

    coursesData.push({
      courseCode,
      title: src.title,
      url,
      level,
      department: src.department_name?.[0] || null,
      description: src.short_description || null,
      details: Object.keys(details).length > 0 ? details : null,
    });

    // Collect semester info from the latest run
    if (latestRun?.semester && latestRun?.year) {
      semesterData.push({
        courseCode,
        term: normalizeSemesterTerm(latestRun.semester),
        year: latestRun.year,
      });
    }
  }

  // Deduplicate by course_code (keep the one with the latest run)
  const deduped = new Map<string, CourseData>();
  for (const c of coursesData) {
    if (!deduped.has(c.courseCode)) {
      deduped.set(c.courseCode, c);
    }
  }
  const uniqueCourses = Array.from(deduped.values());
  console.log(`\nPrepared ${uniqueCourses.length} unique courses (from ${coursesData.length} hits)`);

  // 3. Find which courses already exist in DB
  const allCourseCodes = uniqueCourses.map(c => c.courseCode);
  const { data: existingCourses, error: existErr } = await supabase
    .from('courses')
    .select('course_code')
    .eq('university', UNIVERSITY)
    .in('course_code', allCourseCodes);

  if (existErr) {
    console.error('Error checking existing courses:', existErr);
    throw existErr;
  }

  const existingSet = new Set(existingCourses?.map(c => c.course_code) ?? []);
  const newCourses = uniqueCourses.filter(c => !existingSet.has(c.courseCode));
  const existingToUpdate = uniqueCourses.filter(c => existingSet.has(c.courseCode));

  console.log(`Existing courses to update: ${existingToUpdate.length}`);
  console.log(`New courses to insert: ${newCourses.length}`);

  // 4a. Insert new courses (with title, description, department)
  if (newCourses.length > 0) {
    const insertRows = newCourses.map(c => ({
      university: UNIVERSITY,
      course_code: c.courseCode,
      title: c.title,
      description: c.description,
      department: c.department,
      url: c.url,
      level: c.level,
      details: c.details,
    }));

    const BATCH_SIZE = 100;
    for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
      const batch = insertRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('courses').insert(batch);
      if (error) {
        console.error(`Error inserting new courses batch:`, error);
        throw error;
      }
      console.log(`Inserted ${batch.length} new courses`);
    }
  }

  // 4b. Update existing courses (only url, level, details — preserve title, description, department)
  let updated = 0;
  for (const c of existingToUpdate) {
    const { error } = await supabase
      .from('courses')
      .update({ url: c.url, level: c.level, details: c.details })
      .eq('university', UNIVERSITY)
      .eq('course_code', c.courseCode);

    if (error) {
      console.error(`Error updating ${c.courseCode}:`, error);
    } else {
      updated++;
    }
  }
  console.log(`Updated ${updated} existing courses`);

  // 5. Fetch all course IDs
  const courseCodes = allCourseCodes;
  const { data: allCourses, error: fetchError } = await supabase
    .from('courses')
    .select('id, course_code')
    .eq('university', UNIVERSITY)
    .in('course_code', courseCodes);

  if (fetchError) {
    console.error('Error fetching course IDs:', fetchError);
    return;
  }

  const courseCodeToId = new Map<string, number>();
  allCourses?.forEach(c => {
    courseCodeToId.set(c.course_code, c.id);
  });

  // 5. Handle semesters
  if (semesterData.length > 0) {
    // Collect unique semesters
    const uniqueSemesters = new Map<string, { term: string; year: number }>();
    for (const s of semesterData) {
      const key = `${s.term}-${s.year}`;
      uniqueSemesters.set(key, { term: s.term, year: s.year });
    }

    // Upsert semesters
    const semestersArray = Array.from(uniqueSemesters.values());
    const { data: savedSemesters, error: semError } = await supabase
      .from('semesters')
      .upsert(semestersArray, { onConflict: 'year,term' })
      .select('id, term, year');

    if (semError) {
      console.error('Error upserting semesters:', semError);
    } else if (savedSemesters) {
      // Map semester keys to IDs
      const semesterIdMap = new Map<string, number>();
      savedSemesters.forEach(s => {
        semesterIdMap.set(`${s.term}-${s.year}`, s.id);
      });

      // Build course_semesters links
      const links: { course_id: number; semester_id: number }[] = [];
      for (const s of semesterData) {
        const courseId = courseCodeToId.get(s.courseCode);
        const semId = semesterIdMap.get(`${s.term}-${s.year}`);
        if (courseId && semId) {
          links.push({ course_id: courseId, semester_id: semId });
        }
      }

      // Upsert links
      if (links.length > 0) {
        const { error: linkError } = await supabase
          .from('course_semesters')
          .upsert(links, { onConflict: 'course_id,semester_id' });

        if (linkError) {
          console.error('Error linking course semesters:', linkError);
        } else {
          console.log(`Linked ${links.length} course-semester records`);
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total courses fetched from OCW: ${hits.length}`);
  console.log(`New courses inserted: ${newCourses.length}`);
  console.log(`Existing courses updated: ${updated}`);
  console.log(`Semesters linked: ${semesterData.length}`);
}

main().catch(console.error);
