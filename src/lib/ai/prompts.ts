export const DEFAULT_COURSE_DESCRIPTION_PROMPT = `
Course:
- Title: {{title}}
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

export const DEFAULT_STUDY_PLAN_PROMPT = `
You are generating structured study plan entries from course schedule lines.

Input schedule lines:
{{schedule_lines}}

Return ONLY a JSON array. Each item must include:
- sourceType: string
- sourceLine: string
- daysOfWeek: number[] (0=Sun, 1=Mon, ..., 6=Sat)
- startDate: string (YYYY-MM-DD)
- endDate: string (YYYY-MM-DD)
- startTime: string (HH:MM:SS, 24h)
- endTime: string (HH:MM:SS, 24h)
- location: string
- type: string

Rules:
- Do not add markdown or explanation text.
- If a line is ambiguous and cannot be parsed safely, skip it.
- Keep sourceType and sourceLine exactly matching input meaning.
- If exam dates are present in the schedule data, include them as entries with type "Exam".
- For exam entries, set daysOfWeek to the day of the exam date.
`.trim();

export const DEFAULT_TOPICS_PROMPT = `
You generate concise topic tags for one university course.

Course:
- Title: {{course_name}}
- Existing topics: {{existing_topics}}

Return ONLY a JSON array of strings.
Rules:
- 3 to 6 topics
- each topic short (1-3 words)
- no duplicates
- prefer existing topics when relevant, but create new topics if none match
- topics must be Computer Science subfields only (e.g. Algorithms, Systems, AI, Security, Networks, Databases, HCI, Graphics, Theory, Software Engineering, Distributed Systems, Programming Languages)
- no markdown
- no explanation text
`.trim();
