import { createFileRoute } from '@tanstack/react-router'
import { LicensePlanDetailPage } from '@/pages/license-plans/license-plan-detail'

export const Route = createFileRoute('/_authenticated/license-plans/$id')({
  component: LicensePlanDetailPage,
})
