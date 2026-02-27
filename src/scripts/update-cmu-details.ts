import { CMU } from '../lib/scrapers/cmu';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

async function updateCMUDetails() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const scraper = new CMU();

  console.log('Fetching existing CMU courses from database...\n');

  // Fetch all CMU courses from database
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, course_code, title, url')
    .eq('university', 'CMU')
    .order('course_code');

  if (error) {
    console.error('Error fetching courses:', error);
    return;
  }

  console.log(`Found ${courses.length} CMU courses in database\n`);

  let updated = 0;
  let skipped = 0;

  for (const course of courses) {
    try {
      console.log(`[${updated + skipped + 1}/${courses.length}] Processing ${course.course_code}...`);

      if (!course.url) {
        console.log(`  Skipping - no URL found`);
        skipped++;
        continue;
      }

      // Fetch the page directly using the stored URL
      const html = await scraper.fetchPage(course.url);
      if (!html) {
        console.log(`  Skipping - failed to fetch`);
        skipped++;
        continue;
      }

      // Parse the details from the HTML
      const $ = cheerio.load(html);

      const description = $("#course-detail-description p").text().trim();
      const prerequisites = $("dt:contains('Prerequisites')").next("dd").text().trim();
      const corequisites = $("dt:contains('Corequisites')").next("dd").text().trim();
      const crossListedCourses = $("dt:contains('Cross-Listed Courses')").next("dd").text().trim();

      const resources: string[] = [];
      const ignoredUrls = [
        "http://www.csd.cmu.edu",
        "https://www.csd.cmu.edu",
        "http://www.ece.cmu.edu/",
        "https://www.ece.cmu.edu/"
      ];
      $("#course-detail-related-urls a").each((_, el) => {
        const href = $(el).attr("href");
        if (href && !ignoredUrls.includes(href)) {
          resources.push(href);
        }
      });

      const details = {
        description,
        prerequisites: prerequisites === "None" ? "" : prerequisites,
        corequisites: corequisites === "None" ? "" : corequisites,
        resources,
        crossListedCourses: crossListedCourses === "None" ? "" : crossListedCourses
      };

      // Update the course in the database
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          description: details.description || null,
          corequisites: details.corequisites || null,
          details: {
            prerequisites: details.prerequisites || '',
            resources: details.resources || [],
            crossListedCourses: details.crossListedCourses || '',
          },
        })
        .eq('id', course.id);

      if (updateError) {
        console.error(`  Error updating ${course.course_code}:`, updateError);
        skipped++;
      } else {
        updated++;
        if (details.resources.length > 0) {
          console.log(`  ✓ Updated with ${details.resources.length} resource URL(s)`);
        }
      }
    } catch (error) {
      console.error(`  Error processing ${course.course_code}:`, error);
      skipped++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total courses: ${courses.length}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Skipped/Failed: ${skipped}`);
}

updateCMUDetails().catch(console.error);
