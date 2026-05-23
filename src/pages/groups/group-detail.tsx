import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  UserMinus,
} from 'lucide-react'
import { toast } from 'sonner'
import { GroupController_findOne } from '@/lib/api/wms-saas-core-api/groups/groups'
import { GroupController_getMembers } from '@/lib/api/wms-saas-core-api/groups/groups'
import { GroupController_addMember } from '@/lib/api/wms-saas-core-api/groups/groups'
import { GroupController_removeMember } from '@/lib/api/wms-saas-core-api/groups/groups'
import { GroupController_update } from '@/lib/api/wms-saas-core-api/groups/groups'
import { GroupController_remove } from '@/lib/api/wms-saas-core-api/groups/groups'
import type { AddGroupMemberDto, UpdateGroupDto } from '@/lib/types/wms-saas-core-api'
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
import { Textarea } from '@/components/ui/textarea'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface GroupDetail {
  id: string
  groupName: string
  groupType?: string
  groupDescription?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

interface GroupMember {
  userId: string
  email?: string
  name?: string
  role?: string
  addedAt?: string
}

const editSchema = z.object({
  groupName: z.string().min(1, 'Group name is required').max(200),
  groupType: z.string().optional(),
  groupDescription: z.string().max(500).optional(),
})

type EditForm = z.input<typeof editSchema>

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

const TYPE_STYLES: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  custom: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

function typeStyle(type?: string): string {
  return TYPE_STYLES[type?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

export function GroupDetailPage() {
  const { id } = useParams({ from: '/_authenticated/groups/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null)

  const { data: group, isLoading, isError, error } = useQuery({
    queryKey: ['groups', id],
    queryFn: async () => {
      const res = await GroupController_findOne(id)
      return (res as unknown as { data: GroupDetail }).data ?? ({} as GroupDetail)
    },
    staleTime: 30_000,
    enabled: !!id,
  })

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['groups', id, 'members'],
    queryFn: async () => {
      const res = await GroupController_getMembers(id)
      return (res as unknown as { data: GroupMember[] }).data ?? []
    },
    staleTime: 30_000,
    enabled: !!id,
  })

  const members: GroupMember[] = membersData ?? []

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: {
      groupName: group?.groupName ?? '',
      groupType: group?.groupType ?? '',
      groupDescription: group?.groupDescription ?? '',
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      const dto: UpdateGroupDto = {}
      if (values.groupName !== group?.groupName) dto.groupName = values.groupName
      if (values.groupType !== group?.groupType) dto.groupType = values.groupType
      if (values.groupDescription !== group?.groupDescription) dto.groupDescription = values.groupDescription
      await GroupController_update(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id] })
      queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })
      toast.success('Group updated')
      setEditing(false)
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const dto: AddGroupMemberDto = { userId }
      await GroupController_addMember(id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id, 'members'] })
      toast.success('Member added')
      setShowAddMember(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to add member'),
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await GroupController_removeMember(id, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id, 'members'] })
      toast.success('Member removed')
      setRemoveTarget(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to remove member'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await GroupController_remove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })
      toast.success('Group deleted')
      navigate({ to: '/groups' })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to delete group'),
  })

  function onEditSubmit(values: EditForm) {
    updateMutation.mutate(values)
  }

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
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className='h-5 w-24' /></CardHeader>
              <CardContent><Skeleton className='h-8 w-32' /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !group) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/groups' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Group Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className='p-6 text-center text-sm text-destructive'>
            {error ? (error as Error).message : 'The group could not be loaded'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/groups' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{group.groupName}</h1>
            <p className='text-sm text-muted-foreground'>
              {group.groupType ?? 'standard'} group &middot; Created{' '}
              {formatDate(group.createdAt)}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel Edit' : 'Edit Group'}
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

      {editing ? (
        <Card className='max-w-2xl'>
          <CardHeader>
            <CardTitle>Edit Group</CardTitle>
            <CardDescription>Update group details</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className='space-y-4'>
                <FormField
                  control={editForm.control}
                  name='groupName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name='groupType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='admin'>Admin</SelectItem>
                          <SelectItem value='standard'>Standard</SelectItem>
                          <SelectItem value='custom'>Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name='groupDescription'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea className='resize-none' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='flex justify-end gap-3'>
                  <Button type='button' variant='outline' onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type='submit' disabled={updateMutation.isPending}>
                    {updateMutation.isPending && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-3'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Group Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant='outline' className={typeStyle(group.groupType)}>
                {group.groupType ?? 'standard'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-lg font-semibold'>{members.length}</p>
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
                {group.updatedAt ? formatDate(group.updatedAt) : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {group.groupDescription && !editing && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>{group.groupDescription}</p>
          </CardContent>
        </Card>
      )}

      {group.metadata && Object.keys(group.metadata).length > 0 && !editing && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='rounded-md bg-muted p-4 text-sm overflow-auto max-h-48'>
              {JSON.stringify(group.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-base'>Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button size='sm' onClick={() => setShowAddMember(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add Member
          </Button>
        </CardHeader>
        <CardContent className='p-0'>
          {membersLoading ? (
            <div className='p-6 space-y-3'>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className='p-6 text-center text-sm text-muted-foreground'>
              No members yet. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className='w-[80px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell className='font-mono text-xs'>{member.userId}</TableCell>
                    <TableCell>{member.name ?? member.email ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>{member.role ?? 'member'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-red-600'
                        title='Remove member'
                        onClick={() =>
                          setRemoveTarget({
                            userId: member.userId,
                            name: member.name ?? member.email ?? member.userId,
                          })
                        }
                      >
                        <UserMinus className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a user to "{group.groupName}"
            </DialogDescription>
          </DialogHeader>
          <AddMemberForm
            onAdd={(userId) => addMemberMutation.mutate(userId)}
            loading={addMemberMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{removeTarget?.name}" from this group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => {
                if (!removeTarget) return
                removeMemberMutation.mutate(removeTarget.userId)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.groupName}"? This action cannot be
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

function AddMemberForm({
  onAdd,
  loading,
}: {
  onAdd: (userId: string) => void
  loading: boolean
}) {
  const [userId, setUserId] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId.trim()) return
    onAdd(userId.trim())
    setUserId('')
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='userId'>User ID</Label>
        <Input
          id='userId'
          placeholder='Enter user ID'
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type='submit' disabled={!userId.trim() || loading}>
          {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          Add
        </Button>
      </DialogFooter>
    </form>
  )
}
