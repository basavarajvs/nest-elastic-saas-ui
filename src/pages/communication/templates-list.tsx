import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { TemplateController_findAll } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
import { TemplateController_delete } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
import { TemplateController_preview } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NotificationTemplate {
  id: string
  templateName?: string
  templateType?: string
  subject?: string
  content?: string
  channels?: string[]
  isActive?: boolean
  variablesSchema?: Record<string, unknown>
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

export function NotificationTemplatesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [previewTarget, setPreviewTarget] = useState<{ id: string; name: string } | null>(null)
  const [previewResult, setPreviewResult] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const res = await TemplateController_findAll()
      return (res as unknown as { data: NotificationTemplate[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const templates = (data ?? []) as NotificationTemplate[]

  const filtered = templates.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.templateName?.toLowerCase().includes(q) ||
      t.templateType?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q)
    )
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await TemplateController_delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      toast.success('Template deleted')
      setDeleteTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to delete template'
      toast.error(msg)
    },
  })

  const previewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await TemplateController_preview(id)
      return (res as unknown as { preview?: string }).preview ?? 'No preview available'
    },
    onSuccess: (result) => {
      setPreviewResult(result)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to preview template'
      toast.error(msg)
    },
  })

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Notification Templates'
        description='Manage notification message templates'
        actions={
          <Button asChild>
            <Link to='/notification-templates/new'>
              <Plus className='mr-2 h-4 w-4' />
              Create Template
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
                placeholder='Search templates...'
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
            <EmptyState title={search ? 'No templates match your search' : 'No notification templates found'} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='hidden lg:table-cell'>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className='hidden sm:table-cell'>Type</TableHead>
                  <TableHead className='hidden md:table-cell'>Subject</TableHead>
                  <TableHead className='hidden lg:table-cell'>Channels</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden md:table-cell'>Created</TableHead>
                  <TableHead className='w-[160px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className='hidden font-mono text-xs text-muted-foreground lg:table-cell'>
                      {template.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className='font-medium'>{template.templateName ?? '-'}</TableCell>
                    <TableCell className='hidden text-sm capitalize sm:table-cell'>{template.templateType ?? '-'}</TableCell>
                    <TableCell className='hidden max-w-[200px] truncate text-sm text-muted-foreground md:table-cell'>
                      {template.subject ?? '-'}
                    </TableCell>
                    <TableCell className='hidden lg:table-cell'>
                      <div className='flex gap-1 flex-wrap'>
                        {(template.channels?.length ? template.channels : ['-']).map((ch) => (
                          <Badge key={ch} variant='outline' className='text-xs'>{ch}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive !== false ? 'default' : 'secondary'}>
                        {template.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>
                      {formatDate(template.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='Preview' onClick={() => { setPreviewTarget({ id: template.id, name: template.templateName ?? 'this template' }); previewMutation.mutate(template.id) }}>
                          <FileText className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='icon' className='h-8 w-8' title='View details' asChild>
                          <Link to='/notification-templates/$id' params={{ id: template.id }}>
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-red-600'
                          title='Delete'
                          onClick={() => setDeleteTarget({ id: template.id, name: template.templateName ?? 'this template' })}
                        >
                          <Trash2 className='h-4 w-4' />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => { if (!open) setPreviewTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className='rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap'>
            {previewResult || 'No preview available'}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
