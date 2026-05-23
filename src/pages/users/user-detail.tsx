import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  FilePenLine,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  ShieldOff,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { UserController_findOne, UserController_remove, UserController_resetPin } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_deactivate } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_reactivate } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_revokeRole } from '@/lib/api/wms-saas-core-api/users/users'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Info } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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

interface UserDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  phone?: string
  locale?: string
  timezone?: string
  roles?: { id: string; name: string; code?: string }[]
  createdAt: string
  updatedAt?: string
}

export function UserDetailPage() {
  const { id: userId } = useParams({ from: '/_authenticated/users/$id' })
  const search = useSearch({ from: '/_authenticated/users/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | 'delete' | null>(null)

  const user = useQuery({
    queryKey: ['users', 'detail', userId],
    queryFn: async () => {
      const res = await UserController_findOne(userId)
      return (res as unknown as { data: UserDetail }).data
    },
    enabled: !!userId,
    staleTime: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: async (action: 'deactivate' | 'reactivate') => {
      if (action === 'deactivate') {
        await UserController_deactivate(userId)
      } else {
        await UserController_reactivate(userId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId] })
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('User status updated')
      setConfirmAction(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update user status'),
  })

  const resetPinMutation = useMutation({
    mutationFn: async () => {
      await UserController_resetPin(userId)
    },
    onSuccess: () => toast.success('PIN reset email sent to user'),
    onError: (err: Error) => toast.error(err.message ?? 'Failed to reset PIN'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await UserController_remove(userId)
    },
    onSuccess: () => {
      toast.success('User deleted')
      navigate({ to: '/users' })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete user'),
  })

  const revokeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await UserController_revokeRole(userId, roleId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId] })
      toast.success('Role revoked')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to revoke role'),
  })

  const data = user.data

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/users' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {user.isLoading ? 'Loading...' : data ? `${data.firstName} ${data.lastName}` : 'User'}
          </h1>
          <p className='text-sm text-muted-foreground'>User details and management</p>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          {!user.isLoading && data ? (
            <>
              <Button
                variant='outline'
                onClick={() => navigate({ to: '/users/$id', params: { id: userId }, search: { edit: 'true' } })}
              >
                <FilePenLine className='mr-2 h-4 w-4' />
                Edit
              </Button>
              {data.status === 'active' ? (
                <Button variant='outline' className='text-red-600' onClick={() => setConfirmAction('deactivate')}>
                  <ShieldOff className='mr-2 h-4 w-4' /> Deactivate
                </Button>
              ) : (
                <Button variant='outline' className='text-green-600' onClick={() => setConfirmAction('reactivate')}>
                  <ShieldCheck className='mr-2 h-4 w-4' /> Reactivate
                </Button>
              )}
              <Button variant='outline' onClick={() => resetPinMutation.mutate()} disabled={resetPinMutation.isPending}>
                <KeyRound className='mr-2 h-4 w-4' /> Reset PIN
              </Button>
              <Button variant='outline' className='text-destructive' onClick={() => setConfirmAction('delete')}>
                <Trash2 className='mr-2 h-4 w-4' /> Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Separator />

      {search.edit && (
        <Alert>
          <Info className='h-4 w-4' />
          <AlertTitle>Edit mode</AlertTitle>
          <AlertDescription>
            Full user editing requires a PATCH endpoint. You can update user&apos;s status using the Deactivate/Reactivate buttons above.
          </AlertDescription>
        </Alert>
      )}

      {user.isLoading ? (
        <div className='grid gap-6 md:grid-cols-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className='h-5 w-32' /></CardHeader>
              <CardContent><Skeleton className='h-4 w-full' /></CardContent>
            </Card>
          ))}
        </div>
      ) : user.isError ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-destructive'>
            Failed to load user: {(user.error as Error).message}
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-muted-foreground'>
            User not found
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <UserIcon className='h-4 w-4' /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>ID</span>
                <span className='font-mono text-xs'>{data.id}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Name</span>
                <span>{data.firstName} {data.lastName}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Email</span>
                <span>{data.email}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Status</span>
                <Badge variant='outline' className={statusStyle(data.status)}>
                  {data.status}
                </Badge>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Phone</span>
                <span>{data.phone ?? '-'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Mail className='h-4 w-4' /> Account
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex justify-between'>
                <span className='flex items-center gap-1.5 text-muted-foreground'>
                  <Globe className='h-3.5 w-3.5' /> Locale
                </span>
                <span>{data.locale ?? '-'}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='flex items-center gap-1.5 text-muted-foreground'>
                  <MapPin className='h-3.5 w-3.5' /> Timezone
                </span>
                <span>{data.timezone ?? '-'}</span>
              </div>
              <Separator />
              <div className='flex justify-between items-start'>
                <span className='text-muted-foreground pt-0.5'>Roles</span>
                <div className='flex flex-wrap gap-1 justify-end'>
                  {(data.roles?.length ?? 0) > 0
                    ? data.roles!.map((r) => (
                        <div key={r.id} className='flex items-center gap-0.5'>
                          <Badge variant='secondary' className='text-xs'>
                            {r.name}
                          </Badge>
                          {search.edit && (
                            <button
                              className='text-muted-foreground hover:text-destructive transition-colors'
                              title={`Revoke ${r.name}`}
                              onClick={() => revokeRoleMutation.mutate(r.id)}
                              disabled={revokeRoleMutation.isPending}
                            >
                              <XCircle className='h-3 w-3' />
                            </button>
                          )}
                        </div>
                      ))
                    : <span className='text-xs text-muted-foreground'>None</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Calendar className='h-4 w-4' /> Dates
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Created</span>
                <span>{formatDate(data.createdAt)}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Updated</span>
                <span>{data.updatedAt ? formatDate(data.updatedAt) : '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'deactivate' ? 'Deactivate User' : confirmAction === 'reactivate' ? 'Reactivate User' : 'Delete User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'deactivate'
                ? `Are you sure you want to deactivate "${data?.firstName} ${data?.lastName}"? They will lose access to the platform.`
                : confirmAction === 'reactivate' 
                ? `Are you sure you want to reactivate "${data?.firstName} ${data?.lastName}"?`
                : `Are you sure you want to permanently delete "${data?.firstName} ${data?.lastName}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              disabled={statusMutation.isPending || deleteMutation.isPending}
              onClick={() => {
                if (confirmAction === 'delete') {
                  deleteMutation.mutate()
                } else if (confirmAction) {
                  statusMutation.mutate(confirmAction)
                }
              }}
            >
              {(statusMutation.isPending || deleteMutation.isPending) && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {confirmAction === 'deactivate' ? 'Deactivate' : confirmAction === 'reactivate' ? 'Reactivate' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
