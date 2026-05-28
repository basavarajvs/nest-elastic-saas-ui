import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Eye,
  Loader2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { TemplateController_findAll } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
import { TemplateController_update } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
import { TemplateController_delete } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
import { TemplateController_preview } from '@/lib/api/wms-saas-core-api/notification-templates/notification-templates'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

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

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
  { value: 'in_app', label: 'In-App' },
  { value: 'sms', label: 'SMS' },
] as const

const TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'alert', label: 'Alert' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'verification', label: 'Verification' },
] as const

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

const editSchema = z.object({
  templateName: z.string().min(1, 'Name is required').max(200),
  templateType: z.string().min(1, 'Type is required'),
  subject: z.string().min(1, 'Subject is required').max(500),
  content: z.string().min(1, 'Content is required').max(10000),
  channels: z.array(z.string()).min(1, 'At least one channel is required'),
  isActive: z.boolean().optional(),
})

type EditForm = z.input<typeof editSchema>

export function NotificationTemplateDetailPage() {
  const { id } = useParams({ from: '/_authenticated/notification-templates/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewResult, setPreviewResult] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notification-templates', id],
    queryFn: async () => {
      const res = await TemplateController_findAll()
      const templates = ((res as unknown as { data: NotificationTemplate[] }).data ?? []) as NotificationTemplate[]
      const found = templates.find((t) => t.id === id)
      if (!found) throw new Error('Template not found')
      return found
    },
    staleTime: 30_000,
  })

  const template = data

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: template ? {
      templateName: template.templateName ?? '',
      templateType: template.templateType ?? '',
      subject: template.subject ?? '',
      content: template.content ?? '',
      channels: template.channels ?? [],
      isActive: template.isActive ?? true,
    } : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      const body: Record<string, unknown> = {}
      if (values.templateName !== template?.templateName) body.templateName = values.templateName
      if (values.templateType !== template?.templateType) body.templateType = values.templateType
      if (values.subject !== template?.subject) body.subject = values.subject
      if (values.content !== template?.content) body.content = values.content
      if (JSON.stringify(values.channels) !== JSON.stringify(template?.channels)) body.channels = values.channels
      if (values.isActive !== template?.isActive) body.isActive = values.isActive
      if (Object.keys(body).length === 0) return
      await TemplateController_update(id, { body: JSON.stringify(body) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      toast.success('Template updated')
      setEditing(false)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to update template'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await TemplateController_delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      toast.success('Template deleted')
      navigate({ to: '/notification-templates' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to delete template'
      toast.error(msg)
    },
  })

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await TemplateController_preview(id)
      return (res as unknown as { preview?: string }).preview ?? 'No preview available'
    },
    onSuccess: (result) => {
      setPreviewResult(result)
      setPreviewOpen(true)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to preview template'),
  })

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    )
  }

  if (isError || !template) {
    return (
      <div className='text-center text-sm text-destructive py-12'>
        {error instanceof Error ? error.message : 'Template not found'}
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/notification-templates' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{template.templateName}</h1>
            <p className='text-sm text-muted-foreground'>Notification template details</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => previewMutation.mutate()}>
            <Eye className='mr-2 h-4 w-4' />
            Preview
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='text-red-600'
            onClick={() => setDeleteTarget(true)}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </Button>
        </div>
      </div>

      {!editing ? (
        /* View Mode */
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Template Name</p>
                <p className='text-sm'>{template.templateName}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Type</p>
                <p className='text-sm capitalize'>{template.templateType ?? '-'}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Status</p>
                <Badge variant={template.isActive !== false ? 'default' : 'secondary'}>
                  {template.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Created</p>
                <p className='text-sm'>{formatDate(template.createdAt)}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Subject</p>
              <p className='text-sm'>{template.subject ?? '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Content</p>
              <p className='text-sm whitespace-pre-wrap'>{template.content ?? '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Channels</p>
              <div className='flex gap-1 flex-wrap mt-1'>
                {(template.channels?.length ? template.channels : ['-']).map((ch) => (
                  <Badge key={ch} variant='outline'>{ch}</Badge>
                ))}
              </div>
            </div>
            {template.variablesSchema && (
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Variables Schema</p>
                <pre className='mt-1 rounded-lg bg-muted p-3 text-xs font-mono overflow-auto'>
                  {JSON.stringify(template.variablesSchema, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={() => setEditing(true)}>Edit Template</Button>
          </CardFooter>
        </Card>
      ) : (
        /* Edit Mode */
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
            <Card>
              <CardHeader>
                <CardTitle>Edit Template</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='templateName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='templateType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEMPLATE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='subject'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='content'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea className='min-h-[120px]' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='channels'
                  render={() => (
                    <FormItem>
                      <FormLabel>Channels</FormLabel>
                      <div className='flex flex-wrap gap-4'>
                        {CHANNEL_OPTIONS.map((ch) => (
                          <FormField
                            key={ch.value}
                            control={form.control}
                            name='channels'
                            render={({ field }) => (
                              <FormItem className='flex items-center gap-2 space-y-0'>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(ch.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value ?? []
                                      if (checked) {
                                        field.onChange([...current, ch.value])
                                      } else {
                                        field.onChange(current.filter((v: string) => v !== ch.value))
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='text-sm font-normal cursor-pointer'>{ch.label}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Enable this template</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className='justify-between'>
                <Button type='button' variant='outline' onClick={() => setEditing(false)}>Cancel</Button>
                <Button type='submit' disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Rendered preview of "{template.templateName}"</DialogDescription>
          </DialogHeader>
          <div className='rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap'>
            {previewResult || 'No preview available'}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget} onOpenChange={setDeleteTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.templateName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
