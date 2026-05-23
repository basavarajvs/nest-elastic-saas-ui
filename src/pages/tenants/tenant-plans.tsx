import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { PlanController_findAll } from '@/lib/api/wms-saas-core-api/billing-plans/billing-plans'
import { SystemAdminController_listTenants } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import type { PlanControllerFindAllParams } from '@/lib/types/wms-saas-core-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Plan {
  id: string
  planName: string
  planCode?: string
  description?: string
  isActive?: boolean
  price?: number
  currency?: string
  createdAt?: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function TenantPlansPage() {
  const params: PlanControllerFindAllParams = { includeInactive: 'true' }
  const { data: plansData, isLoading: plansLoading, refetch } = useQuery({
    queryKey: ['license-plans', 'list', params],
    queryFn: async () => {
      const res = await PlanController_findAll(params)
      return (res as unknown as { data: Plan[]; meta?: { total: number } }).data ?? []
    },
    staleTime: 60_000,
  })

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', 'list-all'],
    queryFn: async () => {
      const res = await SystemAdminController_listTenants({ page: 1, limit: 1000 })
      return (res as unknown as { data: { planId?: string; planName?: string }[]; meta?: { total: number } }).data ?? []
    },
    staleTime: 60_000,
  })

  const plans = (plansData ?? []) as Plan[]
  const tenants = (tenantsData ?? []) as { planId?: string; planName?: string }[]
  const isLoading = plansLoading || tenantsLoading

  const planTenantCount: Record<string, { count: number; names: string[] }> = {}
  for (const t of tenants) {
    const key = t.planId ?? '__unassigned__'
    if (!planTenantCount[key]) planTenantCount[key] = { count: 0, names: [] }
    planTenantCount[key].count++
    if (t.planName) planTenantCount[key].names.push(t.planName)
  }

  const plansWithTenants = plans.map((p) => ({
    ...p,
    tenantCount: planTenantCount[p.id]?.count ?? 0,
    tenantNames: planTenantCount[p.id]?.names ?? [],
  }))

  const unassignedCount = planTenantCount['__unassigned__']?.count ?? 0

  const totalTenants = tenants.length
  const assignedTenants = plansWithTenants.reduce((sum, p) => sum + p.tenantCount, 0)

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Tenant Plans</h1>
          <p className='text-sm text-muted-foreground'>View plan assignments across all tenants</p>
        </div>
        <Button variant='outline' size='icon' onClick={() => refetch()}>
          <RefreshCw className='h-4 w-4' />
        </Button>
      </div>

      <div className='grid gap-4 grid-cols-1 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Total Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold'>{plans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Assigned Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold'>{assignedTenants}</p>
            <p className='text-xs text-muted-foreground mt-1'>of {totalTenants} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Unassigned Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold'>{unassignedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>Plans & Tenant Assignments</CardTitle>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-6 space-y-3'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-14 w-full' />
              ))}
            </div>
          ) : plansWithTenants.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>No plans found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead className='hidden sm:table-cell'>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden md:table-cell'>Price</TableHead>
                  <TableHead>Tenants</TableHead>
                  <TableHead className='hidden lg:table-cell'>Created</TableHead>
                  <TableHead className='w-[80px]' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plansWithTenants.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className='font-medium'>{plan.planName}</TableCell>
                    <TableCell className='hidden sm:table-cell font-mono text-xs text-muted-foreground'>
                      {plan.planCode ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive !== false ? 'default' : 'secondary'}>
                        {plan.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden md:table-cell text-sm'>
                      {plan.price != null ? `${plan.currency ?? 'USD'} ${plan.price}` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className='font-medium'>{plan.tenantCount}</span>
                    </TableCell>
                    <TableCell className='hidden lg:table-cell text-sm text-muted-foreground'>
                      {plan.createdAt ? formatDate(plan.createdAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant='ghost' size='icon' className='h-8 w-8' asChild>
                        <Link to='/license-plans/$id' params={{ id: plan.id }}>
                          <ExternalLink className='h-4 w-4' />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
