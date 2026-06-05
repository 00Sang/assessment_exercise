import type { AssessmentPlanRecord, CourseRow } from '@/lib/assessment-api-methods'

export interface PlanCriteriaDraft {
  readonly id: string
  readonly assessmentCriteria: string
  readonly maxMarks: string
}

/** Resolves a course option id from a saved plan record. */
export const resolveCourseIdFromPlan = (
  plan: AssessmentPlanRecord,
  courses: readonly CourseRow[],
): string => {
  const courseName = (plan.course ?? '').trim()
  if (courseName.length === 0) {
    return ''
  }
  const match = courses.find(
    (course) =>
      course.course_name === courseName ||
      course.id === courseName ||
      course.name === courseName ||
      course.course_name.toLowerCase() === courseName.toLowerCase(),
  )
  return match?.id ?? ''
}

/** Maps saved plan criteria rows into editable form drafts. */
export const buildCriteriaDraftsFromPlan = (
  plan: AssessmentPlanRecord,
): readonly PlanCriteriaDraft[] => {
  if (plan.criteria.length === 0) {
    return [{ id: 'row-1', assessmentCriteria: '', maxMarks: '' }]
  }
  return plan.criteria.map((row, index) => ({
    id: `row-${index + 1}`,
    assessmentCriteria: row.assessmentCriteria ?? '',
    maxMarks: row.maxMarks !== null && row.maxMarks !== undefined ? String(row.maxMarks) : '',
  }))
}
