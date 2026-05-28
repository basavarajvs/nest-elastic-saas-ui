import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  FilePenLine,
  HeartPulse,
  Plus,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  LogIn,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SystemAdminController_listTenants,
  SystemAdminController_suspendTenant,
  SystemAdminController_reactivateTenant,
  SystemAdminController_impersonateTenant,
} from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { TenantController_getHealth } from '@/lib/api/wms-saas-core-api/tenants/tenants'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface Tenant {
  id: string
  tenantName: string
  code: string
  domain?: string
  status: string
  locale?: string
  timezone?: string
  planId?: string
  planName?: string
  createdAt: string
  createdBy?: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function statusColor(status: string): string {
  return STATUS_COLORS[status?.toLowerCase()] ?? STATUS_COLORS.inactive
}

function useTenants(page: number, limit: number, search: string, status: string) {
  return useQuery({
    queryKey: ['tenants', 'list', page, limit, search, status],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.search = search
      if (status) params.status = status
      const res = await SystemAdminController_listTenants(
        params as { page?: number; limit?: number; search?: string; status?: string },
      )
      const body = res as unknown as {
        success: boolean
        data: Array<{
          tenantId: string
          tenantName: string
          tenantCode: string
          status: string
          domain?: string
          timezone?: string
          locale?: string
          createdAt: string
        }>
        meta: PaginationMeta
      }
      return {
        data: body.data.map((t) => ({
          id: t.tenantId,
          tenantName: t.tenantName,
          code: t.tenantCode,
          domain: t.domain,
          status: t.status,
          timezone: t.timezone,
          locale: t.locale,
          planId: undefined,
          planName: undefined,
          createdBy: undefined,
          createdAt: t.createdAt,
        })),
        meta: body.meta,
      }
    },
    staleTime: 30_000,
  })
}

function useUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string
      action: 'suspend' | 'reactivate'
    }) => {
      if (action === 'suspend') {
        await SystemAdminController_suspendTenant(id)
      } else {
        await SystemAdminController_reactivateTenant(id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] })
      toast.success('Tenant status updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update tenant status')
    },
  })
}

function useHealth(id: string | null) {
  return useQuery({
    queryKey: ['tenants', 'health', id],
    queryFn: async () => {
      const res = await TenantController_getHealth(id!)
      return res as unknown as { data: Record<string, unknown> }
    },
    enabled: !!id,
    staleTime: 10_000,
  })
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function TenantsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [confirmTarget, setConfirmTarget] = useState<{
    id: string
    name: string
    action: 'suspend' | 'reactivate'
  } | null>(null)
  const [healthTarget, setHealthTarget] = useState<string | null>(null)
  const [impersonateTarget, setImpersonateTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const limit = 10
  const { data, isLoading, isError, error, refetch } = useTenants(
    page,
    limit,
    debouncedSearch,
    statusFilter,
  )
  const updateStatus = useUpdateStatus()
  const health = useHealth(healthTarget)

  const impersonateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await SystemAdminController_impersonateTenant(id)
      return res
    },
    onSuccess: (res) => {
      const token = (res as unknown as { data?: { accessToken?: string } })?.data?.accessToken
      if (token) {
        navigator.clipboard.writeText(token)
        toast.success('Impersonation token copied to clipboard')
      } else {
        toast.success('Impersonation successful')
      }
      setImpersonateTarget(null)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to impersonate tenant')
    },
  })

  const debounceTimer = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>
    return (value: string) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setDebouncedSearch(value)
        setPage(1)
      }, 400)
    }
  }, [])

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value)
      debounceTimer(value)
    },
    [debounceTimer],
  )

  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(1)
  }, [])

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const tenants = useMemo(() => {
    const list = data?.data ?? []
    if (!sortKey) return list
    return [...list].sort((a, b) => {
      const aVal = String(a[sortKey as keyof Tenant] ?? '')
      const bVal = String(b[sortKey as keyof Tenant] ?? '')
      const cmp = aVal.localeCompare(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data?.data, sortKey, sortDir])

  const meta = data?.meta ?? { total: 0, page: 1, limit: 10 }
  const totalPages = Math.ceil(meta.total / meta.limit)

  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sortKey !== columnKey) return <ArrowUpDown className='ml-1 inline h-3 w-3' />
    return sortDir === 'asc'
      ? <ArrowUp className='ml-1 inline h-3 w-3' />
      : <ArrowDown className='ml-1 inline h-3 w-3' />
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Tenants'
        description='Manage all tenants across the platform'
        actions={
          <Button asChild>
            <Link to='/tenants/new'>
              <Plus className='mr-2 h-4 w-4' />
              Create Tenant
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 items-center gap-2'>
              <div className='relative flex-1 max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search tenants...'
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='suspended'>Suspended</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
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
          ) : tenants.length === 0 ? (
            <EmptyState />
          ) : (
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='hidden xl:table-cell w-[100px]'>ID</TableHead>
                      <TableHead className='cursor-pointer select-none' onClick={() => handleSort('tenantName')}>
                        Name<SortIcon columnKey='tenantName' />
                      </TableHead>
                      <TableHead className='cursor-pointer select-none' onClick={() => handleSort('code')}>
                        Code<SortIcon columnKey='code' />
                      </TableHead>
                      <TableHead className='cursor-pointer select-none' onClick={() => handleSort('status')}>
                        Status<SortIcon columnKey='status' />
                      </TableHead>
                      <TableHead className='hidden md:table-cell'>Domain</TableHead>
                      <TableHead className='hidden lg:table-cell'>Plan</TableHead>
                      <TableHead className='hidden sm:table-cell cursor-pointer select-none' onClick={() => handleSort('createdAt')}>
                        Created<SortIcon columnKey='createdAt' />
                      </TableHead>
                      <TableHead className='w-[140px]'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className='hidden font-mono text-xs text-muted-foreground xl:table-cell'>
                        {tenant.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className='font-medium'>
                        {tenant.tenantName}
                      </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {tenant.code}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={statusColor(tenant.status)}
                      >
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {tenant.domain ?? '-'}
                    </TableCell>
                    <TableCell className='hidden text-sm lg:table-cell'>
                      {tenant.planName ?? '-'}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {formatDate(tenant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='View details'
                          asChild
                        >
                          <Link to='/tenants/$id' params={{ id: tenant.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='Edit'
                          asChild
                        >
                          <Link to='/tenants/$id' params={{ id: tenant.id }} search={{ edit: 'true' }}>
                            <FilePenLine className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='Impersonate'
                          onClick={() =>
                            setImpersonateTarget({ id: tenant.id, name: tenant.tenantName })
                          }
                        >
                          <LogIn className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='Health check'
                          onClick={() => setHealthTarget(tenant.id)}
                        >
                          <HeartPulse className='h-4 w-4' />
                        </Button>
                        {tenant.status === 'suspended' ? (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-green-600'
                            title='Reactivate'
                            onClick={() =>
                              setConfirmTarget({
                                id: tenant.id,
                                name: tenant.tenantName,
                                action: 'reactivate',
                              })
                            }
                          >
                            <ShieldCheck className='h-4 w-4' />
                          </Button>
                        ) : (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-red-600'
                            title='Suspend'
                            onClick={() =>
                              setConfirmTarget({
                                id: tenant.id,
                                name: tenant.tenantName,
                                action: 'suspend',
                              })
                            }
                          >
                            <ShieldOff className='h-4 w-4' />
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

      {/* Pagination */}
      {meta.total > 0 && (
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <p>
            Showing {(page - 1) * limit + 1}-
            {Math.min(page * limit, meta.total)} of {meta.total}
          </p>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className='text-xs'>
              Page {page} of {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Suspend/Reactivate Confirmation */}
      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={() => setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.action === 'suspend'
                ? 'Suspend Tenant'
                : 'Reactivate Tenant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.action === 'suspend'
                ? `Are you sure you want to suspend "${confirmTarget?.name}"? All access for this tenant will be blocked.`
                : `Are you sure you want to reactivate "${confirmTarget?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmTarget) return
                updateStatus.mutate({
                  id: confirmTarget.id,
                  action: confirmTarget.action,
                })
                setConfirmTarget(null)
              }}
            >
              {confirmTarget?.action === 'suspend' ? 'Suspend' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Impersonate Confirmation */}
      <AlertDialog
        open={!!impersonateTarget}
        onOpenChange={() => setImpersonateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Impersonate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to impersonate &ldquo;{impersonateTarget?.name}&rdquo;.
              This will generate a 15-minute access token for debugging and support purposes.
              This action is audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={impersonateMutation.isPending}
              onClick={() => {
                if (!impersonateTarget) return
                impersonateMutation.mutate(impersonateTarget.id)
              }}
            >
              {impersonateMutation.isPending ? 'Generating...' : 'Generate Token'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Health Dialog */}
      <Dialog
        open={!!healthTarget}
        onOpenChange={(open) => {
          if (!open) setHealthTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant Health</DialogTitle>
            <DialogDescription>
              Health status for tenant ID: {healthTarget}
            </DialogDescription>
          </DialogHeader>
          {health.isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-4 w-1/2' />
            </div>
          ) : health.isError ? (
            <p className='text-sm text-destructive'>
              Failed to load health: {(health.error as Error).message}
            </p>
          ) : (
            <div className='space-y-2 text-sm'>
              {health.data?.data ? (
                Object.entries(health.data.data).map(([key, value]) => (
                  <div key={key} className='flex justify-between'>
                    <span className='font-medium capitalize'>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className='text-muted-foreground'>
                      {String(value)}
                    </span>
                  </div>
                ))
              ) : (
                <p className='text-muted-foreground'>No health data available</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
