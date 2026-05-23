import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CalendarClock,
  KeyRound,
  Loader2,
  ShieldX,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ApiKeyController_findById } from '@/lib/api/wms-saas-core-api/api-keys/api-keys'
import { ApiKeyController_revoke } from '@/lib/api/wms-saas-core-api/api-keys/api-keys'
import { ApiKeyController_delete } from '@/lib/api/wms-saas-core-api/api-keys/api-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

interface ApiKeyDetail {
  id: string
  keyName: string
  keyPrefix?: string
  isActive?: boolean
  description?: string
  expiresAt?: string
  scopes?: string[]
  createdAt: string
  updatedAt?: string
  lastUsedAt?: string
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function ApiKeyDetailPage() {
  const { id: keyId } = useParams({ from: '/_authenticated/api-keys/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<{
    type: 'revoke' | 'delete'
  } | null>(null)

  const key = useQuery({
    queryKey: ['api-keys', 'detail', keyId],
    queryFn: async () => {
      const res = await ApiKeyController_findById(keyId)
      return (res as unknown as { data: ApiKeyDetail }).data
    },
    enabled: !!keyId,
    staleTime: 30_000,
  })

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await ApiKeyController_revoke(keyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key revoked')
      setConfirmAction(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to revoke key'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await ApiKeyController_delete(keyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key permanently deleted')
      navigate({ to: '/api-keys' })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete key'),
  })

  const data = key.data

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/api-keys' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {key.isLoading ? 'Loading...' : data?.keyName ?? 'API Key'}
          </h1>
          <p className='text-sm text-muted-foreground'>
            API key details and management
          </p>
        </div>
        {!key.isLoading && data && (
          <div className='ml-auto flex items-center gap-2'>
            {data.isActive !== false ? (
              <Button
                variant='outline'
                className='text-amber-600'
                onClick={() => setConfirmAction({ type: 'revoke' })}
              >
                <ShieldX className='mr-2 h-4 w-4' />
                Revoke
              </Button>
            ) : null}
            <Button
              variant='outline'
              className='text-red-600'
              onClick={() => setConfirmAction({ type: 'delete' })}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {key.isLoading ? (
        <div className='grid gap-6 md:grid-cols-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-5 w-32' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-4 w-full' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : key.isError ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-destructive'>
            Failed to load API key: {(key.error as Error).message}
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-muted-foreground'>
            API key not found
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <KeyRound className='h-4 w-4' />
                General Information
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
                <span>{data.keyName}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Key Prefix</span>
                <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
                  {data.keyPrefix ?? '--'}
                </code>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Status</span>
                <Badge
                  variant='outline'
                  className={
                    data.isActive !== false
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }
                >
                  {data.isActive !== false ? 'Active' : 'Revoked'}
                </Badge>
              </div>
              {data.description && (
                <>
                  <Separator />
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Description</span>
                    <span className='max-w-[200px] text-right'>{data.description}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <CalendarClock className='h-4 w-4' />
                Dates & Usage
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
                <span>{formatDate(data.updatedAt)}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Expires</span>
                <span>{data.expiresAt ? formatDate(data.expiresAt) : 'Never'}</span>
              </div>
              <Separator />
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Last Used</span>
                <span>{data.lastUsedAt ? formatDate(data.lastUsedAt) : 'Never'}</span>
              </div>
            </CardContent>
          </Card>

          {data.scopes && data.scopes.length > 0 && (
            <Card className='md:col-span-2'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <KeyRound className='h-4 w-4' />
                  Scopes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {data.scopes.map((scope) => (
                    <Badge key={scope} variant='secondary'>
                      {scope}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'revoke' ? 'Revoke API Key' : 'Delete API Key'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'revoke'
                ? `Are you sure you want to revoke "${data?.keyName}"? Any services using this key will lose access.`
                : `Are you sure you want to permanently delete "${data?.keyName}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              disabled={
                (confirmAction?.type === 'revoke' && revokeMutation.isPending) ||
                (confirmAction?.type === 'delete' && deleteMutation.isPending)
              }
              onClick={() => {
                if (confirmAction?.type === 'revoke') revokeMutation.mutate()
                else deleteMutation.mutate()
              }}
            >
              {(confirmAction?.type === 'revoke' ? revokeMutation : deleteMutation).isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              {confirmAction?.type === 'revoke' ? 'Revoke' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
