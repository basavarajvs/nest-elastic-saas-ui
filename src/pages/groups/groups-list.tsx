import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { GroupController_findAll } from '@/lib/api/wms-saas-core-api/groups/groups'
import { GroupController_remove } from '@/lib/api/wms-saas-core-api/groups/groups'
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

interface Group {
  id: string
  groupName: string
  groupType?: string
  groupDescription?: string
  metadata?: Record<string, unknown>
  memberCount?: number
  createdAt: string
  updatedAt?: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

const TYPE_STYLES: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  custom: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

function typeStyle(type?: string): string {
  return TYPE_STYLES[type?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

export function GroupsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['groups', 'list'],
    queryFn: async () => {
      const res = await GroupController_findAll()
      return (res as unknown as { data: Group[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const groups = data ?? []

  const debounceTimer = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>
    return (value: string) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setDebouncedSearch(value)
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

  const filtered = useMemo(() => {
    if (!debouncedSearch) return groups
    const q = debouncedSearch.toLowerCase()
    return groups.filter(
      (g) =>
        g.groupName.toLowerCase().includes(q) ||
        (g.groupDescription ?? '').toLowerCase().includes(q) ||
        (g.groupType ?? '').toLowerCase().includes(q),
    )
  }, [groups, debouncedSearch])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await GroupController_remove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })
      toast.success('Group deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete group'),
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Groups'
        description='Manage all groups across the platform'
        actions={
          <Button asChild>
            <Link to='/groups/new'>
              <Plus className='mr-2 h-4 w-4' />
              Create Group
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search groups...'
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className='pl-8'
              />
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
            <EmptyState title={search ? 'No groups match your search' : 'No groups found'} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className='hidden md:table-cell'>Description</TableHead>
                  <TableHead className='hidden sm:table-cell'>Created</TableHead>
                  <TableHead className='w-[100px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className='font-medium'>{group.groupName}</TableCell>
                    <TableCell>
                      <Badge variant='outline' className={typeStyle(group.groupType)}>
                        {group.groupType ?? 'standard'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden max-w-[250px] truncate text-sm text-muted-foreground md:table-cell'>
                      {group.groupDescription ?? '-'}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {formatDate(group.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/groups/$id' params={{ id: group.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-red-600'
                          title='Delete'
                          onClick={() => setDeleteTarget({ id: group.id, name: group.groupName })}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
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
