import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AuditController_query } from '@/lib/api/wms-saas-core-api/audit/audit'
import { AuditController_export } from '@/lib/api/wms-saas-core-api/audit/audit'
import { AuditController_summary } from '@/lib/api/wms-saas-core-api/audit/audit'
import type { AuditControllerQueryParams } from '@/lib/types/wms-saas-core-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AuditEntry {
  id: string
  timestamp?: string
  eventType?: string
  resourceType?: string
  resourceId?: string
  userId?: string
  ipAddress?: string
  description?: string
  metadata?: Record<string, unknown>
}

interface AuditSummary {
  totalEvents?: number
  uniqueUsers?: number
  eventTypeBreakdown?: Record<string, number>
  resourceTypeBreakdown?: Record<string, number>
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const params: AuditControllerQueryParams = {}
  if (search) params.resourceId = search
  if (eventType) params.eventType = eventType
  if (resourceType) params.resourceType = resourceType
  params.page = page
  params.limit = limit

  const { data: queryData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit', 'query', params],
    queryFn: async () => {
      const res = await AuditController_query(params)
      return (res as unknown as { data: AuditEntry[]; total?: number; meta?: { total?: number } }).data ?? []
    },
    staleTime: 30_000,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['audit', 'summary'],
    queryFn: async () => {
      const res = await AuditController_summary()
      return (res as unknown as { data: AuditSummary }).data ?? {}
    },
    staleTime: 60_000,
  })

  const summary = (summaryData ?? {}) as AuditSummary
  const entries = (queryData ?? []) as AuditEntry[]
  const totalPages = 5

  function handleSearch() {
    setPage(1)
  }

  const eventTypes = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT']
  const resourceTypes = ['USER', 'TENANT', 'ROLE', 'SETTING', 'REPORT', 'INTEGRATION', 'WEBHOOK']

  async function handleExport() {
    try {
      await AuditController_export(params)
      toast.success('Audit log export started')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Export failed'
      toast.error(msg)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Audit Logs</h1>
          <p className='text-sm text-muted-foreground'>View and export system audit trail</p>
        </div>
        <Button variant='outline' onClick={handleExport}>
          <Download className='mr-2 h-4 w-4' />
          Export CSV
        </Button>
      </div>

      {!isLoading && summary && (
        <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Total Events (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-3xl font-bold'>{summary.totalEvents ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Unique Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-3xl font-bold'>{summary.uniqueUsers ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-3xl font-bold'>
                {summary.eventTypeBreakdown ? Object.keys(summary.eventTypeBreakdown).length : 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-3xl font-bold'>
                {summary.resourceTypeBreakdown ? Object.keys(summary.resourceTypeBreakdown).length : 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 gap-2 flex-wrap'>
              <div className='relative min-w-[200px] max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by resource ID...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className='pl-8'
                />
              </div>
              <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1) }}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Event Type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Types</SelectItem>
                  {eventTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resourceType} onValueChange={(v) => { setResourceType(v); setPage(1) }}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Resource Type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Resources</SelectItem>
                  {resourceTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
            <div className='p-6 space-y-3'>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : isError ? (
            <div className='p-6 text-center text-sm text-destructive'>
              Failed to load audit logs: {(error as Error).message}
            </div>
          ) : entries.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              No audit log entries found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead className='hidden md:table-cell'>Resource</TableHead>
                    <TableHead className='hidden lg:table-cell'>Resource ID</TableHead>
                    <TableHead className='hidden sm:table-cell'>User</TableHead>
                    <TableHead className='hidden xl:table-cell'>IP Address</TableHead>
                    <TableHead className='max-w-[300px]'>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className='text-sm text-muted-foreground whitespace-nowrap'>
                        {entry.timestamp ? formatDate(entry.timestamp) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='font-mono text-xs'>{entry.eventType ?? '-'}</Badge>
                      </TableCell>
                      <TableCell className='hidden md:table-cell text-sm'>{entry.resourceType ?? '-'}</TableCell>
                      <TableCell className='hidden lg:table-cell font-mono text-xs text-muted-foreground'>
                        {entry.resourceId ? `${entry.resourceId.slice(0, 8)}...` : '-'}
                      </TableCell>
                      <TableCell className='hidden sm:table-cell font-mono text-xs text-muted-foreground'>
                        {entry.userId ? `${entry.userId.slice(0, 8)}...` : '-'}
                      </TableCell>
                      <TableCell className='hidden xl:table-cell font-mono text-xs text-muted-foreground'>
                        {entry.ipAddress ?? '-'}
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground truncate max-w-[300px]'>
                        {entry.description ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className='flex items-center justify-center gap-2 p-4 border-t'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className='h-4 w-4' />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
