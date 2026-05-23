import { createFileRoute } from '@tanstack/react-router'
import { TenantsPage } from '@/pages/tenants/tenants-list'

export const Route = createFileRoute('/_authenticated/tenants/')({
  component: TenantsPage,
})
