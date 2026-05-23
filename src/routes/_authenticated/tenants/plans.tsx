import { createFileRoute } from '@tanstack/react-router'
import { TenantPlansPage } from '@/pages/tenants/tenant-plans'

export const Route = createFileRoute('/_authenticated/tenants/plans')({
  component: TenantPlansPage,
})
