import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { SystemAdminController_getSettings } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import { SystemAdminController_updateSetting } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'

interface SystemSetting {
  settingKey: string
  settingValue?: string
  settingType?: string
  description?: string
  category?: string
  isEncrypted?: boolean
}

const CATEGORIES = ['general', 'security', 'notifications', 'billing', 'compliance'] as const

function SettingInput({
  setting,
  value,
  onChange,
}: {
  setting: SystemSetting
  value: string
  onChange: (key: string, value: string) => void
}) {
  if (setting.settingType === 'boolean' || setting.settingType === 'switch') {
    return (
      <Switch
        checked={value === 'true'}
        onCheckedChange={(checked) => onChange(setting.settingKey, String(checked))}
      />
    )
  }
  if (setting.settingType === 'number') {
    return (
      <Input
        type='number'
        value={value}
        onChange={(e) => onChange(setting.settingKey, e.target.value)}
        className='max-w-[200px]'
      />
    )
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(setting.settingKey, e.target.value)}
      className='max-w-[400px]'
    />
  )
}

export function SystemSettingsPage() {
  const queryClient = useQueryClient()
  const [edits, setEdits] = useState<Record<string, string>>({})

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['system-admin', 'settings'],
    queryFn: async () => {
      const res = await SystemAdminController_getSettings()
      return (res as unknown as { data: SystemSetting[] }).data ?? []
    },
    staleTime: 30_000,
  })

  const settings = data ?? []

  const updateMutation = useMutation({
    mutationFn: async ({ key, settingValue }: { key: string; settingValue: string }) => {
      await SystemAdminController_updateSetting(key, {
        body: JSON.stringify({ settingValue }),
      })
    },
    onSuccess: (_, { key }) => {
      setEdits((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'settings'] })
      toast.success('Setting updated')
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        err.message
      toast.error(msg)
    },
  })

  function handleChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave(key: string, originalValue?: string) {
    const newValue = edits[key]
    if (newValue === undefined || newValue === originalValue) return
    updateMutation.mutate({ key, settingValue: newValue })
  }

  function getDisplayValue(setting: SystemSetting): string {
    if (edits[setting.settingKey] !== undefined) return edits[setting.settingKey]
    return setting.settingValue ?? ''
  }

  function hasChanged(setting: SystemSetting): boolean {
    const edit = edits[setting.settingKey]
    return edit !== undefined && edit !== (setting.settingValue ?? '')
  }

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    settings: settings.filter((s) => (s.category ?? 'general').toLowerCase() === cat),
  })).filter((g) => g.settings.length > 0)

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>System Settings</h1>
          <p className='text-sm text-muted-foreground'>
            Manage system-wide configuration
          </p>
        </div>
        <div className='space-y-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className='h-5 w-32' /></CardHeader>
              <CardContent className='space-y-3'>
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className='h-10 w-full' />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>System Settings</h1>
            <p className='text-sm text-muted-foreground'>
              Manage system-wide configuration
            </p>
          </div>
          <Button variant='outline' size='icon' onClick={() => refetch()}>
            <RefreshCw className='h-4 w-4' />
          </Button>
        </div>
        <Card>
          <CardContent className='p-6 text-center text-sm text-destructive'>
            Failed to load settings: {(error as Error).message}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>System Settings</h1>
          <p className='text-sm text-muted-foreground'>
            Manage system-wide configuration
          </p>
        </div>
        <Button variant='outline' size='icon' onClick={() => { refetch(); setEdits({}) }}>
          <RefreshCw className='h-4 w-4' />
        </Button>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-muted-foreground'>
            No settings found
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ category, settings: catSettings }) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className='capitalize'>{category}</CardTitle>
              <CardDescription>
                {category === 'general' && 'General platform settings'}
                {category === 'security' && 'Security and authentication settings'}
                {category === 'notifications' && 'Email and notification preferences'}
                {category === 'billing' && 'Billing and payment configuration'}
                {category === 'compliance' && 'Compliance and data retention settings'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='divide-y'>
                {catSettings.map((setting) => (
                  <div
                    key={setting.settingKey}
                    className='flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0'
                  >
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium break-all'>
                        {setting.settingKey}
                        {setting.isEncrypted && (
                          <span className='ml-1.5 text-xs text-muted-foreground'>(encrypted)</span>
                        )}
                      </p>
                      {setting.description && (
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          {setting.description}
                        </p>
                      )}
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                      <SettingInput
                        setting={setting}
                        value={getDisplayValue(setting)}
                        onChange={handleChange}
                      />
                      {hasChanged(setting) && (
                        <Button
                          size='sm'
                          onClick={() => handleSave(setting.settingKey, setting.settingValue)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                          ) : (
                            <Save className='h-3.5 w-3.5' />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
