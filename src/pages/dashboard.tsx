import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'
import {
  Banknote,
  Bell,
  Building2,
  CreditCard,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { SystemAdminController_getStats } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { SystemAdminController_getPendingPayments } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { SystemAdminController_getAudit } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { SystemAdminController_getSecurityEvents } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { SecurityController_getSummary } from '@/lib/api/wms-saas-core-api/security/security'
import { AuditController_summary } from '@/lib/api/wms-saas-core-api/audit/audit'
import { UserController_findAll } from '@/lib/api/wms-saas-core-api/users/users'
import { SubscriptionController_findAll_v2 } from '@/lib/api/wms-saas-core-api/billing-subscriptions/billing-subscriptions'
import { NotificationController_getNotifications } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import { NotificationController_getUnreadCount } from '@/lib/api/wms-saas-core-api/notifications/notifications'

interface TrendProps {
  value: string
  positive: boolean
}

function Trend({ value, positive }: TrendProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}
    >
      {positive ? (
        <TrendingUp className='h-3 w-3' />
      ) : (
        <TrendingDown className='h-3 w-3' />
      )}
      {value}
    </span>
  )
}

interface SystemStats {
  totalTenants?: number
  activeTenants?: number
  totalUsers?: number
  activeUsers?: number
  totalSubscriptions?: number
  activeSubscriptions?: number
  pendingPayments?: number
  mrr?: number
  activeUsersCount?: number
  subscriptions?: { id: string; status: string; tenantId: string }[]
}

interface AuditSummaryData {
  totalEvents?: number
  eventsByDay?: { date: string; count: number }[]
  eventsByType?: { type: string; count: number }[]
}

interface SecuritySummaryData {
  totalEvents?: number
  unresolvedCount?: number
  eventsBySeverity?: { severity: string; count: number }[]
}

interface NotificationItem {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
  recipientId?: string
}

interface SecurityEvent {
  id: string
  eventType: string
  severity: string
  description: string
  source: string
  resolved: boolean
  createdAt: string
  tenantId?: string
}

interface AuditEntry {
  id: string
  userId: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  createdAt: string
  metadata?: Record<string, unknown>
}

interface SubscriptionItem {
  id: string
  status: string
  tenantId: string
  tenantName?: string
  planName?: string
}

const COLORS: Record<string, string> = {
  active: '#22c55e',
  cancelled: '#ef4444',
  expired: '#f59e0b',
  pending: '#6366f1',
  suspended: '#a855f7',
  other: '#6b7280',
}

function subscriptionColor(status: string): string {
  return COLORS[status?.toLowerCase()] ?? COLORS.other
}

function severityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'destructive'
    case 'medium':
      return 'warning'
    case 'low':
      return 'secondary'
    default:
      return 'outline'
  }
}

function notificationTypeIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'alert':
    case 'security':
      return <ShieldAlert className='h-3.5 w-3.5 text-destructive' />
    case 'billing':
      return <CreditCard className='h-3.5 w-3.5 text-yellow-500' />
    case 'system':
      return <Building2 className='h-3.5 w-3.5 text-blue-500' />
    default:
      return <Bell className='h-3.5 w-3.5 text-muted-foreground' />
  }
}

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <Skeleton className='h-4 w-28' />
        <Skeleton className='h-4 w-4 rounded-full' />
      </CardHeader>
      <CardContent>
        <Skeleton className='mb-1 h-8 w-20' />
        <Skeleton className='h-3 w-24' />
      </CardContent>
    </Card>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-10 w-full' />
      ))}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60_000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return format(date, 'MMM d')
  } catch {
    return dateStr
  }
}

function subsCountBy(items: SubscriptionItem[]): { name: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const val = item.status ?? 'unknown'
    map.set(val, (map.get(val) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ['system-admin', 'stats'],
    queryFn: async () => {
      const res = await SystemAdminController_getStats()
      return (res as unknown as { data: SystemStats }).data ?? ({} as SystemStats)
    },
    staleTime: 60_000,
  })

  const pendingPayments = useQuery({
    queryKey: ['system-admin', 'pending-payments'],
    queryFn: async () => {
      const res = await SystemAdminController_getPendingPayments()
      return (res as unknown as { data: { total: number; payments: unknown[] } }).data ?? {
        total: 0,
        payments: [],
      }
    },
    staleTime: 60_000,
  })

  const activeUsers = useQuery({
    queryKey: ['users', 'active'],
    queryFn: async () => {
      const res = await UserController_findAll({ status: 'active', limit: 1 })
      return (res as unknown as { meta?: { total: number } }).meta?.total ?? 0
    },
    staleTime: 60_000,
  })

  const subscriptions = useQuery({
    queryKey: ['subscriptions', 'all'],
    queryFn: async () => {
      const res = await SubscriptionController_findAll_v2({ limit: 500 })
      return (res as unknown as { data: SubscriptionItem[] }).data ?? []
    },
    staleTime: 60_000,
  })

  const auditSummary = useQuery({
    queryKey: ['audit', 'summary'],
    queryFn: async () => {
      const res = await AuditController_summary()
      return (res as unknown as { data: AuditSummaryData }).data ?? ({} as AuditSummaryData)
    },
    staleTime: 120_000,
  })

  const securitySummary = useQuery({
    queryKey: ['security', 'summary'],
    queryFn: async () => {
      const res = await SecurityController_getSummary()
      return (res as unknown as { data: SecuritySummaryData }).data ?? ({} as SecuritySummaryData)
    },
    staleTime: 120_000,
  })

  const recentSecurityEvents = useQuery({
    queryKey: ['security', 'recent'],
    queryFn: async () => {
      const res = await SystemAdminController_getSecurityEvents({ limit: 10, page: 1 })
      return (res as unknown as { data: SecurityEvent[] }).data ?? []
    },
    staleTime: 60_000,
  })

  const recentNotifications = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const res = await NotificationController_getNotifications({ page: '1', limit: '10', unreadOnly: 'false' })
      return (res as unknown as { data: NotificationItem[] }).data ?? []
    },
    staleTime: 60_000,
  })

  const unreadCount = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await NotificationController_getUnreadCount()
      return (res as unknown as { data: { count: number } }).data?.count ?? 0
    },
    staleTime: 30_000,
  })

  const recentAuditLogs = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: async () => {
      const res = await SystemAdminController_getAudit({ limit: 10, page: 1 })
      return (res as unknown as { data: AuditEntry[] }).data ?? []
    },
    staleTime: 60_000,
  })

  const subscriptionDistribution = subscriptions.data
    ? subsCountBy(subscriptions.data)
    : []

  const chartData = auditSummary.data?.eventsByDay ?? []

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            System Overview
          </h1>
          <p className='text-sm text-muted-foreground'>{dateStr}</p>
        </div>
      </div>

      <Separator />

      {/* KPI Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {stats.isLoading ? (
          <KpiSkeleton />
        ) : (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Active Tenants
              </CardTitle>
              <Building2 className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold'>
                  {stats.data?.activeTenants ?? '-'}
                </div>
                <Trend value='+2.5%' positive />
              </div>
              <p className='text-xs text-muted-foreground'>
                out of {stats.data?.totalTenants ?? '-'} total
              </p>
            </CardContent>
          </Card>
        )}

        {activeUsers.isLoading ? (
          <KpiSkeleton />
        ) : (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Active Users
              </CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold'>
                  {activeUsers.data ?? '-'}
                </div>
                <Trend value='+1.8%' positive />
              </div>
              <p className='text-xs text-muted-foreground'>
                across all tenants
              </p>
            </CardContent>
          </Card>
        )}

        {subscriptions.isLoading ? (
          <KpiSkeleton />
        ) : (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Active Subscriptions
              </CardTitle>
              <Banknote className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold'>
                  {subscriptions.data?.filter((s) => s.status === 'active')
                    .length ?? '-'}
                </div>
                <Trend value='+0.5%' positive />
              </div>
              <p className='text-xs text-muted-foreground'>
                {subscriptions.data?.length ?? 0} total
              </p>
            </CardContent>
          </Card>
        )}

        {pendingPayments.isLoading ? (
          <KpiSkeleton />
        ) : (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Pending Payments
              </CardTitle>
              <CreditCard className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold'>
                  {pendingPayments.data?.total ?? '-'}
                </div>
                <Trend value='-1.2%' positive={false} />
              </div>
              <p className='text-xs text-muted-foreground'>
                awaiting confirmation
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Secondary KPI Row */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {stats.isLoading ? (
          <KpiSkeleton />
        ) : (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Monthly Recurring Revenue
              </CardTitle>
              <Banknote className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold'>
                  {stats.data?.mrr != null
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      }).format(stats.data.mrr)
                    : '-'}
                </div>
                <Trend value='+3.2%' positive />
              </div>
            </CardContent>
          </Card>
        )}

        {securitySummary.isLoading ? (
          <KpiSkeleton />
        ) : (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Security Events
              </CardTitle>
              <ShieldAlert className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold'>
                  {securitySummary.data?.totalEvents ?? '-'}
                </div>
                <Trend value='-5.1%' positive={false} />
              </div>
              <p className='text-xs text-muted-foreground'>
                {securitySummary.data?.unresolvedCount ?? 0} unresolved
              </p>
            </CardContent>
          </Card>
        )}

        {unreadCount.isLoading ? (
          <KpiSkeleton />
        ) : (
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Unread Notifications
              </CardTitle>
              <Bell className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold'>
                  {unreadCount.data ?? '-'}
                </div>
                <Trend value='-0.8%' positive={false} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Section */}
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>
              Distribution across all tenants
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.isLoading ? (
              <Skeleton className='h-64 w-full' />
            ) : subscriptionDistribution.length === 0 ? (
              <div className='flex h-64 items-center justify-center text-sm text-muted-foreground'>
                No subscription data
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={280}>
                <BarChart data={subscriptionDistribution}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    className='stroke-border'
                  />
                  <XAxis dataKey='name' tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey='count' radius={[4, 4, 0, 0]}>
                    {subscriptionDistribution.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={subscriptionColor(entry.name)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Activity</CardTitle>
            <CardDescription>Events per day (7-day)</CardDescription>
          </CardHeader>
          <CardContent>
            {auditSummary.isLoading ? (
              <Skeleton className='h-64 w-full' />
            ) : chartData.length === 0 ? (
              <div className='flex h-64 items-center justify-center text-sm text-muted-foreground'>
                No audit data
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id='auditGradient'
                      x1='0'
                      y1='0'
                      x2='0'
                      y2='1'
                    >
                      <stop
                        offset='5%'
                        stopColor='hsl(var(--primary))'
                        stopOpacity={0.3}
                      />
                      <stop
                        offset='95%'
                        stopColor='hsl(var(--primary))'
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    className='stroke-border'
                  />
                  <XAxis
                    dataKey='date'
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      try {
                        return format(new Date(v), 'MMM d')
                      } catch {
                        return v
                      }
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontSize: 13,
                    }}
                    labelFormatter={(v) => {
                      try {
                        return format(new Date(v), 'MMM d, yyyy')
                      } catch {
                        return v
                      }
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='count'
                    stroke='hsl(var(--primary))'
                    fill='url(#auditGradient)'
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className='grid gap-6 lg:grid-cols-3'>
        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle className='text-base'>
              Recent Security Events
            </CardTitle>
            <CardDescription>Latest 10 events</CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            {recentSecurityEvents.isLoading ? (
              <div className='p-6 pt-0'>
                <TableSkeleton rows={4} />
              </div>
            ) : recentSecurityEvents.data?.length === 0 ? (
              <div className='p-6 pt-0 text-sm text-muted-foreground'>
                No security events
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className='hidden sm:table-cell'>
                      Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentSecurityEvents.data ?? [])
                    .slice(0, 8)
                    .map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge
                            variant={
                              severityColor(event.severity) as
                                | 'destructive'
                                | 'secondary'
                                | 'outline'
                            }
                          >
                            {event.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className='max-w-[160px] truncate font-medium'>
                          {event.eventType ?? event.description}
                        </TableCell>
                        <TableCell className='hidden text-xs text-muted-foreground sm:table-cell'>
                          {formatRelativeTime(event.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle className='text-base'>
              Recent Notifications
            </CardTitle>
            <CardDescription>Latest 10</CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            {recentNotifications.isLoading ? (
              <div className='p-6 pt-0'>
                <TableSkeleton rows={4} />
              </div>
            ) : recentNotifications.data?.length === 0 ? (
              <div className='p-6 pt-0 text-sm text-muted-foreground'>
                No notifications
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-8' />
                    <TableHead>Message</TableHead>
                    <TableHead className='hidden sm:table-cell'>
                      Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentNotifications.data ?? [])
                    .slice(0, 8)
                    .map((notif) => (
                      <TableRow key={notif.id}>
                        <TableCell>
                          {notificationTypeIcon(notif.type)}
                        </TableCell>
                        <TableCell className='max-w-[180px] truncate text-sm'>
                          {notif.message}
                        </TableCell>
                        <TableCell className='hidden text-xs text-muted-foreground sm:table-cell'>
                          {formatRelativeTime(notif.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle className='text-base'>
              Recent Audit Logs
            </CardTitle>
            <CardDescription>Latest 10 actions</CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            {recentAuditLogs.isLoading ? (
              <div className='p-6 pt-0'>
                <TableSkeleton rows={4} />
              </div>
            ) : recentAuditLogs.data?.length === 0 ? (
              <div className='p-6 pt-0 text-sm text-muted-foreground'>
                No audit logs
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className='hidden md:table-cell'>
                      User
                    </TableHead>
                    <TableHead className='hidden sm:table-cell'>
                      Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentAuditLogs.data ?? [])
                    .slice(0, 8)
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className='max-w-[140px] truncate font-medium'>
                          {entry.action}
                        </TableCell>
                        <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                          {entry.userEmail ??
                            entry.userId?.slice(0, 8)}
                        </TableCell>
                        <TableCell className='hidden text-xs text-muted-foreground sm:table-cell'>
                          {formatRelativeTime(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
