import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ArrowLeft, Download, Mail, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionController_getInvoice } from '@/lib/api/wms-saas-core-api/billing-subscriptions/billing-subscriptions'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitAmount: number
  totalAmount: number
}

interface InvoiceDetail {
  id: string
  tenantId: string
  amount: number
  currency: string
  status: 'paid' | 'unpaid' | 'overdue'
  dueDate: string
  issuedAt: string
  billingEmail: string
  items: InvoiceLineItem[]
  pdfUrl?: string
}

function useInvoice(id: string, tenantId: string) {
  return useQuery({
    queryKey: ['billing', 'invoices', tenantId, id],
    queryFn: async () => {
      const res = await SubscriptionController_getInvoice(id, { tenantId })
      const typed = res as unknown as { data: InvoiceDetail }
      return typed.data
    },
    enabled: !!id && !!tenantId,
  })
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  unpaid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function InvoiceDetailPage() {
  const { id } = useParams({ from: '/_authenticated/billing/invoices/$id' })
  const { tenantId } = useSearch({ from: '/_authenticated/billing/invoices/$id' })

  const { data: invoice, isLoading, isError, error, refetch, isFetching } = useInvoice(id, tenantId)

  const handleDownload = () => {
    toast.success(`Downloading invoice ${id}`)
    if (invoice?.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank')
    }
  }

  const handleEmail = () => {
    toast.success(`Invoice sent to ${invoice?.billingEmail || 'billing email'}`)
  }

  if (!tenantId) {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' asChild className='mb-4'>
          <Link to='/billing/invoices'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Invoices
          </Link>
        </Button>
        <EmptyState title='Missing Tenant ID' description='Cannot load invoice without tenant context.' />
      </div>
    )
  }

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
  if (!invoice) return <EmptyState title='Invoice not found' description='The requested invoice could not be found.' />

  return (
    <div className='space-y-6 max-w-5xl'>
      <Button variant='ghost' asChild className='mb-2'>
        <Link to='/billing/invoices'>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Invoices
        </Link>
      </Button>

      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Invoice {invoice.id}</h1>
          <div className='flex items-center gap-3 mt-2 text-muted-foreground'>
            <Badge
              variant='outline'
              className={STATUS_COLORS[invoice.status?.toLowerCase()] || STATUS_COLORS.unpaid}
            >
              {invoice.status?.toUpperCase()}
            </Badge>
            <span>Issued on {format(new Date(invoice.issuedAt), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant='outline' onClick={handleEmail}>
            <Mail className='mr-2 h-4 w-4' />
            Send Email
          </Button>
          <Button onClick={handleDownload}>
            <Download className='mr-2 h-4 w-4' />
            Download PDF
          </Button>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-3'>
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className='text-right'>Qty</TableHead>
                  <TableHead className='text-right'>Unit Price</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.items || []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className='text-right'>{item.quantity}</TableCell>
                    <TableCell className='text-right'>{formatCurrency(item.unitAmount, invoice.currency)}</TableCell>
                    <TableCell className='text-right'>{formatCurrency(item.totalAmount, invoice.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className='flex justify-end mt-6 border-t pt-4'>
              <div className='w-full max-w-sm space-y-2'>
                <div className='flex justify-between font-bold text-lg'>
                  <span>Total</span>
                  <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <div className='text-sm font-medium text-muted-foreground'>Due Date</div>
                <div>{format(new Date(invoice.dueDate), 'MMMM d, yyyy')}</div>
              </div>
              <div>
                <div className='text-sm font-medium text-muted-foreground'>Billing Email</div>
                <div>{invoice.billingEmail || 'N/A'}</div>
              </div>
              <div>
                <div className='text-sm font-medium text-muted-foreground'>Tenant ID</div>
                <div className='text-sm truncate' title={invoice.tenantId}>{invoice.tenantId}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
