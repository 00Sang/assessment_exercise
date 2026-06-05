import type { AssessmentGroupTreeNode } from '@/lib/assessment-api-methods'

export interface ParsedExamType {
  readonly name: string
  readonly label: string
}

export interface ParsedTermDraft {
  readonly id: string
  readonly label: string
  readonly examTypes: readonly ParsedExamType[]
}

const DEFAULT_TERM_DRAFTS: readonly ParsedTermDraft[] = [
  { id: 'term-1', label: 'Term I', examTypes: [] },
  { id: 'term-2', label: 'Term II', examTypes: [] },
]

/**
 * Converts an Assessment Group tree from the API into editable term rows.
 */
export const parseAssessmentGroupTreeToTerms = (
  tree: readonly AssessmentGroupTreeNode[],
): readonly ParsedTermDraft[] => {
  const termNodes: AssessmentGroupTreeNode[] = []
  for (const node of tree) {
    if (!node.children?.length) {
      continue
    }
    for (const child of node.children) {
      if (child.is_group) {
        termNodes.push(child)
      }
    }
  }
  if (termNodes.length === 0) {
    return []
  }
  return termNodes.map((termNode) => ({
    id: termNode.name,
    label: termNode.assessment_group_name,
    examTypes: (termNode.children ?? [])
      .filter((child) => !child.is_group)
      .map((child) => ({
        name: child.name,
        label: child.assessment_group_name,
      })),
  }))
}

/**
 * Default term rows when the selected academic year has no saved groups yet.
 */
export const getDefaultTermDrafts = (): readonly ParsedTermDraft[] => DEFAULT_TERM_DRAFTS

/**
 * Merges API term rows into the static demo terms so Term I and Term II always appear.
 */
export const mergeTermsWithDefaults = (
  parsedTerms: readonly ParsedTermDraft[],
): readonly ParsedTermDraft[] =>
  DEFAULT_TERM_DRAFTS.map((defaultTerm) => {
    const termFromApi = parsedTerms.find((term) => term.label === defaultTerm.label)
    if (!termFromApi) {
      return defaultTerm
    }
    return {
      id: defaultTerm.id,
      label: defaultTerm.label,
      examTypes: termFromApi.examTypes,
    }
  })

/**
 * Returns leaf exam types for a term from the Assessment Group tree API response.
 */
export const getExamTypesForAcademicTerm = (
  tree: readonly AssessmentGroupTreeNode[],
  termLabel: string,
): readonly ParsedExamType[] => {
  const parsedTerms = parseAssessmentGroupTreeToTerms(tree)
  const matchedTerm = parsedTerms.find((term) => term.label === termLabel)
  return matchedTerm?.examTypes ?? []
}
