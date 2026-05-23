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
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'
import { UserController_findAll } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_deactivate } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_reactivate } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_assignRole, UserController_invite } from '@/lib/api/wms-saas-core-api/users/users'
import { RoleController_findAll } from '@/lib/api/wms-saas-core-api/roles/roles'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
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
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  roles?: { id: string; name: string }[]
  createdAt: string
  updatedAt?: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  invited: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function statusStyle(status: string): string {
  return STATUS_STYLES[status?.toLowerCase()] ?? STATUS_STYLES.inactive
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function useUsers(page: number, limit: number, search: string, status: string, roleCode: string) {
  return useQuery({
    queryKey: ['users', 'list', page, limit, search, status, roleCode],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.search = search
      if (status) params.status = status
      if (roleCode) params.roleCode = roleCode
      const res = await UserController_findAll(
        params as {
          page?: number
          limit?: number
          search?: string
          status?: string
          roleCode?: string
          sortBy?: string
          sortOrder?: string
        },
      )
      return res as unknown as { data: User[]; meta: PaginationMeta }
    },
    staleTime: 30_000,
  })
}

function useRoles() {
  return useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      const res = await RoleController_findAll({ includeSystem: 'true' })
      return (res as unknown as { data: { id: string; name: string; code: string }[] }).data ?? []
    },
    staleTime: 60_000,
  })
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [activeTab, setActiveTab] = useState('all')
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')

  const limit = 10

  const { data, isLoading, isError, error, refetch } = useUsers(
    page,
    limit,
    debouncedSearch,
    activeTab === 'pending' ? 'invited' : statusFilter,
    roleFilter,
  )
  const roles = useRoles()

  const [confirmTarget, setConfirmTarget] = useState<{
    id: string
    name: string
    action: 'deactivate' | 'reactivate'
  } | null>(null)

  const [assignTarget, setAssignTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')

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

  const handleRoleFilter = useCallback((value: string) => {
    setRoleFilter(value)
    setPage(1)
  }, [])

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await UserController_deactivate(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('User deactivated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to deactivate user'),
  })

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await UserController_reactivate(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('User reactivated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to reactivate user'),
  })

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await UserController_assignRole(userId, { roleId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('Role assigned')
      setAssignTarget(null)
      setSelectedRoleId('')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to assign role'),
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await UserController_invite({
        email: inviteEmail,
        roleId: inviteRole || undefined,
        message: inviteMessage || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('Invitation sent successfully')
      setInviteSheetOpen(false)
      setInviteEmail('')
      setInviteRole('')
      setInviteMessage('')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to send invitation'),
  })

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

  const users = useMemo(() => {
    const list = data?.data ?? []
    if (!sortKey) return list
    return [...list].sort((a, b) => {
      const aVal = String(a[sortKey as keyof User] ?? '')
      const bVal = String(b[sortKey as keyof User] ?? '')
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
        title='Users'
        description='Manage all users across the platform'
        actions={
          <Button onClick={() => setInviteSheetOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Invite User
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value='all'>All Users</TabsTrigger>
          <TabsTrigger value='pending'>Pending Invitations</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <div className='relative flex-1 min-w-[200px] max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search users...'
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
                  <SelectItem value='inactive'>Inactive</SelectItem>
                  <SelectItem value='invited'>Invited</SelectItem>
                  <SelectItem value='suspended'>Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={handleRoleFilter}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='All Roles' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Roles</SelectItem>
                  {roles.data?.map((r) => (
                    <SelectItem key={r.id} value={r.code ?? r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
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
          ) : users.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead className='hidden xl:table-cell w-[100px]'>ID</TableHead>
                    <TableHead className='cursor-pointer select-none' onClick={() => handleSort('firstName')}>
                      Name<SortIcon columnKey='firstName' />
                    </TableHead>
                    <TableHead className='cursor-pointer select-none' onClick={() => handleSort('email')}>
                      Email<SortIcon columnKey='email' />
                    </TableHead>
                    <TableHead className='cursor-pointer select-none' onClick={() => handleSort('status')}>
                      Status<SortIcon columnKey='status' />
                    </TableHead>
                    <TableHead className='hidden md:table-cell'>Roles</TableHead>
                    <TableHead className='hidden sm:table-cell cursor-pointer select-none' onClick={() => handleSort('createdAt')}>
                      Created<SortIcon columnKey='createdAt' />
                    </TableHead>
                    <TableHead className='w-[150px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className='hidden font-mono text-xs text-muted-foreground xl:table-cell'>
                        {user.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className='font-medium'>
                        {user.firstName} {user.lastName}
                      </TableCell>
                    <TableCell className='text-sm'>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant='outline' className={statusStyle(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <div className='flex flex-wrap gap-1'>
                        {(user.roles?.length ?? 0) > 0 ? (
                          user.roles!.map((r) => (
                            <Badge key={r.id} variant='secondary' className='text-xs'>
                              {r.name}
                            </Badge>
                          ))
                        ) : (
                          <span className='text-xs text-muted-foreground'>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/users/$id' params={{ id: user.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='Edit' asChild>
                          <Link to='/users/$id' params={{ id: user.id }} search={{ edit: 'true' }}>
                            <FilePenLine className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='Assign role'
                          onClick={() => {
                            setAssignTarget({ id: user.id, name: `${user.firstName} ${user.lastName}` })
                            setSelectedRoleId('')
                          }}
                        >
                          <UserCog className='h-4 w-4' />
                        </Button>
                        {user.status === 'active' ? (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-red-600'
                            title='Deactivate'
                            onClick={() =>
                              setConfirmTarget({
                                id: user.id,
                                name: `${user.firstName} ${user.lastName}`,
                                action: 'deactivate',
                              })
                            }
                          >
                            <ShieldOff className='h-4 w-4' />
                          </Button>
                        ) : (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-green-600'
                            title='Reactivate'
                            onClick={() =>
                              setConfirmTarget({
                                id: user.id,
                                name: `${user.firstName} ${user.lastName}`,
                                action: 'reactivate',
                              })
                            }
                          >
                            <ShieldCheck className='h-4 w-4' />
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
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, meta.total)} of {meta.total}
          </p>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className='text-xs'>Page {page} of {totalPages}</span>
            <Button variant='outline' size='sm' disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Deactivate/Reactivate Confirmation */}
      <AlertDialog open={!!confirmTarget} onOpenChange={() => setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.action === 'deactivate' ? 'Deactivate User' : 'Reactivate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.action === 'deactivate'
                ? `Are you sure you want to deactivate "${confirmTarget?.name}"? They will lose access to the platform.`
                : `Are you sure you want to reactivate "${confirmTarget?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmTarget) return
                const mutate =
                  confirmTarget.action === 'deactivate' ? deactivateMutation : reactivateMutation
                mutate.mutate(confirmTarget.id)
                setConfirmTarget(null)
              }}
            >
              {confirmTarget?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Role Dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(open) => { if (!open) { setAssignTarget(null); setSelectedRoleId('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {assignTarget?.name}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder='Select a role' />
              </SelectTrigger>
              <SelectContent>
                {roles.data?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => { setAssignTarget(null); setSelectedRoleId('') }}>
                Cancel
              </Button>
              <Button
                disabled={!selectedRoleId || assignRoleMutation.isPending}
                onClick={() => {
                  if (assignTarget && selectedRoleId) {
                    assignRoleMutation.mutate({ userId: assignTarget.id, roleId: selectedRoleId })
                  }
                }}
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Sheet */}
      <Sheet open={inviteSheetOpen} onOpenChange={setInviteSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite User</SheetTitle>
            <SheetDescription>
              Send an email invitation to a new user. They will receive a link to set up their account.
            </SheetDescription>
          </SheetHeader>
          <div className='mt-6 space-y-4'>
            <div className='space-y-2'>
              <Label>Email Address</Label>
              <Input
                type='email'
                placeholder='user@example.com'
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Role (Optional)</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder='Select a role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>No Role</SelectItem>
                  {roles.data?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Custom Message (Optional)</Label>
              <Input
                placeholder='Welcome to our platform!'
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>
            <div className='pt-4'>
              <Button
                className='w-full'
                disabled={!inviteEmail || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
