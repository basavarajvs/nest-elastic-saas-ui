import { PageHeader } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function IpRulesPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='IP Allow / Block List'
        description='Per-tenant IP address restrictions (CIDR)'
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>IP rules management requires new API endpoints.</CardDescription>
        </CardHeader>
        <CardContent className='text-muted-foreground'>
          Table for allow/block CIDR ranges, description, with enforcement status will be implemented in Phase 3.
        </CardContent>
      </Card>
    </div>
  )
}
