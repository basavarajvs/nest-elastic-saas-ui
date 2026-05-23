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
import { ComplianceController_findAllRetentionPolicies } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import { ComplianceController_removeRetentionPolicy } from '@/lib/api/wms-saas-core-api/compliance-retention/compliance-retention'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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

interface RetentionPolicy {
  id: string
  policyName: string
  policyType?: string
  description?: string
  appliesTo?: Record<string, unknown>
  retentionDays?: number
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

export function RetentionPoliciesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['compliance', 'retention', 'list'],
    queryFn: async () => {
      const res = await ComplianceController_findAllRetentionPolicies()
      return (res as unknown as { data: RetentionPolicy[] }).data ?? []
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
        (p.policyType ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    )
  }, [policies, debouncedSearch])

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await ComplianceController_removeRetentionPolicy(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'retention', 'list'] })
      toast.success('Policy deactivated')
      setDeactivateTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to deactivate policy'),
  })

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='sm' asChild>
              <Link to='/compliance'>&larr; Compliance Policies</Link>
            </Button>
            <h1 className='text-2xl font-bold tracking-tight'>Retention Policies</h1>
          </div>
          <p className='text-sm text-muted-foreground'>
            Manage data retention policies
          </p>
        </div>
        <Button asChild>
          <Link to='/compliance/retention-policies/new'>
            <Plus className='mr-2 h-4 w-4' />
            Create Policy
          </Link>
        </Button>
      </div>

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
            <div className='p-6 space-y-3'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : isError ? (
            <div className='p-6 text-center text-sm text-destructive'>
              Failed to load policies: {(error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              {search ? 'No policies match your search' : 'No retention policies found'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='hidden lg:table-cell'>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className='hidden md:table-cell'>Retention Days</TableHead>
                  <TableHead className='hidden xl:table-cell'>Applies To</TableHead>
                  <TableHead className='hidden sm:table-cell'>Created</TableHead>
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
                    <TableCell className='text-sm capitalize'>{policy.policyType ?? '-'}</TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {policy.retentionDays ?? '-'} days
                    </TableCell>
                    <TableCell className='hidden max-w-[200px] truncate text-sm text-muted-foreground xl:table-cell'>
                      {policy.appliesTo ? Object.keys(policy.appliesTo).join(', ') || '-' : '-'}
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground sm:table-cell'>
                      {formatDate(policy.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/compliance/retention-policies/$id' params={{ id: policy.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        {policy.isActive !== false && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-red-600'
                            title='Deactivate'
                            onClick={() =>
                              setDeactivateTarget({ id: policy.id, name: policy.policyName })
                            }
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
              onClick={() => {
                if (deactivateTarget) deactivateMutation.mutate(deactivateTarget.id)
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
