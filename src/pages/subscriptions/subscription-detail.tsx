import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Ban,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionController_findOne } from '@/lib/api/wms-saas-core-api/subscriptions-billing/subscriptions-billing'
import { SubscriptionController_getBillingCycles } from '@/lib/api/wms-saas-core-api/subscriptions-billing/subscriptions-billing'
import { SubscriptionController_cancel, SubscriptionController_downgrade, SubscriptionController_upgrade } from '@/lib/api/wms-saas-core-api/billing-subscriptions/billing-subscriptions'
import { customInstance } from '@/lib/http/httpClient'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PlanController_findAll } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'

interface SubscriptionDetail {
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
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface BillingCycle {
  id: string
  periodStart: string
  periodEnd?: string
  amount?: number
  status?: string
  createdAt?: string
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const CYCLE_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try { return format(new Date(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}
function formatPrice(price?: number, currency?: string): string {
  if (price === undefined || price === null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(price)
}

export function SubscriptionDetailPage() {
  const { id: subId } = useParams({ from: '/_authenticated/subscriptions/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [changePlanDialog, setChangePlanDialog] = useState<{ action: 'upgrade' | 'downgrade' } | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const sub = useQuery({
    queryKey: ['subscriptions', 'detail', subId],
    queryFn: async () => {
      const res = await SubscriptionController_findOne(subId)
      return (res as unknown as { data: SubscriptionDetail }).data
    },
    enabled: !!subId,
    staleTime: 30_000,
  })

  const billingCycles = useQuery({
    queryKey: ['subscriptions', 'billing-cycles', subId],
    queryFn: async () => {
      const res = await SubscriptionController_getBillingCycles(subId)
      return (res as unknown as { data: BillingCycle[] }).data ?? []
    },
    enabled: !!subId,
    staleTime: 30_000,
  })

  const plans = useQuery({
    queryKey: ['billing-plans', 'all-for-change'],
    queryFn: async () => {
      const res = await PlanController_findAll({ includeInactive: 'false' })
      return (res as unknown as { data: { id: string; planName: string; price?: number }[] }).data ?? []
    },
    staleTime: 60_000,
  })

  const cancelMutation = useMutation({
    mutationFn: async () => { await SubscriptionController_cancel(subId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription cancelled')
      setConfirmCancel(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to cancel'),
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ action, planId }: { action: string; planId: string }) => {
      if (action === 'upgrade') {
        await SubscriptionController_upgrade(subId, { planId })
      } else {
        await SubscriptionController_downgrade(subId, { planId })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success(`Subscription ${changePlanDialog?.action === 'upgrade' ? 'upgraded' : 'downgrade scheduled'}`)
      setChangePlanDialog(null)
      setSelectedPlanId('')
    },
    onError: (err: Error) => toast.error(err.message ?? `Failed to ${changePlanDialog?.action}`),
  })

  const data = sub.data
  const isActive = data?.status === 'active'

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/subscriptions' })}><ArrowLeft className='h-4 w-4' /></Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{sub.isLoading ? 'Loading...' : `Subscription: ${data?.tenantName ?? data?.tenantId ?? '-'}`}</h1>
          <p className='text-sm text-muted-foreground'>Subscription details and billing cycles</p>
        </div>
        {!sub.isLoading && isActive && (
          <div className='ml-auto flex items-center gap-2'>
            <Button variant='outline' onClick={() => setChangePlanDialog({ action: 'upgrade' })}><ChevronUp className='mr-1 h-4 w-4' />Upgrade</Button>
            <Button variant='outline' onClick={() => setChangePlanDialog({ action: 'downgrade' })}><ChevronDown className='mr-1 h-4 w-4' />Downgrade</Button>
            <Button variant='outline' className='text-red-600' onClick={() => setConfirmCancel(true)}><Ban className='mr-2 h-4 w-4' />Cancel</Button>
          </div>
        )}
      </div>
      <Separator />

      {sub.isLoading ? (
        <div className='grid gap-6 md:grid-cols-2'>{Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardHeader><Skeleton className='h-5 w-32' /></CardHeader><CardContent><Skeleton className='h-4 w-full' /></CardContent></Card>
        ))}</div>
      ) : sub.isError ? (
        <Card><CardContent className='p-6 text-center text-sm text-destructive'>Failed to load subscription: {(sub.error as Error).message}</CardContent></Card>
      ) : !data ? (
        <Card><CardContent className='p-6 text-center text-sm text-muted-foreground'>Subscription not found</CardContent></Card>
      ) : (
        <>
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-2 text-base'><Building2 className='h-4 w-4' />General Information</CardTitle></CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between'><span className='text-muted-foreground'>ID</span><span className='font-mono text-xs'>{data.id}</span></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>Tenant</span><span>{data.tenantName ?? data.tenantId ?? '-'}</span></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>Plan</span><span>{data.planName ?? data.planId ?? '-'}</span></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>Status</span><Badge variant='outline' className={STATUS_STYLES[data.status?.toLowerCase() ?? ''] ?? ''}>{data.status}</Badge></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>Billing Type</span><span className='capitalize'>{data.billingType ?? '-'}</span></div>
                {data.notes && (<><Separator /><div className='flex justify-between'><span className='text-muted-foreground'>Notes</span><span className='max-w-[200px] text-right'>{data.notes}</span></div></>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-2 text-base'><Calendar className='h-4 w-4' />Schedule & Pricing</CardTitle></CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between'><span className='text-muted-foreground'>Start Date</span><span>{formatDate(data.startDate)}</span></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>Next Billing</span><span>{formatDate(data.nextBillingDate)}</span></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>End Date</span><span>{formatDate(data.endDate)}</span></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>Amount</span><span className='font-mono'>{formatPrice(data.price, data.currency)}</span></div>
                <Separator />
                <div className='flex justify-between'><span className='text-muted-foreground'>Currency</span><span>{data.currency ?? 'USD'}</span></div>
              </CardContent>
            </Card>
          </div>

          {/* Billing Cycles */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'><CreditCard className='h-4 w-4' />Billing Cycles</CardTitle>
              <CardDescription>Payment history for this subscription</CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              {billingCycles.isLoading ? (
                <div className='p-6 space-y-3'>{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className='h-10 w-full' />))}</div>
              ) : billingCycles.data?.length === 0 ? (
                <div className='p-6 text-center text-sm text-muted-foreground'>No billing cycles recorded yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period Start</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(billingCycles.data ?? []).map((cycle) => (
                      <TableRow key={cycle.id}>
                        <TableCell className='text-sm'>{formatDate(cycle.periodStart)}</TableCell>
                        <TableCell className='text-sm'>{formatDate(cycle.periodEnd)}</TableCell>
                        <TableCell className='font-mono text-sm'>{formatPrice(cycle.amount)}</TableCell>
                        <TableCell>
                          <Badge variant='outline' className={(cycle.status ? CYCLE_STATUS_STYLES[cycle.status.toLowerCase()] : '') ?? ''}>
                            {cycle.status ?? '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel this subscription?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90' disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!changePlanDialog} onOpenChange={(o) => { if (!o) { setChangePlanDialog(null); setSelectedPlanId('') }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{changePlanDialog?.action === 'upgrade' ? 'Upgrade' : 'Downgrade'} Plan</DialogTitle>
            <DialogDescription>Select a new plan. Current: <strong>{data?.planName ?? data?.planId}</strong></DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <Label>New Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger><SelectValue placeholder='Select a plan' /></SelectTrigger>
              <SelectContent>
                {(plans.data ?? []).filter((p) => p.id !== data?.planId).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.planName}{p.price ? ` ($${p.price})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => { setChangePlanDialog(null); setSelectedPlanId('') }}>Cancel</Button>
            <Button disabled={!selectedPlanId || changePlanMutation.isPending}
              onClick={() => { if (changePlanDialog && selectedPlanId) changePlanMutation.mutate({ action: changePlanDialog.action, planId: selectedPlanId }) }}>
              {changePlanMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Confirm {changePlanDialog?.action === 'upgrade' ? 'Upgrade' : 'Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
