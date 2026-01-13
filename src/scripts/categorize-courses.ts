import { queryD1, runD1 } from '../lib/d1';

const FIELDS = {
  "AI / Machine Learning": [
    "artificial intelligence", "machine learning", "neural networks", "deep learning", "computer vision", 
    "natural language processing", "robotics", "reinforcement learning", "data science", "inference", "probabilistic", "nlp"
  ],
  "Systems & Networking": [
    "operating systems", "distributed systems", "networks", "networking", "cloud computing", "multicore", 
    "parallel programming", "database systems", "distributed computer systems", "computer networks", "virtualization", "storage"
  ],
  "Theory & Fundamentals": [
    "algorithms", "data structures", "computational complexity", "discrete mathematics", "theory", "formal reasoning", 
    "formal methods", "proof", "logic", "quantum", "optimization", "automata", "cryptography"
  ],
  "Architecture & Hardware": [
    "computer architecture", "digital systems", "circuits", "hardware", "microprocessor", "low-level", "assembly", "vlsi", "soc", "fpga", "iot"
  ],
  "Programming Languages & SE": [
    "programming languages", "compilers", "software engineering", "software construction", "software design", 
    "program analysis", "software performance", "functional programming", "semantics", "synthesis"
  ],
  "Security & Privacy": [
    "security", "cryptography", "privacy", "information security", "cybersecurity", "hacking", "vulnerability", "encryption"
  ],
  "Graphics & HCI": [
    "graphics", "rendering", "human-computer interaction", "hci", "user interface", "visualization", "interaction", "augmented reality", "virtual reality"
  ],
  "Math & Physics": [
    "mathematics", "linear algebra", "statistics", "probability", "calculus", "physics"
  ]
};

async function main() {
  console.log("Starting course categorization...");

  // 1. Ensure fields are in the database
  for (const field of Object.keys(FIELDS)) {
    try {
      await runD1('INSERT OR IGNORE INTO fields (name) VALUES (?)', [field]);
    } catch (e) {
      console.error(`Error inserting field ${field}:`, e);
    }
  }

  // Get all field IDs
  const fieldRows = await queryD1<{ id: number, name: string }>('SELECT id, name FROM fields');
  const fieldMap: Record<string, number> = {};
  fieldRows.forEach(row => { fieldMap[row.name] = row.id; });

  // 2. Fetch courses
  const courses = await queryD1<{ id: number, title: string, description: string }>('SELECT id, title, description FROM courses');
  console.log(`Analyzing ${courses.length} courses...`);

  let count = 0;
  for (const course of courses) {
    const text = (course.title + " " + (course.description || "")).toLowerCase();
    const assignedFields: number[] = [];

    for (const [fieldName, keywords] of Object.entries(FIELDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        assignedFields.push(fieldMap[fieldName]);
      }
    }

    if (assignedFields.length > 0) {
      for (const fieldId of assignedFields) {
        await runD1('INSERT OR IGNORE INTO course_fields (course_id, field_id) VALUES (?, ?)', [course.id, fieldId]);
      }
      count++;
    }
  }

  console.log(`Successfully categorized ${count} courses.`);
}

main().catch(console.error);
