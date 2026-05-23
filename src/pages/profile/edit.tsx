import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { UserController_getMe } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_updateMe } from '@/lib/api/wms-saas-core-api/users/users'
import type { UpdateUserDto } from '@/lib/types/wms-saas-core-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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

interface UserProfile {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  bio?: string
  locale?: string
  timezone?: string
}

const editSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  bio: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
})

type EditForm = z.input<typeof editSchema>

const LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN', 'pt-BR'] as const
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland',
] as const

export function EditProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await UserController_getMe()
      return (res as unknown as { data: UserProfile }).data ?? ({} as UserProfile)
    },
    staleTime: 60_000,
  })

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: profile ? {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      bio: profile.bio ?? '',
      phone: profile.phone ?? '',
      locale: profile.locale ?? '',
      timezone: profile.timezone ?? '',
    } : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      const dto: UpdateUserDto = {
        firstName: values.firstName,
        lastName: values.lastName,
      }
      if (values.bio) dto.bio = values.bio
      if (values.phone) dto.phone = values.phone
      if (values.locale) dto.locale = values.locale
      if (values.timezone) dto.timezone = values.timezone
      await UserController_updateMe(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      toast.success('Profile updated')
      navigate({ to: '/profile' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to update profile'
      toast.error(msg)
    },
  })

  if (isLoading) {
    return (
      <div className='space-y-6 max-w-2xl'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-96 w-full' />
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
          <h1 className='text-2xl font-bold tracking-tight'>Edit Profile</h1>
          <p className='text-sm text-muted-foreground'>Update your personal information</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='firstName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='lastName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder='+1 (555) 123-4567' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='bio'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder='Tell us about yourself' className='min-h-[80px]' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='locale'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locale</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select locale' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LOCALES.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Your preferred language and region</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='timezone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select timezone' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Your local timezone</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className='justify-between'>
              <Button type='button' variant='outline' onClick={() => navigate({ to: '/profile' })}>Cancel</Button>
              <Button type='submit' disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}
