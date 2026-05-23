import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { SystemController_getRequestLog } from '@/lib/api/wms-saas-core-api/system/system'
import { PageHeader, LoadingState, ErrorState } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface RequestLogEntry {
  id: string
  method?: string
  path?: string
  statusCode?: number
  ipAddress?: string
  userId?: string
  createdAt: string
}

export function RequestLogPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['system', 'request-log'],
    queryFn: async () => {
      const res = await SystemController_getRequestLog()
      return (res as unknown as { data: RequestLogEntry[] }).data ?? []
    },
    staleTime: 15_000,
  })

  const logs = (data ?? []).filter((l) =>
    !search || (l.path || '').toLowerCase().includes(search.toLowerCase()) || (l.method || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Request Log'
        description='Recent API request audit trail'
        actions={<Button variant='outline' size='icon' onClick={() => refetch()}><RefreshCw className='h-4 w-4' /></Button>}
      />

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex gap-2'>
            <Input placeholder='Filter path or method...' value={search} onChange={(e) => setSearch(e.target.value)} className='max-w-xs' />
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? <LoadingState /> : isError ? <ErrorState message={(error as Error).message} onRetry={() => refetch()} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className='text-center text-muted-foreground'>No logs</TableCell></TableRow>
                ) : logs.slice(0, 50).map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className='text-xs text-muted-foreground'>{log.createdAt}</TableCell>
                    <TableCell><Badge variant='outline'>{log.method ?? '-'}</Badge></TableCell>
                    <TableCell className='font-mono text-xs max-w-[400px] truncate'>{log.path}</TableCell>
                    <TableCell>
                      <Badge variant={(log.statusCode || 500) < 400 ? 'secondary' : 'destructive'}>
                        {log.statusCode ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-xs font-mono'>{log.ipAddress ?? '-'}</TableCell>
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
