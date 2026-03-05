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
      resources: ['Syllabus', 'Slides'],
      cross_listed_courses: 'EE101',
      department: 'CS',
      level: 'Undergraduate',
      created_at: '2026-02-01T10:00:00Z',
      latest_semester: { term: 'Spring', year: 2026 },
      details: {
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

    expect(result).toMatchObject({
      code: 'CS101',
      name: 'Algorithms',
      university: 'Example University',
      units: '4',
      credit: 4.0,
      department: 'CS',
      level: 'Undergraduate',
      category: 'Computer Science',
      latestTerm: 'Spring 2026',
      logistics: 'In-person',
      prerequisites: 'CS100',
      instructors: ['Prof. Ada'],
      subdomain: null,
      topics: ['Computer Science', 'Algorithm Design'],
      resources: ['Syllabus', 'Slides'],
      desc: 'Intro to algorithms',
      urlString: 'https://example.edu/cs101',
      isEnrolled: true,
      isFailed: false,
      retry: 0,
      gpa: 3.3,
      score: 4.0,
      assignments: [],
      schedules: []
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

    expect(result.code).toBe('CS102');
    expect(result.resources).toEqual([]);
    expect(result.category).toBeNull();
    expect(result.latestTerm).toBeNull();
    expect(result.gpa).toBeNull();
    expect(result.isFailed).toBe(false);
    expect(result.schedules).toEqual([]);
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

  it('should parse numeric strings for credit', () => {
    const rawCourse = {
      credit: '4',
      course_fields: [],
      user_courses: [],
      study_plans: []
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);
    expect(result.credit).toBe(4);
  });

  it('should transform study_plans into schedules', () => {
    const rawCourse = {
      course_fields: [],
      user_courses: [{ status: 'in_progress', gpa: null, score: null }],
      study_plans: [
        {
          id: 1,
          uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          kind: 'Lecture',
          location: 'Room 201',
          timezone: 'Europe/Berlin',
          start_date: '2026-01-20',
          end_date: '2026-05-10',
          days_of_week: [1, 3, 5],
          start_time: '10:00:00',
          end_time: '11:20:00'
        }
      ]
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0]).toEqual({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      kind: 'Lecture',
      location: 'Room 201',
      timezone: 'Europe/Berlin',
      startDate: '2026-01-20',
      endDate: '2026-05-10',
      daysOfWeek: [1, 3, 5],
      startTime: '10:00',
      endTime: '11:20'
    });
  });

  it('should prefer metadata.task_kind when transforming assignments', () => {
    const rawCourse = {
      course_fields: [],
      user_courses: [{ status: 'in_progress', gpa: null, score: null }],
      study_plans: [],
      course_assignments: [
        {
          id: 1,
          kind: 'assignment',
          label: 'Lecture: Why Parallelism? Why Efficiency?',
          due_on: '2026-03-05',
          metadata: { task_kind: 'lecture' }
        }
      ]
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]).toMatchObject({
      kind: 'lecture',
      persistedKind: 'assignment',
      label: 'Lecture: Why Parallelism? Why Efficiency?'
    });
  });

  it('should fall back to stored kind when metadata.task_kind is missing', () => {
    const rawCourse = {
      course_fields: [],
      user_courses: [{ status: 'in_progress', gpa: null, score: null }],
      study_plans: [],
      course_assignments: [
        {
          id: 2,
          kind: 'project',
          label: 'Project milestone',
          due_on: '2026-03-12'
        }
      ]
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]).toMatchObject({
      kind: 'project',
      persistedKind: 'project'
    });
  });

  it('should normalize metadata deadline/exercise kinds for external clients', () => {
    const rawCourse = {
      course_fields: [],
      user_courses: [{ status: 'in_progress', gpa: null, score: null }],
      study_plans: [],
      course_assignments: [
        {
          id: 3,
          kind: 'assignment',
          label: 'Practice sheet',
          due_on: '2026-03-18',
          metadata: { task_kind: 'exercise' }
        },
        {
          id: 4,
          kind: 'assignment',
          label: 'Final due',
          due_on: '2026-03-20',
          metadata: { task_kind: 'deadline' }
        }
      ]
    };

    const result = transformExternalCourse(rawCourse as Record<string, unknown>);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].kind).toBe('assignment');
    expect(result.assignments[1].kind).toBe('exam');
  });
});
