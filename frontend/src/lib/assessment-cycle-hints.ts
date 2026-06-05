export interface AssessmentCycleHints {
  readonly isInternal: boolean
  readonly isPt: boolean
  readonly isMainExam: boolean
}

/**
 * Classifies an assessment group label for client-side score and validation hints.
 */
export const classifyAssessmentCycleLabel = (
  label: string | null | undefined,
  cycleId: string | null | undefined = '',
): AssessmentCycleHints => {
  const safeLabel = (label ?? '').trim()
  const safeCycleId = (cycleId ?? '').trim()
  const normalized = safeLabel.toLowerCase()
  const normalizedCycleId = safeCycleId.toLowerCase()
  const isInternal =
    normalized.includes('internal') ||
    normalized.includes('school-based') ||
    normalizedCycleId.startsWith('internal')
  const isPt =
    normalized.startsWith('pt') ||
    /\bpt[\s-]/i.test(safeLabel) ||
    normalizedCycleId.startsWith('pt-')
  const isMainExam =
    normalized.includes('half') ||
    normalized.includes('yearly') ||
    normalizedCycleId === 'half-yearly' ||
    normalizedCycleId === 'yearly'
  return { isInternal, isPt, isMainExam }
}
