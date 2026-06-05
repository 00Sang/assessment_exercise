import { AssessmentPlanDetailDialog } from '@/components/assessment-plan-detail-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import {
  ASSESSMENT_API,
  type AssessmentCriteriaRow,
  type AssessmentGroupTreeNode,
  type AssessmentPlanRecord,
  type GradingScaleRow,
  type PlanFormOptions,
} from '@/lib/assessment-api-methods'
import { classifyAssessmentCycleLabel } from '@/lib/assessment-cycle-hints'
import {
  getInternalCriteriaHint,
  getPtCapHint,
  validateAssessmentPlanForm,
  type PlanSubjectCategory,
} from '@/lib/validate-assessment-plan-form'
import { resolvePreferredGradingScale } from '@/lib/grading-scale-hints'
import {
  getFrappeCallErrorMessage,
  isFrappeCallSuccessful,
  unwrapFrappeData,
  unwrapFrappeError,
} from '@/lib/frappe-api'
import { getExamTypesForAcademicTerm } from '@/lib/parse-assessment-group-tree'
import {
  buildCriteriaDraftsFromPlan,
  resolveCourseIdFromPlan,
} from '@/lib/populate-plan-form-from-record'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { TriangleAlertIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface CriteriaDraft {
  readonly id: string
  readonly assessmentCriteria: string
  readonly maxMarks: string
}

interface CriteriaTemplateInput {
  readonly courseCategory: SubjectType
  readonly cycleLabel: string
}

type SubjectType = 'main' | 'skill' | 'co-scholastic'

const EMPTY_PLAN_FORM_OPTIONS: PlanFormOptions = {
  programs: [],
  courses: [],
  academicYears: [],
  academicTerms: [],
}

const getMaximumAssessmentScore = ({
  courseCategory,
  cycleLabel,
}: CriteriaTemplateInput): number => {
  const { isInternal } = classifyAssessmentCycleLabel(cycleLabel)
  if (courseCategory === 'main') {
    return isInternal ? 20 : 80
  }
  if (courseCategory === 'skill') {
    return 50
  }
  return 5
}

const getDefaultAssessmentCriteriaRows = ({
  courseCategory,
  cycleLabel,
}: CriteriaTemplateInput): readonly CriteriaDraft[] => {
  void courseCategory
  void cycleLabel
  return [
    {
      id: 'row-1',
      assessmentCriteria: '',
      maxMarks: '',
    },
  ]
}

const ALL_PLANS_LIST_FILTER = 'all'

const normalizePlanText = (value: string | null | undefined): string =>
  typeof value === 'string' ? value : ''

const getPlanClassLabel = (plan: AssessmentPlanRecord): string => {
  const program = normalizePlanText(plan.program)
  const studentGroup = normalizePlanText(plan.studentGroup)
  return program.length > 0 ? program : studentGroup
}

const getPlanExamTypeFilterValue = (plan: AssessmentPlanRecord): string =>
  normalizePlanText(plan.assessmentGroupDoc) || normalizePlanText(plan.assessmentGroup)

const formatAssessmentGroupSlug = (slug: string): string => {
  if (slug.length === 0) {
    return slug
  }
  const knownLabels: Record<string, string> = {
    internal: 'Internal Assessment',
    'internal-1': 'Internal Assessment (Term I)',
    'internal-2': 'Internal Assessment (Term II)',
    'pt-1': 'PT-I',
    'pt-2': 'PT-II',
    'half-yearly': 'Half Yearly',
    yearly: 'Yearly',
  }
  if (slug in knownLabels) {
    return knownLabels[slug]
  }
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getPlanExamTypeFilterLabel = (plan: AssessmentPlanRecord): string => {
  const documentName = normalizePlanText(plan.assessmentGroupDoc)
  const slug = normalizePlanText(plan.assessmentGroup)
  if (documentName.length > 0 && documentName !== slug) {
    return documentName
  }
  return formatAssessmentGroupSlug(slug)
}

interface PlanListExamTypeOption {
  readonly value: string
  readonly label: string
}

const buildPlanListYearOptions = (
  savedPlans: readonly AssessmentPlanRecord[],
  masterYears: readonly { readonly academic_year_name: string }[],
): readonly string[] => {
  const yearSet = new Set<string>()
  for (const yearOption of masterYears) {
    if (yearOption.academic_year_name.length > 0) {
      yearSet.add(yearOption.academic_year_name)
    }
  }
  for (const plan of savedPlans) {
    const academicYear = normalizePlanText(plan.academicYear)
    if (academicYear.length > 0) {
      yearSet.add(academicYear)
    }
  }
  return [...yearSet].sort((left, right) => right.localeCompare(left))
}

const buildPlanListClassOptions = (
  savedPlans: readonly AssessmentPlanRecord[],
  masterPrograms: readonly { readonly program_name: string }[],
): readonly string[] => {
  const classSet = new Set<string>()
  for (const program of masterPrograms) {
    if (program.program_name.length > 0) {
      classSet.add(program.program_name)
    }
  }
  for (const plan of savedPlans) {
    const classLabel = getPlanClassLabel(plan)
    if (classLabel.length > 0) {
      classSet.add(classLabel)
    }
  }
  return [...classSet].sort((left, right) => left.localeCompare(right))
}

const buildPlanListExamTypeOptions = (
  savedPlans: readonly AssessmentPlanRecord[],
): readonly PlanListExamTypeOption[] => {
  const optionMap = new Map<string, string>()
  for (const plan of savedPlans) {
    const value = getPlanExamTypeFilterValue(plan)
    if (value.length === 0) {
      continue
    }
    optionMap.set(value, getPlanExamTypeFilterLabel(plan))
  }
  return [...optionMap.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

const planMatchesListFilters = (
  plan: AssessmentPlanRecord,
  yearFilter: string,
  classFilter: string,
  examTypeFilter: string,
): boolean => {
  const matchesYear =
    yearFilter === ALL_PLANS_LIST_FILTER ||
    normalizePlanText(plan.academicYear) === yearFilter
  const matchesClass =
    classFilter === ALL_PLANS_LIST_FILTER || getPlanClassLabel(plan) === classFilter
  const matchesExamType =
    examTypeFilter === ALL_PLANS_LIST_FILTER ||
    getPlanExamTypeFilterValue(plan) === examTypeFilter
  return matchesYear && matchesClass && matchesExamType
}

const describeActivePlanListFilters = (
  yearFilter: string,
  classFilter: string,
  examTypeFilter: string,
  examTypeOptions: readonly PlanListExamTypeOption[],
): string => {
  const parts: string[] = []
  if (yearFilter !== ALL_PLANS_LIST_FILTER) {
    parts.push(yearFilter)
  }
  if (classFilter !== ALL_PLANS_LIST_FILTER) {
    parts.push(classFilter)
  }
  if (examTypeFilter !== ALL_PLANS_LIST_FILTER) {
    const examTypeLabel =
      examTypeOptions.find((option) => option.value === examTypeFilter)?.label ?? examTypeFilter
    parts.push(examTypeLabel)
  }
  if (parts.length === 0) {
    return 'the selected filters'
  }
  return parts.join(' · ')
}

const formatPlanCriteria = (plan: AssessmentPlanRecord): string => {
  if (plan.criteria.length > 0) {
    return plan.criteria
      .map((row) => `${row.assessmentCriteria} (${row.maxMarks ?? '—'})`)
      .join(' + ')
  }
  return plan.criteriaSummary.length > 0 ? plan.criteriaSummary : 'No criteria'
}

const getCriteriaOptionsForRow = (
  rowId: string,
  criteriaRows: readonly CriteriaDraft[],
  allOptions: readonly string[],
): readonly string[] => {
  const currentRowValue = criteriaRows.find((row) => row.id === rowId)?.assessmentCriteria ?? ''
  const usedByOtherRows = new Set(
    criteriaRows
      .filter((row) => row.id !== rowId && row.assessmentCriteria.trim().length > 0)
      .map((row) => row.assessmentCriteria),
  )
  return allOptions.filter(
    (option) => option === currentRowValue || !usedByOtherRows.has(option),
  )
}

const buildCriteriaRowsForAllOptions = (
  options: readonly string[],
): readonly CriteriaDraft[] =>
  options.map((assessmentCriteria, index) => ({
    id: `row-${index + 1}`,
    assessmentCriteria,
    maxMarks: '',
  }))

const parseTimeToMinutes = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  const parts = trimmed.split(':')
  if (parts.length !== 2) {
    return null
  }
  const hours = Number.parseInt(parts[0], 10)
  const minutes = Number.parseInt(parts[1], 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }
  return hours * 60 + minutes
}

const formatMinutesToTime = (minutesTotal: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutesTotal))
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const buildBulkSchedule = ({
  baseFromTime,
  baseToTime,
  index,
}: {
  readonly baseFromTime: string
  readonly baseToTime: string
  readonly index: number
}): { readonly fromTime: string; readonly toTime: string } | null => {
  const fromMinutes = parseTimeToMinutes(baseFromTime)
  const toMinutes = parseTimeToMinutes(baseToTime)
  if (fromMinutes === null || toMinutes === null) {
    return null
  }
  const durationMinutes = toMinutes - fromMinutes
  if (durationMinutes <= 0) {
    return null
  }
  const nextFrom = fromMinutes + durationMinutes * index
  const nextTo = toMinutes + durationMinutes * index
  if (nextTo > 23 * 60 + 59) {
    return null
  }
  return {
    fromTime: formatMinutesToTime(nextFrom),
    toTime: formatMinutesToTime(nextTo),
  }
}

type PlanFormMode = 'create' | 'edit'

/** List, create, and edit assessment plans backed by the Frappe API. */
export function PlanFormPage() {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState<boolean>(false)
  const [formMode, setFormMode] = useState<PlanFormMode>('create')
  const [plansListYearFilter, setPlansListYearFilter] = useState<string>(ALL_PLANS_LIST_FILTER)
  const [plansListClassFilter, setPlansListClassFilter] = useState<string>(ALL_PLANS_LIST_FILTER)
  const [plansListExamTypeFilter, setPlansListExamTypeFilter] =
    useState<string>(ALL_PLANS_LIST_FILTER)
  const [bulkSaveResults, setBulkSaveResults] = useState<readonly { course: string; ok: boolean; error?: string }[]>([])
  const { data: assessmentCriteriaResponse, isLoading: isLoadingAssessmentCriteria } =
    useFrappeGetCall(ASSESSMENT_API.getAssessmentCriteria)
  const {
    data: gradingScalesResponse,
    isLoading: isLoadingGradingScales,
  } = useFrappeGetCall(
    ASSESSMENT_API.getGradingScales,
    undefined,
    'assessment-grading-scales',
    { isPaused: () => !isCreateFormOpen },
  )
  const [academicYear, setAcademicYear] = useState<string>('')
  const [academicTerm, setAcademicTerm] = useState<string>('')
  const {
    data: planFormOptionsResponse,
    isLoading: isLoadingPlanFormOptions,
  } = useFrappeGetCall(ASSESSMENT_API.getPlanFormOptions, undefined, 'plan-form-options')
  const {
    data: plansResponse,
    isLoading: isLoadingPlans,
    mutate: mutatePlans,
    error: plansFetchError,
  } = useFrappeGetCall(ASSESSMENT_API.listAssessmentPlans, undefined, 'assessment-plans-all')
  const savedPlans = unwrapFrappeData<readonly AssessmentPlanRecord[]>(plansResponse) ?? []
  const plansApiError = unwrapFrappeError(plansResponse)
  const {
    data: groupsResponse,
    isLoading: isLoadingAssessmentGroups,
  } = useFrappeGetCall(
    ASSESSMENT_API.getAssessmentGroups,
    { academic_year: academicYear },
    `plan-assessment-groups-${academicYear}`,
    { isPaused: () => !isCreateFormOpen },
  )
  const { call: savePlan } = useFrappePostCall(ASSESSMENT_API.saveAssessmentPlan)
  const { call: fetchPlanDetail } = useFrappePostCall(ASSESSMENT_API.getAssessmentPlanDetail)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedProgramName, setSelectedProgramName] = useState<string>('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedCourseIds, setSelectedCourseIds] = useState<readonly string[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const [assessmentName, setAssessmentName] = useState<string>('English Assessment')
  const [scheduleDate, setScheduleDate] = useState<string>('')
  const [fromTime, setFromTime] = useState<string>('')
  const [toTime, setToTime] = useState<string>('')
  const [maximumAssessmentScore, setMaximumAssessmentScore] = useState<string>('')
  const [criteria, setCriteria] = useState<readonly CriteriaDraft[]>(
    getDefaultAssessmentCriteriaRows({ courseCategory: 'main', cycleLabel: '' }),
  )
  const [nextCriteriaRowId, setNextCriteriaRowId] = useState<number>(2)
  const [selectedGradingScale, setSelectedGradingScale] = useState<string>('')
  const [selectedPlan, setSelectedPlan] = useState<AssessmentPlanRecord | null>(null)

  const planFormOptions =
    unwrapFrappeData<PlanFormOptions>(planFormOptionsResponse) ?? EMPTY_PLAN_FORM_OPTIONS
  const planFormOptionsError = unwrapFrappeError(planFormOptionsResponse)
  const programOptions = planFormOptions.programs
  const courseOptions = planFormOptions.courses
  const academicYearOptions = planFormOptions.academicYears
  const planListYearOptions = useMemo(
    () => buildPlanListYearOptions(savedPlans, academicYearOptions),
    [academicYearOptions, savedPlans],
  )
  const planListClassOptions = useMemo(
    () => buildPlanListClassOptions(savedPlans, programOptions),
    [programOptions, savedPlans],
  )
  const planListExamTypeOptions = useMemo(
    () => buildPlanListExamTypeOptions(savedPlans),
    [savedPlans],
  )
  const filteredPlans = useMemo(
    () =>
      savedPlans.filter((plan) =>
        planMatchesListFilters(
          plan,
          plansListYearFilter,
          plansListClassFilter,
          plansListExamTypeFilter,
        ),
      ),
    [plansListClassFilter, plansListExamTypeFilter, plansListYearFilter, savedPlans],
  )
  const academicTermOptions = useMemo(
    () =>
      planFormOptions.academicTerms.filter(
        (term) => term.academic_year === academicYear || academicYear.length === 0,
      ),
    [academicYear, planFormOptions.academicTerms],
  )
  const selectedCourse = courseOptions.find((course) => course.id === selectedCourseId)
  const selectedCourseCategory: SubjectType = selectedCourse?.subjectType ?? 'main'
  const selectedSubjectCategories = useMemo((): readonly PlanSubjectCategory[] => {
    const categories = selectedCourseIds
      .map((courseId) => courseOptions.find((course) => course.id === courseId)?.subjectType)
      .filter((category): category is PlanSubjectCategory => category !== undefined)
    if (categories.length > 0) {
      return categories
    }
    return selectedCourseCategory ? [selectedCourseCategory] : []
  }, [courseOptions, selectedCourseCategory, selectedCourseIds])
  const criteriaRows =
    unwrapFrappeData<readonly AssessmentCriteriaRow[]>(assessmentCriteriaResponse) ?? []
  const assessmentCriteriaOptions: readonly string[] = criteriaRows
    .map((entry) => entry.assessment_criteria)
    .filter((value) => value.length > 0)
  const groupTree =
    unwrapFrappeData<readonly AssessmentGroupTreeNode[]>(groupsResponse) ?? []
  const cycleOptions = useMemo(
    () => getExamTypesForAcademicTerm(groupTree, academicTerm),
    [academicTerm, groupTree],
  )
  const selectedCycleOption =
    cycleOptions.find((option) => option.name === selectedCycleId) ?? null
  const selectedCycleLabel = selectedCycleOption?.label ?? ''
  const cycleHints = classifyAssessmentCycleLabel(selectedCycleLabel, selectedCycleId)
  const schemeValidationMessages = useMemo(
    () =>
      validateAssessmentPlanForm({
        subjectCategories: selectedSubjectCategories,
        cycleLabel: selectedCycleLabel,
        cycleId: selectedCycleId,
        maximumAssessmentScore,
        criteria,
      }),
    [
      criteria,
      maximumAssessmentScore,
      selectedCycleId,
      selectedCycleLabel,
      selectedSubjectCategories,
    ],
  )
  const internalCriteriaHint = useMemo(
    () =>
      getInternalCriteriaHint(
        selectedSubjectCategories,
        selectedCycleLabel,
        selectedCycleId,
      ),
    [selectedCycleId, selectedCycleLabel, selectedSubjectCategories],
  )
  const ptCapHint = useMemo(
    () => getPtCapHint(selectedSubjectCategories, selectedCycleLabel, selectedCycleId),
    [selectedCycleId, selectedCycleLabel, selectedSubjectCategories],
  )
  const gradingScaleRows =
    unwrapFrappeData<readonly GradingScaleRow[]>(gradingScalesResponse) ?? []
  const gradingScalesApiError = unwrapFrappeError(gradingScalesResponse)

  useEffect(() => {
    if (!isCreateFormOpen || isLoadingPlanFormOptions) {
      return
    }
    if (programOptions.length > 0 && selectedProgramName.length === 0) {
      setSelectedProgramName(programOptions[0].program_name)
    }
    if (courseOptions.length > 0 && selectedCourseId.length === 0) {
      const firstCourse = courseOptions[0]
      setSelectedCourseId(firstCourse.id)
      setSelectedCourseIds([firstCourse.id])
      setAssessmentName(`${firstCourse.course_name} Assessment`)
    }
    if (academicYearOptions.length > 0 && academicYear.length === 0) {
      setAcademicYear(academicYearOptions[0].academic_year_name)
    }
  }, [
    academicYear,
    academicYearOptions,
    courseOptions,
    isCreateFormOpen,
    isLoadingPlanFormOptions,
    programOptions,
    selectedCourseId,
    selectedProgramName,
  ])

  useEffect(() => {
    if (academicTermOptions.length === 0) {
      return
    }
    const termStillValid = academicTermOptions.some((term) => term.term_name === academicTerm)
    if (!termStillValid) {
      setAcademicTerm(academicTermOptions[0].term_name)
    }
  }, [academicTerm, academicTermOptions])

  useEffect(() => {
    if (gradingScaleRows.length === 0) {
      return
    }
    setSelectedGradingScale(
      resolvePreferredGradingScale(gradingScaleRows, selectedCourseCategory),
    )
  }, [gradingScaleRows, selectedCourseCategory])

  const applyCycleSelection = (
    cycleName: string,
    cycleLabel: string,
    courseCategory: SubjectType = selectedCourseCategory,
  ): void => {
    setSelectedCycleId(cycleName)
    setCriteria(
      getDefaultAssessmentCriteriaRows({
        courseCategory,
        cycleLabel,
      }),
    )
    setMaximumAssessmentScore(
      String(
        getMaximumAssessmentScore({
          courseCategory,
          cycleLabel,
        }),
      ),
    )
    setNextCriteriaRowId((previousId) => previousId + 1)
  }

  useEffect(() => {
    if (isLoadingAssessmentGroups) {
      return
    }
    if (cycleOptions.length === 0) {
      setSelectedCycleId('')
      return
    }
    const matchingCycle = cycleOptions.find((option) => option.name === selectedCycleId)
    if (matchingCycle) {
      return
    }
    const firstCycle = cycleOptions[0]
    applyCycleSelection(firstCycle.name, firstCycle.label)
  }, [
    academicTerm,
    academicYear,
    cycleOptions,
    isLoadingAssessmentGroups,
    selectedCourseCategory,
    selectedCycleId,
  ])

  const internalTotal = criteria.reduce((sum, row) => {
    const parsedMaxMarks = Number.parseInt(row.maxMarks, 10)
    return sum + (Number.isNaN(parsedMaxMarks) ? 0 : parsedMaxMarks)
  }, 0)
  const enteredCriteriaRowsCount = criteria.filter(
    (row) => row.assessmentCriteria.trim().length > 0,
  ).length
  const selectedCriteriaNames = useMemo(
    () =>
      criteria
        .map((row) => row.assessmentCriteria.trim())
        .filter((value) => value.length > 0),
    [criteria],
  )
  const allCriteriaRowsUsed =
    assessmentCriteriaOptions.length > 0 &&
    selectedCriteriaNames.length >= assessmentCriteriaOptions.length
  const hasFilledMaximumAssessmentScore = maximumAssessmentScore.trim().length > 0
  const hasAssessmentName = assessmentName.trim().length > 0
  const hasConfiguredCriteriaSource = assessmentCriteriaOptions.length > 0
  const hasInvalidCriteriaRow = criteria.some(
    (row) => row.assessmentCriteria.trim().length === 0 || row.maxMarks.trim().length === 0,
  )
  const hasSelectedAssessmentGroup = selectedCycleId.length > 0
  const hasValidSchedule = scheduleDate.length > 0 && fromTime.length > 0 && toTime.length > 0
  const scheduleFromMinutes = parseTimeToMinutes(fromTime)
  const scheduleToMinutes = parseTimeToMinutes(toTime)
  const isScheduleOrderValid =
    !hasValidSchedule ||
    (scheduleFromMinutes !== null &&
      scheduleToMinutes !== null &&
      scheduleToMinutes > scheduleFromMinutes)
  const validationMessages: readonly string[] = [
    programOptions.length === 0 ? 'No programs found. Run master data seed first.' : '',
    courseOptions.length === 0 ? 'No courses found. Run master data seed first.' : '',
    academicYearOptions.length === 0 ? 'No academic years found. Run master data seed first.' : '',
    academicTermOptions.length === 0 ? 'No academic terms found for the selected year. Run seed first.' : '',
    selectedProgramName.length === 0 ? 'Class is required.' : '',
    selectedCourseIds.length === 0 ? 'At least one course is required.' : '',
    academicYear.length === 0 ? 'Academic Year is required.' : '',
    academicTerm.length === 0 ? 'Academic Term is required.' : '',
    !hasSelectedAssessmentGroup
      ? `No assessment groups found for ${academicYear} / ${academicTerm}. Add exam types in the Assessment Group tab first.`
      : '',
    !hasAssessmentName ? 'Assessment Name is required.' : '',
    !hasFilledMaximumAssessmentScore ? 'Maximum Assessment Score is required.' : '',
    !hasValidSchedule ? 'Schedule Date, From Time, and To Time are required.' : '',
    !isScheduleOrderValid ? 'From Time must be earlier than To Time.' : '',
    !hasConfiguredCriteriaSource
      ? 'No configured Assessment Criteria found. Configure criteria first.'
      : '',
    hasInvalidCriteriaRow
      ? 'Each criteria row must have Assessment Criteria and Maximum Score.'
      : '',
    ...schemeValidationMessages,
  ].filter((message) => message.length > 0)
  const canSavePlan = validationMessages.length === 0 && !isSaving

  const handleMarksChange = (id: string, value: string): void => {
    setCriteria((prev) =>
      prev.map((row) => (row.id === id ? { ...row, maxMarks: value } : row)),
    )
  }

  const handleAssessmentCriteriaChange = (id: string, value: string): void => {
    setCriteria((prev) =>
      prev.map((row) => (row.id === id ? { ...row, assessmentCriteria: value } : row)),
    )
  }

  const handleAddCriteriaRow = (): void => {
    const nextId = `row-${nextCriteriaRowId}`
    setCriteria((prev) => [...prev, { id: nextId, assessmentCriteria: '', maxMarks: '' }])
    setNextCriteriaRowId((prev) => prev + 1)
  }

  const handleRemoveCriteriaRow = (id: string): void => {
    setCriteria((prev) => prev.filter((row) => row.id !== id))
  }

  const handleSelectAllCriteria = (): void => {
    if (assessmentCriteriaOptions.length === 0) {
      return
    }
    setCriteria(buildCriteriaRowsForAllOptions(assessmentCriteriaOptions))
    setNextCriteriaRowId(assessmentCriteriaOptions.length + 1)
  }

  const handleClearAllCriteria = (): void => {
    setCriteria([{ id: 'row-1', assessmentCriteria: '', maxMarks: '' }])
    setNextCriteriaRowId(2)
  }

  const applyPlanToForm = (detail: AssessmentPlanRecord): void => {
    const programLabel = detail.program ?? detail.studentGroup ?? ''
    const matchedCourseId = resolveCourseIdFromPlan(detail, courseOptions)
    const criteriaDrafts = buildCriteriaDraftsFromPlan(detail)
    setSelectedProgramName(programLabel)
    setSelectedCourseId(matchedCourseId)
    setSelectedCourseIds(matchedCourseId.length > 0 ? [matchedCourseId] : [])
    setAcademicYear(detail.academicYear ?? '')
    setAcademicTerm(detail.academicTerm ?? '')
    setSelectedCycleId(detail.assessmentGroup ?? '')
    setAssessmentName(detail.assessmentName ?? '')
    setScheduleDate(detail.schedule?.date ?? '')
    setFromTime(detail.schedule?.fromTime ?? '')
    setToTime(detail.schedule?.toTime ?? '')
    setMaximumAssessmentScore(
      detail.maximumAssessmentScore !== null && detail.maximumAssessmentScore !== undefined
        ? String(detail.maximumAssessmentScore)
        : '',
    )
    setSelectedGradingScale(detail.gradingScale ?? '')
    setCriteria(criteriaDrafts)
    setNextCriteriaRowId(criteriaDrafts.length + 1)
    setBulkSaveResults([])
  }

  const handleEditPlan = async (plan: AssessmentPlanRecord): Promise<void> => {
    setSelectedPlan(null)
    setFormMode('edit')
    setIsCreateFormOpen(true)
    if (plan.name) {
      try {
        const response = await fetchPlanDetail({ name: plan.name })
        const detail = unwrapFrappeData<AssessmentPlanRecord>(response)
        if (detail) {
          applyPlanToForm(detail)
          return
        }
      } catch {
        // Fall back to the list record when detail fetch fails.
      }
    }
    applyPlanToForm(plan)
  }

  const handleOpenCreateForm = (): void => {
    setFormMode('create')
    setIsCreateFormOpen(true)
  }

  const handleSelectPlan = (plan: AssessmentPlanRecord): void => {
    setSelectedPlan(plan)
  }

  const handlePlanDetailOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setSelectedPlan(null)
    }
  }

  const handleCloseCreateForm = (): void => {
    setIsCreateFormOpen(false)
    setFormMode('create')
  }

  const isEditMode = formMode === 'edit'

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    setBulkSaveResults([])
    if (isEditMode) {
      const course = courseOptions.find((entry) => entry.id === selectedCourseId)
      const courseLabel = course?.course_name ?? selectedCourseId
      try {
        const payload = {
          ...payloadPreview,
          course: course?.course_name ?? selectedCourseId,
          courseCategory: course?.subjectType ?? selectedCourseCategory,
        }
        const response = await savePlan({ payload: JSON.stringify(payload) })
        if (!isFrappeCallSuccessful(response)) {
          toast.error(getFrappeCallErrorMessage(response, 'Failed to update plan'))
          return
        }
        toast.success(`Updated plan for ${courseLabel}`)
        await mutatePlans()
        setIsCreateFormOpen(false)
        setFormMode('create')
      } catch (error) {
        toast.error(getFrappeCallErrorMessage(error, 'Failed to update plan'))
      } finally {
        setIsSaving(false)
      }
      return
    }
    const coursesToSave = selectedCourseIds.length > 0 ? selectedCourseIds : [selectedCourseId]
    const results: { course: string; ok: boolean; error?: string }[] = []
    try {
      await Promise.all(
        coursesToSave.map(async (courseId, index) => {
          const course = courseOptions.find((c) => c.id === courseId)
          const courseLabel = course?.course_name ?? courseId
          const courseCategory = course?.subjectType ?? selectedCourseCategory
          const maxScore = getMaximumAssessmentScore({ courseCategory, cycleLabel: selectedCycleLabel })
          const scheduleOverride =
            coursesToSave.length > 1
              ? buildBulkSchedule({
                  baseFromTime: fromTime,
                  baseToTime: toTime,
                  index,
                })
              : { fromTime, toTime }
          if (!scheduleOverride) {
            results.push({
              course: courseLabel,
              ok: false,
              error:
                'Invalid schedule for bulk save. Ensure From Time < To Time and there is enough time in the day for all selected courses.',
            })
            return
          }
          const payload = {
            ...payloadPreview,
            course: course?.course_name ?? courseId,
            courseCategory,
            assessmentName: `${courseLabel} Assessment`,
            maximumAssessmentScore: maxScore,
            gradingScale: resolvePreferredGradingScale(gradingScaleRows, courseCategory),
            schedule: {
              ...payloadPreview.schedule,
              fromTime: scheduleOverride.fromTime,
              toTime: scheduleOverride.toTime,
            },
          }
          try {
            const response = await savePlan({ payload: JSON.stringify(payload) })
            if (!isFrappeCallSuccessful(response)) {
              const message = getFrappeCallErrorMessage(response, 'Failed')
              results.push({ course: courseLabel, ok: false, error: message })
            } else {
              results.push({ course: courseLabel, ok: true })
            }
          } catch (error) {
            results.push({ course: courseLabel, ok: false, error: getFrappeCallErrorMessage(error, 'Failed') })
          }
        }),
      )
      setBulkSaveResults(results)
      const successCount = results.filter((r) => r.ok).length
      const failCount = results.length - successCount
      if (failCount === 0) {
        toast.success(`${successCount} plan${successCount === 1 ? '' : 's'} saved and submitted`)
        await mutatePlans()
        setIsCreateFormOpen(false)
      } else {
        toast.error(`${failCount} plan${failCount === 1 ? '' : 's'} failed — see details above`)
        await mutatePlans()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleClassChange = (programName: string): void => {
    setSelectedProgramName(programName)
  }

  const handleCourseChange = (courseId: string): void => {
    setSelectedCourseId(courseId)
    setSelectedCourseIds([courseId])
    const changedCourse = courseOptions.find((course) => course.id === courseId)
    if (!changedCourse) {
      return
    }
    const firstCycle = cycleOptions[0]
    if (firstCycle) {
      applyCycleSelection(firstCycle.name, firstCycle.label, changedCourse.subjectType)
    }
    setNextCriteriaRowId(10)
    setAssessmentName(`${changedCourse.course_name} Assessment`)
  }

  const handleCourseToggle = (courseId: string): void => {
    setSelectedCourseIds((prev) => {
      const next = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
      if (next.length === 1) {
        handleCourseChange(next[0])
      } else if (next.length === 0) {
        setSelectedCourseId('')
      } else {
        setSelectedCourseId(next[next.length - 1])
      }
      return next
    })
  }

  const handleSelectAllCourses = (): void => {
    const allIds = courseOptions.map((c) => c.id)
    setSelectedCourseIds(allIds)
    const last = courseOptions[courseOptions.length - 1]
    if (last) {
      setSelectedCourseId(last.id)
    }
  }

  const handleClearAllCourses = (): void => {
    setSelectedCourseIds([])
    setSelectedCourseId('')
  }

  const handleAcademicYearChange = (yearName: string): void => {
    setAcademicYear(yearName)
    const termsForYear = planFormOptions.academicTerms.filter(
      (term) => term.academic_year === yearName,
    )
    if (termsForYear.length > 0) {
      setAcademicTerm(termsForYear[0].term_name)
    }
  }

  const handleCycleChange = (cycleName: string): void => {
    const changedCycle = cycleOptions.find((option) => option.name === cycleName)
    if (!changedCycle) {
      return
    }
    applyCycleSelection(changedCycle.name, changedCycle.label)
  }

  const handleReset = (): void => {
    const firstProgram = programOptions[0]?.program_name ?? ''
    const firstCourse = courseOptions[0]
    setSelectedProgramName(firstProgram)
    setSelectedCourseId(firstCourse?.id ?? '')
    setSelectedCourseIds(firstCourse ? [firstCourse.id] : [])
    setBulkSaveResults([])
    setAssessmentName(
      firstCourse ? `${firstCourse.course_name} Assessment` : 'Assessment',
    )
    setAcademicYear(academicYearOptions[0]?.academic_year_name ?? '')
    const firstTerm = planFormOptions.academicTerms.find(
      (term) => term.academic_year === (academicYearOptions[0]?.academic_year_name ?? ''),
    )
    setAcademicTerm(firstTerm?.term_name ?? academicTermOptions[0]?.term_name ?? '')
    setScheduleDate('')
    setFromTime('')
    setToTime('')
    setMaximumAssessmentScore('')
    setCriteria(getDefaultAssessmentCriteriaRows({ courseCategory: 'main', cycleLabel: '' }))
    setSelectedCycleId('')
    setNextCriteriaRowId(10)
  }

  const payloadPreview = {
    assessmentName,
    program: selectedProgramName,
    studentGroup: selectedProgramName,
    course: selectedCourse?.course_name ?? selectedCourseId,
    assessmentGroup: selectedCycleId,
    gradingScale: selectedGradingScale,
    academicYear,
    academicTerm,
    schedule: {
      date: scheduleDate,
      fromTime,
      toTime,
    },
    maximumAssessmentScore:
      maximumAssessmentScore.trim().length > 0
        ? Number.parseInt(maximumAssessmentScore, 10)
        : null,
    criteria: criteria.map((row) => ({
      assessmentCriteria: row.assessmentCriteria,
      maxMarks:
        row.maxMarks.trim().length > 0 ? Number.parseInt(row.maxMarks, 10) : null,
    })),
  }

  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Assessment plan</CardTitle>
          <CardDescription>
            {isCreateFormOpen
              ? isEditMode
                ? 'Update marks, schedule, and criteria for this saved plan.'
                : 'Create a new assessment plan with class, course, assessment group, schedule, and criteria.'
              : 'All assessment plans saved in the backend. Click a plan to view details or edit.'}
          </CardDescription>
        </div>
        {isCreateFormOpen ? (
          <Button type="button" variant="outline" onClick={handleCloseCreateForm}>
            Back to plans
          </Button>
        ) : (
          <Button type="button" onClick={handleOpenCreateForm}>
            Create Assessment Plan
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isCreateFormOpen ? (
          <>
            {(plansFetchError || plansApiError) && (
              <Alert variant="destructive">
                <AlertTitle>Failed to load plans</AlertTitle>
                <AlertDescription>
                  {plansApiError ??
                    (plansFetchError instanceof Error ? plansFetchError.message : 'Unknown error')}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Field className="w-full max-w-xs">
                  <FieldLabel htmlFor="plans-list-academic-year">Academic year</FieldLabel>
                  <Select
                    value={plansListYearFilter}
                    onValueChange={setPlansListYearFilter}
                    disabled={isLoadingPlans || isLoadingPlanFormOptions}
                  >
                    <SelectTrigger id="plans-list-academic-year">
                      <SelectValue placeholder="Filter by academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={ALL_PLANS_LIST_FILTER}>
                          All academic years
                        </SelectItem>
                        {planListYearOptions.map((yearName) => (
                          <SelectItem key={yearName} value={yearName}>
                            {yearName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="w-full max-w-xs">
                  <FieldLabel htmlFor="plans-list-class">Class</FieldLabel>
                  <Select
                    value={plansListClassFilter}
                    onValueChange={setPlansListClassFilter}
                    disabled={isLoadingPlans || isLoadingPlanFormOptions}
                  >
                    <SelectTrigger id="plans-list-class">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={ALL_PLANS_LIST_FILTER}>All classes</SelectItem>
                        {planListClassOptions.map((className) => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="w-full max-w-xs">
                  <FieldLabel htmlFor="plans-list-exam-type">Exam type</FieldLabel>
                  <Select
                    value={plansListExamTypeFilter}
                    onValueChange={setPlansListExamTypeFilter}
                    disabled={isLoadingPlans || planListExamTypeOptions.length === 0}
                  >
                    <SelectTrigger id="plans-list-exam-type">
                      <SelectValue placeholder="Filter by exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={ALL_PLANS_LIST_FILTER}>All exam types</SelectItem>
                        {planListExamTypeOptions.map((examTypeOption) => (
                          <SelectItem key={examTypeOption.value} value={examTypeOption.value}>
                            {examTypeOption.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {!isLoadingPlans && savedPlans.length > 0 ? (
                <p className="shrink-0 text-sm text-muted-foreground">
                  {filteredPlans.length} of {savedPlans.length} plan
                  {savedPlans.length === 1 ? '' : 's'}
                </p>
              ) : null}
            </div>
            {isLoadingPlans ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading assessment plans...
              </div>
            ) : savedPlans.length > 0 && filteredPlans.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {filteredPlans.map((plan) => (
                  <li
                    key={plan.name ?? `${plan.course}-${plan.assessmentGroup}-${plan.assessmentName}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${plan.assessmentName}`}
                    onClick={() => handleSelectPlan(plan)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleSelectPlan(plan)
                      }
                    }}
                    className="flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{plan.assessmentName}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleEditPlan(plan)
                          }}
                        >
                          Edit
                        </Button>
                        <Badge variant={plan.docstatus === 1 ? 'default' : 'destructive'}>
                          {plan.status ?? (plan.docstatus === 1 ? 'Submitted' : 'Draft')}
                        </Badge>
                        <Badge variant="outline">
                          {plan.maximumAssessmentScore ?? '—'} marks
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">
                        {getPlanClassLabel(plan) || '—'}
                      </Badge>
                      <Badge variant="secondary">{plan.course}</Badge>
                      <Badge variant="secondary">{plan.academicYear}</Badge>
                      <Badge variant="secondary">{plan.academicTerm}</Badge>
                      <Badge variant="secondary">{getPlanExamTypeFilterLabel(plan)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatPlanCriteria(plan)}</p>
                    {plan.schedule.date.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Schedule: {plan.schedule.date} · {plan.schedule.fromTime}–{plan.schedule.toTime}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : savedPlans.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                No plans match{' '}
                {describeActivePlanListFilters(
                  plansListYearFilter,
                  plansListClassFilter,
                  plansListExamTypeFilter,
                  planListExamTypeOptions,
                )}.
                Adjust the filters or create a matching plan.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assessment plans saved yet. Click Create Assessment Plan to add one.
              </p>
            )}
            <AssessmentPlanDetailDialog
              plan={selectedPlan}
              onOpenChange={handlePlanDetailOpenChange}
              onEdit={(plan) => void handleEditPlan(plan)}
            />
          </>
        ) : (
          <>
        {planFormOptionsError ? (
          <Alert variant="destructive">
            <AlertTitle>Failed to load master data</AlertTitle>
            <AlertDescription>{planFormOptionsError}</AlertDescription>
          </Alert>
        ) : null}
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {selectedCourseIds.length === 0
                ? 'No courses selected'
                : selectedCourseIds.length === 1
                  ? `1 course selected`
                  : `${selectedCourseIds.length} courses — ${selectedCourseIds.length} plans will be created`}
            </Badge>
            <Badge variant="secondary">Subject Type: {selectedCourseCategory}</Badge>
            <Badge variant="secondary">Criteria Rows: {criteria.length}</Badge>
            <Badge variant="secondary">Configured Rows: {enteredCriteriaRowsCount}</Badge>
          </div>
          <Field>
            <FieldLabel htmlFor="plan-class">Class</FieldLabel>
            <Select
              value={selectedProgramName}
              onValueChange={handleClassChange}
              disabled={isEditMode || isLoadingPlanFormOptions || programOptions.length === 0}
            >
              <SelectTrigger id="plan-class" className="max-w-xs">
                <SelectValue
                  placeholder={
                    isLoadingPlanFormOptions
                      ? 'Loading classes...'
                      : 'No programs found — run seed'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {programOptions.map((program) => (
                    <SelectItem key={program.name} value={program.program_name}>
                      {program.program_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>
              Courses
              {!isEditMode && selectedCourseIds.length > 0 && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({selectedCourseIds.length} selected — one plan per course will be created)
                </span>
              )}
            </FieldLabel>
            {isLoadingPlanFormOptions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading courses...
              </div>
            ) : courseOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses found — run seed</p>
            ) : isEditMode ? (
              <p className="text-sm">
                {selectedCourse?.course_name ?? selectedCourseId}
                <Badge variant="outline" className="ml-2">
                  {selectedCourseCategory}
                </Badge>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllCourses}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-xs text-muted-foreground">/</span>
                  <button
                    type="button"
                    onClick={handleClearAllCourses}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border p-3 sm:grid-cols-3">
                  {courseOptions.map((courseOption) => {
                    const isChecked = selectedCourseIds.includes(courseOption.id)
                    return (
                      <label
                        key={courseOption.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCourseToggle(courseOption.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className={isChecked ? 'font-medium' : ''}>{courseOption.course_name}</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {courseOption.subjectType}
                        </Badge>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="plan-assessment-name">Assessment Name</FieldLabel>
            <Input
              id="plan-assessment-name"
              value={assessmentName}
              onChange={(event) => setAssessmentName(event.target.value)}
              className="max-w-xs"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plan-academic-year">Academic Year</FieldLabel>
            <Select
              value={academicYear}
              onValueChange={handleAcademicYearChange}
              disabled={isEditMode || isLoadingPlanFormOptions || academicYearOptions.length === 0}
            >
              <SelectTrigger id="plan-academic-year" className="max-w-xs">
                <SelectValue
                  placeholder={
                    isLoadingPlanFormOptions
                      ? 'Loading academic years...'
                      : 'No academic years found — run seed'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {academicYearOptions.map((yearOption) => (
                    <SelectItem
                      key={yearOption.name}
                      value={yearOption.academic_year_name}
                    >
                      {yearOption.academic_year_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="plan-academic-term">Academic Term</FieldLabel>
            <Select
              value={academicTerm}
              onValueChange={setAcademicTerm}
              disabled={isEditMode || isLoadingPlanFormOptions || academicTermOptions.length === 0}
            >
              <SelectTrigger id="plan-academic-term" className="max-w-xs">
                <SelectValue
                  placeholder={
                    isLoadingPlanFormOptions
                      ? 'Loading academic terms...'
                      : 'No terms for this year — run seed'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {academicTermOptions.map((termOption) => (
                    <SelectItem key={termOption.name} value={termOption.term_name}>
                      {termOption.term_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="plan-cycle">Assessment Group</FieldLabel>
            <Select
              value={selectedCycleId}
              onValueChange={handleCycleChange}
              disabled={isEditMode || isLoadingAssessmentGroups || cycleOptions.length === 0}
            >
              <SelectTrigger id="plan-cycle" className="max-w-xs">
                <SelectValue
                  placeholder={
                    isLoadingAssessmentGroups
                      ? 'Loading assessment groups...'
                      : 'No groups for this year and term'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {cycleOptions.map((cycleOption) => (
                    <SelectItem key={cycleOption.name} value={cycleOption.name}>
                      {cycleOption.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="plan-grading-scale">Grading Scale</FieldLabel>
            <Select
              value={selectedGradingScale}
              onValueChange={setSelectedGradingScale}
              disabled={isLoadingGradingScales || gradingScaleRows.length === 0}
            >
              <SelectTrigger id="plan-grading-scale" className="max-w-xs">
                <SelectValue
                  placeholder={
                    isLoadingGradingScales
                      ? 'Loading grading scales...'
                      : 'No grading scales found — run seed'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {gradingScaleRows.map((scale) => {
                    const scaleValue = scale.grading_scale_name || scale.name
                    const isDraft = scale.docstatus !== 1
                    return (
                      <SelectItem key={scale.name} value={scaleValue}>
                        {scaleValue}
                        {isDraft ? ' (draft)' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
            {gradingScalesApiError ? (
              <p className="text-sm text-destructive">{gradingScalesApiError}</p>
            ) : null}
          </Field>
        </FieldGroup>

        <Separator />
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Schedule</h3>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="plan-schedule-date">Date</FieldLabel>
              <Input
                id="plan-schedule-date"
                type="date"
                value={scheduleDate}
                onChange={(event) => setScheduleDate(event.target.value)}
                className="max-w-xs"
              />
            </Field>
            <div />
            <Field>
              <FieldLabel htmlFor="plan-from-time">From Time</FieldLabel>
              <Input
                id="plan-from-time"
                type="time"
                value={fromTime}
                onChange={(event) => setFromTime(event.target.value)}
                className="max-w-xs"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-to-time">To Time</FieldLabel>
              <Input
                id="plan-to-time"
                type="time"
                value={toTime}
                onChange={(event) => setToTime(event.target.value)}
                className="max-w-xs"
              />
            </Field>
          </FieldGroup>
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="max-assessment-score">Maximum Assessment Score</FieldLabel>
            <Input
              id="max-assessment-score"
              type="number"
              min={0}
              value={maximumAssessmentScore}
              onChange={(event) => setMaximumAssessmentScore(event.target.value)}
              className="max-w-[120px]"
            />
            {ptCapHint ? (
              <p className="text-xs text-muted-foreground">{ptCapHint}</p>
            ) : null}
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Criteria marks</h3>
              {internalCriteriaHint ? (
                <p className="text-xs text-muted-foreground">{internalCriteriaHint}</p>
              ) : null}
              {cycleHints.isInternal ? (
                <p className="text-xs text-muted-foreground">
                  Current criteria total: {internalTotal}
                </p>
              ) : null}
            </div>
            {hasConfiguredCriteriaSource ? (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllCriteria}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Select all criteria
                </button>
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  onClick={handleClearAllCriteria}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
                {selectedCriteriaNames.length > 0 ? (
                  <span className="text-muted-foreground">
                    ({selectedCriteriaNames.length} of {assessmentCriteriaOptions.length} selected)
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="rounded border">
            <div className="grid grid-cols-12 border-b bg-muted/50 px-3 py-2 text-xs font-medium">
              <span className="col-span-7">Assessment Criteria</span>
              <span className="col-span-3">Maximum Score</span>
              <span className="col-span-2">Action</span>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {!hasConfiguredCriteriaSource && (
                <p className="text-xs text-muted-foreground">
                  Configure Assessment Criteria in the Assessment Criteria tab to enable selection.
                </p>
              )}
              {criteria.map((row) => {
                const rowCriteriaOptions = getCriteriaOptionsForRow(
                  row.id,
                  criteria,
                  assessmentCriteriaOptions,
                )
                return (
                <div key={row.id} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-7">
                    <Select
                      value={row.assessmentCriteria}
                      onValueChange={(value) => handleAssessmentCriteriaChange(row.id, value)}
                    >
                      <SelectTrigger disabled={assessmentCriteriaOptions.length === 0}>
                        <SelectValue
                          placeholder={
                            isLoadingAssessmentCriteria
                              ? 'Loading criteria...'
                              : 'Select Assessment Criteria'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {assessmentCriteriaOptions.map((criteriaOption) => {
                            const isAvailable = rowCriteriaOptions.includes(criteriaOption)
                            return (
                              <SelectItem
                                key={criteriaOption}
                                value={criteriaOption}
                                disabled={!isAvailable}
                              >
                                {criteriaOption}
                                {!isAvailable ? ' (already selected)' : ''}
                              </SelectItem>
                            )
                          })}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min={0}
                      value={row.maxMarks}
                      aria-invalid={schemeValidationMessages.some((message) => message.includes('internal criteria'))}
                      onChange={(event) => handleMarksChange(row.id, event.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCriteriaRow(row.id)}
                      disabled={criteria.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )})}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCriteriaRow}
            className="w-fit"
            disabled={!hasConfiguredCriteriaSource || allCriteriaRowsUsed}
          >
            Add row
          </Button>
        </div>
        {bulkSaveResults.length > 0 && (
          <Alert variant={bulkSaveResults.some((r) => !r.ok) ? 'destructive' : 'default'}>
            <AlertTitle>Bulk save results</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {bulkSaveResults.map((result) => (
                  <li key={result.course}>
                    <span className="font-medium">{result.course}</span>
                    {result.ok ? ' — saved & submitted' : ` — failed: ${result.error ?? 'unknown error'}`}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {validationMessages.length > 0 && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Validation issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
          </>
        )}
      </CardContent>
      {isCreateFormOpen ? (
        <CardFooter className="flex gap-2">
          <Button type="button" disabled={!canSavePlan} onClick={handleSave}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isEditMode
              ? 'Save changes'
              : selectedCourseIds.length > 1
                ? `Save & submit ${selectedCourseIds.length} plans`
                : 'Save & submit plan'}
          </Button>
          <Button type="button" variant="outline" disabled={isSaving} onClick={handleReset}>
            Reset form
          </Button>
          <Button type="button" variant="ghost" disabled={isSaving} onClick={handleCloseCreateForm}>
            Cancel
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
