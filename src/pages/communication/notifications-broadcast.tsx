import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { NotificationController_broadcast } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import type { BroadcastNotificationDto } from '@/lib/types/wms-saas-core-api'
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

const broadcastSchema = z.object({
  notificationType: z.string().min(1, 'Type is required'),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
  channel: z.array(z.string()).min(1, 'At least one channel is required'),
  recipientRoleCode: z.string().optional(),
  recipientIds: z.string().optional(),
  priority: z.string().optional(),
})

type BroadcastForm = z.input<typeof broadcastSchema>

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
  { value: 'in_app', label: 'In-App' },
  { value: 'sms', label: 'SMS' },
] as const

const NOTIFICATION_TYPES = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'alert', label: 'Alert' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'system', label: 'System' },
] as const

type Step = 'type' | 'content' | 'recipients'

export function BroadcastNotificationPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('type')

  const form = useForm<BroadcastForm>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      notificationType: '',
      title: '',
      content: '',
      channel: [],
      recipientRoleCode: '',
      recipientIds: '',
      priority: 'normal',
    },
  })

  const channel = form.watch('channel')

  async function handleSubmit(values: BroadcastForm) {
    const dto: BroadcastNotificationDto = {
      channel: values.channel.join(','),
      notificationType: values.notificationType,
      priority: values.priority || 'normal',
      variables: { title: values.title, content: values.content },
    }
    if (values.recipientRoleCode) dto.recipientRoleCode = values.recipientRoleCode
    if (values.recipientIds) {
      dto.recipientIds = values.recipientIds.split(',').map((s) => s.trim()).filter(Boolean)
    }
    try {
      await NotificationController_broadcast(dto)
      toast.success('Broadcast sent successfully')
      navigate({ to: '/notifications' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to send broadcast'
      toast.error(msg)
    }
  }

  async function handleNext() {
    let valid = false
    if (step === 'type') {
      valid = await form.trigger(['notificationType', 'priority'])
      if (valid) setStep('content')
    } else if (step === 'content') {
      valid = await form.trigger(['title', 'content', 'channel'])
      if (valid) setStep('recipients')
    } else if (step === 'recipients') {
      form.handleSubmit(handleSubmit)()
    }
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Broadcast Notification</h1>
        <p className='text-sm text-muted-foreground'>Send a notification to specific users, roles, or tenants</p>
      </div>

      {/* Stepper */}
      <div className='flex items-center gap-2 text-sm'>
        {(['type', 'content', 'recipients'] as const).map((s, i) => (
          <div key={s} className='flex items-center gap-2'>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'type' ? 'Type & Priority' : s === 'content' ? 'Content & Channels' : 'Recipients'}
            </span>
            {i < 2 && <Separator className='w-8' />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Step 1: Type & Priority */}
          {step === 'type' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Type & Priority</CardTitle>
                <CardDescription>Choose the type and priority of your broadcast</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='notificationType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NOTIFICATION_TYPES.map((t) => (
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
                  name='priority'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select priority' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='normal'>Normal</SelectItem>
                          <SelectItem value='high'>High</SelectItem>
                        </SelectContent>
                      </Select>
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

          {/* Step 2: Content & Channels */}
          {step === 'content' && (
            <Card>
              <CardHeader>
                <CardTitle>Message Content & Channels</CardTitle>
                <CardDescription>Write your message and select delivery channels</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title / Subject</FormLabel>
                      <FormControl>
                        <Input placeholder='Notification title' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='content'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Write your notification message...'
                          className='min-h-[120px]'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='channel'
                  render={() => (
                    <FormItem>
                      <FormLabel>Channels</FormLabel>
                      <FormDescription>Select one or more delivery channels</FormDescription>
                      <div className='flex flex-wrap gap-4'>
                        {CHANNEL_OPTIONS.map((ch) => (
                          <FormField
                            key={ch.value}
                            control={form.control}
                            name='channel'
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
                      {channel?.length === 0 && <p className='text-sm text-destructive'>At least one channel required</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={() => setStep('type')}>
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

          {/* Step 3: Recipients */}
          {step === 'recipients' && (
            <Card>
              <CardHeader>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>Specify who should receive this notification</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='recipientRoleCode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Role (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a role' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='saas_admin'>SaaS Admin</SelectItem>
                          <SelectItem value='tenant_admin'>Tenant Admin</SelectItem>
                          <SelectItem value='tenant_user'>Tenant User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Send to all users with this role</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='recipientIds'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific User IDs (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder='user-id-1, user-id-2, ...' {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of user IDs</FormDescription>
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
                <Button type='submit' disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  <Send className='mr-2 h-4 w-4' />
                  Send Broadcast
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
