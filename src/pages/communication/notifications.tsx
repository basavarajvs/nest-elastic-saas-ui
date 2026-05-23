import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Archive,
  BellOff,
  CheckCheck,
  MailOpen,
  MailQuestion,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationController_getNotifications } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import { NotificationController_getUnreadCount } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import { NotificationController_markAsRead } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import { NotificationController_markAllAsRead } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import { NotificationController_archive } from '@/lib/api/wms-saas-core-api/notifications/notifications'
import type { NotificationControllerGetNotificationsParams } from '@/lib/types/wms-saas-core-api'
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
import { Switch } from '@/components/ui/switch'

interface NotificationItem {
  id: string
  title?: string
  content?: string
  notificationType?: string
  channel?: string
  read?: boolean
  archived?: boolean
  recipientId?: string
  recipientRoleCode?: string
  tenantCode?: string
  createdAt: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  push: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  in_app: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sms: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

function channelBadge(channel?: string): string {
  return CHANNEL_COLORS[channel?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

const NOTIFICATION_TYPES = ['announcement', 'alert', 'maintenance', 'reminder', 'system'] as const

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [notificationType, setNotificationType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null)
  const limit = 10

  const params: NotificationControllerGetNotificationsParams = {
    page: String(page),
    limit: String(limit),
    unreadOnly: String(unreadOnly),
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', page, limit, unreadOnly, debouncedSearch, notificationType, dateFrom, dateTo],
    queryFn: async () => {
      const res = await NotificationController_getNotifications(params)
      return (res as unknown as { data: NotificationItem[]; meta: { total: number; page: number; limit: number } })
    },
    staleTime: 30_000,
  })

  const notifications = data?.data ?? []
  const meta = data?.meta ?? { total: 0, page: 1, limit: 10 }
  const totalPages = Math.ceil(meta.total / meta.limit)

  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await NotificationController_getUnreadCount()
      return (res as unknown as { count: number }).count ?? 0
    },
    staleTime: 30_000,
  })

  const unreadCount = unreadCountData ?? 0

  const filtered = notifications.filter((n) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      if (!n.title?.toLowerCase().includes(q) && !n.content?.toLowerCase().includes(q) && !n.notificationType?.toLowerCase().includes(q)) {
        return false
      }
    }
    if (notificationType && n.notificationType !== notificationType) return false
    if (dateFrom && n.createdAt && new Date(n.createdAt) < new Date(dateFrom)) return false
    if (dateTo && n.createdAt) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      if (new Date(n.createdAt) > end) return false
    }
    return true
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await NotificationController_markAsRead(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      toast.success('Marked as read')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to mark as read'
      toast.error(msg)
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await NotificationController_markAllAsRead()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      toast.success('All notifications marked as read')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to mark all as read'
      toast.error(msg)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await NotificationController_archive(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notification archived')
      setArchiveTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to archive'
      toast.error(msg)
    },
  })

  let debounceTimer: ReturnType<typeof setTimeout>
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }, [])

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Notifications</h1>
          <p className='text-sm text-muted-foreground'>
            View and manage system notifications
            {unreadCount > 0 && (
              <span className='ml-2 font-medium text-foreground'>({unreadCount} unread)</span>
            )}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {unreadCount > 0 && (
            <Button variant='outline' size='sm' onClick={() => markAllAsReadMutation.mutate()}>
              <CheckCheck className='mr-2 h-4 w-4' />
              Mark All Read
            </Button>
          )}
          <Button asChild>
            <Link to='/notifications/broadcast'>
              <Send className='mr-2 h-4 w-4' />
              Broadcast
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              <div className='relative flex-1 min-w-[200px] max-w-xs'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search notifications...'
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <div className='flex items-center gap-2'>
                <label className='flex items-center gap-2 text-sm'>
                  <Switch checked={unreadOnly} onCheckedChange={(v) => { setUnreadOnly(v); setPage(1) }} />
                  Unread only
                </label>
              </div>
              <Select value={notificationType} onValueChange={(v) => { setNotificationType(v); setPage(1) }}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=' '>All Types</SelectItem>
                  {NOTIFICATION_TYPES.map((t) => (
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
                <Skeleton key={i} className='h-16 w-full' />
              ))}
            </div>
          ) : isError ? (
            <div className='p-6 text-center text-sm text-destructive'>
              Failed to load notifications: {(error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              <BellOff className='mx-auto h-8 w-8 mb-2 opacity-50' />
              {debouncedSearch || notificationType ? 'No notifications match your filters' : 'No notifications found'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead className='w-4'></TableHead>
                    <TableHead className='hidden lg:table-cell'>Notification ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className='hidden sm:table-cell'>Recipient</TableHead>
                    <TableHead className='hidden sm:table-cell'>Type</TableHead>
                    <TableHead className='hidden md:table-cell'>Channel</TableHead>
                    <TableHead className='hidden lg:table-cell'>Content</TableHead>
                    <TableHead className='hidden md:table-cell'>Timestamp</TableHead>
                    <TableHead className='w-[120px]'>Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => (
                  <TableRow key={n.id} className={n.read ? '' : 'bg-muted/30'}>
                    <TableCell>
                      {n.read ? (
                        <MailOpen className='h-4 w-4 text-muted-foreground' />
                      ) : (
                        <MailQuestion className='h-4 w-4 text-primary' />
                      )}
                    </TableCell>
                    <TableCell className='hidden font-mono text-xs text-muted-foreground lg:table-cell'>
                      {n.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className='font-medium'>{n.title ?? '-'}</TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {n.recipientId ? (
                        <span className='font-mono text-xs'>{n.recipientId.slice(0, 8)}...</span>
                      ) : n.recipientRoleCode ? (
                        <Badge variant='outline' className='text-xs'>{n.recipientRoleCode}</Badge>
                      ) : n.tenantCode ? (
                        <span className='text-xs'>{n.tenantCode}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <Badge variant='outline' className='text-xs capitalize'>{n.notificationType ?? '-'}</Badge>
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <Badge variant='outline' className={channelBadge(n.channel)}>
                        {n.channel ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden max-w-[250px] truncate text-sm text-muted-foreground lg:table-cell'>
                      {n.content ?? '-'}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground whitespace-nowrap md:table-cell'>
                      {formatDate(n.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        {!n.read && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            title='Mark as read'
                            onClick={() => markAsReadMutation.mutate(n.id)}
                          >
                            <CheckCheck className='h-4 w-4 text-blue-600' />
                          </Button>
                        )}
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          title='Archive'
                          onClick={() => setArchiveTarget({ id: n.id, title: n.title ?? 'this notification' })}
                        >
                          <Archive className='h-4 w-4 text-red-600' />
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

      <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archiveTarget?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => { if (archiveTarget) archiveMutation.mutate(archiveTarget.id) }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
