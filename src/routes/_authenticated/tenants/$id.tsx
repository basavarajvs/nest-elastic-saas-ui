import { createFileRoute } from '@tanstack/react-router'
import { TenantDetailPage } from '@/pages/tenants/tenant-detail'
import { z } from 'zod'

export const Route = createFileRoute('/_authenticated/tenants/$id')({
  component: TenantDetailPage,
  validateSearch: z.object({
    edit: z.string().optional(),
  }),
})
