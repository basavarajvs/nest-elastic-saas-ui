import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionController_findAll } from '@/lib/api/wms-saas-core-api/permissions/permissions'
import { RoleController_assignPermission } from '@/lib/api/wms-saas-core-api/roles/roles'
import { RoleController_revokePermission } from '@/lib/api/wms-saas-core-api/roles/roles'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

interface AssignedPermission {
  id: string
  permissionCode: string
  permissionName: string
  resourceType?: string
  resourceAction?: string
}

interface PermissionsManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: string
  roleName: string
  assignedPermissions: AssignedPermission[]
  inheritedPermissions?: AssignedPermission[]
}

export function PermissionsManager({
  open,
  onOpenChange,
  roleId,
  roleName,
  assignedPermissions,
  inheritedPermissions,
}: PermissionsManagerProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const assignedIds = useMemo(() => new Set(assignedPermissions.map((p) => p.id)), [assignedPermissions])
  const inheritedIds = useMemo(() => new Set((inheritedPermissions ?? []).map((p) => p.id)), [inheritedPermissions])

  const availablePermissions = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const res = await PermissionController_findAll({})
      const body = res as unknown as { data: { data: Array<{ permissionId: string; permissionName: string; permissionCode: string; resourceType?: string; resourceAction?: string }> } | Array<{ permissionId: string; permissionName: string; permissionCode: string; resourceType?: string; resourceAction?: string }> }
      const raw: Array<{ permissionId: string; permissionName: string; permissionCode: string; resourceType?: string; resourceAction?: string }> = Array.isArray(body.data) ? body.data : (body.data as any)?.data ?? []
      return raw.map((p) => ({ id: p.permissionId, permissionName: p.permissionName, permissionCode: p.permissionCode, resourceType: p.resourceType, resourceAction: p.resourceAction }))
    },
    enabled: open,
    staleTime: 30_000,
  })

  const assignMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      await RoleController_assignPermission(roleId, { permissionId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', roleId] })
      toast.success('Permission assigned')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to assign permission'),
  })

  const revokeMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      await RoleController_revokePermission(roleId, permissionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', roleId] })
      toast.success('Permission revoked')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to revoke permission'),
  })

  const allAssignedIds = useMemo(() => new Set([...assignedIds, ...inheritedIds]), [assignedIds, inheritedIds])

  const unassignedPermissions = useMemo(() => {
    if (!availablePermissions.data) return []
    return availablePermissions.data.filter((p) => !allAssignedIds.has(p.id))
  }, [availablePermissions.data, allAssignedIds])

  const filteredUnassigned = useMemo(
    () =>
      unassignedPermissions.filter(
        (p) =>
          p.permissionName.toLowerCase().includes(search.toLowerCase()) ||
          p.permissionCode.toLowerCase().includes(search.toLowerCase()) ||
          (p.resourceType ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [unassignedPermissions, search],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Assign or remove permissions for <strong>{roleName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Currently assigned */}
          <div>
            <h4 className='mb-2 text-sm font-medium'>
              Assigned Permissions ({assignedPermissions.length})
            </h4>
            <ScrollArea className='max-h-48'>
              {assignedPermissions.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No permissions assigned directly to this role.</p>
              ) : (
                <div className='space-y-1.5'>
                  {assignedPermissions.map((p) => (
                    <div
                      key={p.id}
                      className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
                    >
                      <div className='flex items-center gap-2 min-w-0'>
                        <span className='font-medium truncate'>{p.permissionName}</span>
                        <Badge variant='outline' className='shrink-0 text-xs font-mono'>
                          {p.permissionCode}
                        </Badge>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 shrink-0 text-red-600'
                        onClick={() => revokeMutation.mutate(p.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Inherited permissions (read-only) */}
          {inheritedPermissions && inheritedPermissions.length > 0 && (
            <div>
              <h4 className='mb-2 text-sm font-medium text-muted-foreground'>
                Inherited Permissions ({inheritedPermissions.length})
              </h4>
              <ScrollArea className='max-h-32'>
                <div className='space-y-1.5'>
                  {inheritedPermissions.map((p) => (
                    <div
                      key={p.id}
                      className='flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground'
                    >
                      <div className='flex items-center gap-2 min-w-0'>
                        <span className='truncate'>{p.permissionName}</span>
                        <Badge variant='outline' className='shrink-0 text-xs font-mono'>
                          {p.permissionCode}
                        </Badge>
                      </div>
                      <span className='text-xs shrink-0'>Inherited</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Add permission */}
          <div>
            <h4 className='mb-2 text-sm font-medium'>Add Permissions</h4>
            <div className='relative mb-2'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search permissions...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-8'
              />
            </div>
            <ScrollArea className='max-h-48'>
              {availablePermissions.isLoading ? (
                <div className='space-y-2'>
                  <Skeleton className='h-9 w-full' />
                  <Skeleton className='h-9 w-full' />
                  <Skeleton className='h-9 w-3/4' />
                </div>
              ) : filteredUnassigned.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  {search ? 'No matching permissions found' : 'All permissions are already assigned'}
                </p>
              ) : (
                <div className='space-y-1.5'>
                  {filteredUnassigned.map((p) => (
                    <div
                      key={p.id}
                      className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
                    >
                      <div className='flex items-center gap-2 min-w-0'>
                        <span className='font-medium truncate'>{p.permissionName}</span>
                        <Badge variant='outline' className='shrink-0 text-xs font-mono'>
                          {p.permissionCode}
                        </Badge>
                        {p.resourceType && (
                          <Badge variant='secondary' className='shrink-0 text-xs'>
                            {p.resourceType}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 shrink-0'
                        onClick={() => assignMutation.mutate(p.id)}
                        disabled={assignMutation.isPending}
                      >
                        <Plus className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
