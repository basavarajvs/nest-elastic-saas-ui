import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Loader2,
  ShieldX,
} from 'lucide-react'
import { toast } from 'sonner'
import { ComplianceController_findRetentionPolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import { ComplianceController_updateRetentionPolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import { ComplianceController_removeRetentionPolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import type { UpdateRetentionPolicyDto } from '@/lib/types/wms-saas-core-api'
import { Badge } from '@/components/ui/badge'
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface RetentionPolicyDetail {
  id: string
  policyName: string
  policyType?: string
  description?: string
  appliesTo?: Record<string, unknown>
  retentionDays?: number
  isActive?: boolean
  createdAt: string
  updatedAt?: string
}

const editSchema = z.object({
  policyName: z.string().min(1, 'Name is required').max(200),
  policyType: z.string().min(1, 'Type is required'),
  description: z.string().max(1000).optional(),
  retentionDays: z.string().min(1, 'Required').refine((v) => !isNaN(Number(v)) && Number(v) >= 1, 'Must be a positive number'),
  appliesTo: z.string().optional(),
  isActive: z.boolean().optional(),
})

type EditForm = z.input<typeof editSchema>

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function RetentionPolicyDetailPage() {
  const { id } = useParams({ from: '/_authenticated/compliance/retention-policies/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)

  const { data: policy, isLoading, isError, error } = useQuery({
    queryKey: ['compliance', 'retention', id],
    queryFn: async () => {
      const res = await ComplianceController_findRetentionPolicy(id)
      return (res as unknown as { data: RetentionPolicyDetail }).data ?? ({} as RetentionPolicyDetail)
    },
    staleTime: 30_000,
    enabled: !!id,
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: {
      policyName: policy?.policyName ?? '',
      policyType: policy?.policyType ?? '',
      description: policy?.description ?? '',
      retentionDays: String(policy?.retentionDays ?? 90),
      appliesTo: policy?.appliesTo ? JSON.stringify(policy.appliesTo, null, 2) : '',
      isActive: policy?.isActive ?? true,
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      const dto: UpdateRetentionPolicyDto = {}
      if (values.policyName !== policy?.policyName) dto.policyName = values.policyName
      if (values.policyType !== policy?.policyType) dto.policyType = values.policyType
      if (values.description !== policy?.description) dto.description = values.description
      const retentionNum = Number(values.retentionDays)
      if (retentionNum !== policy?.retentionDays) dto.retentionDays = retentionNum
      if (values.isActive !== policy?.isActive) dto.isActive = values.isActive
      if (values.appliesTo !== (policy?.appliesTo ? JSON.stringify(policy.appliesTo) : '')) {
        try { dto.appliesTo = JSON.parse(values.appliesTo || '{}') as Record<string, unknown> } catch { /* ignore */ }
      }
      await ComplianceController_updateRetentionPolicy(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'retention', id] })
      queryClient.invalidateQueries({ queryKey: ['compliance', 'retention', 'list'] })
      toast.success('Policy updated')
      setEditing(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update policy'),
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      await ComplianceController_removeRetentionPolicy(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'retention', 'list'] })
      toast.success('Policy deactivated')
      navigate({ to: '/compliance/retention-policies' })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to deactivate policy'),
  })

  function onEditSubmit(values: EditForm) {
    updateMutation.mutate(values)
  }

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-9 w-9' />
          <div><Skeleton className='h-7 w-48' /><Skeleton className='mt-1 h-4 w-32' /></div>
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className='h-5 w-24' /></CardHeader><CardContent><Skeleton className='h-8 w-32' /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !policy) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/compliance/retention-policies' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div><h1 className='text-2xl font-bold tracking-tight'>Policy Not Found</h1></div>
        </div>
        <Card><CardContent className='p-6 text-center text-sm text-destructive'>
          {error ? (error as Error).message : 'The policy could not be loaded'}
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/compliance/retention-policies' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{policy.policyName}</h1>
            <p className='text-sm text-muted-foreground'>{policy.policyType ?? 'retention'} &middot; Created {formatDate(policy.createdAt)}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel Edit' : 'Edit'}
          </Button>
          {policy.isActive !== false && (
            <Button variant='destructive' size='sm' onClick={() => setShowDeactivate(true)}>
              <ShieldX className='mr-2 h-4 w-4' /> Deactivate
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {editing ? (
        <Card className='max-w-2xl'>
          <CardHeader><CardTitle>Edit Policy</CardTitle><CardDescription>Update retention policy details</CardDescription></CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className='space-y-4'>
                <FormField control={editForm.control} name='policyName' render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='policyType' render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value='data_retention'>Data Retention</SelectItem>
                        <SelectItem value='audit_log'>Audit Log</SelectItem>
                        <SelectItem value='backup'>Backup</SelectItem>
                        <SelectItem value='archival'>Archival</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='description' render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className='resize-none' {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='retentionDays' render={({ field }) => (
                  <FormItem><FormLabel>Retention Days</FormLabel><FormControl><Input type='number' min={1} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='appliesTo' render={({ field }) => (
                  <FormItem><FormLabel>Applies To (JSON)</FormLabel><FormControl><Textarea className='min-h-[80px] font-mono text-sm' {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='isActive' render={({ field }) => (
                  <FormItem className='flex items-center gap-2'>
                    <FormControl><Switch checked={field.value ?? true} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className='!mt-0'>Active</FormLabel>
                  </FormItem>
                )} />
                <div className='flex justify-end gap-3'>
                  <Button type='button' variant='outline' onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type='submit' disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-4'>
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Type</CardTitle></CardHeader><CardContent><p className='text-lg font-semibold capitalize'>{policy.policyType?.replace(/_/g, ' ') ?? '-'}</p></CardContent></Card>
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Retention</CardTitle></CardHeader><CardContent><p className='text-lg font-semibold'>{policy.retentionDays ?? '-'} days</p></CardContent></Card>
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Status</CardTitle></CardHeader><CardContent><Badge variant={policy.isActive ? 'default' : 'secondary'}>{policy.isActive ? 'Active' : 'Inactive'}</Badge></CardContent></Card>
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Updated</CardTitle></CardHeader><CardContent><p className='text-lg font-semibold'>{policy.updatedAt ? formatDate(policy.updatedAt) : '-'}</p></CardContent></Card>
        </div>
      )}

      {!editing && policy.description && (
        <Card><CardHeader><CardTitle className='text-base'>Description</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground'>{policy.description}</p></CardContent></Card>
      )}

      {!editing && policy.appliesTo && Object.keys(policy.appliesTo).length > 0 && (
        <Card><CardHeader><CardTitle className='text-base'>Scope</CardTitle></CardHeader><CardContent>
          <pre className='rounded-md bg-muted p-4 text-sm overflow-auto max-h-48'>{JSON.stringify(policy.appliesTo, null, 2)}</pre>
        </CardContent></Card>
      )}

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Deactivate Policy</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to deactivate "{policy.policyName}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90' onClick={() => deactivateMutation.mutate()}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
