import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TenantController_create } from '@/lib/api/wms-saas-core-api/tenants/tenants'
import { PlanController_findAll } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
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
import { Separator } from '@/components/ui/separator'

const createTenantSchema = z.object({
  tenantName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be at most 255 characters'),
  domain: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  planId: z.string().optional(),
})

type CreateTenantForm = z.infer<typeof createTenantSchema>

function usePlans() {
  return useQuery({
    queryKey: ['plans', 'list'],
    queryFn: async () => {
      const res = await PlanController_findAll({ includeInactive: 'false' })
      return (res as unknown as { data: Array<{ id: string; name: string }> }).data ?? []
    },
    staleTime: 60_000,
  })
}

export function CreateTenantPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const plans = usePlans()

  const form = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      tenantName: '',
      domain: '',
      locale: '',
      timezone: '',
      planId: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateTenantForm) => {
      await TenantController_create(values as Parameters<typeof TenantController_create>[0])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] })
      toast.success('Tenant created successfully')
      navigate({ to: '/tenants' })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreateTenantForm) {
    const payload = { ...values }
    if (!payload.domain) delete payload.domain
    if (!payload.locale) delete payload.locale
    if (!payload.timezone) delete payload.timezone
    if (!payload.planId) delete payload.planId
    createMutation.mutate(payload)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/tenants' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create Tenant</h1>
          <p className='text-sm text-muted-foreground'>
            Register a new tenant on the platform
          </p>
        </div>
      </div>

      <Separator />

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Tenant Details</CardTitle>
          <CardDescription>
            Fill in the details for the new tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='tenantName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='Acme Corp' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='domain'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain URL</FormLabel>
                    <FormControl>
                      <Input placeholder='https://acme.example.com' {...field} />
                    </FormControl>
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select timezone' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='UTC'>UTC</SelectItem>
                          <SelectItem value='America/New_York'>
                            Eastern (US)
                          </SelectItem>
                          <SelectItem value='America/Chicago'>
                            Central (US)
                          </SelectItem>
                          <SelectItem value='America/Denver'>
                            Mountain (US)
                          </SelectItem>
                          <SelectItem value='America/Los_Angeles'>
                            Pacific (US)
                          </SelectItem>
                          <SelectItem value='Europe/London'>
                            London
                          </SelectItem>
                          <SelectItem value='Europe/Paris'>Paris</SelectItem>
                          <SelectItem value='Asia/Tokyo'>Tokyo</SelectItem>
                          <SelectItem value='Asia/Shanghai'>
                            Shanghai
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='planId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a plan' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.isLoading ? (
                          <div className='p-2'>
                            <Skeleton className='h-6 w-full' />
                          </div>
                        ) : (
                          (plans.data ?? []).map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end gap-3'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => navigate({ to: '/tenants' })}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Create Tenant
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
