import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  Play,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ReportController_findOne } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_generate } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_download } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_remove } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_createSchedule } from '@/lib/api/wms-saas-core-api/reports/reports'
import { ReportController_getSchedules } from '@/lib/api/wms-saas-core-api/reports/reports'
import type { ReportScheduleDto } from '@/lib/types/wms-saas-core-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ReportDetail {
  id: string
  reportName: string
  reportType?: string
  format?: string
  description?: string
  status?: string
  parameters?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

interface Schedule {
  id: string
  frequency?: string
  cronExpression?: string
  nextRun?: string
  lastRun?: string
  isActive?: boolean
  createdAt?: string
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function ReportDetailPage() {
  const { id } = useParams({ from: '/_authenticated/reports/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showSchedule, setShowSchedule] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [scheduleFreq, setScheduleFreq] = useState('')
  const [scheduleCron, setScheduleCron] = useState('')

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['reports', id],
    queryFn: async () => {
      const res = await ReportController_findOne(id)
      return (res as unknown as { data: ReportDetail }).data ?? ({} as ReportDetail)
    },
    staleTime: 30_000,
    enabled: !!id,
  })

  const { data: schedulesData } = useQuery({
    queryKey: ['reports', id, 'schedules'],
    queryFn: async () => {
      const res = await ReportController_getSchedules(id)
      return (res as unknown as { data: Schedule[] }).data ?? []
    },
    staleTime: 30_000,
    enabled: !!id,
  })

  const schedules: Schedule[] = schedulesData ?? []

  const generateMutation = useMutation({
    mutationFn: async () => {
      await ReportController_generate(id)
    },
    onSuccess: () => {
      toast.success('Report generation started')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to generate'),
  })

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await ReportController_download(id)
      const blob = res as unknown as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${id}.${report?.format ?? 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to download'),
  })

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleFreq) throw new Error('Frequency is required')
      const dto: ReportScheduleDto = {
        frequency: scheduleFreq,
        cronExpression: scheduleCron || '0 0 * * *',
      }
      await ReportController_createSchedule(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', id, 'schedules'] })
      toast.success('Schedule created')
      setShowSchedule(false)
      setScheduleFreq('')
      setScheduleCron('')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to create schedule'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await ReportController_remove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] })
      toast.success('Report deleted')
      navigate({ to: '/reports' })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete'),
  })

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-9 w-9' />
          <div>
            <Skeleton className='h-7 w-48' />
            <Skeleton className='mt-1 h-4 w-32' />
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className='h-5 w-24' /></CardHeader>
              <CardContent><Skeleton className='h-8 w-32' /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/reports' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Report Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className='p-6 text-center text-sm text-destructive'>
            {error ? (error as Error).message : 'The report could not be loaded'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/reports' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{report.reportName}</h1>
            <p className='text-sm text-muted-foreground'>
              {report.reportType ?? 'Report'} &middot; Created{' '}
              {formatDate(report.createdAt)}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Play className='mr-2 h-4 w-4' />
            )}
            Generate Now
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
          >
            <Download className='mr-2 h-4 w-4' />
            Download
          </Button>
          <Button variant='outline' size='sm' onClick={() => setShowSchedule(true)}>
            <Calendar className='mr-2 h-4 w-4' />
            Schedule
          </Button>
          <Button
            variant='destructive'
            size='sm'
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Report Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-lg font-semibold capitalize'>
              {report.reportType?.replace(/_/g, ' ') ?? 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Format
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant='outline' className='text-sm'>
              {report.format?.toUpperCase() ?? 'N/A'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-lg font-semibold capitalize'>{report.status ?? 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-lg font-semibold'>
              {report.updatedAt ? formatDate(report.updatedAt) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {report.description && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>{report.description}</p>
          </CardContent>
        </Card>
      )}

      {report.parameters && Object.keys(report.parameters).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='rounded-md bg-muted p-4 text-sm overflow-auto max-h-48'>
              {JSON.stringify(report.parameters, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Schedules</CardTitle>
          <CardDescription>
            {schedules.length > 0
              ? `${schedules.length} schedule${schedules.length > 1 ? 's' : ''} configured`
              : 'No schedules configured'}
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {schedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Cron</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className='font-medium capitalize'>
                      {s.frequency ?? '-'}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>{s.cronExpression ?? '-'}</TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {s.nextRun ? formatDate(s.nextRun) : '-'}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {s.lastRun ? formatDate(s.lastRun) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.isActive ? 'default' : 'secondary'}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              No schedules yet.{' '}
              <Button variant='link' className='p-0 h-auto' onClick={() => setShowSchedule(true)}>
                Create one
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
            <DialogDescription>
              Set up recurring generation for "{report.reportName}"
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Frequency</Label>
              <Select value={scheduleFreq} onValueChange={setScheduleFreq}>
                <SelectTrigger>
                  <SelectValue placeholder='Select frequency' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='daily'>Daily</SelectItem>
                  <SelectItem value='weekly'>Weekly</SelectItem>
                  <SelectItem value='monthly'>Monthly</SelectItem>
                  <SelectItem value='quarterly'>Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Cron Expression</Label>
              <Input
                placeholder='e.g. 0 8 * * 1'
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowSchedule(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => scheduleMutation.mutate()}
              disabled={!scheduleFreq || scheduleMutation.isPending}
            >
              {scheduleMutation.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{report.reportName}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
