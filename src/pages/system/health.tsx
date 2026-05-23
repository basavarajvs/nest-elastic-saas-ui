import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Heart } from 'lucide-react'
import { HealthController_check } from '@/lib/api/wms-saas-core-api/health/health'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function SystemHealthPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['system', 'health'],
    queryFn: async () => {
      const res = await HealthController_check()
      return (res as unknown as { data: { status?: string; details?: Record<string, unknown> } }).data ?? { status: 'unknown' }
    },
    staleTime: 10_000,
  })

  const status = data?.status ?? 'unknown'

  return (
    <div className='space-y-6'>
      <PageHeader
        title='System Health'
        description='Platform dependency status and uptime'
        actions={<Button variant='outline' size='icon' onClick={() => refetch()}><RefreshCw className='h-4 w-4' /></Button>}
      />

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Heart className='h-5 w-5' /> Overall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status === 'ok' ? 'default' : 'secondary'} className='text-lg px-3 py-1'>
              {status}
            </Badge>
            <p className='mt-2 text-sm text-muted-foreground'>Last checked just now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dependencies</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            {data?.details ? (
              <pre className='text-xs overflow-auto max-h-40'>{JSON.stringify(data.details, null, 2)}</pre>
            ) : (
              'Detailed health (DB, Redis, Queues) will appear here when API returns structured data.'
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
