import { createFileRoute } from '@tanstack/react-router'
import { PolicyDetailPage } from '@/pages/compliance/policy-detail'

export const Route = createFileRoute('/_authenticated/compliance/policies/$id')({
  component: PolicyDetailPage,
})
