export type PlanStoreProgram = 'VI' | 'VII' | 'VIII'

export interface StoredAssessmentPlan {
  readonly key: string
  readonly createdAtIso: string
  readonly assessmentName: string
  readonly program: PlanStoreProgram
  readonly studentGroup: string
  readonly course: string
  readonly assessmentGroup: string
  readonly gradingScale: string
  readonly academicYear: string
  readonly academicTerm: string
  readonly schedule: {
    readonly date: string
    readonly fromTime: string
    readonly toTime: string
  }
  readonly maximumAssessmentScore: number | null
  readonly criteria: readonly {
    readonly assessmentCriteria: string
    readonly maxMarks: number | null
  }[]
}

interface AssessmentPlanStoreState {
  readonly plans: readonly StoredAssessmentPlan[]
}

type StoreListener = () => void

const STORAGE_KEY = 'assessment_scheme_builder_plans_v1'

const safeParseJson = (value: string | null): unknown => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const loadState = (): AssessmentPlanStoreState => {
  const raw = safeParseJson(window.localStorage.getItem(STORAGE_KEY))
  if (!raw || typeof raw !== 'object' || !('plans' in raw)) {
    return { plans: [] }
  }
  const plans = (raw as { plans: unknown }).plans
  if (!Array.isArray(plans)) {
    return { plans: [] }
  }
  return { plans: plans as readonly StoredAssessmentPlan[] }
}

const saveState = (state: AssessmentPlanStoreState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const listeners = new Set<StoreListener>()

let state: AssessmentPlanStoreState =
  typeof window === 'undefined' ? { plans: [] } : loadState()

const emitChange = (): void => {
  listeners.forEach((listener) => listener())
}

export const assessmentPlanStore = {
  subscribe: (listener: StoreListener): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getState: (): AssessmentPlanStoreState => state,
  upsertPlan: (plan: Omit<StoredAssessmentPlan, 'key' | 'createdAtIso'>): StoredAssessmentPlan => {
    const key = [
      plan.academicYear,
      plan.program,
      plan.studentGroup,
      plan.course,
      plan.assessmentGroup,
    ].join('::')
    const stored: StoredAssessmentPlan = {
      ...plan,
      key,
      createdAtIso: new Date().toISOString(),
    }
    const nextPlans = [
      ...state.plans.filter((existing) => existing.key !== key),
      stored,
    ]
    state = { plans: nextPlans }
    saveState(state)
    emitChange()
    return stored
  },
  bulkApplyYear: (sourceAcademicYear: string): number => {
    const sourcePlans = state.plans.filter((plan) => plan.academicYear === sourceAcademicYear)
    const programs: readonly PlanStoreProgram[] = ['VI', 'VII', 'VIII']
    const cloned: StoredAssessmentPlan[] = []
    sourcePlans.forEach((plan) => {
      programs.forEach((program) => {
        const studentGroup = program
        const nextPlan: Omit<StoredAssessmentPlan, 'key' | 'createdAtIso'> = {
          ...plan,
          program,
          studentGroup,
        }
        const key = [
          nextPlan.academicYear,
          nextPlan.program,
          nextPlan.studentGroup,
          nextPlan.course,
          nextPlan.assessmentGroup,
        ].join('::')
        const exists = state.plans.some((existing) => existing.key === key)
        if (exists) {
          return
        }
        cloned.push({
          ...nextPlan,
          key,
          createdAtIso: new Date().toISOString(),
        })
      })
    })
    if (cloned.length === 0) {
      return 0
    }
    state = { plans: [...state.plans, ...cloned] }
    saveState(state)
    emitChange()
    return cloned.length
  },
  clearAll: (): void => {
    state = { plans: [] }
    saveState(state)
    emitChange()
  },
}

