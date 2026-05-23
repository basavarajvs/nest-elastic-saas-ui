import { createFileRoute } from '@tanstack/react-router'
import { ResourceQuotasPage } from '@/pages/quotas/quotas-list'

export const Route = createFileRoute('/_authenticated/quotas/')({
  component: ResourceQuotasPage,
})
