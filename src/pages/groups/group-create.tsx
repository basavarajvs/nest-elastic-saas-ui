import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { GroupController_create } from '@/lib/api/wms-saas-core-api/groups/groups'
import type { CreateGroupDto } from '@/lib/types/wms-saas-core-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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

const createGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required').max(200),
  groupType: z.string().optional(),
  groupDescription: z.string().max(500).optional(),
  metadata: z.string().optional(),
})

type CreateGroupForm = z.input<typeof createGroupSchema>

const GROUP_TYPES = [
  { value: 'admin', label: 'Admin' },
  { value: 'standard', label: 'Standard' },
  { value: 'custom', label: 'Custom' },
]

export function CreateGroupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      groupName: '',
      groupType: '',
      groupDescription: '',
      metadata: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateGroupForm) => {
      const dto: CreateGroupDto = {
        groupName: values.groupName,
      }
      if (values.groupType) dto.groupType = values.groupType
      if (values.groupDescription) dto.groupDescription = values.groupDescription
      if (values.metadata?.trim()) {
        try {
          dto.metadata = JSON.parse(values.metadata) as Record<string, unknown>
        } catch {
          dto.metadata = { raw: values.metadata }
        }
      }
      await GroupController_create(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })
      toast.success('Group created')
      navigate({ to: '/groups' })
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreateGroupForm) {
    createMutation.mutate(values)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/groups' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create Group</h1>
          <p className='text-sm text-muted-foreground'>
            Create a new user group
          </p>
        </div>
      </div>

      <Separator />

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>
            Configure the new group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='groupName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Group Name <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. Engineering Team' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='groupType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select type (optional)' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GROUP_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='groupDescription'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='What is this group for?'
                        className='resize-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='metadata'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadata (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"department": "Engineering", "region": "US"}'
                        className='min-h-[100px] font-mono text-sm'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional JSON metadata for the group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end gap-3'>
                <Button type='button' variant='outline' onClick={() => navigate({ to: '/groups' })}>
                  Cancel
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Create Group
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
