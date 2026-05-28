import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Server,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SystemAdminController_getQueues,
  SystemAdminController_purgeQueue,
} from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}

export function QueuesDashboardPage() {
  const {
    data: queues,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['system', 'queues'],
    queryFn: async () => {
      const res = await SystemAdminController_getQueues()
      const body = res as unknown as { data: Record<string, { waiting: number; active: number; failed: number }> }
      const data = body.data ?? {}
      return Object.entries(data).map(([name, stats]) => ({
        name,
        waiting: stats.waiting ?? 0,
        active: stats.active ?? 0,
        completed: 0,
        failed: stats.failed ?? 0,
        delayed: 0,
        paused: false,
      })) as QueueStats[]
    },
    refetchInterval: 30000, // Auto refresh every 30s
  })

  const purgeMutation = useMutation({
    mutationFn: async (queueName: string) => {
      await SystemAdminController_purgeQueue(queueName)
    },
    onSuccess: () => {
      toast.success('Queue purged successfully')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to purge queue')
    },
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Queue Monitor'
        description='Real-time monitoring of background job queues'
        actions={
          <Button variant='outline' size='icon' onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !queues || queues.length === 0 ? (
        <EmptyState
          title='No queues active'
          description='There are currently no background queues running in the system.'
          icon={<Server className='h-10 w-10' />}
        />
      ) : (
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {queues.map((queue) => (
            <Card key={queue.name} className={queue.paused ? 'opacity-70' : ''}>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-lg font-medium flex items-center'>
                    <Database className='mr-2 h-4 w-4 text-muted-foreground' />
                    {queue.name}
                  </CardTitle>
                  <Badge variant={queue.paused ? 'secondary' : 'default'} className={queue.paused ? '' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'}>
                    {queue.paused ? 'Paused' : 'Running'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col'>
                    <span className='text-sm text-muted-foreground flex items-center'>
                      <Activity className='mr-1 h-3 w-3' /> Active
                    </span>
                    <span className='text-2xl font-bold'>{queue.active}</span>
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-sm text-muted-foreground flex items-center'>
                      <RefreshCw className='mr-1 h-3 w-3' /> Waiting
                    </span>
                    <span className='text-2xl font-bold'>{queue.waiting}</span>
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-sm text-muted-foreground flex items-center'>
                      <CheckCircle className='mr-1 h-3 w-3' /> Completed
                    </span>
                    <span className='text-2xl font-bold text-green-600'>{queue.completed}</span>
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-sm text-muted-foreground flex items-center'>
                      <AlertTriangle className='mr-1 h-3 w-3' /> Failed
                    </span>
                    <span className='text-2xl font-bold text-red-600'>{queue.failed}</span>
                  </div>
                </div>

                <div className='pt-4 border-t flex justify-end'>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='outline' size='sm' className='text-destructive' disabled={queue.failed === 0 || purgeMutation.isPending}>
                        <Trash2 className='mr-2 h-4 w-4' />
                        Purge Failed
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Purge Failed Jobs</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete all {queue.failed} failed jobs from the <strong>{queue.name}</strong> queue?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                          onClick={() => purgeMutation.mutate(queue.name)}
                        >
                          Purge
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
