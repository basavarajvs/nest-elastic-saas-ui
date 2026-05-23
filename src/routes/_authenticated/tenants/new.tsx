import { createFileRoute } from '@tanstack/react-router'
import { CreateTenantPage } from '@/pages/tenants/tenant-create'

export const Route = createFileRoute('/_authenticated/tenants/new')({
  component: CreateTenantPage,
})
