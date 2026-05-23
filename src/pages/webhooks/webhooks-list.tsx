import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Eye,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  ShieldX,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { WebhookController_listEndpoints } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_deleteEndpoint } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_testEndpoint } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_rotateSecret } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
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

interface WebhookEndpoint {
  id: string
  endpointName?: string
  endpointUrl?: string
  description?: string
  eventTypes?: string[]
  isActive?: boolean
  secret?: string
  failureCount?: number
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

export function WebhooksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)
  const [rotateTarget, setRotateTarget] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['webhooks', 'endpoints'],
    queryFn: async () => {
      const res = await WebhookController_listEndpoints()
      return (res as unknown as { data: WebhookEndpoint[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const endpoints = (data ?? []) as WebhookEndpoint[]
  const filtered = endpoints.filter((ep) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      ep.endpointName?.toLowerCase().includes(q) ||
      ep.endpointUrl?.toLowerCase().includes(q) ||
      ep.description?.toLowerCase().includes(q)
    )
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await WebhookController_deleteEndpoint(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'endpoints'] })
      toast.success('Endpoint deactivated')
      setDeactivateTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to deactivate endpoint'
      toast.error(msg)
    },
  })

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      await WebhookController_testEndpoint(id)
    },
    onSuccess: () => {
      toast.success('Test event sent to endpoint')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to send test event'
      toast.error(msg)
    },
  })

  const rotateMutation = useMutation({
    mutationFn: async (id: string) => {
      await WebhookController_rotateSecret(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'endpoints'] })
      toast.success('Secret rotated successfully')
      setRotateTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to rotate secret'
      toast.error(msg)
    },
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Webhook Endpoints'
        description='Manage outgoing webhook endpoints and event subscriptions'
        actions={
          <Button asChild>
            <Link to='/webhooks/new'>
              <Plus className='mr-2 h-4 w-4' />
              Create Endpoint
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
                placeholder='Search endpoints...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            <EmptyState title={search ? 'No endpoints match your search' : 'No webhook endpoints found'} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='hidden lg:table-cell'>Endpoint ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className='hidden md:table-cell'>URL</TableHead>
                  <TableHead className='hidden sm:table-cell'>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden lg:table-cell'>Failures</TableHead>
                  <TableHead className='hidden md:table-cell'>Created</TableHead>
                  <TableHead className='w-[140px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell className='hidden font-mono text-xs text-muted-foreground lg:table-cell'>
                      {ep.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className='font-medium'>{ep.endpointName ?? '-'}</TableCell>
                    <TableCell className='hidden max-w-[250px] truncate text-sm text-muted-foreground font-mono md:table-cell'>
                      {ep.endpointUrl ?? '-'}
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <div className='flex gap-1 flex-wrap max-w-[200px]'>
                        {(ep.eventTypes?.length ? ep.eventTypes : ['all']).slice(0, 3).map((ev) => (
                          <Badge key={ev} variant='outline' className='text-xs'>{ev}</Badge>
                        ))}
                        {(ep.eventTypes?.length ?? 0) > 3 && (
                          <span className='text-xs text-muted-foreground'>+{ep.eventTypes!.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ep.isActive !== false ? 'default' : 'secondary'}>
                        {ep.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden lg:table-cell'>
                      {(ep.failureCount ?? 0) > 0 ? (
                        <span className='text-sm text-red-600 font-medium'>{ep.failureCount}</span>
                      ) : (
                        <span className='text-sm text-muted-foreground'>0</span>
                      )}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {formatDate(ep.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/webhooks/$id' params={{ id: ep.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        {ep.isActive !== false && (
                          <>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8'
                              title='Send test event'
                              onClick={() => testMutation.mutate(ep.id)}
                            >
                              <Zap className='h-4 w-4 text-amber-500' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8'
                              title='Rotate secret'
                              onClick={() => setRotateTarget(ep.id)}
                            >
                              <RotateCw className='h-4 w-4 text-blue-500' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-red-600'
                              title='Deactivate'
                              onClick={() => setDeactivateTarget({ id: ep.id, name: ep.endpointName ?? 'this endpoint' })}
                            >
                              <ShieldX className='h-4 w-4' />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Endpoint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deactivateTarget?.name}"? This will stop all webhook deliveries to this endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => { if (deactivateTarget) deactivateMutation.mutate(deactivateTarget.id) }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate Confirmation */}
      <AlertDialog open={!!rotateTarget} onOpenChange={() => setRotateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Signing Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rotate the signing secret? Any services using the current secret will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (rotateTarget) rotateMutation.mutate(rotateTarget) }}>
              Rotate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
