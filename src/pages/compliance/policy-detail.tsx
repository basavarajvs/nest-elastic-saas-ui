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
import { ComplianceController_findCompliancePolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import { ComplianceController_updateCompliancePolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import { ComplianceController_removeCompliancePolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import type { UpdateCompliancePolicyDto } from '@/lib/types/wms-saas-core-api'
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
import { Switch } from '@/components/ui/switch'

interface CompliancePolicyDetail {
  id: string
  policyName: string
  policyVersion?: string
  policyDescription?: string
  policyDocument?: string
  effectiveDate?: string
  reviewDate?: string
  isActive?: boolean
  createdAt: string
  updatedAt?: string
}

const editSchema = z.object({
  policyName: z.string().min(1, 'Name is required').max(200),
  policyVersion: z.string().min(1, 'Version is required').max(50),
  policyDescription: z.string().max(1000).optional(),
  policyDocument: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
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

export function PolicyDetailPage() {
  const { id } = useParams({ from: '/_authenticated/compliance/policies/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)

  const { data: policy, isLoading, isError, error } = useQuery({
    queryKey: ['compliance', 'policies', id],
    queryFn: async () => {
      const res = await ComplianceController_findCompliancePolicy(id)
      return (res as unknown as { data: CompliancePolicyDetail }).data ?? ({} as CompliancePolicyDetail)
    },
    staleTime: 30_000,
    enabled: !!id,
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: {
      policyName: policy?.policyName ?? '',
      policyVersion: policy?.policyVersion ?? '',
      policyDescription: policy?.policyDescription ?? '',
      policyDocument: policy?.policyDocument ?? '',
      effectiveDate: policy?.effectiveDate ? format(new Date(policy.effectiveDate), 'yyyy-MM-dd') : '',
      reviewDate: policy?.reviewDate ? format(new Date(policy.reviewDate), 'yyyy-MM-dd') : '',
      isActive: policy?.isActive ?? true,
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      const dto: UpdateCompliancePolicyDto = {}
      if (values.policyName !== policy?.policyName) dto.policyName = values.policyName
      if (values.policyVersion !== policy?.policyVersion) dto.policyVersion = values.policyVersion
      if (values.policyDescription !== policy?.policyDescription) dto.policyDescription = values.policyDescription
      if (values.policyDocument !== policy?.policyDocument) dto.policyDocument = values.policyDocument
      if (values.effectiveDate !== (policy?.effectiveDate ? format(new Date(policy.effectiveDate), 'yyyy-MM-dd') : ''))
        dto.effectiveDate = values.effectiveDate ? new Date(values.effectiveDate).toISOString() : undefined
      if (values.reviewDate !== (policy?.reviewDate ? format(new Date(policy.reviewDate), 'yyyy-MM-dd') : ''))
        dto.reviewDate = values.reviewDate ? new Date(values.reviewDate).toISOString() : undefined
      if (values.isActive !== policy?.isActive) dto.isActive = values.isActive
      await ComplianceController_updateCompliancePolicy(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'policies', id] })
      queryClient.invalidateQueries({ queryKey: ['compliance', 'policies', 'list'] })
      toast.success('Policy updated')
      setEditing(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update policy'),
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      await ComplianceController_removeCompliancePolicy(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'policies', 'list'] })
      toast.success('Policy deactivated')
      navigate({ to: '/compliance' })
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
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/compliance' })}>
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
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/compliance' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{policy.policyName}</h1>
            <p className='text-sm text-muted-foreground'>
              v{policy.policyVersion} &middot; Created {formatDate(policy.createdAt)}
            </p>
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
          <CardHeader><CardTitle>Edit Policy</CardTitle><CardDescription>Update policy details</CardDescription></CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className='space-y-4'>
                <FormField control={editForm.control} name='policyName' render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='policyVersion' render={({ field }) => (
                  <FormItem><FormLabel>Version</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='policyDescription' render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className='resize-none' {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name='policyDocument' render={({ field }) => (
                  <FormItem><FormLabel>Document</FormLabel><FormControl><Textarea className='min-h-[80px]' {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className='grid grid-cols-2 gap-4'>
                  <FormField control={editForm.control} name='effectiveDate' render={({ field }) => (
                    <FormItem><FormLabel>Effective</FormLabel><FormControl><Input type='date' {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name='reviewDate' render={({ field }) => (
                    <FormItem><FormLabel>Review</FormLabel><FormControl><Input type='date' {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
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
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Version</CardTitle></CardHeader><CardContent><p className='text-lg font-semibold'>{policy.policyVersion ?? '-'}</p></CardContent></Card>
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Status</CardTitle></CardHeader><CardContent><Badge variant={policy.isActive ? 'default' : 'secondary'}>{policy.isActive ? 'Active' : 'Inactive'}</Badge></CardContent></Card>
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Effective</CardTitle></CardHeader><CardContent><p className='text-lg font-semibold'>{policy.effectiveDate ? formatDate(policy.effectiveDate) : '-'}</p></CardContent></Card>
          <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Review</CardTitle></CardHeader><CardContent><p className='text-lg font-semibold'>{policy.reviewDate ? formatDate(policy.reviewDate) : '-'}</p></CardContent></Card>
        </div>
      )}

      {!editing && policy.policyDescription && (
        <Card><CardHeader><CardTitle className='text-base'>Description</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground'>{policy.policyDescription}</p></CardContent></Card>
      )}

      {!editing && policy.policyDocument && (
        <Card><CardHeader><CardTitle className='text-base'>Document</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground whitespace-pre-wrap'>{policy.policyDocument}</p></CardContent></Card>
      )}

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{policy.policyName}"?
            </AlertDialogDescription>
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
