import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  TenantSettingController_findAllSettings,
  TenantSettingController_createSetting,
  TenantSettingController_updateSetting,
  TenantSettingController_deleteSetting,
  TenantSettingController_findAllConfigOverrides,
  TenantSettingController_createConfigOverride,
  TenantSettingController_updateConfigOverride,
  TenantSettingController_deleteConfigOverride,
} from '@/lib/api/wms-saas-core-api/tenant-settings-config/tenant-settings-config'
import {
  CreateTenantSettingDtoCategory,
  type CreateTenantSettingDto,
  type UpdateTenantSettingDto,
  type CreateTenantConfigOverrideDto,
  type UpdateTenantConfigOverrideDto,
} from '@/lib/types/wms-saas-core-api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface TenantSetting {
  id?: string
  settingKey: string
  settingValue?: string
  settingType?: string
  description?: string
  category?: string
  isEncrypted?: boolean
  createdAt?: string
  updatedAt?: string
}

interface ConfigOverride {
  id?: string
  configKey: string
  configValue?: string
  configType?: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

const createSchema = z.object({
  settingKey: z.string().min(1, 'Key is required').max(100),
  settingValue: z.string().optional(),
  settingType: z.string().optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1, 'Category is required'),
  isEncrypted: z.boolean().optional(),
})

type CreateForm = z.input<typeof createSchema>

const createOverrideSchema = z.object({
  configKey: z.string().min(1, 'Key is required').max(100),
  configValue: z.string().optional(),
  configType: z.string().optional(),
  description: z.string().max(500).optional(),
})

type CreateOverrideForm = z.input<typeof createOverrideSchema>

function SettingValueControl({
  type,
  value,
  onChange,
}: {
  type?: string
  value: string
  onChange: (v: string) => void
}) {
  if (type === 'boolean' || type === 'switch') {
    return (
      <Switch
        checked={value === 'true'}
        onCheckedChange={(checked) => onChange(String(checked))}
      />
    )
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className='max-w-[200px]'
    />
  )
}

export function TenantSettingsPage() {
  const queryClient = useQueryClient()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ key: string; name: string } | null>(null)

  const [activeTab, setActiveTab] = useState<'settings' | 'overrides'>('settings')
  const [showCreateOverride, setShowCreateOverride] = useState(false)
  const [overrideDeleteTarget, setOverrideDeleteTarget] = useState<{ key: string; name: string } | null>(null)
  const [overrideEdits, setOverrideEdits] = useState<Record<string, string>>({})

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tenant-settings', 'list'],
    queryFn: async () => {
      const res = await TenantSettingController_findAllSettings()
      return (res as unknown as { data: TenantSetting[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const settings = data ?? []

  const {
    data: overridesData,
    isLoading: overridesLoading,
    isError: overridesError,
    error: overridesErr,
    refetch: refetchOverrides,
  } = useQuery({
    queryKey: ['tenant-settings', 'overrides'],
    queryFn: async () => {
      const res = await TenantSettingController_findAllConfigOverrides()
      return (res as unknown as { data: ConfigOverride[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const overrides = overridesData ?? []

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      settingKey: '',
      settingValue: '',
      settingType: 'string',
      description: '',
      category: 'general',
      isEncrypted: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateForm) => {
      const dto: CreateTenantSettingDto = {
        settingKey: values.settingKey,
        category: values.category as CreateTenantSettingDto['category'],
      }
      if (values.settingValue) dto.settingValue = values.settingValue
      if (values.settingType) dto.settingType = values.settingType
      if (values.description) dto.description = values.description
      if (values.isEncrypted) dto.isEncrypted = values.isEncrypted
      await TenantSettingController_createSetting(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', 'list'] })
      toast.success('Setting created')
      setShowCreate(false)
      createForm.reset()
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to create setting'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, settingValue }: { key: string; settingValue: string }) => {
      const dto: UpdateTenantSettingDto = { settingValue }
      await TenantSettingController_updateSetting(key, dto)
    },
    onSuccess: (_, { key }) => {
      setEdits((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', 'list'] })
      toast.success('Setting updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update setting'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      await TenantSettingController_deleteSetting(key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', 'list'] })
      toast.success('Setting deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete setting'),
  })

  const createOverrideForm = useForm<CreateOverrideForm>({
    resolver: zodResolver(createOverrideSchema),
    defaultValues: { configKey: '', configValue: '', configType: 'string', description: '' },
  })

  const createOverrideMutation = useMutation({
    mutationFn: async (values: CreateOverrideForm) => {
      const dto: CreateTenantConfigOverrideDto = {
        configKey: values.configKey,
      }
      if (values.configValue) dto.configValue = values.configValue
      if (values.configType) dto.configType = values.configType
      if (values.description) dto.description = values.description
      await TenantSettingController_createConfigOverride(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', 'overrides'] })
      toast.success('Config override created')
      setShowCreateOverride(false)
      createOverrideForm.reset()
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to create override'),
  })

  const updateOverrideMutation = useMutation({
    mutationFn: async ({ key, configValue }: { key: string; configValue: string }) => {
      const dto: UpdateTenantConfigOverrideDto = { configValue }
      await TenantSettingController_updateConfigOverride(key, dto)
    },
    onSuccess: (_, { key }) => {
      setOverrideEdits((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', 'overrides'] })
      toast.success('Override updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update override'),
  })

  const deleteOverrideMutation = useMutation({
    mutationFn: async (key: string) => {
      await TenantSettingController_deleteConfigOverride(key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', 'overrides'] })
      toast.success('Override deleted')
      setOverrideDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete override'),
  })

  function handleEditChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave(key: string, originalValue?: string) {
    const newValue = edits[key]
    if (newValue === undefined || newValue === originalValue) return
    updateMutation.mutate({ key, settingValue: newValue })
  }

  function getDisplayValue(setting: TenantSetting): string {
    return edits[setting.settingKey] ?? setting.settingValue ?? ''
  }

  function hasChanged(setting: TenantSetting): boolean {
    const edit = edits[setting.settingKey]
    return edit !== undefined && edit !== (setting.settingValue ?? '')
  }

  function onCreateSubmit(values: CreateForm) {
    createMutation.mutate(values)
  }

  function handleOverrideEditChange(key: string, value: string) {
    setOverrideEdits((prev) => ({ ...prev, [key]: value }))
  }

  function handleOverrideSave(key: string, originalValue?: string) {
    const newValue = overrideEdits[key]
    if (newValue === undefined || newValue === originalValue) return
    updateOverrideMutation.mutate({ key, configValue: newValue })
  }

  function getOverrideDisplayValue(ov: ConfigOverride): string {
    return overrideEdits[ov.configKey] ?? ov.configValue ?? ''
  }

  function hasOverrideChanged(ov: ConfigOverride): boolean {
    const edit = overrideEdits[ov.configKey]
    return edit !== undefined && edit !== (ov.configValue ?? '')
  }

  function onCreateOverrideSubmit(values: CreateOverrideForm) {
    createOverrideMutation.mutate(values)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Tenant Settings</h1>
          <p className='text-sm text-muted-foreground'>
            Manage tenant-level settings configuration and config overrides
          </p>
        </div>
        <Button variant='outline' size='icon' onClick={() => (activeTab === 'settings' ? refetch() : refetchOverrides())}>
          <RefreshCw className='h-4 w-4' />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'settings' | 'overrides')}>
        <TabsList>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
          <TabsTrigger value='overrides'>Config Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value='settings' className='space-y-4'>
          <div className='flex justify-end'>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Setting
            </Button>
          </div>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle>All Settings</CardTitle>
          <CardDescription>
            {settings.length} setting{settings.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-6 space-y-3'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : isError ? (
            <div className='p-6 text-center text-sm text-destructive'>
              Failed to load settings: {(error as Error).message}
            </div>
          ) : settings.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              No settings found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className='hidden md:table-cell'>Type</TableHead>
                  <TableHead className='hidden sm:table-cell'>Category</TableHead>
                  <TableHead className='w-[120px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((setting) => (
                  <TableRow key={setting.settingKey}>
                    <TableCell className='font-medium font-mono text-xs max-w-[200px] truncate'>
                      {setting.settingKey}
                      {setting.isEncrypted && (
                        <span className='ml-1.5 text-xs text-muted-foreground'>(enc)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <SettingValueControl
                          type={setting.settingType}
                          value={getDisplayValue(setting)}
                          onChange={(v) => handleEditChange(setting.settingKey, v)}
                        />
                        {hasChanged(setting) && (
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => handleSave(setting.settingKey, setting.settingValue)}
                            disabled={updateMutation.isPending}
                          >
                            <Save className='h-3.5 w-3.5' />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <Badge variant='outline'>{setting.settingType ?? 'string'}</Badge>
                    </TableCell>
                    <TableCell className='hidden sm:table-cell text-sm capitalize'>
                      {setting.category ?? 'general'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-red-600'
                        title='Delete'
                        onClick={() =>
                          setDeleteTarget({ key: setting.settingKey, name: setting.settingKey })
                        }
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Add Tenant Setting</DialogTitle>
            <DialogDescription>
              Create a new tenant-level setting definition
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className='space-y-4'>
              <FormField
                control={createForm.control}
                name='settingKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setting Key</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. max_users_per_tenant' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name='category'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select category' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(CreateTenantSettingDtoCategory).map((cat) => (
                          <SelectItem key={cat} value={cat} className='capitalize'>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name='settingType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='string'>String</SelectItem>
                        <SelectItem value='number'>Number</SelectItem>
                        <SelectItem value='boolean'>Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name='settingValue'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Value</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder='What does this setting control?' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name='isEncrypted'
                render={({ field }) => (
                  <FormItem className='flex items-center gap-2'>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className='!mt-0'>Encrypted</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value='overrides' className='space-y-4'>
          <div className='flex justify-end'>
            <Button onClick={() => setShowCreateOverride(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Override
            </Button>
          </div>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle>Config Overrides</CardTitle>
              <CardDescription>
                {overrides.length} override{overrides.length !== 1 ? 's' : ''} configured for this tenant
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              {overridesLoading ? (
                <div className='p-6 space-y-3'>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className='h-12 w-full' />
                  ))}
                </div>
              ) : overridesError ? (
                <div className='p-6 text-center text-sm text-destructive'>
                  Failed to load overrides: {(overridesErr as Error)?.message}
                </div>
              ) : overrides.length === 0 ? (
                <div className='p-6 text-center text-sm text-muted-foreground'>
                  No config overrides found. Create one to override system defaults.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Config Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className='hidden md:table-cell'>Type</TableHead>
                      <TableHead className='w-[120px]'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides.map((ov) => (
                      <TableRow key={ov.configKey}>
                        <TableCell className='font-medium font-mono text-xs max-w-[200px] truncate'>
                          {ov.configKey}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Input
                              value={getOverrideDisplayValue(ov)}
                              onChange={(e) => handleOverrideEditChange(ov.configKey, e.target.value)}
                              className='max-w-[200px]'
                            />
                            {hasOverrideChanged(ov) && (
                              <Button
                                size='sm'
                                variant='ghost'
                                onClick={() => handleOverrideSave(ov.configKey, ov.configValue)}
                                disabled={updateOverrideMutation.isPending}
                              >
                                <Save className='h-3.5 w-3.5' />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='hidden md:table-cell'>
                          <Badge variant='outline'>{ov.configType ?? 'string'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-red-600'
                            title='Delete'
                            onClick={() =>
                              setOverrideDeleteTarget({ key: ov.configKey, name: ov.configKey })
                            }
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Create Override Dialog */}
          <Dialog open={showCreateOverride} onOpenChange={setShowCreateOverride}>
            <DialogContent className='sm:max-w-lg'>
              <DialogHeader>
                <DialogTitle>Add Config Override</DialogTitle>
                <DialogDescription>
                  Create a tenant-specific config override
                </DialogDescription>
              </DialogHeader>
              <Form {...createOverrideForm}>
                <form onSubmit={createOverrideForm.handleSubmit(onCreateOverrideSubmit)} className='space-y-4'>
                  <FormField
                    control={createOverrideForm.control}
                    name='configKey'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Config Key</FormLabel>
                        <FormControl>
                          <Input placeholder='e.g. max_upload_size_mb' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createOverrideForm.control}
                    name='configType'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select type' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='string'>String</SelectItem>
                            <SelectItem value='number'>Number</SelectItem>
                            <SelectItem value='boolean'>Boolean</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createOverrideForm.control}
                    name='configValue'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createOverrideForm.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder='Override purpose' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type='button' variant='outline' onClick={() => setShowCreateOverride(false)}>
                      Cancel
                    </Button>
                    <Button type='submit' disabled={createOverrideMutation.isPending}>
                      {createOverrideMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Override Confirmation */}
          <AlertDialog
            open={!!overrideDeleteTarget}
            onOpenChange={() => setOverrideDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Override</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete override "{overrideDeleteTarget?.name}"? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  onClick={() => {
                    if (!overrideDeleteTarget) return
                    deleteOverrideMutation.mutate(overrideDeleteTarget.key)
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation for Settings (always available) */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => {
                if (!deleteTarget) return
                deleteMutation.mutate(deleteTarget.key)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
