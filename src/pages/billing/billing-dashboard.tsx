import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Banknote,
  CreditCard,
  LineChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SubscriptionController_getDashboard } from '@/lib/api/wms-saas-core-api/billing-subscriptions/billing-subscriptions'
import { PageHeader, LoadingState, ErrorState } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface DashboardData {
  mrr: number
  arr: number
  activeSubscriptions: number
  churnRate: number
  revenueTrend: Array<{
    date: string
    amount: number
  }>
}

function useDashboard() {
  return useQuery({
    queryKey: ['billing', 'subscriptions', 'dashboard'],
    queryFn: async () => {
      const res = await SubscriptionController_getDashboard()
      // Note: Cast the response as the swagger definition is missing the response schema
      const typed = res as unknown as { data: DashboardData }
      return typed.data
    },
    staleTime: 60_000,
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function BillingDashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useDashboard()

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Billing Dashboard'
        description='Overview of revenue, subscriptions, and financial metrics'
        actions={
          <div className='flex gap-2'>
            <Button variant='outline' size='icon' onClick={() => refetch()}>
              <RefreshCw className='h-4 w-4' />
            </Button>
              <Button variant='outline' onClick={() => navigate({ to: '/billing/invoices' })}>View Invoices</Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !data ? (
        <Card>
          <CardContent className='p-6 text-center text-muted-foreground'>
            No dashboard data available
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Monthly Recurring Revenue (MRR)
                </CardTitle>
                <Banknote className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {formatCurrency(data.mrr ?? 0)}
                </div>
                <p className='text-xs text-muted-foreground'>
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Annual Run Rate (ARR)
                </CardTitle>
                <LineChart className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {formatCurrency(data.arr ?? 0)}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Based on current MRR
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Active Subscriptions
                </CardTitle>
                <CreditCard className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {data.activeSubscriptions ?? 0}
                </div>
                <div className='flex items-center text-xs text-green-500'>
                  <TrendingUp className='mr-1 h-3 w-3' />
                  +12 new this month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Churn Rate</CardTitle>
                <Users className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {(data.churnRate ?? 0).toFixed(2)}%
                </div>
                <div className='flex items-center text-xs text-red-500'>
                  <TrendingDown className='mr-1 h-3 w-3' />
                  +0.4% from last month
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card className='col-span-4'>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>
                MRR growth over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent className='pl-2'>
              <div className='h-[350px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart
                    data={data.revenueTrend ?? []}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id='colorRevenue'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'
                      >
                        <stop
                          offset='5%'
                          stopColor='var(--primary)'
                          stopOpacity={0.3}
                        />
                        <stop
                          offset='95%'
                          stopColor='var(--primary)'
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                    <XAxis
                      dataKey='date'
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value}`}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <RechartsTooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Area
                      type='monotone'
                      dataKey='amount'
                      stroke='var(--primary)'
                      fillOpacity={1}
                      fill='url(#colorRevenue)'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
