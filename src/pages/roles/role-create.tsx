import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { RoleController_create } from '@/lib/api/wms-saas-core-api/roles/roles'
import { RoleController_findAll } from '@/lib/api/wms-saas-core-api/roles/roles'
import { CreateRoleDtoRoleType } from '@/lib/types/wms-saas-core-api'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

const createRoleSchema = z.object({
  roleName: z.string().min(1, 'Role name is required'),
  roleCode: z
    .string()
    .min(1, 'Role code is required')
    .regex(/^[a-z_]+$/, 'Must be lowercase letters and underscores only'),
  roleDescription: z.string().optional(),
  roleType: z.string().optional(),
  parentRoleId: z.string().optional(),
  assignmentRequiresApproval: z.boolean().default(false),
  autoExpiryEnabled: z.boolean().default(false),
  maxDurationHours: z.number().min(0).optional(),
  isDefaultRole: z.boolean().default(false),
})

type CreateRoleForm = z.input<typeof createRoleSchema>

function useParentRoles() {
  return useQuery({
    queryKey: ['roles', 'parent-candidates'],
    queryFn: async () => {
      const res = await RoleController_findAll({ includeSystem: 'true' })
      return (res as unknown as { data: { id: string; roleName: string }[] }).data ?? []
    },
    staleTime: 60_000,
  })
}

export function CreateRolePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const parentRoles = useParentRoles()

  const form = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      roleName: '',
      roleCode: '',
      roleDescription: '',
      roleType: '',
      parentRoleId: '',
      assignmentRequiresApproval: false,
      autoExpiryEnabled: false,
      maxDurationHours: undefined,
      isDefaultRole: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateRoleForm) => {
      const payload: Parameters<typeof RoleController_create>[0] = {
        roleName: values.roleName,
        roleCode: values.roleCode,
      }
      if (values.roleDescription) payload.roleDescription = values.roleDescription
      if (values.roleType) payload.roleType = values.roleType as typeof CreateRoleDtoRoleType[keyof typeof CreateRoleDtoRoleType]
      if (values.parentRoleId) payload.parentRoleId = values.parentRoleId
      if (values.maxDurationHours && values.maxDurationHours > 0) payload.maxDurationHours = values.maxDurationHours
      if (values.assignmentRequiresApproval) payload.assignmentRequiresApproval = true
      if (values.autoExpiryEnabled) payload.autoExpiryEnabled = true
      if (values.isDefaultRole) payload.isDefaultRole = true
      await RoleController_create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list'] })
      toast.success('Role created successfully')
      navigate({ to: '/roles' })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreateRoleForm) {
    createMutation.mutate(values)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/roles' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create Role</h1>
          <p className='text-sm text-muted-foreground'>
            Define a new role for the platform
          </p>
        </div>
      </div>

      <Separator />

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
          <CardDescription>
            Configure the role's basic properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='roleName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Role Name <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. Support Agent' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='roleCode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Role Code <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. support_agent' {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier. Use lowercase and underscores.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='roleDescription'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Describe what this role can do'
                        className='resize-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='roleType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='system'>System</SelectItem>
                          <SelectItem value='tenant'>Tenant</SelectItem>
                          <SelectItem value='user'>User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='parentRoleId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='None (top-level)' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parentRoles.isLoading ? (
                            <div className='p-2'>
                              <Skeleton className='h-6 w-full' />
                            </div>
                          ) : (
                            (parentRoles.data ?? []).map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.roleName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='maxDurationHours'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Duration (hours)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='Unlimited'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for no limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name='isDefaultRole'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel>Default Role</FormLabel>
                        <FormDescription>
                          Automatically assign to new users
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='assignmentRequiresApproval'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel>Requires Approval</FormLabel>
                        <FormDescription>
                          Role assignments must be approved by an admin
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='autoExpiryEnabled'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel>Auto-Expiry Enabled</FormLabel>
                        <FormDescription>
                          Role assignments expire after the max duration
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className='flex justify-end gap-3'>
                <Button type='button' variant='outline' onClick={() => navigate({ to: '/roles' })}>
                  Cancel
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Create Role
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
