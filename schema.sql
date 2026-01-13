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
  corequisites TEXT,
  level TEXT, -- undergraduate, graduate, or both
  difficulty REAL, -- numeric difficulty rating
  popularity INTEGER DEFAULT 0,
  time_commitment TEXT,
  is_hidden INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_university ON courses(university);
CREATE INDEX idx_course_code ON courses(course_code);

CREATE TABLE fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE course_fields (
  course_id INTEGER NOT NULL,
  field_id INTEGER NOT NULL,
  PRIMARY KEY (course_id, field_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

CREATE INDEX idx_course_fields_field ON course_fields(field_id);
