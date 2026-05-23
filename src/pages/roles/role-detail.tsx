import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Shield,
  ShieldOff,
  Tag,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { RoleController_findById } from '@/lib/api/wms-saas-core-api/roles/roles'
import { RoleController_getInheritedPermissions } from '@/lib/api/wms-saas-core-api/roles/roles'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PermissionsManager } from './permissions-manager'

interface RoleDetail {
  id: string
  roleName: string
  roleCode: string
  roleType?: string
  roleDescription?: string
  isActive?: boolean
  isDeleted?: boolean
  parentRoleId?: string
  parentRoleName?: string
  assignmentRequiresApproval?: boolean
  autoExpiryEnabled?: boolean
  maxDurationHours?: number
  isDefaultRole?: boolean
  createdAt: string
  updatedAt?: string
  createdBy?: string
  permissions?: Array<{
    id: string
    permissionCode: string
    permissionName: string
    resourceType?: string
    resourceAction?: string
  }>
}

interface InheritedPermission {
  id: string
  permissionCode: string
  permissionName: string
  resourceType?: string
  resourceAction?: string
}

const TYPE_STYLES: Record<string, string> = {
  system: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  tenant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

function typeStyle(type?: string): string {
  return TYPE_STYLES[type?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function RoleDetailPage() {
  const { id: roleId } = useParams({ from: '/_authenticated/roles/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showPermissions, setShowPermissions] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const role = useQuery({
    queryKey: ['roles', 'detail', roleId],
    queryFn: async () => {
      const res = await RoleController_findById(roleId)
      return (res as unknown as { data: RoleDetail }).data
    },
    enabled: !!roleId,
    staleTime: 30_000,
  })

  const inheritedPerms = useQuery({
    queryKey: ['roles', 'inherited-permissions', roleId],
    queryFn: async () => {
      const res = await RoleController_getInheritedPermissions(roleId)
      return (res as unknown as { data: InheritedPermission[] }).data ?? []
    },
    enabled: !!roleId,
    staleTime: 30_000,
  })

  const data = role.data

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/roles' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {role.isLoading ? 'Loading...' : data?.roleName ?? 'Role'}
          </h1>
          <p className='text-sm text-muted-foreground'>
            Role details and permission management
          </p>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          {!role.isLoading && data && (
            <>
              <Button variant='outline' onClick={() => setShowPermissions(true)}>
                <KeyRound className='mr-2 h-4 w-4' />
                Permissions
              </Button>
              <Button
                variant='outline'
                className='text-red-600'
                onClick={() => setConfirmDelete(true)}
              >
                <ShieldOff className='mr-2 h-4 w-4' />
                Delete Role
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {role.isLoading ? (
        <div className='grid gap-6 md:grid-cols-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-5 w-32' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-4 w-full' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : role.isError ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-destructive'>
            Failed to load role: {(role.error as Error).message}
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className='p-6 text-center text-sm text-muted-foreground'>
            Role not found
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Shield className='h-4 w-4' />
                  General Information
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>ID</span>
                  <span className='font-mono text-xs'>{data.id}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Name</span>
                  <span>{data.roleName}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Code</span>
                  <span className='font-mono text-xs'>{data.roleCode}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Type</span>
                  <Badge variant='outline' className={typeStyle(data.roleType)}>
                    {data.roleType ?? '--'}
                  </Badge>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Active</span>
                  <Badge variant='outline' className={data.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}>
                    {data.isActive ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {data.roleDescription && (
                  <>
                    <Separator />
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Description</span>
                      <span className='max-w-[200px] text-right'>{data.roleDescription}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Tag className='h-4 w-4' />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Parent Role</span>
                  <span>{data.parentRoleName ?? data.parentRoleId ?? '-'}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Default Role</span>
                  <Badge variant='outline' className={data.isDefaultRole ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}>
                    {data.isDefaultRole ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Requires Approval</span>
                  <span>{data.assignmentRequiresApproval ? 'Yes' : 'No'}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Auto-Expiry</span>
                  <span>{data.autoExpiryEnabled ? `Yes${data.maxDurationHours ? ` (${data.maxDurationHours}h)` : ''}` : 'No'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Calendar className='h-4 w-4' />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Created</span>
                  <span>{formatDate(data.createdAt)}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Updated</span>
                  <span>{data.updatedAt ? formatDate(data.updatedAt) : '-'}</span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Created By</span>
                  <span>{data.createdBy ?? '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Permissions section */}
          <Card>
            <Collapsible>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <KeyRound className='h-4 w-4' />
                    Permissions
                    <Badge variant='secondary' className='ml-2 text-xs'>
                      {data.permissions?.length ?? 0} assigned
                    </Badge>
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant='ghost' size='sm'>
                      <ChevronDown className='h-4 w-4' />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CardDescription>
                  Permissions assigned directly to this role
                </CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  {!data.permissions || data.permissions.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      No permissions assigned directly to this role. Use the "Permissions" button above to manage them.
                    </p>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {data.permissions.map((p) => (
                        <Badge key={p.id} variant='outline' className='flex items-center gap-1.5'>
                          <span>{p.permissionName}</span>
                          <span className='font-mono text-xs text-muted-foreground'>({p.permissionCode})</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </>
      )}

      {/* Permissions Manager Dialog */}
      {data && (
        <PermissionsManager
          open={showPermissions}
          onOpenChange={setShowPermissions}
          roleId={roleId}
          roleName={data.roleName}
          assignedPermissions={data.permissions ?? []}
          inheritedPermissions={inheritedPerms.data}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{data?.roleName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={async () => {
                try {
                  const { RoleController_delete } = await import('@/lib/api/wms-saas-core-api/roles/roles')
                  await RoleController_delete(roleId)
                  queryClient.invalidateQueries({ queryKey: ['roles', 'list'] })
                  toast.success('Role deleted')
                  navigate({ to: '/roles' })
                } catch (err) {
                  toast.error((err as Error).message ?? 'Failed to delete role')
                }
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
