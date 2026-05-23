import { PageHeader } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SsoConfigPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='SSO / SAML / OIDC'
        description='Enterprise single sign-on configuration'
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>SSO/SAML API endpoints do not exist yet.</CardDescription>
        </CardHeader>
        <CardContent className='text-muted-foreground'>
          UI for provider setup (SAML metadata upload, OIDC client config, role mapping) will be added once the backend supports it.
        </CardContent>
      </Card>
    </div>
  )
}
