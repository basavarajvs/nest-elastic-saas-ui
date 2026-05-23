import { createFileRoute } from '@tanstack/react-router'
import { PaymentsPage } from '@/pages/billing/payments'

export const Route = createFileRoute('/_authenticated/billing/payments')({
  component: PaymentsPage,
})
