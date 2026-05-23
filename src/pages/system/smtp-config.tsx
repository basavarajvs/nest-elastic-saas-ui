import { PageHeader } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SmtpConfigPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='SMTP Configuration'
        description='Configure outgoing email (SMTP) server settings and test delivery'
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>This feature requires backend API endpoints that are not yet implemented.</CardDescription>
        </CardHeader>
        <CardContent className='text-muted-foreground'>
          Form for host, port, auth, TLS, sender, plus "Send test email" will be added in a future phase.
        </CardContent>
      </Card>
    </div>
  )
}
