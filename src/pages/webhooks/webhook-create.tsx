import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { WebhookController_createEndpoint } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_listEvents } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import type { CreateWebhookEndpointDto } from '@/lib/types/wms-saas-core-api'
import type { WebhookControllerListEventsParams } from '@/lib/types/wms-saas-core-api'
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
import { Checkbox } from '@/components/ui/checkbox'

const createSchema = z.object({
  endpointName: z.string().min(1, 'Name is required').max(200),
  endpointUrl: z.string()
    .min(1, 'URL is required')
    .regex(/^https:\/\//, 'URL must use HTTPS')
    .max(500),
  description: z.string().max(500).optional(),
  eventTypes: z.array(z.string()).optional(),
})

type CreateForm = z.input<typeof createSchema>

type Step = 'basic' | 'events'

export function CreateWebhookPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('basic')

  const eventTypesQuery = useQuery({
    queryKey: ['webhooks', 'events', 'list'],
    queryFn: async () => {
      const params: WebhookControllerListEventsParams = { eventType: '', status: '', page: 1, limit: 100 }
      const res = await WebhookController_listEvents(params)
      const events = (res as unknown as { data: { eventType: string }[] }).data ?? []
      return Array.from(new Set(events.map((e) => e.eventType).filter(Boolean))).sort() as string[]
    },
    staleTime: 300_000,
  })

  const availableEventTypes = eventTypesQuery.data ?? []

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      endpointName: '',
      endpointUrl: '',
      description: '',
      eventTypes: [],
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateForm) => {
      const dto: CreateWebhookEndpointDto = {
        endpointName: values.endpointName,
        endpointUrl: values.endpointUrl,
      }
      if (values.description) dto.description = values.description
      if (values.eventTypes && values.eventTypes.length > 0) dto.eventTypes = values.eventTypes
      await WebhookController_createEndpoint(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'endpoints'] })
      toast.success('Webhook endpoint created')
      navigate({ to: '/webhooks' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to create endpoint'
      toast.error(msg)
    },
  })

  async function handleNext() {
    if (step === 'basic') {
      const valid = await form.trigger(['endpointName', 'endpointUrl', 'description'])
      if (valid) setStep('events')
    } else if (step === 'events') {
      const valid = await form.trigger(['eventTypes'])
      if (valid) form.handleSubmit((values) => createMutation.mutate(values))()
    }
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Create Webhook Endpoint</h1>
        <p className='text-sm text-muted-foreground'>Register a new webhook endpoint for event notifications</p>
      </div>

      {/* Stepper */}
      <div className='flex items-center gap-2 text-sm'>
        {(['basic', 'events'] as const).map((s, i) => (
          <div key={s} className='flex items-center gap-2'>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'basic' ? 'Basic Info' : 'Event Types'}
            </span>
            {i < 1 && <Separator className='w-8' />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          {/* Step 1: Basic Info */}
          {step === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the endpoint details and URL</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='endpointName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint Name</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Production Slack Webhook' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='endpointUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint URL</FormLabel>
                      <FormControl>
                        <Input placeholder='https://hooks.example.com/events' {...field} />
                      </FormControl>
                      <FormDescription>Must use HTTPS protocol</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='What is this endpoint used for?'
                          className='min-h-[80px]'
                          {...field}
                        />
                      </FormControl>
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

          {/* Step 2: Event Types */}
          {step === 'events' && (
            <Card>
              <CardHeader>
                <CardTitle>Event Types</CardTitle>
                <CardDescription>Select the events this endpoint should receive (leave empty for all events)</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='eventTypes'
                  render={() => (
                    <FormItem>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                        {eventTypesQuery.isLoading ? (
                          <p className='text-sm text-muted-foreground col-span-2'>Loading event types...</p>
                        ) : availableEventTypes.length === 0 ? (
                          <p className='text-sm text-muted-foreground col-span-2'>No event types available</p>
                        ) : (
                          availableEventTypes.map((ev) => (
                            <FormField
                              key={ev}
                              control={form.control}
                              name='eventTypes'
                              render={({ field }) => (
                                <FormItem className='flex items-center gap-2 space-y-0'>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(ev)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value ?? []
                                        if (checked) {
                                          field.onChange([...current, ev])
                                        } else {
                                          field.onChange(current.filter((v: string) => v !== ev))
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className='text-sm font-normal cursor-pointer font-mono'>{ev}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))
                        )}
                      </div>
                      <FormDescription>If none selected, all event types will be sent to this endpoint</FormDescription>
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
                  Create Endpoint
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
