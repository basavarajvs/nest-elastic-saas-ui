import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { QuotaController_findAll } from '@/lib/api/wms-saas-core-api/resource-quotas-usage/resource-quotas-usage'
import { QuotaController_create } from '@/lib/api/wms-saas-core-api/resource-quotas-usage/resource-quotas-usage'
import { QuotaController_getUsageMetrics } from '@/lib/api/wms-saas-core-api/resource-quotas-usage/resource-quotas-usage'
import type { CreateResourceQuotaDto } from '@/lib/types/wms-saas-core-api'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface ResourceQuota {
  id: string
  resourceType?: string
  limitAmount?: number
  currentUsage?: number
  autoScale?: boolean
  createdAt?: string
  updatedAt?: string
}

interface UsageMetric {
  resourceType?: string
  usage?: number
  unit?: string
  timestamp?: string
}

const createQuotaSchema = z.object({
  resourceType: z.string().min(1, 'Resource type is required'),
  limitAmount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currentUsage: z.string().optional(),
  autoScale: z.boolean().optional(),
})

type CreateQuotaForm = z.input<typeof createQuotaSchema>

export function ResourceQuotasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: quotasData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['quotas', 'list'],
    queryFn: async () => {
      const res = await QuotaController_findAll()
      return (res as unknown as { data: ResourceQuota[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const { data: metricsData } = useQuery({
    queryKey: ['quotas', 'usage-metrics'],
    queryFn: async () => {
      const res = await QuotaController_getUsageMetrics()
      return (res as unknown as { data: UsageMetric[] }).data ?? []
    },
    staleTime: 60_000,
  })

  const quotas = (quotasData ?? []) as ResourceQuota[]
  const usageMetrics = (metricsData ?? []) as UsageMetric[]

  const filtered = quotas.filter((q) => {
    if (!search) return true
    return q.resourceType?.toLowerCase().includes(search.toLowerCase())
  })

  const totalQuotaLimit = quotas.reduce((sum, q) => sum + (q.limitAmount ?? 0), 0)
  const totalUsage = quotas.reduce((sum, q) => sum + (q.currentUsage ?? 0), 0)
  const usagePercent = totalQuotaLimit > 0 ? Math.round((totalUsage / totalQuotaLimit) * 100) : 0

  const form = useForm<CreateQuotaForm>({
    resolver: zodResolver(createQuotaSchema),
    defaultValues: {
      resourceType: '',
      limitAmount: '',
      currentUsage: '0',
      autoScale: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateQuotaForm) => {
      const dto: CreateResourceQuotaDto = {
        resourceType: values.resourceType,
        limitAmount: Number(values.limitAmount),
      }
      if (values.currentUsage) dto.currentUsage = Number(values.currentUsage)
      if (values.autoScale) dto.autoScale = true
      await QuotaController_create(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas', 'list'] })
      toast.success('Resource quota created')
      setCreateOpen(false)
      form.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to create quota'
      toast.error(msg)
    },
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Resource Quotas & Usage'
        description='Monitor and manage resource allocation'
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add Quota
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Resource Quota</DialogTitle>
            <DialogDescription>Define a new resource quota limit</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className='space-y-4'>
                <FormField
                  control={form.control}
                  name='resourceType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resource Type</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. storage_gb, api_calls' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='limitAmount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limit Amount</FormLabel>
                      <FormControl>
                        <Input type='number' min='1' step='any' placeholder='100' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='currentUsage'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Usage (optional)</FormLabel>
                      <FormControl>
                        <Input type='number' min='0' step='any' placeholder='0' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='autoScale'
                  render={({ field }) => (
                    <FormItem className='flex items-center gap-2'>
                      <FormControl>
                        <input
                          type='checkbox'
                          checked={field.value ?? false}
                          onChange={field.onChange}
                          className='h-4 w-4'
                        />
                      </FormControl>
                      <FormLabel className='!mt-0'>Auto-scale when approaching limit</FormLabel>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type='submit' disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {!isLoading && (
        <div className='grid gap-4 grid-cols-1 sm:grid-cols-3'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Total Quotas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-3xl font-bold'>{quotas.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Total Limit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-3xl font-bold'>{totalQuotaLimit.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Overall Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-3xl font-bold'>{usagePercent}%</p>
              <p className='text-xs text-muted-foreground mt-1'>{totalUsage.toLocaleString()} / {totalQuotaLimit.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {usageMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Usage Metrics</CardTitle>
            <CardDescription>Recent resource usage measurements</CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className='hidden sm:table-cell'>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageMetrics.map((m, i) => (
                  <TableRow key={`${m.resourceType}-${i}`}>
                    <TableCell className='font-medium'>{m.resourceType ?? '-'}</TableCell>
                    <TableCell>{m.usage?.toLocaleString() ?? '-'}</TableCell>
                    <TableCell>{m.unit ?? '-'}</TableCell>
                    <TableCell className='hidden sm:table-cell text-sm text-muted-foreground'>
                      {m.timestamp ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search quotas...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-8'
              />
            </div>
            <Button variant='outline' size='icon' onClick={() => refetch()}>
              <RefreshCw className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState title={search ? 'No quotas match your search' : 'No resource quotas found'} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Auto-scale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((quota) => {
                  const usage = quota.currentUsage ?? 0
                  const limit = quota.limitAmount ?? 1
                  const pct = Math.min(Math.round((usage / limit) * 100), 100)
                  const barColor =
                    pct >= 90 ? 'bg-red-500' :
                    pct >= 75 ? 'bg-amber-500' :
                    'bg-green-500'
                  return (
                    <TableRow key={quota.id}>
                      <TableCell className='font-medium capitalize'>{quota.resourceType ?? '-'}</TableCell>
                      <TableCell className='text-sm'>{usage.toLocaleString()}</TableCell>
                      <TableCell className='text-sm'>{limit.toLocaleString()}</TableCell>
                      <TableCell className='min-w-[200px]'>
                        <div className='flex items-center gap-2'>
                          <div className='flex-1 h-2 bg-muted rounded-full overflow-hidden'>
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className='text-xs font-medium w-10 text-right'>{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={quota.autoScale ? 'default' : 'secondary'}>
                          {quota.autoScale ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
