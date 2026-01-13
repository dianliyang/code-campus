export interface Course {
  university: string;
  courseCode: string;
  title: string;
  units?: string;
  description?: string;
  department?: string;
  corequisites?: string;
  level?: string;
  difficulty?: number;
  details?: Record<string, unknown>;
  popularity?: number;
  timeCommitment?: string;
  isHidden?: boolean;
  fields?: string[];
}
