import { createFileRoute } from '@tanstack/react-router'
import { BillingDashboardPage } from '@/pages/billing/billing-dashboard'

export const Route = createFileRoute('/_authenticated/billing/dashboard')({
  component: BillingDashboardPage,
})
