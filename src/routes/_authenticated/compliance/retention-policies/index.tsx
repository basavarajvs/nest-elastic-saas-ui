import { createFileRoute } from '@tanstack/react-router'
import { RetentionPoliciesPage } from '@/pages/compliance/retention-policies'

export const Route = createFileRoute('/_authenticated/compliance/retention-policies/')({
  component: RetentionPoliciesPage,
})
