import { createFileRoute } from '@tanstack/react-router'
import { LicensePlansPage } from '@/pages/license-plans/license-plans-list'

export const Route = createFileRoute('/_authenticated/license-plans/')({
  component: LicensePlansPage,
})
