import { createFileRoute } from '@tanstack/react-router'
import { RetentionPolicyDetailPage } from '@/pages/compliance/retention-policy-detail'

export const Route = createFileRoute('/_authenticated/compliance/retention-policies/$id')({
  component: RetentionPolicyDetailPage,
})
