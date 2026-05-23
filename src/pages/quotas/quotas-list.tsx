import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  QuotaController_findAll,
  QuotaController_create,
  QuotaController_getUsageMetrics,
  QuotaController_update,
  QuotaController_recordUsage,
  QuotaController_findOne,
} from '@/lib/api/wms-saas-core-api/resource-quotas-usage/resource-quotas-usage'
import type { CreateResourceQuotaDto, UpdateResourceQuotaDto, RecordUsageMetricDto } from '@/lib/types/wms-saas-core-api'
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
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<ResourceQuota | null>(null)
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordForm, setRecordForm] = useState({ usageAmount: '', unit: '' })

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ResourceQuota> }) => {
      const dto: UpdateResourceQuotaDto = {}
      if (data.limitAmount !== undefined) dto.limitAmount = data.limitAmount
      if (data.autoScale !== undefined) dto.autoScale = data.autoScale
      await QuotaController_update(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas', 'list'] })
      toast.success('Quota updated')
      setEditOpen(false)
      setSelected(null)
    },
    onError: (err) => toast.error((err as Error).message ?? 'Update failed'),
  })

  const recordMutation = useMutation({
    mutationFn: async (dto: RecordUsageMetricDto) => {
      await QuotaController_recordUsage(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['quotas', 'usage-metrics'] })
      toast.success('Usage recorded')
      setRecordOpen(false)
      setRecordForm({ usageAmount: '', unit: '' })
    },
    onError: (err) => toast.error((err as Error).message ?? 'Record failed'),
  })

  function openDetail(q: ResourceQuota) {
    setSelected(q)
    setEditOpen(true)
  }

  function handleRecord(q?: ResourceQuota) {
    if (q) setSelected(q)
    setRecordOpen(true)
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Resource Quotas & Usage'
        description='Monitor and manage resource allocation'
        actions={
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={() => {
              const rows = filtered.map(q => [q.resourceType, q.currentUsage, q.limitAmount, q.autoScale].join(','))
              const csv = ['Resource,Usage,Limit,AutoScale', ...rows].join('\n')
              const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'}))
              const a = document.createElement('a'); a.href=url; a.download='quotas.csv'; a.click(); URL.revokeObjectURL(url)
            }}>CSV</Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Quota
            </Button>
          </div>
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
                   <TableHead className='w-[140px]'>Actions</TableHead>
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
                       <TableCell>
                         <div className='flex gap-1'>
                           <Button size='sm' variant='ghost' onClick={() => openDetail(quota)}>Edit</Button>
                           <Button size='sm' variant='outline' onClick={() => handleRecord(quota)}>Record</Button>
                         </div>
                       </TableCell>
                     </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
         </CardContent>
       </Card>

      {/* Edit / Detail Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quota: {selected?.resourceType}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className='space-y-4 py-2'>
              <div>
                <div className='text-sm text-muted-foreground'>Current Limit</div>
                <Input
                  type='number'
                  defaultValue={selected.limitAmount}
                  onChange={(e) => setSelected({ ...selected, limitAmount: Number(e.target.value) })}
                />
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={!!selected.autoScale}
                  onChange={(e) => setSelected({ ...selected, autoScale: e.target.checked })}
                />
                <span>Auto Scale</span>
              </div>
              <div className='flex gap-2'>
                <Button onClick={() => updateMutation.mutate({ id: selected.id, data: { limitAmount: selected.limitAmount, autoScale: selected.autoScale } })} disabled={updateMutation.isPending}>
                  Save Changes
                </Button>
                <Button variant='outline' onClick={() => handleRecord(selected)}>Record Usage</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Usage Dialog */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Usage for {selected?.resourceType}</DialogTitle>
            <DialogDescription>Manually log consumption</DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <Input
              type='number'
              placeholder='Usage amount'
              value={recordForm.usageAmount}
              onChange={(e) => setRecordForm({ ...recordForm, usageAmount: e.target.value })}
            />
            <Input
              placeholder='Unit (e.g. MB, calls)'
              value={recordForm.unit}
              onChange={(e) => setRecordForm({ ...recordForm, unit: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selected) return
                const dto: RecordUsageMetricDto = {
                  resourceType: selected.resourceType || '',
                  usageAmount: Number(recordForm.usageAmount) || 0,
                }
                if (recordForm.unit) dto.unit = recordForm.unit
                recordMutation.mutate(dto)
              }}
              disabled={recordMutation.isPending || !recordForm.usageAmount}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
     </div>
   )
 }
