import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ComplianceController_createCompliancePolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import type { CreateCompliancePolicyDto } from '@/lib/types/wms-saas-core-api'
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
import { Switch } from '@/components/ui/switch'

const createPolicySchema = z.object({
  policyName: z.string().min(1, 'Policy name is required').max(200),
  policyVersion: z.string().min(1, 'Version is required').max(50),
  policyDescription: z.string().max(1000).optional(),
  policyDocument: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
  isActive: z.boolean().optional(),
})

type CreatePolicyForm = z.input<typeof createPolicySchema>

type Step = 'basic' | 'dates' | 'status'

export function CreateCompliancePolicyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('basic')

  const form = useForm<CreatePolicyForm>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      policyName: '',
      policyVersion: '',
      policyDescription: '',
      policyDocument: '',
      effectiveDate: '',
      reviewDate: '',
      isActive: true,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreatePolicyForm) => {
      const dto: CreateCompliancePolicyDto = {
        policyName: values.policyName,
        policyVersion: values.policyVersion,
      }
      if (values.policyDescription) dto.policyDescription = values.policyDescription
      if (values.policyDocument) dto.policyDocument = values.policyDocument
      if (values.effectiveDate) dto.effectiveDate = new Date(values.effectiveDate).toISOString()
      if (values.reviewDate) dto.reviewDate = new Date(values.reviewDate).toISOString()
      if (values.isActive !== undefined) dto.isActive = values.isActive
      await ComplianceController_createCompliancePolicy(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'policies', 'list'] })
      toast.success('Compliance policy created')
      navigate({ to: '/compliance' })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreatePolicyForm) {
    createMutation.mutate(values)
  }

  function nextStep() {
    if (step === 'basic') setStep('dates')
    else if (step === 'dates') setStep('status')
  }

  function prevStep() {
    if (step === 'dates') setStep('basic')
    else if (step === 'status') setStep('dates')
  }

  function StepIndicator() {
    const steps: { key: Step; label: string }[] = [
      { key: 'basic', label: 'Basic Info' },
      { key: 'dates', label: 'Dates' },
      { key: 'status', label: 'Status' },
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
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/compliance' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create Compliance Policy</h1>
          <p className='text-sm text-muted-foreground'>
            Define a new compliance policy
          </p>
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
                <CardDescription>Policy name, version, and description</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='policyName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Name</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. GDPR Data Protection' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='policyVersion'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. 1.0' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='policyDescription'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder='Policy description' className='resize-none' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='policyDocument'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document URL / Content</FormLabel>
                      <FormControl>
                        <Textarea placeholder='URL or full policy text' className='min-h-[80px]' {...field} />
                      </FormControl>
                      <FormDescription>Link to policy document or paste the content</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-end'>
                <Button type='button' onClick={nextStep}>
                  Next <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'dates' && (
            <Card>
              <CardHeader>
                <CardTitle>Effective & Review Dates</CardTitle>
                <CardDescription>Set policy timeline</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='effectiveDate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='reviewDate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Date</FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}>
                  <ChevronLeft className='mr-2 h-4 w-4' /> Back
                </Button>
                <Button type='button' onClick={nextStep}>
                  Next <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'status' && (
            <Card>
              <CardHeader>
                <CardTitle>Policy Status</CardTitle>
                <CardDescription>Activate or deactivate the policy</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem className='flex items-center gap-2'>
                      <FormControl>
                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className='!mt-0'>Active on creation</FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={prevStep}>
                  <ChevronLeft className='mr-2 h-4 w-4' /> Back
                </Button>
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
