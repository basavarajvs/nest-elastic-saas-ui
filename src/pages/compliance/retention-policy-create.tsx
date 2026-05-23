import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ComplianceController_createRetentionPolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import type { CreateRetentionPolicyDto } from '@/lib/types/wms-saas-core-api'
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
import { Switch } from '@/components/ui/switch'

const createSchema = z.object({
  policyName: z.string().min(1, 'Policy name is required').max(200),
  policyType: z.string().min(1, 'Policy type is required'),
  description: z.string().max(1000).optional(),
  retentionDays: z.string().min(1, 'Required').refine((v) => !isNaN(Number(v)) && Number(v) >= 1, 'Must be a positive number'),
  appliesTo: z.string().optional(),
  isActive: z.boolean().optional(),
})

type CreateForm = z.input<typeof createSchema>

type Step = 'basic' | 'scope' | 'retention' | 'status'

const POLICY_TYPES = [
  { value: 'data_retention', label: 'Data Retention' },
  { value: 'audit_log', label: 'Audit Log' },
  { value: 'backup', label: 'Backup' },
  { value: 'archival', label: 'Archival' },
]

export function CreateRetentionPolicyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('basic')

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      policyName: '',
      policyType: '',
      description: '',
      retentionDays: '90',
      appliesTo: '',
      isActive: true,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateForm) => {
      const dto: CreateRetentionPolicyDto = {
        policyName: values.policyName,
        policyType: values.policyType,
        retentionDays: Number(values.retentionDays),
      }
      if (values.description) dto.description = values.description
      if (values.isActive !== undefined) dto.isActive = values.isActive
      if (values.appliesTo?.trim()) {
        try {
          dto.appliesTo = JSON.parse(values.appliesTo) as Record<string, unknown>
        } catch {
          dto.appliesTo = { raw: values.appliesTo }
        }
      }
      await ComplianceController_createRetentionPolicy(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'retention', 'list'] })
      toast.success('Retention policy created')
      navigate({ to: '/compliance/retention-policies' })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreateForm) {
    createMutation.mutate(values)
  }

  function nextStep() {
    if (step === 'basic') setStep('scope')
    else if (step === 'scope') setStep('retention')
    else if (step === 'retention') setStep('status')
  }

  function prevStep() {
    if (step === 'scope') setStep('basic')
    else if (step === 'retention') setStep('scope')
    else if (step === 'status') setStep('retention')
  }

  function StepIndicator() {
    const steps: { key: Step; label: string }[] = [
      { key: 'basic', label: 'Basic Info' },
      { key: 'scope', label: 'Scope' },
      { key: 'retention', label: 'Retention' },
      { key: 'status', label: 'Status' },
    ]
    const currentIndex = steps.findIndex((s) => s.key === step)

    return (
      <div className='flex items-center gap-2 mb-6'>
        {steps.map((s, i) => (
          <div key={s.key} className='flex items-center gap-2'>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i <= currentIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i + 1}
            </div>
            <span className={`text-sm ${i <= currentIndex ? 'font-medium' : 'text-muted-foreground'}`}>
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
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/compliance/retention-policies' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create Retention Policy</h1>
          <p className='text-sm text-muted-foreground'>Define data retention rules</p>
        </div>
      </div>

      <Separator />
      <StepIndicator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {step === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Policy name, type, and description</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField control={form.control} name='policyName' render={({ field }) => (
                  <FormItem><FormLabel>Policy Name</FormLabel><FormControl><Input placeholder='e.g. Audit Log Retention' {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name='policyType' render={({ field }) => (
                  <FormItem><FormLabel>Policy Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder='Select type' /></SelectTrigger></FormControl>
                    <SelectContent>{POLICY_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name='description' render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder='What data does this policy cover?' className='resize-none' {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
              <CardFooter className='justify-end'>
                <Button type='button' onClick={nextStep}>Next <ChevronRight className='ml-2 h-4 w-4' /></Button>
              </CardFooter>
            </Card>
          )}

          {step === 'scope' && (
            <Card>
              <CardHeader>
                <CardTitle>Scope</CardTitle>
                <CardDescription>Define what data this policy applies to</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField control={form.control} name='appliesTo' render={({ field }) => (
                  <FormItem><FormLabel>Applies To (JSON)</FormLabel>
                    <FormControl><Textarea placeholder='{"resourceTypes": ["audit_logs", "user_data"], "regions": ["EU", "US"]}' className='min-h-[120px] font-mono text-sm' {...field} /></FormControl>
                    <FormDescription>JSON object defining scope of this policy</FormDescription>
                    <FormMessage /></FormItem>
                )} />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}><ChevronLeft className='mr-2 h-4 w-4' /> Back</Button>
                <Button type='button' onClick={nextStep}>Next <ChevronRight className='ml-2 h-4 w-4' /></Button>
              </CardFooter>
            </Card>
          )}

          {step === 'retention' && (
            <Card>
              <CardHeader>
                <CardTitle>Retention Period</CardTitle>
                <CardDescription>How long to retain the data</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField control={form.control} name='retentionDays' render={({ field }) => (
                  <FormItem><FormLabel>Retention Period (days)</FormLabel>
                    <FormControl><Input type='number' min={1} {...field} /></FormControl>
                    <FormDescription>Number of days to retain data before automatic cleanup</FormDescription>
                    <FormMessage /></FormItem>
                )} />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}><ChevronLeft className='mr-2 h-4 w-4' /> Back</Button>
                <Button type='button' onClick={nextStep}>Next <ChevronRight className='ml-2 h-4 w-4' /></Button>
              </CardFooter>
            </Card>
          )}

          {step === 'status' && (
            <Card>
              <CardHeader>
                <CardTitle>Policy Status</CardTitle>
                <CardDescription>Activate the policy on creation</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField control={form.control} name='isActive' render={({ field }) => (
                  <FormItem className='flex items-center gap-2'>
                    <FormControl><Switch checked={field.value ?? true} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className='!mt-0'>Active on creation</FormLabel>
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}><ChevronLeft className='mr-2 h-4 w-4' /> Back</Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Create Policy
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
