import type { CourseDefinition } from '@/data/cbse-assessment-structure'
import type { CourseRow } from '@/lib/assessment-api-methods'

/**
 * Maps API course rows to the shape expected by term-scheme validation.
 */
export const mapApiCoursesForValidation = (
  courses: readonly CourseRow[],
): readonly CourseDefinition[] =>
  courses.map((course) => ({
    id: course.id,
    label: course.course_name,
    subjectType: course.schemeSubjectType,
  }))
