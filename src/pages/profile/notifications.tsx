import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { NotificationController_getPreferences } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import { NotificationController_updatePreferences } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

const prefsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
})

type PrefsForm = z.input<typeof prefsSchema>

export function NotificationPreferencesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: async () => {
      const res = await NotificationController_getPreferences()
      return (res as unknown as {
        emailNotifications?: boolean
        pushNotifications?: boolean
        inAppNotifications?: boolean
        smsNotifications?: boolean
      }) ?? {}
    },
    staleTime: 60_000,
  })

  const form = useForm<PrefsForm>({
    values: {
      emailNotifications: prefs?.emailNotifications ?? true,
      pushNotifications: prefs?.pushNotifications ?? true,
      inAppNotifications: prefs?.inAppNotifications ?? true,
      smsNotifications: prefs?.smsNotifications ?? false,
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      await NotificationController_updatePreferences()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] })
      toast.success('Notification preferences updated')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to update preferences'
      toast.error(msg)
    },
  })

  async function handleSave() {
    await updateMutation.mutateAsync()
  }

  if (isLoading) {
    return (
      <div className='space-y-6 max-w-2xl'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div className='flex items-center gap-3'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/profile' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Notification Preferences</h1>
          <p className='text-sm text-muted-foreground'>Choose how you receive notifications</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Select which channels to use for notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='emailNotifications'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>Email</FormLabel>
                      <FormDescription>Receive notifications via email</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); handleSave() }} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='pushNotifications'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>Push</FormLabel>
                      <FormDescription>Receive push notifications on your devices</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); handleSave() }} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='inAppNotifications'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>In-App</FormLabel>
                      <FormDescription>Receive notifications within the application</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); handleSave() }} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='smsNotifications'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>SMS</FormLabel>
                      <FormDescription>Receive notifications via text message</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); handleSave() }} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
