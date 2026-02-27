import { describe, it, expect } from 'vitest';
import { transformExternalCourse } from '@/lib/external-api';

describe('transformExternalCourse', () => {
  it('should transform a raw course object to the new external API format', () => {
    const rawCourse = {
      id: 101,
      title: 'Algorithms',
      course_code: 'CS101',
      university: 'Example University',
      units: '4',
      credit: 4.0,
      description: 'Intro to algorithms',
      url: 'https://example.edu/cs101',
      instructors: ['Prof. Ada'],
      prerequisites: 'CS100',
      related_urls: ['Syllabus', 'Slides'],
      cross_listed_courses: 'EE101',
      department: 'CS',
      level: 'Undergraduate',
      difficulty: 3.8,
      popularity: 4.2,
      workload: 3.5,
      created_at: '2026-02-01T10:00:00Z',
      latest_semester: { term: 'Spring', year: 2026 },
      details: {
        platforms: ['Canvas'],
        logistics: 'In-person'
      },
      course_fields: [
        { fields: { name: 'Computer Science' } },
        { fields: { name: 'Algorithm Design' } }
      ],
      user_courses: [
        {
          status: 'in_progress',
          gpa: 3.3,
          score: 4.0
        }
      ],
      study_plans: []
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);

    expect(result).toEqual({
      remoteID: 101,
      name: 'Algorithms',
      code: 'CS101',
      university: 'Example University',
      units: '4',
      credit: 4.0,
      desc: 'Intro to algorithms',
      urlString: 'https://example.edu/cs101',
      instructors: ['Prof. Ada'],
      prerequisites: 'CS100',
      resources: ['Syllabus', 'Slides'],
      platforms: ['Canvas'],
      crossListedCourses: ['EE101'],
      category: 'Computer Science',
      department: 'CS',
      latestTerm: 'Spring 2026',
      logistics: 'In-person',
      level: 'Undergraduate',
      difficulty: 3.8,
      popularity: 4.2,
      workload: 3.5,
      gpa: 3.3,
      score: 4.0,
      createdAtISO8601: '2026-02-01T10:00:00Z',
      updatedAtISO8601: expect.Record<string, unknown>(String),
      topic: 'Computer Science',
      isEnrolled: true,
      isFailed: false,
      retry: 0,
      assignments: []
    });
  });

  it('should handle missing optional fields', () => {
    const rawCourse = {
      id: 102,
      title: 'Data Structures',
      course_code: 'CS102',
      university: 'Example University',
      created_at: '2026-02-01T10:00:00Z',
      user_courses: [],
      course_fields: [],
      study_plans: []
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);

    expect(result.remoteID).toBe(102);
    expect(result.resources).toEqual([]);
    expect(result.platforms).toEqual([]);
    expect(result.crossListedCourses).toEqual([]);
    expect(result.category).toBeNull();
    expect(result.latestTerm).toBeNull();
    expect(result.gpa).toBeNull();
    expect(result.isFailed).toBe(false);
  });

  it('should set isFailed to true if status is failed', () => {
    const rawCourse = {
      id: 103,
      user_courses: [{ status: 'failed' }],
      course_fields: [],
      study_plans: []
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);
    expect(result.isFailed).toBe(true);
  });

  it('should parse numeric strings for credit, difficulty, etc.', () => {
    const rawCourse = {
      credit: '4',
      difficulty: '3.5',
      workload: 'high', // non-numeric
      course_fields: [],
      user_courses: [],
      study_plans: []
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);
    expect(result.credit).toBe(4);
    expect(result.difficulty).toBe(3.5);
    expect(result.workload).toBeNull(); // parseFloat('high') is NaN -> null
  });
});
