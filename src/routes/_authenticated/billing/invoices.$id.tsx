import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { InvoiceDetailPage } from '@/pages/billing/invoice-detail'

export const Route = createFileRoute('/_authenticated/billing/invoices/$id')({
  validateSearch: z.object({
    tenantId: z.string().catch(''),
  }),
  component: InvoiceDetailPage,
})
