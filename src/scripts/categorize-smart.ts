import {
  createAdminClient
} from '../lib/supabase/server';

// Weighted keywords: [keyword, weight]
// Higher weight for specific/unique terms. Lower for generic ones.
const TAXONOMY: Record<string, [string, number][]> = {
  'Artificial Intelligence': [
    ['artificial intelligence', 5], ['machine learning', 5], ['deep learning', 5], ['neural network', 4],
    ['computer vision', 4], ['nlp', 4], ['robotics', 4], ['reinforcement learning', 5],
    ['natural language', 4], ['intelligent systems', 3], ['agents', 2], ['generative', 3],
    ['large language model', 5], ['llm', 5], ['ai', 2] // 'ai' is short, risky
  ],
  'Systems & Networking': [
    ['operating system', 5], ['distributed system', 5], ['computer architecture', 5], ['networking', 4],
    ['compiler', 5], ['embedded', 4], ['kernel', 4], ['parallel computing', 4], ['cloud computing', 4],
    ['virtualization', 4], ['microarchitecture', 4], ['digital systems', 3], ['iot', 4],
    ['network', 3], ['systems', 2] // Generic 'systems' lower weight
  ],
  'Security & Privacy': [
    ['security', 5], ['cryptography', 5], ['privacy', 4], ['cybersecurity', 5], ['malware', 4],
    ['forensics', 4], ['network security', 5], ['secure', 3], ['vulnerability', 4]
  ],
  'Theory & Math': [
    ['algorithm', 5], ['complexity', 4], ['automata', 4], ['computability', 4], ['logic', 3],
    ['discrete math', 4], ['probability', 3], ['quantum', 5], ['optimization', 3], ['graph theory', 4],
    ['theoretical', 3], ['formal methods', 4], ['proofs', 3]
  ],
  'Software Engineering': [
    ['software engineering', 5], ['software design', 4], ['web development', 4], ['mobile development', 4],
    ['testing', 3], ['agile', 3], ['devops', 4], ['full stack', 4], ['frontend', 4], ['backend', 4],
    ['software architecture', 4], ['api', 3], ['app development', 4]
  ],
  'Data & Databases': [
    ['database', 5], ['data science', 5], ['big data', 4], ['data mining', 4], ['information retrieval', 4],
    ['sql', 3], ['nosql', 3], ['analytics', 3], ['data engineering', 4], ['storage systems', 3]
  ],
  'Graphics & HCI': [
    ['computer graphics', 5], ['human-computer interaction', 5], ['hci', 5], ['user interface', 4],
    ['ux', 4], ['visualization', 4], ['game', 3], ['animation', 4], ['virtual reality', 5],
    ['augmented reality', 5], ['rendering', 4], ['multimedia', 3]
  ],
  'Programming Languages': [
    ['programming language', 5], ['functional programming', 4], ['object-oriented', 4], ['type theory', 4],
    ['compilers', 3], ['semantics', 3], ['program analysis', 4], ['rust', 2], ['c++', 2], ['java', 2], ['python', 2]
  ],
  'Bioinformatics & Health': [
    ['bioinformatics', 5], ['computational biology', 5], ['genomics', 4], ['health', 2], ['medical', 2]
  ]
};

async function main() {
  const supabase = createAdminClient();
  console.log("Starting smart categorization...");

  // 1. Ensure fields exist and get IDs
  const fieldMap: Record<string, number> = {};
  for (const fieldName of Object.keys(TAXONOMY)) {
    const { data } = await supabase.from('fields').upsert({ name: fieldName }, { onConflict: 'name' }).select('id').single();
    if (data) fieldMap[fieldName] = data.id;
  }
  
  // Also generic field
  const { data: genData } = await supabase.from('fields').upsert({ name: 'General CS' }, { onConflict: 'name' }).select('id').single();
  const genId = genData?.id;

  // 2. Fetch uncategorized
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, course_fields(field_id)');

  const uncategorized = courses?.filter(c => !c.course_fields || c.course_fields.length === 0) || [];
  console.log(`Analyzing ${uncategorized.length} courses...`);

  const updates = [];

  for (const course of uncategorized) {
    const text = `${course.title} ${course.description || ''}`.toLowerCase();
    
    const scores: Record<string, number> = {};
    
    for (const [category, keywords] of Object.entries(TAXONOMY)) {
      scores[category] = 0;
      for (const [kw, weight] of keywords) {
        // Regex for whole word match to avoid partials (e.g., 'art' in 'start')
        // Escaping special regex chars in keyword if any
        const safeKw = kw.replace(/[.*+?^${}()|[\\]/g, '\\$&');
        const regex = new RegExp(`\\b${safeKw}\\b`, 'i');
        if (regex.test(text)) {
          scores[category] += weight;
        }
      }
    }

    // Find best category
    let maxScore = 0;
    let bestCat = null;
    
    for (const [cat, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCat = cat;
      }
    }

    // Threshold for categorization (e.g., must match at least a weight of 2)
    if (maxScore >= 2 && bestCat && fieldMap[bestCat]) {
      updates.push({
        course_id: course.id,
        field_id: fieldMap[bestCat]
      });
    } else if (genId) {
      // If we really can't determine, maybe General CS? 
      // Or leave it? User said "categorize those haven't categorized".
      // Let's check for "Intro" or "Principles" for General CS
      if (/intro|principle|foundation|fundamental|freshman|seminar/i.test(text)) {
         updates.push({ course_id: course.id, field_id: genId });
      }
    }
  }

  console.log(`Identified categories for ${updates.length} courses.`);

  // Batch insert
  const BATCH = 100;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    const { error } = await supabase.from('course_fields').upsert(chunk, { onConflict: 'course_id,field_id' });
    if (error) console.error("Error inserting batch:", error);
    else console.log(`Saved batch ${i/BATCH + 1}`);
  }
}

main().catch(console.error);
