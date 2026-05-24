import { Clock, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SessionsPage() {
  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold tracking-tight'>Active Sessions</h1>
        <p className='text-sm text-muted-foreground'>Monitor and manage active user sessions across the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5 text-muted-foreground' />
            Session Management
          </CardTitle>
          <CardDescription>
            View and manage active user sessions, revoke access, and enforce security policies.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
          <Clock className='h-12 w-12 text-muted-foreground/40 mb-4' />
          <h3 className='text-lg font-medium mb-2'>Coming Soon</h3>
          <p className='text-sm text-muted-foreground max-w-md'>
            The session management feature is currently under development. You will be able to view active sessions,
            revoke access, and manage user tokens here once available.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
