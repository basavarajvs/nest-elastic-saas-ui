import { createFileRoute } from '@tanstack/react-router'
import { CreateCompliancePolicyPage } from '@/pages/compliance/policy-create'

export const Route = createFileRoute('/_authenticated/compliance/policies/new')({
  component: CreateCompliancePolicyPage,
})
