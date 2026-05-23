import { createFileRoute } from '@tanstack/react-router'
import { SubscriptionDetailPage } from '@/pages/subscriptions/subscription-detail'

export const Route = createFileRoute('/_authenticated/subscriptions/$id')({
  component: SubscriptionDetailPage,
})
