import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { UserController_create } from '@/lib/api/wms-saas-core-api/users/users'
import { RoleController_findAll } from '@/lib/api/wms-saas-core-api/roles/roles'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm the password'),
  roleId: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  sendInvite: z.boolean().default(false),
})

type CreateUserForm = z.input<typeof createUserSchema>

function useRolesList() {
  return useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      const res = await RoleController_findAll({ includeSystem: 'true' })
      return (res as unknown as { data: { id: string; name: string }[] }).data ?? []
    },
    staleTime: 60_000,
  })
}

export function CreateUserPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const roles = useRolesList()

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleId: '',
      locale: '',
      timezone: '',
      sendInvite: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateUserForm) => {
      if (values.password !== values.confirmPassword) {
        throw new Error('Passwords do not match')
      }
      const payload: Parameters<typeof UserController_create>[0] = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        sendInvite: values.sendInvite,
      }
      if (values.roleId) payload.roleIds = [values.roleId]
      await UserController_create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('User created successfully')
      navigate({ to: '/users' })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreateUserForm) {
    createMutation.mutate(values)
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Create User'
        description='Create a new user account'
        actions={
          <Button variant='outline' onClick={() => navigate({ to: '/users' })}>
            Cancel
          </Button>
        }
      />

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Fill in the details for the new user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='firstName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        First Name <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder='John' {...field} />
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
                      <FormLabel>
                        Last Name <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder='Doe' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type='email' placeholder='john@example.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type='password' placeholder='Min. 8 characters' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Confirm Password <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type='password' placeholder='Re-enter password' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='roleId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a role (optional)' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.isLoading ? (
                          <div className='p-2'>
                            <Skeleton className='h-6 w-full' />
                          </div>
                        ) : (
                          (roles.data ?? []).map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='locale'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locale</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select locale' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='en'>English</SelectItem>
                          <SelectItem value='es'>Spanish</SelectItem>
                          <SelectItem value='fr'>French</SelectItem>
                          <SelectItem value='de'>German</SelectItem>
                          <SelectItem value='ja'>Japanese</SelectItem>
                          <SelectItem value='zh'>Chinese</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select timezone' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='UTC'>UTC</SelectItem>
                          <SelectItem value='America/New_York'>Eastern (US)</SelectItem>
                          <SelectItem value='America/Chicago'>Central (US)</SelectItem>
                          <SelectItem value='America/Denver'>Mountain (US)</SelectItem>
                          <SelectItem value='America/Los_Angeles'>Pacific (US)</SelectItem>
                          <SelectItem value='Europe/London'>London</SelectItem>
                          <SelectItem value='Europe/Paris'>Paris</SelectItem>
                          <SelectItem value='Asia/Tokyo'>Tokyo</SelectItem>
                          <SelectItem value='Asia/Shanghai'>Shanghai</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='sendInvite'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>Send invite email</FormLabel>
                      <FormDescription>
                        The user will receive a welcome email with setup instructions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className='flex justify-end'>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Create User
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
