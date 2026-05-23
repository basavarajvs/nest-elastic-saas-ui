import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Eye,
  Plus,
  RefreshCw,
  Search,
  ShieldX,
} from 'lucide-react'
import { toast } from 'sonner'
import { ComplianceController_findAllCompliancePolicies } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import { ComplianceController_removeCompliancePolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
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

interface CompliancePolicy {
  id: string
  policyName: string
  policyVersion?: string
  policyDescription?: string
  policyDocument?: string
  effectiveDate?: string
  reviewDate?: string
  isActive?: boolean
  createdAt: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function CompliancePoliciesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['compliance', 'policies', 'list'],
    queryFn: async () => {
      const res = await ComplianceController_findAllCompliancePolicies()
      return (res as unknown as { data: CompliancePolicy[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const policies = data ?? []

  let debounceTimer: ReturnType<typeof setTimeout>
  function handleSearch(value: string) {
    setSearch(value)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => setDebouncedSearch(value), 400)
  }

  const filtered = useMemo(() => {
    if (!debouncedSearch) return policies
    const q = debouncedSearch.toLowerCase()
    return policies.filter(
      (p) =>
        p.policyName.toLowerCase().includes(q) ||
        (p.policyDescription ?? '').toLowerCase().includes(q) ||
        (p.policyVersion ?? '').toLowerCase().includes(q),
    )
  }, [policies, debouncedSearch])

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await ComplianceController_removeCompliancePolicy(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'policies', 'list'] })
      toast.success('Policy deactivated')
      setDeactivateTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to deactivate policy'),
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Compliance Policies'
        description='Manage compliance policies and retention rules'
        actions={
          <div className='flex items-center gap-2'>
            <Button variant='outline' asChild>
              <Link to='/compliance/retention-policies'>
                Retention Policies
              </Link>
            </Button>
            <Button asChild>
              <Link to='/compliance/policies/new'>
                <Plus className='mr-2 h-4 w-4' />
                Create Policy
              </Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search policies...'
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
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
            <EmptyState title={search ? 'No policies match your search' : 'No compliance policies found'} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='hidden lg:table-cell'>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className='hidden md:table-cell'>Effective Date</TableHead>
                  <TableHead className='hidden sm:table-cell'>Review Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='w-[100px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className='hidden font-mono text-xs text-muted-foreground lg:table-cell'>
                      {policy.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className='font-medium'>{policy.policyName}</TableCell>
                    <TableCell className='text-sm'>{policy.policyVersion ?? '-'}</TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {policy.effectiveDate ? formatDate(policy.effectiveDate) : '-'}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {policy.reviewDate ? formatDate(policy.reviewDate) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/compliance/policies/$id' params={{ id: policy.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        {policy.isActive !== false && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-red-600'
                            title='Deactivate'
                            onClick={() => setDeactivateTarget({ id: policy.id, name: policy.policyName })}
                          >
                            <ShieldX className='h-4 w-4' />
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

      <AlertDialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deactivateTarget?.name}"?
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
    </div>
  )
}
