import { createFileRoute } from '@tanstack/react-router'
import { InvoicesListPage } from '@/pages/billing/invoices-list'

export const Route = createFileRoute('/_authenticated/billing/invoices')({
  component: InvoicesListPage,
})
