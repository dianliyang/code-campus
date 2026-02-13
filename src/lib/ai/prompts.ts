export const DEFAULT_COURSE_DESCRIPTION_PROMPT = `
Course:
- Title: {{title}}
- Code: {{course_code}}
- University: {{university}}
- Level: {{level}}
- Prerequisites: {{prerequisites}}
- Corequisites: {{corequisites}}
- Existing description: {{description}}

Rewrite and improve this course description for students.
Requirements:
- 2-4 short paragraphs
- specific and practical language
- no markdown headings or bullet lists
- no fabricated facts
- no citations like [1], (Source), or inline reference markers
- no references/sources section
- no URLs
- keep it concise
`.trim();
