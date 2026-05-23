import { createFileRoute } from '@tanstack/react-router'
import { CreateLicensePlanPage } from '@/pages/license-plans/license-plan-create'

export const Route = createFileRoute('/_authenticated/license-plans/new')({
  component: CreateLicensePlanPage,
})
