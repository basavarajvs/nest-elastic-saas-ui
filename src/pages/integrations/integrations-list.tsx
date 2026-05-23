import { useState } from 'react'
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
import { IntegrationController_findAll } from '@/lib/api/wms-saas-core-api/integrations/integrations'
import { IntegrationController_remove } from '@/lib/api/wms-saas-core-api/integrations/integrations'
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

interface Integration {
  id: string
  integrationName?: string
  integrationType?: string
  description?: string
  status?: string
  syncFrequency?: string
  createdAt: string
  updatedAt?: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['integrations', 'list'],
    queryFn: async () => {
      const res = await IntegrationController_findAll()
      return (res as unknown as { data: Integration[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const integrations = (data ?? []) as Integration[]
  const filtered = integrations.filter((i) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      i.integrationName?.toLowerCase().includes(q) ||
      i.integrationType?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    )
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await IntegrationController_remove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] })
      toast.success('Integration deactivated')
      setDeactivateTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to deactivate'
      toast.error(msg)
    },
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Integrations'
        description='Manage third-party integrations and connections'
        actions={
          <Button asChild>
            <Link to='/integrations/new'>
              <Plus className='mr-2 h-4 w-4' />
              Add Integration
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search integrations...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            <EmptyState title={search ? 'No integrations match your search' : 'No integrations found'} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className='hidden sm:table-cell'>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden md:table-cell'>Sync Frequency</TableHead>
                  <TableHead className='hidden lg:table-cell'>Created</TableHead>
                  <TableHead className='w-[100px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell className='font-medium'>{integration.integrationName ?? '-'}</TableCell>
                    <TableCell className='hidden sm:table-cell text-sm text-muted-foreground'>
                      {integration.integrationType ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={integration.status === 'active' ? 'default' : integration.status === 'error' ? 'destructive' : 'secondary'}
                      >
                        {integration.status ?? 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden md:table-cell text-sm text-muted-foreground'>
                      {integration.syncFrequency ?? '-'}
                    </TableCell>
                    <TableCell className='hidden lg:table-cell text-sm text-muted-foreground'>
                      {formatDate(integration.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/integrations/$id' params={{ id: integration.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-red-600'
                          title='Deactivate'
                          onClick={() => setDeactivateTarget({ id: integration.id, name: integration.integrationName ?? 'this integration' })}
                        >
                          <ShieldX className='h-4 w-4' />
                        </Button>
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
            <AlertDialogTitle>Deactivate Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deactivateTarget?.name}"? This will disable the integration connection.
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
