import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { IntegrationController_create } from '@/lib/api/wms-saas-core-api/integrations/integrations'
import type { CreateIntegrationDto } from '@/lib/types/wms-saas-core-api'
import { CreateIntegrationDtoStatus } from '@/lib/types/wms-saas-core-api'
import { CreateIntegrationDtoSyncFrequency } from '@/lib/types/wms-saas-core-api'
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
import { Textarea } from '@/components/ui/textarea'

const integrationTypes = ['slack', 'github', 'datadog', 'sentry', 'pagerduty', 'jira', 'custom']

const createSchema = z.object({
  integrationName: z.string().min(1, 'Name is required').max(200),
  integrationType: z.string().min(1, 'Type is required'),
  configJson: z.string().optional(),
  status: z.string().optional(),
  syncFrequency: z.string().optional(),
})

type CreateForm = z.input<typeof createSchema>

type Step = 'basic' | 'config'

export function CreateIntegrationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('basic')

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      integrationName: '',
      integrationType: '',
      configJson: '{}',
      status: 'active',
      syncFrequency: 'hourly',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateForm) => {
      let config: Record<string, unknown> = {}
      try {
        config = values.configJson ? JSON.parse(values.configJson) : {}
      } catch {
        throw new Error('Invalid JSON in configuration')
      }
      const dto: CreateIntegrationDto = {
        integrationName: values.integrationName,
        integrationType: values.integrationType,
        config,
      }
      if (values.status) dto.status = values.status as CreateIntegrationDto['status']
      if (values.syncFrequency) dto.syncFrequency = values.syncFrequency as CreateIntegrationDto['syncFrequency']
      await IntegrationController_create(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] })
      toast.success('Integration created')
      navigate({ to: '/integrations' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to create integration'
      toast.error(msg)
    },
  })

  async function handleNext() {
    if (step === 'basic') {
      const valid = await form.trigger(['integrationName', 'integrationType'])
      if (valid) setStep('config')
    } else if (step === 'config') {
      const valid = await form.trigger(['configJson'])
      if (valid) form.handleSubmit((values) => createMutation.mutate(values))()
    }
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Add Integration</h1>
        <p className='text-sm text-muted-foreground'>Connect a third-party integration to your system</p>
      </div>

      <div className='flex items-center gap-2 text-sm'>
        {(['basic', 'config'] as const).map((s, i) => (
          <div key={s} className='flex items-center gap-2'>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'basic' ? 'Basic Info' : 'Configuration'}
            </span>
            {i < 1 && <Separator className='w-8' />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          {step === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the integration name and type</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='integrationName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Name</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Production Slack' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='integrationType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {integrationTypes.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(CreateIntegrationDtoStatus).map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='syncFrequency'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(CreateIntegrationDtoSyncFrequency).map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>How often the integration syncs data</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-end'>
                <Button type='button' onClick={handleNext}>
                  Next
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'config' && (
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Enter the integration configuration as JSON</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='configJson'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration JSON</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"apiKey": "...", "endpoint": "https://..."}'
                          className='min-h-[200px] font-mono text-sm'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Provide the configuration key-value pairs as valid JSON</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={() => setStep('basic')}>
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Back
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Create Integration
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
