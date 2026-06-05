import { AssessmentGroupTreeView } from '@/components/assessment-group-tree-view'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  ASSESSMENT_API,
  type AssessmentGroupTreeNode,
  type PlanFormOptions,
} from '@/lib/assessment-api-methods'
import {
  getFrappeCallErrorMessage,
  isFrappeCallSuccessful,
  unwrapFrappeData,
  unwrapFrappeError,
} from '@/lib/frappe-api'
import {
  getDefaultTermDrafts,
  mergeTermsWithDefaults,
  parseAssessmentGroupTreeToTerms,
  type ParsedExamType,
  type ParsedTermDraft,
} from '@/lib/parse-assessment-group-tree'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { LayoutGridIcon, ListTreeIcon, PencilIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

const EMPTY_PLAN_FORM_OPTIONS: PlanFormOptions = {
  programs: [],
  courses: [],
  academicYears: [],
  academicTerms: [],
}

const EMPTY_GROUP_TREE: readonly AssessmentGroupTreeNode[] = []

const areTermDraftsEqual = (
  left: readonly ParsedTermDraft[],
  right: readonly ParsedTermDraft[],
): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

type SavedGroupsViewMode = 'cards' | 'tree'

interface AssessmentGroupPayloadRow {
  readonly academicYear: string
  readonly term: string
  readonly examName: string
  readonly displayName: string
}

interface AssessmentGroupsSummaryProps {
  readonly terms: readonly ParsedTermDraft[]
  readonly editingExamName: string | null
  readonly editDraftValue: string
  readonly isEditDuplicateName: boolean
  readonly deletingExamName: string | null
  readonly updatingExamName: string | null
  readonly isBusy: boolean
  readonly onEditDraftChange: (value: string) => void
  readonly onStartEditExamType: (examType: ParsedExamType) => void
  readonly onCancelEditExamType: () => void
  readonly onSaveEditExamType: () => void
  readonly onRequestDeleteExamType: (examType: ParsedExamType) => void
}

const hasExamTypeLabel = (
  examTypes: readonly ParsedExamType[],
  examName: string,
): boolean => examTypes.some((examType) => examType.label === examName)

const AssessmentGroupsSummary = ({
  terms,
  editingExamName,
  editDraftValue,
  isEditDuplicateName,
  deletingExamName,
  updatingExamName,
  isBusy,
  onEditDraftChange,
  onStartEditExamType,
  onCancelEditExamType,
  onSaveEditExamType,
  onRequestDeleteExamType,
}: AssessmentGroupsSummaryProps): ReactNode => (
  <div className="grid gap-3 md:grid-cols-2">
    {terms.map((term) => (
      <div
        key={term.id}
        className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{term.label}</h4>
          <Badge variant="outline" className="font-normal">
            {term.examTypes.length}{' '}
            {term.examTypes.length === 1 ? 'exam type' : 'exam types'}
          </Badge>
        </div>
        {term.examTypes.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {term.examTypes.map((examType) => {
              const isEditingRow = editingExamName === examType.name
              const isUpdatingRow = updatingExamName === examType.name
              return (
                <li
                  key={examType.name}
                  className="inline-flex max-w-full flex-col gap-1 rounded-lg border border-transparent bg-secondary p-1 text-secondary-foreground"
                >
                  {isEditingRow ? (
                    <>
                      <Input
                        value={editDraftValue}
                        aria-label={`Edit exam type ${examType.label}`}
                        disabled={isUpdatingRow}
                        className="h-7 text-xs"
                        onChange={(event) => onEditDraftChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            onSaveEditExamType()
                          }
                          if (event.key === 'Escape') {
                            onCancelEditExamType()
                          }
                        }}
                      />
                      {isEditDuplicateName ? (
                        <p className="px-1 text-xs text-destructive">
                          Name already exists in this term.
                        </p>
                      ) : null}
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 flex-1 text-xs"
                          disabled={
                            isUpdatingRow ||
                            isEditDuplicateName ||
                            editDraftValue.trim().length === 0
                          }
                          onClick={onSaveEditExamType}
                        >
                          {isUpdatingRow ? <Spinner className="size-3" /> : null}
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 flex-1 text-xs"
                          disabled={isUpdatingRow}
                          onClick={onCancelEditExamType}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="inline-flex items-stretch overflow-hidden rounded-4xl">
                      <span className="flex items-center px-2 py-0.5 text-xs font-medium">
                        {examType.label}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto min-h-5 rounded-none px-1.5 hover:bg-secondary-foreground/10"
                        disabled={isBusy || editingExamName !== null}
                        aria-label={`Edit ${examType.label}`}
                        onClick={() => onStartEditExamType(examType)}
                      >
                        <PencilIcon className="size-3" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto min-h-5 rounded-none px-1.5 hover:bg-secondary-foreground/10"
                        disabled={isBusy || editingExamName !== null}
                        aria-label={`Remove ${examType.label}`}
                        onClick={() => onRequestDeleteExamType(examType)}
                      >
                        {deletingExamName === examType.name ? (
                          <Spinner className="size-3" />
                        ) : (
                          <XIcon className="size-3" aria-hidden />
                        )}
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No exam types for this term yet.</p>
        )}
      </div>
    ))}
  </div>
)

export function AssessmentGroupPage() {
  const [academicYear, setAcademicYear] = useState<string>('')
  const [terms, setTerms] = useState<readonly ParsedTermDraft[]>(getDefaultTermDrafts())
  const [selectedTermId, setSelectedTermId] = useState<string>('term-1')
  const [newExamTypeByTerm, setNewExamTypeByTerm] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [deletingExamName, setDeletingExamName] = useState<string | null>(null)
  const [examTypePendingDelete, setExamTypePendingDelete] = useState<ParsedExamType | null>(null)
  const [editingExamName, setEditingExamName] = useState<string | null>(null)
  const [editDraftValue, setEditDraftValue] = useState<string>('')
  const [updatingExamName, setUpdatingExamName] = useState<string | null>(null)
  const [savedGroupsView, setSavedGroupsView] = useState<SavedGroupsViewMode>('cards')
  const {
    data: planFormOptionsResponse,
    isLoading: isLoadingPlanFormOptions,
    error: planFormOptionsFetchError,
  } = useFrappeGetCall(
    ASSESSMENT_API.getPlanFormOptions,
    undefined,
    'assessment-group-form-options',
  )
  const planFormOptions =
    unwrapFrappeData<PlanFormOptions>(planFormOptionsResponse) ?? EMPTY_PLAN_FORM_OPTIONS
  const planFormOptionsError = unwrapFrappeError(planFormOptionsResponse)
  const academicYearOptions = planFormOptions.academicYears
  const {
    data: groupsResponse,
    isLoading,
    mutate,
    error: fetchError,
  } = useFrappeGetCall(
    ASSESSMENT_API.getAssessmentGroups,
    { academic_year: academicYear },
    `assessment-groups-${academicYear}`,
    { isPaused: () => academicYear.length === 0 },
  )
  const { call: bulkCreateGroups } = useFrappePostCall(ASSESSMENT_API.bulkCreateAssessmentGroups)
  const { call: updateGroup } = useFrappePostCall(ASSESSMENT_API.updateAssessmentGroup)
  const { call: deleteGroup } = useFrappePostCall(ASSESSMENT_API.deleteAssessmentGroup)
  const groupTree = useMemo(
    () =>
      unwrapFrappeData<readonly AssessmentGroupTreeNode[]>(groupsResponse) ??
      EMPTY_GROUP_TREE,
    [groupsResponse],
  )
  const apiError = unwrapFrappeError(groupsResponse)
  const parsedTermsFromApi = useMemo(
    () => parseAssessmentGroupTreeToTerms(groupTree),
    [groupTree],
  )
  const hasSavedGroups = parsedTermsFromApi.length > 0

  useEffect(() => {
    if (isLoadingPlanFormOptions) {
      return
    }
    if (academicYearOptions.length > 0 && academicYear.length === 0) {
      setAcademicYear(academicYearOptions[0].academic_year_name)
    }
  }, [academicYear, academicYearOptions, isLoadingPlanFormOptions])

  useEffect(() => {
    if (
      isLoading ||
      isSaving ||
      deletingExamName !== null ||
      updatingExamName !== null ||
      editingExamName !== null
    ) {
      return
    }
    const nextTerms = mergeTermsWithDefaults(parsedTermsFromApi)
    setTerms((currentTerms) =>
      areTermDraftsEqual(currentTerms, nextTerms) ? currentTerms : nextTerms,
    )
    setSelectedTermId((currentId) => {
      const stillExists = nextTerms.some((term) => term.id === currentId)
      return stillExists ? currentId : (nextTerms[0]?.id ?? 'term-1')
    })
  }, [
    deletingExamName,
    editingExamName,
    isLoading,
    isSaving,
    parsedTermsFromApi,
    updatingExamName,
  ])

  const trimmedEditValue = editDraftValue.trim()
  const editingTerm =
    editingExamName === null
      ? null
      : (parsedTermsFromApi.find((term) =>
          term.examTypes.some((examType) => examType.name === editingExamName),
        ) ?? null)
  const editingExamType =
    editingTerm?.examTypes.find((examType) => examType.name === editingExamName) ?? null
  const isEditDuplicateName =
    editingExamName !== null &&
    editingTerm !== null &&
    editingTerm.examTypes.some(
      (examType) =>
        examType.label.toLowerCase() === trimmedEditValue.toLowerCase() &&
        examType.name !== editingExamName,
    )
  const isBusy = isSaving || deletingExamName !== null || updatingExamName !== null

  const selectedTerm = terms.find((term) => term.id === selectedTermId) ?? null

  const handleExamTypeInputChange = (id: string, value: string): void => {
    setNewExamTypeByTerm((previousValues) => ({ ...previousValues, [id]: value }))
  }

  const getDisplayName = (termLabel: string, examName: string): string =>
    `${academicYear} + ${termLabel} + ${examName}`

  const handleAddExamType = async (id: string): Promise<void> => {
    const term = terms.find((item) => item.id === id)
    if (!term) {
      return
    }
    const examName = newExamTypeByTerm[id]?.trim() ?? ''
    if (examName.length === 0) {
      return
    }
    const termFromApi = parsedTermsFromApi.find((item) => item.label === term.label)
    if (
      hasExamTypeLabel(term.examTypes, examName) ||
      (termFromApi !== undefined && hasExamTypeLabel(termFromApi.examTypes, examName))
    ) {
      toast.error(`Exam type "${examName}" already exists for ${term.label}.`)
      return
    }
    const row: AssessmentGroupPayloadRow = {
      academicYear,
      term: term.label,
      examName,
      displayName: getDisplayName(term.label, examName),
    }
    setIsSaving(true)
    try {
      await bulkCreateGroups({ rows: JSON.stringify([row]) })
      toast.success('Exam type added')
      setNewExamTypeByTerm((previousValues) => ({ ...previousValues, [id]: '' }))
      await mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add exam type')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEditExamType = (examType: ParsedExamType): void => {
    setEditingExamName(examType.name)
    setEditDraftValue(examType.label)
  }

  const handleCancelEditExamType = (): void => {
    setEditingExamName(null)
    setEditDraftValue('')
  }

  const handleSaveEditExamType = async (): Promise<void> => {
    if (editingExamName === null || trimmedEditValue.length === 0 || isEditDuplicateName) {
      return
    }
    if (trimmedEditValue === editingExamType?.label) {
      handleCancelEditExamType()
      return
    }
    setUpdatingExamName(editingExamName)
    try {
      const response = await updateGroup({
        old_name: editingExamName,
        new_name: trimmedEditValue,
      })
      if (!isFrappeCallSuccessful(response)) {
        toast.error(
          getFrappeCallErrorMessage(response, `Failed to update "${editingExamType?.label ?? editingExamName}"`),
        )
        return
      }
      toast.success(`Exam type renamed to "${trimmedEditValue}"`)
      handleCancelEditExamType()
      await mutate()
    } catch (error) {
      toast.error(
        getFrappeCallErrorMessage(error, `Failed to update "${editingExamType?.label ?? editingExamName}"`),
      )
    } finally {
      setUpdatingExamName(null)
    }
  }

  const handleRequestDeleteExamType = (examType: ParsedExamType): void => {
    setExamTypePendingDelete(examType)
  }

  const handleConfirmDeleteExamType = async (): Promise<void> => {
    if (examTypePendingDelete === null) {
      return
    }
    const examType = examTypePendingDelete
    setDeletingExamName(examType.name)
    try {
      const response = await deleteGroup({ assessment_group_name: examType.name })
      if (!isFrappeCallSuccessful(response)) {
        toast.error(
          getFrappeCallErrorMessage(response, `Failed to delete "${examType.label}"`),
        )
        return
      }
      toast.success(`Exam type "${examType.label}" deleted`)
      setExamTypePendingDelete(null)
      await mutate()
    } catch (error) {
      toast.error(getFrappeCallErrorMessage(error, `Failed to delete "${examType.label}"`))
    } finally {
      setDeletingExamName(null)
    }
  }

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Assessment Group</CardTitle>
        <CardDescription>
          Load and edit term and exam types for the selected academic year from the Frappe backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(planFormOptionsFetchError || planFormOptionsError) && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load academic years</AlertTitle>
            <AlertDescription>
              {planFormOptionsError ??
                (planFormOptionsFetchError instanceof Error
                  ? planFormOptionsFetchError.message
                  : 'Unknown error')}
            </AlertDescription>
          </Alert>
        )}
        {!isLoadingPlanFormOptions && academicYearOptions.length === 0 ? (
          <Alert>
            <AlertTitle>No academic years found</AlertTitle>
            <AlertDescription>
              Run master data seed in Frappe to create Academic Year records.
            </AlertDescription>
          </Alert>
        ) : null}
        {(fetchError || apiError) && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load groups</AlertTitle>
            <AlertDescription>
              {apiError ?? (fetchError instanceof Error ? fetchError.message : 'Unknown error')}
            </AlertDescription>
          </Alert>
        )}
        {isLoadingPlanFormOptions || isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading assessment groups for {academicYear}…
          </div>
        ) : null}
        <FieldGroup className="grid grid-cols-2 gap-4">
          <Field className="w-full md:max-w-xs">
            <FieldLabel htmlFor="assessment-group-year">Academic year</FieldLabel>
            <Select
              value={academicYear.length > 0 ? academicYear : undefined}
              onValueChange={setAcademicYear}
              disabled={isLoadingPlanFormOptions || academicYearOptions.length === 0}
            >
              <SelectTrigger id="assessment-group-year" className="max-w-xs">
                <SelectValue
                  placeholder={
                    isLoadingPlanFormOptions ? 'Loading years…' : 'Select academic year'
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
          <Field className="w-full md:max-w-xs">
            <FieldLabel htmlFor="assessment-group-term">Academic term</FieldLabel>
            <Select
              value={terms.some((term) => term.id === selectedTermId) ? selectedTermId : undefined}
              onValueChange={setSelectedTermId}
            >
              <SelectTrigger id="assessment-group-term" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {terms.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        {!isLoading && !hasSavedGroups ? (
          <Alert>
            <AlertTitle>No groups saved yet</AlertTitle>
            <AlertDescription>
              No assessment groups exist for {academicYear}. Add exam types below to create them.
            </AlertDescription>
          </Alert>
        ) : null}
        {selectedTerm ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded border p-3">
              <h3 className="text-sm font-medium">{selectedTerm.label}</h3>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  value={newExamTypeByTerm[selectedTerm.id] ?? ''}
                  placeholder="Enter additional exam type"
                  onChange={(event) =>
                    handleExamTypeInputChange(selectedTerm.id, event.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy || isLoading}
                  onClick={() => void handleAddExamType(selectedTerm.id)}
                >
                  {isSaving ? <Spinner data-icon="inline-start" /> : null}
                  Add exam type
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a term to manage exam types.
          </p>
        )}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Saved groups ({academicYear})</span>
              <p className="text-sm text-muted-foreground">
                {savedGroupsView === 'cards'
                  ? 'Exam types stored in the backend, grouped by term.'
                  : 'Full hierarchy: academic year → term → exam types.'}
              </p>
            </div>
            <div
              className="inline-flex rounded-lg border p-0.5"
              role="group"
              aria-label="Saved groups view mode"
            >
              <Button
                type="button"
                size="sm"
                variant={savedGroupsView === 'cards' ? 'default' : 'ghost'}
                className="gap-1.5"
                aria-pressed={savedGroupsView === 'cards'}
                onClick={() => setSavedGroupsView('cards')}
              >
                <LayoutGridIcon className="size-4" aria-hidden />
                By term
              </Button>
              <Button
                type="button"
                size="sm"
                variant={savedGroupsView === 'tree' ? 'default' : 'ghost'}
                className="gap-1.5"
                aria-pressed={savedGroupsView === 'tree'}
                onClick={() => setSavedGroupsView('tree')}
              >
                <ListTreeIcon className="size-4" aria-hidden />
                Tree
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading…
            </div>
          ) : savedGroupsView === 'tree' ? (
            <AssessmentGroupTreeView
              tree={groupTree}
              editingExamName={editingExamName}
              editDraftValue={editDraftValue}
              isEditDuplicateName={isEditDuplicateName}
              deletingExamName={deletingExamName}
              updatingExamName={updatingExamName}
              isBusy={isBusy}
              onEditDraftChange={setEditDraftValue}
              onStartEditExamType={handleStartEditExamType}
              onCancelEditExamType={handleCancelEditExamType}
              onSaveEditExamType={() => void handleSaveEditExamType()}
              onRequestDeleteExamType={handleRequestDeleteExamType}
            />
          ) : (
            <AssessmentGroupsSummary
              terms={terms}
              editingExamName={editingExamName}
              editDraftValue={editDraftValue}
              isEditDuplicateName={isEditDuplicateName}
              deletingExamName={deletingExamName}
              updatingExamName={updatingExamName}
              isBusy={isBusy}
              onEditDraftChange={setEditDraftValue}
              onStartEditExamType={handleStartEditExamType}
              onCancelEditExamType={handleCancelEditExamType}
              onSaveEditExamType={() => void handleSaveEditExamType()}
              onRequestDeleteExamType={handleRequestDeleteExamType}
            />
          )}
        </div>
      </CardContent>
      <Dialog
        open={examTypePendingDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && deletingExamName === null) {
            setExamTypePendingDelete(null)
          }
        }}
      >
        <DialogContent showCloseButton={deletingExamName === null}>
          <DialogHeader>
            <DialogTitle>Delete exam type?</DialogTitle>
            <DialogDescription>
              {examTypePendingDelete
                ? `Remove "${examTypePendingDelete.label}" from ${academicYear}? This cannot be undone.`
                : 'Remove this exam type? This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingExamName !== null}
              onClick={() => setExamTypePendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingExamName !== null}
              onClick={() => void handleConfirmDeleteExamType()}
            >
              {deletingExamName !== null ? <Spinner data-icon="inline-start" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
