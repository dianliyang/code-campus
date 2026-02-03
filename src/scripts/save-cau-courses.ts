import fs from 'fs';
import { SupabaseDatabase } from '../lib/supabase/server';
import { Course } from '../lib/scrapers/types';

async function main() {
  console.log(`Reading courses from cau-kiel-courses.json...`);
  
  try {
    const rawData = fs.readFileSync('cau-kiel-courses.json', 'utf-8');
    const courses: Course[] = JSON.parse(rawData);
    
    if (courses.length > 0) {
        console.log(`Found ${courses.length} courses.`);
        console.log(`Saving to Supabase...`);
        const db = new SupabaseDatabase();
        await db.saveCourses(courses);
        console.log('Courses saved successfully.');
    } else {
        console.log('No courses found in file.');
    }
  } catch (error) {
    console.error("Error importing courses:", error);
  }
}

main().catch(console.error);