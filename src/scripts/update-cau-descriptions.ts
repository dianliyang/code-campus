import fs from 'fs';
import { SupabaseDatabase, createAdminClient } from '../lib/supabase/server';
import { Course } from '../lib/scrapers/types';

async function main() {
  console.log(`Reading courses from cau-kiel-courses.json...`);
  
  try {
    const rawData = fs.readFileSync('cau-kiel-courses.json', 'utf-8');
    const courses: Course[] = JSON.parse(rawData);
    
    if (courses.length > 0) {
        console.log(`Found ${courses.length} courses to update.`);
        const supabase = createAdminClient();
        
        for (const course of courses) {
            const { error } = await supabase
                .from('courses')
                .update({ description: course.description })
                .eq('course_code', course.courseCode)
                .eq('university', 'CAU Kiel');
            
            if (error) {
                console.error(`Failed to update ${course.courseCode}:`, error);
            } else {
                console.log(`Updated ${course.courseCode}`);
            }
        }
        console.log('Description updates completed.');
    } else {
        console.log('No courses found in file.');
    }
  } catch (error) {
    console.error("Error updating courses:", error);
  }
}

main().catch(console.error);
