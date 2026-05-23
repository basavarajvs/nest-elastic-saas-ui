import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { UserController_getMe } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_updateMyPreferences } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_setAttribute } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_getAttributes } from '@/lib/api/wms-saas-core-api/users/users'
import type { UpdateUserPreferencesDto, SetAttributeDto } from '@/lib/types/wms-saas-core-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useForm } from 'react-hook-form'
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

interface UserProfile {
  id: string
}

const layoutSchema = z.object({
  dashboardLayout: z.string().optional(),
})

type LayoutForm = z.input<typeof layoutSchema>

export function UserSettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await UserController_getMe()
      return (res as unknown as { data: UserProfile }).data ?? ({} as UserProfile)
    },
    staleTime: 60_000,
  })

  const { data: attributes, isLoading: attrLoading } = useQuery({
    queryKey: ['profile', 'attributes'],
    queryFn: async () => {
      const res = await UserController_getAttributes(profile?.id ?? '')
      return (res as unknown as { data: { name: string; value: string }[] }).data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })

  const attrList = (attributes ?? []) as { name: string; value: string }[]

  const layoutForm = useForm<LayoutForm>({
    defaultValues: { dashboardLayout: 'default' },
  })

  const updatePrefsMutation = useMutation({
    mutationFn: async (values: LayoutForm) => {
      const dto: UpdateUserPreferencesDto = { dashboardLayout: values.dashboardLayout }
      await UserController_updateMyPreferences(dto)
    },
    onSuccess: () => {
      toast.success('Settings updated')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to update settings'
      toast.error(msg)
    },
  })

  const setAttrMutation = useMutation({
    mutationFn: async (dto: SetAttributeDto) => {
      await UserController_setAttribute(profile?.id ?? '', dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'attributes'] })
      toast.success('Attribute saved')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to save attribute'
      toast.error(msg)
    },
  })

  const [newAttrName, setNewAttrName] = useState('')
  const [newAttrValue, setNewAttrValue] = useState('')

  if (profileLoading) {
    return (
      <div className='space-y-6 max-w-2xl'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-48 w-full' />
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div className='flex items-center gap-3'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/profile' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>User Settings</h1>
          <p className='text-sm text-muted-foreground'>Customize your dashboard and manage attributes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Layout</CardTitle>
          <CardDescription>Choose your preferred dashboard layout</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...layoutForm}>
            <form onSubmit={layoutForm.handleSubmit((values) => updatePrefsMutation.mutate(values))} className='space-y-4'>
              <FormField
                control={layoutForm.control}
                name='dashboardLayout'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Layout Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select layout' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='default'>Default</SelectItem>
                        <SelectItem value='compact'>Compact</SelectItem>
                        <SelectItem value='expanded'>Expanded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Controls how dashboard widgets are arranged</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' size='sm' disabled={updatePrefsMutation.isPending}>
                {updatePrefsMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Save Layout
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Custom Attributes</CardTitle>
          <CardDescription>Manage your custom user attributes</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {attrLoading ? (
            <Skeleton className='h-20 w-full' />
          ) : attrList.length > 0 ? (
            <div className='space-y-2'>
              {attrList.map((attr) => (
                <div key={attr.name} className='flex items-center justify-between rounded-lg border p-3'>
                  <div>
                    <p className='text-sm font-medium'>{attr.name}</p>
                    <p className='text-xs text-muted-foreground'>{attr.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No custom attributes set</p>
          )}

          <Separator />

          <div className='space-y-3'>
            <p className='text-sm font-medium'>Add Attribute</p>
            <div className='flex gap-2'>
              <Input
                placeholder='Name'
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                className='flex-1'
              />
              <Input
                placeholder='Value'
                value={newAttrValue}
                onChange={(e) => setNewAttrValue(e.target.value)}
                className='flex-1'
              />
              <Button
                size='sm'
                disabled={!newAttrName || !newAttrValue || setAttrMutation.isPending}
                onClick={() => {
                  setAttrMutation.mutate({ name: newAttrName, value: newAttrValue })
                  setNewAttrName('')
                  setNewAttrValue('')
                }}
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
