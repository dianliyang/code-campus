DROP TABLE IF EXISTS courses;

CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  university TEXT NOT NULL,
  course_code TEXT NOT NULL,
  title TEXT NOT NULL,
  units TEXT,
  description TEXT,
  details TEXT, -- JSON string
  department TEXT,
  popularity INTEGER DEFAULT 0,
  field TEXT,
  time_commitment TEXT,
  is_hidden INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_university ON courses(university);
CREATE INDEX idx_course_code ON courses(course_code);
