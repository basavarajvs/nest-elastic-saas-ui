import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PlanController_create } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
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

const STEPS = [
  { label: 'Basic Info', description: 'Name, code, and type' },
  { label: 'Pricing', description: 'Price and billing cycle' },
  { label: 'Config', description: 'Features and limits' },
  { label: 'Review', description: 'Confirm details' },
]

export function CreateLicensePlanPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [planName, setPlanName] = useState('')
  const [licenseType, setLicenseType] = useState('')
  const [planCode, setPlanCode] = useState('')
  const [price, setPrice] = useState('')
  const [billingCycleDays, setBillingCycleDays] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [featuresJson, setFeaturesJson] = useState('{\n  \n}')
  const [limitsJson, setLimitsJson] = useState('{\n  \n}')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateStep(s: number): boolean {
    const next: Record<string, string> = {}
    if (s === 0) {
      if (!planName.trim()) next.planName = 'Plan name is required'
      if (!licenseType) next.licenseType = 'License type is required'
    }
    if (s === 1) {
      if (price && isNaN(Number(price))) next.price = 'Price must be a number'
      if (billingCycleDays && isNaN(Number(billingCycleDays))) next.billingCycleDays = 'Must be a number'
    }
    if (s === 2) {
      try { featuresJson.trim() && JSON.parse(featuresJson) } catch { next.featuresJson = 'Invalid JSON' }
      try { limitsJson.trim() && JSON.parse(limitsJson) } catch { next.limitsJson = 'Invalid JSON' }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function nextStep() { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)) }
  function prevStep() { setStep((s) => Math.max(s - 1, 0)) }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof PlanController_create>[0] = {
        planName: planName.trim(),
        licenseType: licenseType as 'trial' | 'basic' | 'premium' | 'enterprise',
        price: Number(price) || 0,
        billingCycleDays: Number(billingCycleDays) || 0,
        limits: limitsJson.trim() ? JSON.parse(limitsJson) : {},
      }
      if (planDescription.trim()) payload.planDescription = planDescription.trim()
      try { const f = featuresJson.trim() ? JSON.parse(featuresJson) : undefined; if (f) payload.features = f } catch {}
      await PlanController_create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] })
      toast.success('License plan created')
      navigate({ to: '/license-plans' })
    },
    onError: (err: Error) => toast.error((err as unknown as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? err.message),
  })

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/license-plans' })}><ArrowLeft className='h-4 w-4' /></Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create License Plan</h1>
          <p className='text-sm text-muted-foreground'>Define a new billing/license plan for tenants</p>
        </div>
      </div>
      <Separator />

      <div className='flex items-center justify-center gap-2'>
        {STEPS.map((s, i) => (
          <div key={s.label} className='flex items-center gap-2'>
            <div className='flex items-center gap-1.5'>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i < step ? <Check className='h-3.5 w-3.5' /> : i + 1}
              </div>
              <span className={`hidden text-xs sm:inline ${i === step ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className='h-px w-6 bg-border' />}
          </div>
        ))}
      </div>

      <Card className='max-w-2xl mx-auto'>
        <CardHeader><CardTitle>{STEPS[step].label}</CardTitle><CardDescription>{STEPS[step].description}</CardDescription></CardHeader>
        <CardContent className='space-y-4'>
          {step === 0 && (
            <>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Plan Name <span className='text-destructive'>*</span></label>
                <Input placeholder='e.g. Premium Annual' value={planName} onChange={(e) => setPlanName(e.target.value)} />
                {errors.planName && <p className='text-xs text-destructive'>{errors.planName}</p>}
              </div>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Plan Code</label>
                <Input placeholder='e.g. premium_annual' value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>License Type <span className='text-destructive'>*</span></label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger><SelectValue placeholder='Select type' /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='trial'>Trial</SelectItem>
                    <SelectItem value='basic'>Basic</SelectItem>
                    <SelectItem value='premium'>Premium</SelectItem>
                    <SelectItem value='enterprise'>Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                {errors.licenseType && <p className='text-xs text-destructive'>{errors.licenseType}</p>}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Price (USD) <span className='text-destructive'>*</span></label>
                <Input type='number' min={0} step={0.01} placeholder='e.g. 29.99' value={price} onChange={(e) => setPrice(e.target.value)} />
                {errors.price && <p className='text-xs text-destructive'>{errors.price}</p>}
              </div>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Billing Cycle Days <span className='text-destructive'>*</span></label>
                <Input type='number' min={1} placeholder='e.g. 30' value={billingCycleDays} onChange={(e) => setBillingCycleDays(e.target.value)} />
                {errors.billingCycleDays && <p className='text-xs text-destructive'>{errors.billingCycleDays}</p>}
              </div>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Description</label>
                <Textarea placeholder='What this plan includes' className='resize-none' rows={4} value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Features (JSON)</label>
                <Textarea placeholder='{ "maxUsers": 100, "apiAccess": true }' className='font-mono text-xs resize-none' rows={6} value={featuresJson} onChange={(e) => setFeaturesJson(e.target.value)} />
                {errors.featuresJson && <p className='text-xs text-destructive'>{errors.featuresJson}</p>}
              </div>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Limits (JSON) <span className='text-destructive'>*</span></label>
                <Textarea placeholder='{ "storageGB": 50, "bandwidthGB": 500 }' className='font-mono text-xs resize-none' rows={6} value={limitsJson} onChange={(e) => setLimitsJson(e.target.value)} />
                {errors.limitsJson && <p className='text-xs text-destructive'>{errors.limitsJson}</p>}
              </div>
            </>
          )}

          {step === 3 && (
            <div className='space-y-3 text-sm'>
              <div className='flex justify-between'><span className='text-muted-foreground'>Plan Name</span><span className='font-medium'>{planName}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Code</span><span>{planCode || '-'}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>License Type</span><span className='capitalize'>{licenseType}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Price</span><span>${Number(price).toFixed(2)}</span></div>
              <Separator />
              <div className='flex justify-between'><span className='text-muted-foreground'>Billing Cycle</span><span>{billingCycleDays ? `${billingCycleDays} days` : '-'}</span></div>
              {planDescription && (<><Separator /><div className='flex justify-between'><span className='text-muted-foreground'>Description</span><span className='max-w-[250px] text-right'>{planDescription}</span></div></>)}
              {(featuresJson.trim() && featuresJson !== '{\n  \n}') && (<><Separator /><div><span className='text-muted-foreground'>Features</span><pre className='mt-1 rounded bg-muted p-2 text-xs overflow-x-auto'>{featuresJson}</pre></div></>)}
              {(limitsJson.trim() && limitsJson !== '{\n  \n}') && (<><Separator /><div><span className='text-muted-foreground'>Limits</span><pre className='mt-1 rounded bg-muted p-2 text-xs overflow-x-auto'>{limitsJson}</pre></div></>)}
            </div>
          )}

          <div className='flex justify-between pt-4'>
            <Button variant='outline' onClick={step === 0 ? () => navigate({ to: '/license-plans' }) : prevStep}>
              {step === 0 ? 'Cancel' : <><ChevronLeft className='mr-1 h-4 w-4' />Back</>}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={nextStep}>Next<ChevronRight className='ml-1 h-4 w-4' /></Button>
            ) : (
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Create Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
