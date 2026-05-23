import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileJson,
  Loader2,
  ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { PlanController_findOne } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
import { PlanController_remove } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface LicensePlanDetail {
  id: string
  planName: string
  planCode?: string
  licenseType: string
  price?: number
  billingCycleDays?: number
  isActive?: boolean
  planDescription?: string
  features?: Record<string, unknown>
  limits?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

const TYPE_STYLES: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  enterprise: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

function formatDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}
function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

export function LicensePlanDetailPage() {
  const { id: planId } = useParams({ from: '/_authenticated/license-plans/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const plan = useQuery({
    queryKey: ['billing-plans', 'detail', planId],
    queryFn: async () => {
      const res = await PlanController_findOne(planId)
      return (res as unknown as { data: LicensePlanDetail }).data
    },
    enabled: !!planId,
    staleTime: 30_000,
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => { await PlanController_remove(planId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] })
      toast.success('License plan deactivated')
      setConfirmDeactivate(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to deactivate plan'),
  })

  const data = plan.data

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/license-plans' })}><ArrowLeft className='h-4 w-4' /></Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{plan.isLoading ? 'Loading...' : data?.planName ?? 'License Plan'}</h1>
          <p className='text-sm text-muted-foreground'>License plan details and configuration</p>
        </div>
        {!plan.isLoading && data && data.isActive !== false && (
          <div className='ml-auto'>
            <Button variant='outline' className='text-red-600' onClick={() => setConfirmDeactivate(true)}>
              <ToggleRight className='mr-2 h-4 w-4' />Deactivate
            </Button>
          </div>
        )}
      </div>
      <Separator />

      {plan.isLoading ? (
        <div className='grid gap-6 md:grid-cols-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className='h-5 w-32' /></CardHeader><CardContent><Skeleton className='h-4 w-full' /></CardContent></Card>
          ))}
        </div>
      ) : plan.isError ? (
        <Card><CardContent className='p-6 text-center text-sm text-destructive'>Failed to load license plan: {(plan.error as Error).message}</CardContent></Card>
      ) : !data ? (
        <Card><CardContent className='p-6 text-center text-sm text-muted-foreground'>License plan not found</CardContent></Card>
      ) : (
        <div className='grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2 text-base'><CreditCard className='h-4 w-4' />General Information</CardTitle></CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex justify-between'><span className='text-muted-foreground'>ID</span><span className='font-mono text-xs'>{data.id}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Name</span><span>{data.planName}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Code</span><span className='font-mono text-xs'>{data.planCode ?? '-'}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>License Type</span><Badge variant='outline' className={TYPE_STYLES[data.licenseType?.toLowerCase()] ?? ''}>{data.licenseType}</Badge></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Status</span><Badge variant='outline' className={data.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}>{data.isActive !== false ? 'Active' : 'Inactive'}</Badge></div>
              {data.planDescription && (<><Separator /><div className='flex justify-between'><span className='text-muted-foreground'>Description</span><span className='max-w-[200px] text-right'>{data.planDescription}</span></div></>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2 text-base'>Pricing</CardTitle></CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex justify-between'><span className='text-muted-foreground'>Price</span><span className='font-mono'>{formatPrice(data.price)}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Billing Cycle</span><span>{data.billingCycleDays ? `${data.billingCycleDays} days` : '-'}</span></div>
            </CardContent>
          </Card>
          {data.features && Object.keys(data.features).length > 0 && (
            <Card><CardHeader><CardTitle className='flex items-center gap-2 text-base'><FileJson className='h-4 w-4' />Features</CardTitle></CardHeader><CardContent><pre className='rounded bg-muted p-3 text-xs font-mono overflow-x-auto'>{JSON.stringify(data.features, null, 2)}</pre></CardContent></Card>
          )}
          {data.limits && Object.keys(data.limits).length > 0 && (
            <Card><CardHeader><CardTitle className='flex items-center gap-2 text-base'><FileJson className='h-4 w-4' />Limits</CardTitle></CardHeader><CardContent><pre className='rounded bg-muted p-3 text-xs font-mono overflow-x-auto'>{JSON.stringify(data.limits, null, 2)}</pre></CardContent></Card>
          )}
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2 text-base'><Calendar className='h-4 w-4' />Dates</CardTitle></CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex justify-between'><span className='text-muted-foreground'>Created</span><span>{formatDate(data.createdAt)}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Updated</span><span>{data.updatedAt ? formatDate(data.updatedAt) : '-'}</span></div>
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Deactivate License Plan</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to deactivate "{data?.planName}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90' disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()}>
              {deactivateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
