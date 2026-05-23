import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Globe,
  Laptop,
  Monitor,
  RefreshCw,
  Smartphone,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { SecurityController_getActiveSessions, SecurityController_revokeSession } from '@/lib/api/wms-saas-core-api/security-compliance/security-compliance'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Session {
  id: string
  userId?: string
  tenantId?: string
  device?: string
  browser?: string
  os?: string
  ipAddress?: string
  lastActive: string
  createdAt: string
  isCurrent?: boolean
}

function getDeviceIcon(device?: string) {
  const d = device?.toLowerCase() || ''
  if (d.includes('mobile') || d.includes('phone') || d.includes('ios') || d.includes('android')) return <Smartphone className='h-4 w-4' />
  if (d.includes('mac') || d.includes('windows') || d.includes('linux')) return <Laptop className='h-4 w-4' />
  return <Monitor className='h-4 w-4' />
}

export function SessionsPage() {
  const { data: sessions, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['security', 'sessions'],
    queryFn: async () => {
      const res = await SecurityController_getActiveSessions()
      return (res as unknown as { data: Session[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await SecurityController_revokeSession(sessionId)
    },
    onSuccess: () => {
      toast.success('Session revoked successfully')
      refetch()
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to revoke session'),
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Active Sessions'
        description='Monitor and manage active user sessions across the platform'
        actions={
          <Button variant='outline' size='icon' onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Active Sessions</CardTitle>
          <CardDescription>
            You can revoke access for any session. Revoking a session will immediately log out the user on that device.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : !sessions || sessions.length === 0 ? (
            <EmptyState
              title='No active sessions'
              description='There are no active sessions found in the system.'
              icon={Globe}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device / Browser</TableHead>
                  <TableHead>Location / IP</TableHead>
                  <TableHead>User / Tenant</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className='flex items-center gap-3'>
                        <div className='p-2 bg-muted rounded-md'>
                          {getDeviceIcon(session.os || session.device)}
                        </div>
                        <div>
                          <div className='font-medium flex items-center gap-2'>
                            {session.os || 'Unknown OS'} - {session.browser || 'Unknown Browser'}
                            {session.isCurrent && (
                              <Badge variant='outline' className='bg-primary/10 text-primary hover:bg-primary/10'>
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {session.device || 'Unknown Device'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='font-medium'>{session.ipAddress || 'Unknown IP'}</div>
                    </TableCell>
                    <TableCell>
                      <div className='font-medium text-xs font-mono'>{session.userId || 'N/A'}</div>
                      <div className='text-xs text-muted-foreground'>{session.tenantId || 'System'}</div>
                    </TableCell>
                    <TableCell>
                      <div className='font-medium'>
                        {session.lastActive ? format(new Date(session.lastActive), 'MMM d, yyyy') : '-'}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {session.lastActive ? format(new Date(session.lastActive), 'h:mm a') : ''}
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant='ghost' size='sm' className='text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50' disabled={session.isCurrent || revokeMutation.isPending}>
                            <XCircle className='h-4 w-4 mr-2' />
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke this session? The user will be immediately logged out on this device.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                              onClick={() => revokeMutation.mutate(session.id)}
                            >
                              Revoke Access
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
