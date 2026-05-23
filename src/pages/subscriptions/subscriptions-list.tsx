import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowUpDown,
  Ban,
  ChevronUp,
  ChevronDown,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionController_findAll } from '@/lib/api/wms-saas-core-api/subscriptions-billing/subscriptions-billing'
import { customInstance } from '@/lib/http/httpClient'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select as PlanSelect,
  SelectContent as PlanSelectContent,
  SelectItem as PlanSelectItem,
  SelectTrigger as PlanSelectTrigger,
  SelectValue as PlanSelectValue,
} from '@/components/ui/select'
import { PlanController_findAll } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'

interface Subscription {
  id: string
  tenantId?: string
  tenantName?: string
  planId?: string
  planName?: string
  status: string
  startDate: string
  nextBillingDate?: string
  endDate?: string
  price?: number
  currency?: string
  billingType?: string
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try { return format(new Date(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function statusStyle(status: string): string {
  return STATUS_STYLES[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-800'
}

function formatPrice(price?: number, currency?: string): string {
  if (price === undefined || price === null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(price)
}

export function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<'startDate' | 'price' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)
  const [changePlanTarget, setChangePlanTarget] = useState<{ sub: Subscription; action: 'upgrade' | 'downgrade' } | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['subscriptions', 'all'],
    queryFn: async () => {
      const res = await SubscriptionController_findAll()
      return (res as unknown as { data: Subscription[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const plans = useQuery({
    queryKey: ['billing-plans', 'active'],
    queryFn: async () => {
      const res = await PlanController_findAll({ includeInactive: 'false' })
      return (res as unknown as { data: { id: string; planName: string; price?: number }[] }).data ?? []
    },
    staleTime: 60_000,
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await customInstance(`/api/v1/subscriptions/${id}/cancel`, { method: 'PATCH' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'all'] })
      toast.success('Subscription cancelled')
      setCancelTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to cancel subscription'),
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, action, planId }: { id: string; action: string; planId: string }) => {
      await customInstance(`/api/v1/subscriptions/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'all'] })
      toast.success(`Subscription ${changePlanTarget?.action === 'upgrade' ? 'upgraded' : 'downgrade scheduled'}`)
      setChangePlanTarget(null)
      setSelectedPlanId('')
    },
    onError: (err: Error) => toast.error(err.message ?? `Failed to ${changePlanTarget?.action} subscription`),
  })

  const toggleSort = (field: 'startDate' | 'price') => {
    if (sortField === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')) }
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let result = [...data]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s) =>
        (s.tenantName ?? '').toLowerCase().includes(q) ||
        (s.planName ?? '').toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q))
    }
    if (statusFilter) result = result.filter((s) => s.status === statusFilter)
    if (sortField === 'startDate') {
      result.sort((a, b) => sortDir === 'asc'
        ? new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        : new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    } else if (sortField === 'price') {
      result.sort((a, b) => sortDir === 'asc' ? (a.price ?? 0) - (b.price ?? 0) : (b.price ?? 0) - (a.price ?? 0))
    }
    return result
  }, [data, search, statusFilter, sortField, sortDir])

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Subscriptions'
        description='Manage tenant subscriptions across the platform'
        actions={<Button asChild><Link to='/subscriptions/new'><Plus className='mr-2 h-4 w-4' />Create Subscription</Link></Button>}
      />

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <div className='relative flex-1 min-w-[200px] max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input placeholder='Search by tenant, plan, or ID...' value={search} onChange={(e) => { setSearch(e.target.value); setStatusFilter('') }} className='pl-8' />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === ' ' ? '' : v)}>
                <SelectTrigger className='w-[150px]'><SelectValue placeholder='All Status' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='cancelled'>Cancelled</SelectItem>
                  <SelectItem value='expired'>Expired</SelectItem>
                  <SelectItem value='suspended'>Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant='outline' size='icon' onClick={() => refetch()}><RefreshCw className='h-4 w-4' /></Button>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead className='hidden md:table-cell'>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden sm:table-cell'>
                    <button onClick={() => toggleSort('startDate')} className='flex items-center gap-1 text-xs font-medium'>Start <ArrowUpDown className='h-3 w-3' /></button>
                  </TableHead>
                  <TableHead className='hidden lg:table-cell'>Next Billing</TableHead>
                  <TableHead className='hidden sm:table-cell'>
                    <button onClick={() => toggleSort('price')} className='flex items-center gap-1 text-xs font-medium'>Amount <ArrowUpDown className='h-3 w-3' /></button>
                  </TableHead>
                  <TableHead className='w-[110px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className='font-medium'>{sub.tenantName ?? sub.tenantId ?? '-'}</TableCell>
                    <TableCell className='hidden md:table-cell text-sm'>{sub.planName ?? sub.planId ?? '-'}</TableCell>
                    <TableCell><Badge variant='outline' className={statusStyle(sub.status)}>{sub.status}</Badge></TableCell>
                    <TableCell className='hidden sm:table-cell text-sm text-muted-foreground'>{formatDate(sub.startDate)}</TableCell>
                    <TableCell className='hidden lg:table-cell text-sm text-muted-foreground'>{formatDate(sub.nextBillingDate)}</TableCell>
                    <TableCell className='hidden sm:table-cell font-mono text-sm'>{formatPrice(sub.price, sub.currency)}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View' asChild>
                          <Link to='/subscriptions/$id' params={{ id: sub.id }}><Eye className='h-4 w-4' /></Link>
                        </Button>
                        {sub.status === 'active' && (
                          <>
                            <Button variant='ghost' size='icon' className='h-8 w-8 text-amber-600' title='Cancel'
                              onClick={() => setCancelTarget(sub)}><Ban className='h-4 w-4' /></Button>
                            <Button variant='ghost' size='icon' className='h-8 w-8' title='Upgrade'
                              onClick={() => setChangePlanTarget({ sub, action: 'upgrade' })}><ChevronUp className='h-4 w-4' /></Button>
                            <Button variant='ghost' size='icon' className='h-8 w-8' title='Downgrade'
                              onClick={() => setChangePlanTarget({ sub, action: 'downgrade' })}><ChevronDown className='h-4 w-4' /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel this subscription for "{cancelTarget?.tenantName ?? cancelTarget?.tenantId}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget.id) }}>Confirm Cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!changePlanTarget} onOpenChange={(o) => { if (!o) { setChangePlanTarget(null); setSelectedPlanId('') }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{changePlanTarget?.action === 'upgrade' ? 'Upgrade' : 'Downgrade'} Subscription</DialogTitle>
            <DialogDescription>
              Select a new plan for {changePlanTarget?.sub.tenantName ?? changePlanTarget?.sub.tenantId}.
              Current plan: <strong>{changePlanTarget?.sub.planName ?? changePlanTarget?.sub.planId}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <Label>New Plan</Label>
            <PlanSelect value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <PlanSelectTrigger><PlanSelectValue placeholder='Select a plan' /></PlanSelectTrigger>
              <PlanSelectContent>
                {(plans.data ?? []).filter((p) => p.id !== changePlanTarget?.sub.planId).map((p) => (
                  <PlanSelectItem key={p.id} value={p.id}>{p.planName}{p.price ? ` ($${p.price})` : ''}</PlanSelectItem>
                ))}
              </PlanSelectContent>
            </PlanSelect>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => { setChangePlanTarget(null); setSelectedPlanId('') }}>Cancel</Button>
            <Button disabled={!selectedPlanId || changePlanMutation.isPending}
              onClick={() => {
                if (changePlanTarget && selectedPlanId) {
                  changePlanMutation.mutate({ id: changePlanTarget.sub.id, action: changePlanTarget.action, planId: selectedPlanId })
                }
              }}>
              {changePlanMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Confirm {changePlanTarget?.action === 'upgrade' ? 'Upgrade' : 'Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
