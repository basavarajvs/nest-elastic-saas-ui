import { createFileRoute } from '@tanstack/react-router'
import { CreateSubscriptionPage } from '@/pages/subscriptions/subscription-create'

export const Route = createFileRoute('/_authenticated/subscriptions/new')({
  component: CreateSubscriptionPage,
})
