import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ReportController_create } from '@/lib/api/wms-saas-core-api/reports/reports'
import type { CreateReportDto } from '@/lib/types/wms-saas-core-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const createReportSchema = z.object({
  reportName: z.string().min(1, 'Report name is required').max(200),
  reportType: z.string().min(1, 'Report type is required'),
  description: z.string().max(1000).optional(),
  format: z.string().optional(),
  parameters: z.string().optional(),
  scheduleFrequency: z.string().optional(),
  scheduleCron: z.string().optional(),
})

type CreateReportForm = z.input<typeof createReportSchema>

const REPORT_TYPES = [
  { value: 'user_activity', label: 'User Activity' },
  { value: 'subscription_summary', label: 'Subscription Summary' },
  { value: 'financial', label: 'Financial' },
  { value: 'security_audit', label: 'Security Audit' },
  { value: 'tenant_usage', label: 'Tenant Usage' },
  { value: 'billing', label: 'Billing' },
  { value: 'custom', label: 'Custom' },
]

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'json', label: 'JSON' },
]

type Step = 'type' | 'details' | 'schedule' | 'review'

export function CreateReportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('type')

  const form = useForm<CreateReportForm>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      reportName: '',
      reportType: '',
      description: '',
      format: 'pdf',
      parameters: '',
      scheduleFrequency: '',
      scheduleCron: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateReportForm) => {
      const dto: CreateReportDto = {
        reportName: values.reportName,
        reportType: values.reportType,
      }
      if (values.description) dto.description = values.description
      if (values.format) dto.format = values.format
      if (values.parameters?.trim()) {
        try {
          dto.parameters = JSON.parse(values.parameters) as Record<string, unknown>
        } catch {
          dto.parameters = { raw: values.parameters }
        }
      }
      if (values.scheduleCron && values.scheduleFrequency) {
        dto.schedule = {
          cronExpression: values.scheduleCron,
          frequency: values.scheduleFrequency,
        }
      }
      await ReportController_create(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] })
      toast.success('Report created')
      navigate({ to: '/reports' })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreateReportForm) {
    createMutation.mutate(values)
  }

  function nextStep() {
    if (step === 'type') setStep('details')
    else if (step === 'details') setStep('schedule')
    else if (step === 'schedule') setStep('review')
  }

  function prevStep() {
    if (step === 'details') setStep('type')
    else if (step === 'schedule') setStep('details')
    else if (step === 'review') setStep('schedule')
  }

  const values = form.watch()

  function StepIndicator() {
    const steps: { key: Step; label: string }[] = [
      { key: 'type', label: 'Type & Name' },
      { key: 'details', label: 'Parameters' },
      { key: 'schedule', label: 'Schedule & Format' },
      { key: 'review', label: 'Review' },
    ]
    const currentIndex = steps.findIndex((s) => s.key === step)

    return (
      <div className='flex items-center gap-2 mb-6'>
        {steps.map((s, i) => (
          <div key={s.key} className='flex items-center gap-2'>
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i <= currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${i <= currentIndex ? 'font-medium' : 'text-muted-foreground'}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <Separator className='w-8' />}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/reports' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create Report</h1>
          <p className='text-sm text-muted-foreground'>
            Configure a new report
          </p>
        </div>
      </div>

      <Separator />

      <StepIndicator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {step === 'type' && (
            <Card>
              <CardHeader>
                <CardTitle>Report Type & Name</CardTitle>
                <CardDescription>Choose a report type and give it a name</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='reportType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Report Type <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select report type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REPORT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='reportName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Report Name <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Monthly Subscription Summary' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='What does this report cover?'
                          className='resize-none'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-end'>
                <Button type='button' onClick={nextStep}>
                  Next
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle>Parameters</CardTitle>
                <CardDescription>
                  Configure report parameters as a JSON object
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='parameters'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parameters (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"dateFrom": "2024-01-01", "dateTo": "2024-12-31", "tenantIds": ["all"]}'
                          className='min-h-[120px] font-mono text-sm'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional JSON object with report parameters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}>
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Back
                </Button>
                <Button type='button' onClick={nextStep}>
                  Next
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'schedule' && (
            <Card>
              <CardHeader>
                <CardTitle>Schedule & Format</CardTitle>
                <CardDescription>
                  Choose output format and optional scheduling
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='format'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Output Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select format' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FORMATS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='scheduleFrequency'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='No schedule' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value=' '>No schedule</SelectItem>
                          <SelectItem value='daily'>Daily</SelectItem>
                          <SelectItem value='weekly'>Weekly</SelectItem>
                          <SelectItem value='monthly'>Monthly</SelectItem>
                          <SelectItem value='quarterly'>Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Set up recurring report generation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {values.scheduleFrequency && values.scheduleFrequency !== ' ' && (
                  <FormField
                    control={form.control}
                    name='scheduleCron'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cron Expression</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. 0 8 * * 1 (every Monday 8am)'
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Cron expression for the schedule
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}>
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Back
                </Button>
                <Button type='button' onClick={nextStep}>
                  Next
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Create</CardTitle>
                <CardDescription>Review your report configuration</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='rounded-lg border p-4 space-y-3'>
                  <div className='flex justify-between'>
                    <span className='text-sm text-muted-foreground'>Report Name</span>
                    <span className='text-sm font-medium'>{values.reportName}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-muted-foreground'>Report Type</span>
                    <span className='text-sm font-medium'>
                      {REPORT_TYPES.find((t) => t.value === values.reportType)?.label ??
                        values.reportType}
                    </span>
                  </div>
                  {values.description && (
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Description</span>
                      <span className='text-sm font-medium max-w-[300px] text-right'>
                        {values.description}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <span className='text-sm text-muted-foreground'>Format</span>
                    <span className='text-sm font-medium'>
                      {FORMATS.find((f) => f.value === values.format)?.label ??
                        values.format?.toUpperCase()}
                    </span>
                  </div>
                  {values.scheduleFrequency && values.scheduleFrequency !== ' ' && (
                    <>
                      <div className='flex justify-between'>
                        <span className='text-sm text-muted-foreground'>Schedule</span>
                        <span className='text-sm font-medium capitalize'>
                          {values.scheduleFrequency}
                        </span>
                      </div>
                      {values.scheduleCron && (
                        <div className='flex justify-between'>
                          <span className='text-sm text-muted-foreground'>Cron</span>
                          <span className='text-sm font-mono'>{values.scheduleCron}</span>
                        </div>
                      )}
                    </>
                  )}
                  {values.parameters && (
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Parameters</span>
                      <span className='text-sm font-mono max-w-[250px] truncate text-right'>
                        {values.parameters}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}>
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Back
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Create Report
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
