import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProgramClass } from '@/types/assessment'
import { InfoIcon } from 'lucide-react'
import { useState } from 'react'

const PROGRAM_OPTIONS: readonly { value: ProgramClass; label: string }[] = [
  { value: 'VI', label: 'Class VI' },
  { value: 'VII', label: 'Class VII' },
  { value: 'VIII', label: 'Class VIII' },
]

/** Read-only scheme tree; loads from Frappe API in a later phase. */
export function SchemeViewPage() {
  const [program, setProgram] = useState<ProgramClass>('VI')
  const isLoading = false

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment scheme</CardTitle>
        <CardDescription>
          Term → assessment cycle → subject → criteria. Data will load from{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            get_assessment_scheme
          </code>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="program-select">Class</FieldLabel>
            <Select
              value={program}
              onValueChange={(value) => setProgram(value as ProgramClass)}
            >
              <SelectTrigger id="program-select" className="w-full max-w-xs">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PROGRAM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Showing placeholder layout for Class {program}.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <Alert>
          <InfoIcon />
          <AlertTitle>API not connected</AlertTitle>
          <AlertDescription>
            Connect frappe-react-sdk and seed the backend to replace this
            placeholder accordion.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Accordion type="multiple" className="w-full" defaultValue={['term-1']}>
            <AccordionItem value="term-1">
              <AccordionTrigger>Term I</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3 pl-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">PT-I</span>
                    <Badge>Main — Theory 80</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Internal Assessment</span>
                    <Badge variant="secondary">PT 5 + MA 5 + SEA 5 + Portfolio 5</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Half Yearly</span>
                    <Badge>Main — Theory 80</Badge>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="term-2">
              <AccordionTrigger>Term II</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  PT-II, Internal, and Yearly cycles will mirror Term I structure.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
