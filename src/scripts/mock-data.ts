import { runD1, queryD1 } from '../lib/d1';

async function main() {
  console.log("Mocking data...");

  // 1. Ensure mock user exists
  await runD1(`
    INSERT OR IGNORE INTO user (id, email, name) 
    VALUES (?, ?, ?)
  `, [1, "test@example.com", "Demo User"]);

  const userId = 1;

  // 2. Ensure some fields exist (if not already there)
  const fields = ["AI / Machine Learning", "Systems & Networking", "Theory & Fundamentals"];
  for (const field of fields) {
    await runD1('INSERT OR IGNORE INTO fields (name) VALUES (?)', [field]);
  }

  // 3. Get some course IDs
  const courses = await queryD1<{ id: number }>('SELECT id FROM courses LIMIT 1');
  
  if (courses.length === 0) {
    console.log("No courses found in remote DB. Please run a scraper first.");
    return;
  }

  // 4. Enroll the test user in some courses with different progress
  console.log(`Enrolling user ${userId} in ${courses.length} courses...`);
  
  for (let i = 0; i < courses.length; i++) {
    const courseId = courses[i].id;
    const progress = Math.floor(Math.random() * 101);
    const status = i === 0 ? 'completed' : (progress > 0 ? 'in_progress' : 'pending');
    
    await runD1(`
      INSERT OR IGNORE INTO user_courses (user_id, course_id, progress, status)
      VALUES (?, ?, ?, ?)
    `, [userId, courseId, progress, status]);
  }

  // 5. Mock Semesters
  console.log("Mocking semesters...");
  const semesterData = [
    { year: 2025, term: 'Spring' },
    { year: 2025, term: 'Fall' },
    { year: 2026, term: 'Spring' }
  ];

  for (const sem of semesterData) {
    await runD1('INSERT OR IGNORE INTO semesters (year, term) VALUES (?, ?)', [sem.year, sem.term]);
  }

  const allSemesters = await queryD1<{ id: number }>('SELECT id FROM semesters');
  const allCourses = await queryD1<{ id: number }>('SELECT id FROM courses LIMIT 20');

  console.log(`Linking ${allCourses.length} courses to random semesters...`);
  for (const course of allCourses) {
    // Link each course to 1 or 2 random semesters
    const randomSem = allSemesters[Math.floor(Math.random() * allSemesters.length)];
    await runD1('INSERT OR IGNORE INTO course_semesters (course_id, semester_id) VALUES (?, ?)', [course.id, randomSem.id]);
    
    if (Math.random() > 0.7) {
      const anotherSem = allSemesters[Math.floor(Math.random() * allSemesters.length)];
      await runD1('INSERT OR IGNORE INTO course_semesters (course_id, semester_id) VALUES (?, ?)', [course.id, anotherSem.id]);
    }
  }

  console.log("Mock data created successfully.");
}

main().catch(console.error);
