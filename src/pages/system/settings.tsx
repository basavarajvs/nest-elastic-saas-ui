import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { SystemAdminController_getSettings, SystemAdminController_updateSetting } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { customInstance } from '@/lib/http/httpClient'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Setting {
  key: string
  value: string | number | boolean | object | null
  description?: string
  isPublic?: boolean
  updatedAt?: string
}

export function SystemSettingsPage() {
  const queryClient = useQueryClient()
  const [editSetting, setEditSetting] = useState<Setting | null>(null)
  const [deleteSetting, setDeleteSetting] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formKey, setFormKey] = useState('')
  const [formValue, setFormValue] = useState('')

  const { data: settings, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['system', 'settings'],
    queryFn: async () => {
      const res = await SystemAdminController_getSettings()
      return (res as unknown as { data: Record<string, Setting> }).data ?? {}
    },
    staleTime: 60_000,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      let parsedValue: any = value
      try {
        parsedValue = JSON.parse(value)
      } catch (e) {
        // Leave as string
      }
      
      await SystemAdminController_updateSetting(key, {
        body: JSON.stringify({ value: parsedValue }),
        headers: { 'Content-Type': 'application/json' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] })
      toast.success('Setting updated successfully')
      setEditSetting(null)
      setIsCreating(false)
      setFormKey('')
      setFormValue('')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update setting'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      // Assuming DELETE endpoint exists at /api/v1/system/settings/{key}
      await customInstance(`/api/v1/system/settings/${key}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] })
      toast.success('Setting deleted successfully')
      setDeleteSetting(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete setting'),
  })

  const handleEdit = (setting: Setting) => {
    setEditSetting(setting)
    setFormKey(setting.key)
    setFormValue(typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : String(setting.value))
  }

  const handleCreate = () => {
    setIsCreating(true)
    setFormKey('')
    setFormValue('')
    setEditSetting(null)
  }

  const settingsList = Object.values(settings ?? {})

  return (
    <div className='space-y-6'>
      <PageHeader
        title='System Settings'
        description='Manage global platform configuration and feature flags'
        actions={
          <div className='flex gap-2'>
            <Button variant='outline' size='icon' onClick={() => refetch()}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleCreate}>
              <Plus className='mr-2 h-4 w-4' />
              New Setting
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Global Configuration</CardTitle>
          <CardDescription>
            These settings apply across all tenants unless overridden.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : settingsList.length === 0 ? (
            <EmptyState
              title='No settings configured'
              description='There are currently no global settings configured in the system.'
              icon={<Settings2 className='h-10 w-10' />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[250px]'>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settingsList.map((setting) => (
                  <TableRow key={setting.key}>
                    <TableCell className='font-mono text-sm font-medium'>
                      {setting.key}
                    </TableCell>
                    <TableCell className='font-mono text-xs truncate max-w-md'>
                      {typeof setting.value === 'object' 
                        ? JSON.stringify(setting.value) 
                        : String(setting.value)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(setting)}>
                          Edit
                        </Button>
                        <Button variant='ghost' size='icon' className='h-8 w-8 text-destructive' onClick={() => setDeleteSetting(setting.key)}>
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

      {/* Edit / Create Dialog */}
      <Dialog open={!!editSetting || isCreating} onOpenChange={(open) => {
        if (!open) {
          setEditSetting(null)
          setIsCreating(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create System Setting' : 'Edit System Setting'}</DialogTitle>
            <DialogDescription>
              {isCreating ? 'Add a new configuration key and value.' : 'Update the value for this configuration key.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Key</Label>
              <Input
                placeholder='e.g. AUTH_REQUIRE_MFA'
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                disabled={!isCreating}
                className='font-mono'
              />
            </div>
            <div className='space-y-2'>
              <Label>Value (String, Number, Boolean, or JSON)</Label>
              <Textarea
                placeholder='e.g. true, 100, or {"enabled": true}'
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                className='font-mono min-h-[100px]'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => { setEditSetting(null); setIsCreating(false); }}>
              Cancel
            </Button>
            <Button
              disabled={!formKey || !formValue || updateMutation.isPending}
              onClick={() => updateMutation.mutate({ key: formKey, value: formValue })}
            >
              {isCreating ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSetting} onOpenChange={() => setDeleteSetting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the setting <span className='font-mono'>{deleteSetting}</span>? This action cannot be undone and may affect system behavior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleteMutation.isPending}
              onClick={() => deleteSetting && deleteMutation.mutate(deleteSetting)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
