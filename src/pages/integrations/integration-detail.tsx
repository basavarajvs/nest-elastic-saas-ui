import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Activity,
  ArrowLeft,
  Loader2,
  ShieldX,
} from 'lucide-react'
import { toast } from 'sonner'
import { IntegrationController_findOne } from '@/lib/api/wms-saas-core-api/integrations/integrations'
import { IntegrationController_update } from '@/lib/api/wms-saas-core-api/integrations/integrations'
import { IntegrationController_remove } from '@/lib/api/wms-saas-core-api/integrations/integrations'
import { IntegrationController_getHealth } from '@/lib/api/wms-saas-core-api/integrations/integrations'
import type { UpdateIntegrationDto } from '@/lib/types/wms-saas-core-api'
import { UpdateIntegrationDtoStatus } from '@/lib/types/wms-saas-core-api'
import { UpdateIntegrationDtoSyncFrequency } from '@/lib/types/wms-saas-core-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface IntegrationDetail {
  id: string
  integrationName?: string
  integrationType?: string
  description?: string
  status?: string
  syncFrequency?: string
  config?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

const editSchema = z.object({
  integrationName: z.string().min(1, 'Name is required').max(200),
  status: z.string().optional(),
  syncFrequency: z.string().optional(),
})

type EditForm = z.input<typeof editSchema>

export function IntegrationDetailPage() {
  const { id } = useParams({ from: '/_authenticated/integrations/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [showHealth, setShowHealth] = useState<{ status: string; detail?: string } | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['integrations', 'detail', id],
    queryFn: async () => {
      const res = await IntegrationController_findOne(id)
      return (res as unknown as { data: IntegrationDetail }).data ?? ({} as IntegrationDetail)
    },
    enabled: !!id,
    staleTime: 30_000,
  })

  const integration = (data ?? {}) as IntegrationDetail

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: {
      integrationName: integration.integrationName ?? '',
      status: integration.status ?? '',
      syncFrequency: integration.syncFrequency ?? '',
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      const dto: UpdateIntegrationDto = {
        integrationName: values.integrationName,
      }
      if (values.status) dto.status = values.status as UpdateIntegrationDto['status']
      if (values.syncFrequency) dto.syncFrequency = values.syncFrequency as UpdateIntegrationDto['syncFrequency']
      await IntegrationController_update(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'detail', id] })
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] })
      toast.success('Integration updated')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to update'
      toast.error(msg)
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      await IntegrationController_remove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] })
      toast.success('Integration deactivated')
      navigate({ to: '/integrations' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to deactivate'
      toast.error(msg)
    },
  })

  async function checkHealth() {
    setHealthLoading(true)
    try {
      const res = await IntegrationController_getHealth(id)
      const health = (res as unknown as { data: { status: string; detail?: string } }).data ?? { status: 'unknown' }
      setShowHealth(health)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Health check failed'
      toast.error(msg)
    } finally {
      setHealthLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className='space-y-6 max-w-2xl'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' size='sm' onClick={() => navigate({ to: '/integrations' })}>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back
        </Button>
        <div className='text-center text-sm text-destructive'>
          Failed to load integration: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div className='flex items-center gap-3'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/integrations' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div className='flex-1'>
          <h1 className='text-2xl font-bold tracking-tight'>{integration.integrationName ?? 'Integration'}</h1>
          <p className='text-sm text-muted-foreground'>{integration.integrationType}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={checkHealth} disabled={healthLoading}>
            {healthLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Activity className='mr-2 h-4 w-4' />}
            Check Health
          </Button>
          <Button variant='destructive' size='sm' onClick={() => setDeactivateOpen(true)}>
            <ShieldX className='mr-2 h-4 w-4' />
            Deactivate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Integration information and settings</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-muted-foreground'>Integration ID</span>
              <p className='font-mono text-xs mt-1'>{integration.id}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>Status</span>
              <p className='mt-1'>
                <Badge
                  variant={integration.status === 'active' ? 'default' : integration.status === 'error' ? 'destructive' : 'secondary'}
                >
                  {integration.status ?? 'unknown'}
                </Badge>
              </p>
            </div>
            <div>
              <span className='text-muted-foreground'>Type</span>
              <p className='mt-1 font-medium capitalize'>{integration.integrationType}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>Sync Frequency</span>
              <p className='mt-1 font-medium capitalize'>{integration.syncFrequency ?? 'N/A'}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>Created</span>
              <p className='mt-1'>{formatDate(integration.createdAt)}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>Last Updated</span>
              <p className='mt-1'>{integration.updatedAt ? formatDate(integration.updatedAt) : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(integration.config && Object.keys(integration.config).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='bg-muted p-4 rounded-lg text-sm font-mono overflow-auto max-h-48'>
              {JSON.stringify(integration.config, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Edit Integration</CardTitle>
          <CardDescription>Update integration settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className='space-y-4'>
              <FormField
                control={form.control}
                name='integrationName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Integration Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(UpdateIntegrationDtoStatus).map((s) => (
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
                        {Object.values(UpdateIntegrationDtoSyncFrequency).map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' size='sm' disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Health Dialog */}
      <AlertDialog open={!!showHealth} onOpenChange={() => setShowHealth(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Health Check Result</AlertDialogTitle>
          </AlertDialogHeader>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>Status:</span>
              <Badge variant={showHealth?.status === 'healthy' ? 'default' : 'destructive'}>
                {showHealth?.status ?? 'unknown'}
              </Badge>
            </div>
            {showHealth?.detail && (
              <p className='text-sm text-muted-foreground'>{showHealth.detail}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{integration.integrationName}"? This will disable the integration connection and stop all data syncs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => deactivateMutation.mutate()}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
