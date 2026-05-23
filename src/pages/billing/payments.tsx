import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { RefreshCw, Search } from 'lucide-react'
import { SubscriptionController_getPayments } from '@/lib/api/wms-saas-core-api/subscriptions-billing/subscriptions-billing'
import { SystemAdminController_getPendingPayments } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
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
            <Button variant='outline' size='icon' onClick={() => { payments.refetch(); pending.refetch() }}>
              <RefreshCw className='h-4 w-4' />
            </Button>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
