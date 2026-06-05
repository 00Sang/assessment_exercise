import type { GradingScaleRow } from '@/lib/assessment-api-methods'

export type SubjectType = 'main' | 'skill' | 'co-scholastic'

const PREFERRED_GRADING_SCALE_BY_SUBJECT_TYPE: Record<SubjectType, string> = {
  main: 'Grading 1',
  skill: 'Grading 2',
  'co-scholastic': 'Grading 3',
}

/**
 * Picks the default grading scale for a subject type from API rows.
 */
export const resolvePreferredGradingScale = (
  scales: readonly GradingScaleRow[],
  subjectType: SubjectType,
): string => {
  if (scales.length === 0) {
    return ''
  }
  const preferredName = PREFERRED_GRADING_SCALE_BY_SUBJECT_TYPE[subjectType]
  const preferredMatch = scales.find(
    (scale) => scale.grading_scale_name === preferredName || scale.name === preferredName,
  )
  if (preferredMatch) {
    return preferredMatch.grading_scale_name || preferredMatch.name
  }
  const submittedMatch = scales.find((scale) => scale.docstatus === 1)
  const fallback = submittedMatch ?? scales[0]
  return fallback.grading_scale_name || fallback.name
}
