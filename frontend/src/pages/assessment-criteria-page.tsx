import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  ASSESSMENT_API,
  type AssessmentCriteriaRow,
} from '@/lib/assessment-api-methods'
import {
  getFrappeCallErrorMessage,
  isFrappeCallSuccessful,
  unwrapFrappeData,
  unwrapFrappeError,
} from '@/lib/frappe-api'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { useState } from 'react'
import { toast } from 'sonner'

const SUGGESTED_CRITERIA_NAMES: readonly string[] = [
  'Theory',
  'PT Internal',
  'Multiple Assessment (MA)',
  'Subject Enrichment (SEA)',
  'Portfolio',
  'Practical',
] as const

const EMPTY_DRAFT = { criteriaValue: '' } as const

export function AssessmentCriteriaPage() {
  const [draftCriteriaValue, setDraftCriteriaValue] = useState<string>(EMPTY_DRAFT.criteriaValue)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [editingCriteriaName, setEditingCriteriaName] = useState<string | null>(null)
  const [editDraftValue, setEditDraftValue] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const {
    data: criteriaResponse,
    isLoading,
    mutate,
    error: fetchError,
  } = useFrappeGetCall(ASSESSMENT_API.getAssessmentCriteria)
  const { call: createCriteria } = useFrappePostCall(ASSESSMENT_API.createAssessmentCriteria)
  const { call: updateCriteria } = useFrappePostCall(ASSESSMENT_API.updateAssessmentCriteria)
  const { call: deleteCriteria } = useFrappePostCall(ASSESSMENT_API.deleteAssessmentCriteria)
  const savedCriteria = unwrapFrappeData<readonly AssessmentCriteriaRow[]>(criteriaResponse) ?? []
  const apiError = unwrapFrappeError(criteriaResponse)
  const trimmedCriteriaValue = draftCriteriaValue.trim()
  const isDraftValid = trimmedCriteriaValue.length > 0
  const isDuplicateName = savedCriteria.some(
    (row) => row.assessment_criteria.toLowerCase() === trimmedCriteriaValue.toLowerCase(),
  )
  const trimmedEditValue = editDraftValue.trim()
  const isEditDraftValid = trimmedEditValue.length > 0
  const isEditDuplicateName =
    editingCriteriaName !== null &&
    savedCriteria.some(
      (row) =>
        row.assessment_criteria.toLowerCase() === trimmedEditValue.toLowerCase() &&
        row.assessment_criteria !== editingCriteriaName,
    )
  const isRowBusy = isSaving || isUpdating || isDeleting !== null

  const handleSaveCriteria = async (): Promise<void> => {
    if (!isDraftValid || isDuplicateName) {
      return
    }
    setIsSaving(true)
    try {
      const response = await createCriteria({
        criteria_name: trimmedCriteriaValue,
      })
      if (!isFrappeCallSuccessful(response)) {
        toast.error(getFrappeCallErrorMessage(response, 'Failed to save criteria'))
        return
      }
      toast.success(`Criteria "${trimmedCriteriaValue}" saved`)
      setDraftCriteriaValue(EMPTY_DRAFT.criteriaValue)
      await mutate()
    } catch (error) {
      toast.error(getFrappeCallErrorMessage(error, 'Failed to save criteria'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = (criteriaName: string): void => {
    setEditingCriteriaName(criteriaName)
    setEditDraftValue(criteriaName)
  }

  const handleCancelEdit = (): void => {
    setEditingCriteriaName(null)
    setEditDraftValue('')
  }

  const handleSaveEdit = async (): Promise<void> => {
    if (editingCriteriaName === null || !isEditDraftValid || isEditDuplicateName) {
      return
    }
    if (trimmedEditValue === editingCriteriaName) {
      handleCancelEdit()
      return
    }
    setIsUpdating(true)
    try {
      const response = await updateCriteria({
        old_name: editingCriteriaName,
        new_name: trimmedEditValue,
      })
      if (!isFrappeCallSuccessful(response)) {
        toast.error(
          getFrappeCallErrorMessage(response, `Failed to update criteria "${editingCriteriaName}"`),
        )
        return
      }
      toast.success(`Criteria renamed to "${trimmedEditValue}"`)
      handleCancelEdit()
      await mutate()
    } catch (error) {
      toast.error(
        getFrappeCallErrorMessage(error, `Failed to update criteria "${editingCriteriaName}"`),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveSaved = async (criteriaName: string): Promise<void> => {
    setIsDeleting(criteriaName)
    try {
      const response = await deleteCriteria({ criteria_name: criteriaName })
      if (!isFrappeCallSuccessful(response)) {
        toast.error(
          getFrappeCallErrorMessage(response, `Failed to delete criteria "${criteriaName}"`),
        )
        return
      }
      toast.success(`Criteria "${criteriaName}" deleted`)
      await mutate()
    } catch (error) {
      toast.error(
        getFrappeCallErrorMessage(error, `Failed to delete criteria "${criteriaName}"`),
      )
    } finally {
      setIsDeleting(null)
    }
  }

  const handleClearDraft = (): void => {
    setDraftCriteriaValue(EMPTY_DRAFT.criteriaValue)
  }

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Assessment Criteria</CardTitle>
        <CardDescription>
          Add one criterion at a time (for example Writing, Practicals, Presentation). This tab
          defines what is evaluated. Marks are set later while creating assessment plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {(fetchError || apiError) && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load criteria</AlertTitle>
            <AlertDescription>
              {apiError ?? (fetchError instanceof Error ? fetchError.message : 'Unknown error')}
            </AlertDescription>
          </Alert>
        )}
        <FieldGroup className="grid gap-4 md:grid-cols-1">
          <Field>
            <FieldLabel htmlFor="assessment-criteria">Assessment Criteria</FieldLabel>
            <Input
              id="assessment-criteria"
              list="assessment-criteria-suggestions"
              value={draftCriteriaValue}
              onChange={(event) => setDraftCriteriaValue(event.target.value)}
            />
            <datalist id="assessment-criteria-suggestions">
              {SUGGESTED_CRITERIA_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
        </FieldGroup>
        {isDuplicateName && (
          <Alert variant="destructive">
            <AlertTitle>Duplicate name</AlertTitle>
            <AlertDescription>
              A criteria with this name already exists. Use a different name.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!isDraftValid || isDuplicateName || isSaving}
            onClick={handleSaveCriteria}
          >
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            Save criteria
          </Button>
          <Button type="button" variant="outline" onClick={handleClearDraft}>
            Clear form
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading saved criteria...
          </div>
        ) : savedCriteria.length > 0 ? (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Saved criteria ({savedCriteria.length})</h3>
              <ul className="flex flex-col gap-2">
                {savedCriteria.map((row) => {
                  const criteriaName = row.assessment_criteria
                  const isEditingRow = editingCriteriaName === criteriaName
                  return (
                    <li
                      key={row.name ?? criteriaName}
                      className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {isEditingRow ? (
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <Input
                            value={editDraftValue}
                            aria-label="Edit assessment criteria name"
                            disabled={isUpdating}
                            onChange={(event) => setEditDraftValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void handleSaveEdit()
                              }
                              if (event.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                          />
                          {isEditDuplicateName ? (
                            <p className="text-xs text-destructive">
                              A criteria with this name already exists.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{criteriaName}</span>
                      )}
                      <div className="flex shrink-0 gap-2">
                        {isEditingRow ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                !isEditDraftValid || isEditDuplicateName || isUpdating
                              }
                              onClick={() => void handleSaveEdit()}
                            >
                              {isUpdating ? <Spinner data-icon="inline-start" /> : null}
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isRowBusy || editingCriteriaName !== null}
                              onClick={() => handleStartEdit(criteriaName)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isRowBusy || editingCriteriaName !== null}
                              onClick={() => void handleRemoveSaved(criteriaName)}
                            >
                              {isDeleting === criteriaName ? (
                                <Spinner data-icon="inline-start" />
                              ) : null}
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        ) : null}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {isLoading
          ? 'Loading criteria from backend...'
          : savedCriteria.length === 0
            ? 'No criteria saved yet. Add your first criteria above.'
            : `${savedCriteria.length} criteria ready for assessment plans.`}
      </CardFooter>
    </Card>
  )
}
