import { createFileRoute } from '@tanstack/react-router'
import { CompliancePoliciesPage } from '@/pages/compliance/policies-list'

export const Route = createFileRoute('/_authenticated/compliance/')({
  component: CompliancePoliciesPage,
})
