import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Eye,
  Plus,
  RefreshCw,
  Search,
  ShieldX,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ApiKeyControllerFindAllParams } from '@/lib/types/wms-saas-core-api'
import { ApiKeyController_findAll } from '@/lib/api/wms-saas-core-api/api-keys/api-keys'
import { ApiKeyController_revoke } from '@/lib/api/wms-saas-core-api/api-keys/api-keys'
import { ApiKeyController_delete } from '@/lib/api/wms-saas-core-api/api-keys/api-keys'
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

interface ApiKey {
  id: string
  keyName: string
  keyPrefix?: string
  isActive?: boolean
  expiresAt?: string
  scopes?: string[]
  createdAt: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const limit = 10

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['api-keys', 'list', page, limit, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: ApiKeyControllerFindAllParams = {
        page,
        limit,
      }
      if (statusFilter === 'active') params.isActive = true
      else if (statusFilter === 'revoked') params.isActive = false
      const res = await ApiKeyController_findAll(params)
      const typed = res as unknown as { data: { data: ApiKey[]; meta: PaginationMeta } }
      return typed.data ?? { data: [], meta: { total: 0, page: 1, limit } }
    },
    staleTime: 30_000,
  })

  const [actionTarget, setActionTarget] = useState<{
    type: 'revoke' | 'delete'
    key: ApiKey
  } | null>(null)

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

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await ApiKeyController_revoke(keyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', 'list'] })
      toast.success('API key revoked')
      setActionTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to revoke key'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await ApiKeyController_delete(keyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', 'list'] })
      toast.success('API key permanently deleted')
      setActionTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete key'),
  })

  const keys = data?.data ?? []
  const meta = data?.meta ?? { total: 0, page: 1, limit: 10 }
  const totalPages = Math.ceil(meta.total / meta.limit)

  return (
    <div className='space-y-6'>
      <PageHeader
        title='API Keys'
        description='Manage API keys for programmatic access'
        actions={
          <Button asChild>
            <Link to='/api-keys/new'>
              <Plus className='mr-2 h-4 w-4' />
              Create API Key
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
                <Input
                  placeholder='Search keys...'
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className='w-[150px]'>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='revoked'>Revoked</SelectItem>
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
          ) : keys.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden sm:table-cell'>Scopes</TableHead>
                  <TableHead className='hidden md:table-cell'>Expires</TableHead>
                  <TableHead className='hidden md:table-cell'>Created</TableHead>
                  <TableHead className='w-[110px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className='font-medium'>{key.keyName}</TableCell>
                    <TableCell>
                      <code className='rounded bg-muted px-1.5 py-0.5 text-xs font-mono'>
                        {key.keyPrefix ?? '--'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          key.isActive !== false
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }
                      >
                        {key.isActive !== false ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <span className='text-sm text-muted-foreground'>
                        {key.scopes?.length ?? 0} scope{key.scopes?.length !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/api-keys/$id' params={{ id: key.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        {key.isActive !== false ? (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-amber-600'
                            title='Revoke'
                            onClick={() => setActionTarget({ type: 'revoke', key })}
                          >
                            <ShieldX className='h-4 w-4' />
                          </Button>
                        ) : null}
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-red-600'
                          title='Delete'
                          onClick={() => setActionTarget({ type: 'delete', key })}
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

      {/* Pagination */}
      {meta.total > limit && (
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

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionTarget} onOpenChange={() => setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.type === 'revoke' ? 'Revoke API Key' : 'Delete API Key'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.type === 'revoke'
                ? `Are you sure you want to revoke "${actionTarget?.key.keyName}"? Any services using this key will lose access.`
                : `Are you sure you want to permanently delete "${actionTarget?.key.keyName}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionTarget?.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={() => {
                if (!actionTarget) return
                if (actionTarget.type === 'revoke') revokeMutation.mutate(actionTarget.key.id)
                else deleteMutation.mutate(actionTarget.key.id)
              }}
            >
              {actionTarget?.type === 'revoke' ? 'Revoke' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
