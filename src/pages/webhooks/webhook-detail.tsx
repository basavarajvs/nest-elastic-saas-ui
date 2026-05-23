import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldX,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { WebhookController_getEndpoint } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_updateEndpoint } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_deleteEndpoint } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_testEndpoint } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_rotateSecret } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_listDeliveries } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import { WebhookController_retryDelivery } from '@/lib/api/wms-saas-core-api/webhooks/webhooks'
import type { UpdateWebhookEndpointDto } from '@/lib/types/wms-saas-core-api'
import type { WebhookControllerListDeliveriesParams } from '@/lib/types/wms-saas-core-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

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

interface WebhookDelivery {
  id: string
  endpointId?: string
  eventType?: string
  status?: string
  statusCode?: number
  responseBody?: string
  attempt?: number
  createdAt: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

const editSchema = z.object({
  endpointName: z.string().min(1, 'Name is required').max(200),
  endpointUrl: z.string()
    .min(1, 'URL is required')
    .regex(/^https:\/\//, 'URL must use HTTPS')
    .max(500),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
})

type EditForm = z.input<typeof editSchema>

export function WebhookDetailPage() {
  const { id } = useParams({ from: '/_authenticated/webhooks/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(false)
  const [rotateTarget, setRotateTarget] = useState(false)
  const [viewingDelivery, setViewingDelivery] = useState<WebhookDelivery | null>(null)
  const [deliveryPage, setDeliveryPage] = useState(1)
  const deliveryLimit = 10

  const { data: endpoint, isLoading, isError, error } = useQuery({
    queryKey: ['webhooks', 'endpoints', id],
    queryFn: async () => {
      const res = await WebhookController_getEndpoint(id)
      const eps = (res as unknown as { data: WebhookEndpoint }).data
      if (!eps) throw new Error('Endpoint not found')
      return eps
    },
    staleTime: 30_000,
  })

  const deliveryParams: WebhookControllerListDeliveriesParams = {
    endpointId: id,
    page: deliveryPage,
    limit: deliveryLimit,
  }

  const { data: deliveriesData } = useQuery({
    queryKey: ['webhooks', 'deliveries', id, deliveryPage],
    queryFn: async () => {
      const res = await WebhookController_listDeliveries(deliveryParams)
      return (res as unknown as { data: WebhookDelivery[]; meta: { total: number; page: number; limit: number } })
    },
    staleTime: 15_000,
  })

  const deliveries = deliveriesData?.data ?? []
  const deliveryMeta = deliveriesData?.meta ?? { total: 0, page: 1, limit: deliveryLimit }
  const deliveryTotalPages = Math.ceil(deliveryMeta.total / deliveryMeta.limit)

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: endpoint ? {
      endpointName: endpoint.endpointName ?? '',
      endpointUrl: endpoint.endpointUrl ?? '',
      description: endpoint.description ?? '',
      isActive: endpoint.isActive ?? true,
    } : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      const dto: UpdateWebhookEndpointDto = {}
      if (values.endpointName !== endpoint?.endpointName) dto.endpointName = values.endpointName
      if (values.endpointUrl !== endpoint?.endpointUrl) dto.endpointUrl = values.endpointUrl
      if (values.isActive !== endpoint?.isActive) dto.isActive = values.isActive
      if (Object.keys(dto).length === 0) return
      await WebhookController_updateEndpoint(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'endpoints'] })
      toast.success('Endpoint updated')
      setEditing(false)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to update endpoint'
      toast.error(msg)
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      await WebhookController_deleteEndpoint(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'endpoints'] })
      toast.success('Endpoint deactivated')
      navigate({ to: '/webhooks' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to deactivate endpoint'
      toast.error(msg)
    },
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      await WebhookController_testEndpoint(id)
    },
    onSuccess: () => {
      toast.success('Test event sent')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to send test event'
      toast.error(msg)
    },
  })

  const rotateMutation = useMutation({
    mutationFn: async () => {
      await WebhookController_rotateSecret(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'endpoints', id] })
      toast.success('Secret rotated')
      setRotateTarget(false)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to rotate secret'
      toast.error(msg)
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      await WebhookController_retryDelivery(deliveryId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'deliveries', id] })
      toast.success('Delivery retry initiated')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to retry delivery'
      toast.error(msg)
    },
  })

  async function copySecret() {
    if (endpoint?.secret) {
      try {
        await navigator.clipboard.writeText(endpoint.secret)
        toast.success('Secret copied to clipboard')
      } catch {
        toast.error('Failed to copy secret')
      }
    }
  }

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    )
  }

  if (isError || !endpoint) {
    return (
      <div className='text-center text-sm text-destructive py-12'>
        {error instanceof Error ? error.message : 'Endpoint not found'}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/webhooks' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{endpoint.endpointName}</h1>
            <p className='text-sm text-muted-foreground'>Webhook endpoint details and delivery history</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => testMutation.mutate()}>
            <Zap className='mr-2 h-4 w-4 text-amber-500' />
            Test
          </Button>
          <Button variant='outline' size='sm' onClick={() => setRotateTarget(true)}>
            <RotateCw className='mr-2 h-4 w-4 text-blue-500' />
            Rotate Secret
          </Button>
          {endpoint.isActive !== false && (
            <Button variant='outline' size='sm' className='text-red-600' onClick={() => setDeactivateTarget(true)}>
              <ShieldX className='mr-2 h-4 w-4' />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {!editing ? (
        /* View Mode */
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Name</p>
                <p className='text-sm'>{endpoint.endpointName}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Status</p>
                <Badge variant={endpoint.isActive !== false ? 'default' : 'secondary'}>
                  {endpoint.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className='col-span-2'>
                <p className='text-sm font-medium text-muted-foreground'>URL</p>
                <p className='text-sm font-mono'>{endpoint.endpointUrl ?? '-'}</p>
              </div>
            </div>
            {endpoint.description && (
              <>
                <Separator />
                <div>
                  <p className='text-sm font-medium text-muted-foreground'>Description</p>
                  <p className='text-sm'>{endpoint.description}</p>
                </div>
              </>
            )}
            <Separator />
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Subscribed Events</p>
              <div className='flex gap-1 flex-wrap mt-1'>
                {(endpoint.eventTypes?.length ? endpoint.eventTypes : ['all events']).map((ev) => (
                  <Badge key={ev} variant='outline' className='font-mono text-xs'>{ev}</Badge>
                ))}
              </div>
            </div>
            {endpoint.secret && (
              <>
                <Separator />
                <div>
                  <p className='text-sm font-medium text-muted-foreground'>Signing Secret</p>
                  <div className='flex items-center gap-2 mt-1'>
                    <code className='relative rounded bg-muted px-3 py-1.5 text-sm font-mono'>
                      {showSecret ? endpoint.secret : '•'.repeat(Math.min(40, endpoint.secret.length))}
                    </code>
                    <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                    </Button>
                    <Button variant='ghost' size='icon' className='h-8 w-8' onClick={copySecret}>
                      <Copy className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Failures</p>
                <p className='text-sm'>{(endpoint.failureCount ?? 0) > 0 ? (
                  <span className='text-red-600 font-medium'>{endpoint.failureCount}</span>
                ) : '0'}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Created</p>
                <p className='text-sm'>{formatDate(endpoint.createdAt)}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setEditing(true)}>Edit Endpoint</Button>
          </CardFooter>
        </Card>
      ) : (
        /* Edit Mode */
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
            <Card>
              <CardHeader>
                <CardTitle>Edit Endpoint</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='endpointName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='endpointUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea className='min-h-[80px]' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Enable webhook deliveries</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={() => setEditing(false)}>Cancel</Button>
                <Button type='submit' disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}

      {/* Delivery History */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {deliveries.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              No delivery attempts yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden sm:table-cell'>Status Code</TableHead>
                  <TableHead className='hidden md:table-cell'>Attempt</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className='w-[100px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className='font-mono text-xs'>{d.eventType ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'success' ? 'default' : 'destructive'} className='text-xs'>
                        {d.status === 'success' ? (
                          <CheckCircle2 className='mr-1 h-3 w-3' />
                        ) : (
                          <XCircle className='mr-1 h-3 w-3' />
                        )}
                        {d.status ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden font-mono text-xs text-muted-foreground sm:table-cell'>
                      {d.statusCode ?? '-'}
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>{d.attempt ?? 1}</TableCell>
                    <TableCell className='text-sm text-muted-foreground whitespace-nowrap'>
                      {formatDate(d.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 text-xs'
                          onClick={() => setViewingDelivery(d)}
                        >
                          <Eye className='mr-1 h-3 w-3' />
                          View
                        </Button>
                        {d.status !== 'success' && (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 text-xs'
                            onClick={() => retryMutation.mutate(d.id)}
                          >
                            <RefreshCw className='mr-1 h-3 w-3' />
                            Retry
                          </Button>
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

      {deliveryMeta.total > 0 && (
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <p>
            Showing {(deliveryPage - 1) * deliveryLimit + 1}-{Math.min(deliveryPage * deliveryLimit, deliveryMeta.total)} of {deliveryMeta.total}
          </p>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' disabled={deliveryPage <= 1} onClick={() => setDeliveryPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className='text-xs'>Page {deliveryPage} of {deliveryTotalPages}</span>
            <Button variant='outline' size='sm' disabled={deliveryPage >= deliveryTotalPages} onClick={() => setDeliveryPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delivery Detail Dialog */}
      <Dialog open={!!viewingDelivery} onOpenChange={(open) => { if (!open) setViewingDelivery(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
          </DialogHeader>
          {viewingDelivery && (
            <div className='space-y-3 text-sm'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='font-medium text-muted-foreground'>Event Type</p>
                  <p className='font-mono text-xs'>{viewingDelivery.eventType ?? '-'}</p>
                </div>
                <div>
                  <p className='font-medium text-muted-foreground'>Status</p>
                  <Badge variant={viewingDelivery.status === 'success' ? 'default' : 'destructive'} className='text-xs'>
                    {viewingDelivery.status ?? '-'}
                  </Badge>
                </div>
                <div>
                  <p className='font-medium text-muted-foreground'>Status Code</p>
                  <p className='font-mono text-xs'>{viewingDelivery.statusCode ?? '-'}</p>
                </div>
                <div>
                  <p className='font-medium text-muted-foreground'>Attempt</p>
                  <p>{viewingDelivery.attempt ?? 1}</p>
                </div>
                <div className='col-span-2'>
                  <p className='font-medium text-muted-foreground'>Timestamp</p>
                  <p>{formatDate(viewingDelivery.createdAt)}</p>
                </div>
              </div>
              {viewingDelivery.responseBody && (
                <div>
                  <p className='font-medium text-muted-foreground mb-1'>Response Body</p>
                  <pre className='rounded-lg bg-muted p-3 text-xs font-mono overflow-auto max-h-48'>
                    {viewingDelivery.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateTarget} onOpenChange={setDeactivateTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Endpoint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{endpoint.endpointName}"? This will stop all webhook deliveries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => deactivateMutation.mutate()}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate Confirmation */}
      <AlertDialog open={rotateTarget} onOpenChange={setRotateTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Signing Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Rotate the signing secret for "{endpoint.endpointName}"? Existing integrations using this secret will break until updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => rotateMutation.mutate()}>
              Rotate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
