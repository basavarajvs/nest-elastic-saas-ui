import { createFileRoute } from '@tanstack/react-router'
import { CreateRetentionPolicyPage } from '@/pages/compliance/retention-policy-create'

export const Route = createFileRoute('/_authenticated/compliance/retention-policies/new')({
  component: CreateRetentionPolicyPage,
})
