import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Download,
  Eye,
  Mail,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionController_getInvoices } from '@/lib/api/wms-saas-core-api/billing-subscriptions/billing-subscriptions'
import { SystemAdminController_listTenants } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
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

interface Invoice {
  id: string
  tenantId: string
  tenantName: string
  amount: number
  currency: string
  status: 'paid' | 'unpaid' | 'overdue'
  dueDate: string
  issuedAt: string
}

interface Tenant {
  id: string
  tenantName: string
}

function useTenants() {
  return useQuery({
    queryKey: ['system', 'tenants', 'list'],
    queryFn: async () => {
      const res = await SystemAdminController_listTenants()
      const typed = res as unknown as { data: Tenant[] }
      return typed.data
    },
    staleTime: 60_000,
  })
}

function useInvoices(tenantId: string) {
  return useQuery({
    queryKey: ['billing', 'invoices', tenantId],
    queryFn: async () => {
      const res = await SubscriptionController_getInvoices({ tenantId })
      const typed = res as unknown as { data: Invoice[] }
      return typed.data
    },
    enabled: !!tenantId,
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

export function InvoicesListPage() {
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [search, setSearch] = useState('')

  const { data: tenants, isLoading: loadingTenants } = useTenants()
  const {
    data: invoices,
    isLoading: loadingInvoices,
    isError,
    error,
    refetch,
    isFetching,
  } = useInvoices(selectedTenant)

  const handleDownload = (id: string) => {
    toast.success(`Download started for invoice ${id}`)
    // Stub for download functionality
  }

  const handleEmail = (id: string) => {
    toast.success(`Invoice ${id} sent to billing email`)
    // Stub for email functionality
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Invoices'
        description='Manage and view billing invoices'
        actions={
          <Button variant='outline' size='icon' onClick={() => refetch()} disabled={!selectedTenant}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
          <div className='flex items-center space-x-2 flex-1'>
            <div className='relative w-72'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                type='search'
                placeholder='Search invoices...'
                className='pl-8'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select
              value={selectedTenant}
              onValueChange={setSelectedTenant}
            >
              <SelectTrigger className='w-[250px]'>
                <SelectValue placeholder={loadingTenants ? "Loading tenants..." : "Select Tenant to view invoices"} />
              </SelectTrigger>
              <SelectContent>
                {tenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.tenantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState
              title='Select a tenant'
              description='Please select a tenant from the dropdown above to view their invoices.'
              icon={Search}
            />
          ) : loadingInvoices ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : !invoices || invoices.length === 0 ? (
            <EmptyState
              title='No invoices found'
              description='This tenant has no invoices yet.'
            />
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices
                    .filter((inv) =>
                      inv.id.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className='font-medium'>{invoice.id}</TableCell>
                        <TableCell>
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={STATUS_COLORS[invoice.status?.toLowerCase()] || STATUS_COLORS.unpaid}
                          >
                            {invoice.status?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.issuedAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end space-x-2'>
                            <Button variant='ghost' size='icon' asChild>
                              <Link to={`/billing/invoices/${invoice.id}`} search={{ tenantId: selectedTenant }}>
                                <Eye className='h-4 w-4 text-muted-foreground' />
                              </Link>
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => handleDownload(invoice.id)}
                            >
                              <Download className='h-4 w-4 text-muted-foreground' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => handleEmail(invoice.id)}
                            >
                              <Mail className='h-4 w-4 text-muted-foreground' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
