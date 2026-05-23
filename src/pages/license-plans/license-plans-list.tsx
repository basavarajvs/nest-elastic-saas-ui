import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import {
  ArrowUpDown,
  Eye,
  FilePenLine,
  Plus,
  RefreshCw,
  Search,
  ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { PlanController_findAll } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
import { PlanController_remove } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
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

interface LicensePlan {
  id: string
  planName: string
  planCode?: string
  licenseType: string
  price?: number
  billingCycleDays?: number
  isActive?: boolean
  planDescription?: string
  features?: Record<string, unknown>
  limits?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

const LICENSE_TYPE_STYLES: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  enterprise: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

function licenseTypeStyle(type: string): string {
  return LICENSE_TYPE_STYLES[type?.toLowerCase()] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

export function LicensePlansPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<'name' | 'price' | 'createdAt' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['billing-plans', 'all', statusFilter],
    queryFn: async () => {
      const res = await PlanController_findAll({
        includeInactive: statusFilter === 'inactive' || statusFilter === '' ? 'true' : 'false',
      })
      return (res as unknown as { data: LicensePlan[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await PlanController_remove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] })
      toast.success('License plan deactivated')
      setDeactivateTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to deactivate plan'),
  })

  const toggleSort = (field: 'name' | 'price' | 'createdAt') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let result = [...data]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.planName.toLowerCase().includes(q) || (p.planCode ?? '').toLowerCase().includes(q))
    }
    if (typeFilter) {
      result = result.filter((p) => p.licenseType === typeFilter)
    }
    if (sortField === 'name') {
      result.sort((a, b) => sortDir === 'asc' ? a.planName.localeCompare(b.planName) : b.planName.localeCompare(a.planName))
    } else if (sortField === 'price') {
      result.sort((a, b) => sortDir === 'asc' ? (a.price ?? 0) - (b.price ?? 0) : (b.price ?? 0) - (a.price ?? 0))
    } else if (sortField === 'createdAt') {
      result.sort((a, b) => sortDir === 'asc' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return result
  }, [data, search, typeFilter, sortField, sortDir])

  return (
    <div className='space-y-6'>
      <PageHeader
        title='License Plans'
        description='Manage billing/license plans available to tenants'
        actions={
          <Button asChild>
            <Link to='/license-plans/new'>
              <Plus className='mr-2 h-4 w-4' />
              Create Plan
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <div className='relative flex-1 min-w-[200px] max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input placeholder='Search plans...' value={search} onChange={(e) => setSearch(e.target.value)} className='pl-8' />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className='w-[140px]'><SelectValue placeholder='All Types' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Types</SelectItem>
                  <SelectItem value='trial'>Trial</SelectItem>
                  <SelectItem value='basic'>Basic</SelectItem>
                  <SelectItem value='premium'>Premium</SelectItem>
                  <SelectItem value='enterprise'>Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-[150px]'><SelectValue placeholder='All Status' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>
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
            <EmptyState title={search || typeFilter || statusFilter ? 'No plans match your filters' : 'No license plans found'} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className='hidden sm:table-cell'>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className='hidden md:table-cell'>
                    <button onClick={() => toggleSort('price')} className='flex items-center gap-1 text-xs font-medium'>
                      Price <ArrowUpDown className='h-3 w-3' />
                    </button>
                  </TableHead>
                  <TableHead className='hidden md:table-cell'>Billing Cycle</TableHead>
                  <TableHead className='hidden lg:table-cell'>Status</TableHead>
                  <TableHead className='w-[110px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className='font-medium'>{plan.planName}</TableCell>
                    <TableCell className='hidden sm:table-cell font-mono text-xs'>{plan.planCode ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant='outline' className={licenseTypeStyle(plan.licenseType)}>{plan.licenseType}</Badge>
                    </TableCell>
                    <TableCell className='hidden md:table-cell font-mono text-sm'>{formatPrice(plan.price)}</TableCell>
                    <TableCell className='hidden md:table-cell text-sm text-muted-foreground'>
                      {plan.billingCycleDays ? `${plan.billingCycleDays} days` : '-'}
                    </TableCell>
                    <TableCell className='hidden lg:table-cell'>
                      <Badge variant='outline' className={plan.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}>
                        {plan.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View' asChild>
                          <Link to='/license-plans/$id' params={{ id: plan.id }}><Eye className='h-4 w-4' /></Link>
                        </Button>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='Edit' asChild>
                          <Link to='/license-plans/$id' params={{ id: plan.id }} search={{ edit: 'true' }}><FilePenLine className='h-4 w-4' /></Link>
                        </Button>
                        {plan.isActive !== false && (
                          <Button variant='ghost' size='icon' className='h-8 w-8 text-red-600' title='Deactivate'
                            onClick={() => setDeactivateTarget({ id: plan.id, name: plan.planName })}>
                            <ToggleRight className='h-4 w-4' />
                          </Button>
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

      <AlertDialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate License Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deactivateTarget?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => { if (deactivateTarget) deactivateMutation.mutate(deactivateTarget.id) }}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
