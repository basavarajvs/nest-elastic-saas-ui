import { createFileRoute } from '@tanstack/react-router'
import { SubscriptionsPage } from '@/pages/subscriptions/subscriptions-list'

export const Route = createFileRoute('/_authenticated/subscriptions/')({
  component: SubscriptionsPage,
})
