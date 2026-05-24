import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SecurityController_findAll,
  SecurityController_getSummary,
  SecurityController_getUnresolved,
  SecurityController_resolve,
} from '@/lib/api/wms-saas-core-api/security/security'
import type { SecurityControllerFindAllParams } from '@/lib/types/wms-saas-core-api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SecurityEvent {
  id: string
  eventType?: string
  severity?: string
  description?: string
  source?: string
  ipAddress?: string
  resolved?: boolean
  userId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface SecuritySummary {
  totalEvents?: number
  unresolvedCount?: number
  criticalCount?: number
  highCount?: number
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

function severityStyle(severity?: string): string {
  return SEVERITY_STYLES[severity?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

function severityRow(severity?: string): string {
  const s = severity?.toLowerCase()
  if (s === 'critical') return 'bg-red-50/50 dark:bg-red-950/10'
  if (s === 'high') return 'bg-orange-50/50 dark:bg-orange-950/10'
  return ''
}

export function SecurityEventsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [severityFilter, setSeverityFilter] = useState('')
  const [resolvedFilter, setResolvedFilter] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [resolveTarget, setResolveTarget] = useState<{ id: string; desc: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'unresolved'>('all')
  const limit = 10

  const params: SecurityControllerFindAllParams = { page, limit }
  if (eventTypeFilter) params.eventType = eventTypeFilter
  if (severityFilter) params.severity = severityFilter
  if (resolvedFilter) params.resolved = resolvedFilter
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['security', 'events', page, limit, eventTypeFilter, severityFilter, resolvedFilter, dateFrom, dateTo],
    queryFn: async () => {
      const res = await SecurityController_findAll(params)
      return (res as unknown as { data: SecurityEvent[]; meta: { total: number; page: number; limit: number } })
    },
    staleTime: 30_000,
  })

  const events = data?.data ?? []
  const eventTypes = Array.from(new Set(events.map((e) => e.eventType).filter(Boolean) as string[])).sort()
  const meta = data?.meta ?? { total: 0, page: 1, limit: 10 }
  const totalPages = Math.ceil(meta.total / meta.limit)

  const trendData = useMemo(() => {
    const byDay: Record<string, number> = {}
    events.forEach((e) => {
      const day = (e.createdAt || '').slice(0, 10)
      if (day) byDay[day] = (byDay[day] || 0) + 1
    })
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  }, [events])

  const { data: summary } = useQuery({
    queryKey: ['security', 'summary'],
    queryFn: async () => {
      const res = await SecurityController_getSummary()
      return (res as unknown as { data: SecuritySummary }).data ?? ({} as SecuritySummary)
    },
    staleTime: 60_000,
  })

  const { data: unresolvedData, isLoading: unresolvedLoading, refetch: refetchUnresolved } = useQuery({
    queryKey: ['security', 'unresolved'],
    queryFn: async () => {
      const res = await SecurityController_getUnresolved()
      return (res as unknown as { data: SecurityEvent[] }).data ?? []
    },
    staleTime: 30_000,
    enabled: activeTab === 'unresolved',
  })

  const unresolvedEvents = unresolvedData ?? []

  const handleSeverityFilter = useCallback((value: string) => {
    setSeverityFilter(value)
    setPage(1)
  }, [])

  const handleResolvedFilter = useCallback((value: string) => {
    setResolvedFilter(value)
    setPage(1)
  }, [])

  const handleEventTypeFilter = useCallback((value: string) => {
    setEventTypeFilter(value)
    setPage(1)
  }, [])

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await SecurityController_resolve(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'events'] })
      queryClient.invalidateQueries({ queryKey: ['security', 'summary'] })
      toast.success('Event resolved')
      setResolveTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to resolve event'),
  })

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Security Events</h1>
        <p className='text-sm text-muted-foreground'>
          Monitor and manage security events across the platform
        </p>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold'>{summary?.totalEvents ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Unresolved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-amber-600'>{summary?.unresolvedCount ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-red-600'>{summary?.criticalCount ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>High</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-orange-600'>{summary?.highCount ?? '-'}</p>
          </CardContent>
        </Card>
       </div>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Events Trend (from current page)</CardTitle>
          </CardHeader>
          <CardContent className='h-[180px] pl-2'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey='count' fill='var(--primary)' radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className='mb-2'>
          <TabsTrigger value='all'>All Events</TabsTrigger>
          <TabsTrigger value='unresolved'>Unresolved ({unresolvedEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value='all'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <Select value={severityFilter} onValueChange={handleSeverityFilter}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Severity' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Severities</SelectItem>
                  <SelectItem value='critical'>Critical</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='low'>Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resolvedFilter} onValueChange={handleResolvedFilter}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Status</SelectItem>
                  <SelectItem value='false'>Unresolved</SelectItem>
                  <SelectItem value='true'>Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventTypeFilter} onValueChange={handleEventTypeFilter}>
                <SelectTrigger className='w-[160px]'>
                  <SelectValue placeholder='Event Type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Types</SelectItem>
                  {eventTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className='flex items-center gap-1'>
                <span className='text-xs text-muted-foreground'>From</span>
                <Input
                  type='date'
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  className='h-8 w-[140px] text-xs'
                />
                <span className='text-xs text-muted-foreground'>To</span>
                <Input
                  type='date'
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  className='h-8 w-[140px] text-xs'
                />
              </div>
            </div>
            <Button variant='outline' size='icon' onClick={() => refetch()}>
              <RefreshCw className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-6 space-y-3'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : isError ? (
            <div className='p-6 text-center text-sm text-destructive'>
              Failed to load events: {(error as Error).message}
            </div>
          ) : events.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              No security events found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='hidden lg:table-cell'>Event ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead className='hidden md:table-cell'>User</TableHead>
                  <TableHead className='hidden xl:table-cell'>IP Address</TableHead>
                  <TableHead className='hidden md:table-cell'>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='w-[100px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} className={severityRow(event.severity)}>
                    <TableCell className='hidden font-mono text-xs text-muted-foreground lg:table-cell'>
                      {event.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className='text-sm whitespace-nowrap'>
                      {formatDate(event.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline' className={severityStyle(event.severity)}>
                        {event.severity ?? 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className='font-medium'>{event.eventType ?? '-'}</TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {event.userId ? (
                        <span className='font-mono text-xs'>{event.userId.slice(0, 8)}...</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className='hidden font-mono text-xs text-muted-foreground xl:table-cell'>
                      {event.ipAddress ?? '-'}
                    </TableCell>
                    <TableCell className='hidden max-w-[300px] truncate text-sm text-muted-foreground md:table-cell'>
                      {event.description ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.resolved ? 'secondary' : 'default'}>
                        {event.resolved ? 'Resolved' : 'Open'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!event.resolved && (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-green-600'
                          title='Resolve'
                          onClick={() =>
                            setResolveTarget({ id: event.id, desc: event.description ?? event.eventType ?? 'this event' })
                          }
                        >
                          <CheckCircle2 className='h-4 w-4' />
                        </Button>
                      )}
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

        <TabsContent value='unresolved'>
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Unresolved Events</CardTitle>
                  <CardDescription>Events requiring attention</CardDescription>
                </div>
                <Button variant='outline' size='icon' onClick={() => refetchUnresolved()}>
                  <RefreshCw className='h-4 w-4' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-0'>
              {unresolvedLoading ? (
                <div className='p-6 space-y-3'>
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-10 w-full' />)}
                </div>
              ) : unresolvedEvents.length === 0 ? (
                <div className='p-6 text-center text-sm text-muted-foreground'>No unresolved events</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unresolvedEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className='text-sm'>{formatDate(event.createdAt)}</TableCell>
                        <TableCell><Badge className={severityStyle(event.severity)}>{event.severity}</Badge></TableCell>
                        <TableCell>{event.eventType}</TableCell>
                        <TableCell className='max-w-[300px] truncate text-sm'>{event.description}</TableCell>
                        <TableCell>
                          <Button size='sm' variant='ghost' onClick={() => setResolveTarget({ id: event.id, desc: event.description ?? '' })}>
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

       <AlertDialog open={!!resolveTarget} onOpenChange={() => setResolveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Event</AlertDialogTitle>
            <AlertDialogDescription>
              Mark "{resolveTarget?.desc}" as resolved?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (resolveTarget) resolveMutation.mutate(resolveTarget.id) }}>
              Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
