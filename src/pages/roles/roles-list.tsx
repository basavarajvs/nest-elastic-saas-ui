import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Eye,
  FilePenLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { RoleController_findAll } from '@/lib/api/wms-saas-core-api/roles/roles'
import { RoleController_delete } from '@/lib/api/wms-saas-core-api/roles/roles'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
interface Role {
  id: string
  roleName: string
  roleCode: string
  roleType?: 'system' | 'tenant' | 'user'
  roleDescription?: string
  isActive?: boolean
  isDeleted?: boolean
  parentRoleId?: string
  createdAt: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
}

const TYPE_STYLES: Record<string, string> = {
  system: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  tenant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

function typeStyle(type?: string): string {
  return TYPE_STYLES[type?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function useRoles(page: number, limit: number, search: string, typeFilter: string) {
  return useQuery({
    queryKey: ['roles', 'list', page, limit, search, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) }
      if (search) params.search = search
      if (typeFilter) params.roleType = typeFilter
      const res = await RoleController_findAll(params as never)
      return res as unknown as { data: Role[]; meta: PaginationMeta }
    },
    staleTime: 30_000,
  })
}

export function RolesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'list' | 'hierarchy'>('list')
  const limit = 10

  const { data, isLoading, isError, error, refetch } = useRoles(page, limit, debouncedSearch, typeFilter)

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

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

  const handleTypeFilter = useCallback((value: string) => {
    setTypeFilter(value)
    setPage(1)
  }, [])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await RoleController_delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list'] })
      toast.success('Role deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete role'),
  })

  function renderRoleNode(node: any, depth: number): React.ReactNode {
    const indent = depth * 16
    return (
      <div key={node.id} style={{ marginLeft: indent }} className='py-1 border-l pl-2 border-muted/50'>
        <div className='flex items-center gap-2 text-sm'>
          <Badge variant='outline' className={typeStyle(node.roleType)}>
            {node.roleType ?? 'role'}
          </Badge>
          <span className='font-medium'>{node.roleName}</span>
          <span className='text-xs text-muted-foreground font-mono'>({node.roleCode})</span>
          {node.parentRoleId && <span className='text-[10px] text-muted-foreground'>child</span>}
          <Button variant='ghost' size='sm' className='h-6 px-1.5 text-xs' asChild>
            <Link to='/roles/$id' params={{ id: node.id }}>view</Link>
          </Button>
        </div>
        {node.children?.length > 0 && (
          <div className='mt-0.5'>{node.children.map((c: any) => renderRoleNode(c, depth + 1))}</div>
        )}
      </div>
    )
  }

  const roles = data?.data ?? []
  const meta = data?.meta ?? { total: 0, page: 1, limit: 10 }
  const totalPages = Math.ceil(meta.total / meta.limit)

  const { data: allRolesData } = useQuery({
    queryKey: ['roles', 'all-for-hierarchy'],
    queryFn: async () => {
      const res = await RoleController_findAll({ page: 1, limit: 1000 } as never)
      return (res as unknown as { data: Role[] }).data ?? []
    },
    staleTime: 60_000,
    enabled: activeTab === 'hierarchy',
  })

  const allRolesForTree = allRolesData ?? roles

  const roleTree = useMemo(() => {
    const roleMap = new Map(allRolesForTree.map((r) => [r.id, { ...r, children: [] as any[] }]))
    const roots: any[] = []
    allRolesForTree.forEach((r) => {
      const node = roleMap.get(r.id)!
      if (r.parentRoleId && roleMap.has(r.parentRoleId)) {
        roleMap.get(r.parentRoleId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })
    return roots
  }, [allRolesForTree])

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Roles & Permissions'
        description='Manage roles and their permissions across the platform'
        actions={
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => {
              const rows = roles.map((r) => [r.roleName, r.roleCode, r.roleType, r.createdAt].join(','))
              const csv = ['Name,Code,Type,Created', ...rows].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'roles.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}>
              CSV
            </Button>
            <Button asChild>
              <Link to='/roles/new'>
                <Plus className='mr-2 h-4 w-4' />
                Create Role
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'hierarchy')}>
        <TabsList>
          <TabsTrigger value='list'>Browse Roles</TabsTrigger>
          <TabsTrigger value='hierarchy'>Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value='list'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <div className='relative flex-1 min-w-[200px] max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search roles...'
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='All Types' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Types</SelectItem>
                  <SelectItem value='system'>System</SelectItem>
                  <SelectItem value='tenant'>Tenant</SelectItem>
                  <SelectItem value='user'>User</SelectItem>
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
          ) : roles.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className='hidden md:table-cell'>Description</TableHead>
                  <TableHead className='hidden sm:table-cell'>Created</TableHead>
                  <TableHead className='w-[120px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className='font-medium'>{role.roleName}</TableCell>
                    <TableCell className='font-mono text-xs'>{role.roleCode}</TableCell>
                    <TableCell>
                      <Badge variant='outline' className={typeStyle(role.roleType)}>
                        {role.roleType ?? '--'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden max-w-[200px] truncate text-sm text-muted-foreground md:table-cell'>
                      {role.roleDescription ?? '-'}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {formatDate(role.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/roles/$id' params={{ id: role.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='Edit' asChild>
                          <Link to='/roles/$id' params={{ id: role.id }} search={{ edit: 'true' }}>
                            <FilePenLine className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-red-600'
                          title='Delete'
                          onClick={() => setDeleteTarget({ id: role.id, name: role.roleName })}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
           )}
         </CardContent>
       </Card>
 
       {/* Pagination (list only) */}
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
        </TabsContent>

        <TabsContent value='hierarchy'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle>Role Hierarchy</CardTitle>
              <CardDescription>
                Visual inheritance tree (parent → child roles). Based on parentRoleId links.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allRolesForTree.length === 0 ? (
                <div className='text-sm text-muted-foreground'>No roles to display hierarchy.</div>
              ) : (
                <div className='space-y-1 text-sm'>
                  {roleTree.length > 0 ? (
                    roleTree.map((root) => renderRoleNode(root, 0))
                  ) : (
                    allRolesForTree.map((r) => renderRoleNode({ ...r, children: [] }, 0))
                  )}
                </div>
              )}
              <p className='mt-4 text-xs text-muted-foreground'>
                Note: Approve/revoke actions for role assignments are available on user detail pages.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => {
                if (!deleteTarget) return
                deleteMutation.mutate(deleteTarget.id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
