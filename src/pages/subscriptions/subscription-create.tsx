import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionController_create } from '@/lib/api/wms-saas-core-api/subscriptions-billing/subscriptions-billing'
import { PlanController_findAll } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
import { SystemAdminController_listTenants } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { CreateSubscriptionDtoBillingType } from '@/lib/types/wms-saas-core-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'


export function CreateSubscriptionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tenantId, setTenantId] = useState('')
  const [planId, setPlanId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [billingType, setBillingType] = useState('recurring')
  const [currency, setCurrency] = useState('USD')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const tenants = useQuery({
    queryKey: ['tenants', 'list-for-subscription'],
    queryFn: async () => {
      const res = await SystemAdminController_listTenants({ page: 1, limit: 200 })
      const body = res as unknown as { data: Array<{ tenantId: string; tenantName: string }> }
      return (body.data ?? []).map((t) => ({ id: t.tenantId, tenantName: t.tenantName }))
    },
    staleTime: 60_000,
  })

  const plans = useQuery({
    queryKey: ['billing-plans', 'active'],
    queryFn: async () => {
      const res = await PlanController_findAll({ includeInactive: 'false' })
      const body = res as unknown as { data: Array<{ id: string; planName: string; price?: number }> }
      return (body.data ?? []).map((p) => ({ id: p.id, planName: p.planName, price: p.price }))
    },
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof SubscriptionController_create>[0] = {
        tenantId,
        planId,
        startDate: new Date(startDate).toISOString(),
        billingType: billingType as typeof CreateSubscriptionDtoBillingType[keyof typeof CreateSubscriptionDtoBillingType],
      }
      if (currency) payload.currency = currency
      if (notes.trim()) payload.notes = notes.trim()
      await SubscriptionController_create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription created')
      navigate({ to: '/subscriptions' })
    },
    onError: (err: Error) => {
      const msg = (err as unknown as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function handleSubmit() {
    const next: Record<string, string> = {}
    if (!tenantId) next.tenantId = 'Tenant is required'
    if (!planId) next.planId = 'Plan is required'
    if (!startDate) next.startDate = 'Start date is required'
    if (!billingType) next.billingType = 'Billing type is required'
    setErrors(next)
    if (Object.keys(next).length === 0) createMutation.mutate()
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/subscriptions' })}><ArrowLeft className='h-4 w-4' /></Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create Subscription</h1>
          <p className='text-sm text-muted-foreground'>Create a new subscription for a tenant</p>
        </div>
      </div>
      <Separator />

      <Card className='max-w-2xl'>
        <CardHeader><CardTitle>Subscription Details</CardTitle><CardDescription>Configure the new subscription</CardDescription></CardHeader>
        <CardContent className='space-y-5'>
          <div className='space-y-1.5'>
            <label className='text-sm font-medium'>Tenant <span className='text-destructive'>*</span></label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder='Select a tenant' /></SelectTrigger>
              <SelectContent>
                {tenants.isLoading ? <div className='p-2'><Skeleton className='h-6 w-full' /></div> : (tenants.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.tenantName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tenantId && <p className='text-xs text-destructive'>{errors.tenantId}</p>}
          </div>

          <div className='space-y-1.5'>
            <label className='text-sm font-medium'>Plan <span className='text-destructive'>*</span></label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder='Select a plan' /></SelectTrigger>
              <SelectContent>
                {plans.isLoading ? <div className='p-2'><Skeleton className='h-6 w-full' /></div> : (plans.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.planName}{p.price ? ` ($${p.price})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planId && <p className='text-xs text-destructive'>{errors.planId}</p>}
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <label className='text-sm font-medium'>Start Date <span className='text-destructive'>*</span></label>
              <Input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {errors.startDate && <p className='text-xs text-destructive'>{errors.startDate}</p>}
            </div>
            <div className='space-y-1.5'>
              <label className='text-sm font-medium'>Billing Type <span className='text-destructive'>*</span></label>
              <Select value={billingType} onValueChange={setBillingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='recurring'>Recurring</SelectItem>
                  <SelectItem value='one_time'>One-Time</SelectItem>
                  <SelectItem value='usage_based'>Usage-Based</SelectItem>
                </SelectContent>
              </Select>
              {errors.billingType && <p className='text-xs text-destructive'>{errors.billingType}</p>}
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <label className='text-sm font-medium'>Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='USD'>USD</SelectItem>
                  <SelectItem value='EUR'>EUR</SelectItem>
                  <SelectItem value='GBP'>GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-1.5'>
            <label className='text-sm font-medium'>Notes</label>
            <Textarea placeholder='Optional admin notes' className='resize-none' rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className='flex justify-end gap-3 pt-2'>
            <Button variant='outline' onClick={() => navigate({ to: '/subscriptions' })}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Create Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
