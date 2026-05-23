import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Download,
  Eye,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ReportController_findAll } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_generate } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_download } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_remove } from '@/lib/api/wms-saas-core-api/reports/reports'
import type { ReportControllerFindAllParams } from '@/lib/types/wms-saas-core-api'
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

interface Report {
  id: string
  reportName: string
  reportType?: string
  format?: string
  description?: string
  status?: string
  parameters?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  generating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

function statusStyle(status?: string): string {
  return STATUS_STYLES[status?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

export function ReportsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const limit = 10

  const params: ReportControllerFindAllParams = {
    page,
    limit,
  }
  if (debouncedSearch) params.reportType = debouncedSearch
  if (typeFilter) params.status = typeFilter

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'list', page, limit, debouncedSearch, typeFilter],
    queryFn: async () => {
      const res = await ReportController_findAll(params)
      return (res as unknown as { data: Report[]; meta: PaginationMeta })
    },
    staleTime: 30_000,
  })

  const reports = data?.data ?? []
  const meta = data?.meta ?? { total: 0, page: 1, limit: 10 }
  const totalPages = Math.ceil(meta.total / meta.limit)

  let debounceTimer: ReturnType<typeof setTimeout>
  function handleSearch(value: string) {
    setSearch(value)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }

  function handleTypeFilter(value: string) {
    setTypeFilter(value)
    setPage(1)
  }

  const generateMutation = useMutation({
    mutationFn: async (id: string) => {
      await ReportController_generate(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] })
      toast.success('Report generation started')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to generate report'),
  })

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await ReportController_download(id)
      const blob = res as unknown as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to download report'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await ReportController_remove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] })
      toast.success('Report deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete report'),
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Reports'
        description='Create, schedule, and manage reports'
        actions={
          <Button asChild>
            <Link to='/reports/new'>
              <Plus className='mr-2 h-4 w-4' />
              Create Report
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
                  placeholder='Search by type...'
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='scheduled'>Scheduled</SelectItem>
                  <SelectItem value='generating'>Generating</SelectItem>
                  <SelectItem value='archived'>Archived</SelectItem>
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
          ) : reports.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className='hidden md:table-cell'>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden sm:table-cell'>Created</TableHead>
                  <TableHead className='w-[160px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className='font-medium'>{report.reportName}</TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {report.reportType ?? '-'}
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <Badge variant='outline'>{report.format?.toUpperCase() ?? 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline' className={statusStyle(report.status)}>
                        {report.status ?? 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {formatDate(report.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/reports/$id' params={{ id: report.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='Generate now'
                          onClick={() => generateMutation.mutate(report.id)}
                          disabled={generateMutation.isPending}
                        >
                          {generateMutation.isPending ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <Play className='h-4 w-4' />
                          )}
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='Download'
                          onClick={() => downloadMutation.mutate(report.id)}
                          disabled={downloadMutation.isPending}
                        >
                          <Download className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-red-600'
                          title='Delete'
                          onClick={() =>
                            setDeleteTarget({ id: report.id, name: report.reportName })
                          }
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

      {meta.total > 0 && (
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <p>
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, meta.total)} of{' '}
            {meta.total}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be
              undone.
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
