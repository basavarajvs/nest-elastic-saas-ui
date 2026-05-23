import { PageHeader } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function FeatureFlagsPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='Feature Flags'
        description='Toggle features per tenant or globally'
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>No API for feature flag management yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-muted-foreground space-y-2'>
            <p>Planned UI:</p>
            <ul className='list-disc pl-5 text-sm'>
              <li>Global and per-tenant flags</li>
              <li>Toggle switches with audit</li>
              <li>JSON config editor</li>
            </ul>
          </div>
          <div className='mt-4 flex gap-2'>
            <Badge variant='outline'>stub</Badge>
            <Badge variant='secondary'>Phase 3</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
