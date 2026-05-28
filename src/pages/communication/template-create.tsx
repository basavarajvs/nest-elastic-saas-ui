import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TemplateController_create } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

const createSchema = z.object({
  templateName: z.string().min(1, 'Name is required').max(200),
  templateType: z.string().min(1, 'Type is required'),
  subject: z.string().min(1, 'Subject is required').max(500),
  content: z.string().min(1, 'Content is required').max(10000),
  channels: z.array(z.string()).min(1, 'At least one channel is required'),
  isActive: z.boolean().optional(),
  variablesSchema: z.string().optional(),
})

type CreateForm = z.input<typeof createSchema>

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
  { value: 'in_app', label: 'In-App' },
  { value: 'sms', label: 'SMS' },
] as const

const TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'alert', label: 'Alert' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'verification', label: 'Verification' },
] as const

type Step = 'basic' | 'content' | 'channels'

export function CreateNotificationTemplatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('basic')

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      templateName: '',
      templateType: '',
      subject: '',
      content: '',
      channels: [],
      isActive: true,
      variablesSchema: '',
    },
  })

  const channels = form.watch('channels')

  const createMutation = useMutation({
    mutationFn: async (values: CreateForm) => {
      const body: Record<string, unknown> = {
        templateName: values.templateName,
        templateType: values.templateType,
        subject: values.subject,
        content: values.content,
        channels: values.channels,
        isActive: values.isActive ?? true,
      }
      if (values.variablesSchema) {
        try {
          body.variablesSchema = JSON.parse(values.variablesSchema)
        } catch { /* ignore invalid json */ }
      }
      await TemplateController_create({ body: JSON.stringify(body) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      toast.success('Template created')
      navigate({ to: '/notification-templates' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to create template'
      toast.error(msg)
    },
  })

  async function handleNext() {
    if (step === 'basic') {
      const valid = await form.trigger(['templateName', 'templateType', 'isActive'])
      if (valid) setStep('content')
    } else if (step === 'content') {
      const valid = await form.trigger(['subject', 'content', 'variablesSchema'])
      if (valid) setStep('channels')
    } else if (step === 'channels') {
      const valid = await form.trigger(['channels'])
      if (valid) form.handleSubmit((values) => createMutation.mutate(values))()
    }
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Create Notification Template</h1>
        <p className='text-sm text-muted-foreground'>Define a reusable notification template</p>
      </div>

      {/* Stepper */}
      <div className='flex items-center gap-2 text-sm'>
        {(['basic', 'content', 'channels'] as const).map((s, i) => (
          <div key={s} className='flex items-center gap-2'>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'basic' ? 'Basic Info' : s === 'content' ? 'Content' : 'Channels'}
            </span>
            {i < 2 && <Separator className='w-8' />}
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
                <CardDescription>Name and type for the template</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='templateName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Welcome Email' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='templateType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEMPLATE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Enable this template for use</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
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

          {/* Step 2: Content */}
          {step === 'content' && (
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardDescription>Subject line and message body with optional variables</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='subject'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject / Title</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Welcome {{user.name}}!' {...field} />
                      </FormControl>
                      <FormDescription>Use {'{{variable}}'} syntax for dynamic values</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='content'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Body</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Write your template content...'
                          className='min-h-[150px]'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Use {'{{variable}}'} syntax for dynamic values</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='variablesSchema'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variables Schema (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"name": "string", "email": "string"}'
                          className='min-h-[80px] font-mono text-xs'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Define expected variables and their types</FormDescription>
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
                <Button type='button' onClick={handleNext}>
                  Next
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 3: Channels */}
          {step === 'channels' && (
            <Card>
              <CardHeader>
                <CardTitle>Channels</CardTitle>
                <CardDescription>Select which delivery channels this template supports</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='channels'
                  render={() => (
                    <FormItem>
                      <FormLabel>Available Channels</FormLabel>
                      <FormDescription>Choose one or more channels</FormDescription>
                      <div className='flex flex-wrap gap-4'>
                        {CHANNEL_OPTIONS.map((ch) => (
                          <FormField
                            key={ch.value}
                            control={form.control}
                            name='channels'
                            render={({ field }) => (
                              <FormItem className='flex items-center gap-2 space-y-0'>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(ch.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value ?? []
                                      if (checked) {
                                        field.onChange([...current, ch.value])
                                      } else {
                                        field.onChange(current.filter((v: string) => v !== ch.value))
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='text-sm font-normal cursor-pointer'>{ch.label}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      {channels?.length === 0 && <p className='text-sm text-destructive'>At least one channel required</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={() => setStep('content')}>
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Back
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Create Template
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
