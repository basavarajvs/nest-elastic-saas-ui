import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Building2,
  Calendar,
  FilePenLine,
  Globe,
  HeartPulse,
  Info,
  Loader2,
  LogIn,
  MapPin,
  ShieldOff,
  ShieldCheck,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { TenantController_findOne } from '@/lib/api/wms-saas-core-api/tenants/tenants'
import { TenantController_updateStatus } from '@/lib/api/wms-saas-core-api/tenants/tenants'
import { TenantController_getHealth } from '@/lib/api/wms-saas-core-api/tenants/tenants'
import { SystemAdminController_impersonateTenant } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import type { UpdateTenantStatusDtoStatus } from '@/lib/types/wms-saas-core-api'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function statusColor(status: string): string {
  return STATUS_COLORS[status?.toLowerCase()] ?? STATUS_COLORS.inactive
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

interface TenantDetail {
  id: string
  tenantName: string
  code: string
  domain?: string
  status: string
  locale?: string
  timezone?: string
  planId?: string
  planName?: string
  createdAt: string
  updatedAt?: string
  createdBy?: string
}

export function TenantDetailPage() {
  const { id: tenantId } = useParams({ from: '/_authenticated/tenants/$id' })
  const search = useSearch({ from: '/_authenticated/tenants/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<{
    action: 'suspend' | 'reactivate'
  } | null>(null)
  const [showHealth, setShowHealth] = useState(!!search.edit)
  const [impersonateTarget, setImpersonateTarget] = useState(false)

  const tenant = useQuery({
    queryKey: ['tenants', 'detail', tenantId],
    queryFn: async () => {
      const res = await TenantController_findOne(tenantId)
      const typed = res as unknown as { data: TenantDetail }
      return typed.data
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  })

  const health = useQuery({
    queryKey: ['tenants', 'health', tenantId],
    queryFn: async () => {
      const res = await TenantController_getHealth(tenantId)
      return (res as unknown as { data: Record<string, unknown> }).data ?? {}
    },
    enabled: showHealth && !!tenantId,
    staleTime: 10_000,
  })

  const updateStatus = useMutation({
    mutationFn: async (status: UpdateTenantStatusDtoStatus) => {
      await TenantController_updateStatus(tenantId, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'detail', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] })
      toast.success('Tenant status updated')
      setConfirmAction(null)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update tenant status')
    },
  })

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      const res = await SystemAdminController_impersonateTenant(tenantId)
      return res
    },
    onSuccess: (res) => {
      const token = (res as unknown as { data?: { accessToken?: string } })?.data?.accessToken
      if (token) {
        navigator.clipboard.writeText(token)
        toast.success('Impersonation token copied to clipboard')
      } else {
        toast.success('Impersonation successful')
      }
      setImpersonateTarget(false)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to impersonate tenant')
    },
  })

  const data = tenant.data

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => navigate({ to: '/tenants' })}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {tenant.isLoading ? 'Loading...' : data?.tenantName ?? 'Tenant'}
          </h1>
          <p className='text-sm text-muted-foreground'>
            Tenant details and management
          </p>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          {tenant.isLoading ? null : data ? (
            <>
              <Button
                variant='outline'
                onClick={() => navigate({ to: '/tenants/$id', params: { id: tenantId }, search: { edit: 'true' } })}
              >
                <FilePenLine className='mr-2 h-4 w-4' />
                Edit
              </Button>
              {data.status === 'suspended' ? (
                <Button
                  variant='outline'
                  className='text-green-600'
                  onClick={() => setConfirmAction({ action: 'reactivate' })}
                >
                  <ShieldCheck className='mr-2 h-4 w-4' />
                  Reactivate
                </Button>
              ) : (
                <Button
                  variant='outline'
                  className='text-red-600'
                  onClick={() => setConfirmAction({ action: 'suspend' })}
                >
                  <ShieldOff className='mr-2 h-4 w-4' />
                  Suspend
                </Button>
              )}
              <Button
                variant='outline'
                onClick={() => setImpersonateTarget(true)}
              >
                <LogIn className='mr-2 h-4 w-4' />
                Impersonate
              </Button>
              <Button
                variant='outline'
                onClick={() => setShowHealth((v) => !v)}
              >
                <HeartPulse className='mr-2 h-4 w-4' />
                Health
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
            Full tenant editing requires a PATCH endpoint which is not yet available in the API.
            You can update the tenant&apos;s status using the Suspend/Reactivate button above.
          </AlertDescription>
        </Alert>
      )}

      {tenant.isLoading ? (
        <div className='grid gap-6 md:grid-cols-2'>
          {Array.from({ length: 4 }).map((_, i) => (
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
      ) : tenant.isError ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-destructive'>
            Failed to load tenant: {(tenant.error as Error).message}
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-muted-foreground'>
            Tenant not found
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Building2 className='h-4 w-4' />
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
                  <span>{data.tenantName}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Code</span>
                  <span className='font-mono text-xs'>{data.code}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Status</span>
                  <Badge
                    variant='outline'
                    className={statusColor(data.status)}
                  >
                    {data.status}
                  </Badge>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Domain</span>
                  <span>{data.domain ?? '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Tag className='h-4 w-4' />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='flex items-center gap-1.5 text-muted-foreground'>
                    <Globe className='h-3.5 w-3.5' />
                    Locale
                  </span>
                  <span>{data.locale ?? '-'}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='flex items-center gap-1.5 text-muted-foreground'>
                    <MapPin className='h-3.5 w-3.5' />
                    Timezone
                  </span>
                  <span>{data.timezone ?? '-'}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Plan</span>
                  <span>{data.planName ?? data.planId ?? '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Calendar className='h-4 w-4' />
                  Dates
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
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Created By</span>
                  <span>{data.createdBy ?? '-'}</span>
                </div>
              </CardContent>
            </Card>

            {showHealth && (
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <HeartPulse className='h-4 w-4' />
                    Health Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {health.isLoading ? (
                    <div className='space-y-2'>
                      <Skeleton className='h-4 w-full' />
                      <Skeleton className='h-4 w-3/4' />
                    </div>
                  ) : health.isError ? (
                    <p className='text-sm text-destructive'>
                      Failed to load health: {(health.error as Error).message}
                    </p>
                  ) : Object.keys(health.data ?? {}).length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      No health data available
                    </p>
                  ) : (
                    <div className='space-y-2 text-sm'>
                      {Object.entries(health.data ?? {}).map(([key, value]) => (
                        <div key={key} className='flex justify-between'>
                          <span className='capitalize text-muted-foreground'>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Impersonate Confirmation */}
      <AlertDialog
        open={!!impersonateTarget}
        onOpenChange={() => setImpersonateTarget(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Impersonate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to impersonate &ldquo;{data?.tenantName}&rdquo;.
              This will generate a 15-minute access token for debugging and support purposes.
              This action is audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={impersonateMutation.isPending}
              onClick={() => impersonateMutation.mutate()}
            >
              {impersonateMutation.isPending ? 'Generating...' : 'Generate Token'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'suspend'
                ? 'Suspend Tenant'
                : 'Reactivate Tenant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'suspend'
                ? `Are you sure you want to suspend "${data?.tenantName}"? All access for this tenant will be blocked.`
                : `Are you sure you want to reactivate "${data?.tenantName}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate(
                  confirmAction?.action === 'suspend' ? 'suspended' : 'active',
                )
              }
            >
              {updateStatus.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              {confirmAction?.action === 'suspend' ? 'Suspend' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
