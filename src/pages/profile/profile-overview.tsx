import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Bell,
  Pencil,
  Settings,
  Shield,
} from 'lucide-react'
import { UserController_getMe } from '@/lib/api/wms-saas-core-api/users/users'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface UserProfile {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  bio?: string
  locale?: string
  timezone?: string
  isActive?: boolean
  emailVerified?: boolean
  mfaEnabled?: boolean
  roles?: { id: string; name: string; roleCode?: string }[]
  createdAt: string
  updatedAt?: string
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.charAt(0) ?? ''
  const l = lastName?.charAt(0) ?? ''
  return (f + l).toUpperCase() || 'U'
}

export function ProfileOverviewPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await UserController_getMe()
      return (res as unknown as { data: UserProfile }).data ?? ({} as UserProfile)
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className='space-y-6 max-w-2xl'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-32 w-full' />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className='text-center text-sm text-destructive py-12'>
        {error instanceof Error ? error.message : 'Failed to load profile'}
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Profile</h1>
        <p className='text-sm text-muted-foreground'>Your personal profile and account settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Avatar className='h-16 w-16'>
                <AvatarFallback className='text-lg'>{getInitials(profile.firstName, profile.lastName)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className='text-xl'>{profile.firstName} {profile.lastName}</CardTitle>
                <p className='text-sm text-muted-foreground'>{profile.email}</p>
                <div className='flex gap-2 mt-1'>
                  {profile.emailVerified && <Badge variant='outline' className='text-xs text-green-600'>Email Verified</Badge>}
                  {profile.mfaEnabled && <Badge variant='outline' className='text-xs text-blue-600'>MFA Enabled</Badge>}
                </div>
              </div>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link to='/profile/edit'>
                <Pencil className='mr-2 h-4 w-4' />
                Edit Profile
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Separator />
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>First Name</p>
              <p className='text-sm'>{profile.firstName ?? '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Last Name</p>
              <p className='text-sm'>{profile.lastName ?? '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Email</p>
              <p className='text-sm'>{profile.email ?? '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Phone</p>
              <p className='text-sm'>{profile.phone ?? '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Locale</p>
              <p className='text-sm'>{profile.locale ?? '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Timezone</p>
              <p className='text-sm'>{profile.timezone ?? '-'}</p>
            </div>
          </div>
          {profile.bio && (
            <>
              <Separator />
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Bio</p>
                <p className='text-sm whitespace-pre-wrap'>{profile.bio}</p>
              </div>
            </>
          )}
          {profile.roles && profile.roles.length > 0 && (
            <>
              <Separator />
              <div>
                <p className='text-sm font-medium text-muted-foreground mb-2'>Roles</p>
                <div className='flex gap-2 flex-wrap'>
                  {profile.roles.map((role) => (
                    <Badge key={role.id} variant='secondary'>{role.name}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <Card
          className='hover:bg-muted/50 transition-colors cursor-pointer'
          onClick={() => navigate({ to: '/profile/security' })}
        >
          <CardContent className='flex items-center gap-3 p-4'>
            <Shield className='h-8 w-8 text-primary' />
            <div>
              <p className='font-medium text-sm'>Security</p>
              <p className='text-xs text-muted-foreground'>Password, MFA, PIN</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className='hover:bg-muted/50 transition-colors cursor-pointer'
          onClick={() => navigate({ to: '/profile/notifications' })}
        >
          <CardContent className='flex items-center gap-3 p-4'>
            <Bell className='h-8 w-8 text-primary' />
            <div>
              <p className='font-medium text-sm'>Notifications</p>
              <p className='text-xs text-muted-foreground'>Channel preferences</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className='hover:bg-muted/50 transition-colors cursor-pointer'
          onClick={() => navigate({ to: '/profile/settings' })}
        >
          <CardContent className='flex items-center gap-3 p-4'>
            <Settings className='h-8 w-8 text-primary' />
            <div>
              <p className='font-medium text-sm'>Settings</p>
              <p className='text-xs text-muted-foreground'>Dashboard, attributes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
