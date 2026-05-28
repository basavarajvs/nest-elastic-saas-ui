import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CheckCircle, Loader2, Plus, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionController_getPayments } from '@/lib/api/wms-saas-core-api/subscriptions-billing/subscriptions-billing'
import { SystemAdminController_getPendingPayments } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { SubscriptionController_confirmPayment, SubscriptionController_requestPayment, SubscriptionController_findAll_v2 } from '@/lib/api/wms-saas-core-api/billing-subscriptions/billing-subscriptions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Payment {
  id: string
  subscriptionId?: string
  tenantId?: string
  tenantName?: string
  amount?: number
  currency?: string
  status?: string
  paymentMethod?: string
  paymentDate?: string
  createdAt?: string
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try { return format(new Date(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

function formatPrice(amount?: number, currency?: string): string {
  if (amount === undefined || amount === null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount)
}

export function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null)
  const [requestPaymentOpen, setRequestPaymentOpen] = useState(false)
  const [confirmAmount, setConfirmAmount] = useState('')
  const [confirmTxId, setConfirmTxId] = useState('')
  const [confirmNotes, setConfirmNotes] = useState('')
  
  const [reqAmount, setReqAmount] = useState('')
  const [reqSubId, setReqSubId] = useState('')
  const [reqMethod, setReqMethod] = useState('')
  const [reqDate, setReqDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const subscriptions = useQuery({
    queryKey: ['billing', 'subscriptions', 'all'],
    queryFn: async () => {
      const res = await SubscriptionController_findAll_v2()
      const body = res as unknown as { data: Array<{ subscriptionId: string; status?: string; price?: number; currency?: string }> }
      return (body.data ?? []).map((s) => ({
        ...s,
        id: s.subscriptionId,
      }))
    },
    staleTime: 60_000,
  })

  const payments = useQuery({
    queryKey: ['payments', 'all'],
    queryFn: async () => {
      const res = await SubscriptionController_getPayments()
      return (res as unknown as { data: Payment[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const pending = useQuery({
    queryKey: ['payments', 'pending'],
    queryFn: async () => {
      const res = await SystemAdminController_getPendingPayments()
      return (res as unknown as { data: Payment[] }).data ?? []
    },
    staleTime: 15_000,
  })

  const allPayments = useMemo(() => {
    const all = [...(payments.data ?? []), ...(pending.data ?? [])]
    const seen = new Set<string>()
    return all.filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [payments.data, pending.data])

  const filtered = useMemo(() => {
    return allPayments.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.id.toLowerCase().includes(q) && !(p.tenantName ?? '').toLowerCase().includes(q) && !(p.subscriptionId ?? '').toLowerCase().includes(q)) return false
      }
      if (statusFilter && p.status !== statusFilter) return false
      return true
    })
  }, [allPayments, search, statusFilter])

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!confirmPaymentId) throw new Error('No payment selected')
      await SubscriptionController_confirmPayment({
        paymentId: confirmPaymentId,
        confirmedAmount: Number(confirmAmount),
        transactionId: confirmTxId,
        notes: confirmNotes,
      })
    },
    onSuccess: () => {
      toast.success('Payment confirmed successfully')
      setConfirmPaymentId(null)
      payments.refetch()
      pending.refetch()
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to confirm payment'),
  })

  const requestMutation = useMutation({
    mutationFn: async () => {
      await SubscriptionController_requestPayment({
        amount: Number(reqAmount),
        subscriptionId: reqSubId,
        paymentMethod: reqMethod,
        paymentDate: new Date(reqDate).toISOString(),
      })
    },
    onSuccess: () => {
      toast.success('Payment requested successfully')
      setRequestPaymentOpen(false)
      payments.refetch()
      pending.refetch()
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to request payment'),
  })

  const isLoading = payments.isLoading || pending.isLoading
  const isError = payments.isError || pending.isError
  const error = payments.error || pending.error

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold tracking-tight'>Payments</h1>
        <p className='text-sm text-muted-foreground'>Track payments across all tenants</p>
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Total Payments</CardTitle></CardHeader>
          <CardContent><p className='text-2xl font-bold'>{allPayments.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Pending</CardTitle></CardHeader>
          <CardContent><p className='text-2xl font-bold text-yellow-600'>{(pending.data ?? []).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Total Value</CardTitle></CardHeader>
          <CardContent>
            <p className='text-2xl font-bold'>
              {formatPrice(allPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <div className='relative flex-1 min-w-[200px] max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input placeholder='Search payments...' value={search} onChange={(e) => setSearch(e.target.value)} className='pl-8' />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === ' ' ? '' : v)}>
                <SelectTrigger className='w-[150px]'><SelectValue placeholder='All Status' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Status</SelectItem>
                  <SelectItem value='paid'>Paid</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='failed'>Failed</SelectItem>
                  <SelectItem value='refunded'>Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2'>
              <Button onClick={() => setRequestPaymentOpen(true)}>
                <Plus className='mr-2 h-4 w-4' />
                Request Payment
              </Button>
              <Button variant='outline' size='icon' onClick={() => { payments.refetch(); pending.refetch() }}>
                <RefreshCw className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-6 space-y-3'>{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className='h-12 w-full' />))}</div>
          ) : isError ? (
            <div className='p-6 text-center text-sm text-destructive'>Failed to load payments: {(error as Error).message}</div>
          ) : filtered.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>No payments found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden sm:table-cell'>Method</TableHead>
                  <TableHead className='hidden md:table-cell'>Date</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className='font-mono text-xs'>{p.id.slice(0, 8)}...</TableCell>
                    <TableCell className='text-sm'>{p.tenantName ?? p.tenantId ?? '-'}</TableCell>
                    <TableCell className='font-mono text-sm'>{formatPrice(p.amount, p.currency)}</TableCell>
                    <TableCell>
                      <Badge variant='outline' className={(p.status ? PAYMENT_STATUS_STYLES[p.status.toLowerCase()] : '') ?? ''}>{p.status ?? '-'}</Badge>
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>{p.paymentMethod ?? '-'}</TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>{formatDate(p.paymentDate || p.createdAt)}</TableCell>
                    <TableCell className='text-right'>
                      {p.status?.toLowerCase() === 'pending' && (
                        <Button variant='ghost' size='sm' onClick={() => {
                          setConfirmPaymentId(p.id)
                          setConfirmAmount(String(p.amount ?? ''))
                          setConfirmTxId('')
                          setConfirmNotes('')
                        }}>
                          <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                          Confirm
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmPaymentId} onOpenChange={(o) => !o && setConfirmPaymentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>Mark this pending payment as paid.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Confirmed Amount</Label>
              <Input type='number' value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Transaction ID (Admin Ref)</Label>
              <Input placeholder='e.g. Stripe charge ID' value={confirmTxId} onChange={(e) => setConfirmTxId(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Notes (Optional)</Label>
              <Input value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmPaymentId(null)}>Cancel</Button>
            <Button disabled={confirmMutation.isPending || !confirmTxId || !confirmAmount} onClick={() => confirmMutation.mutate()}>
              {confirmMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requestPaymentOpen} onOpenChange={setRequestPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payment</DialogTitle>
            <DialogDescription>Manually create a payment request for a subscription.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Subscription</Label>
              <Select value={reqSubId} onValueChange={setReqSubId}>
                <SelectTrigger><SelectValue placeholder='Select subscription' /></SelectTrigger>
                <SelectContent>
                  {subscriptions.data?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {`${s.status ?? 'active'} - ${s.currency ?? 'USD'} ${s.price ?? ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Amount</Label>
              <Input type='number' value={reqAmount} onChange={(e) => setReqAmount(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Payment Method</Label>
              <Input placeholder='e.g. credit_card, wire_transfer' value={reqMethod} onChange={(e) => setReqMethod(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Payment Date</Label>
              <Input type='date' value={reqDate} onChange={(e) => setReqDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setRequestPaymentOpen(false)}>Cancel</Button>
            <Button disabled={requestMutation.isPending || !reqSubId || !reqAmount || !reqMethod} onClick={() => requestMutation.mutate()}>
              {requestMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
